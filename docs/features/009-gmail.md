# 009: Gmail (Personal)

**Phase**: 2 (Core Tools)
**Score**: 4.0
**Value**: 8 | **Effort**: 2

## Overview

Access personal Gmail for email management. MCP server available, OAuth2 already configured from n8n work.

## Dependencies

- 004-agent-mcp-foundation (for MCP client)

## Enables

- Read and search personal emails
- Send emails from DIANA
- Email-based reminders and follow-ups
- Personal inbox management

---

## speckit.specify Prompt

```
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
```

---

## speckit.plan Prompt

```
Create implementation plan for Gmail Integration

Technical context:
- Language: TypeScript 5.9+ with Node.js 18+
- MCP: GongRzhe/Gmail-MCP-Server or jeremyjordan/mcp-gmail
- Auth: OAuth2 credentials already available from n8n
- Depends on: 004-agent-mcp-foundation

Research needed:
- Which Gmail MCP server best fits our needs
- OAuth2 credential reuse from n8n
- MCP server configuration

Key deliverables:
1. MCP server configuration in diana.config.ts
2. src/agents/gmail/index.ts - Agent wrapper
3. src/agents/gmail/tools.ts - Tool definitions
4. OAuth2 credential setup documentation
5. Tests for read operations
```
