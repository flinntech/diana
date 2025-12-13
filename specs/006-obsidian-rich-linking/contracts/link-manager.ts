/**
 * Obsidian Rich Linking - API Contracts
 *
 * Feature: 006-obsidian-rich-linking
 * Date: 2025-12-13
 *
 * TypeScript interface contracts for the rich linking system.
 * These interfaces define the API surface without implementation.
 */

import type { ISODate, ISODateTime } from '../../../src/types/obsidian.js';

// =============================================================================
// Wiki-Link Types
// =============================================================================

/**
 * Parsed wiki-link extracted from note content
 */
export interface WikiLink {
  /** Full original text (e.g., "[[path|alias]]") */
  raw: string;

  /** Target note path without extension */
  path: string;

  /** Display text after pipe (optional) */
  alias?: string;

  /** Target heading after # (optional) */
  heading?: string;

  /** Target block ID after ^ (optional) */
  blockId?: string;

  /** Whether prefixed with ! (embed) */
  isEmbed: boolean;
}

// =============================================================================
// Frontmatter Extensions
// =============================================================================

/**
 * Extended frontmatter fields for link tracking
 * Added to existing frontmatter interfaces
 */
export interface LinkTrackingFields {
  /** Outgoing links - paths this note references */
  references?: string[];

  /** Incoming links - paths that reference this note */
  referencedBy?: string[];
}

// =============================================================================
// Backlinks Section
// =============================================================================

/** Marker constants for backlinks section */
export const BACKLINKS_MARKER_START = '<!-- DIANA-BACKLINKS:START -->';
export const BACKLINKS_MARKER_END = '<!-- DIANA-BACKLINKS:END -->';

/**
 * Result of updating backlinks section in a note
 */
export interface BacklinksUpdateResult {
  /** Whether update was successful */
  success: boolean;

  /** Path to the updated note */
  targetPath: string;

  /** Number of backlinks after update */
  backlinkCount: number;

  /** Whether section was added, updated, or removed */
  action: 'added' | 'updated' | 'removed' | 'skipped';

  /** Error message if failed */
  error?: string;
}

// =============================================================================
// Conversation Anchor
// =============================================================================

/**
 * Input for creating a conversation anchor note
 */
export interface ConversationAnchorInput {
  /** Conversation UUID */
  id: string;

  /** LLM-generated title */
  title: string;

  /** Conversation start timestamp */
  startedAt: ISODateTime;

  /** Number of user+assistant messages */
  messageCount: number;

  /** Vault notes referenced in conversation */
  referencedNotes: string[];

  /** Path to full conversation JSON */
  jsonPath: string;
}

/**
 * Frontmatter for conversation anchor notes
 */
export interface ConversationAnchorFrontmatter {
  type: 'conversation-anchor';
  date: ISODate;
  tags: string[];
  created: ISODateTime;
  conversationId: string;
  messageCount: number;
  references: string[];
  jsonPath: string;
}

// =============================================================================
// Rollup Notes
// =============================================================================

/** Period type for rollups */
export type RollupPeriod = 'weekly' | 'monthly';

/**
 * Statistics aggregated in rollup notes
 */
export interface RollupStats {
  dailyLogs: number;
  observations: number;
  proposals: number;
  proposalsApproved: number;
  proposalsRejected: number;
  proposalsPending: number;
  systemNotes: number;
}

/**
 * Base rollup frontmatter
 */
interface BaseRollupFrontmatter {
  type: 'rollup';
  period: RollupPeriod;
  year: number;
  startDate: ISODate;
  endDate: ISODate;
  date: ISODate;
  tags: string[];
  created: ISODateTime;
  stats: RollupStats;
}

/**
 * Weekly rollup frontmatter
 */
export interface WeeklyRollupFrontmatter extends BaseRollupFrontmatter {
  period: 'weekly';
  /** ISO week format: "2025-W50" */
  week: string;
  weekNumber: number;
}

/**
 * Monthly rollup frontmatter
 */
export interface MonthlyRollupFrontmatter extends BaseRollupFrontmatter {
  period: 'monthly';
  /** ISO month format: "2025-12" */
  month: string;
  monthNumber: number;
  /** ISO weeks contained in this month */
  weeks?: string[];
}

/**
 * Input for generating a rollup note
 */
export interface RollupInput {
  period: RollupPeriod;
  date: Date;
  notes: {
    dailyLogs: Array<{ path: string; title: string }>;
    observations: Array<{ path: string; title: string }>;
    proposals: Array<{ path: string; title: string; status: 'pending' | 'approved' | 'rejected' }>;
    systemNotes: Array<{ path: string; title: string }>;
  };
}

// =============================================================================
// Key Fact Extension
// =============================================================================

/**
 * Extended KeyFact with provenance
 */
export interface KeyFactWithProvenance {
  content: string;
  tags: string[];
  createdAt: Date;
  /** Wiki-link to source observation (optional) */
  sourceNote?: string;
}

// =============================================================================
// LinkManager Interface
// =============================================================================

/**
 * Main interface for link extraction and tracking
 */
export interface ILinkManager {
  /**
   * Extract wiki-links from note content
   * Ignores links in code blocks
   */
  extractWikiLinks(content: string): WikiLink[];

  /**
   * Get normalized outgoing link paths from content
   * Excludes embeds, normalizes paths
   */
  extractOutgoingLinks(content: string): string[];

  /**
   * Get all notes that link to the given path
   */
  getBacklinks(targetPath: string): string[];

  /**
   * Update the link index when a note changes
   * Returns paths that need backlink updates
   */
  updateNoteLinks(
    notePath: string,
    newContent: string
  ): {
    added: string[];
    removed: string[];
  };

  /**
   * Remove a note from the index entirely
   */
  removeNote(notePath: string): void;

  /**
   * Build index from a batch of notes
   * Used during migration/startup
   */
  buildIndex(notes: Map<string, string>): void;

  /**
   * Check if a path exists in the index
   */
  hasNote(path: string): boolean;
}

// =============================================================================
// ObsidianWriter Extensions
// =============================================================================

/**
 * Extended ObsidianWriter interface with backlink methods
 */
export interface IObsidianWriterExtended {
  /**
   * Update backlinks section in a target note
   * @param targetPath - Note to update
   * @param backlinks - Array of source paths that link to this note
   */
  updateBacklinks(targetPath: string, backlinks: string[]): Promise<BacklinksUpdateResult>;

  /**
   * Write a conversation anchor note
   */
  writeConversationAnchor(input: ConversationAnchorInput): Promise<WriteResult>;

  /**
   * Write a rollup note
   */
  writeRollup(input: RollupInput): Promise<WriteResult>;
}

// =============================================================================
// RollupGenerator Interface
// =============================================================================

/**
 * Interface for rollup note generation
 */
export interface IRollupGenerator {
  /**
   * Generate a weekly rollup for the given date's week
   */
  generateWeekly(date: Date): Promise<WriteResult>;

  /**
   * Generate a monthly rollup for the given date's month
   */
  generateMonthly(date: Date): Promise<WriteResult>;

  /**
   * Get notes in the specified period
   */
  getNotesInPeriod(
    period: RollupPeriod,
    date: Date
  ): Promise<RollupInput['notes']>;
}

// =============================================================================
// Migration Interface
// =============================================================================

/**
 * Result of migration operation
 */
export interface MigrationResult {
  /** Total notes processed */
  total: number;

  /** Successfully migrated */
  migrated: number;

  /** Skipped (corrupted, no changes needed) */
  skipped: number;

  /** Failed with errors */
  failed: number;

  /** Details per file */
  details: Array<{
    path: string;
    status: 'migrated' | 'skipped' | 'failed';
    reason?: string;
  }>;
}

/**
 * Interface for vault migration utility
 */
export interface IVaultMigrator {
  /**
   * Run migration in dry-run mode
   * Returns what would change without writing
   */
  dryRun(): Promise<MigrationResult>;

  /**
   * Run actual migration
   */
  migrate(): Promise<MigrationResult>;

  /**
   * Validate existing backlinks
   * Finds orphaned references
   */
  validate(): Promise<{
    valid: number;
    orphaned: Array<{ note: string; orphanedBacklinks: string[] }>;
  }>;

  /**
   * Repair orphaned backlinks
   */
  repair(): Promise<MigrationResult>;
}

// =============================================================================
// CLI Commands Interface
// =============================================================================

/**
 * Vault subcommand options
 */
export interface VaultCommandOptions {
  /** Dry run mode (no writes) */
  dryRun?: boolean;

  /** Verbose output */
  verbose?: boolean;

  /** Target date for rollup */
  date?: string;
}

/**
 * Vault subcommand interface
 */
export interface IVaultCommand {
  /** diana vault migrate [--dry-run] */
  migrate(options: VaultCommandOptions): Promise<void>;

  /** diana vault validate [--repair] */
  validate(options: VaultCommandOptions & { repair?: boolean }): Promise<void>;

  /** diana vault rollup [--weekly|--monthly] [--date YYYY-MM-DD] */
  rollup(options: VaultCommandOptions & { weekly?: boolean; monthly?: boolean }): Promise<void>;
}

// =============================================================================
// Tool Extensions
// =============================================================================

/**
 * Extended observation tool parameters
 */
export interface CreateObservationParams {
  title: string;
  context: string;
  details: string;
  subject?: string;
  confidence?: 'low' | 'medium' | 'high';
  tags?: string[];
  /** NEW: Related notes for bidirectional linking */
  relatedNotes?: string[];
}

/**
 * Extended daily log tool parameters
 */
export interface CreateDailyLogParams {
  activity: string;
  title?: string;
  /** NEW: Related notes for bidirectional linking */
  relatedNotes?: string[];
}

/**
 * Query related notes tool parameters
 */
export interface QueryRelatedNotesParams {
  /** Note path to query */
  path: string;

  /** Direction of links to return */
  direction: 'incoming' | 'outgoing' | 'both';

  /** Maximum results */
  limit?: number;
}

/**
 * Result of related notes query
 */
export interface QueryRelatedNotesResult {
  incoming: string[];
  outgoing: string[];
}

// =============================================================================
// Re-export for convenience
// =============================================================================

/** WriteResult from existing types */
export type { WriteResult } from '../../../src/types/obsidian.js';
