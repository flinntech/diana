/**
 * MCP Types - Model Context Protocol client types
 *
 * Feature: 004-agent-mcp-foundation
 * Date: 2025-12-12
 */

import type { ToolResult } from '../../types/agent.js';
import type { ToolDefinition } from './agent.js';

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
   * Connect to all servers with autoStart enabled.
   */
  connectAutoStart(): Promise<void>;

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
   * Get tools from a connected server.
   */
  getTools(serverName: string): ToolDefinition[];

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
