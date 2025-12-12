Gmail Integration for DIANA (Personal Email)

Integrate with Gmail using existing MCP server:

1. Read Operations
   - Search emails (by sender, subject, date, labels)
   - Read email content and metadata
   - List recent emails
   - Get attachment info

2. Write Operations (with approval)
   - Send new emails
   - Reply to emails
   - Forward emails
   - Draft emails for review

3. Management Operations
   - Apply/remove labels
   - Archive emails
   - Mark as read/unread

4. MCP Integration
   - Use existing Gmail MCP server (GongRzhe/Gmail-MCP-Server or similar)
   - Leverage existing OAuth2 credentials from n8n
   - Handle MCP server lifecycle

5. Tool Interface
   - gmail_search: Search emails
   - gmail_read: Read email content
   - gmail_send: Send email (approval required)
   - gmail_reply: Reply to email (approval required)
   - gmail_label: Manage labels

Constraints:
- Human-in-the-loop for all send operations
- Never auto-send without explicit approval
- Sensitive content handling (don't log email bodies)
- OAuth2 tokens stored securely
