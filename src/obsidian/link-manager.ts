/**
 * LinkManager - Wiki-Link Extraction and Tracking
 *
 * Feature: 006-obsidian-rich-linking
 * Date: 2025-12-13
 *
 * Core class for extracting wiki-links from note content and tracking
 * bidirectional relationships between notes in memory.
 */

import type { WikiLink } from '../types/obsidian.js';

// =============================================================================
// Constants
// =============================================================================

/**
 * Core regex pattern for wiki-links
 * Capture groups:
 *   1: embed marker (!)
 *   2: path (required)
 *   3: heading (optional, after #)
 *   4: block ID (optional, after ^)
 *   5: alias (optional, after |)
 */
const WIKILINK_PATTERN = /(!?)\[\[([^\]|#^]+)(?:#([^\]|^]+))?(?:\^([^\]|]+))?(?:\|([^\]]+))?\]\]/g;

/** Invalid filesystem characters for wiki-link paths */
const INVALID_PATH_CHARS = /[<>:"|?*\n\r]/;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Remove code blocks from content to avoid false positive wiki-link matches.
 * Handles fenced code blocks (``` and ~~~), inline code, and indented code.
 */
export function removeCodeBlocks(content: string): string {
  let result = content;

  // Remove fenced code blocks (``` and ~~~)
  // Using multiline flag and matching from start of line
  result = result.replace(/^```[\s\S]*?^```/gm, '');
  result = result.replace(/^~~~[\s\S]*?^~~~/gm, '');

  // Remove inline code (single backticks, not multiline)
  result = result.replace(/`[^`\n]+`/g, '');

  // Remove indented code blocks (4 spaces or tab at start of line)
  result = result.replace(/^(    |\t).+$/gm, '');

  return result;
}

/**
 * Validate a wiki-link path.
 * Returns null if valid, or an error message if invalid.
 */
export function validateWikiLinkPath(path: string): string | null {
  const trimmed = path.trim();

  if (!trimmed) {
    return 'path is empty';
  }

  if (trimmed.includes('\n') || trimmed.includes('\r')) {
    return 'path contains newlines';
  }

  if (INVALID_PATH_CHARS.test(trimmed)) {
    return 'path contains invalid characters';
  }

  return null;
}

/**
 * Normalize a vault path (remove .md extension, trim whitespace)
 */
export function normalizePath(path: string): string {
  return path.trim().replace(/\.md$/, '');
}

// =============================================================================
// LinkManager Class
// =============================================================================

/**
 * Manages wiki-link extraction and bidirectional relationship tracking.
 *
 * Content wiki-links are the source of truth; frontmatter is derived.
 * Uses in-memory forward and reverse indexes for fast lookups.
 */
export class LinkManager {
  /** Forward index: source path → set of target paths */
  private outgoing: Map<string, Set<string>> = new Map();

  /** Reverse index: target path → set of source paths */
  private incoming: Map<string, Set<string>> = new Map();

  /**
   * Extract all wiki-links from markdown content.
   * Filters out links in code blocks.
   *
   * @param content - Markdown content to parse
   * @returns Array of WikiLink objects
   */
  extractWikiLinks(content: string): WikiLink[] {
    // Step 1: Remove code blocks to avoid false positives
    const cleaned = removeCodeBlocks(content);

    // Step 2: Extract with regex
    const links: WikiLink[] = [];
    const seen = new Set<string>();

    let match;
    // Reset regex lastIndex
    WIKILINK_PATTERN.lastIndex = 0;

    while ((match = WIKILINK_PATTERN.exec(cleaned)) !== null) {
      const raw = match[0];
      const isEmbed = match[1] === '!';
      const path = match[2]?.trim() || '';
      const heading = match[3]?.trim();
      const blockId = match[4]?.trim();
      const alias = match[5]?.trim();

      // Skip invalid paths
      const validationError = validateWikiLinkPath(path);
      if (validationError) {
        continue;
      }

      // Deduplicate by path (keep first occurrence)
      const normalizedPath = normalizePath(path);
      if (seen.has(normalizedPath)) {
        continue;
      }
      seen.add(normalizedPath);

      links.push({
        raw,
        path: normalizedPath,
        heading,
        blockId,
        alias,
        isEmbed,
      });
    }

    return links;
  }

  /**
   * Extract outgoing link paths from content.
   * Excludes embeds (links prefixed with !).
   *
   * @param content - Markdown content to parse
   * @returns Array of normalized paths (without .md extension)
   */
  extractOutgoingLinks(content: string): string[] {
    const links = this.extractWikiLinks(content);
    return links
      .filter((link) => !link.isEmbed)
      .map((link) => link.path);
  }

  /**
   * Get all notes that link to the specified path (backlinks).
   *
   * @param path - Target note path
   * @returns Array of source paths that link to this note
   */
  getBacklinks(path: string): string[] {
    const normalizedPath = normalizePath(path);
    const sources = this.incoming.get(normalizedPath);
    return sources ? Array.from(sources).sort() : [];
  }

  /**
   * Get all notes that this note links to (outgoing links).
   *
   * @param path - Source note path
   * @returns Array of target paths this note links to
   */
  getOutgoingLinks(path: string): string[] {
    const normalizedPath = normalizePath(path);
    const targets = this.outgoing.get(normalizedPath);
    return targets ? Array.from(targets).sort() : [];
  }

  /**
   * Update the link index for a note.
   * Returns the set of target paths that were added or removed.
   *
   * @param sourcePath - Path of the note being updated
   * @param newOutgoing - New set of outgoing link paths
   * @returns Object with added and removed paths
   */
  updateNoteLinks(
    sourcePath: string,
    newOutgoing: string[]
  ): { added: string[]; removed: string[] } {
    const normalizedSource = normalizePath(sourcePath);
    const newTargets = new Set(newOutgoing.map(normalizePath));

    // Get existing targets
    const existingTargets = this.outgoing.get(normalizedSource) || new Set();

    // Calculate added and removed
    const added: string[] = [];
    const removed: string[] = [];

    // Find added targets
    for (const target of newTargets) {
      if (!existingTargets.has(target)) {
        added.push(target);
      }
    }

    // Find removed targets
    for (const target of existingTargets) {
      if (!newTargets.has(target)) {
        removed.push(target);
      }
    }

    // Update forward index
    if (newTargets.size > 0) {
      this.outgoing.set(normalizedSource, newTargets);
    } else {
      this.outgoing.delete(normalizedSource);
    }

    // Update reverse index for added targets
    for (const target of added) {
      if (!this.incoming.has(target)) {
        this.incoming.set(target, new Set());
      }
      this.incoming.get(target)!.add(normalizedSource);
    }

    // Update reverse index for removed targets
    for (const target of removed) {
      const sources = this.incoming.get(target);
      if (sources) {
        sources.delete(normalizedSource);
        if (sources.size === 0) {
          this.incoming.delete(target);
        }
      }
    }

    return { added, removed };
  }

  /**
   * Remove a note from the index.
   * Cleans up both forward and reverse indexes.
   *
   * @param path - Path of the note to remove
   */
  removeNote(path: string): void {
    const normalizedPath = normalizePath(path);

    // Get existing outgoing links
    const targets = this.outgoing.get(normalizedPath);
    if (targets) {
      // Remove from reverse index
      for (const target of targets) {
        const sources = this.incoming.get(target);
        if (sources) {
          sources.delete(normalizedPath);
          if (sources.size === 0) {
            this.incoming.delete(target);
          }
        }
      }
      // Remove from forward index
      this.outgoing.delete(normalizedPath);
    }

    // Also remove as a target from incoming index
    const sources = this.incoming.get(normalizedPath);
    if (sources) {
      // Remove from forward index of all sources
      for (const source of sources) {
        const sourceTargets = this.outgoing.get(source);
        if (sourceTargets) {
          sourceTargets.delete(normalizedPath);
          if (sourceTargets.size === 0) {
            this.outgoing.delete(source);
          }
        }
      }
      // Remove from reverse index
      this.incoming.delete(normalizedPath);
    }
  }

  /**
   * Build the index from a batch of notes.
   * Used for initial indexing or migration.
   *
   * @param notes - Array of { path, content } objects
   */
  buildIndex(notes: Array<{ path: string; content: string }>): void {
    // Clear existing index
    this.outgoing.clear();
    this.incoming.clear();

    // Index each note
    for (const note of notes) {
      const normalizedPath = normalizePath(note.path);
      const outgoingLinks = this.extractOutgoingLinks(note.content);

      if (outgoingLinks.length > 0) {
        this.outgoing.set(normalizedPath, new Set(outgoingLinks.map(normalizePath)));

        // Build reverse index
        for (const target of outgoingLinks) {
          const normalizedTarget = normalizePath(target);
          if (!this.incoming.has(normalizedTarget)) {
            this.incoming.set(normalizedTarget, new Set());
          }
          this.incoming.get(normalizedTarget)!.add(normalizedPath);
        }
      }
    }
  }

  /**
   * Check if a note is in the index (has outgoing or incoming links).
   *
   * @param path - Note path to check
   * @returns true if the note has any links
   */
  hasNote(path: string): boolean {
    const normalizedPath = normalizePath(path);
    return this.outgoing.has(normalizedPath) || this.incoming.has(normalizedPath);
  }

  /**
   * Get statistics about the index.
   */
  getStats(): { totalNotes: number; totalLinks: number } {
    let totalLinks = 0;
    for (const targets of this.outgoing.values()) {
      totalLinks += targets.size;
    }

    const allNotes = new Set([
      ...this.outgoing.keys(),
      ...this.incoming.keys(),
    ]);

    return {
      totalNotes: allNotes.size,
      totalLinks,
    };
  }

  /**
   * Clear the entire index.
   */
  clear(): void {
    this.outgoing.clear();
    this.incoming.clear();
  }
}
