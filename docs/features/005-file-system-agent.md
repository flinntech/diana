# 005: File System Agent

**Phase**: 0 (Architecture Foundation)
**Score**: 7.0
**Value**: 7 | **Effort**: 1

## Overview

Refactor the existing file watcher into a File System Agent with full CRUD operations plus watch mode for organization proposals. This becomes the first real agent implementation.

## Dependencies

- 004-agent-mcp-foundation

## Enables

- File organization proposals (already exists, gets refactored)
- Direct file operations via chat
- Foundation for other system control features

---

## speckit.specify Prompt

```
File System Agent for DIANA

Refactor existing watcher functionality into a proper File System Agent:

1. CRUD Operations (new)
   - Create files/directories
   - Read file contents
   - Update/write files
   - Delete files (with confirmation)
   - Move/rename files

2. Watch Mode (refactored from existing)
   - Monitor configured directories for new files
   - Generate organization proposals based on file type/content
   - Queue proposals for user approval
   - Execute approved proposals

3. Agent Interface
   - Implement Agent interface from 004
   - Clean separation of concerns
   - Designed for eventual process separation

4. Human-in-the-Loop
   - All destructive operations (delete, move, overwrite) require approval
   - Read operations can be immediate
   - Create in user-specified locations can be immediate
   - Batch approval for organization proposals

Constraints:
- Must maintain backward compatibility with existing watcher config
- Existing proposal approval flow must continue working
- Follow agent-first design from constitution
```

---

## speckit.plan Prompt

```
Create implementation plan for File System Agent

Technical context:
- Language: TypeScript 5.9+ with Node.js 18+
- Existing: src/watcher/ directory with chokidar-based file watching
- Existing: Proposal system for organization suggestions
- Depends on: 004-agent-mcp-foundation Agent interface

Research needed:
- Current watcher implementation structure
- Existing proposal approval flow
- How to expose file operations as tools

Key deliverables:
1. src/agents/file-system/index.ts - Main agent implementation
2. src/agents/file-system/operations.ts - CRUD operations
3. src/agents/file-system/watcher.ts - Refactored watch functionality
4. src/agents/file-system/tools.ts - Tool definitions for LLM
5. Migration path from current watcher to agent
6. Tests for all CRUD operations with approval flow
```
