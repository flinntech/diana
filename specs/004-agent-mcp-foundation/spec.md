# Feature Specification: Agent + MCP Foundation

**Feature Branch**: `004-agent-mcp-foundation`
**Created**: 2025-12-12
**Status**: Draft
**Input**: User description: "Create foundational architecture for DIANA's agent-based capability system with Agent Interface, MCP Client Infrastructure, Orchestrator Foundation, and Integration with Existing Tools"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Register and Execute Agent Tool (Priority: P1)

DIANA's LLM needs to invoke tools through agents to fulfill user requests. When a user asks DIANA to perform an action (like saving a fact or logging to Obsidian), the orchestrator routes the request to the appropriate agent, which executes the tool and returns results.

**Why this priority**: This is the core value proposition - enabling DIANA to use agent-based tools. Without this, no agent functionality works.

**Independent Test**: Can be fully tested by registering a simple test agent, sending a tool execution request through the orchestrator, and verifying the result is returned correctly.

**Acceptance Scenarios**:

1. **Given** an agent is registered with the orchestrator, **When** the LLM requests to execute a tool provided by that agent, **Then** the orchestrator routes the request to the agent and returns the tool's result.
2. **Given** the orchestrator receives a tool request, **When** no agent provides the requested tool, **Then** the orchestrator returns an error indicating the tool is unavailable.
3. **Given** an agent is executing a tool, **When** the tool supports async execution, **Then** the orchestrator handles the async response without blocking other requests.

---

### User Story 2 - Discover Tools from MCP Server (Priority: P2)

When DIANA starts up or connects to a new MCP server, it discovers available tools from that server and makes them available through the agent system. This allows DIANA to dynamically extend its capabilities by connecting to external MCP-compatible services.

**Why this priority**: MCP integration expands DIANA's capabilities beyond built-in tools, but requires the core agent system (P1) to function.

**Independent Test**: Can be tested by starting a mock MCP server, having DIANA connect to it, and verifying the discovered tools appear in the orchestrator's registry.

**Acceptance Scenarios**:

1. **Given** an MCP server is running and accessible, **When** DIANA connects to the server, **Then** all tools provided by the server are discovered and registered with the orchestrator.
2. **Given** DIANA has connected to an MCP server, **When** the user requests a tool provided by that server, **Then** the tool executes and returns results through the MCP protocol.
3. **Given** an MCP server becomes unreachable, **When** a user requests a tool from that server, **Then** DIANA gracefully reports the unavailability without crashing.

---

### User Story 3 - Wrap Existing Tools as Agents (Priority: P3)

Existing DIANA tools (save_fact, Obsidian logging) continue working but are now accessible through the agent architecture. This ensures backward compatibility while enabling unified tool management.

**Why this priority**: Maintains existing functionality during the transition to the agent architecture. Depends on the orchestrator (P1) being functional.

**Independent Test**: Can be tested by invoking existing tools through both the legacy interface and the new agent interface, verifying identical behavior.

**Acceptance Scenarios**:

1. **Given** existing tools are wrapped in agent adapters, **When** the LLM requests to save a fact, **Then** the request routes through the orchestrator to the wrapped tool and succeeds.
2. **Given** the legacy tool interface still exists, **When** old code calls tools directly, **Then** the tools function identically to before the agent system was added.

---

### User Story 4 - Manage Agent Lifecycle (Priority: P4)

Administrators can start, stop, and check the health of agents. This enables operational control over which capabilities are active and helps diagnose issues.

**Why this priority**: Operational feature that provides control and observability but is not required for basic functionality.

**Independent Test**: Can be tested by starting an agent, verifying it appears in health checks, stopping it, and verifying it no longer responds to requests.

**Acceptance Scenarios**:

1. **Given** an agent is registered, **When** the administrator requests agent health status, **Then** the orchestrator reports whether the agent is healthy and responding.
2. **Given** a running agent, **When** the administrator issues a stop command, **Then** the agent shuts down gracefully and is removed from the active registry.
3. **Given** a stopped agent, **When** the administrator issues a start command, **Then** the agent initializes and becomes available for tool requests.

---

### Edge Cases

- What happens when an MCP server connection times out during tool execution? The orchestrator returns a timeout error to the caller and logs the failure for diagnostics.
- How does the system handle an agent that hangs during execution? The orchestrator enforces a configurable timeout per tool execution and terminates hung requests.
- What happens when two agents register tools with the same name? The orchestrator rejects the duplicate registration and logs a warning.
- How does the system handle rapid sequential requests to the same agent? Requests are dispatched immediately via async Promises; natural Promise ordering provides sequencing. No explicit queue for V1 (per clarification Q58). Agents may process concurrently unless they implement internal serialization.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST define an Agent interface with `initialize()`, `execute(toolName, params)`, and `shutdown()` methods.
- **FR-002**: System MUST support both synchronous and asynchronous tool execution through the agent interface.
- **FR-003**: Agents MUST communicate exclusively through the orchestrator; direct agent-to-agent communication is not permitted.
- **FR-004**: System MUST provide an MCP client that connects to external MCP servers via the standard MCP protocol.
- **FR-005**: System MUST automatically discover and register tools from connected MCP servers.
- **FR-006**: System MUST handle MCP server disconnection gracefully, marking affected tools as unavailable without crashing.
- **FR-007**: System MUST provide an orchestrator that maintains a registry of all available agents and their tools.
- **FR-008**: System MUST route tool execution requests to the appropriate agent based on tool name.
- **FR-009**: System MUST support agent lifecycle operations: start, stop, and health check.
- **FR-010**: System MUST wrap existing tools (save_fact, obsidian logging) as agents while maintaining backward compatibility.
- **FR-011**: System MUST enforce human-in-the-loop approval for any destructive actions proposed by agents. Destructive actions are defined as: actions that are irreversible OR affect data outside DIANA's control (file modifications, external API calls, shell command execution).
- **FR-012**: System MUST operate entirely locally without requiring cloud services.
- **FR-013**: System MUST NOT break existing chat or file watcher functionality.
- **FR-014**: System MUST provide a tool manifest to the LLM context containing all available tools; the LLM returns tool call intents which the orchestrator executes on behalf of the LLM.
- **FR-015**: System MUST produce structured logs for agent lifecycle events (start, stop, health check) and tool execution (request, success, failure).
- **FR-016**: System MUST track metrics for tool execution counts and latencies per agent/tool.
- **FR-017**: System MUST assign correlation IDs to requests for end-to-end tracing across orchestrator and agents.

### Key Entities

- **Agent**: A capability provider with a standard interface. Has a unique identifier, lifecycle state (initialized/running/stopped), and exposes one or more tools.
- **Tool**: A discrete operation an agent can perform. Has a name, description, input parameters schema (JSON Schema format for MCP compatibility), and output type.
- **Orchestrator**: The central coordinator that maintains the agent registry, routes requests, and manages agent lifecycles.
- **MCP Server**: An external service that provides tools via the Model Context Protocol. The system connects as an MCP client.
- **Agent Registry**: The orchestrator's internal collection of registered agents and their associated tools. Accessed via orchestrator methods, not directly.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Orchestrator routing overhead (request dispatch to agent and response relay) completes within 5 seconds, excluding actual tool execution time which may take up to 30 seconds.
- **SC-002**: All existing DIANA tools remain functional with identical behavior after agent system integration.
- **SC-003**: MCP server disconnection is detected and handled within 10 seconds without user-facing errors beyond unavailability messages.
- **SC-004**: The system can register at least 10 agents with 50+ total tools without performance degradation.
- **SC-005**: Agent health checks complete and return status within 1 second.
- **SC-006**: Zero regressions in existing chat and file watcher functionality as verified by integration tests.

## Clarifications

### Session 2025-12-12

- Q: How do the different timeout values (5s, 10s, 30s) relate to each other? → A: Tiered timeouts - 5s = orchestrator routing overhead, 30s = tool execution limit, 10s = MCP health/disconnection detection.
- Q: What qualifies as a "destructive action" requiring human approval? → A: Actions that are irreversible OR affect data outside DIANA's control (files, external APIs, shell commands).
- Q: What format should tool parameter schemas use? → A: JSON Schema (MCP standard, widely supported, self-documenting).
- Q: How does the LLM discover and invoke tools? → A: Orchestrator provides tool manifest to LLM context; LLM returns tool call intents that orchestrator executes.
- Q: What observability requirements apply? → A: Comprehensive - structured logs, metrics (execution counts, latencies), and request correlation IDs.
- Q: How should the human-in-the-loop approval workflow function? → A: Asynchronous - agents create proposals in proposals.json; users review/approve via `diana proposals` / `diana approve <id>` (consistent with Feature 003 pattern).
- Q: How should the Agent Registry relate to the existing tool registry? → A: Replacement - Agent Registry becomes the sole registry; existing tools are wrapped as agents for backward compatibility.
- Q: What are the input/output types for `execute(toolName, params)`? → A: Params: `Record<string, unknown>`, Return: `Promise<ToolResult>` where `ToolResult = {success: boolean, data?: unknown, error?: string}` (matches existing DIANA pattern).
- Q: What are the return values for `initialize()` and `shutdown()`? → A: Both return `Promise<void>`; throw `AgentError` with specific error codes on failure.
- Q: What error codes should be defined for agent operations? → A: Extend existing `AgentErrorCode` with: AGENT_INIT_FAILED, AGENT_SHUTDOWN_FAILED, AGENT_NOT_FOUND, AGENT_UNAVAILABLE, TOOL_EXECUTION_TIMEOUT.
- Q: What is the async tool execution contract? → A: All tools return `Promise<ToolResult>` (unified interface); "sync" tools resolve quickly, "async" tools may take longer.
- Q: What is the tool description format? → A: Structured metadata: `{description: string, examples?: string[], category?: string}` for richer LLM context.
- Q: How do agents register with the orchestrator? → A: Factory pattern - `orchestrator.registerAgentFactory(name, factory)`; orchestrator instantiates agents when needed.
- Q: What is the interface versioning strategy? → A: Semantic versioning with deprecation warnings for 1 release before removal; document changes in CHANGELOG.
- Q: How are new lifecycle states handled? → A: Start with 3 states (initialized/running/stopped); use extensible string union type for future additions.
- Q: How do agents declare their capabilities? → A: Manifest method - `getManifest(): AgentManifest` returning `{id, name, tools, capabilities: string[], requiresApproval: boolean}`.
- Q: How is custom tool parameter validation handled? → A: Layered - orchestrator validates JSON Schema first; agent's `execute()` can add business logic validation and return error in ToolResult.
- Q: Which interfaces are stable vs. internal? → A: Minimal stable surface - only `Agent` interface and `ToolResult` type are stable; orchestrator internals and registry methods may change (early development flexibility).
- Q: Which MCP protocol version should be targeted? → A: Latest stable MCP spec at implementation time; document version in config/comments.
- Q: How should existing tools be wrapped as agents? → A: Facade pattern - `LegacyToolAgent` adapter wraps any `(params) => Promise<result>` function to Agent interface; transitional until tools are replaced by future features.
- Q: How are MCP servers configured? → A: Config file - `config/mcp-servers.json` array of `{name, command, args[], env?, timeout?, autoStart?}` entries; uses stdio transport for local servers per research.md; timeout defaults to 10000ms; autoStart defaults to true.
- Q: How does the agent system integrate with the file watcher? → A: No integration - file watcher remains independent; agent system is additive. FR-013 requires no breakage, not integration.
- Q: How does the chat system integrate with the agent system? → A: Chat routes tool calls through orchestrator - Session class calls `orchestrator.execute()` instead of direct tool registry; unified access to all tools (legacy + MCP).
- Q: What retry behavior applies to MCP server failures? → A: Simple retry - 1 retry with 3s delay for connection/timeout errors only; fail immediately for other errors.
- Q: What happens when an agent crashes mid-execution? → A: Fail request only - orchestrator catches exception, returns ToolResult with `{success: false, error}`, agent remains registered and available.
- Q: How are partial failures handled (some tools available, others not)? → A: Agent-level with error passthrough - orchestrator tracks agent availability; if agent is running, all its tools are "available"; individual tool failures returned in ToolResult.
- Q: What happens to agent state after orchestrator restart? → A: Stateless restart - orchestrator initializes fresh, re-reads config, connects to MCP servers, registers agents via factories; no persistent state; in-flight requests lost.
- Q: Is there circuit breaker behavior for repeatedly failing agents? → A: No circuit breaker for V1 - each request goes to agent, failures returned in ToolResult; metrics surface failure patterns; can add circuit breaker later if needed.
- Q: What happens when a disconnected MCP server becomes available again? → A: Auto-reconnect polling - check disconnected servers every 30s; on success, re-discover tools and log reconnection event.
- Q: How does graceful shutdown work for agents? → A: Best-effort parallel - call `shutdown()` on all agents concurrently; 5s timeout per agent; log failures but don't block DIANA shutdown.
- Q: What happens if some agents fail to initialize during startup? → A: Continue with partial - successfully initialized agents stay running; failed agents logged and skipped; health checks reveal which agents failed.
- Q: What does "performance degradation" mean in SC-004? → A: Routing overhead (SC-001's 5s limit) remains achievable with 10 agents/50+ tools; if routing stays under 5s at scale, performance is acceptable.
- Q: Are there memory/resource limits per agent? → A: No limits for V1 - agents share process resources; metrics provide visibility; can add limits later if needed or when moving to process separation.
- Q: Is there queue/backpressure handling for rapid requests? → A: No explicit queue - orchestrator dispatches immediately; async Promise execution handles concurrency naturally; rate limiting can be added later if needed.
- Q: Do pending approval proposals expire? → A: No expiry for V1 - proposals persist in proposals.json until explicitly approved or rejected; matches Feature 003 pattern.

## Assumptions

- MCP servers are assumed to follow the standard Model Context Protocol specification.
- The Ollama LLM (Qwen3:30b-a3b) is already running and accessible for DIANA's core functionality.
- Existing tools have well-defined interfaces that can be adapted to the agent pattern.
- Agent processes may eventually run in separate processes but initially run in-process for simplicity.
- Tool execution timeout defaults to 30 seconds unless configured otherwise.
