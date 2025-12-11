# Research: LLM Agent Core

**Feature**: 002-llm-agent-core
**Date**: 2025-12-10

## Decision 1: Ollama API Integration Pattern

**Decision**: Use native fetch with `/api/chat` endpoint, streaming enabled by default, with NDJSON parsing.

**Rationale**:
- Ollama's `/api/chat` is the primary endpoint for chat completions
- Streaming is enabled by default (`stream: true`), returns incremental JSON objects
- Native fetch available in Node.js 18+ (no axios needed)
- Response format: `{model, created_at, message: {role, content}, done}`
- Final response includes metrics: `total_duration`, `prompt_eval_count`, `eval_count`

**Alternatives Considered**:
- Ollama Python library: Rejected (we're using Node.js/TypeScript)
- Ollama JavaScript library: Rejected (unnecessary abstraction; native fetch is sufficient)
- OpenAI-compatible endpoint: Rejected (introduces unnecessary compatibility layer)

**Sources**:
- [Ollama API Documentation](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Streaming responses with tool calling](https://ollama.com/blog/streaming-tool)

---

## Decision 2: Tool Calling Format

**Decision**: Use Ollama's native tool calling with JSON schema format.

**Rationale**:
- Ollama supports tool calling via `tools` array in request
- Tools defined with JSON schema: `{type: "function", function: {name, description, parameters}}`
- Model returns `tool_calls` array with function name and arguments
- Tool responses sent back with `role: "tool"` and `tool_name`
- Qwen3 supports tool calling with Ollama v0.9.0+

**Tool Definition Structure**:
```json
{
  "type": "function",
  "function": {
    "name": "write_note",
    "description": "Write a note to Obsidian vault",
    "parameters": {
      "type": "object",
      "required": ["activity"],
      "properties": {
        "activity": {"type": "string", "description": "The note content"}
      }
    }
  }
}
```

**Workflow**:
1. User message + tool definitions sent to model
2. Model responds with `tool_calls` array (if tool needed)
3. Application executes tool function
4. Result sent back with `role: "tool"` message
5. Model generates final response incorporating tool result

**Alternatives Considered**:
- ReAct format: Rejected (Qwen documentation advises against stopword-based templates for reasoning models)
- Custom XML parsing: Rejected (Ollama's native format is more robust)

**Sources**:
- [Ollama Tool Calling](https://docs.ollama.com/capabilities/tool-calling)
- [Qwen Function Calling](https://qwen.readthedocs.io/en/latest/framework/function_call.html)

---

## Decision 3: CLI Framework

**Decision**: Use commander.js with @commander-js/extra-typings for TypeScript integration.

**Rationale**:
- commander.js is the de facto standard for Node.js CLIs
- Supports ES modules natively
- @commander-js/extra-typings provides strong TypeScript inference for action handlers
- Requires Node.js v20+ (we target v18+, compatible)

**Package Configuration**:
```json
{
  "type": "module",
  "bin": {
    "diana": "./dist/cli/index.js"
  }
}
```

**Command Structure**:
```typescript
import { Command } from 'commander';

const program = new Command();
program
  .name('diana')
  .description('DIANA - Digital Intelligence And Neural Architecture')
  .version('1.0.0');

program
  .command('chat')
  .description('Start interactive chat session')
  .action(chatAction);
```

**Alternatives Considered**:
- yargs: Rejected (commander.js has better TypeScript support and simpler API)
- oclif: Rejected (over-engineered for our simple CLI needs)
- Native process.argv parsing: Rejected (too low-level, reinventing the wheel)

**Sources**:
- [Commander.js npm](https://www.npmjs.com/package/commander)
- [Commander.js Extra Typings](https://github.com/commander-js/extra-typings)

---

## Decision 4: Interactive Chat Implementation

**Decision**: Use Node.js readline with chalk for terminal styling.

**Rationale**:
- readline is built into Node.js (no additional dependencies)
- Supports line-by-line input with history
- chalk provides cross-platform terminal colors
- Simple integration with async/await patterns

**Implementation Pattern**:
```typescript
import * as readline from 'readline/promises';
import chalk from 'chalk';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Streaming output
for await (const chunk of stream) {
  process.stdout.write(chunk.message?.content || '');
}
```

**Alternatives Considered**:
- inquirer: Rejected (designed for prompts/forms, not conversational chat)
- blessed/ink: Rejected (complex TUI not needed for simple chat)
- raw mode stdin: Rejected (unnecessary complexity)

---

## Decision 5: Context Window Management

**Decision**: LLM-based summarization when context approaches limit.

**Rationale**:
- Spec requirement: Support 50+ turn conversations (SC-008)
- qwen3:30b-a3b has ~32k context window (recommended for tool calling)
- Simple truncation loses important context
- LLM summarization preserves meaning while compressing

**Strategy**:
1. Track token count estimate (chars/4 rough approximation)
2. When approaching 80% of context limit (~25k tokens):
   - Take oldest N messages (excluding system prompt)
   - Send to Ollama: "Summarize this conversation context concisely"
   - Replace old messages with summary message
3. Keep recent messages (last ~10) intact for immediate context

**Alternatives Considered**:
- Simple truncation: Rejected (loses important context)
- Semantic chunking with embeddings: Rejected (complexity not justified for v1)
- External memory store: Rejected (adds infrastructure dependency)

---

## Decision 6: Cross-Session Memory Storage

**Decision**: Markdown file in Obsidian vault at `memory/facts.md`.

**Rationale**:
- Spec requirement: Key facts stored in Obsidian (FR-017)
- Human-readable format (aligns with constitution principle III)
- Simple append-only structure with timestamps
- Tagged facts for importance (`#important`)

**File Format**:
```markdown
---
type: memory
created: 2025-12-10T10:00:00
modified: 2025-12-10T14:30:00
---

# Key Facts

## Important (always loaded)

- Josh prefers dark mode in all apps #important
- Josh's main project is DIANA #important

## Recent

- 2025-12-10: Josh mentioned working on CLI features
- 2025-12-10: Discussed Ollama integration approach
```

**Loading Strategy**:
1. Parse markdown file on startup
2. Extract all `#important` tagged facts (always included)
3. Extract N most recent untagged facts (by date)
4. Include in system prompt context

**Alternatives Considered**:
- SQLite database: Rejected (not human-readable, violates transparency principle)
- JSON file: Rejected (less human-friendly than markdown)
- Separate files per fact: Rejected (too many files, harder to manage)

---

## Decision 7: System Prompt Structure

**Decision**: Markdown file at `src/config/system-prompt.md` with template variables.

**Rationale**:
- Human-readable and version-controlled
- Can include tool descriptions dynamically
- Separates identity from code
- Easy to iterate on personality/behavior

**Template Structure**:
```markdown
# DIANA System Prompt

You are DIANA (Digital Intelligence And Neural Architecture), Josh's personal AI assistant.

## Identity
- You run locally on Josh's machine
- All data stays local - you never send information to external services
- You are helpful, concise, and technically competent

## Principles
- Local-first: You process everything locally via Ollama
- Transparent: You log all actions to Obsidian
- Human-in-the-loop: You propose actions, Josh approves

## Available Tools
{{TOOL_DESCRIPTIONS}}

## Known Facts About Josh
{{KEY_FACTS}}
```

**Alternatives Considered**:
- Hardcoded string in TypeScript: Rejected (harder to iterate, less readable)
- JSON configuration: Rejected (markdown is more natural for prose)
- Database-stored prompt: Rejected (over-engineering)

---

## Decision 8: Error Handling Strategy

**Decision**: Fail-fast for critical errors, retry with backoff for transient errors.

**Rationale**:
- Spec requirement: DIANA MUST NOT start if Ollama unavailable (FR-012)
- Network timeouts: Retry with exponential backoff (3 attempts)
- Distinguishes between recoverable and fatal errors

**Error Categories**:

| Category | Behavior | Examples |
|----------|----------|----------|
| Fatal | Fail fast, exit | Ollama not running, model not found, system prompt missing |
| Transient | Retry 3x with backoff | Network timeout, temporary lock |
| Recoverable | Log and continue | Tool execution failure, malformed response |

**Retry Pattern**:
```typescript
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await delay(100 * Math.pow(2, i)); // 100ms, 200ms, 400ms
    }
  }
  throw new Error('Unreachable');
}
```

**Alternatives Considered**:
- Silent fallback to basic mode: Rejected (violates user expectations of AI assistant)
- Unlimited retries: Rejected (wastes resources, delays inevitable failure)

---

## Decision 9: Streaming Response Handling

**Decision**: AsyncIterator pattern with NDJSON parsing.

**Rationale**:
- Ollama returns newline-delimited JSON chunks
- AsyncIterator provides natural async/await syntax
- Enables both streaming to terminal and accumulating full response

**Implementation Pattern**:
```typescript
async function* streamChat(
  messages: Message[],
  tools?: Tool[]
): AsyncGenerator<ChatChunk> {
  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'qwen3:30b-a3b', messages, tools, stream: true }),
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) yield JSON.parse(line);
    }
  }
}
```

**Alternatives Considered**:
- Polling: Rejected (inefficient, doesn't match streaming nature)
- Server-Sent Events: Rejected (Ollama doesn't use SSE format)
- Full response waiting: Rejected (poor UX, no streaming feel)

---

## Resolved Clarifications

All NEEDS CLARIFICATION items from spec have been resolved:

| Item | Resolution |
|------|------------|
| Cross-session storage location | Obsidian vault `memory/facts.md` (per spec clarification) |
| Fact relevance determination | Tag-based (#important) + recency (per spec clarification) |
| Context summarization method | LLM call to compress (per spec clarification) |
| Concurrent sessions | Isolated memory, no cross-talk (per spec clarification) |
| Tool calling format | Ollama native JSON schema (per research) |
| Streaming implementation | NDJSON with AsyncIterator (per research) |

---

## Dependencies to Add

```json
{
  "dependencies": {
    "commander": "^13.0.0",
    "chalk": "^5.4.0"
  },
  "devDependencies": {
    "@commander-js/extra-typings": "^13.0.0"
  }
}
```

Note: Native fetch available in Node.js 18+ (no node-fetch needed).
