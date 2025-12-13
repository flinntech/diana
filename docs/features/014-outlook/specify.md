Outlook Integration for DIANA (Work Email)

Integrate with Outlook using existing local MCP server:

1. Read Operations
   - Search emails (by sender, subject, date, folders)
   - Read email content and metadata
   - List recent/unread emails
   - Get attachment info

2. Write Operations (with approval)
   - Send new emails
   - Reply to emails
   - Forward emails
   - Draft emails for review

3. Calendar Integration (bonus)
   - View upcoming meetings
   - Check availability
   - Meeting context for emails

4. MCP Integration
   - Connect to existing Python Outlook MCP server
   - Microsoft Graph API underneath
   - Handle authentication

5. Tool Interface
   - outlook_search: Search emails
   - outlook_read: Read email content
   - outlook_send: Send email (approval required)
   - outlook_reply: Reply to email (approval required)
   - outlook_calendar: View calendar (if supported)

Constraints:
- Human-in-the-loop for all send operations
- Work email = extra caution on sends
- Respect corporate email policies
- Never auto-send without explicit approval
