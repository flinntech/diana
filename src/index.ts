/**
 * DIANA - Digital Intelligence And Neural Architecture
 *
 * Main entry point
 */

// Obsidian integration (001-obsidian-integration)
export * from './obsidian/index.js';

// Configuration
export { config, createConfig, obsidianConfig, ollamaConfig } from './config/diana.config.js';
export type { DianaConfig } from './config/diana.config.js';

// LLM client (002-llm-agent-core)
export * from './llm/index.js';

// Agent module (002-llm-agent-core)
export * from './agent/index.js';

// Types
export * from './types/agent.js';
