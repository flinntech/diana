/**
 * Watch Command
 *
 * Feature: 003-file-watcher-proposals
 * Date: 2025-12-11
 *
 * Run the file watcher as a background daemon.
 * Monitors configured directories and creates organization proposals.
 */

import chalk from 'chalk';
import { config } from '../config/diana.config.js';
import { createProposalService } from '../proposals/index.js';
import { createWatcherService } from '../watcher/index.js';
import { ObsidianWriter } from '../obsidian/index.js';

// =============================================================================
// Types
// =============================================================================

export interface WatchCommandOptions {
  debug?: boolean;
}

// =============================================================================
// Watch Command
// =============================================================================

/**
 * Execute the watch command - runs file watcher as a daemon
 */
export async function watchCommand(options: WatchCommandOptions = {}): Promise<void> {
  const { debug = false } = options;

  const watcherConfig = config.watcher;
  if (!watcherConfig) {
    console.error(chalk.red('Error: Watcher not configured in diana.config.ts'));
    process.exitCode = 1;
    return;
  }

  // Create services
  const proposalService = createProposalService(watcherConfig.proposalStorePath, {
    cooldownHours: watcherConfig.cooldownHours,
  });

  const watcherService = createWatcherService(watcherConfig, proposalService);

  // Set up Obsidian writer for audit logging
  if (config.obsidian) {
    const obsidianWriter = new ObsidianWriter(config.obsidian);
    proposalService.setObsidianWriter(obsidianWriter);
    watcherService.setObsidianWriter(obsidianWriter);
  }

  // Track state
  let isShuttingDown = false;
  let proposalCount = 0;

  // Handle shutdown signals
  const handleSignal = async (signal: string) => {
    if (isShuttingDown) {
      console.log(chalk.yellow('\nForce shutdown...'));
      process.exit(1);
    }
    isShuttingDown = true;

    console.log(chalk.dim(`\n[${signal}] Shutting down...`));

    try {
      await watcherService.stop();
      await proposalService.shutdown();
      console.log(chalk.green('Shutdown complete.'));
    } catch (error) {
      console.error(chalk.red('Error during shutdown:'), error);
    }

    process.exit(0);
  };

  process.on('SIGINT', () => handleSignal('SIGINT'));
  process.on('SIGTERM', () => handleSignal('SIGTERM'));

  try {
    // Initialize proposal service
    if (debug) {
      console.log(chalk.dim('[DEBUG] Initializing proposal service...'));
    }
    await proposalService.initialize();

    // Set up event handlers for logging
    watcherService.on('file:detected', (path: string) => {
      if (debug) {
        console.log(chalk.dim(`[DETECTED] ${path}`));
      }
    });

    watcherService.on('file:stable', (path: string) => {
      if (debug) {
        console.log(chalk.dim(`[STABLE] ${path}`));
      }
    });

    watcherService.on('file:analyzed', (analysis: { path: string; suggestedCategory: string }) => {
      proposalCount++;
      console.log(
        chalk.green(`[PROPOSAL #${proposalCount}]`),
        chalk.white(analysis.path.split('/').pop()),
        chalk.dim(`-> ${analysis.suggestedCategory}`)
      );
    });

    watcherService.on('file:error', (path: string, error: Error) => {
      console.error(chalk.red(`[ERROR] ${path}:`), error.message);
    });

    // Start the watcher
    await watcherService.start();

    // Print banner
    console.log('');
    console.log(chalk.bold.magenta('DIANA File Watcher'));
    console.log(chalk.dim('─'.repeat(40)));
    console.log('');

    const dirs = watcherService.getWatchedDirectories().filter((d) => d.enabled);
    console.log(chalk.cyan('Watching directories:'));
    for (const dir of dirs) {
      console.log(chalk.dim(`  - ${dir.path}`));
    }
    console.log('');

    const pendingCount = proposalService.getByStatus('pending').length;
    if (pendingCount > 0) {
      console.log(chalk.yellow(`Pending proposals: ${pendingCount}`));
      console.log(chalk.dim('Run "diana proposals" to review them.'));
      console.log('');
    }

    console.log(chalk.dim('Press Ctrl+C to stop.'));
    console.log('');

    // Keep the process alive
    // The watcher will emit events as files are detected
    await new Promise(() => {
      // Never resolves - keeps running until signal
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red(`\nFailed to start watcher: ${errorMessage}`));

    if (debug && error instanceof Error && error.stack) {
      console.log(chalk.dim(error.stack));
    }

    process.exitCode = 1;
  }
}
