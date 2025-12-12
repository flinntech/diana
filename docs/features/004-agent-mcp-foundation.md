# 004: Agent + MCP Foundation

**Phase**: 0 (Architecture Foundation)
**Score**: N/A (Foundational - must do first)
**Value**: 8 | **Effort**: 3

## Overview

Establish the Agent interface pattern and MCP (Model Context Protocol) client infrastructure that all future DIANA capabilities will build upon.

## Dependencies

- None (foundational)

## Enables

- All future agent modules
- MCP server integrations (Notion, filesystem, etc.)
- Multi-agent orchestration

---

## speckit.specify Prompt

```
Agent + MCP Foundation for DIANA

Create the foundational architecture for DIANA's agent-based capability system:

1. Agent Interface
   - Define Agent TypeScript interface with standard methods (initialize, execute, shutdown)
   - Agents communicate through orchestrator, never directly
   - Each agent designed for eventual process separation
   - Support for both sync and async tool execution

2. MCP Client Infrastructure
   - MCP client that can connect to external MCP servers
   - Tool discovery and registration from MCP servers
   - Standard error handling for MCP communication failures
   - Graceful degradation when MCP servers unavailable

3. Orchestrator Foundation
   - Route requests to appropriate agents
   - Maintain agent registry
   - Handle agent lifecycle (start, stop, health checks)

4. Integration with Existing Tools
   - Wrap existing tools (save_fact, obsidian logging) in agent pattern
   - Backward compatible with current tool registry

Constraints:
- Local-first: No cloud services required
- Human-in-the-loop: Agents propose, don't execute destructive actions
- TypeScript with strict mode
- Must not break existing chat/watcher functionality
```

---

## speckit.plan Prompt

```
Create implementation plan for Agent + MCP Foundation

Technical context:
- Language: TypeScript 5.9+ with Node.js 18+
- Existing: Tool registry pattern in src/agent/tools/
- Existing: Session class manages conversation and tools
- Target: In-process modules designed for future separation

Research needed:
- MCP TypeScript SDK usage patterns
- Agent interface best practices
- How to wrap existing tools without breaking changes

Key deliverables:
1. src/agent/types/agent.ts - Agent interface definition
2. src/agent/orchestrator.ts - Request routing and agent lifecycle
3. src/agent/mcp-client.ts - MCP server connection management
4. Tests for agent lifecycle and MCP connectivity
5. Migration of one existing tool to agent pattern as proof of concept
```
