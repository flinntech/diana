File System Agent for DIANA

A unified agent that is the expert for all local file operations across Windows and WSL filesystems.

1. Discovery Operations (new)
   - Content search via Windows Search Index (Windows paths)
   - Content search via file traversal (WSL paths)
   - LLM-assisted query expansion (natural language → keywords)
   - LLM-assisted result ranking (semantic relevance scoring)
   - Find files by pattern/glob
   - File type filtering (Office, PDF, text, markdown)

2. CRUD Operations (new)
   - Create files/directories
   - Read file contents
   - Update/write files
   - Delete files (with confirmation)
   - Move/rename files

3. Watch Mode (refactored from existing)
   - Monitor configured directories for new files
   - Generate organization proposals based on file type/content
   - Queue proposals for user approval
   - Execute approved proposals

4. Compound Operations (new)
   - find_and_organize: Search → propose moves → execute on approval
   - Enables "find everything about X and put it in folder Y"

5. Agent Interface
   - Implement Agent interface from 004
   - Clean separation of concerns
   - Designed for eventual process separation

6. Human-in-the-Loop
   - All destructive operations (delete, move, overwrite) require approval
   - Read and search operations can be immediate
   - Create in user-specified locations can be immediate
   - Batch approval for organization proposals

Constraints:
- Must maintain backward compatibility with existing watcher config
- Existing proposal approval flow must continue working
- Follow agent-first design from constitution
- Windows Search queries via PowerShell (Base64-encoded for safety)
- Support both Windows (/mnt/c/...) and WSL (~/) paths
