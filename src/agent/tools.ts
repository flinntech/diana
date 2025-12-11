/**
 * Tool Registry
 *
 * Feature: 002-llm-agent-core
 * Date: 2025-12-10
 *
 * Registry for managing tools that DIANA can invoke.
 */

import type {
  Tool,
  ToolResult,
  OllamaToolDefinition,
  IToolRegistry,
  JSONSchema,
} from '../types/agent.js';
import { createAgentError } from '../types/agent.js';

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Validate arguments against a JSON Schema
 */
function validateArguments(
  args: Record<string, unknown>,
  schema: JSONSchema
): { valid: boolean; error?: string } {
  // Check required fields
  if (schema.required) {
    for (const required of schema.required) {
      if (!(required in args)) {
        return {
          valid: false,
          error: `Missing required argument: ${required}`,
        };
      }
    }
  }

  // Check property types
  for (const [key, value] of Object.entries(args)) {
    const propSchema = schema.properties[key];
    if (!propSchema) {
      // Allow extra properties (for flexibility)
      continue;
    }

    const expectedType = propSchema.type;
    const actualType = typeof value;

    if (expectedType === 'array' && !Array.isArray(value)) {
      return {
        valid: false,
        error: `Argument '${key}' should be an array`,
      };
    }

    if (expectedType !== 'array' && actualType !== expectedType) {
      return {
        valid: false,
        error: `Argument '${key}' should be ${expectedType}, got ${actualType}`,
      };
    }

    // Check enum values if specified
    if (propSchema.enum && !propSchema.enum.includes(value as string)) {
      return {
        valid: false,
        error: `Argument '${key}' must be one of: ${propSchema.enum.join(', ')}`,
      };
    }
  }

  return { valid: true };
}

// =============================================================================
// ToolRegistry Class
// =============================================================================

/**
 * Registry for tools that DIANA can invoke
 */
export class ToolRegistry implements IToolRegistry {
  private readonly tools: Map<string, Tool> = new Map();

  /**
   * Register a new tool
   */
  register(tool: Tool): void {
    // Validate tool name format
    if (!/^[a-z_][a-z0-9_]*$/.test(tool.name)) {
      throw createAgentError(
        'TOOL_EXECUTION_FAILED',
        `Invalid tool name '${tool.name}'. Must be lowercase alphanumeric with underscores.`
      );
    }

    // Check for duplicates
    if (this.tools.has(tool.name)) {
      throw createAgentError(
        'TOOL_EXECUTION_FAILED',
        `Tool '${tool.name}' is already registered`
      );
    }

    this.tools.set(tool.name, tool);
  }

  /**
   * Get a tool by name
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get all tools in Ollama format for API calls
   */
  getToolDefinitions(): OllamaToolDefinition[] {
    return Array.from(this.tools.values()).map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  /**
   * Execute a tool by name with the given arguments
   */
  async execute(
    name: string,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const tool = this.tools.get(name);

    if (!tool) {
      return {
        success: false,
        error: `Tool '${name}' not found`,
      };
    }

    // Validate arguments
    const validation = validateArguments(args, tool.parameters);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    try {
      return await tool.execute(args);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Tool execution failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Get markdown descriptions for system prompt
   */
  getDescriptions(): string {
    if (this.tools.size === 0) {
      return '_No tools available_';
    }

    const lines: string[] = [];

    for (const tool of this.tools.values()) {
      lines.push(`### ${tool.name}`);
      lines.push(tool.description);
      lines.push('');

      // List parameters
      if (Object.keys(tool.parameters.properties).length > 0) {
        lines.push('**Parameters:**');
        for (const [name, prop] of Object.entries(tool.parameters.properties)) {
          const required = tool.parameters.required?.includes(name);
          const reqMark = required ? ' (required)' : '';
          lines.push(`- \`${name}\`${reqMark}: ${prop.description}`);
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Get the number of registered tools
   */
  size(): number {
    return this.tools.size;
  }

  /**
   * Get all tool names
   */
  getNames(): string[] {
    return Array.from(this.tools.keys());
  }
}

/**
 * Create a new tool registry
 */
export function createToolRegistry(): ToolRegistry {
  return new ToolRegistry();
}
