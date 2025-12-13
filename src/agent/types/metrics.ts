/**
 * Metrics Types - Observability and health check types
 *
 * Feature: 004-agent-mcp-foundation
 * Date: 2025-12-12
 *
 * Per FR-015/16/17 - structured logs, metrics, correlation IDs.
 */

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
// Orchestrator Metrics
// =============================================================================

/**
 * Observability metrics for the orchestrator.
 * Per FR-015/16/17.
 */
export interface OrchestratorMetricsData {
  /** Tool execution counts by tool name */
  toolExecutionCount: Map<string, number>;

  /** Tool latency samples by tool name (ms) */
  toolLatencies: Map<string, number[]>;

  /** Agent health check counts by agent ID */
  agentHealthChecks: Map<string, number>;

  /** Error counts by error code */
  errors: Map<string, number>;
}

/**
 * Interface for metrics collection.
 */
export interface IOrchestratorMetrics {
  /** Record a tool execution */
  recordToolExecution(toolName: string, durationMs: number): void;

  /** Record an error */
  recordError(errorCode: string): void;

  /** Record a health check */
  recordHealthCheck(agentId: string): void;

  /** Get current metrics snapshot */
  getMetrics(): OrchestratorMetricsData;

  /** Reset all metrics */
  reset(): void;
}

// =============================================================================
// Log Entry
// =============================================================================

/**
 * Event types for agent logging.
 */
export type AgentEventType =
  | 'agent_init'
  | 'agent_start'
  | 'agent_stop'
  | 'agent_shutdown'
  | 'agent_health_check'
  | 'tool_execute'
  | 'tool_success'
  | 'tool_failure'
  | 'tool_approval_required'
  | 'mcp_connect'
  | 'mcp_disconnect'
  | 'mcp_reconnect'
  | 'mcp_load'
  | 'mcp_agent_registered'
  | 'mcp_agent_registration_failed';

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
  event: AgentEventType;

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

/**
 * Interface for agent logging.
 */
export interface IAgentLogger {
  /** Log an event */
  log(entry: Omit<AgentLogEntry, 'timestamp'>): void;

  /** Create a child logger with a correlation ID */
  withCorrelationId(correlationId: string): IAgentLogger;

  /** Get recent log entries */
  getRecentEntries(count: number): AgentLogEntry[];
}
