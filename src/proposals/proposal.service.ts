/**
 * Proposal Service
 *
 * Feature: 003-file-watcher-proposals
 * Date: 2025-12-11
 *
 * Manages proposal lifecycle, persistence, and file operations.
 * Implements human-in-the-loop pattern for file organization.
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { rename, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, normalize } from 'path';
import type {
  Proposal,
  ProposalStatus,
  ApproveResult,
  RejectResult,
  BatchApproveResult,
} from './proposal.types.js';
import type { FileAnalysis, WatcherConfig } from '../types/watcher.js';
import type { IObsidianWriter } from '../types/obsidian.js';
import {
  ProposalStore,
  serializeProposal,
  deserializeProposal,
  cleanExpiredCooldowns,
  cleanResolvedProposals,
  type StoreData,
} from './proposal.store.js';

// =============================================================================
// ProposalService Class
// =============================================================================

/**
 * Service for managing file organization proposals
 *
 * Events:
 * - proposal:created - When a new proposal is created
 * - proposal:approved - When a proposal is approved and executed
 * - proposal:rejected - When a proposal is rejected
 * - proposal:invalidated - When a proposal becomes invalid
 */
export class ProposalService extends EventEmitter {
  private readonly store: ProposalStore;
  private readonly config: Pick<WatcherConfig, 'cooldownHours'>;
  private obsidianWriter?: IObsidianWriter;

  // In-memory state
  private proposals: Map<string, Proposal> = new Map();
  private pendingByPath: Map<string, string> = new Map(); // sourcePath → proposalId
  private cooldowns: Map<string, Date> = new Map(); // sourcePath → expiry

  private initialized = false;

  constructor(
    storePath: string,
    config: Pick<WatcherConfig, 'cooldownHours'> = { cooldownHours: 24 }
  ) {
    super();
    this.store = new ProposalStore(storePath);
    this.config = config;
  }

  /**
   * Set the Obsidian writer for audit logging
   */
  setObsidianWriter(writer: IObsidianWriter): void {
    this.obsidianWriter = writer;
  }

  /**
   * Register signal handlers for graceful shutdown (T095)
   *
   * Saves state on SIGTERM/SIGINT to prevent data loss.
   * Call this during application startup.
   */
  registerSignalHandlers(): void {
    const handleShutdown = async (signal: string) => {
      console.log(`[ProposalService] Received ${signal}, saving state...`);
      try {
        await this.save();
        console.log('[ProposalService] State saved successfully');
      } catch (error) {
        console.error('[ProposalService] Failed to save state:', error);
      }
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  /**
   * Initialize service by loading state from disk
   *
   * Also cleans up expired cooldowns and old resolved proposals.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    let data = await this.store.load();

    // Clean up expired cooldowns and any orphaned resolved proposals
    const originalCount = data.proposals.length;
    data = cleanExpiredCooldowns(data);
    data = cleanResolvedProposals(data, 0); // Remove any resolved proposals (crash recovery)

    // Save if cleanup removed anything
    if (data.proposals.length < originalCount) {
      await this.store.save(data);
    }

    this.loadFromStoreData(data);
    this.initialized = true;
  }

  /**
   * Shutdown service and save state
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) return;

    await this.save();
    this.initialized = false;
  }

  /**
   * Save current state to disk
   */
  async save(): Promise<void> {
    const data = this.toStoreData();
    await this.store.save(data);
  }

  // ===========================================================================
  // Proposal Creation
  // ===========================================================================

  /**
   * Create a proposal from file analysis
   *
   * Returns the created proposal, or null if:
   * - A pending proposal already exists for this path
   * - The path is on cooldown (recently rejected)
   */
  async createFromAnalysis(analysis: FileAnalysis): Promise<Proposal | null> {
    const normalizedPath = normalize(analysis.path);

    // Check for existing pending proposal
    if (this.hasPendingForPath(normalizedPath)) {
      return null;
    }

    // Check cooldown
    if (this.isOnCooldown(normalizedPath)) {
      return null;
    }

    const proposal: Proposal = {
      id: randomUUID(),
      createdAt: new Date(),
      sourcePath: analysis.path,
      sourceFilename: analysis.filename,
      sourceSize: analysis.size,
      sourceMtime: analysis.mtime,
      action: this.determineAction(analysis),
      destinationPath: analysis.suggestedDestination,
      category: analysis.suggestedCategory,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning,
      sensitive: analysis.sensitive,
      sensitiveReason: analysis.sensitiveReason,
      status: 'pending',
    };

    // Store proposal
    this.proposals.set(proposal.id, proposal);
    this.pendingByPath.set(normalizedPath, proposal.id);

    // Persist
    await this.save();

    // Emit event
    this.emit('proposal:created', proposal);

    return proposal;
  }

  // ===========================================================================
  // Query Methods
  // ===========================================================================

  /**
   * Get all proposals
   */
  getAll(): Proposal[] {
    return Array.from(this.proposals.values());
  }

  /**
   * Get pending proposals
   */
  getPending(): Proposal[] {
    return this.getAll().filter((p) => p.status === 'pending');
  }

  /**
   * Get proposals by status
   */
  getByStatus(status: ProposalStatus): Proposal[] {
    return this.getAll().filter((p) => p.status === status);
  }

  /**
   * Get proposal by ID
   */
  getById(id: string): Proposal | undefined {
    return this.proposals.get(id);
  }

  /**
   * Get proposal by source path
   */
  getBySourcePath(path: string): Proposal | undefined {
    const normalizedPath = normalize(path);
    const id = this.pendingByPath.get(normalizedPath);
    return id ? this.proposals.get(id) : undefined;
  }

  /**
   * Check if there's a pending proposal for a path
   */
  hasPendingForPath(path: string): boolean {
    const normalizedPath = normalize(path);
    return this.pendingByPath.has(normalizedPath);
  }

  /**
   * Check if a path is on cooldown (recently rejected)
   */
  isOnCooldown(path: string): boolean {
    const normalizedPath = normalize(path);
    const expiry = this.cooldowns.get(normalizedPath);

    if (!expiry) return false;

    if (expiry > new Date()) {
      return true;
    }

    // Cooldown expired - remove it
    this.cooldowns.delete(normalizedPath);
    return false;
  }

  // ===========================================================================
  // Proposal Actions
  // ===========================================================================

  /**
   * Approve a proposal and execute the file operation
   *
   * @param id - Proposal ID
   * @param confirmSensitive - Must be true for sensitive proposals
   */
  async approve(id: string, confirmSensitive = false): Promise<ApproveResult> {
    const proposal = this.proposals.get(id);

    if (!proposal) {
      return { success: false, error: `Proposal '${id}' not found` };
    }

    if (proposal.status !== 'pending') {
      return {
        success: false,
        error: `Proposal already ${proposal.status}`,
      };
    }

    // Check sensitive confirmation
    if (proposal.sensitive && !confirmSensitive) {
      return {
        success: false,
        error: 'This proposal is flagged as sensitive. Set confirmSensitive to true.',
      };
    }

    // Verify source file still exists
    if (!existsSync(proposal.sourcePath)) {
      this.invalidate(id, 'Source file no longer exists');
      return {
        success: false,
        error: 'Source file no longer exists',
      };
    }

    // Check destination doesn't already exist
    if (existsSync(proposal.destinationPath)) {
      return {
        success: false,
        error: 'Destination file already exists',
      };
    }

    try {
      // Create destination directory if needed
      const destDir = dirname(proposal.destinationPath);
      if (!existsSync(destDir)) {
        await mkdir(destDir, { recursive: true });
      }

      // Execute file move
      await rename(proposal.sourcePath, proposal.destinationPath);

      // Update proposal
      proposal.status = 'approved';
      proposal.resolvedAt = new Date();

      // Remove from pending index
      this.pendingByPath.delete(normalize(proposal.sourcePath));

      // Persist
      await this.save();

      const result: ApproveResult = {
        success: true,
        sourcePath: proposal.sourcePath,
        destinationPath: proposal.destinationPath,
      };

      // Emit event
      this.emit('proposal:approved', proposal, result);

      // Log to Obsidian if writer is configured
      await this.logApprovalToObsidian(proposal);

      // Remove from store - no need to keep after logging
      this.proposals.delete(id);
      await this.save();

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      proposal.executionError = errorMessage;
      await this.save();

      return {
        success: false,
        error: `Failed to move file: ${errorMessage}`,
      };
    }
  }

  /**
   * Reject a proposal and add cooldown
   *
   * @param id - Proposal ID
   * @param reason - Optional reason for rejection
   */
  async reject(id: string, reason?: string): Promise<RejectResult> {
    const proposal = this.proposals.get(id);

    if (!proposal) {
      return { success: false, error: `Proposal '${id}' not found` };
    }

    if (proposal.status !== 'pending') {
      return {
        success: false,
        error: `Proposal already ${proposal.status}`,
      };
    }

    // Update proposal
    proposal.status = 'rejected';
    proposal.resolvedAt = new Date();

    // Remove from pending index
    const normalizedPath = normalize(proposal.sourcePath);
    this.pendingByPath.delete(normalizedPath);

    // Add to cooldown
    const cooldownUntil = new Date();
    cooldownUntil.setHours(cooldownUntil.getHours() + this.config.cooldownHours);
    this.cooldowns.set(normalizedPath, cooldownUntil);

    // Persist
    await this.save();

    // Emit event
    this.emit('proposal:rejected', proposal);

    // Log to Obsidian if writer is configured
    await this.logRejectionToObsidian(proposal, reason);

    // Remove from store - no need to keep after logging
    this.proposals.delete(id);
    await this.save();

    return {
      success: true,
      cooldownUntil,
    };
  }

  /**
   * Invalidate a proposal (source file changed/deleted)
   */
  invalidate(id: string, reason: string): void {
    const proposal = this.proposals.get(id);

    if (!proposal || proposal.status !== 'pending') {
      return;
    }

    // Remove from pending index
    this.pendingByPath.delete(normalize(proposal.sourcePath));

    // Emit event (before deletion so listeners can access proposal data)
    this.emit('proposal:invalidated', proposal, reason);

    // Remove from store - no need to keep invalidated proposals
    this.proposals.delete(id);
  }

  /**
   * Clear all pending proposals without executing
   */
  clearAllPending(): number {
    const pending = this.getPending();

    for (const proposal of pending) {
      this.pendingByPath.delete(normalize(proposal.sourcePath));
      this.proposals.delete(proposal.id);
    }

    return pending.length;
  }

  /**
   * Approve all pending proposals
   *
   * @param includeSensitive - Also approve sensitive proposals
   */
  async approveAll(includeSensitive = false): Promise<BatchApproveResult> {
    const pending = this.getPending();
    const result: BatchApproveResult = {
      approved: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    for (const proposal of pending) {
      // Skip sensitive unless explicitly included
      if (proposal.sensitive && !includeSensitive) {
        result.skipped++;
        continue;
      }

      const approveResult = await this.approve(proposal.id, true);

      if (approveResult.success) {
        result.approved++;
      } else {
        result.failed++;
        if (approveResult.error) {
          result.errors.push(`${proposal.sourceFilename}: ${approveResult.error}`);
        }
      }
    }

    return result;
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  /**
   * Determine action type from analysis
   */
  private determineAction(
    analysis: FileAnalysis
  ): 'move' | 'rename' | 'move_and_rename' {
    const sourcePath = normalize(analysis.path);
    const destPath = normalize(analysis.suggestedDestination);
    const sourceDir = dirname(sourcePath);
    const destDir = dirname(destPath);

    // Same directory = rename only
    if (sourceDir === destDir) {
      return 'rename';
    }

    // Different directory with same filename = move only
    if (analysis.filename === destPath.split('/').pop()) {
      return 'move';
    }

    // Different directory and different filename
    return 'move_and_rename';
  }

  /**
   * Load state from store data
   */
  private loadFromStoreData(data: StoreData): void {
    this.proposals.clear();
    this.pendingByPath.clear();
    this.cooldowns.clear();

    // Load proposals
    for (const serialized of data.proposals) {
      const proposal = deserializeProposal(serialized);
      this.proposals.set(proposal.id, proposal);

      // Index pending proposals
      if (proposal.status === 'pending') {
        this.pendingByPath.set(normalize(proposal.sourcePath), proposal.id);
      }
    }

    // Load cooldowns
    for (const [path, dateStr] of Object.entries(data.cooldowns)) {
      const expiry = new Date(dateStr);
      if (expiry > new Date()) {
        this.cooldowns.set(normalize(path), expiry);
      }
    }
  }

  /**
   * Convert current state to store data
   */
  private toStoreData(): StoreData {
    const proposals = Array.from(this.proposals.values()).map(serializeProposal);

    const cooldowns: Record<string, string> = {};
    for (const [path, expiry] of this.cooldowns.entries()) {
      if (expiry > new Date()) {
        cooldowns[path] = expiry.toISOString();
      }
    }

    return {
      version: 1,
      lastModified: new Date().toISOString(),
      proposals,
      cooldowns,
    };
  }

  /**
   * Log proposal approval to Obsidian daily log
   */
  private async logApprovalToObsidian(proposal: Proposal): Promise<void> {
    if (!this.obsidianWriter) return;

    try {
      await this.obsidianWriter.writeDaily({
        title: 'File Organization Approved',
        activity: [
          `**Approved**: Move \`${proposal.sourceFilename}\``,
          `- From: \`${proposal.sourcePath}\``,
          `- To: \`${proposal.destinationPath}\``,
          `- Category: ${proposal.category}`,
          `- Confidence: ${proposal.confidence}`,
          proposal.sensitive ? `- **Sensitive file**` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      });
    } catch (error) {
      // Log but don't fail the approval
      console.error('[ProposalService] Failed to log approval to Obsidian:', error);
    }
  }

  /**
   * Log proposal rejection to Obsidian daily log
   */
  private async logRejectionToObsidian(
    proposal: Proposal,
    reason?: string
  ): Promise<void> {
    if (!this.obsidianWriter) return;

    try {
      await this.obsidianWriter.writeDaily({
        title: 'File Organization Rejected',
        activity: [
          `**Rejected**: Move \`${proposal.sourceFilename}\``,
          `- Proposed destination: \`${proposal.destinationPath}\``,
          `- Category: ${proposal.category}`,
          reason ? `- Reason: ${reason}` : '',
          `- Cooldown: ${this.config.cooldownHours} hours`,
        ]
          .filter(Boolean)
          .join('\n'),
      });
    } catch (error) {
      // Log but don't fail the rejection
      console.error('[ProposalService] Failed to log rejection to Obsidian:', error);
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new ProposalService instance
 */
export function createProposalService(
  storePath: string,
  config?: Pick<WatcherConfig, 'cooldownHours'>
): ProposalService {
  return new ProposalService(storePath, config);
}
