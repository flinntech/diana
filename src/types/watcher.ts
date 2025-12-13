/**
 * Watcher Types
 *
 * Feature: 003-file-watcher-proposals
 * Date: 2025-12-11
 *
 * Type definitions for the file watcher system.
 */

import type { FileCategory, ConfidenceLevel } from '../proposals/proposal.types.js';

// =============================================================================
// Watched Directory Types
// =============================================================================

/**
 * A directory configured for file monitoring
 */
export interface WatchedDirectory {
  /** Absolute path to directory */
  path: string;
  /** Whether actively monitoring */
  enabled: boolean;
  /** Watch subdirectories (default: false) */
  recursive: boolean;
  /** When added to watch list */
  addedAt: Date;
  /** Last file event detected */
  lastEventAt?: Date;
}

// =============================================================================
// Analysis Types
// =============================================================================

/** How classification was determined */
export type AnalysisMethod =
  | 'pattern' // Filename pattern matching only
  | 'extension' // Extension-based lookup
  | 'content' // Text content analysis
  | 'pdf' // PDF metadata extraction
  | 'llm'; // LLM classification

/** PDF metadata extracted from document */
export interface PdfMetadata {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  creationDate?: Date;
  pageCount?: number;
  /** First 500 chars of first page */
  firstPageText?: string;
}

/**
 * Result of analyzing a detected file
 *
 * Transient object - not persisted. Exists only during analysis pipeline.
 */
export interface FileAnalysis {
  // File identification
  /** Absolute path */
  path: string;
  /** Basename */
  filename: string;
  /** Lowercase, without dot */
  extension: string;
  /** Size in bytes */
  size: number;
  /** Unix timestamp ms */
  mtime: number;

  // Pattern detection
  /** Pattern names that matched */
  matchedPatterns: string[];

  // Content analysis (optional)
  /** First 4KB of text content */
  contentPreview?: string;
  /** Extracted PDF info */
  pdfMetadata?: PdfMetadata;

  // Classification result
  suggestedCategory: FileCategory;
  suggestedDestination: string;
  confidence: ConfidenceLevel;
  reasoning: string;

  // Sensitivity detection
  sensitive: boolean;
  sensitiveReason?: string;

  // Analysis metadata
  analyzedAt: Date;
  analysisMethod: AnalysisMethod;
}

// =============================================================================
// Pattern Matching Types
// =============================================================================

/** Result of pattern matching */
export interface PatternMatch {
  /** Pattern name */
  pattern: string;
  /** Matched category */
  category: FileCategory;
  /** Confidence from this pattern */
  confidence: ConfidenceLevel;
}

/** Sensitivity check result */
export interface SensitivityResult {
  sensitive: boolean;
  reason?: string;
  matchedPattern?: string;
}

// =============================================================================
// LLM Classification Types
// =============================================================================

/** Context for LLM classification */
export interface LlmClassificationContext {
  filename: string;
  extension: string;
  size: number;
  contentPreview?: string;
  pdfMetadata?: PdfMetadata;
}

/** Result from LLM classification */
export interface LlmClassificationResult {
  category: FileCategory;
  confidence: ConfidenceLevel;
  reasoning: string;
}

// =============================================================================
// Destination Resolution Types
// =============================================================================

/** Result of destination resolution */
export interface DestinationResult {
  path: string;
  action: 'move' | 'rename' | 'move_and_rename';
  reasoning: string;
}

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Configuration for the file watcher service
 */
export interface WatcherConfig {
  /** Directories to watch */
  directories: WatchedDirectory[];

  /** Base path for organized files (MUST be outside watched directories) */
  basePath: string;

  // Stability detection
  /** Wait time before processing file (default: 3000ms) */
  stabilityDelayMs: number;
  /** Maximum wait time for stability (default: 60000ms) */
  maxStabilityWaitMs: number;

  // Debouncing
  /** Hours before re-proposing rejected file (default: 24) */
  cooldownHours: number;

  // Analysis
  /** Max bytes to preview (default: 4096) */
  maxContentPreviewBytes: number;
  /** Skip content analysis for files larger than this (default: 10MB) */
  maxFileSizeForContent: number;
  /** Use LLM for uncertain files (default: true) */
  enableLlmClassification: boolean;

  // Proposal storage
  /** Path to proposals.json file */
  proposalStorePath: string;

  // Patterns
  /** Files to never analyze */
  ignoredPatterns: RegExp[];
}

// =============================================================================
// Default Configuration
// =============================================================================

/** Default watched directories (use DIANA_WATCH_DIRS env var to override) */
export const DEFAULT_WATCHED_DIRECTORIES: WatchedDirectory[] = (() => {
  // Allow override via environment variable (comma-separated paths)
  const envDirs = process.env.DIANA_WATCH_DIRS;
  if (envDirs) {
    return envDirs.split(',').map((path) => ({
      path: path.trim(),
      enabled: true,
      recursive: false,
      addedAt: new Date(),
    }));
  }

  // Default paths for WSL - use WINDOWS_USER env var or fall back to 'joshu'
  const windowsUser = process.env.WINDOWS_USER || 'joshu';
  return [
    {
      path: `/mnt/c/Users/${windowsUser}/Downloads`,
      enabled: true,
      recursive: false,
      addedAt: new Date(),
    },
    {
      path: `/mnt/c/Users/${windowsUser}/OneDrive/Documents`,
      enabled: true,
      recursive: false,
      addedAt: new Date(),
    },
  ];
})();

/** Default watcher configuration */
export const DEFAULT_WATCHER_CONFIG: WatcherConfig = {
  directories: DEFAULT_WATCHED_DIRECTORIES,
  basePath: '/mnt/s/Organized',
  stabilityDelayMs: 3000,
  maxStabilityWaitMs: 60000,
  cooldownHours: 24,
  maxContentPreviewBytes: 4096,
  maxFileSizeForContent: 10_000_000, // 10MB
  enableLlmClassification: true,
  proposalStorePath: '/home/diana/proposals.json',
  ignoredPatterns: [
    /^\./, // Dotfiles
    /\.tmp$/i, // Temp files
    /\.part$/i, // Partial downloads
    /~$/, // Backup files
    /\.crdownload$/i, // Chrome downloads in progress
  ],
};

// =============================================================================
// Service Events
// =============================================================================

/** Events emitted by WatcherService */
export interface WatcherServiceEvents {
  'file:detected': (path: string, stats: { size: number; mtimeMs: number }) => void;
  'file:stable': (path: string) => void;
  'file:analyzed': (analysis: FileAnalysis) => void;
  'file:error': (path: string, error: Error) => void;
  'watcher:started': () => void;
  'watcher:stopped': () => void;
  'directory:added': (path: string) => void;
  'directory:removed': (path: string) => void;
}
