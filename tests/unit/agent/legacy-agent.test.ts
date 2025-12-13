/**
 * Unit Tests for LegacyToolAgent
 *
 * Feature: 004-agent-mcp-foundation
 * User Story 3: Wrap Existing Tools as Agents
 *
 * TDD: These tests are written FIRST and should FAIL until implementation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LegacyToolAgent } from '../../../src/agent/legacy-tool-agent.js';
import { ToolRegistry } from '../../../src/agent/tools.js';
import type { Tool, JSONSchema } from '../../../src/types/agent.js';

// =============================================================================
// Test Helpers
// =============================================================================

function createTestTool(overrides: Partial<Tool> = {}): Tool {
  return {
    name: 'test_tool',
    description: 'A test tool for unit testing',
    parameters: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'A test message',
        },
      },
      required: ['message'],
    },
    execute: vi.fn().mockResolvedValue({ success: true, data: 'test result' }),
    ...overrides,
  };
}

function createPopulatedRegistry(): ToolRegistry {
  const registry = new ToolRegistry();

  registry.register({
    name: 'save_fact',
    description: 'Save a fact to memory',
    parameters: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'The fact content' },
      },
      required: ['content'],
    },
    execute: vi.fn().mockResolvedValue({ success: true, data: { id: '123' } }),
  });

  registry.register({
    name: 'write_daily_note',
    description: 'Write to daily note',
    parameters: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'The note content' },
      },
      required: ['content'],
    },
    execute: vi.fn().mockResolvedValue({ success: true, data: 'written' }),
  });

  registry.register({
    name: 'read_daily_note',
    description: 'Read from daily note',
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: vi.fn().mockResolvedValue({ success: true, data: 'content' }),
  });

  return registry;
}

// =============================================================================
// T041: LegacyToolAgent wraps ToolRegistry correctly
// =============================================================================

describe('LegacyToolAgent', () => {
  let registry: ToolRegistry;
  let agent: LegacyToolAgent;

  beforeEach(() => {
    registry = createPopulatedRegistry();
    agent = new LegacyToolAgent(registry);
  });

  describe('wrapping ToolRegistry (T041)', () => {
    it('creates agent from ToolRegistry', () => {
      expect(agent).toBeInstanceOf(LegacyToolAgent);
    });

    it('initialize() succeeds (no-op)', async () => {
      await expect(agent.initialize()).resolves.not.toThrow();
    });

    it('shutdown() succeeds (no-op)', async () => {
      await expect(agent.shutdown()).resolves.not.toThrow();
    });
  });

  // =============================================================================
  // T042: LegacyToolAgent.execute() delegates to registry
  // =============================================================================

  describe('execute() delegation (T042)', () => {
    it('delegates tool execution to underlying registry', async () => {
      const result = await agent.execute('save_fact', { content: 'test fact' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: '123' });
    });

    it('passes arguments correctly to the tool', async () => {
      const tool = registry.get('save_fact');
      const args = { content: 'test content', tags: ['tag1'] };

      await agent.execute('save_fact', args);

      expect(tool?.execute).toHaveBeenCalledWith(args);
    });

    it('returns error for unknown tool', async () => {
      const result = await agent.execute('nonexistent_tool', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('handles tool execution errors gracefully', async () => {
      // Create registry with failing tool that has proper schema
      const failingRegistry = new ToolRegistry();
      failingRegistry.register({
        name: 'failing_tool',
        description: 'A tool that fails',
        parameters: {
          type: 'object',
          properties: {},
        },
        execute: vi.fn().mockRejectedValue(new Error('Tool failed')),
      });

      const failingAgent = new LegacyToolAgent(failingRegistry);
      const result = await failingAgent.execute('failing_tool', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('failed');
    });
  });

  // =============================================================================
  // T043: LegacyToolAgent.getManifest() returns wrapped tools
  // =============================================================================

  describe('getManifest() (T043)', () => {
    it('returns manifest with correct agent ID', () => {
      const manifest = agent.getManifest();

      expect(manifest.id).toBe('legacy-tools');
    });

    it('returns manifest with descriptive name', () => {
      const manifest = agent.getManifest();

      expect(manifest.name).toContain('Legacy');
    });

    it('includes all tools from registry', () => {
      const manifest = agent.getManifest();

      expect(manifest.tools).toHaveLength(3);
      expect(manifest.tools.map(t => t.name)).toContain('save_fact');
      expect(manifest.tools.map(t => t.name)).toContain('write_daily_note');
      expect(manifest.tools.map(t => t.name)).toContain('read_daily_note');
    });

    it('converts tool definitions to ToolDefinition format', () => {
      const manifest = agent.getManifest();
      const saveFact = manifest.tools.find(t => t.name === 'save_fact');

      expect(saveFact).toBeDefined();
      expect(saveFact?.name).toBe('save_fact');
      expect(saveFact?.description).toBe('Save a fact to memory');
      expect(saveFact?.parameters).toBeDefined();
    });

    it('sets requiresApproval to false for legacy tools', () => {
      const manifest = agent.getManifest();

      // Legacy tools don't require approval by default
      expect(manifest.requiresApproval).toBe(false);
    });

    it('includes relevant capabilities', () => {
      const manifest = agent.getManifest();

      expect(manifest.capabilities).toContain('legacy');
      expect(manifest.capabilities).toContain('memory');
      expect(manifest.capabilities).toContain('obsidian');
    });
  });

  // =============================================================================
  // Additional tests for backward compatibility
  // =============================================================================

  describe('backward compatibility', () => {
    it('executes tools identically to direct registry access', async () => {
      const args = { content: 'test' };

      // Direct registry execution
      const directResult = await registry.execute('save_fact', args);

      // Agent-based execution (need new registry since mock is consumed)
      const freshRegistry = createPopulatedRegistry();
      const freshAgent = new LegacyToolAgent(freshRegistry);
      const agentResult = await freshAgent.execute('save_fact', args);

      // Results should be structurally identical
      expect(agentResult.success).toBe(directResult.success);
      expect(agentResult.data).toEqual(directResult.data);
    });

    it('preserves tool parameter schemas', () => {
      const manifest = agent.getManifest();
      const originalTool = registry.get('save_fact');
      const wrappedTool = manifest.tools.find(t => t.name === 'save_fact');

      expect(wrappedTool?.parameters).toEqual(originalTool?.parameters);
    });
  });
});
