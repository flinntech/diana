/**
 * Chat Command
 *
 * Feature: 002-llm-agent-core
 * Date: 2025-12-10
 *
 * Interactive chat session with DIANA.
 */

import * as readline from 'readline/promises';
import chalk from 'chalk';
import { Session } from '../agent/session.js';
import { config } from '../config/diana.config.js';
import type { ChatCommandOptions } from '../types/agent.js';
import { createProposalService } from '../proposals/index.js';
import { createWatcherService } from '../watcher/index.js';
import { ObsidianWriter } from '../obsidian/index.js';

// =============================================================================
// Constants
// =============================================================================

const PROMPT = chalk.cyan('> ');
const DIANA_PREFIX = chalk.magenta('DIANA: ');
const THINKING_PREFIX = chalk.dim.italic('💭 ');
const THINKING_INDICATOR = chalk.dim('💭 thinking...');
const EXIT_COMMANDS = ['/exit', '/quit', '/q'];

// =============================================================================
// Thinking Parser
// =============================================================================

type StreamMode = 'normal' | 'thinking';

interface ThinkingParserOptions {
  /** Show full thinking content (default: false = collapsed) */
  showThinking?: boolean;
}

/**
 * Streaming parser for <think>...</think> tags
 * Handles partial tags across chunk boundaries
 * Supports collapsed mode where thinking is hidden
 */
class ThinkingParser {
  private mode: StreamMode = 'normal';
  private buffer = '';
  private thinkingStarted = false;
  private showThinking: boolean;
  private indicatorShown = false;

  constructor(options: ThinkingParserOptions = {}) {
    this.showThinking = options.showThinking ?? false;
  }

  /**
   * Process a chunk and return formatted output
   */
  process(chunk: string): string {
    this.buffer += chunk;
    let output = '';

    while (this.buffer.length > 0) {
      if (this.mode === 'normal') {
        // Look for opening <think> tag
        const thinkStart = this.buffer.indexOf('<think>');

        if (thinkStart === -1) {
          // No tag found - check if we might have a partial tag at the end
          const partialTagIndex = this.findPartialTag(this.buffer, '<think>');
          if (partialTagIndex !== -1) {
            // Output everything before potential partial tag
            output += this.buffer.slice(0, partialTagIndex);
            this.buffer = this.buffer.slice(partialTagIndex);
            break;
          }
          // No partial tag, output everything
          output += this.buffer;
          this.buffer = '';
        } else {
          // Found opening tag
          output += this.buffer.slice(0, thinkStart);
          this.buffer = this.buffer.slice(thinkStart + 7); // Remove <think>
          this.mode = 'thinking';

          // Start thinking block
          if (!this.thinkingStarted) {
            if (this.showThinking) {
              output += '\n' + THINKING_PREFIX;
            } else if (!this.indicatorShown) {
              // Show collapsed indicator
              output += THINKING_INDICATOR;
              this.indicatorShown = true;
            }
            this.thinkingStarted = true;
          }
        }
      } else {
        // In thinking mode - look for closing </think> tag
        const thinkEnd = this.buffer.indexOf('</think>');

        if (thinkEnd === -1) {
          // No closing tag - check for partial tag
          const partialTagIndex = this.findPartialTag(this.buffer, '</think>');
          if (partialTagIndex !== -1) {
            // Output thinking content only if showing
            if (this.showThinking) {
              output += chalk.dim.italic(this.buffer.slice(0, partialTagIndex));
            }
            this.buffer = this.buffer.slice(partialTagIndex);
            break;
          }
          // Output all as thinking (if showing)
          if (this.showThinking) {
            output += chalk.dim.italic(this.buffer);
          }
          this.buffer = '';
        } else {
          // Found closing tag
          if (this.showThinking) {
            output += chalk.dim.italic(this.buffer.slice(0, thinkEnd));
            output += '\n' + DIANA_PREFIX;
          } else {
            // Clear the indicator line and show prefix
            output += '\r\x1b[K' + DIANA_PREFIX;
          }
          this.buffer = this.buffer.slice(thinkEnd + 8); // Remove </think>
          this.mode = 'normal';
          this.thinkingStarted = false;
        }
      }
    }

    return output;
  }

  /**
   * Find potential partial tag at end of string
   */
  private findPartialTag(str: string, tag: string): number {
    for (let i = 1; i < tag.length; i++) {
      const partial = tag.slice(0, i);
      if (str.endsWith(partial)) {
        return str.length - i;
      }
    }
    return -1;
  }

  /**
   * Reset parser state for new message
   */
  reset(): void {
    this.mode = 'normal';
    this.buffer = '';
    this.thinkingStarted = false;
    this.indicatorShown = false;
  }

  /**
   * Get current mode
   */
  getMode(): StreamMode {
    return this.mode;
  }
}

// =============================================================================
// Chat Command
// =============================================================================

/**
 * Print welcome message
 */
function printWelcome(toolCount: number): void {
  console.log('');
  console.log(chalk.bold.magenta('╔════════════════════════════════════════════╗'));
  console.log(chalk.bold.magenta('║') + chalk.bold('           DIANA Chat Session              ') + chalk.bold.magenta('║'));
  console.log(chalk.bold.magenta('╚════════════════════════════════════════════╝'));
  console.log('');
  console.log(chalk.dim('Type your message and press Enter to send.'));
  console.log(chalk.dim('Commands: /exit, /quit, or Ctrl+C to exit.'));
  if (toolCount > 0) {
    console.log(chalk.dim(`Tools: ${toolCount} available`));
  }
  console.log('');
}

/**
 * Print goodbye message
 */
function printGoodbye(): void {
  console.log('');
  console.log(chalk.magenta('DIANA: ') + 'Goodbye! Your conversation has been logged.');
  console.log('');
}

/**
 * Execute the chat command
 */
export async function chatCommand(options: ChatCommandOptions = {}): Promise<void> {
  const { debug = false, showThinking = false } = options;

  // Track if we need to print prefix before next text
  let needsPrefix = true;

  // Handle tool calls by printing indicator
  const onToolCall = (toolName: string, args: unknown): void => {
    if (needsPrefix) {
      needsPrefix = false;
    }
    console.log('');
    if (debug) {
      console.log(chalk.yellow(`[Using tool: ${toolName}]`), chalk.dim(JSON.stringify(args)));
    } else {
      console.log(chalk.yellow(`[Using tool: ${toolName}]`));
    }
    process.stdout.write(DIANA_PREFIX);
  };

  // Create proposal and watcher services (Feature: 003-file-watcher-proposals)
  const watcherConfig = config.watcher;
  const proposalService = watcherConfig
    ? createProposalService(watcherConfig.proposalStorePath, {
        cooldownHours: watcherConfig.cooldownHours,
      })
    : undefined;

  const watcherService =
    watcherConfig && proposalService
      ? createWatcherService(watcherConfig, proposalService)
      : undefined;

  // Set up Obsidian writer for audit logging (approvals/rejections)
  if (config.obsidian && proposalService) {
    const obsidianWriter = new ObsidianWriter(config.obsidian);
    proposalService.setObsidianWriter(obsidianWriter);
  }

  // Create session with tool call handler and services
  // Note: watcher is NOT auto-started here - it runs as a separate systemd service
  const session = new Session(config, {
    onToolCall,
    proposalService,
    watcherService,
    autoStartWatcher: false,
  });

  // Handle Ctrl+C gracefully
  let isShuttingDown = false;

  const handleSignal = async () => {
    if (isShuttingDown) {
      process.exit(1);
    }
    isShuttingDown = true;
    console.log('');
    await session.close();
    // Shutdown proposal service (Feature: 003)
    if (proposalService) {
      await proposalService.shutdown();
    }
    printGoodbye();
    process.exit(0);
  };

  process.on('SIGINT', handleSignal);
  process.on('SIGTERM', handleSignal);

  try {
    // Initialize services (Feature: 003)
    if (proposalService) {
      if (debug) {
        console.log(chalk.dim('[DEBUG] Initializing proposal service...'));
      }
      await proposalService.initialize();
    }

    // Initialize session
    if (debug) {
      console.log(chalk.dim('[DEBUG] Initializing session...'));
    }

    await session.initialize();

    if (debug) {
      console.log(chalk.dim('[DEBUG] Session initialized successfully'));
      const tools = session.getToolRegistry().getNames();
      console.log(chalk.dim(`[DEBUG] Registered tools: ${tools.join(', ')}`));
    }

    // Print welcome message with tool count
    const toolCount = session.getToolRegistry().size();
    printWelcome(toolCount);

    // Create readline interface
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Thinking parser for formatting <think> tags
    const thinkingParser = new ThinkingParser({ showThinking });

    // Chat loop
    while (true) {
      // Get user input
      const input = await rl.question(PROMPT);
      const trimmedInput = input.trim();

      // Check for exit commands
      if (EXIT_COMMANDS.includes(trimmedInput.toLowerCase())) {
        rl.close();
        await session.close();
        // Shutdown proposal service (Feature: 003)
        if (proposalService) {
          await proposalService.shutdown();
        }
        printGoodbye();
        break;
      }

      // Skip empty input
      if (!trimmedInput) {
        continue;
      }

      // Send message and stream response
      process.stdout.write(DIANA_PREFIX);
      needsPrefix = false;
      thinkingParser.reset();

      try {
        for await (const chunk of session.sendMessage(trimmedInput)) {
          if (debug) {
            // Show raw chunks in debug mode
            process.stdout.write(chalk.dim(`[RAW: ${JSON.stringify(chunk)}]`));
          }
          const formatted = thinkingParser.process(chunk);
          if (formatted) {
            process.stdout.write(formatted);
          }
        }
        console.log(''); // New line after response
        console.log(''); // Extra spacing
        needsPrefix = true;
      } catch (error) {
        console.log('');
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        console.log(chalk.red(`Error: ${errorMessage}`));
        console.log('');
        needsPrefix = true;

        if (debug && error instanceof Error && error.stack) {
          console.log(chalk.dim(error.stack));
        }
      }
    }
  } catch (error) {
    // Handle initialization errors
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.log(chalk.red(`\nFailed to start chat session: ${errorMessage}`));

    if (debug && error instanceof Error && error.stack) {
      console.log(chalk.dim(error.stack));
    }

    console.log('');
    console.log(chalk.yellow('Run "diana status" to check system health.'));
    console.log('');

    process.exitCode = 1;
  }
}
