/**
 * Proposal Store
 *
 * Feature: 003-file-watcher-proposals
 * Date: 2025-12-11
 *
 * JSON persistence layer for proposals.
 * Uses atomic writes to prevent corruption.
 */

import { readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname } from 'path';
import writeFileAtomic from 'write-file-atomic';
import type {
  Proposal,
  ProposalAction,
  ProposalStatus,
  FileCategory,
  ConfidenceLevel,
} from './proposal.types.js';

// =============================================================================
// Serialization Types
// =============================================================================

/** Serialized proposal for JSON storage */
export interface SerializedProposal {
  id: string;
  createdAt: string;
  sourcePath: string;
  sourceFilename: string;
  sourceSize: number;
  sourceMtime: number;
  action: ProposalAction;
  destinationPath: string;
  category: FileCategory;
  confidence: ConfidenceLevel;
  reasoning: string;
  sensitive: boolean;
  sensitiveReason?: string;
  status: ProposalStatus;
  resolvedAt?: string;
  executionError?: string;
}

/** Root structure of proposals.json */
export interface StoreData {
  version: number;
  lastModified: string;
  proposals: SerializedProposal[];
  cooldowns: Record<string, string>; // path → ISO date
}

// =============================================================================
// ProposalStore Class
// =============================================================================

/**
 * Persists proposals to JSON file with atomic writes
 */
export class ProposalStore {
  readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /**
   * Load proposals from disk
   *
   * Returns empty state if file doesn't exist or is corrupted.
   */
  async load(): Promise<StoreData> {
    try {
      if (!existsSync(this.filePath)) {
        return this.emptyState();
      }

      const content = await readFile(this.filePath, 'utf-8');
      const data = JSON.parse(content) as StoreData;

      // Validate version
      if (typeof data.version !== 'number' || data.version > 1) {
        console.warn(
          `[ProposalStore] Unknown store version ${data.version}, using empty state`
        );
        return this.emptyState();
      }

      // Validate structure
      if (!Array.isArray(data.proposals)) {
        console.warn('[ProposalStore] Invalid proposals array, using empty state');
        return this.emptyState();
      }

      return data;
    } catch (error) {
      // Log warning but don't throw - graceful degradation
      console.warn(
        `[ProposalStore] Failed to load proposals: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return this.emptyState();
    }
  }

  /**
   * Save proposals to disk with atomic write
   *
   * Uses temp file + rename to prevent corruption.
   */
  async save(data: StoreData): Promise<void> {
    // Ensure directory exists
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    // Update last modified
    const toSave: StoreData = {
      ...data,
      lastModified: new Date().toISOString(),
    };

    // Atomic write
    const content = JSON.stringify(toSave, null, 2);
    await writeFileAtomic(this.filePath, content, { encoding: 'utf-8' });
  }

  /**
   * Create empty state
   */
  private emptyState(): StoreData {
    return {
      version: 1,
      lastModified: new Date().toISOString(),
      proposals: [],
      cooldowns: {},
    };
  }
}

// =============================================================================
// Serialization Helpers
// =============================================================================

/**
 * Convert Proposal to SerializedProposal for storage
 */
export function serializeProposal(proposal: Proposal): SerializedProposal {
  return {
    id: proposal.id,
    createdAt: proposal.createdAt.toISOString(),
    sourcePath: proposal.sourcePath,
    sourceFilename: proposal.sourceFilename,
    sourceSize: proposal.sourceSize,
    sourceMtime: proposal.sourceMtime,
    action: proposal.action,
    destinationPath: proposal.destinationPath,
    category: proposal.category,
    confidence: proposal.confidence,
    reasoning: proposal.reasoning,
    sensitive: proposal.sensitive,
    sensitiveReason: proposal.sensitiveReason,
    status: proposal.status,
    resolvedAt: proposal.resolvedAt?.toISOString(),
    executionError: proposal.executionError,
  };
}

/**
 * Convert SerializedProposal back to Proposal
 */
export function deserializeProposal(data: SerializedProposal): Proposal {
  return {
    id: data.id,
    createdAt: new Date(data.createdAt),
    sourcePath: data.sourcePath,
    sourceFilename: data.sourceFilename,
    sourceSize: data.sourceSize,
    sourceMtime: data.sourceMtime,
    action: data.action,
    destinationPath: data.destinationPath,
    category: data.category,
    confidence: data.confidence,
    reasoning: data.reasoning,
    sensitive: data.sensitive,
    sensitiveReason: data.sensitiveReason,
    status: data.status,
    resolvedAt: data.resolvedAt ? new Date(data.resolvedAt) : undefined,
    executionError: data.executionError,
  };
}

/**
 * Create a new ProposalStore instance
 */
export function createProposalStore(filePath: string): ProposalStore {
  return new ProposalStore(filePath);
}

/**
 * Clean expired cooldowns from store data (T094)
 *
 * Removes cooldown entries where the expiry date has passed.
 * Returns a new StoreData object with expired cooldowns removed.
 */
export function cleanExpiredCooldowns(data: StoreData): StoreData {
  const now = new Date();
  const cleanedCooldowns: Record<string, string> = {};

  for (const [path, expiryStr] of Object.entries(data.cooldowns)) {
    const expiry = new Date(expiryStr);
    if (expiry > now) {
      cleanedCooldowns[path] = expiryStr;
    }
  }

  return {
    ...data,
    cooldowns: cleanedCooldowns,
  };
}

/**
 * Clean old resolved proposals from store data
 *
 * Removes proposals that have been resolved (approved/rejected/invalid)
 * for longer than the retention period. Keeps pending proposals forever.
 *
 * @param data - Store data to clean
 * @param retentionDays - Days to keep resolved proposals (default: 7)
 */
export function cleanResolvedProposals(
  data: StoreData,
  retentionDays: number = 7
): StoreData {
  const now = new Date();
  const retentionMs = retentionDays * 24 * 60 * 60 * 1000;

  const cleanedProposals = data.proposals.filter((p) => {
    // Keep pending proposals
    if (p.status === 'pending') {
      return true;
    }

    // Keep resolved proposals within retention period
    if (p.resolvedAt) {
      const resolvedAt = new Date(p.resolvedAt);
      const age = now.getTime() - resolvedAt.getTime();
      return age < retentionMs;
    }

    // Keep if no resolvedAt (shouldn't happen, but be safe)
    return true;
  });

  return {
    ...data,
    proposals: cleanedProposals,
  };
}
