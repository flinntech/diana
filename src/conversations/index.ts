/**
 * Conversation Persistence Module
 *
 * Feature: 005-conversation-persistence
 * Date: 2025-12-13
 *
 * Public exports for conversation persistence functionality.
 */

// Types
export type {
  SerializedToolCall,
  SerializedMessage,
  ConversationMetadata,
  SerializedConversation,
  ConversationIndex,
  ConversationLock,
  ConversationStoreConfig,
  LockResult,
  IConversationStore,
  ConversationSessionOptions,
  TitleSummaryResult,
} from './conversation.types.js';

// Serialization helpers
export {
  serializeMessage,
  deserializeMessage,
  extractMetadata,
} from './conversation.types.js';

// Store
export { ConversationStore, createConversationStore } from './conversation.store.js';

// Lock manager
export { ConversationLockManager, createLockManager } from './conversation.lock.js';
