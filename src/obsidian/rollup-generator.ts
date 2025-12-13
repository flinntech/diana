/**
 * RollupGenerator - Weekly and Monthly Rollup Notes
 *
 * Feature: 006-obsidian-rich-linking
 * Date: 2025-12-13
 *
 * Generates summary notes showing knowledge evolution with statistics and links.
 */

import { readFile, readdir, access, mkdir } from 'fs/promises';
import { constants } from 'fs';
import { join, relative } from 'path';
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  getWeek,
  getWeekYear,
} from 'date-fns';
import { PathResolver } from './paths.js';
import {
  parseNote,
  hasCorruptedFrontmatter,
} from './frontmatter.js';
import {
  generateWeeklyRollupTemplate,
  generateMonthlyRollupTemplate,
} from './templates.js';
import type {
  BaseFrontmatter,
  RollupStats,
  ProposalFrontmatter,
} from '../types/obsidian.js';
import type { ObsidianWriter } from './writer.js';

// =============================================================================
// Types
// =============================================================================

interface NoteInfo {
  path: string;
  relativePath: string;
  date: Date;
  type: string;
  status?: string;
}

interface PeriodNotes {
  dailyLogs: string[];
  observations: string[];
  proposalsApproved: string[];
  proposalsRejected: string[];
  proposalsPending: string[];
  systemNotes: string[];
}

export interface RollupResult {
  success: boolean;
  filePath?: string;
  stats?: RollupStats;
  error?: string;
}

// =============================================================================
// RollupGenerator Class
// =============================================================================

/**
 * Generates weekly and monthly rollup notes.
 * Uses ISO 8601 week dates (Monday start, first week contains Jan 4).
 */
export class RollupGenerator {
  private readonly vaultPath: string;
  private readonly pathResolver: PathResolver;
  private readonly writer?: ObsidianWriter;

  constructor(vaultPath: string, writer?: ObsidianWriter) {
    this.vaultPath = vaultPath;
    this.pathResolver = new PathResolver(vaultPath);
    this.writer = writer;
  }

  /**
   * Generate a weekly rollup note for a given date.
   * The date can be any day in the target week.
   *
   * @param date - Any date within the target week
   * @returns Result with file path and statistics
   */
  async generateWeekly(date: Date = new Date()): Promise<RollupResult> {
    try {
      // Calculate week boundaries (Monday to Sunday)
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 });

      // ISO week info
      const weekNumber = getWeek(date, { weekStartsOn: 1, firstWeekContainsDate: 4 });
      const year = getWeekYear(date, { weekStartsOn: 1, firstWeekContainsDate: 4 });
      const weekStr = `${year}-W${String(weekNumber).padStart(2, '0')}`;

      // Scan notes in period
      const notes = await this.getNotesInPeriod(weekStart, weekEnd);

      // Calculate statistics
      const stats = this.calculateStats(notes);

      // Generate content
      const content = generateWeeklyRollupTemplate(
        weekStr,
        year,
        weekNumber,
        format(weekStart, 'yyyy-MM-dd'),
        format(weekEnd, 'yyyy-MM-dd'),
        stats,
        notes
      );

      // Ensure directory exists
      const dirPath = this.pathResolver.getRollupsPath('weekly');
      await mkdir(dirPath, { recursive: true });

      // Write the file
      const filePath = this.pathResolver.getRollupPath('weekly', date);
      await this.writeRollup(filePath, content);

      // Trigger backlink updates if writer is available
      if (this.writer) {
        const relativePath = relative(this.vaultPath, filePath).replace(/\.md$/, '');
        const allReferencedNotes = [
          ...notes.dailyLogs,
          ...notes.observations,
          ...notes.proposalsApproved,
          ...notes.proposalsRejected,
          ...notes.proposalsPending,
          ...notes.systemNotes,
        ];

        if (allReferencedNotes.length > 0) {
          // Fire-and-forget backlink updates
          this.writer.updateBacklinks(
            relativePath,
            allReferencedNotes,
            []
          ).catch((err) => {
            console.warn(`[RollupGenerator] Backlink update failed: ${err}`);
          });
        }
      }

      return {
        success: true,
        filePath,
        stats,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate a monthly rollup note for a given date.
   * The date can be any day in the target month.
   *
   * @param date - Any date within the target month
   * @returns Result with file path and statistics
   */
  async generateMonthly(date: Date = new Date()): Promise<RollupResult> {
    try {
      // Calculate month boundaries
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);

      // Month info
      const year = date.getFullYear();
      const monthNumber = date.getMonth() + 1;
      const monthStr = format(date, 'yyyy-MM');

      // Scan notes in period
      const notes = await this.getNotesInPeriod(monthStart, monthEnd);

      // Calculate statistics
      const stats = this.calculateStats(notes);

      // Calculate weeks in month
      const weeks = this.getWeeksInMonth(date);

      // Generate content
      const content = generateMonthlyRollupTemplate(
        monthStr,
        year,
        monthNumber,
        format(monthStart, 'yyyy-MM-dd'),
        format(monthEnd, 'yyyy-MM-dd'),
        stats,
        notes,
        weeks
      );

      // Ensure directory exists
      const dirPath = this.pathResolver.getRollupsPath('monthly');
      await mkdir(dirPath, { recursive: true });

      // Write the file
      const filePath = this.pathResolver.getRollupPath('monthly', date);
      await this.writeRollup(filePath, content);

      // Trigger backlink updates if writer is available
      if (this.writer) {
        const relativePath = relative(this.vaultPath, filePath).replace(/\.md$/, '');
        const allReferencedNotes = [
          ...notes.dailyLogs,
          ...notes.observations,
          ...notes.proposalsApproved,
          ...notes.proposalsRejected,
          ...notes.proposalsPending,
          ...notes.systemNotes,
        ];

        if (allReferencedNotes.length > 0) {
          this.writer.updateBacklinks(
            relativePath,
            allReferencedNotes,
            []
          ).catch((err) => {
            console.warn(`[RollupGenerator] Backlink update failed: ${err}`);
          });
        }
      }

      return {
        success: true,
        filePath,
        stats,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  /**
   * Get all notes within a date range, categorized by type.
   */
  private async getNotesInPeriod(start: Date, end: Date): Promise<PeriodNotes> {
    const result: PeriodNotes = {
      dailyLogs: [],
      observations: [],
      proposalsApproved: [],
      proposalsRejected: [],
      proposalsPending: [],
      systemNotes: [],
    };

    // Scan each directory
    const directories = [
      { dir: 'daily', type: 'daily-log' },
      { dir: 'observations', type: 'observation' },
      { dir: 'proposals', type: 'proposal' },
      { dir: 'system', type: 'system' },
    ];

    for (const { dir, type } of directories) {
      const dirPath = join(this.vaultPath, dir);
      const notes = await this.scanDirectoryForPeriod(dirPath, dir, type, start, end);

      for (const note of notes) {
        const relativePath = note.relativePath;

        switch (type) {
          case 'daily-log':
            result.dailyLogs.push(relativePath);
            break;
          case 'observation':
            result.observations.push(relativePath);
            break;
          case 'proposal':
            if (note.status === 'approved') {
              result.proposalsApproved.push(relativePath);
            } else if (note.status === 'rejected') {
              result.proposalsRejected.push(relativePath);
            } else {
              result.proposalsPending.push(relativePath);
            }
            break;
          case 'system':
            result.systemNotes.push(relativePath);
            break;
        }
      }
    }

    return result;
  }

  /**
   * Scan a directory for notes within a date range.
   */
  private async scanDirectoryForPeriod(
    dirPath: string,
    dirName: string,
    type: string,
    start: Date,
    end: Date
  ): Promise<NoteInfo[]> {
    const notes: NoteInfo[] = [];

    try {
      await access(dirPath, constants.R_OK);
    } catch {
      return notes;
    }

    const files = await readdir(dirPath);

    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      const filePath = join(dirPath, file);
      const relativePath = `${dirName}/${file.replace('.md', '')}`;

      // Try to extract date from filename (YYYY-MM-DD prefix)
      const dateMatch = file.match(/^(\d{4}-\d{2}-\d{2})/);
      let noteDate: Date | null = null;

      if (dateMatch) {
        try {
          noteDate = parseISO(dateMatch[1]);
        } catch {
          // Fall back to reading frontmatter
        }
      }

      // If no date from filename, try frontmatter
      if (!noteDate) {
        try {
          const content = await readFile(filePath, 'utf8');
          if (!hasCorruptedFrontmatter(content)) {
            const { frontmatter } = parseNote<BaseFrontmatter>(content, filePath);
            if (frontmatter.date) {
              noteDate = parseISO(frontmatter.date);
            }
          }
        } catch {
          continue;
        }
      }

      if (!noteDate) continue;

      // Check if within range
      if (isWithinInterval(noteDate, { start, end })) {
        const noteInfo: NoteInfo = {
          path: filePath,
          relativePath,
          date: noteDate,
          type,
        };

        // For proposals, get status
        if (type === 'proposal') {
          try {
            const content = await readFile(filePath, 'utf8');
            if (!hasCorruptedFrontmatter(content)) {
              const { frontmatter } = parseNote<ProposalFrontmatter>(content, filePath);
              noteInfo.status = frontmatter.status || 'pending';
            }
          } catch {
            noteInfo.status = 'pending';
          }
        }

        notes.push(noteInfo);
      }
    }

    // Sort by date
    return notes.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Calculate statistics from period notes.
   */
  private calculateStats(notes: PeriodNotes): RollupStats {
    return {
      dailyLogs: notes.dailyLogs.length,
      observations: notes.observations.length,
      proposals:
        notes.proposalsApproved.length +
        notes.proposalsRejected.length +
        notes.proposalsPending.length,
      proposalsApproved: notes.proposalsApproved.length,
      proposalsRejected: notes.proposalsRejected.length,
      proposalsPending: notes.proposalsPending.length,
      systemNotes: notes.systemNotes.length,
    };
  }

  /**
   * Get ISO week strings for all weeks in a month.
   */
  private getWeeksInMonth(date: Date): string[] {
    const weeks: string[] = [];
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);

    let current = startOfWeek(monthStart, { weekStartsOn: 1 });

    while (current <= monthEnd) {
      // Only include if week overlaps with the month
      const weekEnd = endOfWeek(current, { weekStartsOn: 1 });
      if (weekEnd >= monthStart && current <= monthEnd) {
        const weekNumber = getWeek(current, { weekStartsOn: 1, firstWeekContainsDate: 4 });
        const year = getWeekYear(current, { weekStartsOn: 1, firstWeekContainsDate: 4 });
        weeks.push(`${year}-W${String(weekNumber).padStart(2, '0')}`);
      }

      // Move to next week
      current = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    // Remove duplicates (edge case for month boundaries)
    return [...new Set(weeks)];
  }

  /**
   * Write rollup content to file.
   */
  private async writeRollup(filePath: string, content: string): Promise<void> {
    const { writeFile } = await import('fs/promises');
    await writeFile(filePath, content, 'utf8');
  }
}

/**
 * Create a RollupGenerator instance
 */
export function createRollupGenerator(
  vaultPath: string,
  writer?: ObsidianWriter
): RollupGenerator {
  return new RollupGenerator(vaultPath, writer);
}
