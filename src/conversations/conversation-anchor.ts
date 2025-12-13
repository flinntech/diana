/**
 * Conversation Anchor Helpers
 *
 * Feature: 006-obsidian-rich-linking
 * Date: 2025-12-13
 *
 * Helpers for creating vault anchors from conversations.
 */

import type { SerializedConversation, SerializedMessage } from './conversation.types.js';
import type { ConversationAnchorInput } from '../types/obsidian.js';

// =============================================================================
// Wiki-Link Extraction
// =============================================================================

/**
 * Regex pattern for extracting wiki-links from message content.
 * Matches [[path]], [[path|alias]], [[path#heading]], etc.
 */
const WIKILINK_PATTERN = /\[\[([^\]|#^]+)(?:#[^\]|^]+)?(?:\^[^\]|]+)?(?:\|[^\]]+)?\]\]/g;

/**
 * Extract all vault note paths referenced in conversation messages.
 * Scans both user and assistant messages for wiki-links.
 *
 * @param messages - Serialized messages to scan
 * @returns Array of unique note paths (normalized, without .md)
 */
export function extractReferencedNotes(messages: SerializedMessage[]): string[] {
  const paths = new Set<string>();

  for (const message of messages) {
    // Only scan user and assistant messages
    if (message.role !== 'user' && message.role !== 'assistant') {
      continue;
    }

    // Extract wiki-links from content
    let match;
    WIKILINK_PATTERN.lastIndex = 0;

    while ((match = WIKILINK_PATTERN.exec(message.content)) !== null) {
      const path = match[1].trim();
      if (path) {
        // Normalize: remove .md extension if present
        paths.add(path.replace(/\.md$/, ''));
      }
    }
  }

  return Array.from(paths).sort();
}

/**
 * Create ConversationAnchorInput from a serialized conversation.
 *
 * @param conversation - Serialized conversation
 * @param jsonPath - Path to the conversation JSON file
 * @returns Input for creating a conversation anchor note
 */
export function createAnchorInput(
  conversation: SerializedConversation,
  jsonPath: string
): ConversationAnchorInput {
  const referencedNotes = extractReferencedNotes(conversation.messages);

  // Count user + assistant messages
  const messageCount = conversation.messages.filter(
    (m) => m.role === 'user' || m.role === 'assistant'
  ).length;

  return {
    id: conversation.id,
    title: conversation.title || 'Untitled Conversation',
    startedAt: conversation.startedAt,
    messageCount,
    referencedNotes,
    jsonPath,
  };
}

/**
 * Check if a conversation has any referenced vault notes.
 * Used to determine whether to create an anchor.
 *
 * @param messages - Serialized messages to check
 * @returns true if any wiki-links are found
 */
export function hasReferencedNotes(messages: SerializedMessage[]): boolean {
  for (const message of messages) {
    if (message.role !== 'user' && message.role !== 'assistant') {
      continue;
    }

    WIKILINK_PATTERN.lastIndex = 0;
    if (WIKILINK_PATTERN.test(message.content)) {
      return true;
    }
  }

  return false;
}
