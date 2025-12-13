/**
 * VaultMigrator - Vault Migration and Validation
 *
 * Feature: 006-obsidian-rich-linking
 * Date: 2025-12-13
 *
 * Handles migration of existing vault notes to add backlinks sections
 * and validates vault consistency.
 */

import { readFile, writeFile, readdir, access } from 'fs/promises';
import { constants } from 'fs';
import { join, relative } from 'path';
import { LinkManager, normalizePath } from './link-manager.js';
import {
  updateBacklinksSection,
  extractBacklinksFromContent,
} from './templates.js';
import {
  parseNote,
  stringifyNote,
  hasCorruptedFrontmatter,
} from './frontmatter.js';
import { MigrationError } from './errors.js';
import type { NoteReferences, BaseFrontmatter } from '../types/obsidian.js';

// =============================================================================
// Types
// =============================================================================

export interface MigrationResult {
  /** Total notes scanned */
  totalNotes: number;
  /** Notes that were updated */
  updated: number;
  /** Notes that were skipped (already had backlinks) */
  skipped: number;
  /** Notes that failed to process */
  failed: number;
  /** Notes with corrupted frontmatter */
  corrupted: string[];
  /** Notes without frontmatter */
  noFrontmatter: string[];
  /** Error details by path */
  errors: Record<string, string>;
}

export interface ValidationResult {
  /** Vault is valid */
  valid: boolean;
  /** Notes with missing backlinks */
  missingBacklinks: Array<{ path: string; missing: string[] }>;
  /** Notes with extra backlinks (not in actual sources) */
  extraBacklinks: Array<{ path: string; extra: string[] }>;
  /** Notes with corrupted frontmatter */
  corruptedNotes: string[];
  /** Notes without frontmatter */
  noFrontmatterNotes: string[];
  /** Orphan notes (no incoming or outgoing links) */
  orphanNotes: string[];
  /** Total notes scanned */
  totalNotes: number;
}

export interface RepairResult {
  /** Number of notes repaired */
  repaired: number;
  /** Notes that couldn't be repaired */
  failed: string[];
  /** Repair details */
  details: Record<string, string>;
}

// =============================================================================
// VaultMigrator Class
// =============================================================================

export class VaultMigrator {
  private readonly vaultPath: string;
  private readonly linkManager: LinkManager;

  constructor(vaultPath: string) {
    this.vaultPath = vaultPath;
    this.linkManager = new LinkManager();
  }

  /**
   * Perform a dry run of migration.
   * Scans all notes and reports what would change without making modifications.
   */
  async dryRun(): Promise<MigrationResult> {
    const result: MigrationResult = {
      totalNotes: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      corrupted: [],
      noFrontmatter: [],
      errors: {},
    };

    try {
      // Step 1: Scan all notes and build link index
      const notes = await this.scanAllNotes();
      result.totalNotes = notes.length;

      // Step 2: Build the link index
      this.linkManager.buildIndex(
        notes.map((n) => ({ path: n.relativePath, content: n.content }))
      );

      // Step 3: Check each note
      for (const note of notes) {
        try {
          // Check frontmatter
          if (hasCorruptedFrontmatter(note.content)) {
            result.corrupted.push(note.relativePath);
            continue;
          }

          if (!this.hasFrontmatter(note.content)) {
            result.noFrontmatter.push(note.relativePath);
            continue;
          }

          // Check if backlinks would change
          const currentBacklinks = extractBacklinksFromContent(note.content);
          const expectedBacklinks = this.linkManager.getBacklinks(note.relativePath);

          if (this.backlinksNeedUpdate(currentBacklinks, expectedBacklinks)) {
            result.updated++;
          } else {
            result.skipped++;
          }
        } catch (error) {
          result.failed++;
          result.errors[note.relativePath] = error instanceof Error ? error.message : 'Unknown error';
        }
      }
    } catch (error) {
      throw new MigrationError(
        `Dry run failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { phase: 'dry-run' }
      );
    }

    return result;
  }

  /**
   * Execute the migration.
   * Updates all notes to add/update backlinks sections.
   */
  async migrate(): Promise<MigrationResult> {
    const result: MigrationResult = {
      totalNotes: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      corrupted: [],
      noFrontmatter: [],
      errors: {},
    };

    try {
      // Step 1: Scan all notes
      const notes = await this.scanAllNotes();
      result.totalNotes = notes.length;

      // Step 2: Build the link index
      this.linkManager.buildIndex(
        notes.map((n) => ({ path: n.relativePath, content: n.content }))
      );

      // Step 3: Update each note
      for (const note of notes) {
        try {
          // Handle corrupted frontmatter - skip and log
          if (hasCorruptedFrontmatter(note.content)) {
            result.corrupted.push(note.relativePath);
            result.failed++;
            continue;
          }

          // Handle no frontmatter - skip and log
          if (!this.hasFrontmatter(note.content)) {
            result.noFrontmatter.push(note.relativePath);
            result.failed++;
            continue;
          }

          // Calculate expected backlinks
          const expectedBacklinks = this.linkManager.getBacklinks(note.relativePath);
          const currentBacklinks = extractBacklinksFromContent(note.content);

          // Check if update needed
          if (!this.backlinksNeedUpdate(currentBacklinks, expectedBacklinks)) {
            result.skipped++;
            continue;
          }

          // Update content
          let updatedContent = updateBacklinksSection(note.content, expectedBacklinks);

          // Update frontmatter referencedBy
          updatedContent = this.updateFrontmatterReferencedBy(
            updatedContent,
            expectedBacklinks,
            note.relativePath
          );

          // Write updated content
          await writeFile(note.absolutePath, updatedContent, 'utf8');
          result.updated++;
        } catch (error) {
          result.failed++;
          result.errors[note.relativePath] = error instanceof Error ? error.message : 'Unknown error';
        }
      }
    } catch (error) {
      throw new MigrationError(
        `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { phase: 'migrate' }
      );
    }

    return result;
  }

  /**
   * Validate vault consistency.
   * Checks that all backlinks match actual references.
   */
  async validate(): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      missingBacklinks: [],
      extraBacklinks: [],
      corruptedNotes: [],
      noFrontmatterNotes: [],
      orphanNotes: [],
      totalNotes: 0,
    };

    try {
      // Scan all notes
      const notes = await this.scanAllNotes();
      result.totalNotes = notes.length;

      // Build the link index
      this.linkManager.buildIndex(
        notes.map((n) => ({ path: n.relativePath, content: n.content }))
      );

      // Check each note
      for (const note of notes) {
        // Check frontmatter
        if (hasCorruptedFrontmatter(note.content)) {
          result.corruptedNotes.push(note.relativePath);
          result.valid = false;
          continue;
        }

        if (!this.hasFrontmatter(note.content)) {
          result.noFrontmatterNotes.push(note.relativePath);
          // Non-critical - don't mark as invalid
          continue;
        }

        // Check backlinks consistency
        const currentBacklinks = new Set(extractBacklinksFromContent(note.content));
        const expectedBacklinks = new Set(this.linkManager.getBacklinks(note.relativePath));

        // Find missing backlinks
        const missing: string[] = [];
        for (const expected of expectedBacklinks) {
          if (!currentBacklinks.has(expected)) {
            missing.push(expected);
          }
        }
        if (missing.length > 0) {
          result.missingBacklinks.push({ path: note.relativePath, missing });
          result.valid = false;
        }

        // Find extra backlinks
        const extra: string[] = [];
        for (const current of currentBacklinks) {
          if (!expectedBacklinks.has(current)) {
            extra.push(current);
          }
        }
        if (extra.length > 0) {
          result.extraBacklinks.push({ path: note.relativePath, extra });
          result.valid = false;
        }

        // Check for orphan notes (optional)
        const hasIncoming = this.linkManager.getBacklinks(note.relativePath).length > 0;
        const hasOutgoing = this.linkManager.getOutgoingLinks(note.relativePath).length > 0;
        if (!hasIncoming && !hasOutgoing && note.relativePath !== 'index') {
          result.orphanNotes.push(note.relativePath);
        }
      }
    } catch (error) {
      throw new MigrationError(
        `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { phase: 'validate' }
      );
    }

    return result;
  }

  /**
   * Repair invalid backlinks.
   * Fixes missing and extra backlinks.
   */
  async repair(): Promise<RepairResult> {
    const result: RepairResult = {
      repaired: 0,
      failed: [],
      details: {},
    };

    // First validate to find issues
    const validation = await this.validate();

    // Repair missing backlinks
    for (const issue of validation.missingBacklinks) {
      try {
        const filePath = join(this.vaultPath, `${issue.path}.md`);
        const content = await readFile(filePath, 'utf8');

        // Get full expected backlinks
        const expectedBacklinks = this.linkManager.getBacklinks(issue.path);

        // Update content
        let updatedContent = updateBacklinksSection(content, expectedBacklinks);
        updatedContent = this.updateFrontmatterReferencedBy(
          updatedContent,
          expectedBacklinks,
          issue.path
        );

        await writeFile(filePath, updatedContent, 'utf8');
        result.repaired++;
        result.details[issue.path] = `Added ${issue.missing.length} missing backlinks`;
      } catch (error) {
        result.failed.push(issue.path);
      }
    }

    // Repair extra backlinks
    for (const issue of validation.extraBacklinks) {
      try {
        const filePath = join(this.vaultPath, `${issue.path}.md`);
        const content = await readFile(filePath, 'utf8');

        // Get full expected backlinks
        const expectedBacklinks = this.linkManager.getBacklinks(issue.path);

        // Update content
        let updatedContent = updateBacklinksSection(content, expectedBacklinks);
        updatedContent = this.updateFrontmatterReferencedBy(
          updatedContent,
          expectedBacklinks,
          issue.path
        );

        await writeFile(filePath, updatedContent, 'utf8');
        result.repaired++;
        result.details[issue.path] = `Removed ${issue.extra.length} extra backlinks`;
      } catch (error) {
        result.failed.push(issue.path);
      }
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  private async scanAllNotes(): Promise<Array<{
    absolutePath: string;
    relativePath: string;
    content: string;
  }>> {
    const notes: Array<{ absolutePath: string; relativePath: string; content: string }> = [];

    const scanDir = async (dirPath: string) => {
      try {
        await access(dirPath, constants.R_OK);
      } catch {
        return;
      }

      const entries = await readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);

        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.name.endsWith('.md')) {
          try {
            const content = await readFile(fullPath, 'utf8');
            const relativePath = normalizePath(relative(this.vaultPath, fullPath));
            notes.push({
              absolutePath: fullPath,
              relativePath,
              content,
            });
          } catch {
            // Skip unreadable files
          }
        }
      }
    };

    await scanDir(this.vaultPath);
    return notes;
  }

  private hasFrontmatter(content: string): boolean {
    return content.trimStart().startsWith('---');
  }

  private backlinksNeedUpdate(current: string[], expected: string[]): boolean {
    if (current.length !== expected.length) return true;

    const currentSet = new Set(current.map(normalizePath));
    const expectedSet = new Set(expected.map(normalizePath));

    for (const path of expectedSet) {
      if (!currentSet.has(path)) return true;
    }

    return false;
  }

  private updateFrontmatterReferencedBy(
    content: string,
    backlinks: string[],
    relativePath: string
  ): string {
    try {
      const filePath = join(this.vaultPath, `${relativePath}.md`);
      const { frontmatter, content: body } = parseNote<BaseFrontmatter & NoteReferences>(content, filePath);
      const updatedFrontmatter = {
        ...frontmatter,
        referencedBy: backlinks.length > 0 ? backlinks.sort() : undefined,
      };
      return stringifyNote(updatedFrontmatter, body);
    } catch {
      // If frontmatter is corrupted, just return original content
      return content;
    }
  }
}

/**
 * Create a VaultMigrator instance
 */
export function createVaultMigrator(vaultPath: string): VaultMigrator {
  return new VaultMigrator(vaultPath);
}
