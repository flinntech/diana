/**
 * Proposal Types
 *
 * Feature: 003-file-watcher-proposals
 * Date: 2025-12-11
 *
 * Type definitions for the file organization proposal system.
 */

// =============================================================================
// Enums and Literal Types
// =============================================================================

/** Type of file operation proposed */
export type ProposalAction = 'move' | 'rename' | 'move_and_rename';

/** Current state of a proposal */
export type ProposalStatus = 'pending' | 'approved' | 'rejected' | 'invalid';

/** Confidence level of the classification */
export type ConfidenceLevel = 'low' | 'medium' | 'high';

/** File category for organization */
export type FileCategory =
  | 'finances' // Invoices, receipts, tax documents, budgets
  | 'screenshots' // Screen captures
  | 'installers' // Executables, packages
  | 'work' // Work/business documents
  | 'personal' // Personal documents (letters, forms, IDs)
  | 'reference' // Manuals, guides, reference PDFs
  | 'media' // Images, videos, audio (non-screenshot)
  | 'archives' // ZIP, TAR, etc.
  | 'code' // Source files, configs
  | 'misc'; // Catchall for uncategorizable files

// =============================================================================
// Core Proposal Interface
// =============================================================================

/**
 * A file organization proposal
 *
 * Represents a suggested action for organizing a detected file.
 * Requires human approval before execution.
 */
export interface Proposal {
  // Identity
  /** UUID v4 identifier */
  id: string;
  /** When proposal was generated */
  createdAt: Date;

  // Source file info (snapshot at detection time)
  /** Absolute path to source file */
  sourcePath: string;
  /** Basename of source file */
  sourceFilename: string;
  /** File size in bytes */
  sourceSize: number;
  /** Unix timestamp ms for staleness detection */
  sourceMtime: number;

  // Proposed action
  /** Type of operation to perform */
  action: ProposalAction;
  /** Absolute path to destination */
  destinationPath: string;

  // Classification
  /** Detected category */
  category: FileCategory;
  /** Classification confidence */
  confidence: ConfidenceLevel;
  /** Human-readable explanation */
  reasoning: string;

  // Flags
  /** Requires extra confirmation */
  sensitive: boolean;
  /** Why flagged as sensitive */
  sensitiveReason?: string;

  // State
  /** Current proposal status */
  status: ProposalStatus;
  /** When approved/rejected/invalidated */
  resolvedAt?: Date;
  /** Error message if execution failed */
  executionError?: string;
}

// =============================================================================
// Result Types
// =============================================================================

/** Result of approving a proposal */
export interface ApproveResult {
  success: boolean;
  sourcePath?: string;
  destinationPath?: string;
  error?: string;
}

/** Result of rejecting a proposal */
export interface RejectResult {
  success: boolean;
  cooldownUntil?: Date;
  error?: string;
}

/** Result of batch approve operation */
export interface BatchApproveResult {
  approved: number;
  skipped: number;
  failed: number;
  errors: string[];
}

// =============================================================================
// Proposal Summary (for tool responses)
// =============================================================================

/** Lightweight proposal summary for listing */
export interface ProposalSummary {
  id: string;
  filename: string;
  category: FileCategory;
  action: string;
  confidence: ConfidenceLevel;
  sensitive: boolean;
  createdAt: string; // ISO datetime
  reasoning: string;
}

// =============================================================================
// Event Types
// =============================================================================

/** Events emitted by ProposalService */
export interface ProposalServiceEvents {
  'proposal:created': (proposal: Proposal) => void;
  'proposal:approved': (proposal: Proposal, result: ApproveResult) => void;
  'proposal:rejected': (proposal: Proposal) => void;
  'proposal:invalidated': (proposal: Proposal, reason: string) => void;
}
