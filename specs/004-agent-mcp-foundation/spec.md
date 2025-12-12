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
- How does the system handle rapid sequential requests to the same agent? Requests are queued and processed in order; the agent handles one request at a time unless it explicitly supports concurrency.

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
- **FR-011**: System MUST enforce human-in-the-loop approval for any destructive actions proposed by agents.
- **FR-012**: System MUST operate entirely locally without requiring cloud services.
- **FR-013**: System MUST NOT break existing chat or file watcher functionality.

### Key Entities

- **Agent**: A capability provider with a standard interface. Has a unique identifier, lifecycle state (initialized/running/stopped), and exposes one or more tools.
- **Tool**: A discrete operation an agent can perform. Has a name, description, input parameters schema, and output type.
- **Orchestrator**: The central coordinator that maintains the agent registry, routes requests, and manages agent lifecycles.
- **MCP Server**: An external service that provides tools via the Model Context Protocol. The system connects as an MCP client.
- **Agent Registry**: A collection of registered agents and their associated tools, maintained by the orchestrator.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Tool execution through agents completes within 5 seconds for standard operations (excluding long-running tasks).
- **SC-002**: All existing DIANA tools remain functional with identical behavior after agent system integration.
- **SC-003**: MCP server disconnection is detected and handled within 10 seconds without user-facing errors beyond unavailability messages.
- **SC-004**: The system can register at least 10 agents with 50+ total tools without performance degradation.
- **SC-005**: Agent health checks complete and return status within 1 second.
- **SC-006**: Zero regressions in existing chat and file watcher functionality as verified by integration tests.

## Assumptions

- MCP servers are assumed to follow the standard Model Context Protocol specification.
- The Ollama LLM (Qwen3:30b-a3b) is already running and accessible for DIANA's core functionality.
- Existing tools have well-defined interfaces that can be adapted to the agent pattern.
- Agent processes may eventually run in separate processes but initially run in-process for simplicity.
- Tool execution timeout defaults to 30 seconds unless configured otherwise.
