# Feature Specification: Obsidian Integration - DIANA's Memory & Notes

**Feature Branch**: `001-obsidian-integration`
**Created**: 2025-12-10
**Status**: Draft
**Input**: User description: "DIANA needs the ability to write structured notes to her Obsidian vault for recording observations, reasoning, and activity logs in human-readable Markdown format."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Daily Activity Logging (Priority: P1)

As DIANA, I need to write daily activity logs so my observations are recorded chronologically and Josh can review what I've been doing throughout the day.

**Why this priority**: This is the foundational capability - without daily logging, DIANA has no persistent memory. All other note types build upon this core functionality.

**Independent Test**: Can be fully tested by triggering DIANA to log an activity and verifying a properly formatted daily log file appears in the vault with correct date, timestamp, and content.

**Acceptance Scenarios**:

1. **Given** DIANA observes a file change, **When** she records the observation, **Then** an entry is appended to today's daily log with ISO 8601 timestamp and activity details
2. **Given** no daily log exists for today, **When** DIANA records her first activity, **Then** a new daily log file is created with proper frontmatter and the entry is added
3. **Given** a daily log already exists, **When** DIANA records another activity, **Then** the new entry is appended without corrupting existing content

---

### User Story 2 - Proposal Reasoning Documentation (Priority: P2)

As DIANA, I need to record my reasoning when I make proposals so Josh can understand WHY I suggested something, not just what I suggested.

**Why this priority**: Understanding DIANA's reasoning is critical for Josh to trust and correct her decisions. This enables the human-in-the-loop pattern that defines DIANA's behavior.

**Independent Test**: Can be fully tested by having DIANA create a proposal, then verifying a corresponding proposal note exists with reasoning, context, and links to related daily log entries.

**Acceptance Scenarios**:

1. **Given** DIANA generates a file organization proposal, **When** she saves the proposal, **Then** a proposal note is created in `/proposals/` with reasoning, confidence level, and supporting observations
2. **Given** DIANA references previous observations in her reasoning, **When** the proposal note is created, **Then** it contains [[wikilinks]] to the relevant observation notes
3. **Given** a proposal is linked to a daily log entry, **When** Josh views either note, **Then** bidirectional links allow navigation between them

---

### User Story 3 - Browsable Notes for Human Review (Priority: P2)

As Josh, I want to browse DIANA's notes in Obsidian so I can understand her thought process and correct any misunderstandings she may have developed.

**Why this priority**: Equal to proposal reasoning - Josh needs to be able to review and course-correct DIANA's thinking for the system to improve over time.

**Independent Test**: Can be fully tested by opening Obsidian, navigating through DIANA's vault using the index, and verifying notes are properly formatted with working links and readable content.

**Acceptance Scenarios**:

1. **Given** DIANA has written multiple notes across categories, **When** Josh opens the index.md, **Then** he sees an organized map of content with links to all note categories
2. **Given** notes contain wikilinks, **When** Josh clicks a link in Obsidian, **Then** he navigates to the referenced note
3. **Given** notes have frontmatter metadata, **When** Josh uses Obsidian's search or filter features, **Then** notes are findable by type, date, and tags

---

### User Story 4 - Index Maintenance (Priority: P3)

As DIANA, I need to maintain an index so my notes stay organized and discoverable as the vault grows.

**Why this priority**: Important for long-term usability but the system works without it initially. Can be added after core logging is functional.

**Independent Test**: Can be fully tested by creating several notes across categories, then verifying the index.md is automatically updated with links to new content organized by category.

**Acceptance Scenarios**:

1. **Given** DIANA creates a new note, **When** the note is saved, **Then** the index.md is updated to include a link to the new note under the appropriate category
2. **Given** the index contains multiple categories, **When** Josh views index.md, **Then** he sees sections for Daily Logs, Observations, Proposals, and System notes
3. **Given** notes exist in a category, **When** viewing that section in the index, **Then** notes are listed in reverse chronological order (newest first)

---

### Edge Cases

- What happens when the vault path is inaccessible (network drive unavailable, permissions changed)?
- Concurrent writes use file locking with 10-second retry timeout, then queue
- If a note is corrupted or deleted, DIANA recreates from scratch (no backup/recovery)
- How does the system behave when disk space is exhausted?
- Dangling wikilinks are allowed (Obsidian renders them as clickable placeholders)
- Activity descriptions have no length limit (unlimited length allowed)

## Clarifications

### Session 2025-12-10

- Q: How are very long activity descriptions handled? → A: Allow unlimited length - no truncation
- Q: What happens if a wikilink references a note that doesn't exist yet? → A: Allow dangling links - Obsidian handles gracefully
- Q: How is the write queue persisted when vault is unavailable? → A: Memory-only queue (fallback log captures on crash)
- Q: What happens if a note file is corrupted or manually deleted? → A: Recreate from scratch - no recovery attempt
- Q: How are concurrent write attempts to the same file handled? → A: File locking with 10s retry, then queue

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST write all notes to the configured vault path at `/mnt/c/Users/joshu/Obsidian/DIANA/DIANA_brain`
- **FR-002**: System MUST create daily log files at `/daily/YYYY-MM-DD.md` using the current date
- **FR-003**: System MUST include YAML frontmatter in every note with `type`, `date`, and `tags` fields
- **FR-004**: System MUST format all timestamps in ISO 8601 format (e.g., `2025-12-10T14:30:00`)
- **FR-005**: System MUST use atomic file operations to prevent partial/corrupted writes
- **FR-006**: System MUST create observation notes in `/observations/` directory
- **FR-007**: System MUST create proposal reasoning notes in `/proposals/` directory
- **FR-008**: System MUST create system status notes in `/system/` directory
- **FR-009**: System MUST maintain an index at `/index.md` with links to all note categories
- **FR-010**: System MUST use [[wikilink]] syntax for cross-references between notes
- **FR-011**: System MUST gracefully handle vault path unavailability without crashing
- **FR-012**: System MUST queue writes in memory when vault is temporarily unavailable and retry when accessible (queue not persisted across restarts; fallback log captures data on crash)
- **FR-013**: System MUST log errors to a fallback location when primary vault is inaccessible
- **FR-014**: System MUST create parent directories if they don't exist when writing notes
- **FR-015**: System MUST preserve existing note content when appending to daily logs
- **FR-016**: System MUST use file locking for concurrent write protection with 10-second retry timeout before queueing

### Key Entities

- **Daily Log**: A chronological record of DIANA's activities for a single day. Contains timestamped entries, links to related notes. One file per day.
- **Observation**: A note capturing DIANA's learnings about files, patterns, or user behavior. May be referenced by proposals and daily logs.
- **Proposal Note**: Detailed documentation of DIANA's reasoning for a specific proposal, including context, confidence level, and supporting evidence.
- **System Note**: Technical status information including health checks, configuration changes, and error logs.
- **Index**: The master navigation document (`index.md`) linking to all other notes, organized by category.
- **Frontmatter**: YAML metadata block at the top of each note containing type, date, tags, and optional additional fields.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of notes written by DIANA are recoverable and uncorrupted after system restart
- **SC-002**: Daily logs are created within 1 second of DIANA's first activity each day
- **SC-003**: Notes are fully browsable in Obsidian with all wikilinks resolving correctly
- **SC-004**: Josh can locate any note by type, date, or content within 30 seconds using Obsidian's native features
- **SC-005**: System recovers gracefully from vault unavailability, with zero data loss for activities during outage
- **SC-006**: Index stays current, reflecting new notes within 5 seconds of creation
- **SC-007**: All frontmatter validates correctly against Obsidian's YAML parser

## Assumptions

- Obsidian is installed and configured on the host system
- The vault path `/mnt/c/Users/joshu/Obsidian/DIANA/DIANA_brain` exists and is writable by DIANA's process
- Josh has basic familiarity with Obsidian's interface and wikilink navigation
- The system runs on a machine with WSL access to Windows file paths
- Note content will be primarily in English
- Daily logs will contain moderate volume (tens to hundreds of entries per day, not thousands)
- Obsidian's file sync (if any) will not conflict with DIANA's writes

## Dependencies

- This feature is foundational - other features (file watching, proposals system) will depend on it for logging
- Requires file system access to the configured vault path
- Requires a functioning local file system for fallback error logging

## Out of Scope

- Reading existing notes from the vault (future feature)
- Obsidian plugin development
- Syncing notes across devices
- Real-time collaboration features
- Note encryption or access control
- Automatic note cleanup or archival
