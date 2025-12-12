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
