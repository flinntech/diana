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
import { migrateVault, validateVault, rollupWeekly, rollupMonthly } from './vault.js';

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

// Vault subcommand (Feature: 006-obsidian-rich-linking)
const vaultCmd = program
  .command('vault')
  .description('Manage Obsidian vault (migration, validation)');

vaultCmd
  .command('migrate')
  .description('Add backlinks sections to all notes in the vault')
  .option('--dry-run', 'Show what would be changed without making modifications')
  .action(migrateVault);

vaultCmd
  .command('validate')
  .description('Check vault consistency (backlinks match actual references)')
  .option('--repair', 'Fix any inconsistencies found')
  .action(validateVault);

// Rollup subcommand
const rollupCmd = vaultCmd
  .command('rollup')
  .description('Generate knowledge rollup notes');

rollupCmd
  .command('weekly')
  .description('Generate a weekly rollup note')
  .option('--date <date>', 'Generate for a specific week (YYYY-MM-DD, any date in the week)')
  .action(rollupWeekly);

rollupCmd
  .command('monthly')
  .description('Generate a monthly rollup note')
  .option('--date <date>', 'Generate for a specific month (YYYY-MM-DD, any date in the month)')
  .action(rollupMonthly);

// Parse arguments and execute
program.parse();
