/**
 * Conversation Store
 *
 * Feature: 005-conversation-persistence
 * Date: 2025-12-13
 *
 * JSON persistence layer for conversations.
 * Uses atomic writes and separate index for fast listing.
 */

import { readFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import writeFileAtomic from 'write-file-atomic';
import type {
  ConversationIndex,
  ConversationMetadata,
  SerializedConversation,
  ConversationStoreConfig,
  IConversationStore,
  LockResult,
  ConversationLock,
} from './conversation.types.js';
import { extractMetadata } from './conversation.types.js';
import { ConversationLockManager } from './conversation.lock.js';

// =============================================================================
// Constants
// =============================================================================

/** Current schema version */
const SCHEMA_VERSION = 1;

/** Index filename */
const INDEX_FILE = 'index.json';

// =============================================================================
// ConversationStore Class
// =============================================================================

/**
 * Persists conversations to JSON files with atomic writes
 * Uses separate index for fast listing (O(1) metadata access)
 */
export class ConversationStore implements IConversationStore {
  private readonly config: ConversationStoreConfig;
  private readonly indexPath: string;
  private readonly lockManager: ConversationLockManager;

  constructor(config: ConversationStoreConfig) {
    this.config = config;
    this.indexPath = join(config.storagePath, INDEX_FILE);
    this.lockManager = new ConversationLockManager(config.storagePath);
  }

  /**
   * Get path to a conversation file
   */
  private getConversationPath(id: string): string {
    return join(this.config.storagePath, `${id}.json`);
  }

  /**
   * Ensure storage directory exists
   */
  private async ensureStorageDir(): Promise<void> {
    if (!existsSync(this.config.storagePath)) {
      await mkdir(this.config.storagePath, { recursive: true });
    }
  }

  /**
   * Create empty index
   */
  private emptyIndex(): ConversationIndex {
    return {
      version: SCHEMA_VERSION,
      lastModified: new Date().toISOString(),
      conversations: [],
    };
  }

  /**
   * Load the conversation index
   * Creates empty index if none exists or if corrupted (FR-017)
   */
  async loadIndex(): Promise<ConversationIndex> {
    try {
      if (!existsSync(this.indexPath)) {
        return this.emptyIndex();
      }

      const content = await readFile(this.indexPath, 'utf-8');
      const data = JSON.parse(content) as ConversationIndex;

      // Validate version
      if (typeof data.version !== 'number' || data.version > SCHEMA_VERSION) {
        console.warn(
          `[ConversationStore] Unknown index version ${data.version}, starting fresh`
        );
        return this.emptyIndex();
      }

      // Validate structure
      if (!Array.isArray(data.conversations)) {
        console.warn('[ConversationStore] Invalid conversations array, starting fresh');
        return this.emptyIndex();
      }

      return data;
    } catch (error) {
      // Log warning but don't throw - graceful degradation (FR-017)
      console.warn(
        `[ConversationStore] Failed to load index: ${error instanceof Error ? error.message : 'Unknown error'}. Starting fresh.`
      );
      return this.emptyIndex();
    }
  }

  /**
   * Save the conversation index atomically
   */
  async saveIndex(index: ConversationIndex): Promise<void> {
    await this.ensureStorageDir();

    const toSave: ConversationIndex = {
      ...index,
      lastModified: new Date().toISOString(),
    };

    const content = JSON.stringify(toSave, null, 2);
    await writeFileAtomic(this.indexPath, content, { encoding: 'utf-8' });
  }

  /**
   * Load a single conversation by ID
   * Returns null if not found or corrupted
   */
  async loadConversation(id: string): Promise<SerializedConversation | null> {
    const filePath = this.getConversationPath(id);

    if (!existsSync(filePath)) {
      return null;
    }

    try {
      const content = await readFile(filePath, 'utf-8');
      const data = JSON.parse(content) as SerializedConversation;

      // Basic validation
      if (!data.id || !Array.isArray(data.messages)) {
        console.warn(`[ConversationStore] Invalid conversation file: ${id}`);
        return null;
      }

      return data;
    } catch (error) {
      console.warn(
        `[ConversationStore] Failed to load conversation ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return null;
    }
  }

  /**
   * Save a conversation atomically
   * Updates both the conversation file and index
   */
  async saveConversation(conversation: SerializedConversation): Promise<void> {
    await this.ensureStorageDir();

    // Save conversation file
    const filePath = this.getConversationPath(conversation.id);
    const content = JSON.stringify(conversation, null, 2);
    await writeFileAtomic(filePath, content, { encoding: 'utf-8' });

    // Update index
    const index = await this.loadIndex();
    const metadata = extractMetadata(conversation);

    // Find existing entry or add new one
    const existingIndex = index.conversations.findIndex((c) => c.id === conversation.id);
    if (existingIndex >= 0) {
      index.conversations[existingIndex] = metadata;
    } else {
      index.conversations.push(metadata);
    }

    // Sort by lastActivity descending
    index.conversations.sort((a, b) =>
      new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );

    await this.saveIndex(index);
  }

  /**
   * List all conversation metadata
   * Returns metadata sorted by lastActivity descending
   */
  async list(): Promise<ConversationMetadata[]> {
    const index = await this.loadIndex();
    // Already sorted by lastActivity in saveConversation, but ensure order
    return index.conversations.sort((a, b) =>
      new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );
  }

  /**
   * Delete a conversation by ID
   * Removes conversation file and updates index
   */
  async delete(id: string): Promise<boolean> {
    const filePath = this.getConversationPath(id);

    // Check if exists
    if (!existsSync(filePath)) {
      return false;
    }

    try {
      // Remove file
      await unlink(filePath);

      // Update index
      const index = await this.loadIndex();
      index.conversations = index.conversations.filter((c) => c.id !== id);
      await this.saveIndex(index);

      return true;
    } catch (error) {
      console.error(
        `[ConversationStore] Failed to delete conversation ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return false;
    }
  }

  /**
   * Run cleanup based on maxConversations and retentionDays
   * Returns count of removed conversations
   */
  async cleanup(): Promise<number> {
    const index = await this.loadIndex();
    const now = new Date();
    const retentionMs = this.config.retentionDays * 24 * 60 * 60 * 1000;
    let removedCount = 0;

    // Sort by lastActivity descending (newest first)
    const sorted = [...index.conversations].sort((a, b) =>
      new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );

    const toKeep: ConversationMetadata[] = [];
    const toRemove: string[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const conv = sorted[i];
      const age = now.getTime() - new Date(conv.lastActivity).getTime();

      // Check age-based cleanup (FR-015)
      if (age > retentionMs) {
        toRemove.push(conv.id);
        continue;
      }

      // Check count-based cleanup (FR-014)
      if (toKeep.length >= this.config.maxConversations) {
        toRemove.push(conv.id);
        continue;
      }

      toKeep.push(conv);
    }

    // Remove files
    for (const id of toRemove) {
      const filePath = this.getConversationPath(id);
      try {
        if (existsSync(filePath)) {
          await unlink(filePath);
          removedCount++;
        }
      } catch {
        // Ignore errors removing individual files
      }
    }

    // Update index if anything was removed
    if (removedCount > 0) {
      index.conversations = toKeep;
      await this.saveIndex(index);
      console.log(`[ConversationStore] Cleaned up ${removedCount} old conversation(s)`);
    }

    return removedCount;
  }

  /**
   * Attempt to acquire lock on a conversation
   */
  async acquireLock(conversationId: string): Promise<LockResult> {
    return this.lockManager.acquireLock(conversationId);
  }

  /**
   * Release lock on a conversation
   */
  async releaseLock(conversationId: string): Promise<void> {
    return this.lockManager.releaseLock(conversationId);
  }

  /**
   * Check if a conversation is locked
   */
  async isLocked(conversationId: string): Promise<ConversationLock | null> {
    return this.lockManager.isLocked(conversationId);
  }
}

/**
 * Create a new ConversationStore instance
 */
export function createConversationStore(config: ConversationStoreConfig): ConversationStore {
  return new ConversationStore(config);
}
