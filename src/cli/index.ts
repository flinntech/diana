#!/usr/bin/env node
/**
 * DIANA CLI Entry Point
 *
 * Feature: 002-llm-agent-core
 * Date: 2025-12-10
 *
 * Command-line interface for DIANA using Commander.js.
 */

import { Command } from 'commander';
import { statusCommand } from './status.js';
import { chatCommand } from './chat.js';
import { askCommand } from './ask.js';
import { watchCommand } from './watch.js';

// =============================================================================
// CLI Setup
// =============================================================================

const program = new Command();

program
  .name('diana')
  .description('DIANA - Digital Intelligence And Neural Architecture')
  .version('1.0.0');

// Status command
program
  .command('status')
  .description('Check DIANA health status (Ollama, model, vault)')
  .action(statusCommand);

// Chat command
program
  .command('chat')
  .description('Start an interactive chat session with DIANA')
  .option('-d, --debug', 'Enable debug output')
  .option('-t, --show-thinking', 'Show full thinking output (default: collapsed)')
  .action(chatCommand);

// Ask command
program
  .command('ask <query>')
  .description('Ask DIANA a quick question')
  .option('-d, --debug', 'Enable debug output')
  .option('-f, --format <format>', 'Output format (text or json)', 'text')
  .action(askCommand);

// Watch command (daemon mode)
program
  .command('watch')
  .description('Run file watcher daemon (monitors directories for new files)')
  .option('-d, --debug', 'Enable debug output')
  .action(watchCommand);

// Parse arguments and execute
program.parse();
