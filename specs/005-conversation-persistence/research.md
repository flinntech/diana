# Research: Conversation Persistence

**Feature**: 005-conversation-persistence
**Date**: 2025-12-13

## Research Summary

This document captures design decisions made after exploring the existing codebase patterns.

---

## R1: Persistence Pattern

**Question**: How should conversations be persisted?

**Decision**: Follow ProposalStore pattern with index + individual files

**Rationale**:
- ProposalStore (`src/proposals/proposal.store.ts`) already implements atomic writes using `write-file-atomic`
- Separating index from data enables fast listing (SC-002: list within 1 second)
- Individual conversation files enable efficient single-conversation operations without loading everything

**Alternatives Considered**:
1. **Single JSON file**: Rejected - doesn't scale to 100 conversations (SC-005), requires full file load for any operation
2. **SQLite database**: Rejected - adds dependency, not human-readable (FR-006)
3. **Markdown files like KeyFactStore**: Rejected - structured data better suited to JSON, markdown parsing adds complexity

**Evidence from codebase**:
```typescript
// src/proposals/proposal.store.ts:112-128
async save(data: StoreData): Promise<void> {
  const dir = dirname(this.filePath);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  const toSave: StoreData = {
    ...data,
    lastModified: new Date().toISOString(),
  };
  const content = JSON.stringify(toSave, null, 2);
  await writeFileAtomic(this.filePath, content, { encoding: 'utf-8' });
}
```

---

## R2: Date Serialization

**Question**: How should dates be serialized/deserialized?

**Decision**: Use ISO 8601 strings (`.toISOString()`) for storage, `new Date()` constructor for parsing

**Rationale**:
- Consistent with ProposalStore pattern
- Human-readable in JSON files
- No timezone ambiguity
- Native JavaScript Date parsing

**Evidence from codebase**:
```typescript
// src/proposals/proposal.store.ts:150-169 (serializeProposal)
createdAt: proposal.createdAt.toISOString(),
resolvedAt: proposal.resolvedAt?.toISOString(),

// src/proposals/proposal.store.ts:174-192 (deserializeProposal)
createdAt: new Date(data.createdAt),
resolvedAt: data.resolvedAt ? new Date(data.resolvedAt) : undefined,
```

---

## R3: ConversationManager Integration

**Question**: How to restore a ConversationManager from persisted state?

**Decision**: Add factory function `createConversationFromState()` and `getSerializableState()` method

**Rationale**:
- ConversationManager constructor creates fresh conversation with new UUID
- Need a way to restore existing ID, messages, timestamps
- Keep existing constructor simple, add separate factory for restoration

**Evidence from codebase**:
```typescript
// src/agent/conversation.ts:30-47
constructor(systemPrompt?: string) {
  const now = new Date();
  this.conversation = {
    id: randomUUID(),  // Always generates new ID
    messages: [],
    startedAt: now,
    lastActivity: now,
    tokenEstimate: 0,
  };
  // ...
}
```

**Implementation approach**:
```typescript
// New factory function
export function createConversationFromState(state: Conversation): ConversationManager {
  const manager = new ConversationManager();
  manager.restoreState(state);
  return manager;
}
```

---

## R4: Session Lifecycle Integration

**Question**: Where in Session lifecycle should save/load happen?

**Decision**:
- Load: In `initialize()`, after key facts load, before system prompt construction
- Save: In `close()`, after Obsidian logging, before state change to 'closed'

**Rationale**:
- Loading before system prompt allows restored messages to influence context
- Saving after Obsidian logging preserves existing audit trail behavior
- Matches existing lifecycle flow

**Evidence from codebase**:
```typescript
// src/agent/session.ts:196-267 (initialize)
async initialize(): Promise<void> {
  // ... health checks ...
  await this.promptLoader.load();
  await this.keyFactStore.load();  // <-- Load conversation here
  // ... register tools ...
  // ... create conversation ...  // <-- Or restore if resuming
}

// src/agent/session.ts:417-440 (close)
async close(options: { skipSummary?: boolean } = {}): Promise<void> {
  // ... stop watcher ...
  if (this.conversation && this.conversation.getMessageCount() > 1) {
    await this.logConversation(options.skipSummary);  // <-- Save after this
  }
  this.state = 'closed';
}
```

---

## R5: Title and Summary Generation

**Question**: How to generate conversation titles and summaries?

**Decision**: Reuse existing `generateSessionSummary()` pattern, add title generation in same LLM call

**Rationale**:
- FR-005 requires title/summary generation on every save
- Existing code already generates session summary for Obsidian logging
- Single LLM call is more efficient than two separate calls
- Title can be extracted from summary or generated alongside

**Evidence from codebase**:
```typescript
// src/agent/session.ts:510-567 (generateSessionSummary)
private async generateSessionSummary(): Promise<string | null> {
  // ... formats messages and generates summary via LLM ...
  const summaryMessages: Message[] = [
    {
      role: 'system',
      content: 'You are summarizing a conversation for a daily activity log...',
    },
    // ...
  ];
  const response = await this.ollamaClient.chatComplete(request);
  return response.message.content.trim();
}
```

**Implementation approach**: Create `generateTitleAndSummary()` that returns `{ title: string, summary: string }` using a modified prompt.

---

## R6: Concurrent Access Control

**Question**: How to prevent multiple sessions from modifying the same conversation?

**Decision**: File-based PID locks in `.diana/conversations/locks/{id}.lock`

**Rationale**:
- FR-019/FR-020/FR-021 require locking with process tracking
- Simple file-based approach matches local-first philosophy
- PID in lock file enables stale lock detection (FR-021)
- No external dependencies required

**Implementation approach**:
```typescript
interface ConversationLock {
  conversationId: string;
  pid: number;
  hostname: string;
  acquiredAt: string;  // ISO 8601
}

// Lock file: ~/.diana/conversations/locks/{id}.lock
// Check if PID still running: process.kill(pid, 0) throws if not running
```

---

## R7: Interactive Conversation Picker

**Question**: What library to use for interactive picker when `--resume` is used without ID?

**Decision**: Use `inquirer` package for interactive selection

**Rationale**:
- Well-maintained, widely used CLI prompting library
- Already commonly used in Node.js CLIs
- Supports list selection with custom formatting
- Works with both interactive and non-interactive terminals

**Alternatives Considered**:
1. **@inquirer/prompts**: Newer modular version - could use this instead, smaller bundle
2. **prompts**: Lighter weight but less feature-rich
3. **Custom readline**: More work, reinventing the wheel

**Implementation approach**:
```typescript
import { select } from '@inquirer/prompts';

const choice = await select({
  message: 'Select a conversation to resume:',
  choices: conversations.map(c => ({
    name: `${c.title} (${formatDate(c.lastActivity)})`,
    value: c.id,
    description: c.summary,
  })),
});
```

---

## R8: Configuration Structure

**Question**: How to structure conversation persistence configuration?

**Decision**: Add `conversations` section to DianaConfig matching existing patterns

**Rationale**:
- Follows existing config patterns (obsidian, ollama, watcher)
- Enables sensible defaults while allowing customization
- Clear separation of concerns

**Evidence from codebase**:
```typescript
// src/config/diana.config.ts:65-69
export const watcherConfig: WatcherConfig = {
  ...DEFAULT_WATCHER_CONFIG,
  proposalStorePath: process.env.DIANA_PROPOSALS_PATH || `${process.env.HOME}/.diana/proposals.json`,
};
```

**Implementation approach**:
```typescript
export interface ConversationsConfig {
  storagePath: string;          // ~/.diana/conversations
  maxConversations: number;     // 100 (SC-005)
  retentionDays: number;        // 30
}

export const conversationsConfig: ConversationsConfig = {
  storagePath: process.env.DIANA_CONVERSATIONS_PATH || `${process.env.HOME}/.diana/conversations`,
  maxConversations: 100,
  retentionDays: 30,
};
```

---

## R9: Minimum Save Threshold

**Question**: When should a conversation NOT be saved?

**Decision**: Only save conversations with at least one complete exchange (user message + assistant response)

**Rationale**:
- Clarification from spec: "Only save conversations with at least 1 complete exchange"
- Prevents saving empty or abandoned sessions
- System prompt alone doesn't constitute a meaningful conversation

**Implementation approach**:
```typescript
// In Session.close()
const messages = this.conversation.getMessages();
const userMessages = messages.filter(m => m.role === 'user');
const assistantMessages = messages.filter(m => m.role === 'assistant');

if (userMessages.length > 0 && assistantMessages.length > 0) {
  await this.saveConversation();
}
```

---

## R10: Error Code Extension

**Question**: Should new error codes be added for conversation persistence failures?

**Decision**: No new codes needed - reuse existing graceful degradation pattern

**Rationale**:
- Constitution Principle VI requires graceful degradation
- Conversation persistence failures shouldn't crash the session
- Log warnings, start fresh if corrupted (FR-017)
- Existing error codes cover network/LLM failures

**Evidence from codebase**:
```typescript
// src/proposals/proposal.store.ts:98-104
} catch (error) {
  console.warn(
    `[ProposalStore] Failed to load proposals: ${error instanceof Error ? error.message : 'Unknown error'}`
  );
  return this.emptyState();
}
```
