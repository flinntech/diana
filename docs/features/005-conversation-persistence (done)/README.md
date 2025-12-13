# 005: Conversation Persistence

**Phase**: 0 (Architecture Foundation)
**Score**: 9.0
**Value**: 9 | **Effort**: 1

## Overview

Enable DIANA to save conversations to disk and resume them across sessions. Users can list past conversations, load a previous conversation by ID, and continue where they left off.

## Why High Priority?

Conversation continuity is fundamental to a useful AI assistant. Without persistence:
- Context is lost on every exit
- Users must re-explain complex situations
- Multi-session tasks become frustrating
- DIANA feels "forgetful" despite having cross-session memory for facts

## Dependencies

- 004-agent-mcp-foundation (for consistent patterns)

## Enables

- Multi-session task continuity
- Conversation search/history browsing
- Future: conversation summarization for long-term memory
- Future: conversation export/backup

## Key Capabilities

| Category | Feature |
|----------|---------|
| Storage | `ConversationStore` - JSON persistence with atomic writes |
| CLI | `diana conversations list` - Show recent conversations |
| CLI | `diana chat --resume <id>` - Resume a conversation |
| CLI | `diana conversations show <id>` - Preview a conversation |
| Auto | Auto-save on session close |
| Auto | Auto-cleanup of old conversations (configurable retention) |

## Design Constraints

- **Local-first**: All conversation data stored locally in `~/.diana/conversations/` (index.json + per-conversation files)
- **Transparent**: Conversations stored as human-readable JSON
- **Graceful degradation**: If store is corrupted, start fresh (don't crash)
- **Resource conscious**: Limit stored conversations, prune old ones
