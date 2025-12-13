/**
 * MCP Agent - Wraps MCPClientManager as an Agent interface
 *
 * Feature: 004-agent-mcp-foundation
 * Task: T039
 * Date: 2025-12-12
 *
 * This agent wraps an MCP server connection, exposing its tools
 * through the standard Agent interface for orchestrator integration.
 */

import type { ToolResult } from '../types/agent.js';
import type { Agent, AgentManifest } from './types/agent.js';
import type { IMCPClientManager, MCPServerConfig } from './types/mcp.js';

/**
 * An Agent that wraps an MCP server connection.
 *
 * Each MCPAgent represents a single MCP server and exposes
 * its tools through the Agent interface.
 */
export class MCPAgent implements Agent {
  /** The server name this agent manages */
  private readonly serverName: string;

  /** Reference to the MCP client manager */
  private readonly clientManager: IMCPClientManager;

  /**
   * Create an MCPAgent for a specific MCP server.
   *
   * @param serverName - Name of the MCP server
   * @param clientManager - Shared MCP client manager
   */
  constructor(
    serverName: string,
    clientManager: IMCPClientManager
  ) {
    this.serverName = serverName;
    this.clientManager = clientManager;
  }

  /**
   * Initialize the agent by connecting to the MCP server.
   */
  async initialize(): Promise<void> {
    // Connect to the MCP server
    await this.clientManager.connect(this.serverName);
  }

  /**
   * Execute a tool on the MCP server.
   *
   * @param toolName - Name of the tool to execute
   * @param params - Tool parameters
   * @returns Tool execution result
   */
  async execute(
    toolName: string,
    params: Record<string, unknown>
  ): Promise<ToolResult> {
    return this.clientManager.executeTool(this.serverName, toolName, params);
  }

  /**
   * Shutdown the agent by disconnecting from the MCP server.
   */
  async shutdown(): Promise<void> {
    await this.clientManager.disconnect(this.serverName);
  }

  /**
   * Get the agent manifest with discovered tools.
   */
  getManifest(): AgentManifest {
    const tools = this.clientManager.getTools(this.serverName);

    return {
      id: `mcp-${this.serverName}`,
      name: `MCP: ${this.serverName}`,
      tools,
      capabilities: ['mcp'],
      // MCP tools may require approval depending on their nature
      // For now, we mark MCP agents as not requiring approval by default
      // Individual tools can be flagged as destructive in their metadata
      requiresApproval: false,
    };
  }

  /**
   * Get the server name this agent manages.
   */
  getServerName(): string {
    return this.serverName;
  }

  /**
   * Get the connection state of this agent's MCP server.
   */
  getConnectionState() {
    return this.clientManager.getConnectionState(this.serverName);
  }
}

/**
 * Factory function to create MCPAgent instances.
 *
 * @param config - MCP server configuration
 * @param clientManager - Shared MCP client manager
 * @returns Factory function that creates the MCPAgent
 */
export function createMCPAgentFactory(
  config: MCPServerConfig,
  clientManager: IMCPClientManager
): () => Agent {
  return () => new MCPAgent(config.name, clientManager);
}
