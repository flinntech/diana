# Implementation Plan: Agent + MCP Foundation

**Branch**: `004-agent-mcp-foundation` | **Date**: 2025-12-12 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-agent-mcp-foundation/spec.md`

## Summary

Build foundational architecture for DIANA's agent-based capability system. This includes:
- **Agent Interface** with standardized lifecycle (initialize/execute/shutdown) and manifest
- **Orchestrator** that replaces direct tool registry access, routes requests to agents
- **MCP Client** for connecting to external MCP servers and discovering tools
- **LegacyToolAgent** wrapper to migrate existing tools (obsidian, memory, watcher) without breaking changes

The architecture positions DIANA for future multi-agent/multi-process evolution while keeping everything in-process for V1.

## Technical Context

**Language/Version**: TypeScript 5.9+ with Node.js 18+ (ES modules, strict mode)
**Primary Dependencies**: `@modelcontextprotocol/sdk` (MCP TypeScript SDK), existing DIANA framework
**Storage**: N/A (stateless orchestrator; MCP config in `config/mcp-servers.json`)
**Testing**: Vitest (existing pattern from feature 002/003)
**Target Platform**: Linux/WSL (local-first, Ollama backend)
**Project Type**: Single project (extends existing `src/` structure)
**Performance Goals**: 5s orchestrator routing overhead, 30s tool execution limit, 10s MCP health detection
**Constraints**: Local-only operation, no cloud APIs, backward compatibility with existing tools
**Scale/Scope**: 10 agents with 50+ tools without degradation (SC-004)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Local-First Privacy | PASS | MCP servers run locally; no cloud dependencies |
| II. Human-in-the-Loop | PASS | FR-011 requires approval for destructive actions; uses existing proposals.json pattern |
| III. Transparent Logging | PASS | FR-015/16/17 mandate structured logs, metrics, correlation IDs |
| IV. Simplicity Over Features | PASS | Minimal V1 scope; no circuit breakers, no queuing, no resource limits |
| V. Test-First for Destructive Ops | PASS | Legacy tools already tested; new agent lifecycle needs tests |
| VI. Graceful Degradation | PASS | FR-006 handles MCP disconnection; partial agent init allowed |
| VII. Resource Consciousness | PASS | In-process modules share resources; metrics provide visibility |
| VIII. Explicit Predictable Behavior | PASS | Deterministic routing based on tool name |
| IX. Agent-First Design | PASS | Core purpose of this feature |
| IX.a Agent/LLM Separation | PASS | Agents own state/policies; LLM is stateless reasoning |
| IX.b Agent Manifest | PASS | FR-014 + spec clarifications define manifest structure |
| IX.c Tool Filtering | DEFERRED | Single MCP connection per agent for V1; filtering for future |
| IX.d Model Agnosticism | PASS | Model selection is agent implementation detail |

**Code Review Checklist Alignment**:
1. Local-first privacy respected (no cloud)
2. File operations gated by approval (existing proposal flow)
3. Behavior logged and predictable (FR-015-17)
4. Graceful degradation on dependency failure (FR-006)
5. Structured as agent modules with clean interface (core feature)
6. MCP used for tool exposure (FR-004/005)
7. Multi-step approval after context-gathering (matches constitution 1.2.0)

## Project Structure

### Documentation (this feature)

```text
specs/004-agent-mcp-foundation/
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
├── agent/
│   ├── types/
│   │   └── agent.ts          # NEW: Agent, AgentManifest, Orchestrator interfaces
│   ├── orchestrator.ts       # NEW: Orchestrator implementation
│   ├── mcp-client.ts         # NEW: MCP server connection manager
│   ├── legacy-tool-agent.ts  # NEW: Wrapper for existing tools
│   ├── session.ts            # MODIFY: Route through orchestrator
│   ├── tools.ts              # KEEP: ToolRegistry (used internally by LegacyToolAgent)
│   ├── tools/                # KEEP: Existing tool implementations
│   └── ...
├── types/
│   └── agent.ts              # MODIFY: Add new error codes
├── config/
│   └── mcp-servers.json      # NEW: MCP server configuration
└── ...

tests/
├── unit/
│   ├── orchestrator.test.ts  # NEW: Orchestrator unit tests
│   ├── mcp-client.test.ts    # NEW: MCP client tests
│   └── legacy-agent.test.ts  # NEW: Legacy wrapper tests
└── integration/
    └── agent-system.test.ts  # NEW: End-to-end agent tests
```

**Structure Decision**: Extend existing `src/agent/` directory with new modules. Create `src/agent/types/` for agent-specific type definitions separate from the existing `src/types/agent.ts` to keep concerns isolated.

## Complexity Tracking

| Potential Complexity | Decision | Rationale |
|---------------------|----------|-----------|
| Circuit breaker for failing agents | DEFERRED | V1 returns errors in ToolResult; metrics surface patterns |
| Rate limiting/backpressure | DEFERRED | Async Promise handles concurrency naturally |
| Per-agent resource limits | DEFERRED | Shared process resources; add when pain hits |
| Tool filtering per agent | DEFERRED | Single connection per agent for V1 simplicity |
| Multi-model support | DESIGNED FOR | Orchestrator doesn't know which model powers agent |

## Key Design Decisions

### 1. Session Integration Point

**Current** (session.ts):
```typescript
const tools = this.toolRegistry.getToolDefinitions();
const result = await this.toolRegistry.execute(name, args);
```

**After** (session.ts):
```typescript
const tools = this.orchestrator.getAllToolDefinitions();
const result = await this.orchestrator.execute(name, args);
```

Same interface, different implementation.

### 2. Agent Registration Pattern

Factory pattern per spec clarifications:
```typescript
orchestrator.registerAgentFactory('legacy', () => new LegacyToolAgent(toolRegistry));
orchestrator.registerAgentFactory('mcp-filesystem', () => new MCPAgent(config));
```

Orchestrator instantiates agents when needed.

### 3. MCP Client Strategy

- Use `@modelcontextprotocol/sdk` official TypeScript SDK
- One MCP client instance per configured server
- Auto-reconnect polling every 30s for disconnected servers
- Simple retry: 1 retry with 3s delay for connection/timeout errors

### 4. Error Code Extensions

Add to existing `AgentErrorCode` type:
- `AGENT_INIT_FAILED`
- `AGENT_SHUTDOWN_FAILED`
- `AGENT_NOT_FOUND`
- `AGENT_UNAVAILABLE`
- `TOOL_EXECUTION_TIMEOUT`

### 5. Backward Compatibility

`LegacyToolAgent` wraps existing `ToolRegistry`:
- Implements `Agent` interface
- Returns manifest with all legacy tools
- Delegates `execute()` to underlying `ToolRegistry.execute()`
- Existing tools continue working unchanged
