<!--
Sync Impact Report
==================
Version change: N/A (initial) → 1.0.0
Modified principles: N/A (initial creation)
Added sections:
  - Core Principles (8 principles)
  - Technology Stack
  - Development Workflow
  - Governance
Removed sections: N/A (template placeholders replaced)
Templates requiring updates:
  - .specify/templates/plan-template.md: ✅ Compatible (Constitution Check is generic)
  - .specify/templates/spec-template.md: ✅ Compatible (requirements structure aligns)
  - .specify/templates/tasks-template.md: ✅ Compatible (task patterns support test-first)
Follow-up TODOs: None
-->

# DIANA Constitution

## Core Principles

### I. Local-First Privacy

All processing MUST happen on the user's machine. Core functionality (file watching, organization, indexing, chat) MUST NOT require cloud services or external APIs. User data MUST never leave the local system. Third-party services are permitted only for optional, non-essential features with explicit user opt-in.

**Rationale**: DIANA handles personal files and activity data. Privacy is not a feature—it's a fundamental requirement.

### II. Human-in-the-Loop

All file operations (move, rename, delete, organize) MUST be proposed, not executed. Users MUST explicitly approve each operation before execution. Batch approvals are permitted but MUST display every proposed change. No operation that modifies user data may be automated without prior approval.

**Rationale**: Users must maintain control over their files. Mistakes by AI are acceptable if caught before execution; executed mistakes damage trust.

### III. Transparent Logging

Every observation, decision, and action MUST be logged to the Obsidian vault in human-readable Markdown. Logs MUST include timestamps, reasoning, and outcomes. Users MUST be able to understand DIANA's behavior by reading logs alone.

**Rationale**: Transparency builds trust and enables debugging. If it's not logged, it didn't happen.

### IV. Simplicity Over Features

Prefer fewer, well-implemented features over many partial implementations. Each feature MUST have a clear, single purpose. Avoid configuration complexity—sensible defaults over extensive options. Code complexity MUST be justified by concrete user value.

**Rationale**: A background assistant must be reliable. Complexity breeds bugs and confusion.

### V. Test-First for Destructive Operations

Any code that modifies, moves, or deletes user files MUST have tests written and passing before implementation. Test coverage for file operations is non-negotiable. Integration tests MUST verify the approval flow prevents unauthorized changes.

**Rationale**: File operations are irreversible in practice. Defense in depth prevents catastrophic mistakes.

### VI. Graceful Degradation

DIANA MUST remain functional when external dependencies fail. If Ollama is unavailable, fall back to basic file-type organization. If ChromaDB fails, continue with file watching and logging. Errors MUST be logged and surfaced, never silently swallowed.

**Rationale**: A background service must be resilient. Partial functionality is better than complete failure.

### VII. Resource Consciousness

DIANA runs as a background service and MUST minimize resource usage. LLM calls SHOULD be batched where possible. File watching MUST use efficient event-based APIs, not polling. Memory usage MUST be bounded. CPU usage during idle periods MUST be negligible.

**Rationale**: Users won't tolerate a background assistant that degrades system performance.

### VIII. Explicit Predictable Behavior

Behavior MUST be deterministic given the same inputs. Organization rules MUST be documented and inspectable. Users MUST be able to predict what DIANA will propose for a given file. Magic and implicit behavior are prohibited.

**Rationale**: Predictability enables trust. Users must understand why DIANA makes each proposal.

## Technology Stack

**Required Technologies**:
- Runtime: Node.js with TypeScript (strict mode)
- LLM: Ollama with qwen3:30b-a3b (local inference only)
- Vector Storage: ChromaDB (embedded mode)
- File Watching: chokidar
- Logging: Obsidian vault (Markdown files)

**Constraints**:
- No cloud APIs for core functionality
- No telemetry or analytics
- All dependencies MUST support offline operation
- Configuration via TypeScript file (type-safe)

## Development Workflow

**Quality Gates**:
- All file operation code requires tests before merge
- Integration tests MUST verify human-approval flow
- No PR may disable or skip the approval mechanism
- Logging coverage: every public function that affects state MUST log

**Code Review Checklist**:
1. Does this change respect local-first privacy?
2. Are file operations gated by human approval?
3. Is the behavior logged and predictable?
4. Does it degrade gracefully on dependency failure?

## Governance

This constitution supersedes all other practices and documentation. Amendments require:
1. Written proposal with rationale
2. Impact analysis on existing features
3. Version increment following semantic versioning
4. Update to all affected documentation

All code changes MUST verify compliance with these principles. Complexity or principle violations MUST be explicitly justified in PR descriptions.

See `CLAUDE.md` for runtime development guidance.

**Version**: 1.0.0 | **Ratified**: 2025-12-10 | **Last Amended**: 2025-12-10
