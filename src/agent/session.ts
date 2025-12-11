/**
 * Session Management
 *
 * Feature: 002-llm-agent-core
 * Date: 2025-12-10
 *
 * Manages a conversation session with DIANA including state machine,
 * LLM interaction, tool calling, and Obsidian logging.
 */

import type {
  SessionState,
  ISession,
  Conversation,
  Message,
  DianaConfig,
  ToolCall,
} from '../types/agent.js';
import { createAgentError } from '../types/agent.js';
import { OllamaClient } from '../llm/client.js';
import { ConversationManager } from './conversation.js';
import { SystemPromptLoader } from './prompt.js';
import { ToolRegistry } from './tools.js';
import { KeyFactStore } from './memory.js';
import { registerObsidianTools } from './tools/obsidian.js';
import { registerMemoryTools } from './tools/memory.js';
import { ObsidianWriter } from '../obsidian/writer.js';

// =============================================================================
// Constants
// =============================================================================

/** Default context threshold for summarization (80% of 32k context) */
const DEFAULT_SUMMARIZATION_THRESHOLD = 25000;

/** Maximum tool call iterations to prevent infinite loops */
const MAX_TOOL_ITERATIONS = 10;

// =============================================================================
// Types
// =============================================================================

/** Callback for tool call events */
export type ToolCallHandler = (toolName: string, args: unknown) => void;

/** Session options */
export interface SessionOptions {
  /** Custom tool registry (will add default tools if not provided) */
  toolRegistry?: ToolRegistry;
  /** Token threshold for summarization */
  summarizationThreshold?: number;
  /** Callback when a tool is called */
  onToolCall?: ToolCallHandler;
  /** Skip registering default Obsidian tools */
  skipDefaultTools?: boolean;
}

// =============================================================================
// Session Class
// =============================================================================

/**
 * Manages a conversation session with DIANA
 */
export class Session implements ISession {
  private state: SessionState = 'initializing';
  private readonly config: DianaConfig;
  private readonly ollamaClient: OllamaClient;
  private readonly promptLoader: SystemPromptLoader;
  private readonly obsidianWriter: ObsidianWriter;
  private readonly toolRegistry: ToolRegistry;
  private readonly keyFactStore: KeyFactStore;
  private conversation: ConversationManager | null = null;
  private readonly summarizationThreshold: number;
  private readonly onToolCall?: ToolCallHandler;
  private readonly skipDefaultTools: boolean;

  constructor(config: DianaConfig, options: SessionOptions = {}) {
    this.config = config;
    this.ollamaClient = new OllamaClient(config.ollama);
    this.promptLoader = new SystemPromptLoader(config.systemPromptPath);
    this.obsidianWriter = new ObsidianWriter(config.obsidian);
    this.keyFactStore = new KeyFactStore(config.memoryPath);
    this.summarizationThreshold =
      options.summarizationThreshold ?? DEFAULT_SUMMARIZATION_THRESHOLD;
    this.onToolCall = options.onToolCall;
    this.skipDefaultTools = options.skipDefaultTools ?? false;

    // Initialize tool registry
    this.toolRegistry = options.toolRegistry ?? new ToolRegistry();

    // Register default Obsidian tools unless skipped
    if (!this.skipDefaultTools) {
      registerObsidianTools(this.toolRegistry, config.obsidian);
    }
  }

  /**
   * Get the current session state
   */
  getState(): SessionState {
    return this.state;
  }

  /**
   * Get the tool registry
   */
  getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }

  /**
   * Initialize the session
   * - Health check Ollama
   * - Verify model availability
   * - Load system prompt
   * - Load key facts
   * - Register memory tools
   * - Create conversation
   */
  async initialize(): Promise<void> {
    this.state = 'initializing';

    try {
      // Health check Ollama
      const ollamaAvailable = await this.ollamaClient.healthCheck();
      if (!ollamaAvailable) {
        throw createAgentError(
          'OLLAMA_UNAVAILABLE',
          `Cannot connect to Ollama at ${this.ollamaClient.getBaseUrl()}`
        );
      }

      // Check model availability
      const modelAvailable = await this.ollamaClient.hasModel(
        this.config.ollama.model
      );
      if (!modelAvailable) {
        throw createAgentError(
          'MODEL_NOT_FOUND',
          `Model '${this.config.ollama.model}' not found. Run: ollama pull ${this.config.ollama.model}`
        );
      }

      // Load system prompt
      await this.promptLoader.load();

      // Load key facts for cross-session memory
      await this.keyFactStore.load();

      // Register memory tools (save_fact) unless skipped
      if (!this.skipDefaultTools) {
        registerMemoryTools(this.toolRegistry, this.keyFactStore);
      }

      // Create conversation with system prompt (including tool descriptions and key facts)
      const systemPrompt = this.promptLoader.getPrompt({
        TOOL_DESCRIPTIONS: this.toolRegistry.getDescriptions(),
        KEY_FACTS: this.keyFactStore.getContextString(),
      });

      this.conversation = new ConversationManager(systemPrompt);

      this.state = 'ready';
    } catch (error) {
      this.state = 'failed';
      throw error;
    }
  }

  /**
   * Send a user message and stream the response
   * Handles tool calls automatically
   */
  async *sendMessage(content: string): AsyncGenerator<string> {
    if (this.state !== 'ready') {
      throw createAgentError(
        'INVALID_RESPONSE',
        `Cannot send message in state: ${this.state}`
      );
    }

    if (!this.conversation) {
      throw createAgentError(
        'INVALID_RESPONSE',
        'Conversation not initialized'
      );
    }

    this.state = 'processing';

    try {
      // Add user message to conversation
      this.conversation.addMessage({
        role: 'user',
        content,
      });

      // Tool call loop
      let iterations = 0;

      while (iterations < MAX_TOOL_ITERATIONS) {
        iterations++;

        // Prepare request with tools
        const tools = this.toolRegistry.getToolDefinitions();
        const request = {
          model: this.config.ollama.model,
          messages: this.conversation.getMessages(),
          stream: true,
          tools: tools.length > 0 ? tools : undefined,
        };

        // Stream response from Ollama
        let fullResponse = '';
        let fullThinking = '';
        let toolCalls: ToolCall[] = [];
        let thinkingStarted = false;
        let thinkingEnded = false;

        for await (const chunk of this.ollamaClient.chat(request)) {
          // Handle thinking content (from think: true API option)
          const thinking = chunk.message?.thinking || '';
          if (thinking) {
            if (!thinkingStarted) {
              yield '<think>';
              thinkingStarted = true;
            }
            fullThinking += thinking;
            yield thinking;
          }

          // Handle regular content
          const text = chunk.message?.content || '';
          if (text) {
            // Close thinking block when content starts
            if (thinkingStarted && !thinkingEnded) {
              yield '</think>';
              thinkingEnded = true;
            }
            fullResponse += text;
            yield text;
          }

          // Check for tool calls
          if (chunk.message?.tool_calls) {
            toolCalls = chunk.message.tool_calls;
          }
        }

        // Close thinking if never got content
        if (thinkingStarted && !thinkingEnded) {
          yield '</think>';
        }

        // If no tool calls, we're done
        if (toolCalls.length === 0) {
          // Add assistant response to conversation
          this.conversation.addMessage({
            role: 'assistant',
            content: fullResponse,
          });
          break;
        }

        // Process tool calls
        this.conversation.addMessage({
          role: 'assistant',
          content: fullResponse,
          toolCalls,
        });

        // Execute each tool call and add results
        for (const toolCall of toolCalls) {
          // Notify about tool call
          if (this.onToolCall) {
            const rawArgs = toolCall.function.arguments;
            const parsedArgs = typeof rawArgs === 'object' ? rawArgs :
              (() => { try { return JSON.parse(rawArgs); } catch { return rawArgs; } })();
            this.onToolCall(toolCall.function.name, parsedArgs);
          }

          // Execute the tool - handle both string and object arguments
          // Ollama may return arguments as an object or a JSON string
          let args: Record<string, unknown>;
          const rawArgs = toolCall.function.arguments;
          if (typeof rawArgs === 'object' && rawArgs !== null) {
            // Arguments are already an object
            args = rawArgs as Record<string, unknown>;
          } else if (typeof rawArgs === 'string') {
            try {
              args = JSON.parse(rawArgs);
            } catch {
              console.error(`[Tool] Failed to parse arguments: "${rawArgs}"`);
              args = {};
            }
          } else {
            args = {};
          }

          const result = await this.toolRegistry.execute(
            toolCall.function.name,
            args
          );

          // Add tool result to conversation
          this.conversation.addMessage({
            role: 'tool',
            content: JSON.stringify(result),
            toolCallId: toolCall.id,
            name: toolCall.function.name,
          });
        }

        // Continue loop to get LLM response to tool results
      }

      // Check if summarization is needed
      if (this.conversation.needsSummarization(this.summarizationThreshold)) {
        await this.performSummarization();
      }

      this.state = 'ready';
    } catch (error) {
      this.state = 'ready'; // Recover to ready state
      throw error;
    }
  }

  /**
   * Close the session gracefully
   * - Log conversation to Obsidian
   * - Clean up resources
   */
  async close(): Promise<void> {
    if (this.state === 'closed') {
      return;
    }

    this.state = 'terminating';

    try {
      // Log conversation to Obsidian
      if (this.conversation && this.conversation.getMessageCount() > 1) {
        await this.logConversation();
      }
    } catch (error) {
      // Log error but don't throw - we want to close gracefully
      console.error('Failed to log conversation:', error);
    }

    this.state = 'closed';
  }

  /**
   * Get the conversation history
   */
  getConversation(): Conversation {
    if (!this.conversation) {
      throw createAgentError(
        'INVALID_RESPONSE',
        'Conversation not initialized'
      );
    }
    return this.conversation.getConversation();
  }

  /**
   * Get the conversation manager (for internal use)
   */
  getConversationManager(): ConversationManager | null {
    return this.conversation;
  }

  /**
   * Perform context summarization
   */
  private async performSummarization(): Promise<void> {
    if (!this.conversation) return;

    // Get messages to summarize (exclude system prompt and recent messages)
    const messages = this.conversation.getMessages();
    const recentCount = 20;
    const toSummarize = messages.slice(1, -recentCount); // Skip system prompt and recent

    if (toSummarize.length < 5) {
      return; // Not enough messages to summarize
    }

    // Create summarization prompt
    const summaryMessages: Message[] = [
      {
        role: 'system',
        content:
          'You are a conversation summarizer. Summarize the following conversation concisely, preserving key facts, decisions, and context that would be important to continue the conversation.',
      },
      {
        role: 'user',
        content: toSummarize
          .map((m) => `${m.role}: ${m.content}`)
          .join('\n\n'),
      },
    ];

    // Generate summary
    const request = {
      model: this.config.ollama.model,
      messages: summaryMessages,
      stream: false,
    };

    const response = await this.ollamaClient.chatComplete(request);
    const summary = response.message.content;

    // Apply summarization
    this.conversation.summarize(summary);
  }

  /**
   * Log the conversation to Obsidian daily log
   */
  private async logConversation(): Promise<void> {
    if (!this.conversation) return;

    const messages = this.conversation.getMessages();
    const messageCount = messages.filter(
      (m) => m.role === 'user' || m.role === 'assistant'
    ).length;

    // Create a brief summary of the conversation
    const startTime = this.conversation.getStartedAt();
    const duration = Math.round(
      (Date.now() - startTime.getTime()) / 1000 / 60
    ); // minutes

    const summary = `Chat session with DIANA (${messageCount} messages, ${duration} min)`;

    await this.obsidianWriter.writeDaily({
      activity: summary,
      title: 'DIANA Conversation',
    });
  }
}

/**
 * Create a new session
 */
export function createSession(
  config: DianaConfig,
  options?: SessionOptions
): Session {
  return new Session(config, options);
}
