/**
 * Agent Module Exports
 *
 * Feature: 002-llm-agent-core
 * Date: 2025-12-10
 */

// Prompt loader
export { SystemPromptLoader, createPromptLoader, type PromptVariables } from './prompt.js';

// Conversation manager
export { ConversationManager, createConversation } from './conversation.js';

// Session
export {
  Session,
  createSession,
  type SessionOptions,
  type ToolCallHandler,
} from './session.js';

// Tool registry
export { ToolRegistry, createToolRegistry } from './tools.js';

// Key fact store (cross-session memory)
export { KeyFactStore, createKeyFactStore } from './memory.js';

// Obsidian tools
export {
  createWriteDailyNoteTool,
  createReadDailyNoteTool,
  createWriteObservationTool,
  registerObsidianTools,
} from './tools/obsidian.js';

// Memory tools
export {
  createSaveFactTool,
  registerMemoryTools,
} from './tools/memory.js';
