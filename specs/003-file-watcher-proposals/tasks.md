# Tasks: File Watcher & Proposals

**Input**: Design documents from `/specs/003-file-watcher-proposals/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included per Constitution V requirement - destructive operations (file moves) require tests before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root (existing DIANA structure)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency setup

- [X] T001 Add chokidar ^4.0.0 dependency via npm install
- [X] T002 [P] Add pdf-parse ^1.1.1 as optional dependency via npm install
- [X] T003 [P] Create watcher module directory structure at src/watcher/
- [X] T004 [P] Create proposals module directory structure at src/proposals/
- [X] T005 [P] Create test directory structure at tests/unit/watcher/ and tests/unit/proposals/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types, persistence layer, and base service that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Core Types

- [X] T006 [P] Define Proposal types (ProposalAction, ProposalStatus, ConfidenceLevel, FileCategory) in src/proposals/proposal.types.ts
- [X] T007 [P] Define FileAnalysis and PdfMetadata types in src/types/watcher.ts
- [X] T008 [P] Define WatchedDirectory and WatcherConfig types in src/types/watcher.ts

### Persistence Layer

- [X] T009 Define StoreData and SerializedProposal interfaces in src/proposals/proposal.store.ts
- [X] T010 Implement ProposalStore class with load/save methods in src/proposals/proposal.store.ts
- [X] T011 Add atomic write support (temp file + rename) in src/proposals/proposal.store.ts

### Base Proposal Service

- [X] T012 Create ProposalService skeleton with EventEmitter in src/proposals/proposal.service.ts
- [X] T013 Implement ProposalService.initialize() to load from store in src/proposals/proposal.service.ts
- [X] T014 Implement ProposalService.shutdown() to save state in src/proposals/proposal.service.ts
- [X] T015 Implement ProposalService.createFromAnalysis() in src/proposals/proposal.service.ts
- [X] T016 [P] Implement query methods (getAll, getPending, getById, getBySourcePath) in src/proposals/proposal.service.ts
- [X] T017 [P] Implement hasPendingForPath() and isOnCooldown() in src/proposals/proposal.service.ts

### Module Exports

- [X] T018 [P] Create proposals module index with exports in src/proposals/index.ts
- [X] T019 [P] Create watcher types export in src/watcher/index.ts

### Configuration

- [X] T020 Extend diana.config.ts with WatcherConfig defaults in src/config/diana.config.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Review and Approve File Organization Proposals (Priority: P1) 🎯 MVP

**Goal**: Users can list, review, approve, reject, and batch-manage proposals through LLM tools

**Independent Test**: Pre-populate proposals.json and verify user can list, approve, and reject them via tools

### Tests for User Story 1 (Required per Constitution V) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**
> Per Constitution V: `ProposalService.approve()` executes file move - requires tests first

- [X] T021 [P] [US1] Unit test for ProposalStore load/save in tests/unit/proposals/proposal.store.test.ts
- [X] T022 [P] [US1] Unit test for ProposalService CRUD operations in tests/unit/proposals/proposal.service.test.ts
- [X] T023 [P] [US1] Unit test for ProposalService.approve() (mock file operations) in tests/unit/proposals/proposal.service.test.ts
- [X] T024 [P] [US1] Unit test for ProposalService.reject() with cooldown in tests/unit/proposals/proposal.service.test.ts
- [X] T025 [US1] Integration test for approval flow (file actually moves) in tests/integration/approval-flow.test.ts

### Implementation for User Story 1

- [X] T026 [US1] Implement ProposalService.approve() with file move execution in src/proposals/proposal.service.ts
- [X] T027 [US1] Implement ProposalService.reject() with cooldown management in src/proposals/proposal.service.ts
- [X] T028 [US1] Implement ProposalService.invalidate() in src/proposals/proposal.service.ts
- [X] T029 [US1] Implement ProposalService.clearAllPending() in src/proposals/proposal.service.ts
- [X] T030 [US1] Implement ProposalService.approveAll() batch operation in src/proposals/proposal.service.ts
- [X] T031 [US1] Add sensitive file confirmation logic to approve() in src/proposals/proposal.service.ts

### Proposal Tools for User Story 1

- [X] T032 [P] [US1] Implement list_proposals tool in src/agent/tools/watcher.ts
- [X] T033 [P] [US1] Implement approve_proposal tool in src/agent/tools/watcher.ts
- [X] T034 [P] [US1] Implement reject_proposal tool in src/agent/tools/watcher.ts
- [X] T035 [P] [US1] Implement approve_all_proposals tool in src/agent/tools/watcher.ts
- [X] T036 [P] [US1] Implement clear_all_proposals tool in src/agent/tools/watcher.ts
- [X] T037 [US1] Create registerProposalTools() function in src/agent/tools/watcher.ts

### Tool Registration

- [X] T038 [US1] Register proposal tools in Session initialization in src/agent/session.ts

**Checkpoint**: User Story 1 complete - users can manage proposals via chat. MVP functional.

---

## Phase 4: User Story 2 - Automatic File Detection and Analysis (Priority: P2)

**Goal**: System detects new files in watched directories, analyzes them, and creates proposals automatically

**Independent Test**: Add files to watched directory, verify proposals are created with appropriate analysis

### Tests for User Story 2

- [X] T039 [P] [US2] Unit test for pattern matching in tests/unit/watcher/patterns.test.ts
- [X] T040 [P] [US2] Unit test for FileAnalyzer in tests/unit/watcher/analyzer.test.ts
- [X] T041 [P] [US2] Unit test for DestinationResolver in tests/unit/watcher/destination.test.ts
- [X] T042 [US2] Integration test for file detection → proposal creation in tests/integration/watcher-flow.test.ts

### Pattern Matching

- [X] T043 [P] [US2] Define screenshot filename patterns in src/watcher/patterns.ts
- [X] T044 [P] [US2] Define financial document patterns (invoice, receipt, tax) in src/watcher/patterns.ts
- [X] T045 [P] [US2] Define installer patterns (.exe, .msi, .dmg, .deb) in src/watcher/patterns.ts
- [X] T046 [US2] Implement matchPatterns() function in src/watcher/patterns.ts
- [X] T047 [US2] Define sensitive file patterns in src/watcher/patterns.ts

### Extension Mapping

- [X] T048 [US2] Define EXTENSION_DEFAULTS lookup table in src/watcher/analyzer.ts
- [X] T049 [US2] Implement getExtensionCategory() function in src/watcher/analyzer.ts

### Content Analysis

- [X] T050 [US2] Implement extractTextContent() with 4KB limit in src/watcher/analyzer.ts
- [X] T051 [US2] Implement extractPdfMetadata() using pdf-parse (optional) in src/watcher/analyzer.ts
- [X] T052 [US2] Implement classifyOfficeFile() for xlsx/pptx/docx in src/watcher/analyzer.ts

### LLM Classification

- [X] T053 [US2] Define LLM classification prompt template in src/watcher/analyzer.ts
- [X] T054 [US2] Implement classifyWithLlm() using existing agent infrastructure in src/watcher/analyzer.ts

### FileAnalyzer

- [X] T055 [US2] Create FileAnalyzer class with layered analysis in src/watcher/analyzer.ts
- [X] T056 [US2] Implement analyze() orchestrating pattern → extension → content → LLM in src/watcher/analyzer.ts
- [X] T057 [US2] Implement checkSensitivity() in src/watcher/analyzer.ts

### Destination Resolution

- [X] T058 [US2] Define DEFAULT_DESTINATIONS map in src/watcher/destination.ts
- [X] T059 [US2] Implement isValidDestination() to prevent recursive proposals in src/watcher/destination.ts
- [X] T060 [US2] Implement DestinationResolver.resolve() in src/watcher/destination.ts
- [X] T061 [P] [US2] Implement category-specific resolvers (finances, screenshots, work, etc.) in src/watcher/destination.ts

### WatcherService

- [X] T062 [US2] Create WatcherService class with chokidar in src/watcher/watcher.service.ts
- [X] T063 [US2] Implement stability detection (3s delay) in src/watcher/watcher.service.ts
- [X] T064 [US2] Implement onFileStable() event emission in src/watcher/watcher.service.ts
- [X] T065 [US2] Wire WatcherService → FileAnalyzer → ProposalService pipeline in src/watcher/watcher.service.ts
- [X] T066 [US2] Implement ignored patterns filtering (.tmp, .part, dotfiles) in src/watcher/watcher.service.ts
- [X] T066a [US2] Implement debounce for rapid file changes (skip re-proposing if pending proposal exists) in src/watcher/watcher.service.ts

### Module Integration

- [X] T067 [US2] Update watcher module exports in src/watcher/index.ts
- [X] T068 [US2] Initialize WatcherService in DIANA startup sequence

**Checkpoint**: User Story 2 complete - files are automatically detected and proposals created

---

## Phase 5: User Story 3 - Configure Watched Directories (Priority: P3)

**Goal**: Users can add/remove watched directories and start/stop the watcher via tools

**Independent Test**: Add/remove directories from watch list, verify detection starts/stops accordingly

### Implementation for User Story 3

- [X] T069 [US3] Implement WatcherService.addDirectory() in src/watcher/watcher.service.ts
- [X] T070 [US3] Implement WatcherService.removeDirectory() in src/watcher/watcher.service.ts
- [X] T071 [US3] Implement WatcherService.start() in src/watcher/watcher.service.ts
- [X] T072 [US3] Implement WatcherService.stop() in src/watcher/watcher.service.ts
- [X] T073 [US3] Implement WatcherService.getWatchedDirectories() in src/watcher/watcher.service.ts

### Watcher Tools for User Story 3

- [X] T074 [P] [US3] Implement get_watched_directories tool in src/agent/tools/watcher.ts
- [X] T075 [P] [US3] Implement add_watched_directory tool in src/agent/tools/watcher.ts
- [X] T076 [P] [US3] Implement remove_watched_directory tool in src/agent/tools/watcher.ts
- [X] T077 [P] [US3] Implement start_watcher tool in src/agent/tools/watcher.ts
- [X] T078 [P] [US3] Implement stop_watcher tool in src/agent/tools/watcher.ts
- [X] T079 [US3] Add watcher tools to registerProposalTools() in src/agent/tools/watcher.ts

**Checkpoint**: User Story 3 complete - users can configure watcher via chat

---

## Phase 6: User Story 4 - Graceful Handling of Analysis Failures (Priority: P4)

**Goal**: System creates low-confidence proposals when analysis fails, with transparent reasoning

**Independent Test**: Introduce files that trigger analysis failures, verify low-confidence proposals are created

### Implementation for User Story 4

- [X] T080 [US4] Add error handling to extractTextContent() with fallback in src/watcher/analyzer.ts
- [X] T081 [US4] Add error handling to extractPdfMetadata() with fallback in src/watcher/analyzer.ts
- [X] T082 [US4] Handle permission denied errors in FileAnalyzer.analyze() in src/watcher/analyzer.ts
- [X] T083 [US4] Create low-confidence proposals when analysis fails in src/watcher/analyzer.ts
- [X] T084 [US4] Add transparent reasoning for analysis limitations in src/watcher/analyzer.ts
- [X] T085 [US4] Handle unknown file formats with extension-only analysis in src/watcher/analyzer.ts

**Checkpoint**: User Story 4 complete - system handles failures gracefully

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

### Obsidian Logging Integration

- [X] T086 Add Obsidian logging for proposal:approved events in src/proposals/proposal.service.ts
- [X] T087 Add Obsidian logging for proposal:rejected events in src/proposals/proposal.service.ts
- [X] T088 Add Obsidian logging for watcher start/stop events in src/watcher/watcher.service.ts

### Edge Case Handling

- [X] T089 Implement source file validation before approval (file still exists) in src/proposals/proposal.service.ts
- [X] T090 Implement destination conflict detection (file already exists) in src/proposals/proposal.service.ts
- [X] T091 Auto-invalidate proposals when source file is deleted in src/proposals/proposal.service.ts
- [X] T092 Handle large files (skip content analysis for files > 10MB) in src/watcher/analyzer.ts
- [X] T093 Create destination directories if they don't exist in src/proposals/proposal.service.ts

### Cleanup

- [X] T094 Implement cooldown expiration cleanup in ProposalStore in src/proposals/proposal.store.ts
- [X] T095 Implement proposal state persistence on SIGTERM in src/proposals/proposal.service.ts

### Validation

- [X] T096 Run quickstart.md scenarios to validate feature completeness
- [X] T097 Verify all acceptance criteria from spec.md are met

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational - MVP deliverable
- **User Story 2 (Phase 4)**: Depends on Foundational - requires ProposalService
- **User Story 3 (Phase 5)**: Depends on User Story 2 - requires WatcherService
- **User Story 4 (Phase 6)**: Depends on User Story 2 - extends FileAnalyzer
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories ✅
- **User Story 2 (P2)**: Can start after Foundational - Independent of US1 ✅
- **User Story 3 (P3)**: Requires US2 WatcherService to exist (but can stub it)
- **User Story 4 (P4)**: Requires US2 FileAnalyzer to exist

### Within Each User Story

- Tests MUST be written and FAIL before implementation (per Constitution V for destructive operations)
- Types before implementation
- Core logic before tools
- Tools before registration

### Parallel Opportunities

**Phase 1 (Setup)**:
```
T001 (chokidar) | T002 (pdf-parse) | T003 (watcher dir) | T004 (proposals dir) | T005 (test dirs)
```

**Phase 2 (Foundational)**:
```
T006 (Proposal types) | T007 (FileAnalysis types) | T008 (WatcherConfig types)
```

**Phase 3 (US1) - Tests**:
```
T021 (store test) | T022 (service test) | T023 (approve test) | T024 (reject test)
```

**Phase 3 (US1) - Tools**:
```
T032 (list) | T033 (approve) | T034 (reject) | T035 (approve_all) | T036 (clear_all)
```

**Phase 4 (US2) - Tests**:
```
T039 (patterns test) | T040 (analyzer test) | T041 (destination test)
```

**Phase 5 (US3) - Tools**:
```
T074 (get dirs) | T075 (add dir) | T076 (remove dir) | T077 (start) | T078 (stop)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (tests first per Constitution V)
4. **STOP and VALIDATE**: Test proposal management via chat
5. Deploy/demo - MVP functional without file watching

### Full Feature Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → **MVP deliverable**
3. Add User Story 2 → Test independently → Automatic detection enabled
4. Add User Story 3 → Test independently → Full configuration via chat
5. Add User Story 4 → Test independently → Graceful error handling
6. Complete Polish → Production ready

### Recommended Sequence

Since US2 provides the core file watching that makes the feature valuable, consider:
1. MVP: US1 (manual proposal management)
2. Core: US2 (automatic detection) - makes the feature actually useful
3. Enhancement: US3 + US4 (configuration + resilience)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Constitution V requires tests before `approve()` implementation (destructive file operations)
- All destinations must be OUTSIDE watched directories (prevents recursive proposals)
- Default base path: `/mnt/c/Users/joshu/Organized`
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
