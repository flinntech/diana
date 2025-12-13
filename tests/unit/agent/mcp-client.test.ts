/**
 * Unit Tests for MCPClientManager
 *
 * Feature: 004-agent-mcp-foundation
 * User Story 2: Discover Tools from MCP Server
 *
 * TDD: These tests are written FIRST and should FAIL until implementation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Use vi.hoisted to define mock classes before they're referenced in vi.mock
const { MockClient, MockStdioClientTransport } = vi.hoisted(() => {
  // Mock Client class
  class MockClient {
    connect = vi.fn().mockResolvedValue(undefined);
    close = vi.fn().mockResolvedValue(undefined);
    listTools = vi.fn().mockResolvedValue({
      tools: [
        {
          name: 'test_mcp_tool',
          description: 'A test MCP tool',
          inputSchema: {
            type: 'object',
            properties: {
              input: { type: 'string', description: 'Input value' },
            },
            required: ['input'],
          },
        },
      ],
    });
    callTool = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Tool executed' }],
    });
  }

  // Mock StdioClientTransport class
  class MockStdioClientTransport {
    constructor(_options: unknown) {
      // Store options if needed for testing
    }
  }

  return { MockClient, MockStdioClientTransport };
});

// Mock the MCP SDK
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: MockClient,
}));

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: MockStdioClientTransport,
}));

import { MCPClientManager } from '../../../src/agent/mcp-client-manager.js';
import type { MCPServerConfig, MCPConnectionStatus } from '../../../src/agent/types/mcp.js';

// =============================================================================
// Test Helpers
// =============================================================================

function createTestConfig(overrides: Partial<MCPServerConfig> = {}): MCPServerConfig {
  return {
    name: 'test-server',
    command: 'node',
    args: ['test-server.js'],
    timeout: 10000,
    autoStart: true,
    ...overrides,
  };
}

// =============================================================================
// T027: MCPClientManager connects to MCP server
// =============================================================================

describe('MCPClientManager', () => {
  let manager: MCPClientManager;
  let testConfigs: MCPServerConfig[];

  beforeEach(() => {
    testConfigs = [createTestConfig()];
    manager = new MCPClientManager(testConfigs);
  });

  afterEach(async () => {
    await manager.shutdown();
  });

  describe('connection management (T027)', () => {
    it('connects to a configured MCP server', async () => {
      await manager.connect('test-server');

      const state = manager.getConnectionState('test-server');
      expect(state).toBeDefined();
      expect(state?.status).toBe('ready');
    });

    it('throws for unknown server name', async () => {
      await expect(manager.connect('unknown-server')).rejects.toThrow();
    });

    it('handles connection with autoStart servers', async () => {
      const autoStartManager = new MCPClientManager([
        createTestConfig({ autoStart: true }),
      ]);

      await autoStartManager.connectAutoStart();

      const state = autoStartManager.getConnectionState('test-server');
      expect(state?.status).toBe('ready');

      await autoStartManager.shutdown();
    });

    it('skips non-autoStart servers on initial connect', async () => {
      const mixedManager = new MCPClientManager([
        createTestConfig({ name: 'auto', autoStart: true }),
        createTestConfig({ name: 'manual', autoStart: false }),
      ]);

      await mixedManager.connectAutoStart();

      expect(mixedManager.getConnectionState('auto')?.status).toBe('ready');
      expect(mixedManager.getConnectionState('manual')?.status).toBe('disconnected');

      await mixedManager.shutdown();
    });
  });

  // =============================================================================
  // T028: MCPClientManager discovers tools from server
  // =============================================================================

  describe('tool discovery (T028)', () => {
    it('discovers tools after connection', async () => {
      await manager.connect('test-server');

      const tools = manager.getTools('test-server');

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('test_mcp_tool');
      expect(tools[0].description).toBe('A test MCP tool');
    });

    it('returns empty array for disconnected server', () => {
      const tools = manager.getTools('test-server');

      expect(tools).toEqual([]);
    });

    it('converts MCP tool schema to ToolDefinition format', async () => {
      await manager.connect('test-server');

      const tools = manager.getTools('test-server');
      const tool = tools[0];

      expect(tool.name).toBe('test_mcp_tool');
      expect(tool.description).toBe('A test MCP tool');
      expect(tool.parameters).toEqual({
        type: 'object',
        properties: {
          input: { type: 'string', description: 'Input value' },
        },
        required: ['input'],
      });
    });
  });

  // =============================================================================
  // T029: MCPClientManager handles disconnection
  // =============================================================================

  describe('disconnection handling (T029)', () => {
    it('disconnects from a server', async () => {
      await manager.connect('test-server');
      await manager.disconnect('test-server');

      const state = manager.getConnectionState('test-server');
      expect(state?.status).toBe('disconnected');
    });

    it('clears tools on disconnection', async () => {
      await manager.connect('test-server');
      expect(manager.getTools('test-server')).toHaveLength(1);

      await manager.disconnect('test-server');
      expect(manager.getTools('test-server')).toEqual([]);
    });

    it('handles disconnect for already disconnected server', async () => {
      // Should not throw
      await expect(manager.disconnect('test-server')).resolves.not.toThrow();
    });
  });

  // =============================================================================
  // T030: MCPClientManager executes tools
  // =============================================================================

  describe('tool execution (T030)', () => {
    it('executes a tool on a connected server', async () => {
      await manager.connect('test-server');

      const result = await manager.executeTool(
        'test-server',
        'test_mcp_tool',
        { input: 'test value' }
      );

      expect(result.success).toBe(true);
    });

    it('returns error for disconnected server', async () => {
      const result = await manager.executeTool(
        'test-server',
        'test_mcp_tool',
        { input: 'test' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not connected');
    });

    it('returns error for unknown server', async () => {
      const result = await manager.executeTool(
        'unknown-server',
        'test_tool',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  // =============================================================================
  // Additional tests
  // =============================================================================

  describe('reconnection polling (T035)', () => {
    it('starts reconnection polling', () => {
      expect(() => manager.startReconnectPolling()).not.toThrow();
    });

    it('stops reconnection polling', () => {
      manager.startReconnectPolling();
      expect(() => manager.stopReconnectPolling()).not.toThrow();
    });
  });

  describe('shutdown', () => {
    it('disconnects all servers on shutdown', async () => {
      await manager.connect('test-server');

      await manager.shutdown();

      const state = manager.getConnectionState('test-server');
      expect(state?.status).toBe('disconnected');
    });
  });

  describe('getAllConnectionStates', () => {
    it('returns all connection states', async () => {
      const multiManager = new MCPClientManager([
        createTestConfig({ name: 'server-1' }),
        createTestConfig({ name: 'server-2' }),
      ]);

      const states = multiManager.getAllConnectionStates();

      expect(states).toHaveLength(2);
      expect(states.map(s => s.serverName)).toContain('server-1');
      expect(states.map(s => s.serverName)).toContain('server-2');

      await multiManager.shutdown();
    });
  });
});
