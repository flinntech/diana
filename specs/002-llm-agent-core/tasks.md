# Tasks: LLM Agent Core - DIANA's Brain

**Input**: Design documents from `/specs/002-llm-agent-core/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.ts

**Tests**: Tests included as per plan.md (vitest for unit + integration). Tests can be written after implementation or TDD-style.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US6)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Paths follow structure defined in plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency installation

- [x] T001 Install commander.js and chalk dependencies via `npm install commander chalk`
- [x] T002 Install @commander-js/extra-typings as dev dependency via `npm install -D @commander-js/extra-typings`
- [x] T003 [P] Create directory structure: src/llm/, src/agent/, src/cli/
- [x] T004 [P] Create test directory structure: tests/unit/llm/, tests/unit/agent/, tests/integration/agent/
- [x] T005 Copy contracts/api.ts interfaces to src/types/agent.ts with necessary adjustments

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core LLM infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

### 2.1 LLM Client Layer

- [x] T006 [P] Create Ollama-specific types in src/llm/types.ts (re-export from src/types/agent.ts: OllamaChatRequest, OllamaChatChunk, OllamaOptions; add any streaming-specific internal types)
- [x] T007 Create OllamaClient with healthCheck() method in src/llm/client.ts
- [x] T008 Add hasModel() method to OllamaClient in src/llm/client.ts
- [x] T009 Add listModels() method to OllamaClient in src/llm/client.ts
- [x] T010 Implement streaming chat() method with NDJSON parsing in src/llm/client.ts
- [x] T011 Implement non-streaming chatComplete() method in src/llm/client.ts
- [x] T012 Add retry logic with exponential backoff for transient errors in src/llm/client.ts
- [x] T013 Create barrel export in src/llm/index.ts

### 2.2 Configuration Extension

- [x] T014 Extend DianaConfig with OllamaConfig in src/config/diana.config.ts
- [x] T015 Add systemPromptPath and memoryPath to DianaConfig in src/config/diana.config.ts

### 2.3 System Prompt (Identity Foundation)

- [x] T016 Create DIANA's identity system prompt file at src/config/system-prompt.md
- [x] T017 Implement system prompt loader with template variable support ({{TOOL_DESCRIPTIONS}}, {{KEY_FACTS}}) in src/agent/prompt.ts
- [x] T018 Create barrel export in src/agent/index.ts

### 2.4 CLI Framework

- [x] T019 Setup Commander.js program with name, description, version in src/cli/index.ts
- [x] T020 Configure bin entry point in package.json for `diana` command
- [x] T021 Implement status command showing Ollama/model/vault health in src/cli/status.ts
- [x] T022 Wire status command to Commander program in src/cli/index.ts
- [x] T023 Update main entry point src/index.ts to export CLI

**Checkpoint**: Foundation ready - Ollama client works, system prompt loads, `diana status` runs

**US3 Coverage Note**: User Story 3 (Consistent Identity) acceptance scenarios are covered by:
- US3.1 (load system prompt): T016, T017, T029
- US3.2 (self-identification): Verified via T089 quickstart validation
- US3.3 (follow principles): Embedded in system-prompt.md content (T016)
- US3.4 (tool descriptions in prompt): T056

---

## Phase 3: User Story 1 - Interactive Conversation (Priority: P1) MVP

**Goal**: Josh can have a streaming conversation with DIANA via `diana chat`

**Independent Test**: Start chat session, send message, receive streaming response, exit with `/exit` or Ctrl+C

**Story Reference**: spec.md User Story 1

### Implementation for User Story 1

- [x] T024 [US1] Create ConversationManager class with addMessage() and getMessages() in src/agent/conversation.ts
- [x] T025 [US1] Add getId() and getTokenEstimate() methods to ConversationManager in src/agent/conversation.ts
- [x] T026 [US1] Implement token estimation (chars/4 approximation) in ConversationManager in src/agent/conversation.ts
- [x] T027 [US1] Create Session class with initialize(), sendMessage(), close() in src/agent/session.ts
- [x] T028 [US1] Implement session state machine (initializing→ready→processing→closed) in src/agent/session.ts
- [x] T029 [US1] Add session initialization: health check, load system prompt, create conversation in src/agent/session.ts
- [x] T030 [US1] Implement sendMessage() with streaming response handling in src/agent/session.ts
- [x] T031 [US1] Add graceful shutdown with conversation logging to Obsidian in src/agent/session.ts
- [x] T032 [US1] Create chat command with readline interface in src/cli/chat.ts
- [x] T033 [US1] Implement streaming output with chalk colors in src/cli/chat.ts
- [x] T034 [US1] Add /exit command and Ctrl+C handling in src/cli/chat.ts
- [x] T035 [US1] Add welcome message on session start in src/cli/chat.ts
- [x] T036 [US1] Wire chat command to Commander program in src/cli/index.ts
- [x] T037 [US1] Export Session and ConversationManager from src/agent/index.ts

**Checkpoint**: `diana chat` starts session, streams responses, exits gracefully with logging

---

## Phase 4: User Story 2 - One-Shot Queries (Priority: P1)

**Goal**: Josh can ask a quick question via `diana ask "query"` without entering chat session

**Independent Test**: Run `diana ask "What time is it?"`, verify response returns and process exits

**Story Reference**: spec.md User Story 2

### Implementation for User Story 2

- [x] T038 [US2] Create ask command accepting query string argument in src/cli/ask.ts
- [x] T039 [US2] Implement single-turn conversation flow (system prompt + one user message) in src/cli/ask.ts
- [x] T040 [US2] Add streaming response output in src/cli/ask.ts
- [x] T041 [US2] Implement conversation logging to Obsidian after response completes in src/cli/ask.ts
- [x] T042 [US2] Add --format option for text/json output in src/cli/ask.ts
- [x] T043 [US2] Add error handling for Ollama unavailable case with clear message in src/cli/ask.ts
- [x] T044 [US2] Wire ask command to Commander program in src/cli/index.ts

**Checkpoint**: `diana ask "question"` returns answer and exits, conversation logged

---

## Phase 5: User Story 4 - Tool Calling (Priority: P2)

**Goal**: DIANA can call tools to take actions like writing notes via ObsidianWriter

**Independent Test**: Ask DIANA to write a note, verify ObsidianWriter tool called and note created

**Story Reference**: spec.md User Story 4

### Implementation for User Story 4

- [x] T045 [US4] Create ToolRegistry class with register() and get() methods in src/agent/tools.ts
- [x] T046 [US4] Add has() method to ToolRegistry in src/agent/tools.ts
- [x] T047 [US4] Implement getToolDefinitions() returning Ollama format in src/agent/tools.ts
- [x] T048 [US4] Add execute() method with argument validation against JSON Schema in src/agent/tools.ts
- [x] T049 [US4] Implement getDescriptions() returning markdown for system prompt in src/agent/tools.ts
- [x] T050 [US4] Create ObsidianWriter tool wrapper (write_daily_note) using existing ObsidianWriter in src/agent/tools/obsidian.ts
- [x] T051 [US4] Create read_daily_note tool using ObsidianWriter in src/agent/tools/obsidian.ts
- [x] T052 [US4] Create write_observation tool using ObsidianWriter in src/agent/tools/obsidian.ts
- [x] T053 [US4] Update Session to accept ToolRegistry and pass tools to Ollama in src/agent/session.ts
- [x] T054 [US4] Implement tool call detection and execution loop in Session.sendMessage() in src/agent/session.ts
- [x] T055 [US4] Add tool result messages back to conversation in src/agent/session.ts
- [x] T056 [US4] Update system prompt loader to inject {{TOOL_DESCRIPTIONS}} in src/agent/prompt.ts
- [x] T057 [US4] Add tool error handling with user-friendly messages in src/agent/session.ts
- [x] T058 [US4] Update chat command to show tool call indicators in src/cli/chat.ts
- [x] T059 [US4] Export ToolRegistry and tool wrappers from src/agent/index.ts

**Checkpoint**: DIANA can use ObsidianWriter tool when asked, results incorporated into responses

---

## Phase 6: User Story 5 - Session Memory (Priority: P2)

**Goal**: DIANA maintains context during conversation and handles long conversations gracefully

**Independent Test**: Have 20+ turn conversation, verify DIANA recalls earlier context correctly

**Story Reference**: spec.md User Story 5

### Implementation for User Story 5

- [x] T060 [US5] Add needsSummarization(threshold) method to ConversationManager in src/agent/conversation.ts
- [x] T061 [US5] Implement summarize(summary) method replacing old messages in src/agent/conversation.ts
- [x] T062 [US5] Add summarizedAt tracking field to Conversation in src/agent/conversation.ts
- [x] T063 [US5] Create context summarization prompt template in src/agent/prompts/summarize.ts
- [x] T064 [US5] Implement automatic summarization trigger in Session when context approaches limit in src/agent/session.ts
- [x] T065 [US5] Add LLM call to generate summary of older messages in src/agent/session.ts
- [x] T066 [US5] Preserve system prompt and recent messages (last ~10) during summarization in src/agent/session.ts
- [x] T067 [US5] Update token estimate after summarization in src/agent/conversation.ts

**Checkpoint**: 50+ turn conversations work without context overflow, older context preserved via summary

---

## Phase 7: User Story 6 - Cross-Session Memory (Priority: P3)

**Goal**: DIANA remembers key facts about Josh across sessions via Obsidian markdown

**Independent Test**: Tell DIANA a preference, end session, start new one, verify she remembers

**Story Reference**: spec.md User Story 6

### Implementation for User Story 6

- [x] T068 [US6] Create KeyFact interface with content, tags, createdAt, source in src/agent/memory.ts
- [x] T069 [US6] Create KeyFactStore class with load() parsing facts.md in src/agent/memory.ts
- [x] T070 [US6] Implement save() writing facts.md with frontmatter in src/agent/memory.ts
- [x] T071 [US6] Add addFact() method to KeyFactStore in src/agent/memory.ts
- [x] T072 [US6] Implement getImportant() returning #important tagged facts in src/agent/memory.ts
- [x] T073 [US6] Implement getRecent(n) returning N most recent facts in src/agent/memory.ts
- [x] T074 [US6] Implement getContextString() formatting facts for system prompt in src/agent/memory.ts
- [x] T075 [US6] Create initial memory/facts.md file in Obsidian vault via setup script or quickstart
- [x] T076 [US6] Update Session initialization to load KeyFactStore in src/agent/session.ts
- [x] T077 [US6] Update system prompt loader to inject {{KEY_FACTS}} in src/agent/prompt.ts
- [x] T078 [US6] Create save_fact tool for DIANA to store learned facts in src/agent/tools/memory.ts
- [x] T079 [US6] Register save_fact tool in default tool setup in src/agent/session.ts
- [x] T080 [US6] Export KeyFactStore from src/agent/index.ts

**Checkpoint**: Facts persist in Obsidian, loaded on session start, DIANA recalls preferences

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Tests, documentation, and final validation

### Unit Tests

- [x] T081 [P] Unit tests for OllamaClient in tests/unit/llm/client.test.ts
- [x] T082 [P] Unit tests for ConversationManager in tests/unit/agent/conversation.test.ts
- [x] T083 [P] Unit tests for ToolRegistry in tests/unit/agent/tools.test.ts
- [x] T084 [P] Unit tests for KeyFactStore in tests/unit/agent/memory.test.ts
- [x] T085 [P] Unit tests for system prompt loader in tests/unit/agent/prompt.test.ts

### Integration Tests

- [ ] T086 Integration test for full chat session (requires Ollama) in tests/integration/agent/session.test.ts
- [ ] T087 Integration test for tool calling flow in tests/integration/agent/tools.test.ts
- [ ] T088 Integration test for context summarization in tests/integration/agent/memory.test.ts

### Final Validation

- [ ] T089 Run quickstart.md validation end-to-end
- [ ] T090 Verify all success criteria from spec.md (SC-001 through SC-010)
- [x] T091 [P] Add --debug flag to chat and ask commands for verbose logging
- [x] T092 Run npm run build and fix any type errors
- [x] T093 Run npm test and fix any failing tests
- [ ] T094 [P] Performance benchmark: verify SC-001 (first response <3s) and SC-005 (streaming <500ms) in tests/integration/agent/performance.test.ts
- [ ] T095 [US3] Verify US3 acceptance scenarios: identity load, self-identification response, principle adherence, tool descriptions in prompt

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-7)**: All depend on Foundational phase completion
  - US1 and US2 can run in parallel after Foundational
  - US4 can start after US1 (needs Session)
  - US5 can start after US1 (extends ConversationManager)
  - US6 can start after US4 (uses tool infrastructure)
- **Polish (Phase 8)**: Can start incrementally as user stories complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Foundational only - can start first
- **User Story 2 (P1)**: Depends on Foundational only - can run parallel with US1
- **User Story 4 (P2)**: Depends on US1 (Session class) - soft dependency, could be parallel
- **User Story 5 (P2)**: Depends on US1 (ConversationManager) - extends existing
- **User Story 6 (P3)**: Depends on US4 (tool infrastructure) for save_fact tool

### Within Each User Story

- Interfaces/types before implementations
- Core classes before CLI commands
- Main functionality before edge case handling

### Parallel Opportunities

- **Phase 1**: T003 and T004 can run in parallel
- **Phase 2**: T006 can run parallel with T014-T016
- **Phase 3-4**: US1 and US2 can be implemented in parallel
- **Phase 5-6**: US4, US5, US6 have limited parallelism due to dependencies
- **Phase 8**: All unit tests (T081-T085) can run in parallel

---

## Parallel Example: Foundation Setup

```bash
# Launch directory creation in parallel:
Task: "Create directory structure: src/llm/, src/agent/, src/cli/"
Task: "Create test directory structure: tests/unit/llm/, tests/unit/agent/"

# Launch type files in parallel:
Task: "Create Ollama-specific types in src/llm/types.ts"
Task: "Create DIANA's identity system prompt file at src/config/system-prompt.md"
```

## Parallel Example: Unit Tests

```bash
# Launch all unit tests in parallel:
Task: "Unit tests for OllamaClient in tests/unit/llm/client.test.ts"
Task: "Unit tests for ConversationManager in tests/unit/agent/conversation.test.ts"
Task: "Unit tests for ToolRegistry in tests/unit/agent/tools.test.ts"
Task: "Unit tests for KeyFactStore in tests/unit/agent/memory.test.ts"
Task: "Unit tests for system prompt loader in tests/unit/agent/prompt.test.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1+2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Interactive Chat)
4. Complete Phase 4: User Story 2 (One-Shot Queries)
5. **STOP and VALIDATE**: Test `diana chat` and `diana ask` independently
6. Deploy/demo if ready - DIANA can converse!

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 + US2 → Test independently → MVP: DIANA talks!
3. Add US4 → Test tool calling → DIANA acts!
4. Add US5 → Test long conversations → DIANA remembers in-session!
5. Add US6 → Test cross-session → DIANA remembers across sessions!
6. Each increment adds value without breaking previous functionality

### Key Files Summary

| File | Purpose | Phase |
|------|---------|-------|
| src/llm/client.ts | OllamaClient with streaming | Foundational |
| src/llm/types.ts | Ollama-specific types | Foundational |
| src/agent/conversation.ts | ConversationManager | US1 + US5 |
| src/agent/session.ts | Session state machine | US1 + US4 + US5 + US6 |
| src/agent/tools.ts | ToolRegistry | US4 |
| src/agent/memory.ts | KeyFactStore | US6 |
| src/agent/prompt.ts | System prompt loader | Foundational + US4 + US6 |
| src/cli/chat.ts | Interactive chat command | US1 |
| src/cli/ask.ts | One-shot query command | US2 |
| src/cli/status.ts | Health check command | Foundational |
| src/cli/index.ts | Commander.js setup | Foundational |
| src/config/system-prompt.md | DIANA's identity | Foundational |
| src/config/diana.config.ts | Extended config | Foundational |

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- US3 (Consistent Identity) is merged into Foundational (system prompt) and US4 (tool descriptions)
- Total tasks: 95 (T001-T095)
