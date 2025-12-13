/**
 * LLM Agent Core - TypeScript Types
 *
 * Feature: 002-llm-agent-core
 * Date: 2025-12-10
 *
 * These interfaces define the contracts for DIANA's LLM agent core.
 * Implementation must adhere to these types.
 */

import type { ObsidianWriterConfig } from './obsidian.js';

// =============================================================================
// Message Types
// =============================================================================

/** Role of a message in the conversation */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

/** A single message in the conversation */
export interface Message {
  /** Who sent the message */
  role: MessageRole;

  /** Text content (required for user/system, optional for assistant with tool calls) */
  content: string;

  /** Tool invocations requested by assistant */
  toolCalls?: ToolCall[];

  /** ID linking tool result to its call (for role='tool') */
  toolCallId?: string;

  /** Tool name (for role='tool') */
  name?: string;
}

/** Request from model to invoke a tool */
export interface ToolCall {
  /** Unique call identifier */
  id: string;

  /** Always 'function' */
  type: 'function';

  /** Function details */
  function: FunctionCall;
}

/** Function call details within a tool call */
export interface FunctionCall {
  /** Tool name to invoke */
  name: string;

  /** Arguments - may be JSON string or already-parsed object (Ollama returns objects) */
  arguments: string | Record<string, unknown>;
}

// =============================================================================
// Tool Types
// =============================================================================

/** JSON Schema for tool parameters */
export interface JSONSchema {
  type: 'object';
  required?: string[];
  properties: Record<string, JSONSchemaProperty>;
}

/** Property definition in JSON Schema */
export interface JSONSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: string[];
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
}

/** Result of executing a tool */
export interface ToolResult {
  /** Whether execution succeeded */
  success: boolean;

  /** Result data (if success) */
  data?: unknown;

  /** Error message (if failed) */
  error?: string;
}

/** Tool execution function signature */
export type ToolExecutor = (args: Record<string, unknown>) => Promise<ToolResult>;

/**
 * Built-in tools registered by default:
 * - write_daily_note: Write entry to daily log (uses ObsidianWriter.logActivity)
 * - read_daily_note: Read today's daily log entries (uses ObsidianWriter - read method to be added)
 * - write_observation: Write observation entry (uses ObsidianWriter.logObservation)
 * - save_fact: Store key fact for cross-session memory (US6)
 */

/** A capability DIANA can invoke */
export interface Tool {
  /** Unique tool identifier (alphanumeric with underscores) */
  name: string;

  /** Human-readable description for LLM */
  description: string;

  /** Parameter schema for validation */
  parameters: JSONSchema;

  /** Async function to run the tool */
  execute: ToolExecutor;
}

/** Tool definition in Ollama format */
export interface OllamaToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: JSONSchema;
  };
}

// =============================================================================
// Conversation Types
// =============================================================================

/** Conversation state */
export interface Conversation {
  /** Unique session identifier (UUID) */
  id: string;

  /** Ordered message history */
  messages: Message[];

  /** Session start timestamp */
  startedAt: Date;

  /** Last message timestamp */
  lastActivity: Date;

  /** Approximate token count */
  tokenEstimate: number;

  /** Message index where summarization occurred */
  summarizedAt?: number;
}

/** Conversation manager interface */
export interface IConversationManager {
  /** Add message to history */
  addMessage(message: Message): void;

  /** Get all messages for API call */
  getMessages(): Message[];

  /** Get current token count estimate */
  getTokenEstimate(): number;

  /** Check if context limit approaching */
  needsSummarization(threshold: number): boolean;

  /** Replace old messages with summary */
  summarize(summary: string): void;

  /** Get conversation ID */
  getId(): string;
}

// =============================================================================
// Tool Registry Types
// =============================================================================

/** Tool registry interface */
export interface IToolRegistry {
  /** Add tool to registry */
  register(tool: Tool): void;

  /** Lookup tool by name */
  get(name: string): Tool | undefined;

  /** Check if tool exists */
  has(name: string): boolean;

  /** Get all tools in Ollama format */
  getToolDefinitions(): OllamaToolDefinition[];

  /** Run tool with arguments */
  execute(name: string, args: Record<string, unknown>): Promise<ToolResult>;

  /** Get markdown descriptions for system prompt */
  getDescriptions(): string;
}

// =============================================================================
// Key Facts Types
// =============================================================================

/** A persistent piece of information about Josh */
export interface KeyFact {
  /** The fact text */
  content: string;

  /** Tags including #important */
  tags: string[];

  /** When fact was recorded */
  createdAt: Date;

  /** Conversation ID where learned */
  source?: string;
}

/** Key fact store interface */
export interface IKeyFactStore {
  /** Read facts from markdown */
  load(): Promise<void>;

  /** Write facts to markdown */
  save(): Promise<void>;

  /** Add new fact */
  addFact(fact: KeyFact): void;

  /** Get #important tagged facts */
  getImportant(): KeyFact[];

  /** Get N most recent facts */
  getRecent(n: number): KeyFact[];

  /** Format for system prompt */
  getContextString(): string;
}

// =============================================================================
// Ollama Client Types
// =============================================================================

/** Ollama configuration */
export interface OllamaConfig {
  /** Ollama host */
  host?: string;

  /** Ollama port */
  port?: number;

  /** Model name (qwen3:30b-a3b) */
  model: string;

  /** Context window size */
  contextSize?: number;

  /** Request timeout (ms) */
  timeout?: number;
}

/** Ollama chat request */
export interface OllamaChatRequest {
  /** Model name */
  model: string;

  /** Message history */
  messages: Message[];

  /** Enable streaming */
  stream?: boolean;

  /** Tool definitions */
  tools?: OllamaToolDefinition[];

  /** Model options */
  options?: OllamaOptions;
}

/** Ollama model options */
export interface OllamaOptions {
  /** Temperature (0.0-2.0) */
  temperature?: number;

  /** Top-k sampling */
  top_k?: number;

  /** Top-p (nucleus) sampling */
  top_p?: number;

  /** Context window size */
  num_ctx?: number;
}

/** Streaming chat chunk */
export interface OllamaChatChunk {
  /** Model name */
  model: string;

  /** Timestamp */
  created_at: string;

  /** Message content */
  message: {
    role: MessageRole;
    content: string;
    /** Thinking content (when think: true is enabled) */
    thinking?: string;
    tool_calls?: ToolCall[];
  };

  /** Whether stream is complete */
  done: boolean;

  /** Final metrics (only when done=true) */
  total_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

/** Complete chat response (non-streaming) */
export interface OllamaChatResponse extends OllamaChatChunk {
  done: true;
  total_duration: number;
  prompt_eval_count: number;
  eval_count: number;
  eval_duration: number;
}

/** Ollama client interface */
export interface IOllamaClient {
  /** Check if Ollama is available */
  healthCheck(): Promise<boolean>;

  /** Check if model is available */
  hasModel(name: string): Promise<boolean>;

  /** Send chat request with streaming */
  chat(request: OllamaChatRequest): AsyncGenerator<OllamaChatChunk>;

  /** Send chat request without streaming */
  chatComplete(request: OllamaChatRequest): Promise<OllamaChatResponse>;

  /** Get available models */
  listModels(): Promise<string[]>;
}

// =============================================================================
// Session Types
// =============================================================================

/** Session state */
export type SessionState =
  | 'initializing'
  | 'ready'
  | 'processing'
  | 'terminating'
  | 'closed'
  | 'failed';

/** Session interface */
export interface ISession {
  /** Get current state */
  getState(): SessionState;

  /** Initialize session (health check, load prompt, etc.) */
  initialize(): Promise<void>;

  /** Send user message and get response */
  sendMessage(content: string): AsyncGenerator<string>;

  /** End session gracefully */
  close(): Promise<void>;

  /** Get conversation history */
  getConversation(): Conversation;
}

// =============================================================================
// Configuration Types
// =============================================================================

/** Extended DIANA configuration */
export interface DianaConfig {
  /** Obsidian writer configuration (from 001) */
  obsidian: ObsidianWriterConfig;

  /** Ollama configuration */
  ollama: OllamaConfig;

  /** Path to system prompt markdown file */
  systemPromptPath: string;

  /** Path to facts.md in Obsidian vault */
  memoryPath: string;
}

// =============================================================================
// CLI Types
// =============================================================================

/** Chat command options */
export interface ChatCommandOptions {
  /** Enable debug output */
  debug?: boolean;
  /** Show full thinking output (default: collapsed) */
  showThinking?: boolean;
}

/** Ask command options */
export interface AskCommandOptions {
  /** Enable debug output */
  debug?: boolean;

  /** Output format */
  format?: 'text' | 'json';
}

/** Status command result */
export interface StatusResult {
  /** Overall status */
  status: 'ok' | 'error';

  /** Ollama connection status */
  ollama: {
    available: boolean;
    host: string;
    port: number;
  };

  /** Model status */
  model: {
    name: string;
    available: boolean;
  };

  /** Obsidian vault status */
  vault: {
    accessible: boolean;
    path: string;
  };

  /** System prompt status */
  systemPrompt: {
    loaded: boolean;
    path: string;
  };

  /** Registered tools */
  tools: string[];
}

// =============================================================================
// Error Types
// =============================================================================

/** Error codes for LLM agent */
export type AgentErrorCode =
  // Core LLM errors
  | 'OLLAMA_UNAVAILABLE'
  | 'MODEL_NOT_FOUND'
  | 'SYSTEM_PROMPT_MISSING'
  | 'TOOL_NOT_FOUND'
  | 'TOOL_EXECUTION_FAILED'
  | 'CONTEXT_OVERFLOW'
  | 'NETWORK_TIMEOUT'
  | 'INVALID_RESPONSE'
  // Agent system errors (004-agent-mcp-foundation)
  | 'AGENT_INIT_FAILED'
  | 'AGENT_SHUTDOWN_FAILED'
  | 'AGENT_NOT_FOUND'
  | 'AGENT_UNAVAILABLE'
  | 'TOOL_EXECUTION_TIMEOUT'
  // MCP errors (004-agent-mcp-foundation)
  | 'MCP_CONNECTION_FAILED'
  | 'MCP_TOOL_DISCOVERY_FAILED'
  | 'MCP_SERVER_UNAVAILABLE';

/** Agent error that extends Error for proper error handling */
export class AgentError extends Error {
  readonly code: AgentErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: AgentErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AgentError';
    this.code = code;
    this.details = details;
  }
}

/** Create typed agent error */
export function createAgentError(
  code: AgentErrorCode,
  message: string,
  details?: Record<string, unknown>
): AgentError {
  return new AgentError(code, message, details);
}
