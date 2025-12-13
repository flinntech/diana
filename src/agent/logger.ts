/**
 * Agent Logger - Structured logging for agent events
 *
 * Feature: 004-agent-mcp-foundation
 * Date: 2025-12-12
 *
 * Per FR-015 - structured logs for lifecycle events and tool execution.
 * Per FR-017 - correlation IDs for end-to-end tracing.
 */

import { randomUUID } from 'crypto';
import type { AgentLogEntry, IAgentLogger } from './types/metrics.js';

/**
 * Default implementation of agent logger.
 * Outputs structured JSON logs to console.
 */
export class AgentLogger implements IAgentLogger {
  private correlationId: string;
  private readonly entries: AgentLogEntry[] = [];
  private readonly maxEntries: number;
  private readonly outputFn: (entry: AgentLogEntry) => void;

  constructor(options: {
    correlationId?: string;
    maxEntries?: number;
    outputFn?: (entry: AgentLogEntry) => void;
  } = {}) {
    this.correlationId = options.correlationId ?? randomUUID();
    this.maxEntries = options.maxEntries ?? 1000;
    this.outputFn = options.outputFn ?? this.defaultOutput;
  }

  /**
   * Log an event.
   */
  log(entry: Omit<AgentLogEntry, 'timestamp'>): void {
    const fullEntry: AgentLogEntry = {
      ...entry,
      timestamp: new Date(),
      correlationId: entry.correlationId ?? this.correlationId,
    };

    // Store in memory
    this.entries.push(fullEntry);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }

    // Output
    this.outputFn(fullEntry);
  }

  /**
   * Create a child logger with a specific correlation ID.
   */
  withCorrelationId(correlationId: string): IAgentLogger {
    return new AgentLogger({
      correlationId,
      maxEntries: this.maxEntries,
      outputFn: this.outputFn,
    });
  }

  /**
   * Get recent log entries.
   */
  getRecentEntries(count: number): AgentLogEntry[] {
    const start = Math.max(0, this.entries.length - count);
    return this.entries.slice(start);
  }

  /**
   * Get all entries matching a correlation ID.
   */
  getEntriesByCorrelationId(correlationId: string): AgentLogEntry[] {
    return this.entries.filter((e) => e.correlationId === correlationId);
  }

  /**
   * Get current correlation ID.
   */
  getCorrelationId(): string {
    return this.correlationId;
  }

  /**
   * Clear all stored entries.
   */
  clear(): void {
    this.entries.length = 0;
  }

  /**
   * Default output function - logs JSON to console.
   */
  private defaultOutput(entry: AgentLogEntry): void {
    const logLine = JSON.stringify({
      timestamp: entry.timestamp.toISOString(),
      correlationId: entry.correlationId,
      event: entry.event,
      agentId: entry.agentId,
      toolName: entry.toolName,
      durationMs: entry.durationMs,
      error: entry.error,
      ...entry.metadata,
    });

    // Use appropriate log level based on event type
    if (entry.event.includes('failure') || entry.error) {
      console.error(logLine);
    } else {
      console.log(logLine);
    }
  }

  // Convenience methods for common log patterns

  /**
   * Log agent initialization.
   */
  logAgentInit(agentId: string, metadata?: Record<string, unknown>): void {
    this.log({
      event: 'agent_init',
      agentId,
      correlationId: this.correlationId,
      metadata,
    });
  }

  /**
   * Log agent start.
   */
  logAgentStart(agentId: string, metadata?: Record<string, unknown>): void {
    this.log({
      event: 'agent_start',
      agentId,
      correlationId: this.correlationId,
      metadata,
    });
  }

  /**
   * Log agent stop.
   */
  logAgentStop(agentId: string, metadata?: Record<string, unknown>): void {
    this.log({
      event: 'agent_stop',
      agentId,
      correlationId: this.correlationId,
      metadata,
    });
  }

  /**
   * Log agent shutdown.
   */
  logAgentShutdown(agentId: string, metadata?: Record<string, unknown>): void {
    this.log({
      event: 'agent_shutdown',
      agentId,
      correlationId: this.correlationId,
      metadata,
    });
  }

  /**
   * Log tool execution start.
   */
  logToolExecute(
    toolName: string,
    agentId: string,
    correlationId: string,
    metadata?: Record<string, unknown>
  ): void {
    this.log({
      event: 'tool_execute',
      toolName,
      agentId,
      correlationId,
      metadata,
    });
  }

  /**
   * Log tool execution success.
   */
  logToolSuccess(
    toolName: string,
    agentId: string,
    durationMs: number,
    correlationId: string,
    metadata?: Record<string, unknown>
  ): void {
    this.log({
      event: 'tool_success',
      toolName,
      agentId,
      durationMs,
      correlationId,
      metadata,
    });
  }

  /**
   * Log tool execution failure.
   */
  logToolFailure(
    toolName: string,
    agentId: string,
    error: string,
    durationMs: number,
    correlationId: string,
    metadata?: Record<string, unknown>
  ): void {
    this.log({
      event: 'tool_failure',
      toolName,
      agentId,
      error,
      durationMs,
      correlationId,
      metadata,
    });
  }

  /**
   * Log tool approval required (human-in-the-loop).
   */
  logToolApprovalRequired(
    toolName: string,
    agentId: string,
    correlationId: string,
    proposalId: string,
    metadata?: Record<string, unknown>
  ): void {
    this.log({
      event: 'tool_approval_required',
      toolName,
      agentId,
      correlationId,
      metadata: { ...metadata, proposalId },
    });
  }

  /**
   * Log MCP connection.
   */
  logMCPConnect(serverName: string, metadata?: Record<string, unknown>): void {
    this.log({
      event: 'mcp_connect',
      correlationId: this.correlationId,
      metadata: { ...metadata, serverName },
    });
  }

  /**
   * Log MCP disconnection.
   */
  logMCPDisconnect(serverName: string, error?: string, metadata?: Record<string, unknown>): void {
    this.log({
      event: 'mcp_disconnect',
      correlationId: this.correlationId,
      error,
      metadata: { ...metadata, serverName },
    });
  }

  /**
   * Log MCP reconnection.
   */
  logMCPReconnect(serverName: string, metadata?: Record<string, unknown>): void {
    this.log({
      event: 'mcp_reconnect',
      correlationId: this.correlationId,
      metadata: { ...metadata, serverName },
    });
  }

  /**
   * Log health check.
   */
  logHealthCheck(agentId: string, status: string, metadata?: Record<string, unknown>): void {
    this.log({
      event: 'agent_health_check',
      agentId,
      correlationId: this.correlationId,
      metadata: { ...metadata, status },
    });
  }

  /**
   * Log MCP servers load event.
   */
  logMCPLoad(configPath: string, serverCount: number, metadata?: Record<string, unknown>): void {
    this.log({
      event: 'mcp_load',
      correlationId: this.correlationId,
      metadata: { ...metadata, configPath, serverCount },
    });
  }

  /**
   * Log MCP agent registration.
   */
  logMCPAgentRegistered(agentId: string, serverName: string, metadata?: Record<string, unknown>): void {
    this.log({
      event: 'mcp_agent_registered',
      agentId,
      correlationId: this.correlationId,
      metadata: { ...metadata, serverName },
    });
  }

  /**
   * Log MCP agent registration failure.
   */
  logMCPAgentRegistrationFailed(agentId: string, serverName: string, error: string, metadata?: Record<string, unknown>): void {
    this.log({
      event: 'mcp_agent_registration_failed',
      agentId,
      error,
      correlationId: this.correlationId,
      metadata: { ...metadata, serverName },
    });
  }
}

/**
 * Generate a new correlation ID.
 */
export function generateCorrelationId(): string {
  return randomUUID();
}
