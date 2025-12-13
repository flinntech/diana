/**
 * Agent Errors - Custom error classes for the agent system
 *
 * Feature: 004-agent-mcp-foundation
 * Date: 2025-12-12
 */

import { AgentErrorCode } from '../types/agent.js';

/**
 * Extended error class for agent system errors.
 * Provides error codes for programmatic error handling.
 */
export class AgentSystemError extends Error {
  readonly code: AgentErrorCode;
  readonly details?: Record<string, unknown>;
  readonly timestamp: Date;

  constructor(code: AgentErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AgentSystemError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date();

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AgentSystemError);
    }
  }

  /**
   * Create a formatted error message including details.
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

/**
 * Create an agent initialization error.
 */
export function createInitError(agentId: string, reason: string): AgentSystemError {
  return new AgentSystemError('AGENT_INIT_FAILED', `Agent '${agentId}' failed to initialize: ${reason}`, {
    agentId,
  });
}

/**
 * Create an agent shutdown error.
 */
export function createShutdownError(agentId: string, reason: string): AgentSystemError {
  return new AgentSystemError('AGENT_SHUTDOWN_FAILED', `Agent '${agentId}' failed to shutdown: ${reason}`, {
    agentId,
  });
}

/**
 * Create an agent not found error.
 */
export function createAgentNotFoundError(agentId: string): AgentSystemError {
  return new AgentSystemError('AGENT_NOT_FOUND', `Agent '${agentId}' not found`, {
    agentId,
  });
}

/**
 * Create an agent unavailable error.
 */
export function createAgentUnavailableError(agentId: string, reason?: string): AgentSystemError {
  const message = reason
    ? `Agent '${agentId}' is unavailable: ${reason}`
    : `Agent '${agentId}' is unavailable`;
  return new AgentSystemError('AGENT_UNAVAILABLE', message, {
    agentId,
  });
}

/**
 * Create a tool execution timeout error.
 */
export function createTimeoutError(toolName: string, timeoutMs: number): AgentSystemError {
  return new AgentSystemError('TOOL_EXECUTION_TIMEOUT', `Tool '${toolName}' execution timed out after ${timeoutMs}ms`, {
    toolName,
    timeoutMs,
  });
}

/**
 * Create a tool not found error.
 */
export function createToolNotFoundError(toolName: string): AgentSystemError {
  return new AgentSystemError('TOOL_NOT_FOUND', `Tool '${toolName}' not found`, {
    toolName,
  });
}

/**
 * Create an MCP connection error.
 */
export function createMCPConnectionError(serverName: string, reason: string): AgentSystemError {
  return new AgentSystemError('MCP_CONNECTION_FAILED', `Failed to connect to MCP server '${serverName}': ${reason}`, {
    serverName,
  });
}

/**
 * Create an MCP tool discovery error.
 */
export function createMCPDiscoveryError(serverName: string, reason: string): AgentSystemError {
  return new AgentSystemError('MCP_TOOL_DISCOVERY_FAILED', `Failed to discover tools from MCP server '${serverName}': ${reason}`, {
    serverName,
  });
}

/**
 * Create an MCP server unavailable error.
 */
export function createMCPUnavailableError(serverName: string): AgentSystemError {
  return new AgentSystemError('MCP_SERVER_UNAVAILABLE', `MCP server '${serverName}' is unavailable`, {
    serverName,
  });
}

/**
 * Type guard to check if an error is an AgentSystemError.
 */
export function isAgentSystemError(error: unknown): error is AgentSystemError {
  return error instanceof AgentSystemError;
}

/**
 * Extract error code from any error, with fallback.
 */
export function getErrorCode(error: unknown): AgentErrorCode {
  if (isAgentSystemError(error)) {
    return error.code;
  }
  return 'TOOL_EXECUTION_FAILED';
}
