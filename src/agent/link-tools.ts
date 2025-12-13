/**
 * Link-Related Tools for LLM Agent
 *
 * Feature: 006-obsidian-rich-linking
 * Date: 2025-12-13
 *
 * Tools for querying note relationships.
 */

import type { Tool, ToolResult, JSONSchema } from '../types/agent.js';
import type { LinkDirection, RelatedNotesResult } from '../types/obsidian.js';
import { LinkManager } from '../obsidian/link-manager.js';

// =============================================================================
// Tool Definitions
// =============================================================================

/**
 * Create the diana_query_related_notes tool.
 * Requires an initialized LinkManager with indexed notes.
 *
 * @param linkManager - LinkManager instance with built index
 * @returns Tool definition for querying related notes
 */
export function createQueryRelatedNotesTool(linkManager: LinkManager): Tool {
  const parameters: JSONSchema = {
    type: 'object',
    required: ['path'],
    properties: {
      path: {
        type: 'string',
        description: 'Relative path to the note (without .md extension)',
      },
      direction: {
        type: 'string',
        description: 'Direction of links to query: "incoming" (backlinks), "outgoing" (forward links), or "both"',
        enum: ['incoming', 'outgoing', 'both'],
      },
    },
  };

  return {
    name: 'diana_query_related_notes',
    description: 'Query notes that are related to a given note through wiki-links. Returns incoming links (backlinks - notes that link TO this note) and/or outgoing links (notes this note links TO).',
    parameters,
    execute: async (args: Record<string, unknown>): Promise<ToolResult> => {
      const path = args.path as string;
      const direction = (args.direction as LinkDirection) || 'both';

      try {
        const result: RelatedNotesResult = {
          incoming: [],
          outgoing: [],
        };

        if (direction === 'incoming' || direction === 'both') {
          result.incoming = linkManager.getBacklinks(path);
        }

        if (direction === 'outgoing' || direction === 'both') {
          result.outgoing = linkManager.getOutgoingLinks(path);
        }

        return {
          success: true,
          data: {
            path,
            direction,
            incoming: result.incoming,
            outgoing: result.outgoing,
            incomingCount: result.incoming.length,
            outgoingCount: result.outgoing.length,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error querying related notes',
        };
      }
    },
  };
}

/**
 * Create the diana_find_orphan_notes tool.
 * Finds notes with no incoming or outgoing links.
 *
 * @param linkManager - LinkManager instance with built index
 * @param getAllNotePaths - Function that returns all note paths in the vault
 * @returns Tool definition for finding orphan notes
 */
export function createFindOrphanNotesTool(
  linkManager: LinkManager,
  getAllNotePaths: () => Promise<string[]>
): Tool {
  const parameters: JSONSchema = {
    type: 'object',
    required: [],
    properties: {
      excludeIndex: {
        type: 'boolean',
        description: 'Exclude the index note from results (default: true)',
      },
    },
  };

  return {
    name: 'diana_find_orphan_notes',
    description: 'Find notes that have no incoming or outgoing wiki-links (orphan notes). These notes are not connected to any other notes.',
    parameters,
    execute: async (args: Record<string, unknown>): Promise<ToolResult> => {
      const excludeIndex = args.excludeIndex !== false; // default true

      try {
        const allPaths = await getAllNotePaths();
        const orphans: string[] = [];

        for (const path of allPaths) {
          // Skip index if requested
          if (excludeIndex && path === 'index') {
            continue;
          }

          const hasIncoming = linkManager.getBacklinks(path).length > 0;
          const hasOutgoing = linkManager.getOutgoingLinks(path).length > 0;

          if (!hasIncoming && !hasOutgoing) {
            orphans.push(path);
          }
        }

        return {
          success: true,
          data: {
            orphanNotes: orphans,
            count: orphans.length,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error finding orphan notes',
        };
      }
    },
  };
}

/**
 * Create the diana_get_link_stats tool.
 * Returns statistics about the link graph.
 *
 * @param linkManager - LinkManager instance with built index
 * @returns Tool definition for getting link statistics
 */
export function createLinkStatsTool(linkManager: LinkManager): Tool {
  const parameters: JSONSchema = {
    type: 'object',
    required: [],
    properties: {},
  };

  return {
    name: 'diana_get_link_stats',
    description: 'Get statistics about the vault link graph, including total notes and total links.',
    parameters,
    execute: async (): Promise<ToolResult> => {
      try {
        const stats = linkManager.getStats();

        return {
          success: true,
          data: {
            totalNotes: stats.totalNotes,
            totalLinks: stats.totalLinks,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error getting link stats',
        };
      }
    },
  };
}
