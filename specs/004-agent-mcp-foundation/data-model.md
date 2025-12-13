# Data Model: Agent + MCP Foundation

**Feature**: 004-agent-mcp-foundation
**Date**: 2025-12-12
**Status**: Complete

## Entities

### 1. Agent

A capability provider with a standard interface that exposes one or more tools.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | `string` | Yes | Unique identifier (e.g., `legacy-tools`, `mcp-filesystem`) |
| name | `string` | Yes | Human-readable display name |
| state | `AgentState` | Yes | Current lifecycle state |
| manifest | `AgentManifest` | Yes | Capabilities and tool definitions |

**State Transitions**:
```
                 initialize()
    [created] ───────────────► [initialized]
                                    │
                                    │ (automatic on first execute)
                                    ▼
                               [running]
                                    │
                    shutdown()      │     shutdown()
    [stopped] ◄─────────────────────┘
        │
        │ initialize() (restart)
        └────────────────────────► [initialized]
```

**Validation Rules**:
- `id` must be unique across all registered agents
- `id` must match pattern `^[a-z][a-z0-9-]*$` (lowercase, hyphens allowed)
- `name` must be non-empty string

---

### 2. AgentManifest

Metadata describing an agent's capabilities and tools.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | `string` | Yes | Must match parent Agent.id |
| name | `string` | Yes | Human-readable name for LLM/user |
| tools | `ToolDefinition[]` | Yes | Tools this agent exposes |
| capabilities | `string[]` | Yes | Routing hints (e.g., `["web-search", "file-ops"]`) |
| requiresApproval | `boolean` | Yes | If true, destructive tools need user approval |
| modelRequirements | `string` | No | Reserved for future multi-model support |

**Validation Rules**:
- `tools` array may be empty (agent with no tools)
- `capabilities` should be lowercase, hyphenated strings
- `requiresApproval` defaults to `false` if agent has no destructive tools

---

### 3. ToolDefinition

Schema for a tool that an agent can execute.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | `string` | Yes | Unique tool identifier |
| description | `string` | Yes | Human-readable description for LLM |
| parameters | `JSONSchema` | Yes | JSON Schema for input validation |
| examples | `string[]` | No | Example invocations for LLM context |
| category | `string` | No | Grouping hint (e.g., `"logging"`, `"memory"`) |

**Validation Rules**:
- `name` must match pattern `^[a-z_][a-z0-9_]*$` (existing DIANA pattern)
- `name` must be unique within an agent
- `name` must be unique across ALL agents (orchestrator enforces)
- `parameters.type` must be `"object"`

---

### 4. ToolResult

Result of executing a tool (unchanged from existing DIANA pattern).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| success | `boolean` | Yes | Whether execution succeeded |
| data | `unknown` | No | Result data (if success) |
| error | `string` | No | Error message (if failed) |

**Validation Rules**:
- If `success` is `true`, `data` should be present
- If `success` is `false`, `error` should be present

---

### 5. Orchestrator

Central coordinator that maintains agent registry and routes requests.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| agents | `Map<string, Agent>` | Yes | Registered agents by ID |
| factories | `Map<string, AgentFactory>` | Yes | Agent factories for lazy instantiation |
| toolToAgent | `Map<string, string>` | Yes | Tool name → Agent ID mapping |
| mcpManager | `MCPClientManager` | Yes | MCP server connection manager |
| metrics | `OrchestratorMetrics` | Yes | Execution metrics |

**State**: The orchestrator itself is stateless across restarts (per spec Q51).

---

### 6. MCPServerConfig

Configuration for connecting to an MCP server.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | `string` | Yes | Unique server identifier |
| command | `string` | Yes | Executable command (e.g., `"node"`) |
| args | `string[]` | Yes | Command arguments (e.g., `["server.js"]`) |
| env | `Record<string, string>` | No | Environment variables |
| timeout | `number` | No | Connection timeout in ms (default: 10000) |
| autoStart | `boolean` | No | Auto-connect on init (default: true) |

**Validation Rules**:
- `name` must be unique across all configured servers
- `command` must be a valid executable
- `timeout` must be positive integer, max 30000

---

### 7. MCPConnection

Runtime state for a connected MCP server.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| serverName | `string` | Yes | Reference to MCPServerConfig.name |
| client | `Client` | Yes | MCP SDK Client instance |
| status | `MCPConnectionStatus` | Yes | Current connection state |
| tools | `ToolDefinition[]` | Yes | Discovered tools from server |
| lastHealthCheck | `Date` | No | Timestamp of last successful health check |

**State Transitions**:
```
                 connect()
  [disconnected] ──────────► [connecting]
        ▲                         │
        │                         │ success
        │                         ▼
        │               [connected]
        │                    │
        │ error/timeout      │ listTools()
        │                    ▼
        └───────────────  [ready]
                              │
              disconnect()    │
                              ▼
                        [disconnected]
```

---

### 8. AgentHealth

Health check response for an agent.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| agentId | `string` | Yes | Agent identifier |
| status | `'healthy' \| 'unhealthy' \| 'unknown'` | Yes | Health status |
| message | `string` | No | Additional info or error message |
| lastChecked | `Date` | Yes | When health was checked |
| toolCount | `number` | Yes | Number of tools available |

---

### 9. OrchestratorMetrics

Observability metrics for the orchestrator.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| toolExecutionCount | `Map<string, number>` | Yes | Executions per tool |
| toolLatencies | `Map<string, number[]>` | Yes | Latency samples per tool |
| agentHealthChecks | `Map<string, number>` | Yes | Health check counts per agent |
| errors | `Map<string, number>` | Yes | Error counts by error code |

---

## Enums

### AgentState

```typescript
type AgentState = 'initialized' | 'running' | 'stopped';
```

### MCPConnectionStatus

```typescript
type MCPConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'ready'
  | 'error';
```

### AgentErrorCode (Extended)

```typescript
type AgentErrorCode =
  // Existing
  | 'OLLAMA_UNAVAILABLE'
  | 'MODEL_NOT_FOUND'
  | 'SYSTEM_PROMPT_MISSING'
  | 'TOOL_NOT_FOUND'
  | 'TOOL_EXECUTION_FAILED'
  | 'CONTEXT_OVERFLOW'
  | 'NETWORK_TIMEOUT'
  | 'INVALID_RESPONSE'
  // New for 004
  | 'AGENT_INIT_FAILED'
  | 'AGENT_SHUTDOWN_FAILED'
  | 'AGENT_NOT_FOUND'
  | 'AGENT_UNAVAILABLE'
  | 'TOOL_EXECUTION_TIMEOUT'
  | 'MCP_CONNECTION_FAILED'
  | 'MCP_TOOL_DISCOVERY_FAILED';
```

---

## Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                         Orchestrator                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   agents    │  │  factories  │  │      toolToAgent        │ │
│  │  Map<id,    │  │  Map<id,    │  │    Map<toolName,        │ │
│  │    Agent>   │  │  Factory>   │  │        agentId>         │ │
│  └──────┬──────┘  └─────────────┘  └─────────────────────────┘ │
│         │                                                       │
│  ┌──────▼──────────────────────────────────────────────────┐   │
│  │                      MCPClientManager                    │   │
│  │  ┌─────────────┐  ┌──────────────────────────────────┐  │   │
│  │  │   configs   │  │         connections              │  │   │
│  │  │  Array<     │  │  Map<serverName, MCPConnection>  │  │   │
│  │  │  MCPServer  │  │                                  │  │   │
│  │  │  Config>    │  │                                  │  │   │
│  │  └─────────────┘  └──────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│                  Agent                  │
│  ┌─────────────────────────────────┐   │
│  │          AgentManifest          │   │
│  │  ┌───────────────────────────┐  │   │
│  │  │   tools: ToolDefinition[] │  │   │
│  │  └───────────────────────────┘  │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│            LegacyToolAgent              │
│  ┌─────────────────────────────────┐   │
│  │    wraps: ToolRegistry          │   │
│  │    (existing 002/003 tools)     │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│              MCPAgent                   │
│  ┌─────────────────────────────────┐   │
│  │    connection: MCPConnection    │   │
│  │    (tools from MCP server)      │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## Request Flow

```
User Message
     │
     ▼
┌─────────┐     getToolDefinitions()    ┌──────────────┐
│ Session │ ◄───────────────────────────│ Orchestrator │
└────┬────┘                             └──────┬───────┘
     │                                         │
     │ Tool Call from LLM                      │ aggregates from
     │                                         ▼
     │                                  ┌─────────────┐
     │                                  │   Agents    │
     │                                  │  manifests  │
     │                                  └─────────────┘
     │
     │ execute(toolName, args)
     ▼
┌──────────────┐     route by toolName     ┌─────────┐
│ Orchestrator │ ─────────────────────────►│  Agent  │
└──────────────┘                           └────┬────┘
     ▲                                          │
     │                                          │ execute()
     │         ToolResult                       ▼
     └──────────────────────────────────  Tool Execution
```
