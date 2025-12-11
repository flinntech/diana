/**
 * LLM Module Exports
 *
 * Feature: 002-llm-agent-core
 * Date: 2025-12-10
 */

// Client
export { OllamaClient } from './client.js';

// Types
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
  StreamState,
  ToolCallInternal,
  OllamaErrorResponse,
  OllamaModelsResponse,
  OllamaVersionResponse,
} from './types.js';
