Create implementation plan for File System Agent

Technical context:
- Language: TypeScript 5.9+ with Node.js 18+
- Existing: src/watcher/ directory with chokidar-based file watching
- Existing: Proposal system for organization suggestions
- Depends on: 004-agent-mcp-foundation Agent interface

Key deliverables:

src/agent/filesystem/
├── index.ts                    # Exports + factory
├── file-system-agent.ts        # Main agent implementation
├── types.ts                    # All type definitions
├── operations/
│   ├── crud.ts                 # Create, read, update, delete
│   ├── move.ts                 # Move/rename operations
│   └── organize.ts             # Bulk organization logic
├── search/
│   ├── query-expander.ts       # LLM query expansion
│   ├── result-ranker.ts        # LLM result scoring
│   ├── windows-search.ts       # PowerShell + Windows Search Index
│   └── wsl-search.ts           # Node.js fs traversal
├── watcher/
│   └── index.ts                # Refactored watch functionality
└── utils/
    ├── path-converter.ts       # Windows <-> WSL paths
    ├── snippet-extractor.ts    # Preview text extraction
    └── powershell-executor.ts  # Safe PowerShell execution

Tools exposed to LLM:
- content_search(query, scope?, fileTypes?, maxResults?)
- find_files(pattern, path?)
- read_file(path)
- create_file(path, content)
- update_file(path, content)
- delete_file(path)           # requires approval
- move_file(source, dest)     # requires approval
- rename_file(path, newName)  # requires approval
- find_and_organize(query, destination)  # compound, requires approval

Configuration additions (diana.config.ts):
- searchConfig.windowsScopes: Windows paths to search
- searchConfig.wslScopes: WSL paths to search
- searchConfig.includeTypes: File extensions to include
- searchConfig.llmRanking: Enable/disable LLM result ranking

Migration path:
1. Create new agent structure alongside existing watcher
2. Move watcher logic into agent/filesystem/watcher/
3. Add CRUD and search operations
4. Register agent with orchestrator
5. Deprecate direct watcher imports

Tests:
- Unit tests for each operation type
- Integration tests for search (mock PowerShell on non-WSL)
- E2E tests for find_and_organize flow
- Approval flow tests for destructive operations
