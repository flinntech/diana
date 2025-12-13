# 005: File System Agent

**Phase**: 0 (Architecture Foundation)
**Score**: 7.0
**Value**: 7 | **Effort**: 1 → 2 (increased scope)

## Overview

A unified File System Agent that is the expert for all local file operations. Combines:
- **Discovery**: Content search across Windows + WSL filesystems with LLM-assisted query expansion
- **CRUD**: Create, read, update, delete, move, rename files
- **Watch**: Monitor directories and propose organization (refactored from existing)
- **Compound**: "Find and organize" operations in a single agent call

## Why Unified?

"Find everything related to Daggerheart and organize it into a folder" is one conceptual task. A unified agent handles this without orchestrator coordination between separate search and filesystem agents.

## Dependencies

- 004-agent-mcp-foundation

## Enables

- File organization proposals (already exists, gets refactored)
- Direct file operations via chat
- Content search across Windows and WSL
- Compound operations like "find and organize"
- Foundation for other system control features

## Key Capabilities

| Category | Tools |
|----------|-------|
| Discovery | `content_search`, `find_files` |
| Read | `read_file` |
| Write | `create_file`, `update_file` |
| Organize | `move_file`, `rename_file`, `delete_file` |
| Compound | `find_and_organize` |
| Watch | Background monitoring + proposals |
