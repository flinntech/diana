/**
 * Conversations Command
 *
 * Feature: 005-conversation-persistence
 * Date: 2025-12-13
 *
 * List, show, and delete saved conversations.
 */

import chalk from 'chalk';
import { formatDistanceToNow, format } from 'date-fns';
import { config } from '../config/diana.config.js';
import { createConversationStore } from '../conversations/index.js';

// =============================================================================
// List Conversations (T023, T026, T027)
// =============================================================================

/**
 * List all saved conversations
 */
export async function listConversations(options: { verbose?: boolean } = {}): Promise<void> {
  const conversationsConfig = config.conversations;
  if (!conversationsConfig) {
    console.log(chalk.red('Conversation persistence is not configured.'));
    return;
  }

  const store = createConversationStore(conversationsConfig);
  const conversations = await store.list();

  // Handle empty conversations case (T026)
  if (conversations.length === 0) {
    console.log('');
    console.log(chalk.yellow('No saved conversations found.'));
    console.log('');
    console.log(chalk.dim('Start a chat session with `diana chat` and your conversations'));
    console.log(chalk.dim('will be automatically saved when you exit.'));
    console.log('');
    console.log(chalk.dim('Resume a conversation with `diana chat --resume`'));
    console.log('');
    return;
  }

  console.log('');
  console.log(chalk.bold(`Saved Conversations (${conversations.length})`));
  console.log('');

  // Table header
  if (options.verbose) {
    console.log(
      chalk.dim('ID                                   ') +
      chalk.dim('Title                                ') +
      chalk.dim('Last Activity    ') +
      chalk.dim('Messages')
    );
    console.log(chalk.dim('─'.repeat(100)));
  }

  // List conversations (T027 - format relative timestamps)
  for (const conv of conversations) {
    const lastActivity = new Date(conv.lastActivity);
    const relativeTime = formatDistanceToNow(lastActivity, { addSuffix: true });

    if (options.verbose) {
      // Verbose format: full ID and details
      const title = conv.title.slice(0, 36).padEnd(36);
      console.log(
        chalk.cyan(conv.id) + ' ' +
        chalk.white(title) + ' ' +
        chalk.dim(relativeTime.padEnd(16)) + ' ' +
        chalk.yellow(String(conv.messageCount))
      );
    } else {
      // Compact format: short ID and title
      const shortId = conv.id.slice(0, 8);
      console.log(
        chalk.cyan(shortId) + ' ' +
        chalk.white(conv.title) + ' ' +
        chalk.dim(`(${relativeTime})`)
      );
    }
  }

  console.log('');
  console.log(chalk.dim(`Resume with: diana chat --resume <id>`));
  console.log(chalk.dim(`Show details: diana conversations show <id>`));
  console.log('');
}

// =============================================================================
// Show Conversation (T024)
// =============================================================================

/**
 * Show details of a specific conversation
 */
export async function showConversation(conversationId: string): Promise<void> {
  const conversationsConfig = config.conversations;
  if (!conversationsConfig) {
    console.log(chalk.red('Conversation persistence is not configured.'));
    return;
  }

  const store = createConversationStore(conversationsConfig);

  // Find conversation by full ID or prefix
  const conversations = await store.list();
  const match = conversations.find(
    (c) => c.id === conversationId || c.id.startsWith(conversationId)
  );

  if (!match) {
    console.log(chalk.red(`\nConversation "${conversationId}" not found.\n`));
    console.log(chalk.dim('Use `diana conversations list` to see available conversations.'));
    console.log('');
    return;
  }

  // Load full conversation
  const conversation = await store.loadConversation(match.id);
  if (!conversation) {
    console.log(chalk.red(`\nFailed to load conversation "${match.id}".\n`));
    return;
  }

  // Display header
  console.log('');
  console.log(chalk.bold.magenta('╔════════════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.magenta('║') + chalk.bold(` ${conversation.title}`.padEnd(72)) + chalk.bold.magenta('║'));
  console.log(chalk.bold.magenta('╚════════════════════════════════════════════════════════════════════════╝'));
  console.log('');

  // Metadata
  console.log(chalk.dim('ID:       ') + chalk.cyan(conversation.id));
  console.log(chalk.dim('Started:  ') + format(new Date(conversation.startedAt), 'PPpp'));
  console.log(chalk.dim('Updated:  ') + format(new Date(conversation.lastActivity), 'PPpp'));
  console.log(chalk.dim('Messages: ') + chalk.yellow(String(conversation.messages.length)));
  console.log('');

  if (conversation.summary) {
    console.log(chalk.dim('Summary:'));
    console.log(chalk.italic(conversation.summary));
    console.log('');
  }

  console.log(chalk.dim('─'.repeat(72)));
  console.log('');

  // Display messages
  for (const msg of conversation.messages) {
    if (msg.role === 'system') {
      continue; // Skip system messages in display
    }

    if (msg.role === 'user') {
      console.log(chalk.cyan('You: ') + msg.content);
    } else if (msg.role === 'assistant') {
      // Remove thinking tags from assistant messages
      const cleanContent = msg.content
        .replace(/<think>[\s\S]*?<\/think>/g, '')
        .trim();
      if (cleanContent) {
        console.log(chalk.magenta('DIANA: ') + cleanContent);
      }
    } else if (msg.role === 'tool') {
      console.log(chalk.yellow(`[Tool ${msg.name}]: `) + chalk.dim(msg.content.slice(0, 100) + '...'));
    }
    console.log('');
  }

  console.log(chalk.dim('─'.repeat(72)));
  console.log('');
  console.log(chalk.dim(`Resume this conversation: diana chat --resume ${conversation.id.slice(0, 8)}`));
  console.log('');
}

// =============================================================================
// Delete Conversation (T028-T031 - implemented in Phase 5)
// =============================================================================

/**
 * Delete a conversation
 */
export async function deleteConversation(conversationId: string, options: { force?: boolean } = {}): Promise<void> {
  const conversationsConfig = config.conversations;
  if (!conversationsConfig) {
    console.log(chalk.red('Conversation persistence is not configured.'));
    return;
  }

  const store = createConversationStore(conversationsConfig);

  // Find conversation by full ID or prefix
  const conversations = await store.list();
  const match = conversations.find(
    (c) => c.id === conversationId || c.id.startsWith(conversationId)
  );

  if (!match) {
    console.log(chalk.red(`\nConversation "${conversationId}" not found.\n`));
    console.log(chalk.dim('Use `diana conversations list` to see available conversations.'));
    console.log('');
    return;
  }

  // Check if conversation is locked (T031)
  const lock = await store.isLocked(match.id);
  if (lock) {
    console.log(chalk.red(`\nCannot delete: conversation is in use by process ${lock.pid}.\n`));
    return;
  }

  // Confirm deletion unless --force
  if (!options.force) {
    console.log('');
    console.log(chalk.yellow(`About to delete conversation:`));
    console.log(chalk.cyan(`  ${match.title}`));
    console.log(chalk.dim(`  ID: ${match.id}`));
    console.log('');
    console.log(chalk.dim('Use --force to skip this confirmation.'));
    console.log('');

    // For now, without interactive confirmation, just require --force
    console.log(chalk.red('Deletion cancelled. Use --force to confirm.'));
    return;
  }

  // Delete the conversation
  const deleted = await store.delete(match.id);
  if (deleted) {
    console.log(chalk.green(`\nDeleted conversation: ${match.title}\n`));
  } else {
    console.log(chalk.red(`\nFailed to delete conversation.\n`));
  }
}
