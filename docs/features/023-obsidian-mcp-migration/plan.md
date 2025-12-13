Create implementation plan for Obsidian MCP Migration

Technical context:
- Language: TypeScript 5.9+ with Node.js 18+
- Existing: src/obsidian/writer.ts (current implementation)
- Depends on: 004-agent-mcp-foundation
- Option: Use existing obsidian-mcp-server if suitable

Research needed:
- Existing Obsidian MCP servers
- MCP server development if building custom
- Obsidian API capabilities (if using plugin)
- Migration strategy for config

Key deliverables:
1. Evaluate existing Obsidian MCP servers
2. Create MCP server if needed (or fork/extend existing)
3. src/agents/obsidian/index.ts - Agent wrapper
4. Migration of existing obsidian calls to MCP
5. Config updates for MCP server
6. Tests for logging functionality preservation
