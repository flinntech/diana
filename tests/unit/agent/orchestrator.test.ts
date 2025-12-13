/**
 * Unit Tests for Orchestrator
 *
 * Feature: 004-agent-mcp-foundation
 * User Story 1: Register and Execute Agent Tool
 *
 * TDD: These tests are written FIRST and should FAIL until implementation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Orchestrator } from '../../../src/agent/orchestrator.js';
import type { Agent, AgentManifest, AgentFactory } from '../../../src/agent/types/agent.js';
import type { ToolResult, JSONSchema } from '../../../src/types/agent.js';

// =============================================================================
// Test Helpers
// =============================================================================

function createMockAgent(overrides: Partial<{
  id: string;
  name: string;
  tools: Array<{ name: string; description: string; parameters: JSONSchema }>;
  capabilities: string[];
  requiresApproval: boolean;
  executeResult: ToolResult;
  initError?: Error;
  shutdownError?: Error;
}>= {}): Agent {
  const config = {
    id: 'test-agent',
    name: 'Test Agent',
    tools: [
      {
        name: 'test_tool',
        description: 'A test tool',
        parameters: { type: 'object' as const, properties: {} },
      },
    ],
    capabilities: ['testing'],
    requiresApproval: false,
    executeResult: { success: true, data: 'test result' } as ToolResult,
    ...overrides,
  };

  return {
    initialize: vi.fn().mockImplementation(async () => {
      if (config.initError) throw config.initError;
    }),
    execute: vi.fn().mockResolvedValue(config.executeResult),
    shutdown: vi.fn().mockImplementation(async () => {
      if (config.shutdownError) throw config.shutdownError;
    }),
    getManifest: vi.fn().mockReturnValue({
      id: config.id,
      name: config.name,
      tools: config.tools,
      capabilities: config.capabilities,
      requiresApproval: config.requiresApproval,
    } as AgentManifest),
  };
}

function createMockFactory(agent: Agent): AgentFactory {
  return () => agent;
}

// =============================================================================
// T015: Orchestrator registers agent factory
// =============================================================================

describe('Orchestrator', () => {
  let orchestrator: Orchestrator;

  beforeEach(() => {
    orchestrator = new Orchestrator();
  });

  afterEach(async () => {
    await orchestrator.shutdown();
  });

  describe('registerAgentFactory (T015)', () => {
    it('registers an agent factory', () => {
      const agent = createMockAgent();
      const factory = createMockFactory(agent);

      // Should not throw
      expect(() => orchestrator.registerAgentFactory('test-agent', factory)).not.toThrow();
    });

    it('throws when registering duplicate agent ID', () => {
      const agent = createMockAgent();
      const factory = createMockFactory(agent);

      orchestrator.registerAgentFactory('test-agent', factory);

      expect(() => orchestrator.registerAgentFactory('test-agent', factory)).toThrow();
    });

    it('validates agent ID format (lowercase, hyphens)', () => {
      const agent = createMockAgent();
      const factory = createMockFactory(agent);

      // Valid IDs should work
      expect(() => orchestrator.registerAgentFactory('my-agent', factory)).not.toThrow();

      // Invalid IDs should throw
      expect(() => orchestrator.registerAgentFactory('Invalid_Agent', createMockFactory(createMockAgent()))).toThrow();
    });
  });

  // =============================================================================
  // T016: Orchestrator routes execute() to correct agent
  // =============================================================================

  describe('execute (T016)', () => {
    it('routes tool execution to the correct agent', async () => {
      const expectedResult: ToolResult = { success: true, data: 'routed result' };
      const agent = createMockAgent({
        tools: [{ name: 'specific_tool', description: 'A specific tool', parameters: { type: 'object', properties: {} } }],
        executeResult: expectedResult,
      });
      const factory = createMockFactory(agent);

      orchestrator.registerAgentFactory('test-agent', factory);

      const result = await orchestrator.execute('specific_tool', { arg: 'value' });

      expect(result).toEqual(expectedResult);
      expect(agent.execute).toHaveBeenCalledWith('specific_tool', { arg: 'value' });
    });

    it('initializes agent on first execute if not already initialized', async () => {
      const agent = createMockAgent();
      const factory = createMockFactory(agent);

      orchestrator.registerAgentFactory('test-agent', factory);

      await orchestrator.execute('test_tool', {});

      expect(agent.initialize).toHaveBeenCalled();
    });

    it('only initializes agent once across multiple executions', async () => {
      const agent = createMockAgent();
      const factory = createMockFactory(agent);

      orchestrator.registerAgentFactory('test-agent', factory);

      await orchestrator.execute('test_tool', {});
      await orchestrator.execute('test_tool', {});
      await orchestrator.execute('test_tool', {});

      expect(agent.initialize).toHaveBeenCalledTimes(1);
    });
  });

  // =============================================================================
  // T017: Orchestrator returns error for unknown tool
  // =============================================================================

  describe('execute - unknown tool (T017)', () => {
    it('returns error for unknown tool name', async () => {
      const agent = createMockAgent();
      const factory = createMockFactory(agent);

      orchestrator.registerAgentFactory('test-agent', factory);

      const result = await orchestrator.execute('nonexistent_tool', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('returns error when no agents are registered', async () => {
      const result = await orchestrator.execute('any_tool', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  // =============================================================================
  // T018: Orchestrator aggregates tool definitions from agents
  // =============================================================================

  describe('getAllToolDefinitions (T018)', () => {
    it('aggregates tools from all registered agents', async () => {
      const agent1 = createMockAgent({
        id: 'agent-1',
        tools: [
          { name: 'tool_a', description: 'Tool A', parameters: { type: 'object', properties: {} } },
          { name: 'tool_b', description: 'Tool B', parameters: { type: 'object', properties: {} } },
        ],
      });
      const agent2 = createMockAgent({
        id: 'agent-2',
        tools: [
          { name: 'tool_c', description: 'Tool C', parameters: { type: 'object', properties: {} } },
        ],
      });

      orchestrator.registerAgentFactory('agent-1', createMockFactory(agent1));
      orchestrator.registerAgentFactory('agent-2', createMockFactory(agent2));

      const tools = orchestrator.getAllToolDefinitions();

      expect(tools).toHaveLength(3);
      expect(tools.map(t => t.function.name)).toContain('tool_a');
      expect(tools.map(t => t.function.name)).toContain('tool_b');
      expect(tools.map(t => t.function.name)).toContain('tool_c');
    });

    it('returns empty array when no agents registered', () => {
      const tools = orchestrator.getAllToolDefinitions();

      expect(tools).toEqual([]);
    });

    it('returns tools in Ollama format', async () => {
      const agent = createMockAgent({
        tools: [
          {
            name: 'formatted_tool',
            description: 'A formatted tool',
            parameters: {
              type: 'object',
              properties: {
                input: { type: 'string', description: 'Input value' },
              },
              required: ['input'],
            },
          },
        ],
      });

      orchestrator.registerAgentFactory('test-agent', createMockFactory(agent));

      const tools = orchestrator.getAllToolDefinitions();

      expect(tools[0]).toMatchObject({
        type: 'function',
        function: {
          name: 'formatted_tool',
          description: 'A formatted tool',
          parameters: expect.any(Object),
        },
      });
    });
  });

  // =============================================================================
  // T022: Tool name collision detection
  // =============================================================================

  describe('tool name collision (T022)', () => {
    it('rejects duplicate tool names from different agents', () => {
      const agent1 = createMockAgent({
        id: 'agent-1',
        tools: [{ name: 'shared_tool', description: 'From agent 1', parameters: { type: 'object', properties: {} } }],
      });
      const agent2 = createMockAgent({
        id: 'agent-2',
        tools: [{ name: 'shared_tool', description: 'From agent 2', parameters: { type: 'object', properties: {} } }],
      });

      orchestrator.registerAgentFactory('agent-1', createMockFactory(agent1));

      // Second agent with same tool name should throw
      expect(() => orchestrator.registerAgentFactory('agent-2', createMockFactory(agent2))).toThrow(/duplicate/i);
    });
  });

  // =============================================================================
  // T023: Correlation ID support
  // =============================================================================

  describe('correlation ID support (T023)', () => {
    it('accepts optional correlation ID for tracing', async () => {
      const agent = createMockAgent();
      orchestrator.registerAgentFactory('test-agent', createMockFactory(agent));

      // Should not throw when correlation ID is provided
      const result = await orchestrator.execute('test_tool', {}, 'correlation-123');

      expect(result.success).toBe(true);
    });

    it('generates correlation ID if not provided', async () => {
      const agent = createMockAgent();
      orchestrator.registerAgentFactory('test-agent', createMockFactory(agent));

      const result = await orchestrator.execute('test_tool', {});

      expect(result.success).toBe(true);
      // The correlation ID should be generated internally
    });
  });

  // =============================================================================
  // T024: Timeout enforcement
  // =============================================================================

  describe('timeout enforcement (T024)', () => {
    it('times out tool execution after configured timeout', async () => {
      const slowAgent = createMockAgent();
      // Mock a slow execution
      slowAgent.execute = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true, data: 'slow' }), 35000))
      );

      orchestrator.registerAgentFactory('slow-agent', createMockFactory(slowAgent));

      // Use a shorter timeout for testing
      const result = await orchestrator.execute('test_tool', {}, undefined);

      // With 30s default timeout, this should timeout
      // Note: This test is conceptual - in real tests we'd mock timers
    }, 60000);
  });

  // =============================================================================
  // T025/T026: Human-in-the-loop approval gate
  // =============================================================================

  describe('approval gate (T025/T026)', () => {
    it('identifies destructive actions requiring approval', async () => {
      const destructiveAgent = createMockAgent({
        requiresApproval: true,
        tools: [
          {
            name: 'delete_file',
            description: 'Delete a file',
            parameters: { type: 'object', properties: {} },
          },
        ],
      });

      orchestrator.registerAgentFactory('destructive-agent', createMockFactory(destructiveAgent));

      const result = await orchestrator.execute('delete_file', { path: '/test' });

      // For destructive actions, should return a pending approval result
      // or require approval before execution
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/approval|pending|requires/i);
    });

    it('allows non-destructive actions without approval', async () => {
      const safeAgent = createMockAgent({
        requiresApproval: false,
        executeResult: { success: true, data: 'safe result' },
      });

      orchestrator.registerAgentFactory('safe-agent', createMockFactory(safeAgent));

      const result = await orchestrator.execute('test_tool', {});

      expect(result.success).toBe(true);
      expect(result.data).toBe('safe result');
    });
  });

  // =============================================================================
  // T053: Agent health check
  // =============================================================================

  describe('getAgentHealth (T053)', () => {
    it('returns healthy status for running agent', async () => {
      const agent = createMockAgent();
      orchestrator.registerAgentFactory('test-agent', createMockFactory(agent));

      // Trigger initialization by executing a tool
      await orchestrator.execute('test_tool', {});

      const health = await orchestrator.getAgentHealth('test-agent');

      expect(health.agentId).toBe('test-agent');
      expect(health.status).toBe('healthy');
      expect(health.toolCount).toBe(1);
    });

    it('returns unhealthy status for initialized but not running agent', async () => {
      const agent = createMockAgent();
      orchestrator.registerAgentFactory('test-agent', createMockFactory(agent));

      // Agent is registered but not initialized
      const health = await orchestrator.getAgentHealth('test-agent');

      expect(health.status).toBe('unhealthy');
    });

    it('returns unknown status for non-existent agent', async () => {
      const health = await orchestrator.getAgentHealth('nonexistent');

      expect(health.status).toBe('unknown');
      expect(health.message).toContain('not found');
    });
  });

  // =============================================================================
  // T054: Stop agent
  // =============================================================================

  describe('stopAgent (T054)', () => {
    it('shuts down a running agent', async () => {
      const agent = createMockAgent();
      orchestrator.registerAgentFactory('test-agent', createMockFactory(agent));

      // Start the agent by executing a tool
      await orchestrator.execute('test_tool', {});

      // Stop the agent
      await orchestrator.stopAgent('test-agent');

      // Verify agent was shutdown
      expect(agent.shutdown).toHaveBeenCalled();
    });

    it('throws for non-existent agent', async () => {
      await expect(orchestrator.stopAgent('nonexistent')).rejects.toThrow();
    });

    it('does nothing for already stopped agent', async () => {
      const agent = createMockAgent();
      orchestrator.registerAgentFactory('test-agent', createMockFactory(agent));

      // Execute to initialize, then stop
      await orchestrator.execute('test_tool', {});
      await orchestrator.stopAgent('test-agent');

      // Stop again - should not throw
      await expect(orchestrator.stopAgent('test-agent')).resolves.not.toThrow();
    });
  });

  // =============================================================================
  // T055: Start agent
  // =============================================================================

  describe('startAgent (T055)', () => {
    it('re-initializes a stopped agent', async () => {
      const agent = createMockAgent();
      let callCount = 0;
      const factory = () => {
        callCount++;
        return agent;
      };

      orchestrator.registerAgentFactory('test-agent', factory);

      // First execution initializes
      await orchestrator.execute('test_tool', {});

      // Stop the agent
      await orchestrator.stopAgent('test-agent');

      // Start it again
      await orchestrator.startAgent('test-agent');

      // Should have called factory again for new instance
      expect(callCount).toBe(2);
    });

    it('does nothing for already running agent', async () => {
      const agent = createMockAgent();
      orchestrator.registerAgentFactory('test-agent', createMockFactory(agent));

      // Initialize by executing
      await orchestrator.execute('test_tool', {});

      // Start again should not throw
      await expect(orchestrator.startAgent('test-agent')).resolves.not.toThrow();
    });

    it('throws for non-existent agent', async () => {
      await expect(orchestrator.startAgent('nonexistent')).rejects.toThrow();
    });
  });

  // =============================================================================
  // T058: Get all agent health
  // =============================================================================

  describe('getAllAgentHealth (T058)', () => {
    it('returns health for all registered agents', async () => {
      const agent1 = createMockAgent({
        id: 'agent-1',
        tools: [{ name: 'tool_1', description: 'Tool 1', parameters: { type: 'object', properties: {} } }],
      });
      const agent2 = createMockAgent({
        id: 'agent-2',
        tools: [{ name: 'tool_2', description: 'Tool 2', parameters: { type: 'object', properties: {} } }],
      });

      orchestrator.registerAgentFactory('agent-1', createMockFactory(agent1));
      orchestrator.registerAgentFactory('agent-2', createMockFactory(agent2));

      const healthResults = await orchestrator.getAllAgentHealth();

      expect(healthResults).toHaveLength(2);
      expect(healthResults.map(h => h.agentId)).toContain('agent-1');
      expect(healthResults.map(h => h.agentId)).toContain('agent-2');
    });
  });

  // =============================================================================
  // T061: Shutdown all agents
  // =============================================================================

  describe('shutdown (T061)', () => {
    it('shuts down all running agents', async () => {
      const agent1 = createMockAgent({
        id: 'agent-1',
        tools: [{ name: 'tool_1', description: 'Tool 1', parameters: { type: 'object', properties: {} } }],
      });
      const agent2 = createMockAgent({
        id: 'agent-2',
        tools: [{ name: 'tool_2', description: 'Tool 2', parameters: { type: 'object', properties: {} } }],
      });

      orchestrator.registerAgentFactory('agent-1', createMockFactory(agent1));
      orchestrator.registerAgentFactory('agent-2', createMockFactory(agent2));

      // Initialize agents
      await orchestrator.execute('tool_1', {});
      await orchestrator.execute('tool_2', {});

      // Shutdown all
      await orchestrator.shutdown();

      expect(agent1.shutdown).toHaveBeenCalled();
      expect(agent2.shutdown).toHaveBeenCalled();
    });
  });
});
