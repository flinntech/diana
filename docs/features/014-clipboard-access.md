# 014: Clipboard Access

**Phase**: 3 (System & Voice)
**Score**: 3.0
**Value**: 6 | **Effort**: 2

## Overview

Access system clipboard for reading/writing content. More complex in WSL environment requiring Windows bridge.

## Dependencies

- 004-agent-mcp-foundation (optional)
- 008-shell-commands (uses shell for Windows bridge)

## Enables

- "Copy this to clipboard"
- "What's in my clipboard?"
- Quick data sharing between DIANA and other apps

---

## speckit.specify Prompt

```
Clipboard Access for DIANA

Add clipboard read/write capabilities with WSL support:

1. Core Operations
   - Read clipboard content
   - Write text to clipboard
   - Detect content type (text, image info, etc.)

2. WSL → Windows Bridge
   - Read: powershell.exe Get-Clipboard
   - Write: clip.exe or powershell.exe Set-Clipboard
   - Handle encoding properly (UTF-8)
   - Fall back gracefully if bridge fails

3. Tool Interface
   - clipboard_read: Get current clipboard content
   - clipboard_write: Set clipboard content
   - clipboard_clear: Clear clipboard (optional)

4. Security Considerations
   - Never log clipboard content (may contain sensitive data)
   - Warn user when reading clipboard
   - Don't auto-read clipboard without explicit request

Constraints:
- WSL environment: Must use Windows clipboard via bridge
- Handle large content gracefully (truncate if needed)
- Support text content primarily
- No persistent clipboard history
```

---

## speckit.plan Prompt

```
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
```
