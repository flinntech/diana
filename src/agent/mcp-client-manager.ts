/**
 * MCP Client Manager - Manages connections to MCP servers
 *
 * Feature: 004-agent-mcp-foundation
 * Date: 2025-12-12
 *
 * Per spec clarifications Q45, Q53:
 * - Config file: config/mcp-servers.json
 * - Auto-reconnect polling every 30s
 * - 10s connection timeout (SC-003)
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { ToolResult, JSONSchema, JSONSchemaProperty } from '../types/agent.js';
import type {
  MCPServerConfig,
  MCPConnectionState,
  MCPConnectionStatus,
  IMCPClientManager,
} from './types/mcp.js';
import type { ToolDefinition } from './types/agent.js';
import { createMCPConnectionError } from './errors.js';
import { DEFAULT_MCP_TIMEOUT_MS } from './utils/timeout.js';

/** Default reconnection polling interval (30s per spec Q53) */
const RECONNECT_INTERVAL_MS = 30_000;

/**
 * Manages connections to MCP servers.
 */
export class MCPClientManager implements IMCPClientManager {
  /** Server configurations */
  private readonly configs: Map<string, MCPServerConfig> = new Map();

  /** Active connections */
  private readonly connections: Map<string, {
    client: Client;
    transport: StdioClientTransport;
    state: MCPConnectionState;
  }> = new Map();

  /** Connection states (for servers not yet connected) */
  private readonly connectionStates: Map<string, MCPConnectionState> = new Map();

  /** Reconnection polling interval */
  private reconnectInterval: NodeJS.Timeout | null = null;

  constructor(configs: MCPServerConfig[]) {
    for (const config of configs) {
      this.configs.set(config.name, config);
      this.connectionStates.set(config.name, {
        serverName: config.name,
        status: 'disconnected',
        tools: [],
      });
    }
  }

  /**
   * Connect to all servers with autoStart enabled.
   */
  async connectAutoStart(): Promise<void> {
    const autoStartConfigs = Array.from(this.configs.values()).filter(
      (c) => c.autoStart !== false
    );

    await Promise.all(
      autoStartConfigs.map((config) =>
        this.connect(config.name).catch((error) => {
          console.error(`[MCP] Failed to connect to ${config.name}:`, error);
          // Don't throw - continue with other servers
        })
      )
    );
  }

  /**
   * Connect to an MCP server by name.
   */
  async connect(serverName: string): Promise<void> {
    const config = this.configs.get(serverName);
    if (!config) {
      throw createMCPConnectionError(serverName, 'Server configuration not found');
    }

    // Update state to connecting
    this.updateConnectionState(serverName, 'connecting');

    try {
      // Create MCP client
      const client = new Client(
        { name: 'diana-mcp', version: '1.0.0' },
        { capabilities: {} }
      );

      // Create stdio transport
      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: config.env,
      });

      // Connect with timeout
      const timeout = config.timeout ?? DEFAULT_MCP_TIMEOUT_MS;
      const connectPromise = client.connect(transport);

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error(`Connection timeout after ${timeout}ms`)),
          timeout
        );
      });

      await Promise.race([connectPromise, timeoutPromise]);

      // Update state to connected
      this.updateConnectionState(serverName, 'connected');

      // Discover tools
      const toolsResponse = await client.listTools();
      const tools = this.convertMCPTools(toolsResponse.tools);

      // Store connection
      this.connections.set(serverName, {
        client,
        transport,
        state: {
          serverName,
          status: 'ready',
          tools,
          lastHealthCheck: new Date(),
        },
      });

      // Update final state
      this.connectionStates.set(serverName, {
        serverName,
        status: 'ready',
        tools,
        lastHealthCheck: new Date(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.updateConnectionState(serverName, 'error', message);
      throw createMCPConnectionError(serverName, message);
    }
  }

  /**
   * Disconnect from an MCP server.
   */
  async disconnect(serverName: string): Promise<void> {
    const connection = this.connections.get(serverName);
    if (!connection) {
      // Already disconnected
      return;
    }

    try {
      await connection.client.close();
    } catch (error) {
      // Log but don't throw - we're disconnecting anyway
      console.error(`[MCP] Error closing connection to ${serverName}:`, error);
    }

    this.connections.delete(serverName);
    this.updateConnectionState(serverName, 'disconnected');
  }

  /**
   * Get connection state for a server.
   */
  getConnectionState(serverName: string): MCPConnectionState | undefined {
    return this.connectionStates.get(serverName);
  }

  /**
   * Get all connection states.
   */
  getAllConnectionStates(): MCPConnectionState[] {
    return Array.from(this.connectionStates.values());
  }

  /**
   * Get tools from a connected server.
   */
  getTools(serverName: string): ToolDefinition[] {
    const state = this.connectionStates.get(serverName);
    if (!state || state.status !== 'ready') {
      return [];
    }
    return state.tools;
  }

  /**
   * Execute a tool on an MCP server.
   */
  async executeTool(
    serverName: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const config = this.configs.get(serverName);
    if (!config) {
      return {
        success: false,
        error: `MCP server '${serverName}' not found`,
      };
    }

    const connection = this.connections.get(serverName);
    if (!connection || connection.state.status !== 'ready') {
      return {
        success: false,
        error: `MCP server '${serverName}' is not connected`,
      };
    }

    try {
      const result = await connection.client.callTool({
        name: toolName,
        arguments: args,
      });

      // Extract text content from MCP response
      // Result.content is an array of content blocks
      const content = result.content as Array<{ type: string; text?: string }>;
      const textContent = content
        .filter((c): c is { type: 'text'; text: string } => c.type === 'text' && typeof c.text === 'string')
        .map((c) => c.text)
        .join('\n');

      return {
        success: true,
        data: textContent || result.content,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Tool execution failed: ${message}`,
      };
    }
  }

  /**
   * Start reconnection polling for disconnected servers.
   */
  startReconnectPolling(): void {
    if (this.reconnectInterval) {
      return; // Already running
    }

    this.reconnectInterval = setInterval(async () => {
      const disconnected = Array.from(this.connectionStates.entries())
        .filter(([_, state]) => state.status === 'disconnected' || state.status === 'error')
        .map(([name]) => name);

      for (const serverName of disconnected) {
        const config = this.configs.get(serverName);
        if (config?.autoStart !== false) {
          try {
            await this.connect(serverName);
            console.log(`[MCP] Reconnected to ${serverName}`);
          } catch {
            // Silently continue - will retry on next interval
          }
        }
      }
    }, RECONNECT_INTERVAL_MS);
  }

  /**
   * Stop reconnection polling.
   */
  stopReconnectPolling(): void {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
  }

  /**
   * Shutdown all connections.
   */
  async shutdown(): Promise<void> {
    this.stopReconnectPolling();

    const disconnectPromises = Array.from(this.connections.keys()).map((name) =>
      this.disconnect(name)
    );

    await Promise.all(disconnectPromises);
  }

  /**
   * Convert MCP tools to ToolDefinition format.
   */
  private convertMCPTools(
    mcpTools: Array<{
      name: string;
      description?: string;
      inputSchema?: {
        type?: string;
        properties?: Record<string, unknown>;
        required?: string[];
      };
    }>
  ): ToolDefinition[] {
    return mcpTools.map((tool) => {
      // Convert MCP properties to JSONSchemaProperty format
      const mcpProperties = tool.inputSchema?.properties ?? {};
      const properties: Record<string, JSONSchemaProperty> = {};

      for (const [key, value] of Object.entries(mcpProperties)) {
        const prop = value as { type?: string; description?: string };
        properties[key] = {
          type: (prop.type ?? 'string') as JSONSchemaProperty['type'],
          description: prop.description ?? '',
        };
      }

      const parameters: JSONSchema = {
        type: 'object',
        properties,
        required: tool.inputSchema?.required,
      };

      return {
        name: tool.name,
        description: tool.description ?? '',
        parameters,
      };
    });
  }

  /**
   * Update connection state.
   */
  private updateConnectionState(
    serverName: string,
    status: MCPConnectionStatus,
    errorMessage?: string
  ): void {
    const current = this.connectionStates.get(serverName);
    this.connectionStates.set(serverName, {
      serverName,
      status,
      tools: status === 'disconnected' || status === 'error' ? [] : current?.tools ?? [],
      lastHealthCheck: current?.lastHealthCheck,
      errorMessage,
    });
  }
}

/**
 * Load MCP server configurations from a JSON file.
 */
export async function loadMCPConfigs(configPath: string): Promise<MCPServerConfig[]> {
  try {
    const fs = await import('fs/promises');
    const content = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(content) as { servers?: MCPServerConfig[] };
    return config.servers ?? [];
  } catch (error) {
    // Config file doesn't exist or is invalid - return empty array
    return [];
  }
}
