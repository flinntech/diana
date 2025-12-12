/**
 * Watcher Service
 *
 * Feature: 003-file-watcher-proposals
 * Date: 2025-12-11
 *
 * File system watcher using chokidar with stability detection.
 */

import { EventEmitter } from 'events';
import { stat } from 'fs/promises';
import { existsSync } from 'fs';
import { normalize } from 'path';
import chokidar, { type FSWatcher } from 'chokidar';
import type { WatchedDirectory, WatcherConfig } from '../types/watcher.js';
import { DEFAULT_WATCHER_CONFIG } from '../types/watcher.js';
import type { IObsidianWriter } from '../types/obsidian.js';
import type { ProposalService } from '../proposals/proposal.service.js';
import { FileAnalyzer } from './analyzer.js';
import { DestinationResolver } from './destination.js';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Check if a path is a Windows filesystem mount in WSL
 * WSL2 doesn't support inotify for these paths, requiring polling mode
 */
function isWslWindowsPath(path: string): boolean {
  return /^\/mnt\/[a-zA-Z]\//.test(path);
}

// =============================================================================
// Types
// =============================================================================

/** Pending file awaiting stability */
interface PendingFile {
  path: string;
  lastSize: number;
  lastMtime: number;
  timer?: ReturnType<typeof setTimeout>;
  firstDetected: number;
}

// =============================================================================
// WatcherService Class
// =============================================================================

/**
 * Watches directories for new files and creates organization proposals
 *
 * Events:
 * - file:detected - When a file change is first detected
 * - file:stable - When a file has been stable for the configured delay
 * - file:analyzed - When file analysis is complete
 * - file:error - When an error occurs processing a file
 * - watcher:started - When the watcher starts
 * - watcher:stopped - When the watcher stops
 * - directory:added - When a directory is added to the watch list
 * - directory:removed - When a directory is removed from the watch list
 */
export class WatcherService extends EventEmitter {
  private readonly config: WatcherConfig;
  private readonly proposalService: ProposalService;
  private readonly analyzer: FileAnalyzer;
  private readonly destinationResolver: DestinationResolver;
  private obsidianWriter?: IObsidianWriter;

  private watcher: FSWatcher | null = null;
  private directories: Map<string, WatchedDirectory> = new Map();
  private pendingFiles: Map<string, PendingFile> = new Map();
  private running = false;

  constructor(
    config: Partial<WatcherConfig>,
    proposalService: ProposalService,
    llmQuery?: (prompt: string) => Promise<string>
  ) {
    super();
    this.config = { ...DEFAULT_WATCHER_CONFIG, ...config };
    this.proposalService = proposalService;
    this.analyzer = new FileAnalyzer(this.config, llmQuery);

    // Initialize destination resolver with watched directories
    const watchedPaths = this.config.directories
      .filter((d) => d.enabled)
      .map((d) => d.path);
    this.destinationResolver = new DestinationResolver(
      this.config.basePath,
      watchedPaths
    );

    // Initialize directories map
    for (const dir of this.config.directories) {
      this.directories.set(normalize(dir.path), { ...dir, addedAt: new Date() });
    }
  }

  /**
   * Set the Obsidian writer for audit logging
   */
  setObsidianWriter(writer: IObsidianWriter): void {
    this.obsidianWriter = writer;
  }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  /**
   * Start watching configured directories
   */
  async start(): Promise<void> {
    if (this.running) return;

    const enabledDirs = Array.from(this.directories.values())
      .filter((d) => d.enabled && existsSync(d.path))
      .map((d) => d.path);

    if (enabledDirs.length === 0) {
      console.warn('[WatcherService] No valid directories to watch');
      return;
    }

    // Check if any directories are WSL Windows paths (requires polling)
    const hasWslPaths = enabledDirs.some(isWslWindowsPath);
    if (hasWslPaths) {
      console.log('[WatcherService] Detected WSL Windows paths, enabling polling mode');
    }

    this.watcher = chokidar.watch(enabledDirs, {
      ignored: this.config.ignoredPatterns,
      persistent: true,
      ignoreInitial: true, // Don't emit events for existing files
      depth: 1, // Only watch immediate children by default
      awaitWriteFinish: false, // We handle stability ourselves
      // WSL2 doesn't support inotify for /mnt/c/... paths, use polling instead
      usePolling: hasWslPaths,
      interval: hasWslPaths ? 1000 : undefined,
    });

    this.watcher.on('add', (path) => this.onFileAdd(path));
    this.watcher.on('change', (path) => this.onFileChange(path));
    this.watcher.on('unlink', (path) => this.onFileRemove(path));
    this.watcher.on('error', (error) => this.emit('file:error', '', error));

    this.running = true;
    this.emit('watcher:started');
    const modeInfo = hasWslPaths ? ' (polling mode)' : '';
    console.log(`[WatcherService] Started watching ${enabledDirs.length} directories${modeInfo}`);

    // Log to Obsidian
    await this.logToObsidian('File Watcher Started', [
      'Started monitoring directories for new files:',
      ...enabledDirs.map((d) => `- \`${d}\``),
    ].join('\n'));
  }

  /**
   * Stop watching and clean up
   */
  async stop(): Promise<void> {
    if (!this.running) return;

    const watchedDirs = Array.from(this.directories.values())
      .filter((d) => d.enabled)
      .map((d) => d.path);

    // Clear all pending file timers
    for (const pending of this.pendingFiles.values()) {
      if (pending.timer) {
        clearTimeout(pending.timer);
      }
    }
    const pendingCount = this.pendingFiles.size;
    this.pendingFiles.clear();

    // Close watcher
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }

    this.running = false;
    this.emit('watcher:stopped');
    console.log('[WatcherService] Stopped');

    // Log to Obsidian
    await this.logToObsidian('File Watcher Stopped', [
      'Stopped monitoring directories.',
      `- Directories: ${watchedDirs.length}`,
      `- Pending files cleared: ${pendingCount}`,
    ].join('\n'));
  }

  /**
   * Check if the watcher is running
   */
  isRunning(): boolean {
    return this.running;
  }

  // ===========================================================================
  // Directory Management
  // ===========================================================================

  /**
   * Add a directory to the watch list
   */
  async addDirectory(
    path: string,
    options: { recursive?: boolean; enabled?: boolean } = {}
  ): Promise<void> {
    const normalizedPath = normalize(path);

    if (!existsSync(normalizedPath)) {
      throw new Error(`Directory does not exist: ${path}`);
    }

    const stats = await stat(normalizedPath);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${path}`);
    }

    if (this.directories.has(normalizedPath)) {
      throw new Error(`Directory is already being watched: ${path}`);
    }

    const dir: WatchedDirectory = {
      path: normalizedPath,
      enabled: options.enabled ?? true,
      recursive: options.recursive ?? false,
      addedAt: new Date(),
    };

    this.directories.set(normalizedPath, dir);

    // Add to watcher if running and enabled
    if (this.running && this.watcher && dir.enabled) {
      this.watcher.add(normalizedPath);
    }

    this.emit('directory:added', normalizedPath);
  }

  /**
   * Remove a directory from the watch list
   */
  async removeDirectory(path: string): Promise<void> {
    const normalizedPath = normalize(path);

    if (!this.directories.has(normalizedPath)) {
      throw new Error(`Directory is not being watched: ${path}`);
    }

    this.directories.delete(normalizedPath);

    // Remove from watcher if running
    if (this.running && this.watcher) {
      this.watcher.unwatch(normalizedPath);
    }

    this.emit('directory:removed', normalizedPath);
  }

  /**
   * Get all watched directories
   */
  getWatchedDirectories(): WatchedDirectory[] {
    return Array.from(this.directories.values());
  }

  /**
   * Get watcher configuration
   */
  getConfig(): WatcherConfig {
    return { ...this.config };
  }

  // ===========================================================================
  // Manual Scanning
  // ===========================================================================

  /**
   * Scan a directory and create proposals for all files
   *
   * Unlike the watcher, this scans existing files rather than waiting for new ones.
   * Useful for organizing files that were already in a directory.
   *
   * @param directoryPath - Directory to scan
   * @param options - Scan options
   * @returns Summary of scan results
   */
  async scanDirectory(
    directoryPath: string,
    options: { recursive?: boolean; skipExisting?: boolean } = {}
  ): Promise<{
    scanned: number;
    proposalsCreated: number;
    skipped: number;
    errors: string[];
  }> {
    const { readdir } = await import('fs/promises');
    const { join } = await import('path');

    const normalizedPath = normalize(directoryPath);

    if (!existsSync(normalizedPath)) {
      throw new Error(`Directory does not exist: ${directoryPath}`);
    }

    const stats = await stat(normalizedPath);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${directoryPath}`);
    }

    const result = {
      scanned: 0,
      proposalsCreated: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Get all files in directory
    const entries = await readdir(normalizedPath, { withFileTypes: true });

    for (const entry of entries) {
      const filePath = join(normalizedPath, entry.name);

      if (entry.isDirectory()) {
        // Recursively scan subdirectories if requested
        if (options.recursive) {
          try {
            const subResult = await this.scanDirectory(filePath, options);
            result.scanned += subResult.scanned;
            result.proposalsCreated += subResult.proposalsCreated;
            result.skipped += subResult.skipped;
            result.errors.push(...subResult.errors);
          } catch (error) {
            result.errors.push(
              `Failed to scan ${filePath}: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
        continue;
      }

      if (!entry.isFile()) {
        continue; // Skip symlinks, etc.
      }

      result.scanned++;

      // Check if file should be ignored
      if (this.shouldIgnore(filePath)) {
        result.skipped++;
        continue;
      }

      // Check if there's already a pending proposal for this file
      if (options.skipExisting !== false && this.proposalService.hasPendingForPath(filePath)) {
        result.skipped++;
        continue;
      }

      // Check if file is on cooldown
      if (this.proposalService.isOnCooldown(filePath)) {
        result.skipped++;
        continue;
      }

      try {
        // Analyze the file
        const analysis = await this.analyzer.analyze(
          filePath,
          this.destinationResolver.createResolveFunction()
        );

        // Create proposal
        await this.proposalService.createFromAnalysis(analysis);
        result.proposalsCreated++;
      } catch (error) {
        result.errors.push(
          `Failed to analyze ${entry.name}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return result;
  }

  /**
   * Update configuration (requires restart to take effect)
   */
  updateConfig(updates: Partial<WatcherConfig>): void {
    Object.assign(this.config, updates);
  }

  // ===========================================================================
  // File Event Handlers
  // ===========================================================================

  /**
   * Check if a file should be ignored based on configured patterns
   */
  private shouldIgnore(filePath: string): boolean {
    const filename = filePath.split('/').pop() || filePath;
    return this.config.ignoredPatterns.some((pattern) => pattern.test(filename));
  }

  /**
   * Handle new file detected
   */
  private onFileAdd(filePath: string): void {
    this.handleFileEvent(filePath);
  }

  /**
   * Handle file change
   */
  private onFileChange(filePath: string): void {
    this.handleFileEvent(filePath);
  }

  /**
   * Handle file removal
   */
  private onFileRemove(filePath: string): void {
    // Cancel pending analysis if file is removed
    const pending = this.pendingFiles.get(filePath);
    if (pending?.timer) {
      clearTimeout(pending.timer);
      this.pendingFiles.delete(filePath);
    }

    // Auto-invalidate any pending proposal for this file (T091)
    const proposal = this.proposalService.getBySourcePath(filePath);
    if (proposal && proposal.status === 'pending') {
      this.proposalService.invalidate(proposal.id, 'Source file was deleted');
    }
  }

  /**
   * Handle file add/change events with stability detection
   */
  private async handleFileEvent(filePath: string): Promise<void> {
    try {
      const stats = await stat(filePath);

      // Skip directories
      if (stats.isDirectory()) return;

      // Check if we should skip this file (pending proposal or cooldown)
      if (this.proposalService.hasPendingForPath(filePath)) {
        return; // Already have a pending proposal
      }
      if (this.proposalService.isOnCooldown(filePath)) {
        return; // Recently rejected
      }

      this.emit('file:detected', filePath, {
        size: stats.size,
        mtimeMs: stats.mtimeMs,
      });

      const pending = this.pendingFiles.get(filePath);

      if (!pending) {
        // First detection - start tracking
        this.pendingFiles.set(filePath, {
          path: filePath,
          lastSize: stats.size,
          lastMtime: stats.mtimeMs,
          firstDetected: Date.now(),
        });
        this.scheduleStabilityCheck(filePath);
        return;
      }

      // Check if file has changed
      if (stats.size !== pending.lastSize || stats.mtimeMs !== pending.lastMtime) {
        // File changed - reset stability timer
        pending.lastSize = stats.size;
        pending.lastMtime = stats.mtimeMs;

        if (pending.timer) {
          clearTimeout(pending.timer);
        }

        // Check max wait time
        const elapsed = Date.now() - pending.firstDetected;
        if (elapsed > this.config.maxStabilityWaitMs) {
          // Too long - analyze anyway
          await this.onFileStable(filePath);
        } else {
          this.scheduleStabilityCheck(filePath);
        }
      }
    } catch (error) {
      this.emit(
        'file:error',
        filePath,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Schedule a stability check
   */
  private scheduleStabilityCheck(filePath: string): void {
    const pending = this.pendingFiles.get(filePath);
    if (!pending) return;

    pending.timer = setTimeout(async () => {
      await this.checkStability(filePath);
    }, this.config.stabilityDelayMs);
  }

  /**
   * Check if a file is stable (no changes since last check)
   */
  private async checkStability(filePath: string): Promise<void> {
    const pending = this.pendingFiles.get(filePath);
    if (!pending) return;

    try {
      if (!existsSync(filePath)) {
        // File was removed
        this.pendingFiles.delete(filePath);
        return;
      }

      const stats = await stat(filePath);

      if (
        stats.size === pending.lastSize &&
        stats.mtimeMs === pending.lastMtime
      ) {
        // File is stable - proceed with analysis
        await this.onFileStable(filePath);
      }
      // If not stable, another change event will have scheduled a new check
    } catch {
      // File may have been removed
      this.pendingFiles.delete(filePath);
    }
  }

  /**
   * Handle file that has been stable (no changes)
   */
  private async onFileStable(filePath: string): Promise<void> {
    // Remove from pending
    this.pendingFiles.delete(filePath);

    this.emit('file:stable', filePath);

    try {
      // Analyze the file
      const analysis = await this.analyzer.analyze(
        filePath,
        this.destinationResolver.createResolveFunction()
      );

      this.emit('file:analyzed', analysis);

      // Create proposal
      await this.proposalService.createFromAnalysis(analysis);
    } catch (error) {
      this.emit(
        'file:error',
        filePath,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Log an event to Obsidian daily log
   */
  private async logToObsidian(title: string, activity: string): Promise<void> {
    if (!this.obsidianWriter) return;

    try {
      await this.obsidianWriter.writeDaily({ title, activity });
    } catch (error) {
      // Log but don't fail the operation
      console.error('[WatcherService] Failed to log to Obsidian:', error);
    }
  }
}

/**
 * Create a new WatcherService instance
 */
export function createWatcherService(
  config: Partial<WatcherConfig>,
  proposalService: ProposalService,
  llmQuery?: (prompt: string) => Promise<string>
): WatcherService {
  return new WatcherService(config, proposalService, llmQuery);
}
