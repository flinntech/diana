# Research: Agent + MCP Foundation

**Feature**: 004-agent-mcp-foundation
**Date**: 2025-12-12
**Status**: Complete

## Research Questions

### 1. MCP TypeScript SDK Usage Patterns

**Decision**: Use `@modelcontextprotocol/sdk` official TypeScript SDK with Stdio transport for local servers

**Rationale**:
- Official SDK maintained by Anthropic/MCP team
- Full MCP specification implementation
- Supports stdio transport ideal for local process-spawned servers
- High-level `Client` class with `listTools()` and `callTool()` helpers
- Zod peer dependency aligns with TypeScript-first approach

**Alternatives Considered**:
- **HTTP/SSE transport**: Better for remote servers, but DIANA targets local-first operation
- **Custom MCP implementation**: Would require maintaining protocol compliance; SDK handles this

**Key Implementation Pattern** (from MCP docs):
```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

class MCPClient {
  private client: Client;

  constructor() {
    this.client = new Client({ name: "diana-mcp-client", version: "1.0.0" });
  }

  async connect(serverPath: string): Promise<void> {
    const transport = new StdioClientTransport({
      command: "node",
      args: [serverPath]
    });
    await this.client.connect(transport);
  }

  async discoverTools(): Promise<Tool[]> {
    const response = await this.client.listTools();
    return response.tools.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.inputSchema // Already JSON Schema format
    }));
  }

  async executeTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const result = await this.client.callTool({ name, arguments: args });
    return { success: true, data: result.content };
  }
}
```

**Transport Selection**:
- **Stdio**: For local process-spawned MCP servers (our primary use case)
- **Streamable HTTP**: For remote servers (future, if needed)

---

### 2. Agent Interface Best Practices

**Decision**: Minimal interface with lifecycle hooks and manifest

**Rationale**:
- Spec already defines interface from clarifications (Q9-Q11)
- Keep surface area minimal per spec clarification Q42 (Agent interface and ToolResult are stable)
- Factory pattern enables lazy instantiation

**Alternatives Considered**:
- **Service-oriented interface**: Too heavy for in-process agents
- **Event-driven interface**: Adds complexity; save for process separation
- **Plugin system**: Over-engineered for current needs

**Agent Interface Design**:
```typescript
// Stable interfaces (per spec Q42)
interface Agent {
  initialize(): Promise<void>;
  execute(toolName: string, params: Record<string, unknown>): Promise<ToolResult>;
  shutdown(): Promise<void>;
  getManifest(): AgentManifest;
}

interface AgentManifest {
  id: string;
  name: string;
  tools: ToolDefinition[];
  capabilities: string[];  // Routing hints
  requiresApproval: boolean;
}

interface ToolDefinition {
  name: string;
  description: string;
  parameters: JSONSchema;
}

// Factory pattern for registration
type AgentFactory = () => Agent;

interface IOrchestrator {
  registerAgentFactory(agentId: string, factory: AgentFactory): void;
  getAllToolDefinitions(): OllamaToolDefinition[];
  execute(toolName: string, args: Record<string, unknown>): Promise<ToolResult>;
  getAgentHealth(agentId: string): Promise<AgentHealth>;
  shutdown(): Promise<void>;
}
```

**Lifecycle States** (per spec Q39):
```typescript
type AgentState = 'initialized' | 'running' | 'stopped';
// Extensible string union for future states
```

---

### 3. Wrapping Existing Tools Without Breaking Changes

**Decision**: Facade pattern with `LegacyToolAgent` adapter

**Rationale**:
- Spec clarification Q44 explicitly recommends facade pattern
- Existing `ToolRegistry` and tools remain unchanged
- Session switches from `ToolRegistry` to `Orchestrator` (same interface shape)
- Zero changes to tool implementations

**Alternatives Considered**:
- **Rewrite all tools as agents**: High risk, unnecessary churn
- **Dual registration**: Complexity of maintaining two systems
- **Adapter per tool**: Repetitive; single adapter wrapping registry is cleaner

**Implementation Pattern**:
```typescript
class LegacyToolAgent implements Agent {
  private readonly registry: ToolRegistry;
  private readonly agentId = 'legacy-tools';

  constructor(registry: ToolRegistry) {
    this.registry = registry;
  }

  async initialize(): Promise<void> {
    // No-op: tools already registered in registry
  }

  async execute(toolName: string, params: Record<string, unknown>): Promise<ToolResult> {
    return this.registry.execute(toolName, params);
  }

  async shutdown(): Promise<void> {
    // No-op: registry has no cleanup
  }

  getManifest(): AgentManifest {
    return {
      id: this.agentId,
      name: 'Legacy DIANA Tools',
      tools: this.registry.getToolDefinitions().map(t => ({
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters
      })),
      capabilities: ['obsidian', 'memory', 'file-watcher', 'proposals'],
      requiresApproval: true  // Some tools are destructive
    };
  }
}
```

**Session Modification** (minimal):
```typescript
// Before (session.ts ~line 277)
const tools = this.toolRegistry.getToolDefinitions();

// After
const tools = this.orchestrator.getAllToolDefinitions();

// Before (session.ts ~line 353)
const result = await this.toolRegistry.execute(name, args);

// After
const result = await this.orchestrator.execute(name, args);
```

---

### 4. MCP Server Configuration

**Decision**: JSON config file at `config/mcp-servers.json`

**Rationale**:
- Spec clarification Q45 defines format
- JSON is human-readable and easily editable
- Matches DIANA's existing config pattern

**Schema**:
```typescript
interface MCPServerConfig {
  name: string;           // Unique identifier
  command: string;        // e.g., "node", "python"
  args: string[];         // e.g., ["/path/to/server.js"]
  env?: Record<string, string>;  // Environment variables
  timeout?: number;       // Connection timeout (default: 10s)
  autoStart?: boolean;    // Start on DIANA init (default: true)
}

// config/mcp-servers.json
{
  "servers": [
    {
      "name": "filesystem",
      "command": "node",
      "args": ["./mcp-servers/filesystem/index.js"],
      "timeout": 10000
    }
  ]
}
```

---

### 5. Error Handling Strategy

**Decision**: Extend existing `AgentErrorCode` enum; errors returned in `ToolResult`

**Rationale**:
- Spec clarifications Q34/Q49 define error behavior
- Consistent with existing DIANA error patterns
- Orchestrator catches exceptions and returns `ToolResult.error`

**New Error Codes**:
```typescript
type AgentErrorCode =
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

**Error Flow**:
1. Agent throws → Orchestrator catches → Returns `{success: false, error: message}`
2. MCP timeout → Retry once (3s delay) → If still fails, return error in ToolResult
3. Agent crash → Log, return error, keep agent registered (per spec Q49)

---

### 6. Observability Implementation

**Decision**: Structured logging with correlation IDs; metrics via simple counters

**Rationale**:
- FR-015/16/17 require logs, metrics, correlation IDs
- Keep V1 simple: console logs + in-memory counters
- Can add structured logging library later

**Implementation**:
```typescript
interface AgentMetrics {
  toolExecutionCount: Map<string, number>;  // toolName -> count
  toolLatencies: Map<string, number[]>;     // toolName -> latency samples
  agentHealthChecks: Map<string, number>;   // agentId -> check count
}

interface LogEntry {
  timestamp: Date;
  correlationId: string;
  event: 'agent_start' | 'agent_stop' | 'tool_execute' | 'tool_success' | 'tool_failure';
  agentId?: string;
  toolName?: string;
  durationMs?: number;
  error?: string;
}
```

---

### 7. Reconnection Strategy for MCP Servers

**Decision**: Simple polling every 30s for disconnected servers (per spec Q53)

**Rationale**:
- Spec explicitly defines 30s polling interval
- Keep V1 simple; no circuit breaker (spec Q52)
- Auto-reconnect on success, re-discover tools

**Implementation**:
```typescript
class MCPClientManager {
  private readonly reconnectInterval = 30000; // 30s
  private disconnectedServers: Set<string> = new Set();

  startReconnectPolling(): void {
    setInterval(() => {
      for (const serverName of this.disconnectedServers) {
        this.tryReconnect(serverName);
      }
    }, this.reconnectInterval);
  }

  private async tryReconnect(serverName: string): Promise<void> {
    try {
      await this.connect(serverName);
      this.disconnectedServers.delete(serverName);
      this.log({ event: 'mcp_reconnected', serverName });
      await this.discoverTools(serverName);
    } catch {
      // Will retry on next interval
    }
  }
}
```

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@modelcontextprotocol/sdk` | latest | MCP client/server protocol |
| `zod` | ^3.25 | Peer dependency for MCP SDK |

## Sources

- [MCP TypeScript SDK - GitHub](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Documentation](https://modelcontextprotocol.io/docs)
- [Build an MCP Client](https://modelcontextprotocol.io/docs/develop/build-client)
- [MCP Example Servers](https://modelcontextprotocol.io/examples)
