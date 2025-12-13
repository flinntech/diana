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
