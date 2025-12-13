Create implementation plan for Conversation Persistence

Technical context:
- Language: TypeScript 5.9+ with Node.js 18+ (ES modules, strict mode)
- Existing patterns: ProposalStore (src/proposals/proposal.store.ts) for JSON persistence with atomic writes
- Existing patterns: KeyFactStore (src/agent/memory.ts) for cross-session markdown storage
- Existing: ConversationManager (src/agent/conversation.ts) for in-memory management
- Existing: Session class (src/agent/session.ts) manages conversation lifecycle
- Existing: Message and Conversation types (src/types/agent.ts)
- CLI: Commander.js pattern in src/cli/

Key patterns from exploration:
- ProposalStore uses write-file-atomic for crash-safe writes
- Date serialization: .toISOString() on save, new Date() on load
- Session lifecycle: initialize() for setup, close() for cleanup
- ConversationManager tracks: id, messages[], startedAt, lastActivity, tokenEstimate, summarizedAt

New files:
1. src/conversations/conversation.store.ts - ConversationStore class
2. src/conversations/index.ts - Module exports
3. src/cli/conversations.ts - Subcommand for list/show/delete

Modified files:
1. src/types/agent.ts - Add SerializedConversation, ConversationMetadata, ConversationStoreData
2. src/agent/session.ts - Add save on close, load on resume via SessionOptions
3. src/cli/chat.ts - Add --resume/-r flag
4. src/cli/index.ts - Register conversations subcommand
5. src/config/diana.config.ts - Add conversations config section

Integration points:
- Session.initialize(): After key facts load, before system prompt, load conversation if resumeConversationId provided
- Session.close(): After Obsidian logging, save conversation to store
- chatCommand(): Create ConversationStore, pass to Session with resumeConversationId from --resume flag

Storage structure:
~/.diana/conversations/
├── index.json          # Metadata: { version, conversations: ConversationMetadata[] }
├── {id}.json           # Full conversation with messages
└── ...

ConversationStore methods:
- loadIndex(): Promise<ConversationIndex> - Read index.json only
- saveIndex(): Promise<void> - Write index.json atomically
- loadConversation(id): Promise<SerializedConversation | null> - Read single {id}.json
- saveConversation(conv): Promise<void> - Write {id}.json + update index
- list(): ConversationMetadata[] - Return metadata sorted by lastActivity desc (from index)
- delete(id): Promise<void> - Remove {id}.json + update index
- cleanup(): Remove old/excess conversations per config, update index

Edge cases:
- Corrupted index.json: Rebuild from conversation files (scan directory)
- Corrupted conversation file: Log warning, remove from index, continue
- `--resume` without id: Show interactive picker with last 10 conversations (use inquirer or similar)
- `--resume` with invalid id: Error message + show picker
- No conversations exist: Friendly message, start new conversation
- Title generation: First user message truncated to 50 chars, ellipsis if longer
- Index/file mismatch: Index is source of truth for list, file presence is source of truth for load

Tests needed:
- ConversationStore: load/save/getById/list/delete/cleanup
- Date serialization round-trip
- Session integration: save on close, load on resume
- CLI: --resume flag parsing, conversations subcommand
