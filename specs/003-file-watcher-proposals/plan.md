# Implementation Plan: File Watcher & Proposals

**Branch**: `003-file-watcher-proposals` | **Date**: 2025-12-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-file-watcher-proposals/spec.md`

## Summary

DIANA watches designated folders (Downloads, Documents) for new/changed files using chokidar, analyzes them with a layered classification approach (patterns → extension → content → LLM), and creates organization proposals stored as JSON. Users review and approve/reject proposals through the existing chat interface via registered tools. All actions are logged to Obsidian for audit trail.

**Key decisions from research**:
- In-process EventEmitter communication (no IPC)
- File path-based deduplication with 24-hour cooldown
- Stability detection (3s delay) for in-progress downloads
- Hybrid analysis: rule-based first, LLM only for uncertain files

## Technical Context

**Language/Version**: TypeScript 5.9+ with Node.js 18+ (ES modules, strict mode)
**Primary Dependencies**: chokidar ^4.0.0, existing DIANA framework (date-fns, gray-matter)
**Storage**: JSON file (`/home/diana/proposals.json`) + Obsidian vault (audit logs)
**Testing**: vitest (unit + integration)
**Target Platform**: Linux (WSL2), with cross-platform file watching via chokidar
**Project Type**: Single project (extends existing DIANA codebase)
**Performance Goals**: Detect file changes within 30s of stability, proposals persist across restarts
**Constraints**: <100MB memory, offline-capable, no cloud APIs, human approval required
**Scale/Scope**: 1-5 watched directories, ~100 pending proposals max

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Pre-Design | Post-Design | Notes |
|-----------|------------|-------------|-------|
| **I. Local-First Privacy** | ✅ Pass | ✅ Pass | All processing local, no cloud APIs |
| **II. Human-in-the-Loop** | ✅ Pass | ✅ Pass | All file operations require explicit approval via tools |
| **III. Transparent Logging** | ✅ Pass | ✅ Pass | All actions logged to Obsidian daily journal |
| **IV. Simplicity** | ✅ Pass | ✅ Pass | Single process, event-driven, no IPC complexity |
| **V. Test-First for Destructive** | ⚠️ Requirement | ⚠️ Pending | File move operations require tests before implementation |
| **VI. Graceful Degradation** | ✅ Pass | ✅ Pass | Fallbacks for missing dirs, corrupted state, offline LLM |
| **VII. Resource Consciousness** | ✅ Pass | ✅ Pass | No startup scan, batched analysis, LLM only when needed |
| **VIII. Predictable Behavior** | ✅ Pass | ✅ Pass | Pattern-first classification, documented rules |

**Test-First Requirement**: Per Constitution V, the following must have tests before implementation:
- `ProposalService.approve()` - executes file move/rename
- File move utility functions
- Integration test for approval flow

## Project Structure

### Documentation (this feature)

```text
specs/003-file-watcher-proposals/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Architecture decisions
├── data-model.md        # Entity definitions
├── quickstart.md        # User guide
├── contracts/           # API contracts
│   ├── proposal-tools.md    # LLM tool definitions
│   └── services.md          # Internal service interfaces
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── watcher/                    # NEW: File watcher module
│   ├── index.ts                # Module exports
│   ├── watcher.service.ts      # WatcherService (chokidar wrapper)
│   ├── analyzer.ts             # FileAnalyzer (classification logic)
│   ├── patterns.ts             # Pattern definitions
│   └── destination.ts          # DestinationResolver
│
├── proposals/                  # NEW: Proposal management module
│   ├── index.ts                # Module exports
│   ├── proposal.service.ts     # ProposalService (lifecycle)
│   ├── proposal.store.ts       # JSON persistence
│   └── proposal.types.ts       # Type definitions
│
├── agent/
│   └── tools/
│       └── watcher.ts          # NEW: Proposal tools for LLM
│
├── types/
│   └── watcher.ts              # NEW: Watcher types
│
└── config/
    └── diana.config.ts         # Extended with WatcherConfig

tests/
├── unit/
│   ├── watcher/
│   │   ├── analyzer.test.ts
│   │   ├── patterns.test.ts
│   │   └── destination.test.ts
│   └── proposals/
│       ├── proposal.service.test.ts
│       └── proposal.store.test.ts
│
└── integration/
    ├── watcher-flow.test.ts    # File detection → proposal creation
    └── approval-flow.test.ts   # Tool invocation → file move
```

**Structure Decision**: Extends the existing single-project structure with two new modules (`watcher/`, `proposals/`) following the established pattern from `obsidian/` and `agent/`.

## Complexity Tracking

> No constitution violations requiring justification.

All design decisions align with constitution principles:
- Single process (Simplicity)
- JSON storage (Simplicity, Local-First)
- Event-driven (Resource Consciousness)
- Pattern-first analysis (Predictable Behavior)

## Implementation Phases

### Phase 1: Core Data & Persistence (Foundation)
- Proposal types and data model
- ProposalStore (JSON persistence)
- ProposalService (CRUD operations)
- Unit tests for store and service

### Phase 2: File Analysis Pipeline
- Pattern matching (filename rules)
- Extension mapping
- Text content sampling
- PDF metadata extraction (optional dependency)
- LLM classification integration
- Unit tests for analyzer

### Phase 3: File Watcher Service
- WatcherService with chokidar
- Stability detection (3s delay)
- Directory management
- Integration with ProposalService
- Integration tests for detection flow

### Phase 4: Tool Registration & Approval Flow
- Proposal tools (list, approve, reject, batch)
- Watcher tools (start, stop, directories)
- Tool registration in Session
- **Tests before implementation** for approve tool
- Integration tests for approval flow
- Obsidian logging integration

### Phase 5: Polish & Edge Cases
- Cooldown management
- Invalid proposal detection
- Error handling
- End-to-end testing

## Dependencies to Add

```json
{
  "dependencies": {
    "chokidar": "^4.0.0"
  },
  "optionalDependencies": {
    "pdf-parse": "^1.1.1"
  }
}
```

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| WSL2 file system events unreliable | chokidar handles WSL edge cases; add integration test on WSL |
| Large file analysis blocks event loop | Content sampling limited to 4KB; LLM calls async |
| Proposals.json corruption | Atomic writes with write-file-atomic; backup on load |
| User accidentally approves wrong file | Sensitive flag + extra confirmation; all actions logged |
