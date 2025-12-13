# Data Model: Conversation Persistence

**Feature**: 005-conversation-persistence
**Date**: 2025-12-13

## Entity Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     ConversationIndex                            │
│  (index.json - metadata for fast listing)                        │
├─────────────────────────────────────────────────────────────────┤
│  version: number                                                 │
│  lastModified: string (ISO 8601)                                │
│  conversations: ConversationMetadata[]                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N reference by id
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  SerializedConversation                          │
│  ({id}.json - full conversation data)                            │
├─────────────────────────────────────────────────────────────────┤
│  id: string (UUID)                                               │
│  title: string                                                   │
│  summary: string                                                 │
│  startedAt: string (ISO 8601)                                   │
│  lastActivity: string (ISO 8601)                                │
│  messages: SerializedMessage[]                                  │
│  tokenEstimate: number                                           │
│  summarizedAt?: number                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N contains
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SerializedMessage                            │
│  (embedded in conversation file)                                 │
├─────────────────────────────────────────────────────────────────┤
│  role: 'system' | 'user' | 'assistant' | 'tool'                 │
│  content: string                                                 │
│  toolCalls?: SerializedToolCall[]                               │
│  toolCallId?: string                                             │
│  name?: string                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 0:N contains
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SerializedToolCall                            │
│  (embedded in message)                                           │
├─────────────────────────────────────────────────────────────────┤
│  id: string                                                      │
│  type: 'function'                                                │
│  function: { name: string, arguments: string }                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    ConversationLock                              │
│  (locks/{id}.lock - prevents concurrent access)                  │
├─────────────────────────────────────────────────────────────────┤
│  conversationId: string                                          │
│  pid: number                                                     │
│  hostname: string                                                │
│  acquiredAt: string (ISO 8601)                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Entity Definitions

### ConversationIndex

The index file containing metadata for all conversations. Enables fast listing without loading individual conversation files.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| version | number | yes | Schema version for migration support |
| lastModified | string | yes | ISO 8601 timestamp of last index update |
| conversations | ConversationMetadata[] | yes | Array of conversation metadata |

**Storage**: `~/.diana/conversations/index.json`

**Example**:
```json
{
  "version": 1,
  "lastModified": "2025-12-13T14:30:00.000Z",
  "conversations": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "File organization strategy discussion",
      "summary": "Discussed organizing project files by type...",
      "startedAt": "2025-12-13T10:00:00.000Z",
      "lastActivity": "2025-12-13T10:45:00.000Z",
      "messageCount": 24
    }
  ]
}
```

---

### ConversationMetadata

Lightweight summary of a conversation for listing purposes.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | yes | UUID identifying the conversation |
| title | string | yes | LLM-generated title (max 50 chars) |
| summary | string | yes | LLM-generated summary (2-4 sentences) |
| startedAt | string | yes | ISO 8601 timestamp when conversation began |
| lastActivity | string | yes | ISO 8601 timestamp of last message |
| messageCount | number | yes | Total messages (user + assistant, excludes system/tool) |

**Validation Rules**:
- `id` must be valid UUID v4 format
- `title` max length: 50 characters (truncated with ellipsis if longer)
- `summary` max length: 500 characters
- `messageCount` >= 2 (at least one user + one assistant message)

---

### SerializedConversation

Full conversation data including all messages.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | yes | UUID identifying the conversation |
| title | string | yes | LLM-generated title |
| summary | string | yes | LLM-generated summary |
| startedAt | string | yes | ISO 8601 timestamp when conversation began |
| lastActivity | string | yes | ISO 8601 timestamp of last message |
| messages | SerializedMessage[] | yes | All messages in order |
| tokenEstimate | number | yes | Approximate token count |
| summarizedAt | number | no | Message index where summarization occurred |

**Storage**: `~/.diana/conversations/{id}.json`

**Example**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "File organization strategy discussion",
  "summary": "Discussed organizing project files by type and date...",
  "startedAt": "2025-12-13T10:00:00.000Z",
  "lastActivity": "2025-12-13T10:45:00.000Z",
  "messages": [
    {
      "role": "system",
      "content": "You are DIANA..."
    },
    {
      "role": "user",
      "content": "How should I organize my Downloads folder?"
    },
    {
      "role": "assistant",
      "content": "I recommend organizing by file type..."
    }
  ],
  "tokenEstimate": 2500
}
```

---

### SerializedMessage

A single message in the conversation.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| role | MessageRole | yes | 'system', 'user', 'assistant', or 'tool' |
| content | string | yes | Message text content |
| toolCalls | SerializedToolCall[] | no | Tool invocations (assistant only) |
| toolCallId | string | no | Links tool result to call (tool only) |
| name | string | no | Tool name (tool only) |

**Validation Rules**:
- `toolCalls` only valid when `role === 'assistant'`
- `toolCallId` and `name` only valid when `role === 'tool'`
- `content` may be empty for assistant messages with only tool calls

---

### SerializedToolCall

A tool invocation request from the assistant.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | yes | Unique identifier for the call |
| type | 'function' | yes | Always 'function' |
| function | object | yes | Function details |
| function.name | string | yes | Tool name |
| function.arguments | string | yes | JSON-encoded arguments |

**Note**: Arguments are stored as JSON string, not parsed object, to preserve exact serialization.

---

### ConversationLock

Indicates a conversation is currently in use by a session.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| conversationId | string | yes | UUID of locked conversation |
| pid | number | yes | Process ID holding the lock |
| hostname | string | yes | Machine hostname |
| acquiredAt | string | yes | ISO 8601 timestamp when lock acquired |

**Storage**: `~/.diana/conversations/locks/{id}.lock`

**Stale Lock Detection**:
```typescript
function isLockStale(lock: ConversationLock): boolean {
  try {
    process.kill(lock.pid, 0); // Signal 0 = check if process exists
    return false; // Process exists, lock is valid
  } catch {
    return true; // Process doesn't exist, lock is stale
  }
}
```

---

## State Transitions

### Conversation Lifecycle

```
                    ┌──────────────────┐
                    │    NEW_SESSION   │
                    │  (no prior ID)   │
                    └────────┬─────────┘
                             │ create ConversationManager()
                             ▼
┌─────────────┐      ┌──────────────────┐
│  PERSISTED  │◄─────│     ACTIVE       │
│ (in store)  │ save │  (in memory)     │
└──────┬──────┘      └────────┬─────────┘
       │                      │
       │ resume               │ close()
       │                      │
       ▼                      ▼
┌──────────────────┐  ┌──────────────────┐
│   RESUMED_SESSION │  │  SAVE_PENDING    │
│   (load from ID)  │  │ (generate title) │
└────────┬─────────┘  └────────┬─────────┘
         │                     │
         │ load conversation   │ atomic write
         ▼                     ▼
  ┌──────────────────┐  ┌──────────────────┐
  │     ACTIVE       │  │    PERSISTED     │
  │  (restored)      │  │  (updated)       │
  └──────────────────┘  └──────────────────┘
```

### Lock State Machine

```
     ┌────────────────┐
     │   UNLOCKED     │
     │ (no lock file) │
     └───────┬────────┘
             │ acquireLock()
             ▼
     ┌────────────────┐
     │    LOCKED      │──────────┐
     │  (lock file    │          │ session ends
     │   with PID)    │          │
     └───────┬────────┘          │
             │                   │
             │ another process   │ releaseLock()
             │ checks lock       │
             ▼                   ▼
     ┌────────────────┐  ┌────────────────┐
     │ CHECK_STALENESS│  │   UNLOCKED     │
     │  (is PID alive?)│  └────────────────┘
     └───────┬────────┘
             │
       ┌─────┴─────┐
       │           │
       ▼           ▼
   ┌───────┐  ┌─────────┐
   │ VALID │  │  STALE  │
   │(deny) │  │(remove) │
   └───────┘  └────┬────┘
                   │
                   ▼
           ┌────────────────┐
           │   UNLOCKED     │
           │ (can acquire)  │
           └────────────────┘
```

---

## Storage Structure

```
~/.diana/
└── conversations/
    ├── index.json                              # Metadata index
    ├── 550e8400-e29b-41d4-a716-446655440000.json  # Conversation 1
    ├── 6ba7b810-9dad-11d1-80b4-00c04fd430c8.json  # Conversation 2
    └── locks/
        └── 550e8400-e29b-41d4-a716-446655440000.lock  # Active lock
```

---

## Relationships

| From | To | Cardinality | Description |
|------|----|-------------|-------------|
| ConversationIndex | ConversationMetadata | 1:N | Index contains metadata for all conversations |
| ConversationMetadata | SerializedConversation | 1:1 | Metadata ID references conversation file |
| SerializedConversation | SerializedMessage | 1:N | Conversation contains ordered messages |
| SerializedMessage | SerializedToolCall | 1:N | Assistant message may have tool calls |
| SerializedConversation | ConversationLock | 1:0..1 | Active conversation may have lock |

---

## Cleanup Rules

1. **Count-based cleanup** (FR-014): When `conversations.length > maxConversations`
   - Sort by `lastActivity` descending
   - Remove oldest conversations until count <= max
   - Update index

2. **Age-based cleanup** (FR-015): When `lastActivity < (now - retentionDays)`
   - Identify conversations older than retention period
   - Remove conversation files
   - Update index

3. **Orphan cleanup**: Conversation files without index entry
   - Scan directory for `.json` files not in index
   - Option: rebuild index from files OR delete orphans
   - Current decision: ignore orphans (index is authoritative per spec)
