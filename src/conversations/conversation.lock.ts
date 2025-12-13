/**
 * Conversation Lock Management
 *
 * Feature: 005-conversation-persistence
 * Date: 2025-12-13
 *
 * File-based locking to prevent concurrent access to conversations.
 * Uses PID-based stale lock detection.
 */

import { readFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { hostname } from 'os';
import writeFileAtomic from 'write-file-atomic';
import type { ConversationLock, LockResult } from './conversation.types.js';

// =============================================================================
// Lock Manager
// =============================================================================

/**
 * Manages file-based locks for conversations
 */
export class ConversationLockManager {
  private readonly locksDir: string;

  constructor(storageBasePath: string) {
    this.locksDir = join(storageBasePath, 'locks');
  }

  /**
   * Get the path to a lock file
   */
  private getLockPath(conversationId: string): string {
    return join(this.locksDir, `${conversationId}.lock`);
  }

  /**
   * Check if a process is still running
   */
  private isProcessAlive(pid: number): boolean {
    try {
      // Signal 0 doesn't kill the process, just checks if it exists
      process.kill(pid, 0);
      return true;
    } catch {
      // Process doesn't exist
      return false;
    }
  }

  /**
   * Acquire a lock on a conversation
   *
   * Returns success if lock acquired, or holder info if already locked
   */
  async acquireLock(conversationId: string): Promise<LockResult> {
    const lockPath = this.getLockPath(conversationId);

    // Check existing lock
    const existingLock = await this.readLock(conversationId);
    if (existingLock) {
      // Check if the process is still alive
      if (this.isProcessAlive(existingLock.pid)) {
        // Lock is held by an active process
        return {
          success: false,
          holder: {
            pid: existingLock.pid,
            hostname: existingLock.hostname,
            acquiredAt: new Date(existingLock.acquiredAt),
          },
        };
      }

      // Lock is stale - remove it
      console.warn(
        `[ConversationLock] Removing stale lock for ${conversationId} (PID ${existingLock.pid} no longer running)`
      );
      await this.removeLock(lockPath);
    }

    // Ensure locks directory exists
    if (!existsSync(this.locksDir)) {
      await mkdir(this.locksDir, { recursive: true });
    }

    // Create new lock
    const lock: ConversationLock = {
      conversationId,
      pid: process.pid,
      hostname: hostname(),
      acquiredAt: new Date().toISOString(),
    };

    try {
      await writeFileAtomic(lockPath, JSON.stringify(lock, null, 2), {
        encoding: 'utf-8',
      });
      return { success: true };
    } catch (error) {
      console.error(
        `[ConversationLock] Failed to acquire lock: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return { success: false };
    }
  }

  /**
   * Release a lock on a conversation
   */
  async releaseLock(conversationId: string): Promise<void> {
    const lockPath = this.getLockPath(conversationId);

    // Only release if we own the lock
    const existingLock = await this.readLock(conversationId);
    if (existingLock && existingLock.pid === process.pid) {
      await this.removeLock(lockPath);
    }
  }

  /**
   * Check if a conversation is locked
   *
   * Returns the lock info if locked (and not stale), null otherwise
   */
  async isLocked(conversationId: string): Promise<ConversationLock | null> {
    const lock = await this.readLock(conversationId);
    if (!lock) {
      return null;
    }

    // Check if the lock is stale
    if (!this.isProcessAlive(lock.pid)) {
      // Lock is stale - clean it up
      const lockPath = this.getLockPath(conversationId);
      await this.removeLock(lockPath);
      return null;
    }

    return lock;
  }

  /**
   * Check if lock is stale (process no longer running)
   */
  isLockStale(lock: ConversationLock): boolean {
    return !this.isProcessAlive(lock.pid);
  }

  /**
   * Read a lock file
   */
  private async readLock(conversationId: string): Promise<ConversationLock | null> {
    const lockPath = this.getLockPath(conversationId);

    if (!existsSync(lockPath)) {
      return null;
    }

    try {
      const content = await readFile(lockPath, 'utf-8');
      return JSON.parse(content) as ConversationLock;
    } catch {
      // Corrupted lock file - treat as no lock
      return null;
    }
  }

  /**
   * Remove a lock file
   */
  private async removeLock(lockPath: string): Promise<void> {
    try {
      if (existsSync(lockPath)) {
        await unlink(lockPath);
      }
    } catch {
      // Ignore errors removing lock
    }
  }
}

/**
 * Create a new lock manager
 */
export function createLockManager(storageBasePath: string): ConversationLockManager {
  return new ConversationLockManager(storageBasePath);
}
