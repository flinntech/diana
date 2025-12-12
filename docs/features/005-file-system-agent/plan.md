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
