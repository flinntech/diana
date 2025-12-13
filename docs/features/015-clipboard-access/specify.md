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
