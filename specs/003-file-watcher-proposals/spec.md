# Feature Specification: File Watcher & Proposals

**Feature Branch**: `003-file-watcher-proposals`
**Created**: 2025-12-11
**Status**: Draft
**Input**: User description: "DIANA watches designated folders for new/changed files, analyzes them, and creates organization proposals that require human approval before execution."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Review and Approve File Organization Proposals (Priority: P1)

A user downloads several files throughout their workday. Later, they ask DIANA "what proposals do you have?" DIANA presents pending organization proposals with clear reasoning. The user reviews each proposal and decides to approve, reject, or skip for later review.

**Why this priority**: This is the core interaction loop - without the ability to review and act on proposals, the entire feature has no value. Human-in-the-loop approval is the foundation of the system.

**Independent Test**: Can be tested by pre-populating proposals and verifying the user can list, approve, and reject them. Delivers immediate value by giving users control over file organization.

**Acceptance Scenarios**:

1. **Given** pending proposals exist, **When** user asks to see proposals, **Then** system displays all pending proposals with source file, suggested destination, and reasoning
2. **Given** a pending proposal, **When** user approves it, **Then** the file is moved/renamed as proposed and the proposal is removed from the queue
3. **Given** a pending proposal, **When** user rejects it, **Then** the proposal is removed from the queue and no file operation occurs
4. **Given** multiple pending proposals, **When** user requests batch approval, **Then** all pending proposals are executed in sequence
5. **Given** multiple pending proposals, **When** user requests to clear all, **Then** all proposals are removed without any file operations

---

### User Story 2 - Automatic File Detection and Analysis (Priority: P2)

A user saves a file to their Downloads folder. The system automatically detects the new file, analyzes its characteristics (name, extension, size, content preview for text/PDF files), and generates an organization proposal based on learned heuristics.

**Why this priority**: Detection and analysis must happen before proposals can exist. This enables the passive, background operation that makes DIANA useful without constant user intervention.

**Independent Test**: Can be tested by adding files to watched directories and verifying proposals are created with appropriate analysis. Delivers value by automatically identifying organization opportunities.

**Acceptance Scenarios**:

1. **Given** the watcher is running on Downloads folder, **When** a new file is created, **Then** the system detects it within 30 seconds of file stability
2. **Given** a new file is detected, **When** the system analyzes it, **Then** a proposal is created with source path, suggested destination, action type, reasoning, and confidence level
3. **Given** a PDF invoice file is detected, **When** analyzed, **Then** the proposal suggests moving to a finances/documents location with reasoning referencing the invoice nature
4. **Given** a screenshot file is detected (based on filename pattern), **When** analyzed, **Then** the proposal suggests moving to a screenshots location
5. **Given** an executable/installer is detected, **When** analyzed, **Then** the proposal suggests organizing to an installers location or flags for potential deletion review

---

### User Story 3 - Configure Watched Directories (Priority: P3)

A user wants to add their project folder to DIANA's watch list, or temporarily stop watching the Downloads folder during a large download session.

**Why this priority**: Configuration flexibility is important for long-term usability but not required for initial functionality. The core use case works with pre-configured directories.

**Independent Test**: Can be tested by adding/removing directories from the watch list and verifying detection starts/stops accordingly. Delivers value by allowing customization to user workflow.

**Acceptance Scenarios**:

1. **Given** the watcher is running, **When** user adds a new directory to watch, **Then** the system begins monitoring that directory for changes
2. **Given** a directory is being watched, **When** user removes it from the watch list, **Then** the system stops monitoring that directory
3. **Given** the watcher is running, **When** user requests to stop the watcher, **Then** all directory monitoring pauses
4. **Given** the watcher is stopped, **When** user requests to start the watcher, **Then** monitoring resumes for all configured directories

---

### User Story 4 - Graceful Handling of Analysis Failures (Priority: P4)

The system encounters a file it cannot fully analyze (corrupted, unknown format, permission denied). Instead of failing silently, it creates a low-confidence proposal with transparent reasoning about what could and couldn't be determined.

**Why this priority**: Error resilience ensures the system remains useful even when individual files are problematic. This aligns with the graceful degradation principle.

**Independent Test**: Can be tested by introducing files that trigger analysis failures and verifying low-confidence proposals are created. Delivers value by maintaining system reliability.

**Acceptance Scenarios**:

1. **Given** a file cannot be read due to permissions, **When** analysis runs, **Then** a low-confidence proposal is created explaining the limitation
2. **Given** a file has an unknown format, **When** analysis runs, **Then** a proposal is created based on filename and extension only, marked as low confidence
3. **Given** content analysis fails for a text file, **When** analysis runs, **Then** a proposal is created using available metadata with transparent reasoning

---

### Edge Cases

- What happens when a file is moved/deleted before approval? The system should detect this and mark the proposal as invalid or auto-remove it.
- What happens when the destination directory doesn't exist? The system should create intermediate directories as needed or flag the issue in the proposal.
- What happens with very large files? Analysis should not block on file size; use metadata-only analysis for files above 10MB.
- What happens with files that are still being written? The system should wait for file stability (no modifications for 3 seconds) before analyzing.
- What happens when the same file is modified multiple times quickly? The system should debounce rapid changes to avoid duplicate proposals.
- What happens when a proposed destination already has a file with the same name? The proposal should include conflict resolution strategy (rename with numeric suffix like `filename (1).ext`, skip, or prompt user).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST monitor configured directories for new and modified files
- **FR-002**: System MUST detect file changes within a reasonable time after they occur (not immediately, to allow for file stability)
- **FR-003**: System MUST analyze detected files using available metadata (filename, extension, size, modification date)
- **FR-004**: System MUST preview content of text-based files and PDFs when possible to improve classification
- **FR-004a**: System MUST use a hybrid classification approach: rule-based pattern matching for obvious file types (screenshots, installers, known extensions), with LLM analysis (Qwen3) for uncertain or complex files
- **FR-005**: System MUST generate organization proposals with source path, proposed action, destination, reasoning, and confidence level
- **FR-006**: System MUST persist proposals so they survive system restarts
- **FR-007**: System MUST provide a way to list all pending proposals
- **FR-008**: System MUST execute approved proposals by performing the file operation (move, rename, or both)
- **FR-009**: System MUST remove rejected proposals without performing any file operation
- **FR-010**: System MUST support batch approval of all pending proposals
- **FR-011**: System MUST support clearing all pending proposals without execution
- **FR-012**: System MUST NEVER move or rename files without explicit user approval (human-in-the-loop)
- **FR-013**: System MUST provide clear reasoning in each proposal explaining why the destination was suggested
- **FR-014**: System MUST assign a confidence level (low, medium, high) to each proposal based on analysis certainty
- **FR-015**: System MUST allow users to start and stop the file watcher
- **FR-016**: System MUST allow users to add and remove directories from the watch list
- **FR-017**: System MUST handle file analysis failures gracefully by creating low-confidence proposals with transparent reasoning
- **FR-018**: System MUST debounce rapid file changes to avoid duplicate proposals for the same file
- **FR-019**: System MUST validate that source files still exist before executing approved proposals
- **FR-020**: System MUST detect potentially sensitive files (tax documents, password files, personal records) and flag proposals as "sensitive"
- **FR-021**: System MUST require extra confirmation before approving proposals flagged as sensitive
- **FR-022**: System MUST log all proposal approval and rejection actions to the Obsidian journal with timestamps, source file, destination, and action taken

### Key Entities

- **Proposal**: Represents a suggested file organization action. Contains unique identifier, creation timestamp, source file path, proposed action type (move/rename/move_and_rename), destination path, human-readable reasoning, confidence level, sensitivity flag (boolean), and status (pending/executed/rejected/invalid).
- **WatchedDirectory**: A directory path configured for monitoring. Contains the path and enabled/disabled state.
- **FileAnalysis**: The result of analyzing a detected file. Contains extracted metadata, content hints (if available), detected patterns, and suggested classification.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can review all pending proposals in a single conversational interaction
- **SC-002**: 95% of file operations from approved proposals complete successfully without user intervention
- **SC-003**: Proposals include actionable reasoning that users can understand without technical knowledge
- **SC-004**: System detects new files and generates proposals within 30 seconds of file stability
- **SC-005**: Users can approve or reject a proposal with a single command/action
- **SC-006**: System correctly categorizes common file types (invoices, screenshots, installers, documents) with medium or high confidence at least 80% of the time
- **SC-007**: No files are ever moved or modified without explicit user approval (100% human-in-the-loop compliance)
- **SC-008**: System maintains proposal state across restarts without data loss
- **SC-009**: Users can fully configure watched directories without editing configuration files directly
- **SC-010**: All proposal actions (approvals/rejections) are logged to Obsidian journal with complete audit trail

## Clarifications

### Session 2025-12-11

- Q: Should file classification use LLM, rules, or hybrid approach? → A: Hybrid - rule-based for obvious patterns (screenshots, installers, known extensions), LLM (Qwen3) for uncertain or complex files requiring content analysis.
- Q: How should the system handle potentially sensitive files? → A: Create proposals but flag as "sensitive" with extra confirmation prompt before approval.
- Q: Should proposal approvals/rejections be logged? → A: Yes, log all approval/rejection actions with timestamps to Obsidian journal for transparency and audit trail.

## Assumptions

- The default watched directories are `/mnt/c/Users/joshu/Downloads` and `/mnt/c/Users/joshu/Documents`
- File stability detection uses a short delay (e.g., file unchanged for 2-3 seconds) before analysis
- Standard file categorization heuristics include:
  - Files with "invoice", "receipt", or financial keywords → Finances category
  - Files matching screenshot patterns (e.g., "Screenshot", date-based names from OS) → Screenshots category
  - Executable files (.exe, .msi, .dmg, .deb) → Installers category
  - Documents are classified by detected project names when possible
- Proposal storage location is configurable but defaults to a reasonable persistent location
- The system batches file analysis to avoid excessive resource usage during bulk file operations
- Content preview for text/PDF files is limited to a reasonable size to maintain performance
