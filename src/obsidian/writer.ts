/**
 * ObsidianWriter - Core Write Logic for Obsidian Vault
 *
 * Feature: 001-obsidian-integration
 */

import { readFile, writeFile as writeFileFs, mkdir, access, readdir, stat, appendFile } from 'fs/promises';
import { constants } from 'fs';
import { join, dirname } from 'path';
// @ts-expect-error - write-file-atomic is CommonJS
import writeFileAtomicPkg from 'write-file-atomic';
const writeFileAtomic = writeFileAtomicPkg;
import * as lockfile from 'proper-lockfile';
import type {
  IObsidianWriter,
  ObsidianWriterConfig,
  DailyLogInput,
  ObservationInput,
  ProposalInput,
  SystemNoteInput,
  WriteResult,
  WriteSuccess,
  WriteFailure,
  VaultStats,
  IndexSections,
  QueuedWrite,
  WriteQueue,
  DailyLogFrontmatter,
} from '../types/obsidian.js';
import { PathResolver } from './paths.js';
import {
  generateDailyLogTemplate,
  generateActivityEntry,
  generateObservationTemplate,
  generateProposalTemplate,
  generateSystemTemplate,
  generateIndexTemplate,
} from './templates.js';
import {
  parseNote,
  updateModified,
  stringifyNote,
  formatDateTime,
  hasCorruptedFrontmatter,
  recreateDailyLogFromCorrupted,
} from './frontmatter.js';
import {
  VaultNotFoundError,
  VaultNotWritableError,
  LockTimeoutError,
  DiskFullError,
  fromSystemError,
  isObsidianError,
} from './errors.js';

// =============================================================================
// Write Queue Implementation
// =============================================================================

class InMemoryWriteQueue implements WriteQueue {
  readonly maxSize = 100;
  private queue: QueuedWrite[] = [];
  private idCounter = 0;

  get size(): number {
    return this.queue.length;
  }

  enqueue(write: Omit<QueuedWrite, 'id' | 'retryCount'>): boolean {
    if (this.isFull()) {
      return false;
    }

    this.queue.push({
      ...write,
      id: `write-${++this.idCounter}`,
      retryCount: 0,
    });
    return true;
  }

  dequeue(): QueuedWrite | undefined {
    return this.queue.shift();
  }

  peek(): QueuedWrite | undefined {
    return this.queue[0];
  }

  isFull(): boolean {
    return this.queue.length >= this.maxSize;
  }

  clear(): void {
    this.queue = [];
  }

  toArray(): QueuedWrite[] {
    return [...this.queue];
  }
}

// =============================================================================
// ObsidianWriter Implementation
// =============================================================================

export class ObsidianWriter implements IObsidianWriter {
  private readonly config: Required<ObsidianWriterConfig>;
  private readonly pathResolver: PathResolver;
  private readonly writeQueue: WriteQueue;

  constructor(config: ObsidianWriterConfig) {
    this.config = {
      vaultPath: config.vaultPath,
      fallbackLogPath: config.fallbackLogPath || `${process.env.HOME}/.diana/logs`,
      dateFormat: config.dateFormat || 'yyyy-MM-dd',
      maxRetries: config.maxRetries || 3,
      lockTimeout: config.lockTimeout || 10000,
      skipLocking: config.skipLocking || false,
    };

    this.pathResolver = new PathResolver(this.config.vaultPath, this.config.dateFormat);
    this.writeQueue = new InMemoryWriteQueue();
  }

  // ---------------------------------------------------------------------------
  // Daily Log Operations
  // ---------------------------------------------------------------------------

  async writeDaily(input: DailyLogInput): Promise<WriteResult> {
    const filePath = this.pathResolver.getDailyLogPath();

    try {
      await this.ensureVaultAccessible();
      await this.ensureDirectoryExists(dirname(filePath));

      const fileExists = await this.fileExists(filePath);

      if (fileExists) {
        return await this.appendToDaily(filePath, input);
      } else {
        return await this.createNewDaily(filePath, input);
      }
    } catch (error) {
      return this.handleWriteError(error, filePath, {
        type: 'daily',
        input,
        timestamp: formatDateTime(),
      });
    }
  }

  private async createNewDaily(filePath: string, input: DailyLogInput): Promise<WriteResult> {
    const template = generateDailyLogTemplate();
    const entry = generateActivityEntry(input);
    const content = template + entry;

    await this.atomicWrite(filePath, content);

    return this.successResult(filePath);
  }

  private async appendToDaily(filePath: string, input: DailyLogInput): Promise<WriteResult> {
    return await this.withFileLock(filePath, async () => {
      let existingContent = await readFile(filePath, 'utf8');

      // Check for corrupted frontmatter
      if (hasCorruptedFrontmatter(existingContent)) {
        const dateMatch = filePath.match(/(\d{4}-\d{2}-\d{2})\.md$/);
        const date = dateMatch ? new Date(dateMatch[1]) : new Date();
        existingContent = recreateDailyLogFromCorrupted(existingContent, date);
      }

      // Parse and update frontmatter
      const { frontmatter, content } = parseNote<DailyLogFrontmatter>(existingContent, filePath);
      const updatedFrontmatter = updateModified(frontmatter);

      // Append new entry
      const entry = generateActivityEntry(input);
      const newContent = content.trimEnd() + '\n' + entry;

      const finalContent = stringifyNote(updatedFrontmatter, newContent);
      await this.atomicWrite(filePath, finalContent);

      return this.successResult(filePath);
    });
  }

  // ---------------------------------------------------------------------------
  // Observation Operations
  // ---------------------------------------------------------------------------

  async writeObservation(input: ObservationInput): Promise<WriteResult> {
    const slug = this.slugify(input.title);
    const filePath = this.pathResolver.getObservationPath(slug);

    try {
      await this.ensureVaultAccessible();
      await this.ensureDirectoryExists(dirname(filePath));

      const content = generateObservationTemplate(input);
      await this.atomicWrite(filePath, content);

      return this.successResult(filePath);
    } catch (error) {
      return this.handleWriteError(error, filePath, {
        type: 'observation',
        input,
        timestamp: formatDateTime(),
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Proposal Operations
  // ---------------------------------------------------------------------------

  async writeProposal(input: ProposalInput): Promise<WriteResult> {
    const filePath = this.pathResolver.getProposalPath(input.proposalId);

    try {
      await this.ensureVaultAccessible();
      await this.ensureDirectoryExists(dirname(filePath));

      const content = generateProposalTemplate(input);
      await this.atomicWrite(filePath, content);

      return this.successResult(filePath);
    } catch (error) {
      return this.handleWriteError(error, filePath, {
        type: 'proposal',
        input,
        timestamp: formatDateTime(),
      });
    }
  }

  // ---------------------------------------------------------------------------
  // System Note Operations
  // ---------------------------------------------------------------------------

  async writeSystem(input: SystemNoteInput): Promise<WriteResult> {
    const filePath = this.pathResolver.getSystemPath(input.category);

    try {
      await this.ensureVaultAccessible();
      await this.ensureDirectoryExists(dirname(filePath));

      const content = generateSystemTemplate(input);
      await this.atomicWrite(filePath, content);

      return this.successResult(filePath);
    } catch (error) {
      return this.handleWriteError(error, filePath, {
        type: 'system',
        input,
        timestamp: formatDateTime(),
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Index Operations
  // ---------------------------------------------------------------------------

  async updateIndex(): Promise<WriteResult> {
    const filePath = this.pathResolver.getIndexPath();

    try {
      await this.ensureVaultAccessible();

      const sections = await this.scanVaultForIndex();
      const content = generateIndexTemplate(sections);

      await this.atomicWrite(filePath, content);

      return this.successResult(filePath);
    } catch (error) {
      return this.handleWriteError(error, filePath, {
        type: 'index',
        input: null,
        timestamp: formatDateTime(),
      });
    }
  }

  private async scanVaultForIndex(): Promise<IndexSections> {
    const vaultPath = this.config.vaultPath;

    const dailyLogs = await this.scanDirectory(join(vaultPath, 'daily'), 'daily-log');
    const observations = await this.scanDirectory(join(vaultPath, 'observations'), 'observation');
    const proposals = await this.scanDirectory(join(vaultPath, 'proposals'), 'proposal');
    const systemNotes = await this.scanDirectory(join(vaultPath, 'system'), 'system');

    return {
      dailyLogs: dailyLogs.map(f => ({
        path: `daily/${f.name.replace('.md', '')}`,
        title: this.formatDateTitle(f.name),
      })),
      observations: observations.map(f => ({
        path: `observations/${f.name.replace('.md', '')}`,
        title: this.extractTitle(f.content),
      })),
      proposals: proposals.map(f => ({
        path: `proposals/${f.name.replace('.md', '')}`,
        title: this.extractTitle(f.content),
        status: this.extractProposalStatus(f.content),
      })),
      systemNotes: systemNotes.map(f => ({
        path: `system/${f.name.replace('.md', '')}`,
        title: this.extractTitle(f.content),
      })),
    };
  }

  private async scanDirectory(
    dirPath: string,
    _type: string
  ): Promise<Array<{ name: string; content: string; mtime: Date }>> {
    try {
      await access(dirPath, constants.R_OK);
    } catch {
      return [];
    }

    const files = await readdir(dirPath);
    const results: Array<{ name: string; content: string; mtime: Date }> = [];

    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      const filePath = join(dirPath, file);
      const content = await readFile(filePath, 'utf8');
      const stats = await stat(filePath);

      results.push({ name: file, content, mtime: stats.mtime });
    }

    // Sort by mtime descending (newest first)
    return results.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
  }

  private formatDateTitle(filename: string): string {
    const dateStr = filename.replace('.md', '');
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  private extractTitle(content: string): string {
    // Find first H1 or H2
    const match = content.match(/^#+ (?:Observation|Proposal|System): (.+)$/m);
    if (match) return match[1];

    // Fallback to first heading
    const headingMatch = content.match(/^#+ (.+)$/m);
    if (headingMatch) return headingMatch[1];

    return 'Untitled';
  }

  private extractProposalStatus(content: string): 'pending' | 'approved' | 'rejected' {
    const match = content.match(/status: (pending|approved|rejected)/);
    if (match) return match[1] as 'pending' | 'approved' | 'rejected';
    return 'pending';
  }

  // ---------------------------------------------------------------------------
  // Vault Stats
  // ---------------------------------------------------------------------------

  async getVaultStats(): Promise<VaultStats> {
    const vaultPath = this.config.vaultPath;

    const dailyCount = await this.countFilesInDir(join(vaultPath, 'daily'));
    const obsCount = await this.countFilesInDir(join(vaultPath, 'observations'));
    const propCount = await this.countFilesInDir(join(vaultPath, 'proposals'));
    const sysCount = await this.countFilesInDir(join(vaultPath, 'system'));

    return {
      totalNotes: dailyCount + obsCount + propCount + sysCount,
      dailyLogs: dailyCount,
      observations: obsCount,
      proposals: propCount,
      systemNotes: sysCount,
      lastModified: formatDateTime(),
    };
  }

  private async countFilesInDir(dirPath: string): Promise<number> {
    try {
      const files = await readdir(dirPath);
      return files.filter(f => f.endsWith('.md')).length;
    } catch {
      return 0;
    }
  }

  // ---------------------------------------------------------------------------
  // Vault Accessibility
  // ---------------------------------------------------------------------------

  async isVaultAccessible(): Promise<boolean> {
    try {
      await access(this.config.vaultPath, constants.R_OK | constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  private async ensureVaultAccessible(): Promise<void> {
    try {
      await access(this.config.vaultPath, constants.F_OK);
    } catch {
      throw new VaultNotFoundError(this.config.vaultPath);
    }

    try {
      await access(this.config.vaultPath, constants.W_OK);
    } catch {
      throw new VaultNotWritableError(this.config.vaultPath, 'Permission denied');
    }
  }

  // ---------------------------------------------------------------------------
  // File Operations
  // ---------------------------------------------------------------------------

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    await mkdir(dirPath, { recursive: true });
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  private async atomicWrite(filePath: string, content: string): Promise<void> {
    // In test mode, use simple writeFile (write-file-atomic doesn't work with mock-fs)
    if (this.config.skipLocking) {
      await writeFileFs(filePath, content, { encoding: 'utf8' });
      return;
    }

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        await writeFileAtomic(filePath, content, { encoding: 'utf8' });
        return;
      } catch (error) {
        const err = error as NodeJS.ErrnoException;

        // Retry on EBUSY/EPERM (file locked by another process)
        if ((err.code === 'EBUSY' || err.code === 'EPERM') && attempt < this.config.maxRetries - 1) {
          await this.delay(100 * Math.pow(2, attempt));
          continue;
        }

        // Handle disk full
        if (err.code === 'ENOSPC') {
          throw new DiskFullError(filePath);
        }

        throw error;
      }
    }
  }

  private async withFileLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
    // Skip locking in test environment (for mock-fs compatibility)
    if (this.config.skipLocking) {
      return await fn();
    }

    let release: (() => Promise<void>) | undefined;

    try {
      release = await lockfile.lock(filePath, {
        retries: {
          retries: 5,
          minTimeout: 100,
          maxTimeout: 1000,
          factor: 2,
        },
        stale: this.config.lockTimeout,
        update: 5000,
        realpath: false,
      });

      return await fn();
    } catch (error) {
      const err = error as Error;
      if (err.message.includes('ELOCKED')) {
        throw new LockTimeoutError(filePath, this.config.lockTimeout);
      }
      throw error;
    } finally {
      if (release) {
        try {
          await release();
        } catch {
          // Ignore release errors
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Error Handling & Fallback
  // ---------------------------------------------------------------------------

  private handleWriteError(
    error: unknown,
    filePath: string,
    queueEntry: Omit<QueuedWrite, 'id' | 'retryCount'>
  ): WriteFailure {
    let obsidianError = isObsidianError(error)
      ? error
      : fromSystemError(error as NodeJS.ErrnoException, filePath);

    // Queue the write for later retry
    this.writeQueue.enqueue(queueEntry);

    // Try fallback logging
    const fallbackPath = this.logToFallback(queueEntry);

    return {
      success: false,
      error: obsidianError.toJSON(),
      fallbackPath,
    };
  }

  private logToFallback(entry: Omit<QueuedWrite, 'id' | 'retryCount'>): string | undefined {
    const fallbackDir = this.config.fallbackLogPath;
    const date = new Date().toISOString().split('T')[0];
    const filename = `diana-${date}.log`;
    const fallbackPath = join(fallbackDir, filename);

    // Async fire-and-forget
    (async () => {
      try {
        await mkdir(fallbackDir, { recursive: true });
        const logLine = `${new Date().toISOString()} [${entry.type}] ${JSON.stringify(entry.input)}\n`;
        await appendFile(fallbackPath, logLine);
      } catch {
        // Fallback failed - nothing we can do
      }
    })();

    return fallbackPath;
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  private successResult(filePath: string): WriteSuccess {
    return {
      success: true,
      filePath,
      timestamp: formatDateTime(),
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
