# Implementation Plan: Obsidian Integration - DIANA's Memory & Notes

**Branch**: `001-obsidian-integration` | **Date**: 2025-12-10 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-obsidian-integration/spec.md`

## Summary

Implement an ObsidianWriter module that enables DIANA to write structured Markdown notes to her Obsidian vault. This provides persistent memory through daily activity logs, observation notes, proposal reasoning documentation, and system status records. All writes use atomic file operations with lock files to prevent corruption, and errors fall back to local logging.

## Technical Context

**Language/Version**: Node.js with TypeScript (ES modules, strict mode)
**Primary Dependencies**:
- `gray-matter` - YAML frontmatter parsing/serialization
- `date-fns` - Lightweight date formatting (ISO 8601)
- `write-file-atomic` - Atomic file writes (write-to-temp-then-rename)
- `proper-lockfile` - Cross-process file locking
- Native `fs/promises` - Directory operations and file reading

**Storage**: File system - Obsidian vault at `/mnt/c/Users/joshu/Obsidian/DIANA/DIANA_brain`
**Testing**:
- Unit tests with `mock-fs` for filesystem mocking
- Integration tests writing to temporary directories
- Atomic write verification (interrupt mid-write, verify no corruption)

**Target Platform**: Linux/WSL background service with access to Windows filesystem via /mnt/c
**Project Type**: Single project (library module for DIANA core)
**Performance Goals**:
- Write operations complete within 1 second
- Index updates within 5 seconds of note creation

**Constraints**:
- No Obsidian API/plugin dependency - pure Markdown file writes
- Must work when Obsidian is closed
- Memory footprint minimal (no caching full vault)
- All writes logged per Constitution Article III

**Scale/Scope**:
- Tens to hundreds of log entries per day
- Five note types: daily, observation, proposal, system, index

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Local-First Privacy | PASS | All writes are local filesystem only. No cloud services. |
| II. Human-in-the-Loop | PASS | This feature is logging-only, not destructive. Writes to dedicated DIANA vault, not user files. |
| III. Transparent Logging | PASS | This IS the transparent logging implementation. Every write includes timestamps and reasoning. |
| IV. Simplicity Over Features | PASS | Single ObsidianWriter class with clear purpose. Sensible defaults for templates. |
| V. Test-First for Destructive Operations | N/A | Writes to dedicated vault directory, not user files. Will implement tests before integration. |
| VI. Graceful Degradation | MUST IMPLEMENT | Error queue for vault unavailability. Fallback logging to `/home/diana/logs/`. |
| VII. Resource Consciousness | MUST IMPLEMENT | No vault caching. Event-based writes, not polling. Bounded memory usage. |
| VIII. Explicit Predictable Behavior | PASS | Deterministic note paths based on date/type. Documented templates. Inspectable output. |

**Gate Status**: PASS with implementation requirements for principles VI and VII.

## Project Structure

### Documentation (this feature)

```text
specs/001-obsidian-integration/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api.ts           # TypeScript interfaces
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── obsidian/
│   ├── index.ts          # Exports ObsidianWriter class
│   ├── writer.ts         # Core write logic with atomic operations
│   ├── templates.ts      # Markdown templates for each note type
│   ├── frontmatter.ts    # Frontmatter generation helpers
│   ├── paths.ts          # Path resolution and validation
│   └── errors.ts         # Custom error classes
├── types/
│   └── obsidian.ts       # TypeScript interfaces for notes
└── config/
    └── diana.config.ts   # Vault path and template configuration

tests/
├── unit/
│   └── obsidian/
│       ├── writer.test.ts
│       ├── templates.test.ts
│       ├── frontmatter.test.ts
│       └── paths.test.ts
└── integration/
    └── obsidian/
        └── vault-writes.test.ts
```

**Structure Decision**: Single project structure. The obsidian module lives under `src/obsidian/` as a self-contained library that other DIANA components will import. Tests mirror the source structure under `tests/`.

## Complexity Tracking

> No violations requiring justification. Design follows Constitution principles.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| - | - | - |
