Conversation Persistence for DIANA

Enable DIANA to save and resume conversations across sessions:

1. Conversation Storage
   - ConversationStore class following ProposalStore pattern (src/proposals/proposal.store.ts)
   - JSON persistence with atomic writes (write-file-atomic)
   - Directory-based storage: ~/.diana/conversations/
     - index.json: Metadata only (id, title, startedAt, lastActivity, messageCount)
     - {id}.json: Individual conversation files with full message history
   - Serialize Message objects including tool calls and responses
   - Date serialization: toISOString() on save, new Date() on load
   - Benefits: list reads only index, resume loads single file, scales cleanly

2. Types (add to src/types/agent.ts)
   - SerializedConversation: id, messages, startedAt (ISO), lastActivity (ISO), tokenEstimate, summarizedAt?, title?
   - ConversationMetadata: id, title, startedAt, lastActivity, messageCount
   - ConversationStoreData: version, lastModified, conversations[]

3. Session Integration
   - Auto-save conversation on session close (after Obsidian logging)
   - Load conversation when resuming (by ID) during initialize()
   - Generate conversation ID on new session start (existing behavior)
   - Auto-generate title from first user message (truncated to ~50 chars)
   - Add to SessionOptions: resumeConversationId?, conversationStore?

4. CLI Commands
   - `diana chat --resume <id>` or `-r <id>` - Resume a previous conversation
   - `diana chat --resume` or `-r` (no id) - Show last 10 conversations as interactive picker
   - `diana conversations list` - List recent conversations with ID, timestamps, message count, title
   - `diana conversations show <id>` - Preview conversation messages without loading into session
   - `diana conversations delete <id>` - Delete a conversation

5. Configuration (add to diana.config.ts)
   - conversations.storePath: string (default: ~/.diana/conversations/)
   - conversations.maxConversations: number (default: 100)
   - conversations.retentionDays: number (default: 30)

6. Cleanup and Maintenance
   - Auto-prune conversations exceeding maxConversations (oldest first)
   - Auto-prune conversations older than retentionDays
   - Cleanup runs on store load, not during active session

Constraints:
- Local-first: All data stored locally, never transmitted
- Human-readable: JSON format inspectable by users
- Graceful degradation: Corrupted store logs warning and starts fresh
- Backward compatible: Existing chat command works unchanged if no --resume flag
- TypeScript with strict mode
- Follow existing patterns: ProposalStore for persistence, Commander.js for CLI
- PostgreSQL-ready: JSON structure can migrate directly to JSONB column later
