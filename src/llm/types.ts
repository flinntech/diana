/**
 * Ollama-specific Types
 *
 * Feature: 002-llm-agent-core
 * Date: 2025-12-10
 *
 * Re-exports from agent types and adds streaming-specific internal types.
 */

// Re-export Ollama types from agent types
export type {
  OllamaConfig,
  OllamaChatRequest,
  OllamaChatChunk,
  OllamaChatResponse,
  OllamaOptions,
  OllamaToolDefinition,
  IOllamaClient,
  Message,
  MessageRole,
  ToolCall,
} from '../types/agent.js';

// =============================================================================
// Internal Streaming Types
// =============================================================================

/** Internal state for stream processing */
export interface StreamState {
  /** Buffer for partial JSON */
  buffer: string;

  /** Whether the stream has completed */
  done: boolean;

  /** Accumulated content */
  accumulatedContent: string;

  /** Accumulated tool calls */
  accumulatedToolCalls: ToolCallInternal[];
}

/** Internal tool call representation during streaming */
export interface ToolCallInternal {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/** Ollama API error response */
export interface OllamaErrorResponse {
  error: string;
}

/** Ollama models list response */
export interface OllamaModelsResponse {
  models: Array<{
    name: string;
    model: string;
    modified_at: string;
    size: number;
    digest: string;
    details?: {
      parent_model?: string;
      format?: string;
      family?: string;
      families?: string[];
      parameter_size?: string;
      quantization_level?: string;
    };
  }>;
}

/** Ollama version response */
export interface OllamaVersionResponse {
  version: string;
}
