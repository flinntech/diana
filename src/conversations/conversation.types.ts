/**
 * Conversation Persistence - Type Definitions
 *
 * Feature: 005-conversation-persistence
 * Date: 2025-12-13
 *
 * Type definitions for conversation persistence.
 * Based on contracts/conversation.types.ts
 */

import type { Message, MessageRole } from '../types/agent.js';

// =============================================================================
// Serialization Types
// =============================================================================

/**
 * Tool call serialized for JSON storage
 * Arguments stored as string to preserve exact serialization
 */
export interface SerializedToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string, not parsed object
  };
}

/**
 * Message serialized for JSON storage
 * Matches Message interface but with serialized tool calls
 */
export interface SerializedMessage {
  role: MessageRole;
  content: string;
  toolCalls?: SerializedToolCall[];
  toolCallId?: string;
  name?: string;
}

/**
 * Lightweight conversation metadata for listing
 * Stored in index.json for fast access without loading full conversations
 */
export interface ConversationMetadata {
  /** UUID identifying the conversation */
  id: string;

  /** LLM-generated title (max 50 chars) */
  title: string;

  /** LLM-generated summary (2-4 sentences) */
  summary: string;

  /** ISO 8601 timestamp when conversation began */
  startedAt: string;

  /** ISO 8601 timestamp of last message */
  lastActivity: string;

  /** Count of user + assistant messages (excludes system/tool) */
  messageCount: number;
}

/**
 * Full conversation data for persistence
 * Stored as individual {id}.json files
 */
export interface SerializedConversation {
  /** UUID identifying the conversation */
  id: string;

  /** LLM-generated title */
  title: string;

  /** LLM-generated summary */
  summary: string;

  /** ISO 8601 timestamp when conversation began */
  startedAt: string;

  /** ISO 8601 timestamp of last message */
  lastActivity: string;

  /** All messages in order */
  messages: SerializedMessage[];

  /** Approximate token count */
  tokenEstimate: number;

  /** Message index where summarization occurred (if any) */
  summarizedAt?: number;
}

/**
 * Root structure of index.json
 */
export interface ConversationIndex {
  /** Schema version for migration support */
  version: number;

  /** ISO 8601 timestamp of last index update */
  lastModified: string;

  /** Metadata for all conversations */
  conversations: ConversationMetadata[];
}

/**
 * Lock file contents for concurrent access control
 */
export interface ConversationLock {
  /** UUID of locked conversation */
  conversationId: string;

  /** Process ID holding the lock */
  pid: number;

  /** Machine hostname */
  hostname: string;

  /** ISO 8601 timestamp when lock acquired */
  acquiredAt: string;
}

// =============================================================================
// Store Interface
// =============================================================================

/**
 * Configuration for ConversationStore
 */
export interface ConversationStoreConfig {
  /** Base directory for conversation storage (default: ~/.diana/conversations) */
  storagePath: string;

  /** Maximum number of conversations to keep (default: 100) */
  maxConversations: number;

  /** Days to keep conversations before cleanup (default: 30) */
  retentionDays: number;
}

/**
 * Result of attempting to acquire a lock
 */
export interface LockResult {
  /** Whether lock was successfully acquired */
  success: boolean;

  /** If failed, details about the current lock holder */
  holder?: {
    pid: number;
    hostname: string;
    acquiredAt: Date;
  };
}

/**
 * ConversationStore interface
 * Manages persistence of conversations with atomic writes
 */
export interface IConversationStore {
  /**
   * Load the conversation index
   * Creates empty index if none exists
   */
  loadIndex(): Promise<ConversationIndex>;

  /**
   * Save the conversation index atomically
   */
  saveIndex(index: ConversationIndex): Promise<void>;

  /**
   * Load a single conversation by ID
   * Returns null if not found or corrupted
   */
  loadConversation(id: string): Promise<SerializedConversation | null>;

  /**
   * Save a conversation atomically
   * Updates both the conversation file and index
   */
  saveConversation(conversation: SerializedConversation): Promise<void>;

  /**
   * List all conversation metadata
   * Returns metadata sorted by lastActivity descending
   */
  list(): Promise<ConversationMetadata[]>;

  /**
   * Delete a conversation by ID
   * Removes conversation file and updates index
   */
  delete(id: string): Promise<boolean>;

  /**
   * Run cleanup based on maxConversations and retentionDays
   * Called automatically on store initialization
   */
  cleanup(): Promise<number>; // Returns count of removed conversations

  /**
   * Attempt to acquire lock on a conversation
   */
  acquireLock(conversationId: string): Promise<LockResult>;

  /**
   * Release lock on a conversation
   */
  releaseLock(conversationId: string): Promise<void>;

  /**
   * Check if a conversation is locked
   */
  isLocked(conversationId: string): Promise<ConversationLock | null>;
}

// =============================================================================
// Session Integration Types
// =============================================================================

/**
 * Extended session options for conversation persistence
 */
export interface ConversationSessionOptions {
  /** Conversation store instance */
  conversationStore?: IConversationStore;

  /** ID of conversation to resume (if any) */
  resumeConversationId?: string;
}

/**
 * Result of generating title and summary
 */
export interface TitleSummaryResult {
  /** Generated title (max 50 chars) */
  title: string;

  /** Generated summary (2-4 sentences) */
  summary: string;
}

// =============================================================================
// Serialization Helpers
// =============================================================================

/**
 * Convert runtime Message to SerializedMessage
 */
export function serializeMessage(message: Message): SerializedMessage {
  const serialized: SerializedMessage = {
    role: message.role,
    content: message.content,
  };

  if (message.toolCalls) {
    serialized.toolCalls = message.toolCalls.map((tc) => ({
      id: tc.id,
      type: tc.type,
      function: {
        name: tc.function.name,
        arguments:
          typeof tc.function.arguments === 'string'
            ? tc.function.arguments
            : JSON.stringify(tc.function.arguments),
      },
    }));
  }

  if (message.toolCallId) {
    serialized.toolCallId = message.toolCallId;
  }

  if (message.name) {
    serialized.name = message.name;
  }

  return serialized;
}

/**
 * Convert SerializedMessage back to runtime Message
 */
export function deserializeMessage(serialized: SerializedMessage): Message {
  const message: Message = {
    role: serialized.role,
    content: serialized.content,
  };

  if (serialized.toolCalls) {
    message.toolCalls = serialized.toolCalls.map((tc) => ({
      id: tc.id,
      type: tc.type,
      function: {
        name: tc.function.name,
        arguments: tc.function.arguments, // Keep as string, Session.sendMessage handles parsing
      },
    }));
  }

  if (serialized.toolCallId) {
    message.toolCallId = serialized.toolCallId;
  }

  if (serialized.name) {
    message.name = serialized.name;
  }

  return message;
}

/**
 * Extract metadata from a serialized conversation
 */
export function extractMetadata(
  conversation: SerializedConversation
): ConversationMetadata {
  const messageCount = conversation.messages.filter(
    (m) => m.role === 'user' || m.role === 'assistant'
  ).length;

  return {
    id: conversation.id,
    title: conversation.title,
    summary: conversation.summary,
    startedAt: conversation.startedAt,
    lastActivity: conversation.lastActivity,
    messageCount,
  };
}
