/**
 * Orchestrator Types - Orchestrator interface and related types
 *
 * Feature: 004-agent-mcp-foundation
 * Date: 2025-12-12
 *
 * Note: Orchestrator internals may change during early development (per spec Q42).
 */

import type { OllamaToolDefinition, ToolResult } from '../../types/agent.js';
import type { Agent, AgentFactory, AgentState } from './agent.js';
import type { AgentHealth } from './metrics.js';

// =============================================================================
// Orchestrator Interface
// =============================================================================

/**
 * Orchestrator interface - routes requests to agents.
 * Note: Internal methods may change (per spec Q42).
 */
export interface IOrchestrator {
  /**
   * Register an agent factory for lazy instantiation.
   * @param agentId - Unique agent identifier
   * @param factory - Factory function to create the agent
   * @throws AgentError if agentId already registered
   */
  registerAgentFactory(agentId: string, factory: AgentFactory): void;

  /**
   * Get all tool definitions from all registered agents.
   * Used to provide tool manifest to LLM.
   */
  getAllToolDefinitions(): OllamaToolDefinition[];

  /**
   * Execute a tool by name, routing to appropriate agent.
   * @param toolName - Name of the tool to execute
   * @param args - Tool arguments
   * @param correlationId - Optional correlation ID for tracing
   * @returns ToolResult from the agent
   */
  execute(
    toolName: string,
    args: Record<string, unknown>,
    correlationId?: string
  ): Promise<ToolResult>;

  /**
   * Get health status for an agent.
   * Per FR-009.
   */
  getAgentHealth(agentId: string): Promise<AgentHealth>;

  /**
   * Get health status for all agents.
   */
  getAllAgentHealth(): Promise<AgentHealth[]>;

  /**
   * Start a stopped agent.
   * Per FR-009.
   */
  startAgent(agentId: string): Promise<void>;

  /**
   * Stop a running agent.
   * Per FR-009.
   */
  stopAgent(agentId: string): Promise<void>;

  /**
   * Gracefully shut down the orchestrator and all agents.
   * Per spec Q54 - best-effort parallel, 5s timeout per agent.
   */
  shutdown(): Promise<void>;

  /**
   * Load and connect to MCP servers from config.
   */
  loadMCPServers(): Promise<void>;
}

// =============================================================================
// Internal Agent Entry
// =============================================================================

/**
 * Internal tracking for registered agents.
 */
export interface AgentEntry {
  /** Agent instance (null if not yet instantiated) */
  agent: Agent | null;

  /** Factory for creating the agent */
  factory: AgentFactory;

  /** Current lifecycle state */
  state: AgentState;

  /** Tools provided by this agent (cached from manifest) */
  tools: string[];
}
