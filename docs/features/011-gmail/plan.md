Create implementation plan for Gmail Integration

Technical context:
- Language: TypeScript 5.9+ with Node.js 18+
- MCP: GongRzhe/Gmail-MCP-Server or jeremyjordan/mcp-gmail
- Auth: OAuth2 credentials already available from n8n
- Depends on: 004-agent-mcp-foundation

Research needed:
- Which Gmail MCP server best fits our needs
- OAuth2 credential reuse from n8n
- MCP server configuration

Key deliverables:
1. MCP server configuration in diana.config.ts
2. src/agents/gmail/index.ts - Agent wrapper
3. src/agents/gmail/tools.ts - Tool definitions
4. OAuth2 credential setup documentation
5. Tests for read operations
