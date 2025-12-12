# 013: Outlook (Work)

**Phase**: 3 (System & Email)
**Score**: 3.5
**Value**: 7 | **Effort**: 2

## Overview

Access work Outlook/Microsoft 365 email. Python MCP server already running locally.

## Dependencies

- 004-agent-mcp-foundation (for MCP client)

## Enables

- Read and search work emails
- Send work emails from DIANA
- Calendar awareness (Microsoft Graph)
- Meeting scheduling context

---

## speckit.specify Prompt

```
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
```

---

## speckit.plan Prompt

```
Create implementation plan for Outlook Integration

Technical context:
- Language: TypeScript 5.9+ with Node.js 18+
- MCP: Existing Python Outlook MCP server running locally
- Auth: Microsoft Graph API (likely app registration exists)
- Depends on: 004-agent-mcp-foundation

Research needed:
- Current Python MCP server capabilities and endpoint
- Microsoft Graph API scopes available
- Calendar integration possibilities

Key deliverables:
1. MCP client connection to local Python server
2. src/agents/outlook/index.ts - Agent wrapper
3. src/agents/outlook/tools.ts - Tool definitions
4. Documentation for MCP server connection
5. Tests for read operations
```
