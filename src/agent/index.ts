/**
 * Agent Module Exports
 *
 * Feature: 002-llm-agent-core, 004-agent-mcp-foundation
 * Date: 2025-12-10, Updated: 2025-12-12
 */

// === 002-llm-agent-core exports ===

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

// === 004-agent-mcp-foundation exports ===

// Agent types
export type {
  AgentState,
  ToolDefinition,
  AgentManifest,
  Agent,
  AgentFactory,
  IOrchestrator,
  AgentEntry,
  MCPServerConfig,
  MCPServersConfig,
  MCPConnectionStatus,
  MCPConnectionState,
  IMCPClientManager,
  AgentHealthStatus,
  AgentHealth,
  OrchestratorMetricsData,
  IOrchestratorMetrics,
  AgentEventType,
  AgentLogEntry,
  IAgentLogger,
} from './types/index.js';

// Agent errors
export {
  AgentSystemError,
  createInitError,
  createShutdownError,
  createAgentNotFoundError,
  createAgentUnavailableError,
  createTimeoutError,
  createToolNotFoundError,
  createMCPConnectionError,
  createMCPDiscoveryError,
  createMCPUnavailableError,
  isAgentSystemError,
  getErrorCode,
} from './errors.js';

// Metrics
export { OrchestratorMetrics } from './metrics.js';

// Logger
export { AgentLogger, generateCorrelationId } from './logger.js';

// Timeout utilities
export {
  DEFAULT_TOOL_TIMEOUT_MS,
  DEFAULT_MCP_TIMEOUT_MS,
  DEFAULT_SHUTDOWN_TIMEOUT_MS,
  ROUTING_OVERHEAD_LIMIT_MS,
  withTimeout,
  createTimeoutController,
  delay,
  withTimeoutAll,
  withRetry,
} from './utils/timeout.js';

// Orchestrator
export { Orchestrator } from './orchestrator.js';

// LegacyToolAgent
export { LegacyToolAgent } from './legacy-tool-agent.js';

// MCPClientManager
export { MCPClientManager, loadMCPConfigs } from './mcp-client-manager.js';

// MCPAgent
export { MCPAgent, createMCPAgentFactory } from './mcp-agent.js';
