# Tasks: Agent + MCP Foundation

**Input**: Design documents from `/specs/004-agent-mcp-foundation/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included per plan.md test file structure (Vitest, consistent with features 002/003).

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root (per plan.md structure)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependencies, and base type definitions

- [X] T001 Install MCP SDK dependencies: `npm install @modelcontextprotocol/sdk zod`
- [X] T002 Create agent types directory at src/agent/types/
- [X] T003 [P] Define Agent, AgentManifest, ToolDefinition interfaces in src/agent/types/agent.ts
- [X] T004 [P] Define IOrchestrator, AgentFactory interfaces in src/agent/types/orchestrator.ts
- [X] T005 [P] Define MCPServerConfig, MCPConnectionState, IMCPClientManager interfaces in src/agent/types/mcp.ts
- [X] T006 [P] Define AgentHealth, OrchestratorMetrics, AgentLogEntry interfaces in src/agent/types/metrics.ts
- [X] T007 Extend AgentErrorCode with new error codes in src/types/agent.ts
- [X] T008 Create MCP servers config file at config/mcp-servers.json with empty servers array
- [X] T009 [P] Add type exports barrel file at src/agent/types/index.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T010 Implement AgentError class with error code support in src/agent/errors.ts
- [X] T011 [P] Implement OrchestratorMetrics class with counter/latency tracking in src/agent/metrics.ts
- [X] T012 [P] Implement AgentLogger with structured logging and correlation IDs in src/agent/logger.ts
- [X] T013 Implement timeout utility for tool execution (30s default) in src/agent/utils/timeout.ts
- [X] T014 Create agent module barrel file at src/agent/index.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Register and Execute Agent Tool (Priority: P1) MVP

**Goal**: Enable DIANA's LLM to invoke tools through agents via the orchestrator

**Independent Test**: Register a test agent, send tool execution request through orchestrator, verify result returned correctly

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T015 [P] [US1] Unit test: orchestrator registers agent factory in tests/unit/orchestrator.test.ts
- [X] T016 [P] [US1] Unit test: orchestrator routes execute() to correct agent in tests/unit/orchestrator.test.ts
- [X] T017 [P] [US1] Unit test: orchestrator returns error for unknown tool in tests/unit/orchestrator.test.ts
- [X] T018 [P] [US1] Unit test: orchestrator aggregates tool definitions from agents in tests/unit/orchestrator.test.ts

### Implementation for User Story 1

- [X] T019 [US1] Implement Orchestrator class with registerAgentFactory() in src/agent/orchestrator.ts
- [X] T020 [US1] Implement Orchestrator.getAllToolDefinitions() to aggregate from all agents in src/agent/orchestrator.ts
- [X] T021 [US1] Implement Orchestrator.execute() with tool-to-agent routing in src/agent/orchestrator.ts
- [X] T022 [US1] Add tool name collision detection (reject duplicates, log warning) in src/agent/orchestrator.ts
- [X] T023 [US1] Add correlation ID support and metrics tracking to execute() in src/agent/orchestrator.ts
- [X] T024 [US1] Add timeout enforcement (30s) for tool execution in src/agent/orchestrator.ts
- [X] T025 [US1] Define isDestructiveAction() helper checking tool metadata for destructive patterns in src/agent/orchestrator.ts
- [X] T026 [US1] Implement approval gate in Orchestrator.execute() - if agent.requiresApproval && isDestructive, create proposal via proposals.json instead of direct execution in src/agent/orchestrator.ts

**Checkpoint**: User Story 1 complete - can register agents and execute tools through orchestrator (with approval flow for destructive actions)

---

## Phase 4: User Story 2 - Discover Tools from MCP Server (Priority: P2)

**Goal**: Connect to MCP servers, discover tools, and make them available through the agent system

**Independent Test**: Start mock MCP server, have DIANA connect, verify discovered tools appear in orchestrator registry

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T027 [P] [US2] Unit test: MCPClientManager connects to server via stdio in tests/unit/mcp-client.test.ts
- [X] T028 [P] [US2] Unit test: MCPClientManager discovers tools from server in tests/unit/mcp-client.test.ts
- [X] T029 [P] [US2] Unit test: MCPClientManager handles disconnection gracefully and detects within 10s (SC-003) in tests/unit/mcp-client.test.ts
- [X] T030 [P] [US2] Unit test: MCPClientManager retries connection once on failure in tests/unit/mcp-client.test.ts

### Implementation for User Story 2

- [X] T031 [US2] Implement MCPClientManager constructor with config loading in src/agent/mcp-client-manager.ts
- [X] T032 [US2] Implement MCPClientManager.connect() using StdioClientTransport in src/agent/mcp-client-manager.ts
- [X] T033 [US2] Implement tool discovery via client.listTools() in src/agent/mcp-client-manager.ts
- [X] T034 [US2] Implement MCPClientManager.executeTool() via client.callTool() in src/agent/mcp-client-manager.ts
- [X] T035 [US2] Implement MCPClientManager.disconnect() with cleanup in src/agent/mcp-client-manager.ts
- [X] T036 [US2] Add retry logic (1 retry, 3s delay) for connection/timeout errors in src/agent/mcp-client-manager.ts
- [X] T037 [US2] Implement startReconnectPolling() with 30s interval in src/agent/mcp-client-manager.ts
- [X] T038 [US2] Add connection state tracking (disconnected/connecting/connected/ready/error) in src/agent/mcp-client-manager.ts
- [X] T039 [US2] Implement MCPAgent class that wraps MCPClientManager as Agent interface in src/agent/mcp-agent.ts
- [X] T040 [US2] Integrate MCPClientManager into Orchestrator.loadMCPServers() in src/agent/orchestrator.ts

**Checkpoint**: User Story 2 complete - can discover and execute tools from MCP servers

---

## Phase 5: User Story 3 - Wrap Existing Tools as Agents (Priority: P3)

**Goal**: Wrap existing DIANA tools (save_fact, Obsidian logging) as agents for backward compatibility

**Independent Test**: Invoke existing tools through both legacy interface and new agent interface, verify identical behavior

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T041 [P] [US3] Unit test: LegacyToolAgent wraps ToolRegistry correctly in tests/unit/legacy-agent.test.ts
- [X] T042 [P] [US3] Unit test: LegacyToolAgent.execute() delegates to registry in tests/unit/legacy-agent.test.ts
- [X] T043 [P] [US3] Unit test: LegacyToolAgent.getManifest() returns wrapped tools in tests/unit/legacy-agent.test.ts

### Implementation for User Story 3

- [X] T044 [US3] Implement LegacyToolAgent class with ToolRegistry wrapper in src/agent/legacy-tool-agent.ts
- [X] T045 [US3] Implement LegacyToolAgent.initialize() (no-op, tools already registered) in src/agent/legacy-tool-agent.ts
- [X] T046 [US3] Implement LegacyToolAgent.execute() delegating to ToolRegistry.execute() in src/agent/legacy-tool-agent.ts
- [X] T047 [US3] Implement LegacyToolAgent.shutdown() (no-op, registry has no cleanup) in src/agent/legacy-tool-agent.ts
- [X] T048 [US3] Implement LegacyToolAgent.getManifest() converting registry definitions in src/agent/legacy-tool-agent.ts
- [X] T049 [US3] Modify Session constructor to accept optional Orchestrator in src/agent/session.ts
- [X] T050 [US3] Modify Session.initialize() to register LegacyToolAgent factory in src/agent/session.ts
- [X] T051 [US3] Replace toolRegistry.getToolDefinitions() with orchestrator.getAllToolDefinitions() in src/agent/session.ts
- [X] T052 [US3] Replace toolRegistry.execute() with orchestrator.execute() in src/agent/session.ts

**Checkpoint**: User Story 3 complete - existing tools work through agent system, backward compatible

---

## Phase 6: User Story 4 - Manage Agent Lifecycle (Priority: P4)

**Goal**: Enable administrators to start, stop, and check health of agents

**Independent Test**: Start agent, verify in health checks, stop agent, verify no longer responds

### Tests for User Story 4

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T053 [P] [US4] Unit test: Orchestrator.getAgentHealth() returns correct status in tests/unit/orchestrator.test.ts
- [X] T054 [P] [US4] Unit test: Orchestrator.stopAgent() shuts down agent in tests/unit/orchestrator.test.ts
- [X] T055 [P] [US4] Unit test: Orchestrator.startAgent() re-initializes agent in tests/unit/orchestrator.test.ts
- [ ] T056 [P] [US4] Integration test: full agent lifecycle in tests/integration/agent-system.test.ts

### Implementation for User Story 4

- [X] T057 [US4] Implement Orchestrator.getAgentHealth() with status check in src/agent/orchestrator.ts
- [X] T058 [US4] Implement Orchestrator.getAllAgentHealth() aggregating all agents in src/agent/orchestrator.ts
- [X] T059 [US4] Implement Orchestrator.stopAgent() with graceful shutdown in src/agent/orchestrator.ts
- [X] T060 [US4] Implement Orchestrator.startAgent() re-instantiating from factory in src/agent/orchestrator.ts
- [X] T061 [US4] Implement Orchestrator.shutdown() with parallel agent shutdown (5s timeout) in src/agent/orchestrator.ts
- [X] T062 [US4] Add agent state tracking (initialized/running/stopped) in Orchestrator in src/agent/orchestrator.ts

**Checkpoint**: User Story 4 complete - full lifecycle management for agents

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Integration testing, validation, and documentation

- [X] T063 [P] Integration test: end-to-end tool execution through Session in tests/integration/agent-system.test.ts
- [ ] T064 [P] Integration test: MCP server connection and tool discovery in tests/integration/agent-system.test.ts (requires actual MCP server)
- [X] T065 [P] Integration test: legacy tools work identically through orchestrator in tests/integration/agent-system.test.ts
- [X] T066 Verify SC-001: routing overhead < 5s with synthetic benchmarks
- [X] T067 Verify SC-002: existing tools behavior unchanged (run existing tests)
- [X] T068 Verify SC-004: register 10 agents with 50+ tools without degradation
- [X] T069 Verify SC-005: health checks complete within 1s with timing assertions
- [ ] T070 Run quickstart.md validation scenarios manually
- [ ] T071 Update CLAUDE.md with active technologies for feature 004

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 (P1): Can start immediately after Foundational
  - US2 (P2): Can start after Foundational; integrates with US1's Orchestrator
  - US3 (P3): Can start after US1 (needs Orchestrator); modifies Session
  - US4 (P4): Can start after US1 (extends Orchestrator)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Independent - creates Orchestrator foundation (includes approval gate per FR-011)
- **User Story 2 (P2)**: Integrates MCPClientManager into Orchestrator (T040 depends on US1)
- **User Story 3 (P3)**: Depends on Orchestrator from US1 (T049-T052 modify Session)
- **User Story 4 (P4)**: Extends Orchestrator from US1 (adds lifecycle methods)

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Type definitions before implementations
- Core functionality before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T003-T006, T009)
- All Foundational tasks marked [P] can run in parallel (T011, T012)
- Tests for a user story marked [P] can run in parallel
- User Stories 2 and 4 can be worked in parallel after US1 is complete
- User Story 3 has session modification dependency, best done after US1
- Phase 7 integration tests (T063-T065) can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit test: orchestrator registers agent factory in tests/unit/orchestrator.test.ts"
Task: "Unit test: orchestrator routes execute() to correct agent in tests/unit/orchestrator.test.ts"
Task: "Unit test: orchestrator returns error for unknown tool in tests/unit/orchestrator.test.ts"
Task: "Unit test: orchestrator aggregates tool definitions from agents in tests/unit/orchestrator.test.ts"
```

---

## Parallel Example: Setup Phase

```bash
# Launch all interface definitions in parallel:
Task: "Define Agent, AgentManifest, ToolDefinition interfaces in src/agent/types/agent.ts"
Task: "Define IOrchestrator, AgentFactory interfaces in src/agent/types/orchestrator.ts"
Task: "Define MCPServerConfig, MCPConnectionState, IMCPClientManager interfaces in src/agent/types/mcp.ts"
Task: "Define AgentHealth, OrchestratorMetrics, AgentLogEntry interfaces in src/agent/types/metrics.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test Orchestrator with mock agent
5. Deploy/demo if ready - agents can now be registered and execute tools

### Incremental Delivery

1. Complete Setup + Foundational -> Foundation ready
2. Add User Story 1 -> Test independently -> MVP! (core agent execution)
3. Add User Story 2 -> Test independently -> MCP integration works
4. Add User Story 3 -> Test independently -> Backward compatibility confirmed
5. Add User Story 4 -> Test independently -> Full lifecycle management
6. Each story adds value without breaking previous stories

### Recommended Order

For a single developer:
1. Phase 1 (Setup) - ~1 session
2. Phase 2 (Foundational) - ~1 session
3. Phase 3 (US1) - ~2 sessions (core orchestrator)
4. Phase 5 (US3) - ~1 session (enables testing with real tools)
5. Phase 4 (US2) - ~2 sessions (MCP integration)
6. Phase 6 (US4) - ~1 session (lifecycle management)
7. Phase 7 (Polish) - ~1 session

This order prioritizes getting real tools working (US3) before MCP (US2) since legacy tools can verify the system end-to-end.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- The contracts/ directory contains TypeScript interfaces that can be copied as starting point for T003-T006
- **Total tasks**: 71 (was 68, added 3 for FR-011 approval and SC-005 verification)
