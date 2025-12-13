/**
 * Orchestrator - Central coordinator for agent-based tool execution
 *
 * Feature: 004-agent-mcp-foundation
 * Date: 2025-12-12
 *
 * Routes tool execution requests to appropriate agents, manages agent lifecycle,
 * and provides tool manifest to LLM.
 */

import type { OllamaToolDefinition, ToolResult } from '../types/agent.js';
import type { AgentFactory, AgentState, ToolDefinition } from './types/agent.js';
import type { IOrchestrator, AgentEntry } from './types/orchestrator.js';
import type { AgentHealth } from './types/metrics.js';
import type { IMCPClientManager } from './types/mcp.js';
import {
  createAgentNotFoundError,
  AgentSystemError,
} from './errors.js';
import { OrchestratorMetrics } from './metrics.js';
import { AgentLogger, generateCorrelationId } from './logger.js';
import { withTimeout, DEFAULT_TOOL_TIMEOUT_MS, DEFAULT_SHUTDOWN_TIMEOUT_MS } from './utils/timeout.js';
import { MCPClientManager, loadMCPConfigs } from './mcp-client-manager.js';
import { createMCPAgentFactory } from './mcp-agent.js';

/** Agent ID validation pattern: lowercase letters, numbers, hyphens */
const AGENT_ID_PATTERN = /^[a-z][a-z0-9-]*$/;

/**
 * Default Orchestrator implementation.
 * Manages agent registration, tool routing, and lifecycle.
 */
export class Orchestrator implements IOrchestrator {
  /** Registered agents by ID */
  private readonly agents: Map<string, AgentEntry> = new Map();

  /** Tool name to agent ID mapping */
  private readonly toolToAgent: Map<string, string> = new Map();

  /** Cached tool definitions for LLM */
  private cachedToolDefinitions: OllamaToolDefinition[] | null = null;

  /** Metrics collector */
  private readonly metrics: OrchestratorMetrics;

  /** Logger */
  private readonly logger: AgentLogger;

  /** MCP client manager (created when loadMCPServers is called) */
  private mcpClientManager: IMCPClientManager | null = null;

  constructor(options: {
    metrics?: OrchestratorMetrics;
    logger?: AgentLogger;
  } = {}) {
    this.metrics = options.metrics ?? new OrchestratorMetrics();
    this.logger = options.logger ?? new AgentLogger();
  }

  // ==========================================================================
  // Agent Registration (T019)
  // ==========================================================================

  /**
   * Register an agent factory for lazy instantiation.
   * @throws AgentSystemError if agentId is invalid or already registered
   */
  registerAgentFactory(agentId: string, factory: AgentFactory): void {
    // Validate agent ID format
    if (!AGENT_ID_PATTERN.test(agentId)) {
      throw new AgentSystemError(
        'AGENT_INIT_FAILED',
        `Invalid agent ID '${agentId}': must be lowercase letters, numbers, and hyphens, starting with a letter`
      );
    }

    // Check for duplicate registration
    if (this.agents.has(agentId)) {
      throw new AgentSystemError(
        'AGENT_INIT_FAILED',
        `Agent '${agentId}' is already registered`
      );
    }

    // Create the agent instance to inspect its manifest
    const agent = factory();
    const manifest = agent.getManifest();

    // Check for tool name collisions
    for (const tool of manifest.tools) {
      const existingAgentId = this.toolToAgent.get(tool.name);
      if (existingAgentId) {
        throw new AgentSystemError(
          'AGENT_INIT_FAILED',
          `Duplicate tool name '${tool.name}': already registered by agent '${existingAgentId}'`
        );
      }
    }

    // Register tool mappings
    for (const tool of manifest.tools) {
      this.toolToAgent.set(tool.name, agentId);
    }

    // Register the agent
    const entry: AgentEntry = {
      agent,
      factory,
      state: 'initialized' as AgentState,
      tools: manifest.tools.map(t => t.name),
    };

    this.agents.set(agentId, entry);

    // Invalidate cached tool definitions
    this.cachedToolDefinitions = null;

    this.logger.logAgentInit(agentId, { toolCount: manifest.tools.length });
  }

  // ==========================================================================
  // Tool Definitions (T020)
  // ==========================================================================

  /**
   * Get all tool definitions from all registered agents in Ollama format.
   */
  getAllToolDefinitions(): OllamaToolDefinition[] {
    // Return cached if available
    if (this.cachedToolDefinitions !== null) {
      return this.cachedToolDefinitions;
    }

    const definitions: OllamaToolDefinition[] = [];

    for (const [_agentId, entry] of this.agents) {
      if (!entry.agent) continue;

      const manifest = entry.agent.getManifest();
      for (const tool of manifest.tools) {
        definitions.push(this.toOllamaFormat(tool));
      }
    }

    this.cachedToolDefinitions = definitions;
    return definitions;
  }

  /**
   * Convert internal tool definition to Ollama format.
   */
  private toOllamaFormat(tool: ToolDefinition): OllamaToolDefinition {
    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    };
  }

  // ==========================================================================
  // Tool Execution (T021, T023, T024, T025, T026)
  // ==========================================================================

  /**
   * Execute a tool by name, routing to the appropriate agent.
   */
  async execute(
    toolName: string,
    args: Record<string, unknown>,
    correlationId?: string
  ): Promise<ToolResult> {
    const corrId = correlationId ?? generateCorrelationId();
    const startTime = Date.now();

    // Find the agent that owns this tool
    const agentId = this.toolToAgent.get(toolName);
    if (!agentId) {
      this.metrics.recordError('TOOL_NOT_FOUND');
      this.logger.logToolFailure(toolName, 'unknown', `Tool '${toolName}' not found`, 0, corrId);
      return {
        success: false,
        error: `Tool '${toolName}' not found`,
      };
    }

    const entry = this.agents.get(agentId);
    if (!entry || !entry.agent) {
      this.metrics.recordError('AGENT_NOT_FOUND');
      return {
        success: false,
        error: `Agent '${agentId}' not found for tool '${toolName}'`,
      };
    }

    // Check if this is a destructive action requiring approval (T025, T026)
    const manifest = entry.agent.getManifest();
    if (manifest.requiresApproval) {
      const tool = manifest.tools.find(t => t.name === toolName);
      if (this.isDestructiveAction(tool)) {
        this.logger.logToolApprovalRequired(toolName, agentId, corrId, 'pending');
        return {
          success: false,
          error: `Tool '${toolName}' requires approval before execution. Create a proposal via the proposals system.`,
        };
      }
    }

    // Initialize agent if needed
    if (entry.state === 'initialized') {
      try {
        this.logger.logAgentStart(agentId);
        await entry.agent.initialize();
        entry.state = 'running';
      } catch (error) {
        this.metrics.recordError('AGENT_INIT_FAILED');
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.logToolFailure(toolName, agentId, message, Date.now() - startTime, corrId);
        return {
          success: false,
          error: `Agent '${agentId}' failed to initialize: ${message}`,
        };
      }
    }

    // Check agent state
    if (entry.state !== 'running') {
      this.metrics.recordError('AGENT_UNAVAILABLE');
      return {
        success: false,
        error: `Agent '${agentId}' is not running (state: ${entry.state})`,
      };
    }

    // Execute with timeout (T024)
    this.logger.logToolExecute(toolName, agentId, corrId, { args });

    try {
      const result = await withTimeout(
        entry.agent.execute(toolName, args),
        DEFAULT_TOOL_TIMEOUT_MS,
        toolName
      );

      const durationMs = Date.now() - startTime;
      this.metrics.recordToolExecution(toolName, durationMs);

      if (result.success) {
        this.logger.logToolSuccess(toolName, agentId, durationMs, corrId);
      } else {
        this.logger.logToolFailure(toolName, agentId, result.error ?? 'Unknown error', durationMs, corrId);
      }

      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;

      if (error instanceof AgentSystemError && error.code === 'TOOL_EXECUTION_TIMEOUT') {
        this.metrics.recordError('TOOL_EXECUTION_TIMEOUT');
        this.logger.logToolFailure(toolName, agentId, 'Timeout', durationMs, corrId);
        return {
          success: false,
          error: `Tool '${toolName}' execution timed out after ${DEFAULT_TOOL_TIMEOUT_MS}ms`,
        };
      }

      this.metrics.recordError('TOOL_EXECUTION_FAILED');
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.logToolFailure(toolName, agentId, message, durationMs, corrId);
      return {
        success: false,
        error: message,
      };
    }
  }

  // ==========================================================================
  // Destructive Action Detection (T025)
  // ==========================================================================

  /**
   * Check if a tool performs destructive actions.
   * Per spec FR-011: Irreversible OR affects data outside DIANA's control.
   */
  private isDestructiveAction(tool: ToolDefinition | undefined): boolean {
    if (!tool) return false;

    // Check explicit destructive flag
    if (tool.destructive === true) {
      return true;
    }

    // Check tool name for destructive patterns
    const destructivePatterns = [
      /^delete/i,
      /^remove/i,
      /^drop/i,
      /^truncate/i,
      /write_file/i,
      /move_file/i,
      /rename_file/i,
      /execute_shell/i,
      /run_command/i,
      /send_email/i,
      /post_/i,
      /put_/i,
      /patch_/i,
    ];

    for (const pattern of destructivePatterns) {
      if (pattern.test(tool.name)) {
        return true;
      }
    }

    // Check description for destructive keywords
    const destructiveKeywords = ['delete', 'remove', 'modify', 'update', 'write', 'send', 'execute', 'shell'];
    const description = tool.description.toLowerCase();
    for (const keyword of destructiveKeywords) {
      if (description.includes(keyword)) {
        return true;
      }
    }

    return false;
  }

  // ==========================================================================
  // Health Checks (FR-009, will be extended in Phase 6)
  // ==========================================================================

  /**
   * Get health status for an agent.
   */
  async getAgentHealth(agentId: string): Promise<AgentHealth> {
    this.metrics.recordHealthCheck(agentId);

    const entry = this.agents.get(agentId);
    if (!entry) {
      return {
        agentId,
        status: 'unknown',
        message: 'Agent not found',
        lastChecked: new Date(),
        toolCount: 0,
      };
    }

    const manifest = entry.agent?.getManifest();
    return {
      agentId,
      status: entry.state === 'running' ? 'healthy' : 'unhealthy',
      message: entry.state === 'running' ? undefined : `Agent state: ${entry.state}`,
      lastChecked: new Date(),
      toolCount: manifest?.tools.length ?? 0,
    };
  }

  /**
   * Get health status for all agents.
   */
  async getAllAgentHealth(): Promise<AgentHealth[]> {
    const results: AgentHealth[] = [];
    for (const agentId of this.agents.keys()) {
      results.push(await this.getAgentHealth(agentId));
    }
    return results;
  }

  // ==========================================================================
  // Lifecycle Management (will be extended in Phase 6)
  // ==========================================================================

  /**
   * Start a stopped agent.
   */
  async startAgent(agentId: string): Promise<void> {
    const entry = this.agents.get(agentId);
    if (!entry) {
      throw createAgentNotFoundError(agentId);
    }

    if (entry.state === 'running') {
      return; // Already running
    }

    // Recreate from factory if stopped
    if (entry.state === 'stopped') {
      entry.agent = entry.factory();
    }

    this.logger.logAgentStart(agentId);
    await entry.agent!.initialize();
    entry.state = 'running';
  }

  /**
   * Stop a running agent.
   */
  async stopAgent(agentId: string): Promise<void> {
    const entry = this.agents.get(agentId);
    if (!entry) {
      throw createAgentNotFoundError(agentId);
    }

    if (entry.state === 'stopped') {
      return; // Already stopped
    }

    if (entry.agent && entry.state === 'running') {
      this.logger.logAgentStop(agentId);
      await entry.agent.shutdown();
    }

    entry.state = 'stopped';
  }

  /**
   * Gracefully shut down the orchestrator and all agents.
   * Best-effort parallel with 5s timeout per agent.
   */
  async shutdown(): Promise<void> {
    const shutdownPromises: Promise<void>[] = [];

    for (const [agentId, entry] of this.agents) {
      if (entry.agent && entry.state === 'running') {
        const shutdownPromise = withTimeout(
          entry.agent.shutdown(),
          DEFAULT_SHUTDOWN_TIMEOUT_MS,
          `shutdown:${agentId}`
        )
          .then(() => {
            this.logger.logAgentShutdown(agentId);
          })
          .catch((error) => {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.logAgentShutdown(agentId, { error: message });
          });

        shutdownPromises.push(shutdownPromise);
        entry.state = 'stopped';
      }
    }

    await Promise.all(shutdownPromises);

    // Shutdown MCP client manager if present
    if (this.mcpClientManager) {
      await this.mcpClientManager.shutdown();
      this.mcpClientManager = null;
    }
  }

  /**
   * Load and connect to MCP servers from config.
   * Per spec Q45: config file at config/mcp-servers.json
   * Per spec Q53: auto-reconnect polling every 30s
   *
   * @param configPath - Optional path to config file (default: config/mcp-servers.json)
   */
  async loadMCPServers(configPath?: string): Promise<void> {
    const path = configPath ?? 'config/mcp-servers.json';

    // Load configurations
    const configs = await loadMCPConfigs(path);
    if (configs.length === 0) {
      this.logger.logMCPLoad(path, 0);
      return;
    }

    // Create MCP client manager
    this.mcpClientManager = new MCPClientManager(configs);

    // Register an agent for each MCP server
    for (const config of configs) {
      const agentId = `mcp-${config.name}`;
      const factory = createMCPAgentFactory(config, this.mcpClientManager);

      try {
        this.registerAgentFactory(agentId, factory);
        this.logger.logMCPAgentRegistered(agentId, config.name);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.logMCPAgentRegistrationFailed(agentId, config.name, message);
      }
    }

    this.logger.logMCPLoad(path, configs.length);

    // Connect to autoStart servers
    await this.mcpClientManager.connectAutoStart();

    // Start reconnection polling
    this.mcpClientManager.startReconnectPolling();
  }

  /**
   * Get the MCP client manager instance.
   */
  getMCPClientManager(): IMCPClientManager | null {
    return this.mcpClientManager;
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Get current metrics snapshot.
   */
  getMetrics(): ReturnType<OrchestratorMetrics['getMetrics']> {
    return this.metrics.getMetrics();
  }

  /**
   * Get the logger instance.
   */
  getLogger(): AgentLogger {
    return this.logger;
  }

  /**
   * Check if an agent is registered.
   */
  hasAgent(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  /**
   * Get list of registered agent IDs.
   */
  getAgentIds(): string[] {
    return Array.from(this.agents.keys());
  }
}
