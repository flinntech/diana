/**
 * Integration Tests for Agent System
 *
 * Feature: 004-agent-mcp-foundation
 * Phase 7: Polish & Cross-Cutting Concerns
 *
 * These tests verify end-to-end behavior of the agent system.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Orchestrator } from '../../src/agent/orchestrator.js';
import { LegacyToolAgent } from '../../src/agent/legacy-tool-agent.js';
import { ToolRegistry } from '../../src/agent/tools.js';
import type { Agent, AgentManifest, ToolDefinition } from '../../src/agent/types/agent.js';
import type { ToolResult } from '../../src/types/agent.js';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a simple test agent with configurable tools
 */
function createTestAgent(options: {
  id: string;
  name: string;
  tools: ToolDefinition[];
  executeResults?: Record<string, ToolResult>;
}): Agent {
  const { id, name, tools, executeResults = {} } = options;
  let initialized = false;

  return {
    async initialize() {
      initialized = true;
    },
    async execute(toolName: string, _params: Record<string, unknown>): Promise<ToolResult> {
      if (!initialized) {
        return { success: false, error: 'Agent not initialized' };
      }
      return executeResults[toolName] ?? { success: true, data: `Executed ${toolName}` };
    },
    async shutdown() {
      initialized = false;
    },
    getManifest(): AgentManifest {
      return {
        id,
        name,
        tools,
        capabilities: [],
        requiresApproval: false,
      };
    },
  };
}

// =============================================================================
// T056: Full agent lifecycle integration test
// =============================================================================

describe('Agent System Integration', () => {
  let orchestrator: Orchestrator;

  beforeEach(() => {
    orchestrator = new Orchestrator();
  });

  afterEach(async () => {
    await orchestrator.shutdown();
  });

  describe('full agent lifecycle (T056)', () => {
    it('registers, executes, and shuts down agents correctly', async () => {
      // Create a test agent
      const agent = createTestAgent({
        id: 'lifecycle-agent',
        name: 'Lifecycle Test Agent',
        tools: [
          {
            name: 'lifecycle_tool',
            description: 'A tool for lifecycle testing',
            parameters: { type: 'object', properties: {} },
          },
        ],
        executeResults: {
          lifecycle_tool: { success: true, data: 'lifecycle result' },
        },
      });

      // Register the agent
      orchestrator.registerAgentFactory('lifecycle-agent', () => agent);

      // Verify agent is registered
      expect(orchestrator.hasAgent('lifecycle-agent')).toBe(true);

      // Execute a tool (triggers initialization)
      const result = await orchestrator.execute('lifecycle_tool', {});
      expect(result.success).toBe(true);
      expect(result.data).toBe('lifecycle result');

      // Check health
      const health = await orchestrator.getAgentHealth('lifecycle-agent');
      expect(health.status).toBe('healthy');

      // Stop the agent
      await orchestrator.stopAgent('lifecycle-agent');
      const stoppedHealth = await orchestrator.getAgentHealth('lifecycle-agent');
      expect(stoppedHealth.status).toBe('unhealthy');

      // Restart the agent
      await orchestrator.startAgent('lifecycle-agent');
      const restartedHealth = await orchestrator.getAgentHealth('lifecycle-agent');
      expect(restartedHealth.status).toBe('healthy');
    });
  });

  // =============================================================================
  // T063: End-to-end tool execution through Session
  // =============================================================================

  describe('end-to-end tool execution (T063)', () => {
    it('executes tools through orchestrator and returns results', async () => {
      const agent = createTestAgent({
        id: 'e2e-agent',
        name: 'E2E Test Agent',
        tools: [
          {
            name: 'e2e_tool',
            description: 'End-to-end test tool',
            parameters: {
              type: 'object',
              properties: {
                input: { type: 'string', description: 'Input value' },
              },
            },
          },
        ],
        executeResults: {
          e2e_tool: { success: true, data: { processed: true } },
        },
      });

      orchestrator.registerAgentFactory('e2e-agent', () => agent);

      const result = await orchestrator.execute('e2e_tool', { input: 'test' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ processed: true });
    });

    it('handles tool execution failures gracefully', async () => {
      const agent = createTestAgent({
        id: 'failing-agent',
        name: 'Failing Agent',
        tools: [
          {
            name: 'failing_tool',
            description: 'A tool that fails',
            parameters: { type: 'object', properties: {} },
          },
        ],
        executeResults: {
          failing_tool: { success: false, error: 'Intentional failure' },
        },
      });

      orchestrator.registerAgentFactory('failing-agent', () => agent);

      const result = await orchestrator.execute('failing_tool', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Intentional failure');
    });
  });

  // =============================================================================
  // T065: Legacy tools work identically through orchestrator
  // =============================================================================

  describe('legacy tool compatibility (T065)', () => {
    it('wraps legacy ToolRegistry and executes tools through orchestrator', async () => {
      // Create a legacy tool registry with some tools
      const registry = new ToolRegistry();
      registry.register({
        name: 'legacy_tool',
        description: 'A legacy tool',
        parameters: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Message' },
          },
          required: ['message'],
        },
        execute: async (args: Record<string, unknown>) => ({
          success: true,
          data: `Legacy: ${args.message}`,
        }),
      });

      // Wrap with LegacyToolAgent
      const legacyAgent = new LegacyToolAgent(registry);

      // Register with orchestrator
      orchestrator.registerAgentFactory('legacy-tools', () => legacyAgent);

      // Execute through orchestrator
      const result = await orchestrator.execute('legacy_tool', { message: 'Hello' });

      expect(result.success).toBe(true);
      expect(result.data).toBe('Legacy: Hello');
    });

    it('legacy tools appear in orchestrator tool definitions', () => {
      const registry = new ToolRegistry();
      registry.register({
        name: 'test_legacy_tool',
        description: 'Test legacy tool',
        parameters: { type: 'object', properties: {} },
        execute: async () => ({ success: true }),
      });

      const legacyAgent = new LegacyToolAgent(registry);
      orchestrator.registerAgentFactory('legacy-tools', () => legacyAgent);

      const tools = orchestrator.getAllToolDefinitions();
      const toolNames = tools.map((t) => t.function.name);

      expect(toolNames).toContain('test_legacy_tool');
    });
  });

  // =============================================================================
  // T066: Routing overhead < 5s (SC-001)
  // =============================================================================

  describe('routing overhead (T066/SC-001)', () => {
    it('routes tool execution with minimal overhead', async () => {
      const agent = createTestAgent({
        id: 'fast-agent',
        name: 'Fast Agent',
        tools: [
          {
            name: 'fast_tool',
            description: 'A fast tool',
            parameters: { type: 'object', properties: {} },
          },
        ],
        executeResults: {
          fast_tool: { success: true, data: 'fast' },
        },
      });

      orchestrator.registerAgentFactory('fast-agent', () => agent);

      // Warm up (first call initializes)
      await orchestrator.execute('fast_tool', {});

      // Measure routing overhead
      const iterations = 100;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        await orchestrator.execute('fast_tool', {});
      }

      const elapsed = performance.now() - start;
      const avgOverhead = elapsed / iterations;

      // SC-001: Routing overhead < 5000ms
      // In practice, should be < 5ms per call
      expect(avgOverhead).toBeLessThan(50); // 50ms per call is very generous
    });
  });

  // =============================================================================
  // T068: Register 10 agents with 50+ tools (SC-004)
  // =============================================================================

  describe('scalability (T068/SC-004)', () => {
    it('handles 10 agents with 50+ tools without degradation', async () => {
      // Register 10 agents, each with 6 tools (60 total)
      for (let i = 0; i < 10; i++) {
        const tools: ToolDefinition[] = [];
        for (let j = 0; j < 6; j++) {
          tools.push({
            name: `agent${i}_tool${j}`,
            description: `Tool ${j} from agent ${i}`,
            parameters: { type: 'object', properties: {} },
          });
        }

        const agent = createTestAgent({
          id: `agent-${i}`,
          name: `Agent ${i}`,
          tools,
        });

        orchestrator.registerAgentFactory(`agent-${i}`, () => agent);
      }

      // Verify all agents are registered
      const agentIds = orchestrator.getAgentIds();
      expect(agentIds).toHaveLength(10);

      // Verify all tools are available
      const allTools = orchestrator.getAllToolDefinitions();
      expect(allTools.length).toBeGreaterThanOrEqual(50);

      // Test tool execution from different agents
      const result1 = await orchestrator.execute('agent0_tool0', {});
      expect(result1.success).toBe(true);

      const result2 = await orchestrator.execute('agent9_tool5', {});
      expect(result2.success).toBe(true);
    });
  });

  // =============================================================================
  // T069: Health checks complete within 1s (SC-005)
  // =============================================================================

  describe('health check performance (T069/SC-005)', () => {
    it('completes health checks within 1 second', async () => {
      // Register multiple agents
      for (let i = 0; i < 5; i++) {
        const agent = createTestAgent({
          id: `health-agent-${i}`,
          name: `Health Agent ${i}`,
          tools: [
            {
              name: `health_tool_${i}`,
              description: `Health tool ${i}`,
              parameters: { type: 'object', properties: {} },
            },
          ],
        });

        orchestrator.registerAgentFactory(`health-agent-${i}`, () => agent);
      }

      // Measure health check performance
      const start = performance.now();
      const healthResults = await orchestrator.getAllAgentHealth();
      const elapsed = performance.now() - start;

      // SC-005: Health checks complete within 1s
      expect(elapsed).toBeLessThan(1000);
      expect(healthResults).toHaveLength(5);
    });
  });
});
