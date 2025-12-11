/**
 * Obsidian Tool Wrappers
 *
 * Feature: 002-llm-agent-core
 * Date: 2025-12-10
 *
 * Tool wrappers for ObsidianWriter operations.
 */

import { readFile } from 'fs/promises';
import { format } from 'date-fns';
import * as path from 'path';
import type { Tool, ToolResult } from '../../types/agent.js';
import { ObsidianWriter } from '../../obsidian/writer.js';
import type { ObsidianWriterConfig } from '../../types/obsidian.js';

// =============================================================================
// Tool Factory Functions
// =============================================================================

/**
 * Create the write_daily_note tool
 */
export function createWriteDailyNoteTool(config: ObsidianWriterConfig): Tool {
  const writer = new ObsidianWriter(config);

  return {
    name: 'write_daily_note',
    description:
      "Write an entry to today's daily log in Obsidian. Use this to record activities, notes, or events.",
    parameters: {
      type: 'object',
      required: ['activity'],
      properties: {
        activity: {
          type: 'string',
          description: 'The activity or note to log',
        },
        title: {
          type: 'string',
          description: 'Optional title for the entry',
        },
      },
    },
    execute: async (args: Record<string, unknown>): Promise<ToolResult> => {
      try {
        const result = await writer.writeDaily({
          activity: args.activity as string,
          title: args.title as string | undefined,
        });

        if (result.success) {
          return {
            success: true,
            data: {
              message: 'Entry written to daily log',
              filePath: result.filePath,
            },
          };
        } else {
          return {
            success: false,
            error: result.error.message,
          };
        }
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
 * Create the read_daily_note tool
 */
export function createReadDailyNoteTool(config: ObsidianWriterConfig): Tool {
  return {
    name: 'read_daily_note',
    description:
      "Read today's daily log from Obsidian. Returns the current entries for today.",
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description:
            'Optional date in YYYY-MM-DD format. Defaults to today.',
        },
      },
    },
    execute: async (args: Record<string, unknown>): Promise<ToolResult> => {
      try {
        const dateStr =
          (args.date as string) || format(new Date(), 'yyyy-MM-dd');
        const dailyPath = path.join(
          config.vaultPath,
          'daily',
          `${dateStr}.md`
        );

        const content = await readFile(dailyPath, 'utf-8');

        return {
          success: true,
          data: {
            date: dateStr,
            content,
          },
        };
      } catch (error) {
        if (
          error instanceof Error &&
          (error as NodeJS.ErrnoException).code === 'ENOENT'
        ) {
          return {
            success: true,
            data: {
              date:
                (args.date as string) || format(new Date(), 'yyyy-MM-dd'),
              content: 'No daily log exists for this date yet.',
            },
          };
        }

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
 * Create the write_observation tool
 */
export function createWriteObservationTool(config: ObsidianWriterConfig): Tool {
  const writer = new ObsidianWriter(config);

  return {
    name: 'write_observation',
    description:
      'Write a detailed observation note to Obsidian. Use this for insights, patterns, or significant findings that deserve their own note.',
    parameters: {
      type: 'object',
      required: ['title', 'context', 'details'],
      properties: {
        title: {
          type: 'string',
          description: 'Title for the observation',
        },
        context: {
          type: 'string',
          description: 'Background context for the observation',
        },
        details: {
          type: 'string',
          description: 'Detailed content of the observation',
        },
        subject: {
          type: 'string',
          description: 'Subject or topic of the observation',
        },
        confidence: {
          type: 'string',
          description: 'Confidence level: low, medium, or high',
          enum: ['low', 'medium', 'high'],
        },
      },
    },
    execute: async (args: Record<string, unknown>): Promise<ToolResult> => {
      try {
        const result = await writer.writeObservation({
          title: args.title as string,
          context: args.context as string,
          details: args.details as string,
          subject: args.subject as string | undefined,
          confidence: args.confidence as 'low' | 'medium' | 'high' | undefined,
        });

        if (result.success) {
          return {
            success: true,
            data: {
              message: 'Observation written successfully',
              filePath: result.filePath,
            },
          };
        } else {
          return {
            success: false,
            error: result.error.message,
          };
        }
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
 * Register all Obsidian tools with a registry
 */
export function registerObsidianTools(
  registry: { register: (tool: Tool) => void },
  config: ObsidianWriterConfig
): void {
  registry.register(createWriteDailyNoteTool(config));
  registry.register(createReadDailyNoteTool(config));
  registry.register(createWriteObservationTool(config));
}
