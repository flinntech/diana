Create implementation plan for Notion Integration

Technical context:
- Language: TypeScript 5.9+ with Node.js 18+
- MCP: Use @notionhq/notion-mcp-server or similar
- Depends on: 004-agent-mcp-foundation for MCP client
- Existing: Config system for API tokens

Research needed:
- Available Notion MCP servers
- MCP server configuration and startup
- Notion API scopes and permissions
- Page content block types

Key deliverables:
1. MCP server configuration in diana.config.ts
2. src/agents/notion/index.ts - Agent wrapper for MCP
3. src/agents/notion/tools.ts - Tool definitions
4. Documentation for Notion API token setup
5. Tests for read operations (write operations harder to test)
