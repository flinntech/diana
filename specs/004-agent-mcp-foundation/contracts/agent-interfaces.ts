/**
 * Agent + MCP Foundation - TypeScript Interface Contracts
 *
 * Feature: 004-agent-mcp-foundation
 * Date: 2025-12-12
 *
 * These interfaces define the stable contracts for DIANA's agent system.
 * Per spec clarification Q42, only Agent interface and ToolResult are stable.
 * Orchestrator internals may change during early development.
 */

import type { JSONSchema, ToolResult, OllamaToolDefinition } from '../../../src/types/agent.js';

// =============================================================================
// Agent Lifecycle States
// =============================================================================

/**
 * Agent lifecycle states.
 * Extensible string union for future additions (per spec Q39).
 */
export type AgentState = 'initialized' | 'running' | 'stopped';

// =============================================================================
// Tool Definition (Enhanced)
// =============================================================================

/**
 * Enhanced tool definition with optional metadata for richer LLM context.
 * Per spec clarification Q36.
 */
export interface ToolDefinition {
  /** Unique tool identifier (lowercase, underscores) */
  name: string;

  /** Human-readable description for LLM */
  description: string;

  /** JSON Schema for parameter validation */
  parameters: JSONSchema;

  /** Example invocations (optional, for LLM context) */
  examples?: string[];

  /** Category for grouping (optional) */
  category?: string;
}

// =============================================================================
// Agent Manifest
// =============================================================================

/**
 * Agent manifest describing capabilities and tools.
 * Per spec clarification Q40 and constitution IX.b.
 */
export interface AgentManifest {
  /** Unique agent identifier */
  id: string;

  /** Human-readable display name */
  name: string;

  /** Tools this agent exposes */
  tools: ToolDefinition[];

  /** Routing hints for orchestrator (e.g., ["web-search", "file-ops"]) */
  capabilities: string[];

  /** If true, destructive operations require user approval */
  requiresApproval: boolean;

  /** Reserved for future multi-model support (optional) */
  modelRequirements?: string;
}

// =============================================================================
// Agent Interface (STABLE)
// =============================================================================

/**
 * Core Agent interface - STABLE per spec clarification Q42.
 *
 * All agents must implement this interface.
 * Per spec clarifications Q9-Q11:
 * - initialize() and shutdown() return Promise<void>, throw AgentError on failure
 * - execute() params are Record<string, unknown>
 * - execute() returns Promise<ToolResult>
 */
export interface Agent {
  /**
   * Initialize the agent.
   * Called once before any tool execution.
   * @throws AgentError with code AGENT_INIT_FAILED on failure
   */
  initialize(): Promise<void>;

  /**
   * Execute a tool by name with parameters.
   * @param toolName - Name of the tool to execute
   * @param params - Tool parameters (validated against JSON Schema)
   * @returns ToolResult with success/data or success=false/error
   */
  execute(toolName: string, params: Record<string, unknown>): Promise<ToolResult>;

  /**
   * Gracefully shut down the agent.
   * Release resources, close connections.
   * @throws AgentError with code AGENT_SHUTDOWN_FAILED on failure
   */
  shutdown(): Promise<void>;

  /**
   * Get the agent's manifest describing its capabilities.
   * Per spec clarification Q40.
   */
  getManifest(): AgentManifest;
}

/**
 * Factory function for creating agents.
 * Per spec clarification Q37 - factory pattern for registration.
 */
export type AgentFactory = () => Agent;

// =============================================================================
// Agent Health
// =============================================================================

/**
 * Health status for an agent.
 */
export type AgentHealthStatus = 'healthy' | 'unhealthy' | 'unknown';

/**
 * Health check response for an agent.
 * Per FR-009 - support health check operations.
 */
export interface AgentHealth {
  /** Agent identifier */
  agentId: string;

  /** Current health status */
  status: AgentHealthStatus;

  /** Additional message (error info if unhealthy) */
  message?: string;

  /** When health was last checked */
  lastChecked: Date;

  /** Number of tools available from this agent */
  toolCount: number;
}

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
}

// =============================================================================
// MCP Configuration
// =============================================================================

/**
 * Configuration for an MCP server.
 * Per spec clarification Q45.
 */
export interface MCPServerConfig {
  /** Unique server identifier */
  name: string;

  /** Command to execute (e.g., "node", "python") */
  command: string;

  /** Command arguments (e.g., ["server.js"]) */
  args: string[];

  /** Environment variables (optional) */
  env?: Record<string, string>;

  /** Connection timeout in ms (default: 10000) */
  timeout?: number;

  /** Auto-connect on orchestrator init (default: true) */
  autoStart?: boolean;
}

/**
 * MCP servers configuration file schema.
 * Located at config/mcp-servers.json.
 */
export interface MCPServersConfig {
  servers: MCPServerConfig[];
}

// =============================================================================
// MCP Connection Status
// =============================================================================

/**
 * Connection status for an MCP server.
 */
export type MCPConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'ready'
  | 'error';

/**
 * Runtime state for an MCP connection.
 */
export interface MCPConnectionState {
  /** Server config name */
  serverName: string;

  /** Current connection status */
  status: MCPConnectionStatus;

  /** Discovered tools (empty until ready) */
  tools: ToolDefinition[];

  /** Last successful health check */
  lastHealthCheck?: Date;

  /** Error message if status is 'error' */
  errorMessage?: string;
}

// =============================================================================
// MCP Client Manager Interface
// =============================================================================

/**
 * Interface for managing MCP server connections.
 */
export interface IMCPClientManager {
  /**
   * Connect to an MCP server.
   * @param serverName - Name from MCPServerConfig
   */
  connect(serverName: string): Promise<void>;

  /**
   * Disconnect from an MCP server.
   */
  disconnect(serverName: string): Promise<void>;

  /**
   * Get connection state for a server.
   */
  getConnectionState(serverName: string): MCPConnectionState | undefined;

  /**
   * Get all connection states.
   */
  getAllConnectionStates(): MCPConnectionState[];

  /**
   * Execute a tool on an MCP server.
   * @param serverName - Server to execute on
   * @param toolName - Tool name
   * @param args - Tool arguments
   */
  executeTool(
    serverName: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<ToolResult>;

  /**
   * Start reconnection polling for disconnected servers.
   * Per spec Q53 - 30s interval.
   */
  startReconnectPolling(): void;

  /**
   * Stop reconnection polling.
   */
  stopReconnectPolling(): void;

  /**
   * Shut down all connections.
   */
  shutdown(): Promise<void>;
}

// =============================================================================
// Metrics
// =============================================================================

/**
 * Observability metrics for the orchestrator.
 * Per FR-015/16/17.
 */
export interface OrchestratorMetrics {
  /** Tool execution counts by tool name */
  toolExecutionCount: Map<string, number>;

  /** Tool latency samples by tool name (ms) */
  toolLatencies: Map<string, number[]>;

  /** Agent health check counts by agent ID */
  agentHealthChecks: Map<string, number>;

  /** Error counts by error code */
  errors: Map<string, number>;
}

// =============================================================================
// Log Entry
// =============================================================================

/**
 * Structured log entry for agent events.
 * Per FR-015.
 */
export interface AgentLogEntry {
  /** Timestamp of the event */
  timestamp: Date;

  /** Correlation ID for request tracing (per FR-017) */
  correlationId: string;

  /** Event type */
  event:
    | 'agent_init'
    | 'agent_start'
    | 'agent_stop'
    | 'agent_shutdown'
    | 'agent_health_check'
    | 'tool_execute'
    | 'tool_success'
    | 'tool_failure'
    | 'mcp_connect'
    | 'mcp_disconnect'
    | 'mcp_reconnect';

  /** Agent ID (if applicable) */
  agentId?: string;

  /** Tool name (if applicable) */
  toolName?: string;

  /** Duration in ms (for execute events) */
  durationMs?: number;

  /** Error message (for failure events) */
  error?: string;

  /** Additional context */
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Extended Error Codes
// =============================================================================

/**
 * Extended error codes for agent system.
 * Adds to existing AgentErrorCode from src/types/agent.ts.
 */
export type AgentSystemErrorCode =
  // New agent-specific codes (per spec Q34)
  | 'AGENT_INIT_FAILED'
  | 'AGENT_SHUTDOWN_FAILED'
  | 'AGENT_NOT_FOUND'
  | 'AGENT_UNAVAILABLE'
  | 'TOOL_EXECUTION_TIMEOUT'
  // MCP-specific codes
  | 'MCP_CONNECTION_FAILED'
  | 'MCP_TOOL_DISCOVERY_FAILED'
  | 'MCP_SERVER_UNAVAILABLE';
