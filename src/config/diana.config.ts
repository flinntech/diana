/**
 * DIANA Configuration
 *
 * Features: 001-obsidian-integration, 002-llm-agent-core, 003-file-watcher-proposals
 */

import type { ObsidianWriterConfig } from '../types/obsidian.js';
import type { OllamaConfig, DianaConfig as DianaConfigType } from '../types/agent.js';
import type { WatcherConfig } from '../types/watcher.js';
import { DEFAULT_WATCHER_CONFIG } from '../types/watcher.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of this config file (works with ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

/**
 * Default Obsidian writer configuration
 */
export const obsidianConfig: ObsidianWriterConfig = {
  // Path to the Obsidian vault
  vaultPath: '/mnt/c/Users/joshu/Obsidian/DIANA/DIANA_brain',

  // Fallback log location when vault unavailable
  fallbackLogPath: process.env.DIANA_FALLBACK_LOG_PATH || `${process.env.HOME}/.diana/logs`,

  // Date format for daily log filenames
  dateFormat: 'yyyy-MM-dd',

  // Maximum retries for write operations
  maxRetries: 3,

  // Lock timeout in milliseconds
  lockTimeout: 10000,
};

/**
 * Default Ollama configuration
 * Supports environment variables for flexible deployment (WSL, PowerShell, etc.)
 */
export const ollamaConfig: OllamaConfig = {
  // Ollama host - use OLLAMA_HOST env var for WSL compatibility
  // In WSL, set: export OLLAMA_HOST=$(ip route | grep default | awk '{print $3}')
  host: process.env.OLLAMA_HOST || 'localhost',

  // Ollama port
  port: parseInt(process.env.OLLAMA_PORT || '11434', 10),

  // Model name (qwen3:30b-a3b for tool calling support)
  model: process.env.OLLAMA_MODEL || 'qwen3:30b-a3b',

  // Context window size (32k for qwen3:30b-a3b)
  contextSize: 32768,

  // Request timeout in milliseconds (2 minutes)
  timeout: 120000,
};

/**
 * Default watcher configuration
 * Feature: 003-file-watcher-proposals
 */
export const watcherConfig: WatcherConfig = {
  ...DEFAULT_WATCHER_CONFIG,
  // Override default proposal store path to be relative to home
  proposalStorePath: process.env.DIANA_PROPOSALS_PATH || `${process.env.HOME}/.diana/proposals.json`,
};

/**
 * Full DIANA configuration
 * Extends with LLM agent settings for 002-llm-agent-core and watcher for 003
 */
export interface DianaConfig extends DianaConfigType {
  watcher?: WatcherConfig;
}

/**
 * Default configuration
 */
export const config: DianaConfig = {
  obsidian: obsidianConfig,
  ollama: ollamaConfig,
  systemPromptPath: path.join(PROJECT_ROOT, 'src/config/system-prompt.md'),
  memoryPath: path.join(obsidianConfig.vaultPath, 'memory/facts.md'),
  watcher: watcherConfig,
};

/**
 * Create a configuration with overrides
 */
export function createConfig(overrides: Partial<DianaConfig> = {}): DianaConfig {
  return {
    obsidian: {
      ...obsidianConfig,
      ...overrides.obsidian,
    },
    ollama: {
      ...ollamaConfig,
      ...overrides.ollama,
    },
    watcher: {
      ...watcherConfig,
      ...overrides.watcher,
    },
    systemPromptPath: overrides.systemPromptPath ?? config.systemPromptPath,
    memoryPath: overrides.memoryPath ?? config.memoryPath,
  };
}

export default config;
