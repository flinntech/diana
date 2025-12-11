# Implementation Plan: LLM Agent Core - DIANA's Brain

**Branch**: `002-llm-agent-core` | **Date**: 2025-12-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-llm-agent-core/spec.md`

## Summary

Implement DIANA's core LLM agent with conversational AI capabilities, tool calling, and persistent memory. Uses Ollama locally with qwen3:30b-a3b model. Provides CLI interface (`diana chat`, `diana ask`, `diana status`) with streaming responses, tool registry for extensible capabilities, and cross-session memory via Obsidian markdown files.

## Technical Context

**Language/Version**: Node.js 18+ with TypeScript 5.9 (ES modules, strict mode)
**Primary Dependencies**:
- Ollama API via native fetch (localhost:11434)
- commander.js (CLI framework)
- readline (interactive chat)
- chalk (terminal colors)
- ObsidianWriter from 001-obsidian-integration (logging)

**Storage**: File system (Obsidian vault markdown files)
- System prompt: `src/config/system-prompt.md`
- Key facts: `memory/facts.md` in Obsidian vault

**Testing**: vitest (unit + integration)
**Target Platform**: Linux/WSL (local-first)
**Project Type**: Single CLI application
**Performance Goals**:
- First response within 3 seconds of typing
- Streaming begins within 500ms of message send
- Context maintained for 20+ turns without degradation

**Constraints**:
- Local-only (no cloud APIs)
- Ollama must be running for DIANA to start (fail fast)
- <100MB memory baseline
- Sessions isolated (no cross-talk between concurrent sessions)

**Scale/Scope**: Single user (Josh), single machine

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Local-First Privacy | ✅ PASS | All processing via local Ollama. No cloud APIs. Data stored in local Obsidian vault. |
| II. Human-in-the-Loop | ✅ PASS | Tool execution follows request→response pattern. File operations via ObsidianWriter require explicit user commands. No autonomous file modifications. |
| III. Transparent Logging | ✅ PASS | All conversations logged to Obsidian daily notes via ObsidianWriter. Tool calls logged. |
| IV. Simplicity Over Features | ✅ PASS | Minimal CLI (3 commands). Single model. Simple tool registry. No complex orchestration. |
| V. Test-First for Destructive Operations | ✅ PASS | ObsidianWriter (file ops) already tested in 001. New tool calls are read or create operations, not destructive. |
| VI. Graceful Degradation | ⚠️ CONDITIONAL | Spec requires fail-fast if Ollama unavailable (FR-012). This is intentional per spec: "no silent fallback for core functionality." LLM is core, so fail-fast is appropriate. |
| VII. Resource Consciousness | ✅ PASS | Streaming reduces memory for long responses. Context summarization prevents unbounded growth. No polling. |
| VIII. Explicit Predictable Behavior | ✅ PASS | System prompt defines identity. Tool registry explicit. No magic behavior. |

**Gate Result**: PASS (conditional graceful degradation is justified by spec requirement FR-012)

## Project Structure

### Documentation (this feature)

```text
specs/002-llm-agent-core/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api.ts           # TypeScript interfaces for all contracts
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── config/
│   ├── diana.config.ts    # Extended with Ollama config (existing)
│   └── system-prompt.md   # DIANA's identity document (new)
├── types/
│   ├── obsidian.ts        # (existing)
│   └── agent.ts           # LLM agent types (new)
├── obsidian/              # (existing from 001)
│   └── ...
├── llm/                   # LLM client layer (new)
│   ├── client.ts          # OllamaClient with streaming
│   ├── types.ts           # Ollama-specific types
│   └── index.ts           # Exports
├── agent/                 # Agent core (new)
│   ├── conversation.ts    # ConversationManager
│   ├── session.ts         # Session state machine
│   ├── tools.ts           # ToolRegistry
│   ├── memory.ts          # Cross-session memory (facts)
│   ├── prompt.ts          # System prompt loader
│   └── index.ts           # Exports
├── cli/                   # CLI commands (new)
│   ├── chat.ts            # Interactive chat command
│   ├── ask.ts             # One-shot query command
│   ├── status.ts          # Health check command
│   └── index.ts           # Commander setup
└── index.ts               # Main entry point (updated)

tests/
├── unit/
│   ├── obsidian/          # (existing)
│   ├── llm/               # OllamaClient tests
│   └── agent/             # ConversationManager, ToolRegistry tests
└── integration/
    ├── obsidian/          # (existing)
    └── agent/             # Full agent integration tests
```

**Structure Decision**: Single project structure maintained from 001-obsidian-integration. New modules added under `src/llm/`, `src/agent/`, and `src/cli/`. Tests follow existing pattern under `tests/unit/` and `tests/integration/`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Fail-fast on Ollama unavailable | Core functionality requires LLM - partial operation meaningless | Fallback to basic responses would violate user expectations of AI assistant |
| Context summarization via LLM call | Spec requires 50+ turn conversations (SC-008) | Truncation loses important context; summarization preserves meaning |
