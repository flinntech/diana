# Quickstart: Agent + MCP Foundation

**Feature**: 004-agent-mcp-foundation
**Date**: 2025-12-12

This guide covers common development tasks with DIANA's agent system.

## Prerequisites

- Node.js 18+
- TypeScript 5.9+
- DIANA codebase with feature 002/003 complete
- (Optional) MCP server for testing MCP integration

## Installation

```bash
# Install MCP SDK dependency
npm install @modelcontextprotocol/sdk zod
```

## Creating a Custom Agent

### 1. Define the Agent Class

```typescript
// src/agent/my-agent.ts
import type { Agent, AgentManifest, ToolDefinition } from './types/agent.js';
import type { ToolResult } from '../types/agent.js';

export class MyAgent implements Agent {
  private readonly agentId = 'my-agent';

  async initialize(): Promise<void> {
    // Setup resources, connections, etc.
    console.log(`[${this.agentId}] Initialized`);
  }

  async execute(toolName: string, params: Record<string, unknown>): Promise<ToolResult> {
    switch (toolName) {
      case 'my_tool':
        return this.executMyTool(params);
      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  }

  async shutdown(): Promise<void> {
    // Cleanup resources
    console.log(`[${this.agentId}] Shutdown`);
  }

  getManifest(): AgentManifest {
    return {
      id: this.agentId,
      name: 'My Custom Agent',
      tools: [
        {
          name: 'my_tool',
          description: 'Does something useful',
          parameters: {
            type: 'object',
            required: ['input'],
            properties: {
              input: { type: 'string', description: 'The input value' }
            }
          }
        }
      ],
      capabilities: ['custom-capability'],
      requiresApproval: false
    };
  }

  private async executeMyTool(params: Record<string, unknown>): Promise<ToolResult> {
    const input = params.input as string;
    return { success: true, data: `Processed: ${input}` };
  }
}
```

### 2. Register with Orchestrator

```typescript
// In your initialization code
import { Orchestrator } from './agent/orchestrator.js';
import { MyAgent } from './agent/my-agent.js';

const orchestrator = new Orchestrator();

// Register using factory pattern
orchestrator.registerAgentFactory('my-agent', () => new MyAgent());
```

## Using the LegacyToolAgent

Existing tools are automatically wrapped:

```typescript
import { LegacyToolAgent } from './agent/legacy-tool-agent.js';
import { ToolRegistry } from './agent/tools.js';

// Create registry with existing tools
const registry = new ToolRegistry();
registerObsidianTools(registry, config);
registerMemoryTools(registry, keyFactStore);

// Wrap as agent
const legacyAgent = new LegacyToolAgent(registry);
orchestrator.registerAgentFactory('legacy', () => legacyAgent);
```

## Connecting to MCP Servers

### 1. Configure MCP Servers

Create `config/mcp-servers.json`:

```json
{
  "servers": [
    {
      "name": "filesystem",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/dir"],
      "timeout": 10000,
      "autoStart": true
    }
  ]
}
```

### 2. MCP Agent Example

```typescript
// src/agent/mcp-agent.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Agent, AgentManifest, ToolDefinition } from './types/agent.js';

export class MCPAgent implements Agent {
  private client: Client;
  private transport: StdioClientTransport;
  private tools: ToolDefinition[] = [];

  constructor(private config: MCPServerConfig) {
    this.client = new Client({ name: 'diana-mcp', version: '1.0.0' });
  }

  async initialize(): Promise<void> {
    this.transport = new StdioClientTransport({
      command: this.config.command,
      args: this.config.args,
      env: this.config.env
    });

    await this.client.connect(this.transport);

    // Discover tools
    const response = await this.client.listTools();
    this.tools = response.tools.map(t => ({
      name: t.name,
      description: t.description || '',
      parameters: t.inputSchema as JSONSchema
    }));
  }

  async execute(toolName: string, params: Record<string, unknown>): Promise<ToolResult> {
    try {
      const result = await this.client.callTool({ name: toolName, arguments: params });
      return { success: true, data: result.content };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async shutdown(): Promise<void> {
    await this.client.close();
  }

  getManifest(): AgentManifest {
    return {
      id: `mcp-${this.config.name}`,
      name: `MCP: ${this.config.name}`,
      tools: this.tools,
      capabilities: ['mcp', this.config.name],
      requiresApproval: false // Set based on server capabilities
    };
  }
}
```

## Using the Orchestrator

### Execute a Tool

```typescript
const orchestrator = new Orchestrator();

// Setup agents...

// Execute tool (routes automatically)
const result = await orchestrator.execute('save_fact', {
  content: 'User prefers dark mode',
  tags: ['preference']
});

console.log(result);
// { success: true, data: { id: '123', content: '...' } }
```

### Get All Tools for LLM

```typescript
// Get Ollama-formatted tool definitions
const tools = orchestrator.getAllToolDefinitions();

// Pass to Ollama chat request
const request = {
  model: 'qwen3:30b-a3b',
  messages: conversation.getMessages(),
  tools: tools
};
```

### Health Checks

```typescript
// Check single agent
const health = await orchestrator.getAgentHealth('legacy');
console.log(health);
// { agentId: 'legacy', status: 'healthy', toolCount: 15, lastChecked: ... }

// Check all agents
const allHealth = await orchestrator.getAllAgentHealth();
```

### Lifecycle Management

```typescript
// Stop an agent
await orchestrator.stopAgent('my-agent');

// Restart it
await orchestrator.startAgent('my-agent');

// Graceful shutdown (all agents)
await orchestrator.shutdown();
```

## Session Integration

The Session class routes through Orchestrator:

```typescript
// session.ts (simplified)
export class Session {
  private orchestrator: IOrchestrator;

  async initialize(): Promise<void> {
    // ... existing init ...

    // Setup orchestrator with legacy tools
    this.orchestrator = new Orchestrator();
    this.orchestrator.registerAgentFactory('legacy', () =>
      new LegacyToolAgent(this.toolRegistry)
    );

    // Load MCP servers from config
    await this.orchestrator.loadMCPServers();
  }

  async *sendMessage(content: string): AsyncGenerator<string> {
    // Get tools from orchestrator (not registry)
    const tools = this.orchestrator.getAllToolDefinitions();

    // ... send to LLM ...

    // Execute tool calls through orchestrator
    for (const toolCall of toolCalls) {
      const result = await this.orchestrator.execute(
        toolCall.function.name,
        args,
        correlationId
      );
      // ... process result ...
    }
  }
}
```

## Testing

### Unit Test Example

```typescript
// tests/unit/my-agent.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { MyAgent } from '../../src/agent/my-agent.js';

describe('MyAgent', () => {
  let agent: MyAgent;

  beforeEach(async () => {
    agent = new MyAgent();
    await agent.initialize();
  });

  it('should execute my_tool', async () => {
    const result = await agent.execute('my_tool', { input: 'test' });

    expect(result.success).toBe(true);
    expect(result.data).toBe('Processed: test');
  });

  it('should return error for unknown tool', async () => {
    const result = await agent.execute('unknown', {});

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown tool');
  });
});
```

### Integration Test Example

```typescript
// tests/integration/orchestrator.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Orchestrator } from '../../src/agent/orchestrator.js';
import { LegacyToolAgent } from '../../src/agent/legacy-tool-agent.js';

describe('Orchestrator Integration', () => {
  let orchestrator: Orchestrator;

  beforeEach(async () => {
    orchestrator = new Orchestrator();
    // Register test agent
    orchestrator.registerAgentFactory('test', () => new TestAgent());
  });

  afterEach(async () => {
    await orchestrator.shutdown();
  });

  it('should route tool to correct agent', async () => {
    const result = await orchestrator.execute('test_tool', { value: 42 });

    expect(result.success).toBe(true);
  });

  it('should aggregate tools from all agents', () => {
    const tools = orchestrator.getAllToolDefinitions();

    expect(tools.length).toBeGreaterThan(0);
    expect(tools.some(t => t.function.name === 'test_tool')).toBe(true);
  });
});
```

## Common Patterns

### Error Handling

```typescript
async execute(toolName: string, params: Record<string, unknown>): Promise<ToolResult> {
  try {
    // Tool logic
    return { success: true, data: result };
  } catch (error) {
    // Log error
    console.error(`[${this.agentId}] ${toolName} failed:`, error);

    // Return structured error (don't throw)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

### Correlation IDs

```typescript
import { randomUUID } from 'crypto';

// Generate at request start
const correlationId = randomUUID();

// Pass through execution
const result = await orchestrator.execute(toolName, args, correlationId);

// Log with correlation ID
console.log(JSON.stringify({
  correlationId,
  event: 'tool_execute',
  toolName,
  success: result.success
}));
```

### Timeout Handling

```typescript
async executeWithTimeout(
  toolName: string,
  params: Record<string, unknown>,
  timeoutMs: number = 30000
): Promise<ToolResult> {
  const timeoutPromise = new Promise<ToolResult>((_, reject) => {
    setTimeout(() => reject(new Error('Tool execution timeout')), timeoutMs);
  });

  try {
    return await Promise.race([
      this.execute(toolName, params),
      timeoutPromise
    ]);
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

## Troubleshooting

### Agent Not Found

```
Error: Agent 'my-agent' not found
```

- Verify agent factory is registered: `orchestrator.registerAgentFactory('my-agent', ...)`
- Check for typos in agent ID

### MCP Connection Failed

```
Error: MCP connection to 'filesystem' failed
```

- Check server command and args in `mcp-servers.json`
- Verify server executable exists and is accessible
- Check logs for detailed error message

### Tool Execution Timeout

```
Error: Tool execution timeout after 30000ms
```

- Tool is taking too long; consider async patterns
- Check external dependencies (file system, network)
- Increase timeout for specific tools if needed

## Next Steps

- See [data-model.md](data-model.md) for entity definitions
- See [contracts/agent-interfaces.ts](contracts/agent-interfaces.ts) for full TypeScript interfaces
- See [research.md](research.md) for MCP SDK usage patterns
