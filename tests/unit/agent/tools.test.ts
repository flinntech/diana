/**
 * Unit Tests for ToolRegistry
 *
 * Feature: 002-llm-agent-core
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ToolRegistry, createToolRegistry } from '../../../src/agent/tools.js';
import type { Tool, JSONSchema } from '../../../src/types/agent.js';

// Helper to create a test tool
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

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  describe('register', () => {
    it('registers a valid tool', () => {
      const tool = createTestTool();
      registry.register(tool);

      expect(registry.has('test_tool')).toBe(true);
      expect(registry.size()).toBe(1);
    });

    it('throws error for invalid tool name format', () => {
      const tool = createTestTool({ name: 'Invalid-Name' });

      expect(() => registry.register(tool)).toThrow('Invalid tool name');
    });

    it('throws error for duplicate tool registration', () => {
      const tool = createTestTool();
      registry.register(tool);

      expect(() => registry.register(tool)).toThrow('already registered');
    });

    it('accepts tool names with underscores', () => {
      const tool = createTestTool({ name: 'my_test_tool' });
      registry.register(tool);

      expect(registry.has('my_test_tool')).toBe(true);
    });

    it('accepts tool names with numbers', () => {
      const tool = createTestTool({ name: 'tool_v2' });
      registry.register(tool);

      expect(registry.has('tool_v2')).toBe(true);
    });
  });

  describe('get', () => {
    it('returns registered tool', () => {
      const tool = createTestTool();
      registry.register(tool);

      const retrieved = registry.get('test_tool');
      expect(retrieved).toBe(tool);
    });

    it('returns undefined for non-existent tool', () => {
      const result = registry.get('nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('has', () => {
    it('returns true for registered tool', () => {
      registry.register(createTestTool());
      expect(registry.has('test_tool')).toBe(true);
    });

    it('returns false for non-existent tool', () => {
      expect(registry.has('nonexistent')).toBe(false);
    });
  });

  describe('getToolDefinitions', () => {
    it('returns empty array when no tools registered', () => {
      const definitions = registry.getToolDefinitions();
      expect(definitions).toEqual([]);
    });

    it('returns tool definitions in Ollama format', () => {
      registry.register(createTestTool());

      const definitions = registry.getToolDefinitions();
      expect(definitions).toHaveLength(1);
      expect(definitions[0]).toEqual({
        type: 'function',
        function: {
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
        },
      });
    });

    it('returns definitions for multiple tools', () => {
      registry.register(createTestTool({ name: 'tool_one' }));
      registry.register(createTestTool({ name: 'tool_two' }));

      const definitions = registry.getToolDefinitions();
      expect(definitions).toHaveLength(2);
    });
  });

  describe('execute', () => {
    it('executes registered tool with valid arguments', async () => {
      const executeFn = vi.fn().mockResolvedValue({ success: true, data: 'result' });
      registry.register(createTestTool({ execute: executeFn }));

      const result = await registry.execute('test_tool', { message: 'hello' });

      expect(executeFn).toHaveBeenCalledWith({ message: 'hello' });
      expect(result).toEqual({ success: true, data: 'result' });
    });

    it('returns error for non-existent tool', async () => {
      const result = await registry.execute('nonexistent', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('returns error for missing required arguments', async () => {
      registry.register(createTestTool());

      const result = await registry.execute('test_tool', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required argument');
    });

    it('returns error for wrong argument type', async () => {
      registry.register(createTestTool());

      const result = await registry.execute('test_tool', { message: 123 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('should be string');
    });

    it('validates array type arguments', async () => {
      const tool = createTestTool({
        name: 'array_tool',
        parameters: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              description: 'A list of items',
            },
          },
          required: ['items'],
        },
      });
      registry.register(tool);

      const result = await registry.execute('array_tool', { items: 'not-an-array' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('should be an array');
    });

    it('validates enum arguments', async () => {
      const tool = createTestTool({
        name: 'enum_tool',
        parameters: {
          type: 'object',
          properties: {
            level: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'Priority level',
            },
          },
          required: ['level'],
        },
      });
      registry.register(tool);

      const result = await registry.execute('enum_tool', { level: 'invalid' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('must be one of');
    });

    it('allows extra properties not in schema', async () => {
      const executeFn = vi.fn().mockResolvedValue({ success: true });
      registry.register(createTestTool({ execute: executeFn }));

      const result = await registry.execute('test_tool', {
        message: 'hello',
        extra: 'ignored',
      });

      expect(result.success).toBe(true);
    });

    it('catches and wraps tool execution errors', async () => {
      const tool = createTestTool({
        execute: vi.fn().mockRejectedValue(new Error('Tool crashed')),
      });
      registry.register(tool);

      const result = await registry.execute('test_tool', { message: 'hello' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Tool execution failed');
      expect(result.error).toContain('Tool crashed');
    });
  });

  describe('getDescriptions', () => {
    it('returns "no tools" message when empty', () => {
      const descriptions = registry.getDescriptions();
      expect(descriptions).toBe('_No tools available_');
    });

    it('returns markdown-formatted tool descriptions', () => {
      registry.register(createTestTool());

      const descriptions = registry.getDescriptions();

      expect(descriptions).toContain('### test_tool');
      expect(descriptions).toContain('A test tool for unit testing');
      expect(descriptions).toContain('**Parameters:**');
      expect(descriptions).toContain('`message`');
      expect(descriptions).toContain('(required)');
    });

    it('includes descriptions for all tools', () => {
      registry.register(createTestTool({ name: 'tool_a', description: 'Tool A' }));
      registry.register(createTestTool({ name: 'tool_b', description: 'Tool B' }));

      const descriptions = registry.getDescriptions();

      expect(descriptions).toContain('### tool_a');
      expect(descriptions).toContain('Tool A');
      expect(descriptions).toContain('### tool_b');
      expect(descriptions).toContain('Tool B');
    });
  });

  describe('size', () => {
    it('returns 0 for empty registry', () => {
      expect(registry.size()).toBe(0);
    });

    it('returns correct count after registrations', () => {
      registry.register(createTestTool({ name: 'tool_a' }));
      registry.register(createTestTool({ name: 'tool_b' }));
      registry.register(createTestTool({ name: 'tool_c' }));

      expect(registry.size()).toBe(3);
    });
  });

  describe('getNames', () => {
    it('returns empty array when no tools', () => {
      expect(registry.getNames()).toEqual([]);
    });

    it('returns all registered tool names', () => {
      registry.register(createTestTool({ name: 'alpha' }));
      registry.register(createTestTool({ name: 'beta' }));

      const names = registry.getNames();

      expect(names).toContain('alpha');
      expect(names).toContain('beta');
    });
  });

  describe('createToolRegistry factory', () => {
    it('creates ToolRegistry instance', () => {
      const registry = createToolRegistry();
      expect(registry).toBeInstanceOf(ToolRegistry);
    });
  });
});
