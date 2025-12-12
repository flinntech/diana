# 011: Notion Integration

**Phase**: 2 (Core Tools)
**Score**: 4.0
**Value**: 8 | **Effort**: 2

## Overview

Integrate with Notion for project notes access. User is a PM who uses Notion for project work, separate from DIANA's Obsidian-based memory.

## Dependencies

- 004-agent-mcp-foundation (for MCP server usage)

## Enables

- Access project notes and documentation
- Search across Notion workspace
- Create/update pages from chat
- Link DIANA conversations to project context

---

## speckit.specify Prompt

```
Notion Integration for DIANA

Integrate with Notion using existing MCP server:

1. Read Operations
   - Search across Notion workspace
   - Read page content
   - List databases and their contents
   - Get page properties and metadata

2. Write Operations (with approval)
   - Create new pages
   - Update page content
   - Add blocks to existing pages
   - Update database entries

3. MCP Integration
   - Use existing Notion MCP server
   - Configure server connection in DIANA config
   - Handle MCP server lifecycle

4. Tool Interface
   - notion_search: Search workspace
   - notion_read_page: Get page content
   - notion_list_database: Query database
   - notion_create_page: Create new page (approval required)
   - notion_update_page: Update content (approval required)

Constraints:
- Use MCP server (not direct API) per architecture decisions
- Human-in-the-loop for all write operations
- Notion is for user's project notes, not DIANA's memory
- API token stored securely in config
```

---

## speckit.plan Prompt

```
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
```
