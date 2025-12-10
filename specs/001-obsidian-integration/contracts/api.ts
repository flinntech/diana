/**
 * Obsidian Integration - TypeScript Contracts
 *
 * Feature: 001-obsidian-integration
 * Date: 2025-12-10
 *
 * These interfaces define the API contract for DIANA's Obsidian vault integration.
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
export type SystemCategory = 'health' | 'error' | 'config' | 'startup' | 'shutdown';

/** Note types */
export type NoteType = 'daily-log' | 'observation' | 'proposal' | 'system' | 'index';

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
  relatedNotes?: string[]; // Wikilink targets
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
  evidence?: string[]; // Wikilink targets to supporting observations
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
  fallbackPath?: string; // Path to fallback log if used
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
  | 'UNKNOWN_ERROR';

// =============================================================================
// ObsidianWriter Interface
// =============================================================================

/** Configuration for ObsidianWriter */
export interface ObsidianWriterConfig {
  /** Path to the Obsidian vault */
  vaultPath: string;

  /** Path for fallback logging when vault unavailable */
  fallbackLogPath?: string;

  /** Date format for daily log filenames (default: 'yyyy-MM-dd') */
  dateFormat?: string;

  /** Maximum retries for write operations (default: 3) */
  maxRetries?: number;

  /** Lock timeout in milliseconds (default: 10000) */
  lockTimeout?: number;
}

/** Main writer interface */
export interface IObsidianWriter {
  /**
   * Write or append to today's daily log
   * @param input Activity to log
   * @returns Write result with file path or error
   */
  writeDaily(input: DailyLogInput): Promise<WriteResult>;

  /**
   * Create a new observation note
   * @param input Observation details
   * @returns Write result with file path or error
   */
  writeObservation(input: ObservationInput): Promise<WriteResult>;

  /**
   * Create a proposal reasoning note
   * @param input Proposal details
   * @returns Write result with file path or error
   */
  writeProposal(input: ProposalInput): Promise<WriteResult>;

  /**
   * Create a system status note
   * @param input System note details
   * @returns Write result with file path or error
   */
  writeSystem(input: SystemNoteInput): Promise<WriteResult>;

  /**
   * Update the index/MOC with links to recent notes
   * @returns Write result with file path or error
   */
  updateIndex(): Promise<WriteResult>;

  /**
   * Check if the vault is accessible
   * @returns true if vault exists and is writable
   */
  isVaultAccessible(): Promise<boolean>;

  /**
   * Get vault statistics
   * @returns Note counts by type
   */
  getVaultStats(): Promise<VaultStats>;
}

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
// Path Utilities Interface
// =============================================================================

/** Path generation utilities */
export interface IPathResolver {
  /** Get path for today's daily log */
  getDailyLogPath(date?: Date): string;

  /** Get path for a new observation */
  getObservationPath(slug: string, date?: Date): string;

  /** Get path for a new proposal */
  getProposalPath(proposalId: string, date?: Date): string;

  /** Get path for a system note */
  getSystemPath(category: SystemCategory, date?: Date): string;

  /** Get path to index.md */
  getIndexPath(): string;

  /** Validate that a path is within the vault */
  isValidVaultPath(path: string): boolean;
}

// =============================================================================
// Template Interface
// =============================================================================

/** Template generation utilities */
export interface ITemplateGenerator {
  /** Generate daily log template */
  dailyLog(date: Date): string;

  /** Generate observation template */
  observation(input: ObservationInput): string;

  /** Generate proposal template */
  proposal(input: ProposalInput): string;

  /** Generate system note template */
  systemNote(input: SystemNoteInput): string;

  /** Generate index template */
  index(sections: IndexSections): string;
}

/** Sections for index generation */
export interface IndexSections {
  dailyLogs: Array<{ path: string; title: string }>;
  observations: Array<{ path: string; title: string }>;
  proposals: Array<{ path: string; title: string; status: ProposalStatus }>;
  systemNotes: Array<{ path: string; title: string }>;
}
