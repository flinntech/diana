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
