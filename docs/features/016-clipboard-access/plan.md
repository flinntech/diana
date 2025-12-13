Create implementation plan for Clipboard Access

Technical context:
- Language: TypeScript 5.9+ with Node.js 18+
- Environment: WSL (Ubuntu) with Windows 11 host
- Bridge: clip.exe for write, PowerShell for read
- Existing: Shell execution (from 008)

Research needed:
- clip.exe capabilities and limitations
- PowerShell Get-Clipboard usage
- WSL interop best practices
- Encoding handling for Unicode content

Key deliverables:
1. src/agents/system/clipboard.ts - Clipboard operations
2. src/agents/system/wsl-bridge.ts - WSL↔Windows utilities
3. Tool definitions for clipboard access
4. Tests (may need mocking for WSL commands)
