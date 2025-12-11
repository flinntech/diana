/**
 * Status Command
 *
 * Feature: 002-llm-agent-core
 * Date: 2025-12-10
 *
 * Health check command showing Ollama/model/vault status.
 */

import chalk from 'chalk';
import { access, constants } from 'fs/promises';
import { OllamaClient } from '../llm/client.js';
import { SystemPromptLoader } from '../agent/prompt.js';
import { ToolRegistry } from '../agent/tools.js';
import { registerObsidianTools } from '../agent/tools/obsidian.js';
import { config } from '../config/diana.config.js';
import type { StatusResult } from '../types/agent.js';

// =============================================================================
// Status Check Functions
// =============================================================================

/**
 * Check if a path is accessible
 */
async function checkPathAccessible(path: string): Promise<boolean> {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get comprehensive status of DIANA components
 */
export async function getStatus(): Promise<StatusResult> {
  const ollamaClient = new OllamaClient(config.ollama);
  const promptLoader = new SystemPromptLoader(config.systemPromptPath);

  // Check Ollama connection
  const ollamaAvailable = await ollamaClient.healthCheck();

  // Check model availability
  let modelAvailable = false;
  if (ollamaAvailable) {
    modelAvailable = await ollamaClient.hasModel(config.ollama.model);
  }

  // Check vault accessibility
  const vaultAccessible = await checkPathAccessible(config.obsidian.vaultPath);

  // Check system prompt
  let promptLoaded = false;
  try {
    await promptLoader.load();
    promptLoaded = true;
  } catch {
    promptLoaded = false;
  }

  // Get registered tools
  const toolRegistry = new ToolRegistry();
  registerObsidianTools(toolRegistry, config.obsidian);
  const tools = toolRegistry.getNames();

  // Determine overall status
  const isOk = ollamaAvailable && modelAvailable && vaultAccessible && promptLoaded;

  return {
    status: isOk ? 'ok' : 'error',
    ollama: {
      available: ollamaAvailable,
      host: config.ollama.host ?? 'localhost',
      port: config.ollama.port ?? 11434,
    },
    model: {
      name: config.ollama.model,
      available: modelAvailable,
    },
    vault: {
      accessible: vaultAccessible,
      path: config.obsidian.vaultPath,
    },
    systemPrompt: {
      loaded: promptLoaded,
      path: config.systemPromptPath,
    },
    tools,
  };
}

/**
 * Format and print status to console
 */
export function printStatus(status: StatusResult): void {
  console.log(chalk.bold('\nDIANA Status'));
  console.log('============');

  // Ollama
  const ollamaStatus = status.ollama.available
    ? chalk.green('✓ Connected')
    : chalk.red('✗ Unavailable');
  console.log(
    `Ollama:        ${ollamaStatus} (${status.ollama.host}:${status.ollama.port})`
  );

  // Model
  const modelStatus = status.model.available
    ? chalk.green('✓ Available')
    : chalk.red('✗ Not found');
  console.log(`Model:         ${modelStatus} (${status.model.name})`);

  // Vault
  const vaultStatus = status.vault.accessible
    ? chalk.green('✓ Accessible')
    : chalk.red('✗ Not accessible');
  console.log(`Vault:         ${vaultStatus}`);
  console.log(`               ${chalk.dim(status.vault.path)}`);

  // System Prompt
  const promptStatus = status.systemPrompt.loaded
    ? chalk.green('✓ Loaded')
    : chalk.red('✗ Not found');
  console.log(`System Prompt: ${promptStatus}`);
  console.log(`               ${chalk.dim(status.systemPrompt.path)}`);

  // Tools
  if (status.tools.length > 0) {
    console.log(`Tools:         ${status.tools.length} registered`);
    for (const tool of status.tools) {
      console.log(`               - ${tool}`);
    }
  } else {
    console.log(`Tools:         ${chalk.dim('None registered')}`);
  }

  // Overall status
  console.log('');
  if (status.status === 'ok') {
    console.log(chalk.green('Status: OK - DIANA is ready'));
  } else {
    console.log(chalk.red('Status: ERROR - Some components are unavailable'));

    // Provide helpful messages
    if (!status.ollama.available) {
      console.log(chalk.yellow('\nTo start Ollama: ollama serve'));
    }
    if (status.ollama.available && !status.model.available) {
      console.log(chalk.yellow(`\nTo pull model: ollama pull ${status.model.name}`));
    }
    if (!status.vault.accessible) {
      console.log(chalk.yellow('\nCheck vault path in diana.config.ts'));
    }
    if (!status.systemPrompt.loaded) {
      console.log(chalk.yellow('\nSystem prompt file not found at configured path'));
    }
  }
  console.log('');
}

/**
 * Execute the status command
 */
export async function statusCommand(): Promise<void> {
  const status = await getStatus();
  printStatus(status);

  // Exit with error code if not OK
  if (status.status !== 'ok') {
    process.exitCode = 1;
  }
}
