/**
 * Ask Command
 *
 * Feature: 002-llm-agent-core
 * Date: 2025-12-10
 *
 * One-shot query command for quick questions to DIANA.
 */

import chalk from 'chalk';
import { Session } from '../agent/session.js';
import { config } from '../config/diana.config.js';
import type { AskCommandOptions } from '../types/agent.js';

// =============================================================================
// Ask Command
// =============================================================================

/**
 * Execute the ask command
 */
export async function askCommand(
  query: string,
  options: AskCommandOptions = {}
): Promise<void> {
  const { debug = false, format = 'text' } = options;

  if (!query || query.trim().length === 0) {
    console.log(chalk.red('Error: Please provide a query.'));
    console.log('');
    console.log(chalk.dim('Usage: diana ask "your question here"'));
    process.exitCode = 1;
    return;
  }

  // Create session
  const session = new Session(config);

  try {
    // Initialize session
    if (debug) {
      console.log(chalk.dim('[DEBUG] Initializing session...'));
    }

    await session.initialize();

    if (debug) {
      console.log(chalk.dim('[DEBUG] Session initialized, sending query...'));
    }

    // Collect response
    let fullResponse = '';

    if (format === 'json') {
      // JSON format - collect full response before outputting
      for await (const chunk of session.sendMessage(query)) {
        fullResponse += chunk;
      }

      const result = {
        query,
        response: fullResponse,
        timestamp: new Date().toISOString(),
      };

      console.log(JSON.stringify(result, null, 2));
    } else {
      // Text format - stream to stdout
      for await (const chunk of session.sendMessage(query)) {
        fullResponse += chunk;
        process.stdout.write(chunk);
      }
      console.log(''); // New line after response
    }

    // Close session (logs conversation to Obsidian)
    await session.close();

    if (debug) {
      console.log(chalk.dim('[DEBUG] Session closed, conversation logged'));
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    if (format === 'json') {
      const result = {
        query,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.red(`Error: ${errorMessage}`));

      // Provide helpful messages for common errors
      if (errorMessage.includes('Cannot connect to Ollama')) {
        console.log('');
        console.log(chalk.yellow('To start Ollama: ollama serve'));
      } else if (errorMessage.includes('not found')) {
        console.log('');
        console.log(
          chalk.yellow(`To pull the model: ollama pull ${config.ollama.model}`)
        );
      }

      if (debug && error instanceof Error && error.stack) {
        console.log('');
        console.log(chalk.dim(error.stack));
      }
    }

    process.exitCode = 1;
  }
}
