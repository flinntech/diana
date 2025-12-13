/**
 * Custom Error Classes for Obsidian Integration
 *
 * Feature: 001-obsidian-integration
 */

import type { ObsidianErrorCode } from '../types/obsidian.js';

/** Base error class for Obsidian operations */
export class ObsidianWriteError extends Error {
  readonly code: ObsidianErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ObsidianErrorCode,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ObsidianWriteError';
    this.code = code;
    this.details = details;

    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): { code: ObsidianErrorCode; message: string; details?: Record<string, unknown> } {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

/** Thrown when the vault path does not exist or is not accessible */
export class VaultNotFoundError extends ObsidianWriteError {
  constructor(vaultPath: string) {
    super(
      'VAULT_NOT_FOUND',
      `Vault not found at path: ${vaultPath}`,
      { vaultPath }
    );
    this.name = 'VaultNotFoundError';
  }
}

/** Thrown when the vault exists but is not writable */
export class VaultNotWritableError extends ObsidianWriteError {
  constructor(vaultPath: string, reason?: string) {
    super(
      'VAULT_NOT_WRITABLE',
      `Vault is not writable: ${vaultPath}${reason ? ` (${reason})` : ''}`,
      { vaultPath, reason }
    );
    this.name = 'VaultNotWritableError';
  }
}

/** Thrown when file is locked by another process and lock could not be acquired */
export class WriteConflictError extends ObsidianWriteError {
  constructor(filePath: string, reason?: string) {
    super(
      'WRITE_CONFLICT',
      `Write conflict for file: ${filePath}${reason ? ` (${reason})` : ''}`,
      { filePath, reason }
    );
    this.name = 'WriteConflictError';
  }
}

/** Thrown when a note has corrupted frontmatter that cannot be parsed */
export class CorruptedNoteError extends ObsidianWriteError {
  constructor(filePath: string, parseError?: string) {
    super(
      'CORRUPTED_NOTE',
      `Corrupted note at: ${filePath}${parseError ? ` (${parseError})` : ''}`,
      { filePath, parseError }
    );
    this.name = 'CorruptedNoteError';
  }
}

/** Thrown when file lock cannot be acquired within timeout */
export class LockTimeoutError extends ObsidianWriteError {
  constructor(filePath: string, timeout: number) {
    super(
      'LOCK_TIMEOUT',
      `Lock timeout (${timeout}ms) for file: ${filePath}`,
      { filePath, timeout }
    );
    this.name = 'LockTimeoutError';
  }
}

/** Thrown when disk is full and write cannot complete */
export class DiskFullError extends ObsidianWriteError {
  constructor(filePath: string) {
    super(
      'DISK_FULL',
      `Disk full, cannot write to: ${filePath}`,
      { filePath }
    );
    this.name = 'DiskFullError';
  }
}

// =============================================================================
// Link-Related Errors (Feature: 006-obsidian-rich-linking)
// =============================================================================

/** Thrown when a wiki-link is invalid (empty, contains invalid chars, etc.) */
export class InvalidWikiLinkError extends ObsidianWriteError {
  constructor(link: string, reason: string) {
    super(
      'INVALID_WIKILINK',
      `Invalid wiki-link "${link}": ${reason}`,
      { link, reason }
    );
    this.name = 'InvalidWikiLinkError';
  }
}

/** Thrown when a backlink update fails */
export class BacklinkUpdateError extends ObsidianWriteError {
  constructor(targetPath: string, sourcePath: string, reason?: string) {
    super(
      'BACKLINK_UPDATE_FAILED',
      `Failed to update backlinks in ${targetPath} from ${sourcePath}${reason ? `: ${reason}` : ''}`,
      { targetPath, sourcePath, reason }
    );
    this.name = 'BacklinkUpdateError';
  }
}

/** Thrown when vault migration fails */
export class MigrationError extends ObsidianWriteError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(
      'MIGRATION_FAILED',
      message,
      details
    );
    this.name = 'MigrationError';
  }
}

/**
 * Check if an error is a known Obsidian error
 */
export function isObsidianError(error: unknown): error is ObsidianWriteError {
  return error instanceof ObsidianWriteError;
}

/**
 * Convert a system error to an appropriate Obsidian error
 */
export function fromSystemError(error: NodeJS.ErrnoException, filePath: string): ObsidianWriteError {
  switch (error.code) {
    case 'ENOENT':
      return new VaultNotFoundError(filePath);
    case 'EACCES':
    case 'EPERM':
      return new VaultNotWritableError(filePath, error.message);
    case 'EBUSY':
      return new WriteConflictError(filePath, 'File is busy');
    case 'ENOSPC':
      return new DiskFullError(filePath);
    default:
      return new ObsidianWriteError(
        'UNKNOWN_ERROR',
        error.message,
        { originalCode: error.code, filePath }
      );
  }
}
