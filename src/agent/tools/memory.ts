/**
 * Memory Tool Wrappers
 *
 * Feature: 002-llm-agent-core
 * Date: 2025-12-10
 *
 * Tool wrappers for KeyFactStore operations.
 */

import type { Tool, ToolResult } from '../../types/agent.js';
import { KeyFactStore } from '../memory.js';

// =============================================================================
// Tool Factory Functions
// =============================================================================

/**
 * Create the save_fact tool
 */
export function createSaveFactTool(keyFactStore: KeyFactStore): Tool {
  return {
    name: 'save_fact',
    description:
      'Save an important fact about the user for future reference. Use this when you learn something important about the user that should be remembered across sessions, such as preferences, important information, or notable details.',
    parameters: {
      type: 'object',
      required: ['content'],
      properties: {
        content: {
          type: 'string',
          description: 'The fact to remember',
        },
        important: {
          type: 'boolean',
          description: 'Mark this fact as important (always loaded in context)',
        },
      },
    },
    execute: async (args: Record<string, unknown>): Promise<ToolResult> => {
      try {
        const content = args.content as string;
        const important = args.important as boolean | undefined;

        const tags: string[] = [];
        if (important) {
          tags.push('#important');
        }

        keyFactStore.addFact({
          content,
          tags,
          createdAt: new Date(),
        });

        // Save to file
        await keyFactStore.save();

        return {
          success: true,
          data: {
            message: `Fact saved: "${content}"`,
            important: !!important,
          },
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        return {
          success: false,
          error: errorMessage,
        };
      }
    },
  };
}

/**
 * Register memory tools with a registry
 */
export function registerMemoryTools(
  registry: { register: (tool: Tool) => void },
  keyFactStore: KeyFactStore
): void {
  registry.register(createSaveFactTool(keyFactStore));
}
