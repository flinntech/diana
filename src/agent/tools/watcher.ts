/**
 * Watcher Tools
 *
 * Feature: 003-file-watcher-proposals
 * Date: 2025-12-11
 *
 * LLM tools for managing file organization proposals and watcher configuration.
 */

import type { Tool, ToolResult, JSONSchema } from '../../types/agent.js';
import type {
  ProposalService,
  ProposalSummary,
  ProposalStatus,
} from '../../proposals/index.js';
import type { WatcherService } from '../../watcher/index.js';

// =============================================================================
// Tool Schemas
// =============================================================================

const listProposalsSchema: JSONSchema = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      description: "Filter by proposal status. Options: 'pending', 'approved', 'rejected', 'invalid', 'all'. Defaults to 'pending'.",
      enum: ['pending', 'approved', 'rejected', 'invalid', 'all'],
    },
    limit: {
      type: 'number',
      description: 'Maximum number of proposals to return. Defaults to 20.',
    },
  },
};

const approveProposalSchema: JSONSchema = {
  type: 'object',
  required: ['proposal_id'],
  properties: {
    proposal_id: {
      type: 'string',
      description: 'The unique ID of the proposal to approve',
    },
    confirm_sensitive: {
      type: 'boolean',
      description: 'Must be true to approve sensitive proposals. Defaults to false.',
    },
  },
};

const rejectProposalSchema: JSONSchema = {
  type: 'object',
  required: ['proposal_id'],
  properties: {
    proposal_id: {
      type: 'string',
      description: 'The unique ID of the proposal to reject',
    },
    reason: {
      type: 'string',
      description: 'Optional reason for rejection (for logging)',
    },
  },
};

const approveAllProposalsSchema: JSONSchema = {
  type: 'object',
  properties: {
    include_sensitive: {
      type: 'boolean',
      description: 'If true, also approve sensitive proposals. Defaults to false.',
    },
  },
};

const clearAllProposalsSchema: JSONSchema = {
  type: 'object',
  properties: {},
};

// =============================================================================
// Tool Factories
// =============================================================================

/**
 * Create list_proposals tool
 */
export function createListProposalsTool(proposalService: ProposalService): Tool {
  return {
    name: 'list_proposals',
    description:
      'List pending file organization proposals waiting for your approval. You can filter by status and limit results.',
    parameters: listProposalsSchema,
    execute: async (args): Promise<ToolResult> => {
      const status = (args.status as string | undefined) ?? 'pending';
      const limit = (args.limit as number | undefined) ?? 20;

      let proposals;
      if (status === 'all') {
        proposals = proposalService.getAll();
      } else {
        proposals = proposalService.getByStatus(status as ProposalStatus);
      }

      // Sort by creation date, newest first
      proposals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // Apply limit
      const total = proposals.length;
      const limited = proposals.slice(0, limit);

      // Convert to summaries
      const summaries: ProposalSummary[] = limited.map((p) => ({
        id: p.id,
        filename: p.sourceFilename,
        category: p.category,
        action: formatAction(p.action, p.destinationPath),
        confidence: p.confidence,
        sensitive: p.sensitive,
        createdAt: p.createdAt.toISOString(),
        reasoning: p.reasoning,
      }));

      return {
        success: true,
        data: {
          proposals: summaries,
          total,
          hasMore: total > limit,
        },
      };
    },
  };
}

/**
 * Create approve_proposal tool
 */
export function createApproveProposalTool(proposalService: ProposalService): Tool {
  return {
    name: 'approve_proposal',
    description:
      'Approve a file organization proposal to execute the move/rename operation. For sensitive files, set confirm_sensitive to true.',
    parameters: approveProposalSchema,
    execute: async (args): Promise<ToolResult> => {
      const proposalId = args.proposal_id as string;
      const confirmSensitive = (args.confirm_sensitive as boolean | undefined) ?? false;

      const result = await proposalService.approve(proposalId, confirmSensitive);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        };
      }

      return {
        success: true,
        data: {
          action: 'Moved file',
          sourcePath: result.sourcePath,
          destinationPath: result.destinationPath,
        },
      };
    },
  };
}

/**
 * Create reject_proposal tool
 */
export function createRejectProposalTool(proposalService: ProposalService): Tool {
  return {
    name: 'reject_proposal',
    description:
      "Reject a file organization proposal. The file won't be re-proposed for 24 hours.",
    parameters: rejectProposalSchema,
    execute: async (args): Promise<ToolResult> => {
      const proposalId = args.proposal_id as string;
      const reason = args.reason as string | undefined;

      const proposal = proposalService.getById(proposalId);
      if (!proposal) {
        return {
          success: false,
          error: `Proposal '${proposalId}' not found`,
        };
      }

      const result = await proposalService.reject(proposalId, reason);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        };
      }

      return {
        success: true,
        data: {
          action: 'Rejected proposal',
          filename: proposal.sourceFilename,
          cooldownUntil: result.cooldownUntil?.toISOString(),
        },
      };
    },
  };
}

/**
 * Create approve_all_proposals tool
 */
export function createApproveAllProposalsTool(proposalService: ProposalService): Tool {
  return {
    name: 'approve_all_proposals',
    description:
      'Batch approve all pending proposals. By default, sensitive proposals are skipped unless include_sensitive is true.',
    parameters: approveAllProposalsSchema,
    execute: async (args): Promise<ToolResult> => {
      const includeSensitive = (args.include_sensitive as boolean | undefined) ?? false;

      const result = await proposalService.approveAll(includeSensitive);

      return {
        success: true,
        data: {
          approved: result.approved,
          skipped: result.skipped,
          failed: result.failed,
          errors: result.errors,
        },
      };
    },
  };
}

/**
 * Create clear_all_proposals tool
 */
export function createClearAllProposalsTool(proposalService: ProposalService): Tool {
  return {
    name: 'clear_all_proposals',
    description:
      'Remove all pending proposals without executing any file moves. Files remain in place.',
    parameters: clearAllProposalsSchema,
    execute: async (): Promise<ToolResult> => {
      const cleared = proposalService.clearAllPending();

      return {
        success: true,
        data: {
          cleared,
        },
      };
    },
  };
}

// =============================================================================
// Registration
// =============================================================================

/**
 * Register all proposal management tools with a tool registry
 */
export function registerProposalTools(
  registry: { register(tool: Tool): void },
  proposalService: ProposalService
): void {
  registry.register(createListProposalsTool(proposalService));
  registry.register(createApproveProposalTool(proposalService));
  registry.register(createRejectProposalTool(proposalService));
  registry.register(createApproveAllProposalsTool(proposalService));
  registry.register(createClearAllProposalsTool(proposalService));
}

// =============================================================================
// Watcher Tool Schemas (Phase 5: User Story 3)
// =============================================================================

const getWatchedDirectoriesSchema: JSONSchema = {
  type: 'object',
  properties: {},
};

const addWatchedDirectorySchema: JSONSchema = {
  type: 'object',
  required: ['path'],
  properties: {
    path: {
      type: 'string',
      description: 'The directory path to start watching',
    },
    recursive: {
      type: 'boolean',
      description: 'Whether to watch subdirectories. Defaults to false.',
    },
  },
};

const removeWatchedDirectorySchema: JSONSchema = {
  type: 'object',
  required: ['path'],
  properties: {
    path: {
      type: 'string',
      description: 'The directory path to stop watching',
    },
  },
};

const startWatcherSchema: JSONSchema = {
  type: 'object',
  properties: {},
};

const stopWatcherSchema: JSONSchema = {
  type: 'object',
  properties: {},
};

const scanDirectorySchema: JSONSchema = {
  type: 'object',
  required: ['path'],
  properties: {
    path: {
      type: 'string',
      description: 'The directory path to scan for files to organize',
    },
    recursive: {
      type: 'boolean',
      description: 'Whether to scan subdirectories. Defaults to false.',
    },
  },
};

// =============================================================================
// Watcher Tool Factories (Phase 5: User Story 3)
// =============================================================================

/**
 * Create get_watched_directories tool
 */
export function createGetWatchedDirectoriesTool(watcherService: WatcherService): Tool {
  return {
    name: 'get_watched_directories',
    description: 'Get the list of directories currently being watched for file changes.',
    parameters: getWatchedDirectoriesSchema,
    execute: async (): Promise<ToolResult> => {
      const directories = watcherService.getWatchedDirectories();
      return {
        success: true,
        data: {
          directories: directories.map((d) => ({
            path: d.path,
            enabled: d.enabled,
            recursive: d.recursive,
          })),
          running: watcherService.isRunning(),
        },
      };
    },
  };
}

/**
 * Create add_watched_directory tool
 */
export function createAddWatchedDirectoryTool(watcherService: WatcherService): Tool {
  return {
    name: 'add_watched_directory',
    description: 'Add a directory to the watch list. Files added to this directory will be analyzed.',
    parameters: addWatchedDirectorySchema,
    execute: async (args): Promise<ToolResult> => {
      const path = args.path as string;
      const recursive = (args.recursive as boolean | undefined) ?? false;

      try {
        await watcherService.addDirectory(path, { recursive });
        return {
          success: true,
          data: {
            action: 'Added directory to watch list',
            path,
            recursive,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}

/**
 * Create remove_watched_directory tool
 */
export function createRemoveWatchedDirectoryTool(watcherService: WatcherService): Tool {
  return {
    name: 'remove_watched_directory',
    description: 'Remove a directory from the watch list. Files in this directory will no longer be monitored.',
    parameters: removeWatchedDirectorySchema,
    execute: async (args): Promise<ToolResult> => {
      const path = args.path as string;

      try {
        await watcherService.removeDirectory(path);
        return {
          success: true,
          data: {
            action: 'Removed directory from watch list',
            path,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}

/**
 * Create start_watcher tool
 */
export function createStartWatcherTool(watcherService: WatcherService): Tool {
  return {
    name: 'start_watcher',
    description: 'Start the file watcher to begin monitoring configured directories.',
    parameters: startWatcherSchema,
    execute: async (): Promise<ToolResult> => {
      if (watcherService.isRunning()) {
        return {
          success: true,
          data: {
            action: 'Watcher already running',
            directories: watcherService.getWatchedDirectories().length,
          },
        };
      }

      await watcherService.start();
      return {
        success: true,
        data: {
          action: 'Started file watcher',
          directories: watcherService.getWatchedDirectories().length,
        },
      };
    },
  };
}

/**
 * Create stop_watcher tool
 */
export function createStopWatcherTool(watcherService: WatcherService): Tool {
  return {
    name: 'stop_watcher',
    description: 'Stop the file watcher. No new files will be detected until restarted.',
    parameters: stopWatcherSchema,
    execute: async (): Promise<ToolResult> => {
      if (!watcherService.isRunning()) {
        return {
          success: true,
          data: {
            action: 'Watcher already stopped',
          },
        };
      }

      await watcherService.stop();
      return {
        success: true,
        data: {
          action: 'Stopped file watcher',
        },
      };
    },
  };
}

/**
 * Create scan_directory tool
 */
export function createScanDirectoryTool(watcherService: WatcherService): Tool {
  return {
    name: 'scan_directory',
    description:
      'Scan a directory and create organization proposals for all existing files. ' +
      'Unlike the watcher which monitors for new files, this scans files already present.',
    parameters: scanDirectorySchema,
    execute: async (args): Promise<ToolResult> => {
      const path = args.path as string;
      const recursive = (args.recursive as boolean | undefined) ?? false;

      try {
        const result = await watcherService.scanDirectory(path, { recursive });
        return {
          success: true,
          data: {
            action: 'Scanned directory',
            path,
            recursive,
            filesScanned: result.scanned,
            proposalsCreated: result.proposalsCreated,
            skipped: result.skipped,
            errors: result.errors.length > 0 ? result.errors : undefined,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}

/**
 * Register all watcher management tools with a tool registry
 */
export function registerWatcherTools(
  registry: { register(tool: Tool): void },
  watcherService: WatcherService
): void {
  registry.register(createGetWatchedDirectoriesTool(watcherService));
  registry.register(createAddWatchedDirectoryTool(watcherService));
  registry.register(createRemoveWatchedDirectoryTool(watcherService));
  registry.register(createStartWatcherTool(watcherService));
  registry.register(createStopWatcherTool(watcherService));
  registry.register(createScanDirectoryTool(watcherService));
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Format action for display
 */
function formatAction(action: string, destinationPath: string): string {
  // Extract the meaningful part of the path
  const parts = destinationPath.split('/');
  const relevantParts = parts.slice(-3); // Last 3 path components

  switch (action) {
    case 'move':
      return `move to ${relevantParts.join('/')}`;
    case 'rename':
      return `rename to ${parts.pop()}`;
    case 'move_and_rename':
      return `move and rename to ${relevantParts.join('/')}`;
    default:
      return action;
  }
}
