/**
 * Conversation Manager
 *
 * Feature: 002-llm-agent-core, 005-conversation-persistence
 * Date: 2025-12-10
 *
 * Manages conversation state, message history, and token estimation.
 */

import { randomUUID } from 'crypto';
import type { Message, Conversation, IConversationManager } from '../types/agent.js';
import type { SerializedMessage } from '../conversations/conversation.types.js';
import { serializeMessage, deserializeMessage } from '../conversations/conversation.types.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Serializable state of a conversation for persistence
 * Feature: 005-conversation-persistence
 */
export interface SerializableConversationState {
  id: string;
  messages: SerializedMessage[];
  startedAt: string; // ISO 8601
  lastActivity: string; // ISO 8601
  tokenEstimate: number;
  summarizedAt?: number;
}

// =============================================================================
// Constants
// =============================================================================

/** Characters per token approximation */
const CHARS_PER_TOKEN = 4;

// =============================================================================
// ConversationManager Class
// =============================================================================

/**
 * Manages a conversation session with message history and token tracking
 */
export class ConversationManager implements IConversationManager {
  private readonly conversation: Conversation;

  constructor(systemPrompt?: string) {
    const now = new Date();
    this.conversation = {
      id: randomUUID(),
      messages: [],
      startedAt: now,
      lastActivity: now,
      tokenEstimate: 0,
    };

    // Add system prompt as the first message if provided
    if (systemPrompt) {
      this.addMessage({
        role: 'system',
        content: systemPrompt,
      });
    }
  }

  /**
   * Get the conversation ID
   */
  getId(): string {
    return this.conversation.id;
  }

  /**
   * Add a message to the conversation history
   */
  addMessage(message: Message): void {
    this.conversation.messages.push(message);
    this.conversation.lastActivity = new Date();
    this.updateTokenEstimate();
  }

  /**
   * Get all messages for API call
   */
  getMessages(): Message[] {
    return [...this.conversation.messages];
  }

  /**
   * Get the current token count estimate
   */
  getTokenEstimate(): number {
    return this.conversation.tokenEstimate;
  }

  /**
   * Check if context limit is approaching and summarization is needed
   */
  needsSummarization(threshold: number): boolean {
    return this.conversation.tokenEstimate >= threshold;
  }

  /**
   * Replace old messages with a summary to reduce context size
   * Preserves the system prompt and recent messages
   */
  summarize(summary: string): void {
    const messages = this.conversation.messages;

    // Find the system prompt (should be first message)
    const systemPrompt = messages.find((m) => m.role === 'system');

    // Keep the most recent messages (approximately last 10 exchanges)
    const recentCount = 20; // 10 exchanges = 20 messages (user + assistant)
    const recentMessages = messages.slice(-recentCount);

    // Rebuild message array with: system prompt + summary + recent messages
    const newMessages: Message[] = [];

    if (systemPrompt) {
      newMessages.push(systemPrompt);
    }

    // Add summary as a system-level context message
    newMessages.push({
      role: 'system',
      content: `Previous conversation summary:\n${summary}`,
    });

    // Add recent messages (excluding any that are already in newMessages)
    for (const msg of recentMessages) {
      if (msg.role !== 'system') {
        newMessages.push(msg);
      }
    }

    this.conversation.messages = newMessages;
    this.conversation.summarizedAt = messages.length - recentCount;
    this.updateTokenEstimate();
  }

  /**
   * Get the full conversation data
   */
  getConversation(): Conversation {
    return { ...this.conversation };
  }

  /**
   * Get the message count
   */
  getMessageCount(): number {
    return this.conversation.messages.length;
  }

  /**
   * Get when the conversation started
   */
  getStartedAt(): Date {
    return this.conversation.startedAt;
  }

  /**
   * Get the last activity timestamp
   */
  getLastActivity(): Date {
    return this.conversation.lastActivity;
  }

  /**
   * Check if summarization has occurred
   */
  wasSummarized(): boolean {
    return this.conversation.summarizedAt !== undefined;
  }

  /**
   * Get serializable state for persistence
   * Feature: 005-conversation-persistence (T007)
   */
  getSerializableState(): SerializableConversationState {
    return {
      id: this.conversation.id,
      messages: this.conversation.messages.map(serializeMessage),
      startedAt: this.conversation.startedAt.toISOString(),
      lastActivity: this.conversation.lastActivity.toISOString(),
      tokenEstimate: this.conversation.tokenEstimate,
      summarizedAt: this.conversation.summarizedAt,
    };
  }

  /**
   * Restore state from persisted data
   * Feature: 005-conversation-persistence (T008)
   */
  restoreState(state: SerializableConversationState): void {
    // Update conversation properties
    (this.conversation as { id: string }).id = state.id;
    this.conversation.messages = state.messages.map(deserializeMessage);
    (this.conversation as { startedAt: Date }).startedAt = new Date(state.startedAt);
    this.conversation.lastActivity = new Date(state.lastActivity);
    this.conversation.tokenEstimate = state.tokenEstimate;
    if (state.summarizedAt !== undefined) {
      this.conversation.summarizedAt = state.summarizedAt;
    }
  }

  /**
   * Update the token estimate based on current messages
   */
  private updateTokenEstimate(): void {
    let totalChars = 0;

    for (const message of this.conversation.messages) {
      totalChars += message.content.length;

      // Account for tool calls
      if (message.toolCalls) {
        for (const call of message.toolCalls) {
          totalChars += call.function.name.length;
          const args = call.function.arguments;
          totalChars += typeof args === 'string' ? args.length : JSON.stringify(args).length;
        }
      }
    }

    this.conversation.tokenEstimate = Math.ceil(totalChars / CHARS_PER_TOKEN);
  }
}

/**
 * Create a new conversation manager
 */
export function createConversation(systemPrompt?: string): ConversationManager {
  return new ConversationManager(systemPrompt);
}

/**
 * Create ConversationManager from persisted state
 * Feature: 005-conversation-persistence (T009)
 */
export function createConversationFromState(state: SerializableConversationState): ConversationManager {
  const manager = new ConversationManager();
  manager.restoreState(state);
  return manager;
}
