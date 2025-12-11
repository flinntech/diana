/**
 * Ollama Client
 *
 * Feature: 002-llm-agent-core
 * Date: 2025-12-10
 *
 * HTTP client for Ollama API with streaming support and retry logic.
 */

import type {
  OllamaConfig,
  OllamaChatRequest,
  OllamaChatChunk,
  OllamaChatResponse,
  IOllamaClient,
} from './types.js';
import type { OllamaModelsResponse, OllamaErrorResponse } from './types.js';
import { createAgentError, type AgentError } from '../types/agent.js';

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_HOST = 'localhost';
const DEFAULT_PORT = 11434;
const DEFAULT_TIMEOUT = 120000; // 2 minutes
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 100; // ms

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Delay execution for the specified milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an error is transient and should be retried
 */
function isTransientError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('econnreset') ||
      message.includes('econnrefused') ||
      message.includes('network') ||
      message.includes('fetch failed')
    );
  }
  return false;
}

/**
 * Execute a function with retry logic and exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry non-transient errors
      if (!isTransientError(error)) {
        throw lastError;
      }

      // Don't delay after the last attempt
      if (attempt < maxRetries - 1) {
        const delayMs = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
        await delay(delayMs);
      }
    }
  }

  throw lastError ?? new Error('Retry failed');
}

// =============================================================================
// OllamaClient Class
// =============================================================================

/**
 * Client for interacting with Ollama's HTTP API
 */
export class OllamaClient implements IOllamaClient {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeout: number;
  private readonly contextSize?: number;

  constructor(config: OllamaConfig) {
    const host = config.host ?? DEFAULT_HOST;
    const port = config.port ?? DEFAULT_PORT;
    this.baseUrl = `http://${host}:${port}`;
    this.model = config.model;
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.contextSize = config.contextSize;
  }

  /**
   * Check if Ollama is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/api/version`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Check if a specific model is available
   */
  async hasModel(name: string): Promise<boolean> {
    try {
      const models = await this.listModels();
      return models.some(
        (model) => model === name || model.startsWith(`${name}:`)
      );
    } catch {
      return false;
    }
  }

  /**
   * Get list of available models
   */
  async listModels(): Promise<string[]> {
    return withRetry(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await this.parseError(response);
        throw new Error(error.message);
      }

      const data = (await response.json()) as OllamaModelsResponse;
      return data.models.map((m) => m.name);
    });
  }

  /**
   * Send chat request with streaming
   */
  async *chat(request: OllamaChatRequest): AsyncGenerator<OllamaChatChunk> {
    const body = {
      model: request.model || this.model,
      messages: request.messages,
      stream: true,
      think: true, // Enable qwen3 thinking mode
      tools: request.tools,
      options: {
        ...request.options,
        num_ctx: request.options?.num_ctx ?? this.contextSize,
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await this.parseError(response);
        throw new Error(error.message);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) {
            try {
              const chunk = JSON.parse(trimmed) as OllamaChatChunk;
              yield chunk;
            } catch {
              // Skip malformed JSON lines
              console.error('Failed to parse chunk:', trimmed);
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        try {
          const chunk = JSON.parse(buffer.trim()) as OllamaChatChunk;
          yield chunk;
        } catch {
          // Skip malformed final chunk
        }
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw createAgentError(
          'NETWORK_TIMEOUT',
          `Request timed out after ${this.timeout}ms`
        );
      }
      throw error;
    }
  }

  /**
   * Send chat request without streaming
   */
  async chatComplete(request: OllamaChatRequest): Promise<OllamaChatResponse> {
    return withRetry(async () => {
      const body = {
        model: request.model || this.model,
        messages: request.messages,
        stream: false,
        tools: request.tools,
        options: {
          ...request.options,
          num_ctx: request.options?.num_ctx ?? this.contextSize,
        },
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(`${this.baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = await this.parseError(response);
          throw new Error(error.message);
        }

        const data = (await response.json()) as OllamaChatResponse;
        return data;
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error && error.name === 'AbortError') {
          throw createAgentError(
            'NETWORK_TIMEOUT',
            `Request timed out after ${this.timeout}ms`
          );
        }
        throw error;
      }
    });
  }

  /**
   * Parse error response from Ollama
   */
  private async parseError(response: Response): Promise<AgentError> {
    try {
      const data = (await response.json()) as OllamaErrorResponse;
      return createAgentError(
        'INVALID_RESPONSE',
        data.error || `HTTP ${response.status}: ${response.statusText}`
      );
    } catch {
      return createAgentError(
        'INVALID_RESPONSE',
        `HTTP ${response.status}: ${response.statusText}`
      );
    }
  }

  /**
   * Get the configured model name
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Get the base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }
}
