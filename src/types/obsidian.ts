/**
 * Obsidian Integration - TypeScript Types
 *
 * Feature: 001-obsidian-integration
 * Date: 2025-12-10
 */

// =============================================================================
// Common Types
// =============================================================================

/** ISO 8601 date string (YYYY-MM-DD) */
export type ISODate = string;

/** ISO 8601 datetime string (YYYY-MM-DDTHH:mm:ss) */
export type ISODateTime = string;

/** Confidence levels for observations and proposals */
export type ConfidenceLevel = 'low' | 'medium' | 'high';

/** Severity levels for system notes */
export type Severity = 'info' | 'warning' | 'error';

/** Proposal status */
export type ProposalStatus = 'pending' | 'approved' | 'rejected';

/** System note categories */
export type SystemCategory = 'health' | 'maintenance' | 'error' | 'config' | 'startup' | 'shutdown';

/** Note types */
export type NoteType = 'daily-log' | 'observation' | 'proposal' | 'system' | 'index' | 'rollup' | 'conversation-anchor';

// =============================================================================
// Frontmatter Interfaces
// =============================================================================

/** Base frontmatter shared by all notes */
export interface BaseFrontmatter {
  type: NoteType;
  date: ISODate;
  tags: string[];
  created: ISODateTime;
  modified?: ISODateTime;
}

/** Daily log frontmatter */
export interface DailyLogFrontmatter extends BaseFrontmatter {
  type: 'daily-log';
}

/** Observation note frontmatter */
export interface ObservationFrontmatter extends BaseFrontmatter {
  type: 'observation';
  subject?: string;
  confidence?: ConfidenceLevel;
}

/** Proposal note frontmatter */
export interface ProposalFrontmatter extends BaseFrontmatter {
  type: 'proposal';
  proposalId: string;
  status: ProposalStatus;
  confidence: ConfidenceLevel;
  action: string;
}

/** System note frontmatter */
export interface SystemFrontmatter extends BaseFrontmatter {
  type: 'system';
  category: SystemCategory;
  severity?: Severity;
}

/** Index (MOC) frontmatter */
export interface IndexFrontmatter extends BaseFrontmatter {
  type: 'index';
  noteCount?: number;
}

// =============================================================================
// Note Content Interfaces
// =============================================================================

/** Activity entry in a daily log */
export interface ActivityEntry {
  timestamp: ISODateTime;
  title: string;
  description: string;
  relatedNotes?: string[];
}

/** Input for creating a daily log entry */
export interface DailyLogInput {
  activity: string;
  title?: string;
  relatedNotes?: string[];
}

/** Input for creating an observation */
export interface ObservationInput {
  title: string;
  context: string;
  details: string;
  subject?: string;
  confidence?: ConfidenceLevel;
  tags?: string[];
  relatedNotes?: string[];
}

/** Input for creating a proposal note */
export interface ProposalInput {
  proposalId: string;
  summary: string;
  reasoning: string;
  action: string;
  confidence: ConfidenceLevel;
  evidence?: string[];
  tags?: string[];
}

/** Input for creating a system note */
export interface SystemNoteInput {
  category: SystemCategory;
  title: string;
  details: string;
  severity?: Severity;
  component?: string;
  resolution?: string;
}

// =============================================================================
// Result Types
// =============================================================================

/** Successful write result */
export interface WriteSuccess {
  success: true;
  filePath: string;
  timestamp: ISODateTime;
}

/** Failed write result */
export interface WriteFailure {
  success: false;
  error: ObsidianError;
  fallbackPath?: string;
}

/** Write operation result */
export type WriteResult = WriteSuccess | WriteFailure;

// =============================================================================
// Error Types
// =============================================================================

/** Base error for Obsidian operations */
export interface ObsidianError {
  code: ObsidianErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

/** Error codes */
export type ObsidianErrorCode =
  | 'VAULT_NOT_FOUND'
  | 'VAULT_NOT_WRITABLE'
  | 'WRITE_CONFLICT'
  | 'CORRUPTED_NOTE'
  | 'LOCK_TIMEOUT'
  | 'DISK_FULL'
  | 'INVALID_WIKILINK'
  | 'BACKLINK_UPDATE_FAILED'
  | 'MIGRATION_FAILED'
  | 'UNKNOWN_ERROR';

// =============================================================================
// Configuration
// =============================================================================

/** Configuration for ObsidianWriter */
export interface ObsidianWriterConfig {
  vaultPath: string;
  fallbackLogPath?: string;
  dateFormat?: string;
  maxRetries?: number;
  lockTimeout?: number;
  /** Skip file locking (for testing with mock-fs) */
  skipLocking?: boolean;
}

// =============================================================================
// Vault Statistics
// =============================================================================

/** Vault statistics */
export interface VaultStats {
  totalNotes: number;
  dailyLogs: number;
  observations: number;
  proposals: number;
  systemNotes: number;
  lastModified: ISODateTime;
}

// =============================================================================
// Index Types
// =============================================================================

/** Sections for index generation */
export interface IndexSections {
  dailyLogs: Array<{ path: string; title: string }>;
  observations: Array<{ path: string; title: string }>;
  proposals: Array<{ path: string; title: string; status: ProposalStatus }>;
  systemNotes: Array<{ path: string; title: string }>;
}

// =============================================================================
// Write Queue (for graceful degradation)
// =============================================================================

/** Pending write entry for the queue */
export interface QueuedWrite {
  id: string;
  type: 'daily' | 'observation' | 'proposal' | 'system' | 'index';
  input: DailyLogInput | ObservationInput | ProposalInput | SystemNoteInput | null;
  timestamp: ISODateTime;
  retryCount: number;
}

/** Write queue interface with bounded size */
export interface WriteQueue {
  /** Maximum entries in the queue (100) */
  readonly maxSize: number;

  /** Current queue size */
  readonly size: number;

  /** Add a write to the queue */
  enqueue(write: Omit<QueuedWrite, 'id' | 'retryCount'>): boolean;

  /** Get the next write to process */
  dequeue(): QueuedWrite | undefined;

  /** Peek at the next write without removing */
  peek(): QueuedWrite | undefined;

  /** Check if queue is full */
  isFull(): boolean;

  /** Clear all entries */
  clear(): void;

  /** Get all entries for persistence */
  toArray(): QueuedWrite[];
}

// =============================================================================
// Interfaces for Implementation
// =============================================================================

/** Path generation utilities */
export interface IPathResolver {
  getDailyLogPath(date?: Date): string;
  getObservationPath(slug: string, date?: Date): string;
  getProposalPath(proposalId: string, date?: Date): string;
  getSystemPath(category: SystemCategory, date?: Date): string;
  getIndexPath(): string;
  isValidVaultPath(path: string): boolean;
}

/** Template generation utilities */
export interface ITemplateGenerator {
  dailyLog(date: Date): string;
  observation(input: ObservationInput): string;
  proposal(input: ProposalInput): string;
  systemNote(input: SystemNoteInput): string;
  index(sections: IndexSections): string;
}

/** Main writer interface */
export interface IObsidianWriter {
  writeDaily(input: DailyLogInput): Promise<WriteResult>;
  writeObservation(input: ObservationInput): Promise<WriteResult>;
  writeProposal(input: ProposalInput): Promise<WriteResult>;
  writeSystem(input: SystemNoteInput): Promise<WriteResult>;
  updateIndex(): Promise<WriteResult>;
  isVaultAccessible(): Promise<boolean>;
  getVaultStats(): Promise<VaultStats>;
}

// =============================================================================
// Wiki-Link Types (Feature: 006-obsidian-rich-linking)
// =============================================================================

/**
 * Represents a parsed wiki-link extracted from note content.
 * Source of truth: Content wiki-links are authoritative; frontmatter is derived.
 */
export interface WikiLink {
  /** Full original text (e.g., `[[path|alias]]`) */
  raw: string;
  /** Target note path without extension */
  path: string;
  /** Display text (after `|`) */
  alias?: string;
  /** Target heading (after `#`) */
  heading?: string;
  /** Target block ID (after `^`) */
  blockId?: string;
  /** Whether prefixed with `!` (embed) */
  isEmbed: boolean;
}

/**
 * Extended frontmatter fields for tracking note relationships.
 * Arrays contain normalized vault-relative paths (without `.md`).
 */
export interface NoteReferences {
  /** Outgoing links (paths this note links to) */
  references?: string[];
  /** Incoming links (paths that link to this note) */
  referencedBy?: string[];
}

/**
 * Link direction for queries
 */
export type LinkDirection = 'incoming' | 'outgoing' | 'both';

/**
 * Result of querying related notes
 */
export interface RelatedNotesResult {
  /** Notes that link to this note */
  incoming: string[];
  /** Notes that this note links to */
  outgoing: string[];
}

// =============================================================================
// Backlinks Types (Feature: 006-obsidian-rich-linking)
// =============================================================================

/** HTML comment markers for backlinks section */
export const BACKLINKS_MARKER_START = '<!-- DIANA-BACKLINKS:START -->';
export const BACKLINKS_MARKER_END = '<!-- DIANA-BACKLINKS:END -->';
export const BACKLINKS_HEADING = '## Backlinks';

/**
 * Result of updating backlinks for a note
 */
export interface BacklinksUpdateResult {
  /** Target note that was updated */
  targetPath: string;
  /** Whether the update succeeded */
  success: boolean;
  /** Paths added to backlinks */
  added: string[];
  /** Paths removed from backlinks */
  removed: string[];
  /** Error message if failed */
  error?: string;
}

/**
 * Pending backlink update in the retry queue
 */
export interface QueuedBacklinkUpdate {
  /** Target note path */
  targetPath: string;
  /** Source note path */
  sourcePath: string;
  /** Action to perform */
  action: 'add' | 'remove';
  /** Number of retry attempts */
  retryCount: number;
  /** Timestamp of original request */
  timestamp: ISODateTime;
}

// =============================================================================
// Rollup Types (Feature: 006-obsidian-rich-linking)
// =============================================================================

/** Rollup period type */
export type RollupPeriod = 'weekly' | 'monthly';

/**
 * Aggregated statistics for a rollup note
 */
export interface RollupStats {
  /** Count of daily log entries */
  dailyLogs: number;
  /** Count of observations */
  observations: number;
  /** Total proposals */
  proposals: number;
  /** Approved proposals */
  proposalsApproved: number;
  /** Rejected proposals */
  proposalsRejected: number;
  /** Pending proposals */
  proposalsPending: number;
  /** Count of system notes */
  systemNotes: number;
}

/**
 * Weekly rollup frontmatter
 */
export interface WeeklyRollupFrontmatter extends BaseFrontmatter {
  type: 'rollup';
  /** Period type */
  period: 'weekly';
  /** ISO week string (e.g., `2025-W50`) */
  week: string;
  /** Year number */
  year: number;
  /** Week number (1-53) */
  weekNumber: number;
  /** Monday of the week (ISO date) */
  startDate: ISODate;
  /** Sunday of the week (ISO date) */
  endDate: ISODate;
  /** Aggregated statistics */
  stats: RollupStats;
}

/**
 * Monthly rollup frontmatter
 */
export interface MonthlyRollupFrontmatter extends BaseFrontmatter {
  type: 'rollup';
  /** Period type */
  period: 'monthly';
  /** ISO month string (e.g., `2025-12`) */
  month: string;
  /** Year number */
  year: number;
  /** Month number (1-12) */
  monthNumber: number;
  /** First day of month (ISO date) */
  startDate: ISODate;
  /** Last day of month (ISO date) */
  endDate: ISODate;
  /** Aggregated statistics */
  stats: RollupStats;
  /** ISO weeks contained in this month */
  weeks?: string[];
}

/** Union of rollup frontmatter types */
export type RollupFrontmatter = WeeklyRollupFrontmatter | MonthlyRollupFrontmatter;

// =============================================================================
// Conversation Anchor Types (Feature: 006-obsidian-rich-linking)
// =============================================================================

/**
 * Stub note bridging conversation JSON to vault.
 */
export interface ConversationAnchorFrontmatter extends BaseFrontmatter {
  type: 'conversation-anchor';
  /** Conversation UUID */
  conversationId: string;
  /** Number of user+assistant messages */
  messageCount: number;
  /** Vault notes mentioned in conversation */
  references: string[];
  /** Path to full conversation JSON */
  jsonPath: string;
}

/**
 * Input for creating a conversation anchor
 */
export interface ConversationAnchorInput {
  /** Conversation UUID */
  id: string;
  /** LLM-generated title */
  title: string;
  /** Conversation start time */
  startedAt: ISODateTime;
  /** Number of messages */
  messageCount: number;
  /** Vault notes referenced in conversation */
  referencedNotes: string[];
  /** Path to conversation JSON file */
  jsonPath: string;
}

// =============================================================================
// Key Fact Provenance Types (Feature: 006-obsidian-rich-linking)
// =============================================================================

/**
 * Extended KeyFact with optional source provenance.
 * Format with provenance: "User prefers dark mode (from [[path]]) #preference"
 */
export interface KeyFactWithProvenance {
  /** Fact text content */
  content: string;
  /** Hashtags for categorization */
  tags: string[];
  /** When fact was learned */
  createdAt: Date;
  /** Wiki-link to source observation (optional) */
  sourceNote?: string;
}
