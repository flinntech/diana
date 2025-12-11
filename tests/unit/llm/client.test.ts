/**
 * Unit Tests for OllamaClient
 *
 * Feature: 002-llm-agent-core
 *
 * Note: These tests mock the fetch API to test client behavior
 * without requiring a running Ollama instance.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OllamaClient } from '../../../src/llm/client.js';

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe('OllamaClient', () => {
  let client: OllamaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new OllamaClient({
      host: 'localhost',
      port: 11434,
      model: 'test-model',
      timeout: 5000,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('creates client with default values', () => {
      const defaultClient = new OllamaClient({ model: 'test-model' });
      expect(defaultClient.getBaseUrl()).toBe('http://localhost:11434');
      expect(defaultClient.getModel()).toBe('test-model');
    });

    it('creates client with custom host and port', () => {
      const customClient = new OllamaClient({
        host: 'custom-host',
        port: 12345,
        model: 'custom-model',
      });
      expect(customClient.getBaseUrl()).toBe('http://custom-host:12345');
    });
  });

  describe('healthCheck', () => {
    it('returns true when Ollama is available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ version: '0.1.0' }),
      });

      const result = await client.healthCheck();
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/version',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('returns false when Ollama is not available', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await client.healthCheck();
      expect(result).toBe(false);
    });

    it('returns false when response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await client.healthCheck();
      expect(result).toBe(false);
    });
  });

  describe('listModels', () => {
    it('returns list of model names', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { name: 'model1:latest' },
            { name: 'model2:7b' },
            { name: 'model3' },
          ],
        }),
      });

      const models = await client.listModels();
      expect(models).toEqual(['model1:latest', 'model2:7b', 'model3']);
    });

    it('throws error on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' }),
      });

      await expect(client.listModels()).rejects.toThrow('Server error');
    });
  });

  describe('hasModel', () => {
    it('returns true when exact model exists', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [{ name: 'test-model' }],
        }),
      });

      const result = await client.hasModel('test-model');
      expect(result).toBe(true);
    });

    it('returns true when model with tag exists', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [{ name: 'test-model:latest' }],
        }),
      });

      const result = await client.hasModel('test-model');
      expect(result).toBe(true);
    });

    it('returns false when model does not exist', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [{ name: 'other-model' }],
        }),
      });

      const result = await client.hasModel('test-model');
      expect(result).toBe(false);
    });

    it('returns false on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.hasModel('test-model');
      expect(result).toBe(false);
    });
  });

  describe('chatComplete', () => {
    it('sends chat request and returns response', async () => {
      const mockResponse = {
        model: 'test-model',
        message: {
          role: 'assistant',
          content: 'Hello, how can I help?',
        },
        done: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.chatComplete({
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/chat',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('includes tools in request when provided', async () => {
      const mockResponse = {
        model: 'test-model',
        message: { role: 'assistant', content: 'I will use the tool' },
        done: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const tools = [
        {
          type: 'function' as const,
          function: {
            name: 'test_tool',
            description: 'A test tool',
            parameters: {
              type: 'object' as const,
              properties: {},
            },
          },
        },
      ];

      await client.chatComplete({
        messages: [{ role: 'user', content: 'Use the tool' }],
        tools,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('test_tool'),
        })
      );
    });

    it('throws error on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Invalid request' }),
      });

      await expect(
        client.chatComplete({
          messages: [{ role: 'user', content: 'Hi' }],
        })
      ).rejects.toThrow('Invalid request');
    });
  });

  describe('chat (streaming)', () => {
    it('yields chunks from streaming response', async () => {
      const chunks = [
        { message: { role: 'assistant', content: 'Hello' }, done: false },
        { message: { role: 'assistant', content: ' world' }, done: false },
        { message: { role: 'assistant', content: '' }, done: true },
      ];

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'));
          }
          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      });

      const receivedChunks: unknown[] = [];
      for await (const chunk of client.chat({
        messages: [{ role: 'user', content: 'Hi' }],
      })) {
        receivedChunks.push(chunk);
      }

      expect(receivedChunks).toHaveLength(3);
      expect(receivedChunks[0]).toEqual(chunks[0]);
      expect(receivedChunks[1]).toEqual(chunks[1]);
      expect(receivedChunks[2]).toEqual(chunks[2]);
    });

    it('throws error on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' }),
      });

      const generator = client.chat({
        messages: [{ role: 'user', content: 'Hi' }],
      });

      await expect(generator.next()).rejects.toThrow('Server error');
    });

    it('throws error when response body is null', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: null,
      });

      const generator = client.chat({
        messages: [{ role: 'user', content: 'Hi' }],
      });

      await expect(generator.next()).rejects.toThrow('No response body');
    });
  });

  describe('getModel', () => {
    it('returns configured model name', () => {
      expect(client.getModel()).toBe('test-model');
    });
  });

  describe('getBaseUrl', () => {
    it('returns configured base URL', () => {
      expect(client.getBaseUrl()).toBe('http://localhost:11434');
    });
  });
});
