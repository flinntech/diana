# Tasks: Obsidian Integration - DIANA's Memory & Notes

**Input**: Design documents from `/specs/001-obsidian-integration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.ts

**Tests**: Included - plan.md specifies unit tests with mock-fs and integration tests.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root (per plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create project directory structure: src/obsidian/, src/types/, src/config/, tests/unit/obsidian/, tests/integration/obsidian/
- [X] T002 Install runtime dependencies: gray-matter, date-fns, write-file-atomic, proper-lockfile
- [X] T003 [P] Install dev dependencies: mock-fs, @types/mock-fs, vitest
- [X] T004 [P] Configure TypeScript with ES modules and strict mode in tsconfig.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Create TypeScript type definitions from contracts in src/types/obsidian.ts
- [X] T006 [P] Implement custom error classes (VaultNotFoundError, VaultNotWritableError, WriteConflictError, CorruptedNoteError, LockTimeoutError) in src/obsidian/errors.ts
- [X] T007 [P] Implement IPathResolver interface with path generation utilities in src/obsidian/paths.ts
- [X] T008 [P] Implement frontmatter generation helpers using gray-matter in src/obsidian/frontmatter.ts
- [X] T009 Configure ObsidianWriterConfig with vault path and fallback settings in src/config/diana.config.ts
- [X] T010 [P] Setup Vitest configuration with mock-fs in tests/setup.ts
- [X] T010a [P] Define WriteQueue interface with bounded size (100 entries max) in src/types/obsidian.ts
- [X] T010b [P] Implement corrupted frontmatter detection (invalid YAML) with recreate-from-scratch strategy in src/obsidian/frontmatter.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Daily Activity Logging (Priority: P1) 🎯 MVP

**Goal**: Enable DIANA to write chronological activity entries to daily log files with proper frontmatter

**Independent Test**: Trigger DIANA to log an activity and verify a properly formatted daily log file appears in the vault with correct date, timestamp, and content

### Tests for User Story 1

- [X] T011 [P] [US1] Unit test for daily log template generation in tests/unit/obsidian/templates.test.ts
- [X] T012 [P] [US1] Unit test for writeDaily method in tests/unit/obsidian/writer.test.ts
- [X] T013 [P] [US1] Integration test for daily log creation in tests/integration/obsidian/vault-writes.test.ts

### Implementation for User Story 1

- [X] T014 [P] [US1] Create daily log template with frontmatter (type: daily-log, date, tags, created, modified) in src/obsidian/templates.ts
- [X] T015 [US1] Implement writeDaily method with new file creation in src/obsidian/writer.ts
- [X] T016 [US1] Add append logic for existing daily logs preserving content in src/obsidian/writer.ts
- [X] T017 [US1] Implement atomic write using write-file-atomic with fsync in src/obsidian/writer.ts
- [X] T018 [US1] Implement file locking using proper-lockfile with 10s stale timeout in src/obsidian/writer.ts
- [X] T019 [US1] Add retry logic with exponential backoff for EBUSY/EPERM errors in src/obsidian/writer.ts
- [X] T020 [US1] Implement in-memory write queue (max 100 entries) with retry on vault availability in src/obsidian/writer.ts
- [X] T020a [US1] Implement fallback logging to /home/diana/logs/ when queue overflows or on crash in src/obsidian/writer.ts
- [X] T021 [US1] Add directory auto-creation (mkdir recursive) for /daily/ in src/obsidian/writer.ts

**Checkpoint**: User Story 1 complete - daily logging is fully functional and testable independently

---

## Phase 4: User Story 2 - Proposal Reasoning Documentation (Priority: P2)

**Goal**: Enable DIANA to document proposal reasoning with links to supporting observations

**Independent Test**: Have DIANA create a proposal, verify a proposal note exists with reasoning, confidence, and wikilinks to related observations

### Tests for User Story 2

- [X] T022 [P] [US2] Unit test for observation template generation in tests/unit/obsidian/templates.test.ts
- [X] T023 [P] [US2] Unit test for proposal template generation in tests/unit/obsidian/templates.test.ts
- [X] T024 [P] [US2] Unit test for writeObservation method in tests/unit/obsidian/writer.test.ts
- [X] T025 [P] [US2] Unit test for writeProposal method in tests/unit/obsidian/writer.test.ts
- [X] T026 [P] [US2] Integration test for proposal with linked observations in tests/integration/obsidian/vault-writes.test.ts

### Implementation for User Story 2

- [X] T027 [P] [US2] Create observation template with frontmatter (type, date, tags, subject, confidence) in src/obsidian/templates.ts
- [X] T028 [P] [US2] Create proposal template with frontmatter (type, date, tags, proposalId, status, confidence, action) in src/obsidian/templates.ts
- [X] T029 [US2] Implement writeObservation method in src/obsidian/writer.ts
- [X] T030 [US2] Implement writeProposal method in src/obsidian/writer.ts
- [X] T031 [US2] Add wikilink generation helper for [[note-path]] syntax in src/obsidian/templates.ts
- [X] T032 [US2] Add bidirectional link support (daily log references proposal, proposal references observations) in src/obsidian/templates.ts
- [X] T033 [US2] Add directory auto-creation for /observations/ and /proposals/ in src/obsidian/writer.ts

**Checkpoint**: User Stories 1 AND 2 both work independently

---

## Phase 5: User Story 3 - Browsable Notes for Human Review (Priority: P2)

**Goal**: Ensure all notes are properly formatted for Obsidian browsing with working links and searchable metadata

**Independent Test**: Open Obsidian, navigate through DIANA's vault, verify notes have proper formatting, working links, and are searchable by type/date/tags

### Tests for User Story 3

- [X] T034 [P] [US3] Unit test for system note template in tests/unit/obsidian/templates.test.ts
- [X] T035 [P] [US3] Unit test for frontmatter YAML validation in tests/unit/obsidian/frontmatter.test.ts
- [X] T036 [P] [US3] Integration test verifying note format compatibility in tests/integration/obsidian/vault-writes.test.ts

### Implementation for User Story 3

- [X] T037 [P] [US3] Create system note template with frontmatter (type, date, tags, category, severity) in src/obsidian/templates.ts
- [X] T038 [US3] Implement writeSystem method in src/obsidian/writer.ts
- [X] T039 [US3] Add frontmatter validation ensuring Obsidian YAML compatibility in src/obsidian/frontmatter.ts
- [X] T040 [US3] Ensure ISO 8601 date formatting for all timestamps using date-fns in src/obsidian/frontmatter.ts
- [X] T041 [US3] Add proper tag array formatting (plural 'tags:' field) in src/obsidian/frontmatter.ts
- [X] T042 [US3] Add directory auto-creation for /system/ in src/obsidian/writer.ts

**Checkpoint**: All note types browsable in Obsidian with working metadata

---

## Phase 6: User Story 4 - Index Maintenance (Priority: P3)

**Goal**: Maintain an auto-updating index with links to all notes organized by category

**Independent Test**: Create several notes across categories, verify index.md is automatically updated with links organized by category in reverse chronological order

### Tests for User Story 4

- [X] T043 [P] [US4] Unit test for index template generation in tests/unit/obsidian/templates.test.ts
- [X] T044 [P] [US4] Unit test for updateIndex method in tests/unit/obsidian/writer.test.ts
- [X] T045 [P] [US4] Integration test for index auto-update in tests/integration/obsidian/vault-writes.test.ts

### Implementation for User Story 4

- [X] T046 [P] [US4] Create index template with sections for Daily Logs, Observations, Proposals, System in src/obsidian/templates.ts
- [X] T047 [US4] Implement vault scanning to discover existing notes in src/obsidian/writer.ts
- [X] T048 [US4] Implement updateIndex method with reverse chronological sorting in src/obsidian/writer.ts
- [X] T049 [US4] Implement getVaultStats method returning note counts by type in src/obsidian/writer.ts
- [ ] T050 [US4] Add index update trigger after each note creation in src/obsidian/writer.ts

**Checkpoint**: All user stories functional with auto-updating index

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final integration, exports, and validation

- [X] T051 Create module exports (ObsidianWriter class) in src/obsidian/index.ts
- [X] T052 Implement isVaultAccessible method in src/obsidian/writer.ts
- [X] T053 [P] Unit tests for path resolution utilities in tests/unit/obsidian/paths.test.ts
- [X] T054 [P] Add error handling tests (vault unavailable, lock timeout) in tests/unit/obsidian/writer.test.ts
- [ ] T055 Run quickstart.md validation scenarios manually
- [ ] T056 Verify all acceptance scenarios from spec.md pass
- [X] T057 [P] Handle ENOSPC (disk full) error gracefully with fallback logging in src/obsidian/writer.ts
- [X] T058 [P] Add performance benchmark verifying SC-002 (write < 1s) and SC-006 (index update < 5s) in tests/integration/obsidian/performance.test.ts

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 (P1): Can proceed first as MVP
  - US2 (P2): Can start after Foundational, integrates with US1 via wikilinks
  - US3 (P2): Can start after Foundational, validates note format quality
  - US4 (P3): Can start after Foundational, requires notes to exist for index
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational - Uses wikilinks to US1 daily logs (dangling links OK)
- **User Story 3 (P2)**: Can start after Foundational - Validates format, no implementation dependencies
- **User Story 4 (P3)**: Can start after Foundational - Best run after US1-3 have created some notes

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Templates before writer methods
- Writer methods before integration
- Directory creation handled in each writer method
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**:
```
T003 (dev deps) ║ T004 (tsconfig)
```

**Phase 2 (Foundational)**:
```
T006 (errors) ║ T007 (paths) ║ T008 (frontmatter) ║ T010 (vitest)
```

**Phase 3 (US1 Tests)**:
```
T011 (template test) ║ T012 (writer test) ║ T013 (integration test)
```

**Phase 4 (US2 Tests)**:
```
T022 ║ T023 ║ T024 ║ T025 ║ T026
```

**Phase 4 (US2 Implementation)**:
```
T027 (observation template) ║ T028 (proposal template)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 - Daily Activity Logging
4. **STOP and VALIDATE**: Test daily log creation independently
5. Deploy/demo if ready - DIANA can now log activities

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → **MVP: Daily logging works**
3. Add User Story 2 → Test independently → **Proposals with reasoning documented**
4. Add User Story 3 → Test independently → **All notes Obsidian-compatible**
5. Add User Story 4 → Test independently → **Index auto-maintained**
6. Each story adds value without breaking previous stories

### File-to-Story Mapping

| File | Stories |
|------|---------|
| src/obsidian/writer.ts | US1, US2, US3, US4 |
| src/obsidian/templates.ts | US1, US2, US3, US4 |
| src/obsidian/frontmatter.ts | Foundational, US3 |
| src/obsidian/paths.ts | Foundational |
| src/obsidian/errors.ts | Foundational |
| src/types/obsidian.ts | Foundational |
| src/config/diana.config.ts | Foundational |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Dangling wikilinks are allowed per spec.md clarifications
- Vault path: `/mnt/c/Users/joshu/Obsidian/DIANA/DIANA_brain`
- Fallback log path: `/home/diana/logs/`
