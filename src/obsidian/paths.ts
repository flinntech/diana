/**
 * Path Resolution Utilities for Obsidian Integration
 *
 * Feature: 001-obsidian-integration
 */

import { join, normalize, relative, isAbsolute } from 'node:path';
import { format } from 'date-fns';
import type { IPathResolver, SystemCategory } from '../types/obsidian.js';

/**
 * Path resolver implementation for generating vault paths
 */
export class PathResolver implements IPathResolver {
  private readonly vaultPath: string;
  private readonly dateFormat: string;

  constructor(vaultPath: string, dateFormat: string = 'yyyy-MM-dd') {
    this.vaultPath = normalize(vaultPath);
    this.dateFormat = dateFormat;
  }

  /**
   * Get the path for a daily log file
   * Format: /daily/YYYY-MM-DD.md
   */
  getDailyLogPath(date: Date = new Date()): string {
    const dateStr = format(date, this.dateFormat);
    return join(this.vaultPath, 'daily', `${dateStr}.md`);
  }

  /**
   * Get the path for an observation note
   * Format: /observations/YYYY-MM-DD-slug.md
   */
  getObservationPath(slug: string, date: Date = new Date()): string {
    const dateStr = format(date, this.dateFormat);
    const safeSlug = this.slugify(slug);
    return join(this.vaultPath, 'observations', `${dateStr}-${safeSlug}.md`);
  }

  /**
   * Get the path for a proposal note
   * Format: /proposals/YYYY-MM-DD-proposal-id.md
   */
  getProposalPath(proposalId: string, date: Date = new Date()): string {
    const dateStr = format(date, this.dateFormat);
    const safeId = this.slugify(proposalId);
    return join(this.vaultPath, 'proposals', `${dateStr}-${safeId}.md`);
  }

  /**
   * Get the path for a system note
   * Format: /system/YYYY-MM-DD-category.md
   */
  getSystemPath(category: SystemCategory, date: Date = new Date()): string {
    const dateStr = format(date, this.dateFormat);
    return join(this.vaultPath, 'system', `${dateStr}-${category}.md`);
  }

  /**
   * Get the path to the index.md
   */
  getIndexPath(): string {
    return join(this.vaultPath, 'index.md');
  }

  /**
   * Validate that a path is within the vault directory
   * Prevents path traversal attacks
   */
  isValidVaultPath(path: string): boolean {
    const normalizedPath = normalize(path);
    const relativePath = relative(this.vaultPath, normalizedPath);

    // Check that the path doesn't escape the vault
    if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
      return false;
    }

    return true;
  }

  /**
   * Convert a string to a URL-safe slug
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')  // Remove non-word chars
      .replace(/[\s_-]+/g, '-')  // Replace spaces/underscores with hyphens
      .replace(/^-+|-+$/g, '');  // Remove leading/trailing hyphens
  }

  /**
   * Get the vault path
   */
  getVaultPath(): string {
    return this.vaultPath;
  }

  /**
   * Get the directory for a note type
   */
  getDirectoryPath(type: 'daily' | 'observations' | 'proposals' | 'system'): string {
    return join(this.vaultPath, type);
  }
}

/**
 * Generate a wikilink from a relative path
 * Example: observations/2025-12-10-patterns -> [[observations/2025-12-10-patterns]]
 */
export function toWikilink(relativePath: string): string {
  // Remove .md extension if present
  const pathWithoutExt = relativePath.replace(/\.md$/, '');
  return `[[${pathWithoutExt}]]`;
}

/**
 * Extract the relative path from a wikilink
 * Example: [[observations/2025-12-10-patterns]] -> observations/2025-12-10-patterns
 */
export function fromWikilink(wikilink: string): string {
  return wikilink.replace(/^\[\[|\]\]$/g, '');
}

/**
 * Get the relative path from vault root for a note
 */
export function getRelativePath(vaultPath: string, absolutePath: string): string {
  return relative(vaultPath, absolutePath).replace(/\.md$/, '');
}
