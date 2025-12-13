# Implementation Plan: Conversation Persistence

**Branch**: `005-conversation-persistence` | **Date**: 2025-12-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-conversation-persistence/spec.md`

## Summary

Enable DIANA to save and resume conversations across sessions using local JSON storage in `~/.diana/conversations/`. Uses the ProposalStore pattern for atomic writes with a separate index for fast listing. Integrates with Session lifecycle (save on close, load on resume) and adds `--resume` flag to chat command plus `diana conversations` subcommand for list/show/delete.

## Technical Context

**Language/Version**: TypeScript 5.9+ with Node.js 18+ (ES modules, strict mode)
**Primary Dependencies**: write-file-atomic (existing), @inquirer/prompts (for interactive picker), date-fns (existing)
**Storage**: JSON files in `~/.diana/conversations/` (index.json + {id}.json per conversation)
**Testing**: vitest (existing test framework)
**Target Platform**: Linux (WSL), macOS
**Project Type**: Single CLI application
**Performance Goals**: Resume within 2 seconds (SC-001), list within 1 second (SC-002)
**Constraints**: All data local (FR-018), human-readable JSON (FR-006), atomic writes (FR-007)
**Scale/Scope**: Up to 100 conversations (SC-005), default 30-day retention

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Local-First Privacy | PASS | All data stored locally in `~/.diana/`, no external transmission (FR-018) |
| II. Human-in-the-Loop | PASS | Save/resume are non-destructive read/write operations, no file modification |
| III. Transparent Logging | PASS | Obsidian logging happens before save (existing flow preserved) |
| IV. Simplicity Over Features | PASS | Minimal feature set: save/resume/list/delete, sensible defaults |
| V. Test-First for Destructive Operations | N/A | No file operations on user data, only DIANA's own conversation storage |
| VI. Graceful Degradation | PASS | Corrupted storage starts fresh (FR-017), empty conversations handled |
| VII. Resource Consciousness | PASS | Separate index for fast listing, cleanup prevents unbounded growth |
| VIII. Explicit Predictable Behavior | PASS | Deterministic: always save on close, always load on resume, clear error messages |
| IX. Agent-First Design | PASS | ConversationStore is a standalone service with clean interface |
| X. Transport-Agnostic Services | PASS | ConversationStore returns data, no direct I/O; CLI handles presentation |

**Gate Status**: PASS - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/005-conversation-persistence/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (TypeScript interfaces)
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── conversations/                    # NEW: Conversation persistence module
│   ├── conversation.store.ts         # ConversationStore class
│   ├── conversation.types.ts         # Serialization types
│   ├── conversation.lock.ts          # File locking implementation
│   └── index.ts                      # Module exports
├── agent/
│   ├── session.ts                    # MODIFIED: Add save on close, load on resume
│   └── conversation.ts               # MODIFIED: Add methods for serialization
├── cli/
│   ├── chat.ts                       # MODIFIED: Add --resume flag
│   ├── conversations.ts              # NEW: conversations subcommand
│   └── index.ts                      # MODIFIED: Register conversations command
├── config/
│   └── diana.config.ts               # MODIFIED: Add conversations config section
└── types/
    └── agent.ts                      # MODIFIED: Add ChatCommandOptions.resume

tests/
├── unit/
│   └── conversations/
│       ├── conversation.store.test.ts
│       ├── conversation.lock.test.ts
│       └── serialization.test.ts
└── integration/
    └── conversation-persistence.test.ts
```

**Structure Decision**: Follows existing module pattern (see `src/proposals/` for reference). New `src/conversations/` module with store, types, and lock files. Minimal modifications to existing files.

## Complexity Tracking

No violations requiring justification. Design follows existing patterns (ProposalStore) and constitution principles.

## Integration Points

### Session Lifecycle

1. **Session.initialize()**: After key facts load, before system prompt, check for `resumeConversationId` in options
   - If provided: load conversation from store, restore ConversationManager state
   - Acquire lock on conversation to prevent concurrent access

2. **Session.close()**: After Obsidian logging, before returning
   - Generate title/summary using LLM (reuse existing summarization)
   - Save conversation to store
   - Release lock

### CLI Integration

1. **chatCommand()**:
   - Create ConversationStore instance
   - Parse `--resume` flag (optional ID argument)
   - If `--resume` without ID: show interactive picker
   - Pass `resumeConversationId` to SessionOptions

2. **conversations subcommand**:
   - `list`: Display metadata from index
   - `show <id>`: Display conversation messages
   - `delete <id>`: Remove conversation file + update index

## Key Design Decisions

1. **Index-based listing**: Separate index.json for O(1) metadata access without loading all conversation files
2. **File-per-conversation**: Individual JSON files enable efficient single-conversation operations
3. **Lock file approach**: PID-based lock files in conversations directory for concurrent access control
4. **Title generation**: LLM generates title from first user message on first save, regenerates on subsequent saves
5. **Minimum save threshold**: Only save conversations with at least one complete exchange (user + assistant)

## Post-Design Verification

*Re-evaluated after Phase 1 design completion (2025-12-13)*

| Principle | Status | Post-Design Notes |
|-----------|--------|-------------------|
| I. Local-First Privacy | PASS | Verified: All storage in `~/.diana/conversations/`, no network calls |
| II. Human-in-the-Loop | PASS | Verified: No user file modification, save/resume only affects DIANA data |
| III. Transparent Logging | PASS | Verified: Obsidian logging sequence preserved in Session.close() |
| IV. Simplicity Over Features | PASS | Verified: Follows ProposalStore pattern, minimal new abstractions |
| V. Test-First for Destructive Operations | N/A | Confirmed: No operations on user files |
| VI. Graceful Degradation | PASS | Verified: emptyState() fallback, stale lock detection |
| VII. Resource Consciousness | PASS | Verified: Index-based O(1) listing, cleanup on store load |
| VIII. Explicit Predictable Behavior | PASS | Verified: Clear state machine, documented edge cases |
| IX. Agent-First Design | PASS | Verified: IConversationStore interface with dependency injection |
| X. Transport-Agnostic Services | PASS | Verified: Store returns data, CLI formats output |

**Final Gate Status**: PASS - Ready for task generation
