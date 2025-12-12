# 022: Obsidian MCP Migration

**Phase**: 5 (Advanced Capabilities)
**Score**: N/A (Architectural improvement)
**Value**: 6 | **Effort**: 2

## Overview

Migrate Obsidian logging to an external MCP server. Architectural cleanup that enables better tool reuse and separation.

## Dependencies

- 004-agent-mcp-foundation (MCP client infrastructure)

## Enables

- Reusable Obsidian MCP server
- Cleaner DIANA codebase
- Standard tool interface
- Potential use by other LLM applications

---

## speckit.specify Prompt

```
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
```

---

## speckit.plan Prompt

```
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
```
