<!--
Sync Impact Report
==================
Version change: 1.2.0 → 1.3.0
Modified principles:
  - Added Principle X: Transport-Agnostic Services (new)
Added sections:
  - Architecture Vision: Near-Term Architecture diagram (new)
  - Architecture Decisions: Service Layer Design decision #7 (new)
  - Code Review Checklist item 8 (new)
Removed sections: None
Templates requiring updates:
  - .specify/templates/plan-template.md: ✅ Compatible (Constitution Check is generic)
  - .specify/templates/spec-template.md: ✅ Compatible (requirements structure aligns)
  - .specify/templates/tasks-template.md: ✅ Compatible (task patterns support agent modules)
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

### IX. Agent-First Design

New capabilities MUST be structured as agent modules with clean interfaces. Agents MUST communicate through the orchestrator, not directly with each other. Each agent MUST be designed for eventual process separation. Tool interfaces SHOULD use MCP (Model Context Protocol) for standardization and ecosystem compatibility.

**Rationale**: DIANA will grow into a multi-agent system. Designing for separation now prevents painful refactoring later and enables tool reuse across LLM applications.

**Sub-principles**:

**IX.a. Agent/LLM Separation**: Agents are application code that own state, tool filtering, policies, and lifecycle management. The LLM is a stateless reasoning service that agents invoke when they need intelligence applied to a task. The LLM has no knowledge of agents—it only sees whatever context an agent (or the orchestrator) puts in the prompt.

**IX.b. Agent Manifest**: Every agent MUST provide a manifest containing:
- `id`: Unique identifier (e.g., `web-agent`, `system-agent`)
- `name`: Human-readable display name
- `tools`: Filtered list of tools this agent exposes
- `capabilities`: Array of routing hints (e.g., `["web-search", "url-fetch"]`)
- `requiresApproval`: Boolean indicating if operations need user approval
- `modelRequirements` (optional): For future multi-model support

**IX.c. Tool Filtering**: Multiple agents MAY share a single MCP connection while exposing different filtered subsets of tools. This enables separation of concerns (read vs write), distinct approval policies, and context efficiency without duplicating resources.

**IX.d. Model Agnosticism**: Model selection is an agent implementation detail. The architecture MUST support agents using different LLMs, but the orchestrator and other agents SHOULD NOT know or care which model powers a given agent. This keeps the multi-model option open without requiring it.

### X. Transport-Agnostic Services

Services MUST be designed to work across CLI, HTTP API, and WebSocket interfaces without modification. Business logic MUST be separated from I/O concerns. Methods SHOULD return structured data rather than performing output directly. Services MUST emit events for state changes to enable real-time subscriptions.

**Rationale**: DIANA will eventually have a web dashboard for proposal approval, activity monitoring, and agent management. Designing services for transport independence now prevents costly refactoring later.

**Sub-principles**:

**X.a. Return Data Over Side Effects**: Public service methods MUST return structured results (objects, arrays, status codes) rather than printing to console, logging success, or performing I/O as their primary function. Logging and I/O are separate concerns handled by callers or decorators.

**X.b. Event-Driven State Changes**: Services that manage state MUST emit events when state changes (e.g., `proposal:created`, `file:analyzed`). This enables real-time updates via WebSocket/SSE without polling.

**X.c. Dependency Injection**: Services SHOULD receive dependencies (config, other services, I/O adapters) via constructor or factory, not import globals. This enables testing and alternative transports.

**X.d. API-Friendly Signatures**: Public methods SHOULD have signatures suitable for REST/GraphQL exposure: accept plain objects/primitives as parameters, return serializable data, throw typed errors with codes.

## Architecture Vision

### Current Architecture (Monolith)

```
CLI → Session → Ollama
         ↓
    Tool Registry → Tools (all in-process)
```

### Near-Term Architecture (API + Dashboard)

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
├──────────────┬──────────────────┬───────────────────────┤
│     CLI      │    REST API      │   WebSocket/SSE       │
│  (commander) │ (Express/Fastify)│   (real-time)         │
└──────┬───────┴────────┬─────────┴───────────┬───────────┘
       │                │                     │
       └────────────────┼─────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────┐
│                    Service Layer                         │
│  ProposalService │ Session │ WatcherService │ Orchestrator
│     (events)     │ (chat)  │   (events)     │  (tools)   │
└─────────────────────────────────────────────────────────┘
                        │
┌─────────────────────────────────────────────────────────┐
│                    External I/O                          │
│   OllamaClient  │  ObsidianWriter  │  File System        │
└─────────────────────────────────────────────────────────┘
```

### Target Architecture (Multi-Agent Microservices)

```
                    ┌─────────────────┐
                    │  Orchestrator   │
                    │    (DIANA)      │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  Web Agent    │  │ Productivity  │  │ System Agent  │
│ (search/fetch)│  │    Agent      │  │ (shell/files) │
└───────────────┘  │ (Reclaim.ai)  │  └───────────────┘
                   └───────────────┘
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ Voice Agent   │  │ Memory Agent  │  │  Home Agent   │
│  (STT/TTS)    │  │  (RAG/facts)  │  │(Home Assistant)│
└───────────────┘  └───────────────┘  └───────────────┘
```

### Architecture Decisions

1. **Communication**: HTTP REST for synchronous calls + Redis pub/sub for events
   - Request/response patterns use REST
   - Events (file changes, reminders, proactive alerts) use pub/sub
   - Redis provides lightweight, local-friendly caching

2. **Runtime**: In-process modules designed for separation
   - Start with everything in one process
   - Each agent is a module with clean interface
   - Agents communicate through orchestrator, not directly
   - Extract to separate process when needed (crashy, slow, resource-heavy)

3. **Evolution**: Design now, implement incrementally
   - Define Agent interface before building capabilities
   - Structure new features as agent modules
   - Build orchestrator routing logic early
   - Defer process separation until pain hits

4. **Tool Interface**: MCP servers where possible
   - Use Model Context Protocol for standardized tool exposure
   - Enables tool reuse across different LLM applications
   - Each agent can expose capabilities as MCP server
   - Leverage existing MCP ecosystem (filesystem, git, etc.)

5. **Routing Layer**: Lightweight routing before execution
   - Orchestrator uses a routing step before selecting an agent
   - Routing context contains agent summaries derived from manifests (not full tool definitions)
   - Keeps token usage minimal during routing decisions
   - Only after routing does the orchestrator load the selected agent's full tool set for execution

6. **Task Decomposition**: Planning step for complex queries
   - Complex queries spanning multiple agents are handled by a planning step
   - The orchestrator (or a dedicated Task Breakdown Agent) decomposes the user's request into a sequence of steps, each routable to a single agent
   - For plans involving write operations, the orchestrator executes read steps to gather context first
   - Orchestrator pauses for user approval before executing write steps
   - This ensures users approve with full knowledge of what will be affected

7. **Service Layer Design**: Transport-agnostic from day one
   - Services own business logic and state management
   - Presentation layer (CLI, API, WebSocket) calls services
   - Services emit events; presentation layer subscribes and forwards
   - No console.log or readline in service layer code
   - Enables adding HTTP API without refactoring core services

## Technology Stack

**Current Technologies**:
- Runtime: Node.js with TypeScript (strict mode)
- LLM: Ollama with qwen3:30b-a3b (local inference only)
- Vector Storage: ChromaDB (embedded mode)
- File Watching: chokidar
- Logging: Obsidian vault (Markdown files)

**Future Architecture Additions**:
- Inter-agent Communication: HTTP REST + Redis pub/sub
- Tool Protocol: MCP (Model Context Protocol) servers
- Voice: Whisper (STT), Edge TTS/Piper (TTS)
- Productivity: Reclaim.ai API

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
- New capabilities MUST follow agent module pattern

**Code Review Checklist**:
1. Does this change respect local-first privacy?
2. Are file operations gated by human approval?
3. Is the behavior logged and predictable?
4. Does it degrade gracefully on dependency failure?
5. Is this structured as an agent module with clean interface?
6. Does it use MCP for tool exposure where applicable?
7. For multi-step workflows, is approval requested after context-gathering but before destructive operations?
8. Are service methods transport-agnostic (return data, emit events, no direct I/O)?

## Governance

This constitution supersedes all other practices and documentation. Amendments require:
1. Written proposal with rationale
2. Impact analysis on existing features
3. Version increment following semantic versioning
4. Update to all affected documentation

All code changes MUST verify compliance with these principles. Complexity or principle violations MUST be explicitly justified in PR descriptions.

See `CLAUDE.md` for runtime development guidance.
See `docs/CAPABILITY_ROADMAP.md` for build order and architecture details.

**Version**: 1.3.0 | **Ratified**: 2025-12-10 | **Last Amended**: 2025-12-13
