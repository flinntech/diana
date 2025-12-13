# Implementation Plan: Obsidian Rich Linking

**Branch**: `006-obsidian-rich-linking` | **Date**: 2025-12-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-obsidian-rich-linking/spec.md`

## Summary

Transform DIANA's Obsidian vault from one-way notes into a bidirectional knowledge graph. Implements auto-maintained backlinks, fact provenance, conversation anchors, and rollup notes. Core approach: LinkManager extracts wiki-links and tracks relationships in memory; ObsidianWriter handles all file I/O including backlink updates with existing atomic write and locking infrastructure.

## Technical Context

**Language/Version**: TypeScript 5.9+ with Node.js 18+ (ES modules, strict mode)
**Primary Dependencies**: write-file-atomic, proper-lockfile, gray-matter, date-fns (all existing)
**Storage**: Obsidian vault (markdown files at `/mnt/c/Users/joshu/Obsidian/DIANA/DIANA_brain`)
**Testing**: Jest with mock-fs (existing infrastructure)
**Target Platform**: Linux/Windows/macOS (WSL-compatible)
**Project Type**: Single project (CLI + service)
**Performance Goals**: Backlink updates complete within same write operation; vault scan <5s for 1000 notes
**Constraints**: Local-first only, 5s lock timeout, eventual consistency for backlink failures
**Scale/Scope**: Single vault, up to 10 concurrent writes, ~1000 notes typical

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Local-First Privacy | ✅ PASS | All operations are local vault file operations |
| II. Human-in-the-Loop | ⚪ N/A | Backlinks are auto-maintained metadata derived from content. Not destructive file operations. Migration has dry-run mode for user review. |
| III. Transparent Logging | ✅ PASS | All writes logged to vault; migration logs skipped/failed notes |
| IV. Simplicity Over Features | ✅ PASS | Clean separation: LinkManager (extraction/tracking) vs ObsidianWriter (I/O) |
| V. Test-First for Destructive Ops | ✅ PASS | Migration requires dry-run mode; file ops tested before implementation |
| VI. Graceful Degradation | ✅ PASS | Eventual consistency model - source write succeeds, backlink queued on failure |
| VII. Resource Consciousness | ✅ PASS | Event-based updates, not polling; bounded retry queue |
| VIII. Explicit Predictable Behavior | ✅ PASS | Content wiki-links are authoritative source of truth |
| IX. Agent-First Design | ✅ PASS | LinkManager is independent module with clean interface |
| X. Transport-Agnostic Services | ✅ PASS | LinkManager returns structured data; ObsidianWriter handles I/O |

**Gate Result**: ✅ PASSED - All applicable principles satisfied.

## Project Structure

### Documentation (this feature)

```text
specs/006-obsidian-rich-linking/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── link-manager.ts  # TypeScript interface contracts
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── obsidian/
│   ├── writer.ts           # Existing - extend with backlink methods
│   ├── link-manager.ts     # NEW - wiki-link extraction and tracking
│   ├── rollup-generator.ts # NEW - weekly/monthly rollup generation
│   ├── frontmatter.ts      # Existing - extend with references types
│   ├── templates.ts        # Existing - extend with backlink section
│   ├── paths.ts            # Existing - extend with rollup/conversation paths
│   └── errors.ts           # Existing - extend with link errors
├── types/
│   └── obsidian.ts         # Existing - extend with link types
├── agent/
│   └── memory.ts           # Existing - extend KeyFact with sourceNote
├── cli/
│   └── vault.ts            # NEW - vault subcommand (migrate, validate, rollup)
└── conversations/
    └── conversation.store.ts # Existing - extend with anchor creation

tests/
├── unit/
│   ├── link-manager.test.ts     # NEW
│   └── rollup-generator.test.ts # NEW
├── integration/
│   ├── backlink-flow.test.ts    # NEW
│   └── migration.test.ts        # NEW
└── contract/
    └── link-types.test.ts       # NEW
```

**Structure Decision**: Single project structure maintained. New modules follow existing pattern in `src/obsidian/`. CLI commands extend existing commander-based CLI.

## Complexity Tracking

> No violations requiring justification. Design follows existing patterns.

| Consideration | Decision | Rationale |
|---------------|----------|-----------|
| LinkManager separate from ObsidianWriter | Yes | Single responsibility - extraction vs I/O |
| In-memory link tracking vs file-based | In-memory | Performance; frontmatter is cache, content is truth |
| Backlink retry queue | Reuse existing InMemoryWriteQueue | Avoid new infrastructure |
