# Tasks: Conversation Persistence

**Input**: Design documents from `/specs/005-conversation-persistence/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Tests**: Not explicitly requested - test tasks omitted

**Organization**: Tasks grouped by user story to enable independent implementation and testing

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create conversations module directory structure at src/conversations/
- [x] T002 Install @inquirer/prompts dependency for interactive picker

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 [P] Create conversation type definitions in src/conversations/conversation.types.ts (copy from contracts/conversation.types.ts, adapt imports)
- [x] T004 [P] Add ConversationsConfig interface and config to src/config/diana.config.ts
- [x] T005 [P] Create ConversationLock implementation in src/conversations/conversation.lock.ts (acquireLock, releaseLock, isLocked, isLockStale)
- [x] T006 Create ConversationStore class in src/conversations/conversation.store.ts (loadIndex, saveIndex, loadConversation, saveConversation, emptyState with corruption warning per FR-017)
- [x] T007 Add getSerializableState() method to ConversationManager in src/agent/conversation.ts
- [x] T008 Add restoreState() method to ConversationManager in src/agent/conversation.ts
- [x] T009 Add createConversationFromState() factory function in src/agent/conversation.ts
- [x] T010 Create module exports in src/conversations/index.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Stories 1 & 2 - Resume and Auto-Save (Priority: P1) 🎯 MVP

**Goal**: Enable conversations to be automatically saved when closing and resumed via `diana chat --resume`

**Why Combined**: US1 (Resume) and US2 (Auto-Save) are tightly coupled - resume is meaningless without save, and save is useless without resume. Both are P1 priority.

**Independent Test**: Start a chat, exchange messages, close session. Verify conversation file created in ~/.diana/conversations/. Then run `diana chat --resume <id>` and verify previous context is restored.

### Implementation for User Stories 1 & 2

- [x] T011 [US1/2] Add conversationStore and resumeConversationId to SessionOptions in src/agent/session.ts
- [x] T012 [US1/2] Implement generateTitleAndSummary() private method in src/agent/session.ts (single LLM call for both)
- [x] T013 [US1/2] Implement loadConversation() private method in src/agent/session.ts (load from store, restore ConversationManager state, acquire lock; if locked, display holder PID/hostname per FR-022)
- [x] T014 [US1/2] Implement saveConversation() private method in src/agent/session.ts (serialize state, generate title/summary, save to store, release lock)
- [x] T015 [US1/2] Integrate loadConversation() into Session.initialize() - call after key facts load if resumeConversationId provided
- [x] T016 [US1/2] Integrate saveConversation() into Session.close() - call after Obsidian logging if conversation meets minimum threshold
- [x] T017 [US1/2] Implement hasMinimumContent() check in src/agent/session.ts (at least one user + one assistant message)
- [x] T018 [P] [US1/2] Add --resume/-r flag to chat command in src/cli/chat.ts (accepts optional conversation ID)
- [x] T019 [US1/2] Implement showConversationPicker() in src/cli/chat.ts using @inquirer/prompts select
- [x] T020 [US1/2] Update chatCommand() in src/cli/chat.ts to create ConversationStore, handle --resume flag, pass options to Session
- [x] T021 [P] [US1/2] Add resume type to ChatCommandOptions in src/types/agent.ts (string | true | undefined)

**Checkpoint**: At this point, conversations can be saved and resumed. MVP is functional.

---

## Phase 4: User Story 3 - List and Browse Conversations (Priority: P2)

**Goal**: Enable users to list saved conversations and preview content without loading into active session

**Independent Test**: Create several conversations, then run `diana conversations list` and verify all appear with ID, title, summary, timestamps, message count. Run `diana conversations show <id>` to preview messages.

### Implementation for User Story 3

- [x] T022 [P] [US3] Create conversations subcommand file src/cli/conversations.ts with program structure
- [x] T023 [US3] Implement listConversations() in src/cli/conversations.ts (load index, format table output with ID, title, lastActivity, messageCount)
- [x] T024 [US3] Implement showConversation() in src/cli/conversations.ts (load full conversation, display title/timestamps/messages)
- [x] T025 [US3] Add list() method to ConversationStore in src/conversations/conversation.store.ts (returns sorted metadata)
- [x] T026 [US3] Handle empty conversations case in listConversations() with helpful message
- [x] T027 [US3] Format relative timestamps in list output (e.g., "2 hours ago", "Yesterday") using date-fns

**Checkpoint**: Users can discover and preview past conversations

---

## Phase 5: User Story 4 - Delete Conversations (Priority: P3)

**Goal**: Enable users to permanently remove individual conversations

**Independent Test**: Create a conversation, run `diana conversations delete <id>`, verify it no longer appears in list and file is removed from storage.

### Implementation for User Story 4

- [x] T028 [US4] Add delete() method to ConversationStore in src/conversations/conversation.store.ts (remove file, update index)
- [x] T029 [US4] Implement deleteConversation() in src/cli/conversations.ts (validate ID, check lock, call store.delete, display result)
- [x] T030 [US4] Handle non-existent conversation ID with clear error message
- [x] T031 [US4] Prevent deletion of locked conversations with informative message

**Checkpoint**: Users have full control over conversation lifecycle

---

## Phase 6: User Story 5 - Automatic Cleanup (Priority: P3)

**Goal**: Prevent unbounded storage growth through automatic pruning

**Independent Test**: Create conversations exceeding configured maxConversations or older than retentionDays, restart DIANA, verify old conversations are pruned and action is logged.

### Implementation for User Story 5

- [x] T032 [US5] Implement cleanup() method in src/conversations/conversation.store.ts
- [x] T033 [US5] Implement age-based cleanup logic (remove conversations older than retentionDays)
- [x] T034 [US5] Implement count-based cleanup logic (remove oldest when count > maxConversations)
- [x] T035 [US5] Call cleanup() in ConversationStore constructor or load initialization
- [x] T036 [US5] Log cleanup actions to console for user awareness

**Checkpoint**: Storage is automatically managed without user intervention

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T037 Register conversations subcommand in src/cli/index.ts
- [x] T038 Add error handling wrapper for all CLI commands with graceful failure messages
- [x] T039 Validate conversation ID format (UUID or partial match) across all commands
- [x] T040 Add SIGINT handler to release lock on Ctrl+C in Session
- [ ] T041 Run quickstart.md validation scenarios including performance checks (SC-001: resume <2s, SC-002: list <1s)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - US1/2 (Phase 3) can start after Foundational
  - US3 (Phase 4) can start after Foundational (parallel with US1/2)
  - US4 (Phase 5) depends on US3 (shares CLI structure)
  - US5 (Phase 6) can start after Foundational (parallel with US1/2/3)
- **Polish (Final Phase)**: Depends on all user stories being complete

### User Story Dependencies

- **User Stories 1 & 2 (P1)**: Can start after Foundational - Core MVP
- **User Story 3 (P2)**: Can start after Foundational - Parallel with US1/2
- **User Story 4 (P3)**: Depends on US3 (shares conversations.ts structure)
- **User Story 5 (P3)**: Can start after Foundational - Parallel with others

### Within Each Phase

- Types before implementations
- Store methods before Session integration
- Session integration before CLI integration
- Core implementation before error handling

### Parallel Opportunities

**Phase 2 (Foundational):**
```
T003, T004, T005 can run in parallel (different files)
T007, T008, T009 must be sequential (same file, additive changes)
```

**Phase 3 (US1/2):**
```
T018, T021 can run in parallel (different files)
T011-T017 must be mostly sequential (same file, interdependent)
```

**Across Phases:**
```
Once Phase 2 completes:
- Phase 3 (US1/2) and Phase 4 (US3) can run in parallel
- Phase 5 (US4) and Phase 6 (US5) can run in parallel (after their dependencies)
```

---

## Parallel Example: Foundational Phase

```bash
# Launch all independent foundational tasks together:
Task: "Create conversation type definitions in src/conversations/conversation.types.ts"
Task: "Add ConversationsConfig interface to src/config/diana.config.ts"
Task: "Create ConversationLock implementation in src/conversations/conversation.lock.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Stories 1 & 2
4. **STOP and VALIDATE**: Test save/resume cycle end-to-end
5. Deploy/demo if ready - conversations now persist!

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add US1/2 (Save/Resume) → Test independently → Deploy (MVP!)
3. Add US3 (List/Browse) → Test independently → Deploy
4. Add US4 (Delete) → Test independently → Deploy
5. Add US5 (Cleanup) → Test independently → Deploy
6. Polish → Final validation → Release

### File Modification Summary

| File | Action | Phase |
|------|--------|-------|
| src/conversations/conversation.types.ts | CREATE | 2 |
| src/conversations/conversation.lock.ts | CREATE | 2 |
| src/conversations/conversation.store.ts | CREATE | 2, 4, 5, 6 |
| src/conversations/index.ts | CREATE | 2 |
| src/config/diana.config.ts | MODIFY | 2 |
| src/agent/conversation.ts | MODIFY | 2 |
| src/agent/session.ts | MODIFY | 3 |
| src/cli/chat.ts | MODIFY | 3 |
| src/cli/conversations.ts | CREATE | 4, 5 |
| src/cli/index.ts | MODIFY | 7 |
| src/types/watcher.ts | MODIFY | 3 |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US1/2 combined as they are both P1 and interdependent
- Verify contracts/conversation.types.ts matches implementation
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
