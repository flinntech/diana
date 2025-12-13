# Tasks: Obsidian Rich Linking

**Input**: Design documents from `/specs/006-obsidian-rich-linking/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Not requested in specification - test tasks omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root (per plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and type definitions

- [X] T001 [P] Add WikiLink and link tracking types to src/types/obsidian.ts
- [X] T002 [P] Add BacklinksUpdateResult and backlinks marker constants to src/types/obsidian.ts
- [X] T003 [P] Add RollupStats, RollupPeriod, and rollup frontmatter types to src/types/obsidian.ts
- [X] T004 [P] Add ConversationAnchor types to src/types/obsidian.ts
- [X] T005 [P] Add KeyFactWithProvenance type to src/types/obsidian.ts
- [X] T006 [P] Add link-related error classes to src/obsidian/errors.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Create LinkManager class with constructor and in-memory index structures in src/obsidian/link-manager.ts
- [X] T008 Implement removeCodeBlocks helper function in src/obsidian/link-manager.ts
- [X] T009 Implement extractWikiLinks method (regex extraction with code block filtering) in src/obsidian/link-manager.ts
- [X] T010 Implement extractOutgoingLinks method (normalized paths, excludes embeds) in src/obsidian/link-manager.ts
- [X] T011 Implement wiki-link path validation (no empty, no newlines, no invalid chars) in src/obsidian/link-manager.ts
- [X] T012 Implement getBacklinks method (reverse index lookup) in src/obsidian/link-manager.ts
- [X] T013 Implement updateNoteLinks method (returns added/removed paths) in src/obsidian/link-manager.ts
- [X] T014 Implement removeNote method in src/obsidian/link-manager.ts
- [X] T015 Implement buildIndex method for batch initialization in src/obsidian/link-manager.ts
- [X] T016 Implement hasNote method in src/obsidian/link-manager.ts
- [X] T017 [P] Add getRollupPath method for weekly/monthly paths to src/obsidian/paths.ts
- [X] T018 [P] Add getConversationAnchorPath method to src/obsidian/paths.ts
- [X] T019 [P] Add backlinks section template generator to src/obsidian/templates.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Auto-Maintained Backlinks (Priority: P1) 🎯 MVP

**Goal**: When DIANA creates notes that reference other notes, the referenced notes automatically know about these incoming links. Users can navigate the knowledge graph bidirectionally.

**Independent Test**: Create an observation that links to another note, verify target note's frontmatter contains `referencedBy` and a "Backlinks" section appears in its content.

### Implementation for User Story 1

- [X] T020 [US1] Extend ObsidianWriter with updateBacklinks method (read, update frontmatter, update content section, atomic write) in src/obsidian/writer.ts
- [X] T021 [US1] Implement generateBacklinksSection helper (HTML comment markers, sorted links) in src/obsidian/templates.ts
- [X] T022 [US1] Implement updateBacklinksSection helper (replace existing or append at end) in src/obsidian/templates.ts
- [X] T023 [US1] Add backlink queue integration (BacklinkQueue class for retry on failure) in src/obsidian/writer.ts
- [X] T024 [US1] Add alphabetical lock ordering for circular reference deadlock prevention in src/obsidian/writer.ts
- [X] T025 [US1] Update writeObservation to accept relatedNotes parameter and trigger backlink updates in src/obsidian/writer.ts
- [X] T026 [US1] Update writeDailyLog to accept relatedNotes parameter and trigger backlink updates in src/obsidian/writer.ts
- [X] T027 [US1] Add references field population in note frontmatter from extracted wiki-links in src/obsidian/writer.ts
- [X] T028 [US1] Implement backlink removal when source note removes link to target in src/obsidian/writer.ts
- [X] T029 [US1] Create diana_query_related_notes LLM tool for querying incoming/outgoing/both links in src/agent/link-tools.ts
- [X] T030 [US1] Add vault migrate subcommand (dry-run + actual) to CLI in src/cli/vault.ts
- [X] T031 [US1] Implement VaultMigrator.dryRun method (scan vault, extract links, report changes) in src/obsidian/vault-migrator.ts
- [X] T032 [US1] Implement VaultMigrator.migrate method (build index, update all notes with backlinks) in src/obsidian/vault-migrator.ts
- [X] T033 [US1] Handle notes without frontmatter during migration (skip and log) in src/obsidian/vault-migrator.ts
- [X] T034 [US1] Handle corrupted frontmatter during migration (skip and log) in src/obsidian/vault-migrator.ts
- [X] T035 [US1] Add vault validate subcommand to detect orphaned backlinks in src/cli/vault.ts
- [X] T036 [US1] Add vault validate --repair option to fix orphaned backlinks in src/cli/vault.ts
- [X] T037 [US1] Add pre-migration vault validation (check permissions, disk space, vault accessibility) in src/cli/vault.ts
- [X] T038 [US1] Add user-facing status output for failed/queued backlink updates in CLI (getBacklinkQueueStatus method) in src/obsidian/writer.ts

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Fact Provenance (Priority: P2)

**Goal**: When DIANA records facts about user preferences, users can trace where each fact originated via wiki-links to source observations.

**Independent Test**: Have DIANA save a fact with a source observation link, verify the fact entry in memory includes the wiki-link to its source.

### Implementation for User Story 2

- [X] T039 [US2] Extend KeyFact type with optional sourceNote field in src/types/agent.ts
- [X] T040 [US2] Update fact serialization to include "(from [[path]])" format before tags in src/agent/memory.ts
- [X] T041 [US2] Update fact parsing to extract sourceNote from "(from [[path]])" pattern in src/agent/memory.ts
- [X] T042 [US2] Update addFact method to accept sourceNote parameter in src/agent/memory.ts
- [X] T043 [US2] Ensure facts with sourceNote trigger backlink updates to source observation (handled by ObsidianWriter backlink system)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Conversation Anchors (Priority: P3)

**Goal**: When conversations reference vault notes, a lightweight stub note bridges the conversation history to the knowledge graph.

**Independent Test**: Have a conversation that references an observation, verify a conversation anchor note is created in the vault with links to the referenced notes.

### Implementation for User Story 3

- [X] T044 [US3] Create conversation anchor frontmatter type and template in src/obsidian/templates.ts
- [X] T045 [US3] Implement writeConversationAnchor method in src/obsidian/writer.ts
- [X] T046 [US3] Add conversation anchor content generation (title, metadata, referenced notes section) in src/obsidian/templates.ts
- [X] T047 [US3] Ensure conversation anchor triggers backlink updates to referenced notes in src/obsidian/writer.ts
- [X] T048 [US3] Create conversation-anchor.ts helpers for ConversationStore integration in src/conversations/conversation-anchor.ts
- [X] T049 [US3] Implement extractReferencedNotes and createAnchorInput helpers in src/conversations/conversation-anchor.ts

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently

---

## Phase 6: User Story 4 - Knowledge Rollup Notes (Priority: P4)

**Goal**: DIANA generates weekly and monthly summary notes showing knowledge evolution with statistics and links.

**Independent Test**: Have DIANA generate a weekly rollup for a period with existing notes, verify the rollup contains accurate statistics and links to the relevant notes.

### Implementation for User Story 4

- [ ] T050 [US4] Create RollupGenerator class with constructor in src/obsidian/rollup-generator.ts
- [ ] T051 [US4] Implement getNotesInPeriod method (scan vault by date range, categorize by type) in src/obsidian/rollup-generator.ts
- [ ] T052 [US4] Implement ISO week calculation helpers (getWeek, getWeekYear with Monday start) in src/obsidian/rollup-generator.ts
- [ ] T053 [US4] Implement generateWeekly method (frontmatter + content with stats and links) in src/obsidian/rollup-generator.ts
- [ ] T054 [US4] Implement generateMonthly method (frontmatter + content with stats and links) in src/obsidian/rollup-generator.ts
- [ ] T055 [US4] Implement proposal status aggregation (approved/rejected/pending counts) in src/obsidian/rollup-generator.ts
- [ ] T056 [US4] Create rollup content template with Summary, Statistics, and per-type sections in src/obsidian/templates.ts
- [ ] T057 [US4] Ensure rollup notes trigger backlink updates to all referenced notes in src/obsidian/rollup-generator.ts
- [ ] T058 [US4] Add vault rollup --weekly subcommand to CLI in src/cli/vault.ts
- [ ] T059 [US4] Add vault rollup --monthly subcommand to CLI in src/cli/vault.ts
- [ ] T060 [US4] Add --date option for generating rollups for specific periods in src/cli/vault.ts

**Checkpoint**: All user stories should now be independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T061 [P] Create rollups/weekly/ and rollups/monthly/ directories during first rollup in src/obsidian/rollup-generator.ts
- [ ] T062 [P] Create conversations/ directory during first anchor creation in src/obsidian/writer.ts
- [ ] T063 [P] Add verbose logging for backlink operations in src/obsidian/writer.ts
- [ ] T064 [P] Add verbose logging for migration progress in src/cli/vault.ts
- [ ] T065 Export new CLI vault subcommand from main CLI entry point in src/cli/index.ts
- [ ] T066 Verify quickstart.md scenarios manually against implementation
- [ ] T067 [P] Document concurrent write limit (10) rationale in code comments in src/obsidian/writer.ts
- [ ] T068 [P] Document last-write-wins ordering behavior for simultaneous writes in code comments in src/obsidian/writer.ts

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in priority order (P1 → P2 → P3 → P4)
  - Or in parallel if staffed appropriately
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independent of US1
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Uses backlink infrastructure from US1 but independently testable
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - Uses backlink infrastructure from US1 but independently testable

### Within Each User Story

- Models/types before services
- Services before CLI commands
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup):** T001-T006 all modify different sections of type files - run in parallel

**Phase 2 (Foundational):**
- T017-T019 (paths, templates) can run in parallel with T007-T016 (link-manager)
- LinkManager tasks (T007-T016) are mostly sequential

**Phase 3 (US1):**
- T029 (query tool) can run in parallel with T020-T028 (writer extensions)
- T030-T038 (CLI commands) depend on writer extensions

**Phase 4-6:** Each phase can run in parallel if US1 backlink infrastructure is complete

---

## Parallel Example: Phase 1 Setup

```bash
# Launch all type definition tasks together:
Task: "Add WikiLink and link tracking types to src/types/obsidian.ts"
Task: "Add BacklinksUpdateResult and backlinks marker constants to src/types/obsidian.ts"
Task: "Add RollupStats, RollupPeriod, and rollup frontmatter types to src/types/obsidian.ts"
Task: "Add ConversationAnchor types to src/types/obsidian.ts"
Task: "Add KeyFactWithProvenance type to src/types/obsidian.ts"
Task: "Add link-related error classes to src/obsidian/errors.ts"
```

## Parallel Example: Phase 2 Foundational

```bash
# After T016 completes, run path/template tasks in parallel:
Task: "Add getRollupPath method for weekly/monthly paths to src/obsidian/paths.ts"
Task: "Add getConversationAnchorPath method to src/obsidian/paths.ts"
Task: "Add backlinks section template generator to src/obsidian/templates.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup - 6 tasks (T001-T006)
2. Complete Phase 2: Foundational - 13 tasks (T007-T019)
3. Complete Phase 3: User Story 1 - 19 tasks (T020-T038)
4. **STOP and VALIDATE**: Test backlink creation and migration independently
5. Deploy/demo if ready - vault is now a bidirectional knowledge graph

**MVP Total: 38 tasks**

### Incremental Delivery

1. Complete Setup + Foundational → LinkManager ready
2. Add User Story 1 → Test backlinks independently → Deploy (MVP!)
3. Add User Story 2 → Test fact provenance independently → Deploy
4. Add User Story 3 → Test conversation anchors independently → Deploy
5. Add User Story 4 → Test rollup generation independently → Deploy
6. Each story adds value without breaking previous stories

### Key Files by Phase

| Phase | New Files | Modified Files |
|-------|-----------|----------------|
| Setup (T001-T006) | - | src/types/obsidian.ts, src/obsidian/errors.ts |
| Foundational (T007-T019) | src/obsidian/link-manager.ts | src/obsidian/paths.ts, src/obsidian/templates.ts |
| US1 (T020-T038) | src/cli/vault.ts, src/agent/tools/query-related.ts | src/obsidian/writer.ts |
| US2 (T039-T043) | - | src/agent/memory.ts |
| US3 (T044-T049) | - | src/obsidian/writer.ts, src/obsidian/templates.ts, src/conversations/conversation.store.ts |
| US4 (T050-T060) | src/obsidian/rollup-generator.ts | src/cli/vault.ts, src/obsidian/templates.ts |
| Polish (T061-T068) | - | src/cli/index.ts, src/obsidian/writer.ts |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Content wiki-links are source of truth; frontmatter is derived (per research.md)
- Backlinks section uses HTML comment markers at EOF (per research.md)
- Lock acquisition in alphabetical order prevents deadlocks (per spec.md edge cases)
- Migration is idempotent and resume-safe (per spec.md edge cases)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently

---

## Architecture Checklist Coverage

Tasks address all gaps identified in `checklists/architecture.md`:

| Checklist Item | Task | Description |
|----------------|------|-------------|
| CHK012 | T067 | Document concurrent write limit (10) rationale |
| CHK014 | T068 | Document last-write-wins ordering behavior |
| CHK020 | T037 | Pre-migration vault validation |
| CHK040 | T038 | User-facing status output for failures |

Previously partial items now fully covered:
- CHK003: T025-T026 extend per-note-type methods
- CHK023: T031 + T037-T038 cover dry-run and validation output
- CHK042: T063-T064 add verbose logging
