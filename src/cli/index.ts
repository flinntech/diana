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
import { listConversations, showConversation, deleteConversation } from './conversations.js';

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
  .option('-r, --resume [id]', 'Resume a previous conversation (shows picker if no ID)')
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

// Conversations subcommand (Feature: 005-conversation-persistence)
const conversationsCmd = program
  .command('conversations')
  .description('Manage saved conversations');

conversationsCmd
  .command('list')
  .description('List all saved conversations')
  .option('-v, --verbose', 'Show full conversation IDs and details')
  .action(listConversations);

conversationsCmd
  .command('show <id>')
  .description('Show details of a specific conversation')
  .action(showConversation);

conversationsCmd
  .command('delete <id>')
  .description('Delete a conversation')
  .option('-f, --force', 'Skip confirmation')
  .action(deleteConversation);

// Parse arguments and execute
program.parse();
