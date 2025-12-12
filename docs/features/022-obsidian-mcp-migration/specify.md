Obsidian MCP Migration for DIANA

Move Obsidian logging from internal implementation to MCP server:

1. MCP Server
   - Create or use existing Obsidian MCP server
   - Expose vault operations as MCP tools
   - Support: create note, append, read, search

2. Tool Migration
   - Replace internal Obsidian writer with MCP calls
   - Maintain same functionality (daily logs, activity tracking)
   - Keep deep linking support

3. MCP Server Operations
   - obsidian_create_note: Create new note
   - obsidian_append: Append to existing note
   - obsidian_read: Read note content
   - obsidian_search: Search vault
   - obsidian_daily_note: Get/create daily note

4. Backward Compatibility
   - Same logging behavior from user perspective
   - Config migration for vault path
   - Fallback if MCP server unavailable

Constraints:
- Current logging functionality must be preserved
- No loss of deep linking capability
- MCP server runs locally
- Vault path remains configurable
