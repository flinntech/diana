/**
 * Timeout Utility - Tool execution timeout handling
 *
 * Feature: 004-agent-mcp-foundation
 * Date: 2025-12-12
 *
 * Default timeout: 30s per spec clarifications.
 */

import { createTimeoutError, AgentSystemError } from '../errors.js';

/** Default tool execution timeout in milliseconds (30s per spec) */
export const DEFAULT_TOOL_TIMEOUT_MS = 30_000;

/** Default MCP connection timeout in milliseconds (10s per spec) */
export const DEFAULT_MCP_TIMEOUT_MS = 10_000;

/** Default shutdown timeout per agent in milliseconds (5s per spec) */
export const DEFAULT_SHUTDOWN_TIMEOUT_MS = 5_000;

/** Default routing overhead limit in milliseconds (5s per SC-001) */
export const ROUTING_OVERHEAD_LIMIT_MS = 5_000;

/**
 * Execute a promise with a timeout.
 *
 * @param promise - The promise to execute
 * @param timeoutMs - Timeout in milliseconds
 * @param toolName - Tool name for error message
 * @returns The result of the promise
 * @throws AgentSystemError with code TOOL_EXECUTION_TIMEOUT on timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  toolName: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(createTimeoutError(toolName, timeoutMs));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Create a timeout controller for cancellable operations.
 */
export function createTimeoutController(timeoutMs: number): {
  signal: AbortSignal;
  clear: () => void;
} {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId),
  };
}

/**
 * Wait for a specified duration.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute multiple promises with a per-item timeout.
 * Returns results for successful items and errors for failed/timed out items.
 */
export async function withTimeoutAll<T>(
  items: Array<{ id: string; promise: Promise<T> }>,
  timeoutMs: number
): Promise<
  Array<{ id: string; result?: T; error?: string }>
> {
  const results = await Promise.all(
    items.map(async ({ id, promise }) => {
      try {
        const result = await withTimeout(promise, timeoutMs, id);
        return { id, result };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        return { id, error: errorMessage };
      }
    })
  );

  return results;
}

/**
 * Execute a function with retry on timeout.
 *
 * @param fn - Function to execute
 * @param options - Retry options
 * @returns The result of the function
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delayMs?: number;
    timeoutMs?: number;
    operationName?: string;
  } = {}
): Promise<T> {
  const {
    maxRetries = 1,
    delayMs = 3000,
    timeoutMs = DEFAULT_TOOL_TIMEOUT_MS,
    operationName = 'operation',
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await withTimeout(fn(), timeoutMs, operationName);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Only retry on timeout or connection errors
      const isRetryable =
        error instanceof AgentSystemError &&
        (error.code === 'TOOL_EXECUTION_TIMEOUT' ||
          error.code === 'MCP_CONNECTION_FAILED' ||
          error.code === 'NETWORK_TIMEOUT');

      if (!isRetryable || attempt >= maxRetries) {
        throw error;
      }

      // Wait before retry
      await delay(delayMs);
    }
  }

  throw lastError ?? new Error(`${operationName} failed after ${maxRetries} retries`);
}
