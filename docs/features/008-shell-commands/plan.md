Create implementation plan for Shell Commands

Technical context:
- Language: TypeScript 5.9+ with Node.js 18+
- Node.js: child_process.exec or spawn
- Environment: WSL (Linux) with Windows host
- Existing: Approval flow pattern from proposals

Research needed:
- Node.js child_process best practices
- Security patterns for shell execution
- WSL path handling considerations
- Command sanitization approaches

Key deliverables:
1. src/agents/system/shell.ts - Shell execution with safety
2. src/agents/system/blocked-commands.ts - Dangerous command patterns
3. Approval integration for command execution
4. Comprehensive logging of all executions
5. Tests for safety controls and execution
