/**
 * Destination Resolver
 *
 * Feature: 003-file-watcher-proposals
 * Date: 2025-12-11
 *
 * Determines destination paths for files based on category.
 * Critical: Destinations must be OUTSIDE watched directories to prevent recursive proposals.
 */

import { normalize, join } from 'path';
import { format } from 'date-fns';
import type { FileCategory } from '../proposals/proposal.types.js';
import type { DestinationResult, FileAnalysis } from '../types/watcher.js';

// =============================================================================
// Default Destination Mapping
// =============================================================================

/**
 * Default destination paths by category
 *
 * Placeholders:
 * - {basePath}: Root organization folder
 * - {year}: Current year (YYYY)
 * - {month}: Current month (MM)
 * - {project}: Detected project name or 'Misc'
 */
export const DEFAULT_DESTINATIONS: Record<FileCategory, string> = {
  finances: '{basePath}/Finances/{year}/',
  screenshots: '{basePath}/Screenshots/{year}/{month}/',
  installers: '{basePath}/Installers/',
  work: '{basePath}/Work/',
  personal: '{basePath}/Personal/',
  reference: '{basePath}/Reference/',
  media: '{basePath}/Media/{year}/',
  archives: '{basePath}/Archives/',
  code: '{basePath}/Code/',
  misc: '{basePath}/Misc/',
};

// =============================================================================
// DestinationResolver Class
// =============================================================================

/**
 * Resolves destination paths for file organization
 */
export class DestinationResolver {
  private readonly basePath: string;
  private readonly watchedDirectories: string[];

  constructor(basePath: string, watchedDirectories: string[] = []) {
    this.basePath = normalize(basePath);
    this.watchedDirectories = watchedDirectories.map((d) => normalize(d));
  }

  /**
   * Resolve destination for a file analysis
   */
  resolve(analysis: FileAnalysis): DestinationResult | null {
    const destPath = this.resolvePath(analysis.suggestedCategory, analysis.filename);

    // Validate destination is not in watched directories
    if (!this.isValidDestination(destPath)) {
      return null;
    }

    // Check if same location
    if (normalize(analysis.path) === normalize(destPath)) {
      return null;
    }

    return {
      path: destPath,
      action: 'move',
      reasoning: `Moving ${analysis.filename} to ${analysis.suggestedCategory} folder`,
    };
  }

  /**
   * Resolve destination path for a category and filename
   */
  resolvePath(category: FileCategory, filename: string): string {
    const template = DEFAULT_DESTINATIONS[category];
    const now = new Date();

    const path = template
      .replace('{basePath}', this.basePath)
      .replace('{year}', format(now, 'yyyy'))
      .replace('{month}', format(now, 'MM'));

    return join(path, filename);
  }

  /**
   * Create a resolve function bound to this resolver
   */
  createResolveFunction(): (category: FileCategory, filename: string) => string {
    return (category: FileCategory, filename: string) =>
      this.resolvePath(category, filename);
  }

  /**
   * Check if a destination path is valid (not inside watched directories)
   */
  isValidDestination(destPath: string): boolean {
    const normalizedDest = normalize(destPath);

    for (const watched of this.watchedDirectories) {
      // Cannot be the watched directory itself
      if (normalizedDest === watched) {
        return false;
      }

      // Cannot be inside a watched directory (would trigger re-detection)
      if (normalizedDest.startsWith(watched + '/')) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get the list of watched directories
   */
  getWatchedDirectories(): string[] {
    return [...this.watchedDirectories];
  }

  /**
   * Get the base path
   */
  getBasePath(): string {
    return this.basePath;
  }

  // ===========================================================================
  // Category-Specific Resolvers
  // ===========================================================================

  /**
   * Resolve finances destination with year organization
   */
  resolveFinances(filename: string, year?: number): string {
    const y = year ?? new Date().getFullYear();
    return join(this.basePath, 'Finances', String(y), filename);
  }

  /**
   * Resolve screenshots destination with year/month organization
   */
  resolveScreenshots(filename: string, date?: Date): string {
    const d = date ?? new Date();
    return join(
      this.basePath,
      'Screenshots',
      format(d, 'yyyy'),
      format(d, 'MM'),
      filename
    );
  }

  /**
   * Resolve installers destination (flat folder)
   */
  resolveInstallers(filename: string): string {
    return join(this.basePath, 'Installers', filename);
  }

  /**
   * Resolve work destination
   */
  resolveWork(filename: string, project?: string): string {
    if (project) {
      return join(this.basePath, 'Work', project, filename);
    }
    return join(this.basePath, 'Work', filename);
  }

  /**
   * Resolve personal destination
   */
  resolvePersonal(filename: string): string {
    return join(this.basePath, 'Personal', filename);
  }

  /**
   * Resolve reference destination
   */
  resolveReference(filename: string): string {
    return join(this.basePath, 'Reference', filename);
  }

  /**
   * Resolve media destination with year organization
   */
  resolveMedia(filename: string, year?: number): string {
    const y = year ?? new Date().getFullYear();
    return join(this.basePath, 'Media', String(y), filename);
  }

  /**
   * Resolve archives destination
   */
  resolveArchives(filename: string): string {
    return join(this.basePath, 'Archives', filename);
  }

  /**
   * Resolve code destination
   */
  resolveCode(filename: string): string {
    return join(this.basePath, 'Code', filename);
  }

  /**
   * Resolve misc (catchall) destination
   */
  resolveMisc(filename: string): string {
    return join(this.basePath, 'Misc', filename);
  }
}

/**
 * Create a new DestinationResolver instance
 */
export function createDestinationResolver(
  basePath: string,
  watchedDirectories?: string[]
): DestinationResolver {
  return new DestinationResolver(basePath, watchedDirectories);
}
