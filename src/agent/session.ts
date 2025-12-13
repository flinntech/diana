/**
 * Session Management
 *
 * Feature: 002-llm-agent-core, 005-conversation-persistence
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
import { ConversationManager, createConversationFromState } from './conversation.js';
import type { SerializableConversationState } from './conversation.js';
import { SystemPromptLoader } from './prompt.js';
import { ToolRegistry } from './tools.js';
import { KeyFactStore } from './memory.js';
import { registerObsidianTools } from './tools/obsidian.js';
import { registerMemoryTools } from './tools/memory.js';
import { registerProposalTools, registerWatcherTools } from './tools/watcher.js';
import { ObsidianWriter } from '../obsidian/writer.js';
import type { ProposalService } from '../proposals/index.js';
import type { WatcherService } from '../watcher/index.js';
import type { IOrchestrator } from './types/orchestrator.js';
import { LegacyToolAgent } from './legacy-tool-agent.js';
import type { IConversationStore, TitleSummaryResult } from '../conversations/index.js';

// =============================================================================
// Constants
// =============================================================================

/** Default context threshold for summarization (80% of 32k context) */
const DEFAULT_SUMMARIZATION_THRESHOLD = 25000;

/** Maximum tool call iterations to prevent infinite loops */
const MAX_TOOL_ITERATIONS = 10;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate current context string for system prompt injection
 * Provides DIANA with basic situational awareness (date, platform)
 */
function generateCurrentContext(): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `- **Today**: ${dateStr}
- **Platform**: ${process.platform}`;
}

/**
 * Parse tool call arguments which may be a JSON string or already an object
 * Ollama may return arguments in either format
 */
function parseToolArguments(
  rawArgs: string | Record<string, unknown>
): Record<string, unknown> {
  if (typeof rawArgs === 'object' && rawArgs !== null) {
    return rawArgs;
  }
  if (typeof rawArgs === 'string') {
    try {
      return JSON.parse(rawArgs);
    } catch {
      console.error(`[Tool] Failed to parse arguments: "${rawArgs}"`);
      return {};
    }
  }
  return {};
}

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
  /** ProposalService for file organization tools (Feature: 003) */
  proposalService?: ProposalService;
  /** WatcherService for file system monitoring (Feature: 003) */
  watcherService?: WatcherService;
  /** Auto-start watcher on initialization (default: true if watcherService provided) */
  autoStartWatcher?: boolean;
  /** Orchestrator for agent-based tool execution (Feature: 004) */
  orchestrator?: IOrchestrator;
  /** Load MCP servers from config on initialization (default: true if orchestrator provided) */
  loadMCPServers?: boolean;
  /** ConversationStore for persistence (Feature: 005) */
  conversationStore?: IConversationStore;
  /** ID of conversation to resume (Feature: 005) */
  resumeConversationId?: string;
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
  private readonly watcherService?: WatcherService;
  private readonly autoStartWatcher: boolean;
  private readonly orchestrator?: IOrchestrator;
  private readonly loadMCPServers: boolean;
  // Feature: 005-conversation-persistence
  private readonly conversationStore?: IConversationStore;
  private readonly resumeConversationId?: string;
  private conversationLockAcquired = false;

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
    this.watcherService = options.watcherService;
    this.autoStartWatcher = options.autoStartWatcher ?? (!!options.watcherService);
    this.orchestrator = options.orchestrator;
    this.loadMCPServers = options.loadMCPServers ?? (!!options.orchestrator);
    // Feature: 005-conversation-persistence
    this.conversationStore = options.conversationStore;
    this.resumeConversationId = options.resumeConversationId;

    // Initialize tool registry
    this.toolRegistry = options.toolRegistry ?? new ToolRegistry();

    // Register default Obsidian tools unless skipped
    if (!this.skipDefaultTools) {
      registerObsidianTools(this.toolRegistry, config.obsidian);
    }

    // Register proposal tools if ProposalService is provided (Feature: 003)
    if (options.proposalService) {
      registerProposalTools(this.toolRegistry, options.proposalService);
    }

    // Register watcher tools if WatcherService is provided (Feature: 003)
    if (options.watcherService) {
      registerWatcherTools(this.toolRegistry, options.watcherService);
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

      // Setup orchestrator with legacy tools (Feature: 004)
      if (this.orchestrator) {
        // Wrap the tool registry as a LegacyToolAgent and register with orchestrator
        const legacyAgent = new LegacyToolAgent(this.toolRegistry);
        this.orchestrator.registerAgentFactory('legacy-tools', () => legacyAgent);

        // Load MCP servers from config if enabled
        if (this.loadMCPServers) {
          await this.orchestrator.loadMCPServers();
        }
      }

      // Resume conversation if ID provided (Feature: 005, T015)
      if (this.resumeConversationId && this.conversationStore) {
        await this.loadConversation();
      }

      // Create new conversation if not resuming (or resume failed)
      if (!this.conversation) {
        // When orchestrator is available, get tools from it; otherwise use registry directly
        const toolDescriptions = this.orchestrator
          ? this.getOrchestratorToolDescriptions()
          : this.toolRegistry.getDescriptions();

        const systemPrompt = this.promptLoader.getPrompt({
          TOOL_DESCRIPTIONS: toolDescriptions,
          KEY_FACTS: this.keyFactStore.getContextString(),
          CURRENT_CONTEXT: generateCurrentContext(),
        });

        this.conversation = new ConversationManager(systemPrompt);
      }

      // Start file watcher if configured (Feature: 003)
      if (this.watcherService && this.autoStartWatcher) {
        await this.watcherService.start();
      }

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

        // Prepare request with tools (from orchestrator if available)
        const tools = this.getToolDefinitions();
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
          const args = parseToolArguments(toolCall.function.arguments);

          // Notify about tool call
          if (this.onToolCall) {
            this.onToolCall(toolCall.function.name, args);
          }

          // Execute through orchestrator if available, otherwise use registry directly
          const result = await this.executeToolCall(
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
   * - Save conversation to storage (Feature: 005)
   * - Clean up resources
   *
   * @param options - Options for closing the session
   * @param options.skipSummary - Skip LLM summary generation (faster for signal handlers)
   */
  async close(options: { skipSummary?: boolean } = {}): Promise<void> {
    if (this.state === 'closed') {
      return;
    }

    this.state = 'terminating';

    try {
      // Stop file watcher if running (Feature: 003)
      if (this.watcherService?.isRunning()) {
        await this.watcherService.stop();
      }

      // Log conversation to Obsidian
      if (this.conversation && this.conversation.getMessageCount() > 1) {
        await this.logConversation(options.skipSummary);
      }

      // Save conversation to storage (Feature: 005, T016)
      if (this.conversationStore && !options.skipSummary) {
        await this.saveConversation();
      }
    } catch (error) {
      // Log error but don't throw - we want to close gracefully
      console.error('Failed to log conversation:', error);
    } finally {
      // Ensure lock is released even on error (Feature: 005)
      if (this.conversationLockAcquired && this.conversationStore && this.conversation) {
        try {
          await this.conversationStore.releaseLock(this.conversation.getId());
        } catch {
          // Ignore lock release errors
        }
        this.conversationLockAcquired = false;
      }
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
   * Generate a brief summary of the session for the daily log
   *
   * Returns null if the conversation is too short or if generation fails.
   */
  private async generateSessionSummary(): Promise<string | null> {
    if (!this.conversation) return null;

    // Get user/assistant messages only (skip system, tool messages)
    const messages = this.conversation.getMessages();
    const relevantMessages = messages.filter(
      (m) => m.role === 'user' || m.role === 'assistant'
    );

    // Skip summary for very short sessions
    if (relevantMessages.length < 2) {
      return null;
    }

    try {
      // Format messages, truncating long content
      const formatted = relevantMessages
        .map((m) => {
          const role = m.role === 'user' ? 'User' : 'Assistant';
          const content =
            m.content.length > 1000
              ? m.content.substring(0, 1000) + '...'
              : m.content;
          return `${role}: ${content}`;
        })
        .join('\n\n');

      // Generate summary
      const summaryMessages: Message[] = [
        {
          role: 'system',
          content:
            'You are summarizing a conversation for a daily activity log. Create a brief summary (2-4 sentences) that captures what was discussed or accomplished, any actions taken or decisions made, and key outcomes. Be concise and factual. Write in past tense. Do not include greetings.',
        },
        {
          role: 'user',
          content: `Summarize this conversation for a daily log:\n\n${formatted}\n\nSummary:`,
        },
      ];

      const request = {
        model: this.config.ollama.model,
        messages: summaryMessages,
        stream: false,
      };

      const response = await this.ollamaClient.chatComplete(request);
      return response.message.content.trim();
    } catch (error) {
      // Log error but don't fail - summary is optional
      console.error(
        '[Session] Failed to generate session summary:',
        error instanceof Error ? error.message : error
      );
      return null;
    }
  }

  /**
   * Log the conversation to Obsidian daily log
   *
   * @param skipSummary - Skip LLM summary generation (faster for signal handlers)
   */
  private async logConversation(skipSummary = false): Promise<void> {
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

    // Generate LLM summary of the conversation (skip on forced shutdown)
    const sessionSummary = skipSummary
      ? null
      : await this.generateSessionSummary();

    // Build activity text
    let activity = `Chat session with DIANA (${messageCount} messages, ${duration} min)`;
    if (sessionSummary) {
      activity += `\n\n${sessionSummary}`;
    }

    await this.obsidianWriter.writeDaily({
      activity,
      title: 'DIANA Conversation',
    });
  }

  /**
   * Get tool descriptions from orchestrator (Feature: 004)
   * Converts Ollama tool definitions to markdown descriptions
   */
  private getOrchestratorToolDescriptions(): string {
    if (!this.orchestrator) {
      return this.toolRegistry.getDescriptions();
    }

    const tools = this.orchestrator.getAllToolDefinitions();
    if (tools.length === 0) {
      return 'No tools available.';
    }

    return tools
      .map((tool) => {
        const params = Object.entries(tool.function.parameters.properties || {})
          .map(([name, prop]) => {
            const typedProp = prop as { type: string; description?: string };
            return `  - ${name} (${typedProp.type}): ${typedProp.description || 'No description'}`;
          })
          .join('\n');

        return `### ${tool.function.name}\n${tool.function.description}\n\n**Parameters:**\n${params || '  None'}`;
      })
      .join('\n\n');
  }

  /**
   * Execute a tool, routing through orchestrator if available (Feature: 004)
   */
  private async executeToolCall(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<import('../types/agent.js').ToolResult> {
    if (this.orchestrator) {
      return this.orchestrator.execute(toolName, args);
    }
    return this.toolRegistry.execute(toolName, args);
  }

  /**
   * Get tool definitions for LLM, from orchestrator if available (Feature: 004)
   */
  private getToolDefinitions(): import('../types/agent.js').OllamaToolDefinition[] {
    if (this.orchestrator) {
      return this.orchestrator.getAllToolDefinitions();
    }
    return this.toolRegistry.getToolDefinitions();
  }

  // ===========================================================================
  // Conversation Persistence Methods (Feature: 005)
  // ===========================================================================

  /**
   * Check if conversation has minimum content for saving
   * At least one user message and one assistant message (T017)
   */
  private hasMinimumContent(): boolean {
    if (!this.conversation) return false;

    const messages = this.conversation.getMessages();
    const hasUser = messages.some((m) => m.role === 'user');
    const hasAssistant = messages.some((m) => m.role === 'assistant');

    return hasUser && hasAssistant;
  }

  /**
   * Generate title and summary for a conversation using LLM (T012)
   */
  private async generateTitleAndSummary(): Promise<TitleSummaryResult> {
    if (!this.conversation) {
      return { title: 'Untitled Conversation', summary: '' };
    }

    const messages = this.conversation.getMessages();
    const relevantMessages = messages.filter(
      (m) => m.role === 'user' || m.role === 'assistant'
    );

    if (relevantMessages.length < 2) {
      return { title: 'Untitled Conversation', summary: '' };
    }

    try {
      // Format messages, truncating long content
      const formatted = relevantMessages
        .slice(0, 10) // Only use first 10 messages for title/summary
        .map((m) => {
          const role = m.role === 'user' ? 'User' : 'Assistant';
          const content =
            m.content.length > 500
              ? m.content.substring(0, 500) + '...'
              : m.content;
          return `${role}: ${content}`;
        })
        .join('\n\n');

      const prompt: Message[] = [
        {
          role: 'system',
          content: `You are generating metadata for a conversation log. Respond ONLY with valid JSON, no other text.

Generate a title and summary for the following conversation.
- Title: A brief, descriptive title (max 50 characters)
- Summary: A 2-4 sentence summary of what was discussed

Respond with JSON in this exact format:
{"title": "...", "summary": "..."}`,
        },
        {
          role: 'user',
          content: formatted,
        },
      ];

      const response = await this.ollamaClient.chatComplete({
        model: this.config.ollama.model,
        messages: prompt,
        stream: false,
      });

      const responseText = response.message.content.trim();

      // Try to parse JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as TitleSummaryResult;
        return {
          title: (parsed.title || 'Untitled Conversation').slice(0, 50),
          summary: parsed.summary || '',
        };
      }

      // Fallback if no valid JSON
      return { title: 'Untitled Conversation', summary: responseText.slice(0, 500) };
    } catch (error) {
      console.warn(
        '[Session] Failed to generate title/summary:',
        error instanceof Error ? error.message : error
      );
      // Fallback: use first user message as title
      const firstUserMsg = relevantMessages.find((m) => m.role === 'user');
      const title = firstUserMsg
        ? firstUserMsg.content.slice(0, 47) + '...'
        : 'Untitled Conversation';
      return { title, summary: '' };
    }
  }

  /**
   * Load a conversation from storage and restore state (T013)
   */
  private async loadConversation(): Promise<void> {
    if (!this.conversationStore || !this.resumeConversationId) {
      return;
    }

    // Load conversation from store
    const serialized = await this.conversationStore.loadConversation(
      this.resumeConversationId
    );

    if (!serialized) {
      console.warn(
        `[Session] Conversation ${this.resumeConversationId} not found, starting fresh`
      );
      return;
    }

    // Acquire lock on the conversation (FR-019)
    const lockResult = await this.conversationStore.acquireLock(
      this.resumeConversationId
    );

    if (!lockResult.success) {
      // Display lock holder info (FR-022)
      if (lockResult.holder) {
        console.error(
          `[Session] Conversation is locked by process ${lockResult.holder.pid} on ${lockResult.holder.hostname} since ${lockResult.holder.acquiredAt.toISOString()}`
        );
      }
      throw createAgentError(
        'AGENT_UNAVAILABLE',
        `Cannot resume conversation: already in use by another session`
      );
    }

    this.conversationLockAcquired = true;

    // Convert serialized state to SerializableConversationState
    const state: SerializableConversationState = {
      id: serialized.id,
      messages: serialized.messages,
      startedAt: serialized.startedAt,
      lastActivity: serialized.lastActivity,
      tokenEstimate: serialized.tokenEstimate,
      summarizedAt: serialized.summarizedAt,
    };

    // Create ConversationManager from restored state
    this.conversation = createConversationFromState(state);

    console.log(
      `[Session] Resumed conversation "${serialized.title}" (${serialized.messages.length} messages)`
    );
  }

  /**
   * Save conversation to storage (T014)
   */
  private async saveConversation(): Promise<void> {
    if (!this.conversationStore || !this.conversation) {
      return;
    }

    // Skip if no meaningful content
    if (!this.hasMinimumContent()) {
      return;
    }

    try {
      // Generate title and summary
      const { title, summary } = await this.generateTitleAndSummary();

      // Get serializable state
      const state = this.conversation.getSerializableState();

      // Build serialized conversation
      const serialized = {
        id: state.id,
        title,
        summary,
        startedAt: state.startedAt,
        lastActivity: state.lastActivity,
        messages: state.messages,
        tokenEstimate: state.tokenEstimate,
        summarizedAt: state.summarizedAt,
      };

      // Save to store
      await this.conversationStore.saveConversation(serialized);

      console.log(`[Session] Saved conversation "${title}"`);
    } catch (error) {
      // Log but don't throw - saving is best-effort
      console.error(
        '[Session] Failed to save conversation:',
        error instanceof Error ? error.message : error
      );
    } finally {
      // Release lock if we acquired one
      if (this.conversationLockAcquired && this.conversation) {
        await this.conversationStore.releaseLock(this.conversation.getId());
        this.conversationLockAcquired = false;
      }
    }
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
