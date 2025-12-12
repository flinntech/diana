Create implementation plan for Outlook Integration

Technical context:
- Language: TypeScript 5.9+ with Node.js 18+
- MCP: Existing Python Outlook MCP server running locally
- Auth: Microsoft Graph API (likely app registration exists)
- Depends on: 004-agent-mcp-foundation

Research needed:
- Current Python MCP server capabilities and endpoint
- Microsoft Graph API scopes available
- Calendar integration possibilities

Key deliverables:
1. MCP client connection to local Python server
2. src/agents/outlook/index.ts - Agent wrapper
3. src/agents/outlook/tools.ts - Tool definitions
4. Documentation for MCP server connection
5. Tests for read operations
