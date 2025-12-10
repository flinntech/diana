/**
 * DIANA Configuration
 *
 * Feature: 001-obsidian-integration
 */

import type { ObsidianWriterConfig } from '../types/obsidian.js';

/**
 * Default Obsidian writer configuration
 */
export const obsidianConfig: ObsidianWriterConfig = {
  // Path to the Obsidian vault
  vaultPath: '/mnt/c/Users/joshu/Obsidian/DIANA/DIANA_brain',

  // Fallback log location when vault unavailable
  fallbackLogPath: '/home/diana/logs',

  // Date format for daily log filenames
  dateFormat: 'yyyy-MM-dd',

  // Maximum retries for write operations
  maxRetries: 3,

  // Lock timeout in milliseconds
  lockTimeout: 10000,
};

/**
 * Full DIANA configuration
 */
export interface DianaConfig {
  obsidian: ObsidianWriterConfig;
}

/**
 * Default configuration
 */
export const config: DianaConfig = {
  obsidian: obsidianConfig,
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
  };
}

export default config;
