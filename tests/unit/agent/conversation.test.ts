/**
 * Unit Tests for ConversationManager
 *
 * Feature: 002-llm-agent-core
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConversationManager, createConversation } from '../../../src/agent/conversation.js';

describe('ConversationManager', () => {
  describe('constructor', () => {
    it('creates conversation with unique ID', () => {
      const conv1 = new ConversationManager();
      const conv2 = new ConversationManager();
      expect(conv1.getId()).toBeTruthy();
      expect(conv2.getId()).toBeTruthy();
      expect(conv1.getId()).not.toBe(conv2.getId());
    });

    it('initializes with empty messages when no system prompt', () => {
      const conv = new ConversationManager();
      expect(conv.getMessages()).toEqual([]);
      expect(conv.getMessageCount()).toBe(0);
    });

    it('adds system prompt as first message when provided', () => {
      const conv = new ConversationManager('You are a helpful assistant.');
      const messages = conv.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toBe('You are a helpful assistant.');
    });
  });

  describe('addMessage', () => {
    it('adds user message to conversation', () => {
      const conv = new ConversationManager();
      conv.addMessage({ role: 'user', content: 'Hello' });

      const messages = conv.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({ role: 'user', content: 'Hello' });
    });

    it('adds assistant message to conversation', () => {
      const conv = new ConversationManager();
      conv.addMessage({ role: 'assistant', content: 'Hi there!' });

      const messages = conv.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({ role: 'assistant', content: 'Hi there!' });
    });

    it('maintains message order', () => {
      const conv = new ConversationManager();
      conv.addMessage({ role: 'user', content: 'First' });
      conv.addMessage({ role: 'assistant', content: 'Second' });
      conv.addMessage({ role: 'user', content: 'Third' });

      const messages = conv.getMessages();
      expect(messages).toHaveLength(3);
      expect(messages[0].content).toBe('First');
      expect(messages[1].content).toBe('Second');
      expect(messages[2].content).toBe('Third');
    });

    it('updates last activity timestamp', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-12-10T10:00:00'));

      const conv = new ConversationManager();
      const initialActivity = conv.getLastActivity();

      vi.setSystemTime(new Date('2025-12-10T11:00:00'));
      conv.addMessage({ role: 'user', content: 'Hello' });

      expect(conv.getLastActivity().getTime()).toBeGreaterThan(initialActivity.getTime());

      vi.useRealTimers();
    });
  });

  describe('getMessages', () => {
    it('returns a copy of messages array', () => {
      const conv = new ConversationManager();
      conv.addMessage({ role: 'user', content: 'Test' });

      const messages1 = conv.getMessages();
      const messages2 = conv.getMessages();

      expect(messages1).not.toBe(messages2);
      expect(messages1).toEqual(messages2);
    });
  });

  describe('getTokenEstimate', () => {
    it('estimates tokens based on character count', () => {
      const conv = new ConversationManager();
      // 100 characters = ~25 tokens (at 4 chars/token)
      conv.addMessage({ role: 'user', content: 'x'.repeat(100) });

      expect(conv.getTokenEstimate()).toBe(25);
    });

    it('includes system prompt in token estimate', () => {
      const systemPrompt = 'x'.repeat(400); // 100 tokens
      const conv = new ConversationManager(systemPrompt);

      expect(conv.getTokenEstimate()).toBe(100);
    });

    it('accumulates tokens from multiple messages', () => {
      const conv = new ConversationManager();
      conv.addMessage({ role: 'user', content: 'x'.repeat(100) }); // 25 tokens
      conv.addMessage({ role: 'assistant', content: 'x'.repeat(200) }); // 50 tokens

      expect(conv.getTokenEstimate()).toBe(75);
    });

    it('includes tool calls in token estimate', () => {
      const conv = new ConversationManager();
      conv.addMessage({
        role: 'assistant',
        content: 'Using tool',
        toolCalls: [
          {
            id: '1',
            type: 'function',
            function: {
              name: 'test_tool',
              arguments: '{"arg": "value"}',
            },
          },
        ],
      });

      // Content (10 chars) + name (9 chars) + args (16 chars) = 35 chars / 4 = 9 tokens
      // Verify tool calls contribute to token estimate
      expect(conv.getTokenEstimate()).toBeGreaterThan(5);
    });
  });

  describe('needsSummarization', () => {
    it('returns false when under threshold', () => {
      const conv = new ConversationManager();
      conv.addMessage({ role: 'user', content: 'Hello' });

      expect(conv.needsSummarization(1000)).toBe(false);
    });

    it('returns true when at or over threshold', () => {
      const conv = new ConversationManager();
      // Add enough content to exceed threshold
      conv.addMessage({ role: 'user', content: 'x'.repeat(4000) }); // 1000 tokens

      expect(conv.needsSummarization(500)).toBe(true);
      expect(conv.needsSummarization(1000)).toBe(true);
    });
  });

  describe('summarize', () => {
    it('replaces messages with summary and recent', () => {
      const conv = new ConversationManager('System prompt');

      // Add many messages
      for (let i = 0; i < 30; i++) {
        conv.addMessage({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`,
        });
      }

      expect(conv.getMessageCount()).toBe(31); // 30 + system

      conv.summarize('This is a summary of previous conversation.');

      // Should have: system + summary + recent non-system messages
      const messages = conv.getMessages();
      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toBe('System prompt');
      expect(messages[1].role).toBe('system');
      expect(messages[1].content).toContain('Previous conversation summary');
      expect(messages[1].content).toContain('This is a summary');
    });

    it('marks conversation as summarized', () => {
      const conv = new ConversationManager('System');
      conv.addMessage({ role: 'user', content: 'Hello' });

      expect(conv.wasSummarized()).toBe(false);

      conv.summarize('Summary');

      expect(conv.wasSummarized()).toBe(true);
    });

    it('reduces token count after summarization', () => {
      const conv = new ConversationManager('System');

      // Add large messages
      for (let i = 0; i < 50; i++) {
        conv.addMessage({ role: 'user', content: 'x'.repeat(200) });
      }

      const tokensBefore = conv.getTokenEstimate();
      conv.summarize('Short summary');
      const tokensAfter = conv.getTokenEstimate();

      expect(tokensAfter).toBeLessThan(tokensBefore);
    });
  });

  describe('getConversation', () => {
    it('returns a copy of conversation data', () => {
      const conv = new ConversationManager();
      const data1 = conv.getConversation();
      const data2 = conv.getConversation();

      expect(data1).not.toBe(data2);
      expect(data1.id).toBe(data2.id);
    });
  });

  describe('getStartedAt', () => {
    it('returns conversation start time', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-12-10T10:00:00'));

      const conv = new ConversationManager();
      expect(conv.getStartedAt()).toEqual(new Date('2025-12-10T10:00:00'));

      vi.useRealTimers();
    });
  });

  describe('createConversation factory', () => {
    it('creates ConversationManager instance', () => {
      const conv = createConversation();
      expect(conv).toBeInstanceOf(ConversationManager);
    });

    it('passes system prompt to constructor', () => {
      const conv = createConversation('System prompt');
      const messages = conv.getMessages();
      expect(messages[0].content).toBe('System prompt');
    });
  });
});
