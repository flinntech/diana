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
