# Data Model: LLM Agent Core

**Feature**: 002-llm-agent-core
**Date**: 2025-12-10

## Entity Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          Session                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Conversation                          │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │ Message  │→│ Message  │→│ Message  │→│ Message  │   │   │
│  │  │ (system) │ │ (user)   │ │ (assist) │ │ (tool)   │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│                      ToolRegistry                               │
│                    ┌──────────────┐                            │
│                    │ Tool[] tools │                            │
│                    └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                     ┌────────────────┐
                     │  KeyFactStore  │
                     │ (Obsidian MD)  │
                     └────────────────┘
```

---

## Entity: Message

A single unit of conversation. Forms the building block of all interactions.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `role` | `MessageRole` | Yes | Who sent the message |
| `content` | `string` | Yes* | Text content (*optional for tool calls) |
| `toolCalls` | `ToolCall[]` | No | Tool invocations requested by assistant |
| `toolCallId` | `string` | No | ID linking tool result to its call |
| `name` | `string` | No | Tool name (for role='tool') |

### MessageRole Enum

| Value | Description |
|-------|-------------|
| `system` | System prompt defining DIANA's identity |
| `user` | Message from Josh |
| `assistant` | Response from DIANA |
| `tool` | Result from tool execution |

### Validation Rules

1. `role` must be one of: `system`, `user`, `assistant`, `tool`
2. `content` required for `user` and `system` roles
3. `assistant` messages may have empty `content` if `toolCalls` present
4. `tool` messages require `toolCallId` and `name`

### Example

```typescript
// User message
{ role: 'user', content: 'Write a note about our meeting' }

// Assistant with tool call
{
  role: 'assistant',
  content: '',
  toolCalls: [{
    id: 'call_123',
    type: 'function',
    function: { name: 'write_note', arguments: '{"activity":"Meeting notes..."}' }
  }]
}

// Tool result
{
  role: 'tool',
  toolCallId: 'call_123',
  name: 'write_note',
  content: '{"success":true,"filePath":"/vault/daily/2025-12-10.md"}'
}
```

---

## Entity: Conversation

An ordered sequence of messages forming a dialogue session.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique session identifier (UUID) |
| `messages` | `Message[]` | Yes | Ordered message history |
| `startedAt` | `Date` | Yes | Session start timestamp |
| `lastActivity` | `Date` | Yes | Last message timestamp |
| `tokenEstimate` | `number` | Yes | Approximate token count |
| `summarizedAt` | `number` | No | Message index where summarization occurred |

### Validation Rules

1. First message must be `role: 'system'` (system prompt)
2. Messages alternate: user → assistant (with possible tool interludes)
3. `tokenEstimate` must be recalculated after each message
4. `summarizedAt` updated when context compression occurs

### State Transitions

```
┌──────────┐   start()   ┌──────────┐   addMessage()   ┌──────────┐
│  Empty   │────────────→│  Active  │←────────────────→│  Active  │
└──────────┘             └──────────┘                   └──────────┘
                              │                              │
                              │ needsSummarization()         │
                              ▼                              │
                         ┌──────────┐                       │
                         │Summarize │───────────────────────┘
                         └──────────┘
                              │
                              │ end() / timeout
                              ▼
                         ┌──────────┐
                         │  Closed  │
                         └──────────┘
```

### Methods (Interface)

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `addMessage` | `message: Message` | `void` | Append message to history |
| `getMessages` | - | `Message[]` | Get all messages for API call |
| `getTokenEstimate` | - | `number` | Current token count estimate |
| `needsSummarization` | `threshold: number` | `boolean` | Check if context limit approaching |
| `summarize` | `summary: string` | `void` | Replace old messages with summary |

---

## Entity: Tool

A capability DIANA can invoke to take action.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Unique tool identifier |
| `description` | `string` | Yes | Human-readable description for LLM |
| `parameters` | `JSONSchema` | Yes | Parameter schema for validation |
| `execute` | `Function` | Yes | Async function to run the tool |

### JSONSchema Structure

```typescript
interface JSONSchema {
  type: 'object';
  required?: string[];
  properties: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    description: string;
    enum?: string[];
    items?: JSONSchema;
  }>;
}
```

### Validation Rules

1. `name` must be alphanumeric with underscores (regex: `^[a-z_][a-z0-9_]*$`)
2. `description` must be non-empty
3. `parameters` must be valid JSON Schema
4. `execute` must return `Promise<ToolResult>`

### Example: ObsidianWriter Tool

```typescript
{
  name: 'write_daily_note',
  description: 'Write an entry to today\'s daily log in Obsidian',
  parameters: {
    type: 'object',
    required: ['activity'],
    properties: {
      activity: {
        type: 'string',
        description: 'The activity or note to log'
      },
      title: {
        type: 'string',
        description: 'Optional title for the entry'
      }
    }
  },
  execute: async (args) => {
    const result = await obsidianWriter.writeDaily(args);
    return { success: result.success, data: result };
  }
}
```

---

## Entity: ToolRegistry

Container for available tools with lookup and execution.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tools` | `Map<string, Tool>` | Yes | Registered tools by name |

### Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `register` | `tool: Tool` | `void` | Add tool to registry |
| `get` | `name: string` | `Tool \| undefined` | Lookup tool by name |
| `has` | `name: string` | `boolean` | Check if tool exists |
| `getToolDefinitions` | - | `OllamaToolDef[]` | Get all tools in Ollama format |
| `execute` | `name: string, args: unknown` | `Promise<ToolResult>` | Run tool with arguments |
| `getDescriptions` | - | `string` | Markdown list for system prompt |

### Validation Rules

1. Tool names must be unique (throw on duplicate registration)
2. Arguments validated against tool's JSON Schema before execution
3. Execution errors caught and returned as `ToolResult.error`

---

## Entity: ToolCall

Request from the model to invoke a tool.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique call identifier |
| `type` | `'function'` | Yes | Always 'function' |
| `function` | `FunctionCall` | Yes | Function details |

### FunctionCall Structure

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Tool name to invoke |
| `arguments` | `string` | Yes | JSON-encoded arguments |

---

## Entity: ToolResult

Result of executing a tool.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `success` | `boolean` | Yes | Whether execution succeeded |
| `data` | `unknown` | No | Result data (if success) |
| `error` | `string` | No | Error message (if failed) |

---

## Entity: KeyFact

A persistent piece of information about Josh.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | `string` | Yes | The fact text |
| `tags` | `string[]` | Yes | Tags including #important |
| `createdAt` | `Date` | Yes | When fact was recorded |
| `source` | `string` | No | Conversation ID where learned |

### Validation Rules

1. `content` must be non-empty
2. `tags` may include `#important` for priority loading
3. Facts stored in markdown format in Obsidian vault

### Fact Update Behavior

When DIANA detects a correction to an existing fact:
1. Match by semantic similarity to existing facts (simple keyword overlap for v1)
2. If match found with >70% overlap: Update existing fact, preserve original createdAt, update source
3. If no match: Add as new fact
4. Deferred: LLM-based fact deduplication for future enhancement

### Storage Format (memory/facts.md)

```markdown
---
type: memory
created: 2025-12-10T10:00:00
modified: 2025-12-10T14:30:00
---

# Key Facts

## Important

- Josh prefers dark mode in all apps #important
- Josh's main project is DIANA #important

## Recent

- [2025-12-10] Josh mentioned working on CLI features
- [2025-12-10] Discussed Ollama integration approach
```

---

## Entity: KeyFactStore

Manager for persistent cross-session memory.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `vaultPath` | `string` | Yes | Path to Obsidian vault |
| `facts` | `KeyFact[]` | Yes | Loaded facts |
| `lastLoaded` | `Date` | No | When facts were last read |

### Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `load` | - | `Promise<void>` | Read facts from markdown |
| `save` | - | `Promise<void>` | Write facts to markdown |
| `addFact` | `fact: KeyFact` | `void` | Add new fact |
| `getImportant` | - | `KeyFact[]` | Get #important tagged facts |
| `getRecent` | `n: number` | `KeyFact[]` | Get N most recent facts |
| `getContextString` | - | `string` | Format for system prompt |

---

## Entity: OllamaConfig

Configuration for Ollama client.

### Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `host` | `string` | No | `localhost` | Ollama host |
| `port` | `number` | No | `11434` | Ollama port |
| `model` | `string` | Yes | - | Model name (qwen3:30b-a3b) |
| `contextSize` | `number` | No | `32768` | Context window size |
| `timeout` | `number` | No | `120000` | Request timeout (ms) |

---

## Entity: DianaConfig (Extended)

Full DIANA configuration (extends existing from 001).

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `obsidian` | `ObsidianWriterConfig` | Yes | Existing from 001 |
| `ollama` | `OllamaConfig` | Yes | LLM configuration |
| `systemPromptPath` | `string` | Yes | Path to system prompt |
| `memoryPath` | `string` | Yes | Path to facts.md in vault |

---

## Relationships

```
DianaConfig
    ├── obsidian: ObsidianWriterConfig
    └── ollama: OllamaConfig

Session
    ├── conversation: Conversation
    │       └── messages: Message[]
    │               └── toolCalls?: ToolCall[]
    └── toolRegistry: ToolRegistry
            └── tools: Tool[]

KeyFactStore
    └── facts: KeyFact[]
```

---

## State Machine: Session Lifecycle

```
                    ┌───────────────────────┐
                    │      INITIALIZING     │
                    │  - Health check Ollama│
                    │  - Load system prompt │
                    │  - Load key facts     │
                    │  - Register tools     │
                    └───────────┬───────────┘
                                │ success
                                ▼
                    ┌───────────────────────┐
                    │        READY          │
                    │  - Waiting for input  │
                    └───────────┬───────────┘
                                │ user message
                                ▼
         ┌──────────────────────────────────────────┐
         │              PROCESSING                   │
         │  ┌─────────────────────────────────┐     │
         │  │  Send to Ollama                  │     │
         │  │  Stream response                 │     │
         │  │  Handle tool calls if present    │◄──┐│
         │  │  Execute tools                   │   ││
         │  │  Return results to Ollama        │───┘│
         │  └─────────────────────────────────┘     │
         └──────────────┬───────────────────────────┘
                        │ response complete
                        ▼
              ┌───────────────────────┐
              │     CHECK CONTEXT     │
              │  - Estimate tokens    │
              │  - Summarize if needed│
              └───────────┬───────────┘
                          │
                          ▼
                    ┌───────────────────────┐
                    │        READY          │──→ (loop)
                    └───────────┬───────────┘
                                │ /exit or Ctrl+C
                                ▼
                    ┌───────────────────────┐
                    │      TERMINATING      │
                    │  - Log conversation   │
                    │  - Save session state │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │        CLOSED         │
                    └───────────────────────┘
```

---

## Error States

| Error | From State | To State | Recovery |
|-------|------------|----------|----------|
| Ollama unavailable | INITIALIZING | FAILED | Exit with clear message |
| Model not found | INITIALIZING | FAILED | Exit with model name |
| System prompt missing | INITIALIZING | FAILED | Exit with file path |
| Network timeout | PROCESSING | READY | Retry 3x, then inform user |
| Tool execution failure | PROCESSING | READY | Log error, continue conversation |
| Context overflow | CHECK_CONTEXT | PROCESSING | Summarize and retry |
