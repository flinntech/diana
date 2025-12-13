# Quickstart: Conversation Persistence

**Feature**: 005-conversation-persistence
**Date**: 2025-12-13

## Overview

This feature enables DIANA to save and resume conversations across sessions. Conversations are stored locally in `~/.diana/conversations/` as human-readable JSON files.

## User Commands

### Resume a conversation

```bash
# Resume with interactive picker (last 10 conversations)
diana chat --resume

# Resume specific conversation by ID
diana chat --resume 550e8400-e29b-41d4-a716-446655440000
diana chat -r 550e8400
```

### List conversations

```bash
# List all conversations
diana conversations list

# Output:
# ID                                    Title                              Last Activity
# 550e8400-e29b-41d4-a716-446655440000  File organization strategy...     2 hours ago
# 6ba7b810-9dad-11d1-80b4-00c04fd430c8  Setting up Obsidian vault...      Yesterday

# When no conversations exist:
diana conversations list

# Output:
# No saved conversations yet. Start a chat with `diana chat` to create one.
```

### Show conversation

```bash
# Preview conversation without resuming
diana conversations show 550e8400

# Output:
# Title: File organization strategy discussion
# Started: Dec 13, 2025 10:00 AM
# Messages: 24
#
# User: How should I organize my Downloads folder?
# DIANA: I recommend organizing by file type...
# ...
```

### Delete conversation

```bash
# Delete a conversation
diana conversations delete 550e8400

# Output: Deleted conversation "File organization strategy..."
```

## Implementation Checklist

### 1. Create ConversationStore module

```typescript
// src/conversations/conversation.store.ts
import writeFileAtomic from 'write-file-atomic';

export class ConversationStore implements IConversationStore {
  constructor(config: ConversationStoreConfig) { }

  async loadIndex(): Promise<ConversationIndex> { }
  async saveIndex(index: ConversationIndex): Promise<void> { }
  async loadConversation(id: string): Promise<SerializedConversation | null> { }
  async saveConversation(conversation: SerializedConversation): Promise<void> { }
  async list(): Promise<ConversationMetadata[]> { }
  async delete(id: string): Promise<boolean> { }
  async cleanup(): Promise<number> { }
  async acquireLock(id: string): Promise<LockResult> { }
  async releaseLock(id: string): Promise<void> { }
  async isLocked(id: string): Promise<ConversationLock | null> { }
}
```

### 2. Add ConversationManager serialization

```typescript
// src/agent/conversation.ts - Add methods

export class ConversationManager {
  // Existing methods...

  /** Get serializable state for persistence */
  getSerializableState(): { id, messages, startedAt, lastActivity, tokenEstimate, summarizedAt } { }

  /** Restore state from persisted data */
  restoreState(state: { id, messages, startedAt, lastActivity, tokenEstimate, summarizedAt }): void { }
}

/** Create ConversationManager from persisted state */
export function createConversationFromState(state): ConversationManager { }
```

### 3. Integrate with Session

```typescript
// src/agent/session.ts - Modify SessionOptions

export interface SessionOptions {
  // Existing options...
  conversationStore?: IConversationStore;
  resumeConversationId?: string;
}

// In initialize(): Load conversation if resumeConversationId provided
// In close(): Save conversation to store
```

### 4. Add CLI commands

```typescript
// src/cli/chat.ts - Add --resume flag
program
  .command('chat')
  .option('-r, --resume [id]', 'Resume a previous conversation')

// src/cli/conversations.ts - New subcommand
program
  .command('conversations')
  .command('list')
  .command('show <id>')
  .command('delete <id>')
```

### 5. Add configuration

```typescript
// src/config/diana.config.ts
export interface ConversationsConfig {
  storagePath: string;      // ~/.diana/conversations
  maxConversations: number; // 100
  retentionDays: number;    // 30
}
```

## Storage Format

### index.json

```json
{
  "version": 1,
  "lastModified": "2025-12-13T14:30:00.000Z",
  "conversations": [
    {
      "id": "550e8400-...",
      "title": "File organization...",
      "summary": "Discussed organizing...",
      "startedAt": "2025-12-13T10:00:00.000Z",
      "lastActivity": "2025-12-13T10:45:00.000Z",
      "messageCount": 24
    }
  ]
}
```

### {id}.json

```json
{
  "id": "550e8400-...",
  "title": "File organization...",
  "summary": "Discussed organizing...",
  "startedAt": "2025-12-13T10:00:00.000Z",
  "lastActivity": "2025-12-13T10:45:00.000Z",
  "messages": [
    { "role": "system", "content": "You are DIANA..." },
    { "role": "user", "content": "How should I..." },
    { "role": "assistant", "content": "I recommend..." }
  ],
  "tokenEstimate": 2500
}
```

### locks/{id}.lock

```json
{
  "conversationId": "550e8400-...",
  "pid": 12345,
  "hostname": "workstation",
  "acquiredAt": "2025-12-13T14:30:00.000Z"
}
```

## Key Patterns to Follow

### Pattern 1: Atomic Writes (from ProposalStore)

```typescript
import writeFileAtomic from 'write-file-atomic';

async save(data: StoreData): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  await writeFileAtomic(this.filePath, content, { encoding: 'utf-8' });
}
```

### Pattern 2: Date Serialization

```typescript
// Serialize
const serialized = {
  createdAt: date.toISOString(),
};

// Deserialize
const restored = {
  createdAt: new Date(serialized.createdAt),
};
```

### Pattern 3: Graceful Degradation

```typescript
async load(): Promise<StoreData> {
  try {
    if (!existsSync(this.filePath)) {
      return this.emptyState();
    }
    const data = JSON.parse(await readFile(this.filePath, 'utf-8'));
    // Validate...
    return data;
  } catch (error) {
    console.warn(`[ConversationStore] Failed to load: ${error.message}`);
    return this.emptyState();
  }
}
```

### Pattern 4: Lock File with PID

```typescript
async acquireLock(id: string): Promise<LockResult> {
  const lockPath = path.join(this.locksDir, `${id}.lock`);

  // Check existing lock
  const existing = await this.isLocked(id);
  if (existing) {
    // Check if process still running
    try {
      process.kill(existing.pid, 0);
      return { success: false, holder: { pid: existing.pid, ... } };
    } catch {
      // Process dead, remove stale lock
      await fs.unlink(lockPath);
    }
  }

  // Create lock
  const lock: ConversationLock = {
    conversationId: id,
    pid: process.pid,
    hostname: os.hostname(),
    acquiredAt: new Date().toISOString(),
  };
  await writeFileAtomic(lockPath, JSON.stringify(lock, null, 2));
  return { success: true };
}
```

## Testing Checklist

- [ ] ConversationStore: load/save/list/delete operations
- [ ] Date serialization round-trip
- [ ] Lock acquisition and release
- [ ] Stale lock detection
- [ ] Session integration: save on close
- [ ] Session integration: load on resume
- [ ] CLI: --resume flag parsing
- [ ] CLI: --resume without ID shows picker
- [ ] CLI: conversations list/show/delete
- [ ] Cleanup: age-based pruning
- [ ] Cleanup: count-based pruning
- [ ] Graceful handling of corrupted files
