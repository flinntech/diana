# Feature Specification: Conversation Persistence

**Feature Branch**: `005-conversation-persistence`

**Created**: 2025-12-13

**Status**: Implemented

**Input**: Enable DIANA to save and resume conversations across sessions with local JSON storage, CLI commands, and automatic cleanup.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Resume Previous Conversation (Priority: P1)

A user was discussing a complex file organization strategy with DIANA yesterday. Today, they want to continue that conversation without starting over.

**Why this priority**: This is the core value proposition - users lose context when conversations don't persist. Without resume capability, users must re-explain context every session.

**Independent Test**: Can be fully tested by running `diana chat`, having a conversation, closing the session, then running `diana chat --resume <id>` and verifying the previous context is restored.

**Acceptance Scenarios**:

1. **Given** a user has a previous conversation saved, **When** they run `diana chat --resume <conversation-id>`, **Then** the session loads and displays all previous messages on screen (user messages prefixed with "You:", assistant messages prefixed with "DIANA:") so the user has full context before continuing.
2. **Given** a user runs `diana chat --resume` without an ID, **When** they have previous conversations, **Then** an interactive picker displays the last 10 conversations with titles and timestamps.
3. **Given** a user provides an invalid conversation ID, **When** attempting to resume, **Then** the system displays a clear error message.
4. **Given** a conversation is already open in another session, **When** a user attempts to resume it, **Then** the system displays a message indicating the conversation is locked and by which process.

---

### User Story 2 - Automatic Conversation Saving (Priority: P1)

A user finishes a chat session with DIANA. They don't want to manually save - conversations should persist automatically.

**Why this priority**: Without auto-save, resume is useless. This enables the core feature without user friction.

**Independent Test**: Can be tested by starting a chat, exchanging messages, closing the session, then checking that the conversation file exists in the storage directory.

**Acceptance Scenarios**:

1. **Given** a user is in an active chat session, **When** they close the session (exit or Ctrl+C), **Then** the conversation is automatically saved with all messages.
2. **Given** a conversation is saved, **When** examining the storage file, **Then** the JSON is human-readable with proper timestamps and message structure.
3. **Given** a new chat session starts, **When** no resume flag is provided, **Then** a new conversation ID is generated automatically.

---

### User Story 3 - List and Browse Conversations (Priority: P2)

A user wants to see what conversations they've had with DIANA to find one worth resuming.

**Why this priority**: Enables discovery of past conversations but not required for basic save/resume functionality.

**Independent Test**: Can be tested by creating several conversations, then running `diana conversations list` and verifying all appear with correct metadata.

**Acceptance Scenarios**:

1. **Given** a user has multiple saved conversations, **When** they run `diana conversations list`, **Then** they see a list showing ID, title, summary, timestamps, and message count for each.
2. **Given** a user wants to preview a conversation, **When** they run `diana conversations show <id>`, **Then** they see the conversation messages without loading into an active session.
3. **Given** a user has no saved conversations, **When** they run `diana conversations list`, **Then** they see a helpful message indicating no conversations exist.

---

### User Story 4 - Delete Conversations (Priority: P3)

A user wants to remove a conversation they no longer need or that contains sensitive information.

**Why this priority**: Important for user control and privacy but not core functionality.

**Independent Test**: Can be tested by creating a conversation, deleting it via CLI, and verifying it no longer appears in list or storage.

**Acceptance Scenarios**:

1. **Given** a user has a saved conversation, **When** they run `diana conversations delete <id>`, **Then** the conversation is permanently removed.
2. **Given** a user tries to delete a non-existent conversation, **When** the command runs, **Then** a clear error message is displayed.

---

### User Story 5 - Automatic Cleanup (Priority: P3)

Storage should not grow indefinitely. Old conversations should be automatically cleaned up based on configurable limits.

**Why this priority**: Maintenance feature that prevents storage bloat but not required for core functionality.

**Independent Test**: Can be tested by creating conversations beyond the limit, restarting DIANA, and verifying old conversations are pruned.

**Acceptance Scenarios**:

1. **Given** the conversation count exceeds the configured maximum, **When** the store loads, **Then** the oldest conversations are automatically removed.
2. **Given** conversations exist older than the retention period, **When** the store loads, **Then** expired conversations are automatically removed.
3. **Given** cleanup occurs, **When** conversations are removed, **Then** the action is logged for user awareness.

---

### Edge Cases

- What happens when storage is corrupted? System logs a warning and starts fresh with an empty store.
- What happens when disk is full? Save operation fails gracefully with error message, session continues.
- What happens when two sessions try to save simultaneously? Atomic writes prevent corruption; last write wins.
- What happens when conversation file exists but index is missing entry? Orphan files are ignored; index is authoritative.
- What happens when resuming a conversation that was partially corrupted? System attempts JSON parse; if it fails entirely, treats as missing conversation with error message. Partial message recovery is out of scope (JSON is atomic - valid or invalid).
- What happens when another process has a conversation open? System refuses to load, showing which process holds the lock.
- What happens when a process crashes without releasing the lock? Stale locks (process no longer running) are automatically released.
- What happens when LLM title generation fails? System falls back to timestamp-based title (e.g., "Conversation from Dec 13, 2025").

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST automatically save conversations when a chat session ends normally or via interrupt, provided the conversation contains at least one complete exchange (user message + assistant response).
- **FR-002**: System MUST allow resuming a previous conversation by providing its ID.
- **FR-003**: System MUST display an interactive picker of recent conversations when `--resume` is used without an ID.
- **FR-004**: System MUST generate unique conversation IDs for new sessions.
- **FR-005**: System MUST generate (or regenerate) conversation titles and summaries using the LLM on every save, reflecting the full conversation content.
- **FR-006**: System MUST store conversations in human-readable JSON format.
- **FR-007**: System MUST use atomic file writes to prevent corruption during save operations.
- **FR-008**: System MUST separate metadata (index) from full conversation data for efficient listing.
- **FR-009**: System MUST serialize all message types including tool calls and responses.
- **FR-010**: System MUST preserve existing chat command behavior when no `--resume` flag is provided.
- **FR-010a**: System MUST display all previous messages on screen when resuming a conversation, with thinking tags (`<think>...</think>`) stripped from assistant responses for readability.
- **FR-011**: System MUST list conversations showing ID, title, summary, timestamps, and message count, sorted by last activity (most recent first).
- **FR-012**: System MUST allow previewing conversation content without loading into active session.
- **FR-013**: System MUST allow deleting individual conversations.
- **FR-014**: System MUST automatically prune conversations exceeding the configured maximum count.
- **FR-015**: System MUST automatically prune conversations older than the configured retention period.
- **FR-016**: System MUST run cleanup on store load, not during active sessions.
- **FR-017**: System MUST handle corrupted storage gracefully by logging and starting fresh.
- **FR-018**: System MUST store all data locally, never transmitting to external services.
- **FR-019**: System MUST lock conversations when loaded into an active session to prevent concurrent access.
- **FR-020**: System MUST release conversation locks when a session ends (normally or via interrupt).
- **FR-021**: System MUST detect and release stale locks from crashed processes that are no longer running.
- **FR-022**: System MUST display lock holder information when a user attempts to resume a locked conversation.

### Key Entities

- **Conversation**: A complete chat session containing an ordered sequence of messages, timestamps, and generated title. Identified by a unique ID.
- **ConversationMetadata**: Lightweight summary of a conversation for listing purposes - contains ID, title, summary, timestamps, and message count without the full message history.
- **Message**: A single exchange unit in a conversation, which may be user input, assistant response, tool call, or tool response.
- **ConversationStore**: The persistence layer managing all saved conversations, handling save/load/delete operations and automatic cleanup.
- **ConversationLock**: A marker indicating a conversation is in use, containing the process ID and timestamp of acquisition.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can resume a previous conversation within 2 seconds of session start.
- **SC-002**: Conversation list displays within 1 second regardless of conversation count (up to configured maximum).
- **SC-003**: Existing `diana chat` command works identically to before when `--resume` is not provided.
- **SC-004**: 100% of conversation data is recoverable after normal session termination.
- **SC-005**: Users can list, preview, and manage at least 100 conversations without performance degradation.
- **SC-006**: All stored data remains readable by humans using standard text editors.
- **SC-007**: Storage cleanup maintains data under configured limits automatically without user intervention.

## Clarifications

### Session 2025-12-13

- Q: Should empty/minimal conversations be saved? → A: Only save conversations with at least 1 complete exchange (user message + assistant response).
- Q: Should title/summary update when resumed conversations are saved? → A: Regenerate title and summary on every save to reflect full conversation content.
- Q: How should conversation list be sorted? → A: By last activity (most recent first).

## Assumptions

- The existing session management system (SessionService) provides hooks for initialization and cleanup where persistence can integrate.
- The Obsidian logging happens before conversation save, as specified in the input.
- Title and summary generation can reuse the existing LLM summarization capability used for Obsidian logging (single LLM call provides both).
- Users typically have fewer than 100 active conversations worth keeping.
- 30 days is a reasonable default retention period for conversations.
- The `~/.diana/conversations/` directory can be created if it doesn't exist.
- Message objects in the existing codebase can be serialized to JSON without loss of information.

## Out of Scope

- Cloud synchronization or backup of conversations.
- Sharing conversations between users or devices.
- Conversation search by content (listing by metadata only).
- Conversation merging or branching.
- Encryption of stored conversations.
- Real-time conversation sync between multiple active sessions.