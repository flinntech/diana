# Feature Specification: Obsidian Rich Linking

**Feature Branch**: `006-obsidian-rich-linking`
**Created**: 2025-12-13
**Status**: Draft
**Input**: Transform DIANA's Obsidian vault from one-way notes into a bidirectional knowledge graph with auto-maintained backlinks, fact provenance, conversation anchors, and rollup notes.

## User Scenarios & Testing

### User Story 1 - Auto-Maintained Backlinks (Priority: P1)

When DIANA creates notes that reference other notes, the referenced notes should automatically know about these incoming links. Users can navigate the knowledge graph bidirectionally, seeing both what a note links to and what links to it.

**Why this priority**: This is the foundational capability that enables all other rich linking features. Without bidirectional link tracking, the Obsidian vault remains a collection of one-way references rather than an interconnected knowledge graph.

**Independent Test**: Can be fully tested by creating an observation that links to another note, then verifying the target note's frontmatter contains `referencedBy` and a "Backlinks" section appears in its content.

**Acceptance Scenarios**:

1. **Given** an existing observation note "patterns.md", **When** DIANA creates a proposal that links to `[[observations/patterns]]`, **Then** the patterns.md note is updated with `referencedBy: ["proposals/new-proposal"]` in frontmatter and a "## Backlinks" section listing the proposal.

2. **Given** a note with existing backlinks, **When** DIANA creates another note linking to it, **Then** the new reference is appended to the existing `referencedBy` array and Backlinks section without duplicates.

3. **Given** a note A that links to note B, **When** note A is updated to remove the link to B, **Then** B's `referencedBy` array and Backlinks section are updated to remove the reference to A.

4. **Given** two concurrent write operations both linking to the same target note, **When** both writes complete, **Then** both references appear in the target's backlinks without data corruption.

---

### User Story 2 - Fact Provenance (Priority: P2)

When DIANA records facts about user preferences or learned information, users can trace where each fact originated. Facts link back to the observations that established them, providing transparency into DIANA's reasoning.

**Why this priority**: Fact provenance builds trust by making DIANA's knowledge traceable. Users can verify and correct facts by examining their source observations.

**Independent Test**: Can be fully tested by having DIANA save a fact with a source observation link, then verifying the fact entry in memory includes the wiki-link to its source.

**Acceptance Scenarios**:

1. **Given** DIANA learns a user preference from a conversation, **When** the fact is saved to memory, **Then** the fact entry includes a link to the source observation (e.g., "User prefers dark mode (from [[observations/2025-12-13-ui-preferences]])").

2. **Given** a fact with a source link exists, **When** the user views the memory/facts file in Obsidian, **Then** clicking the source link navigates to the observation that established the fact.

3. **Given** the source observation has backlinks enabled, **When** a fact references it, **Then** the observation's Backlinks section lists the memory entry.

---

### User Story 3 - Conversation Anchors (Priority: P3)

When conversations reference vault notes (observations, proposals), a lightweight stub note is created in the vault that bridges the conversation history to the knowledge graph. Users can discover related conversations from within Obsidian.

**Why this priority**: Conversation anchors create continuity between DIANA's chat interactions and the persistent knowledge graph. Without them, valuable context from conversations is disconnected from the vault.

**Independent Test**: Can be fully tested by having a conversation that references an observation, then verifying a conversation anchor note is created in the vault with links to the referenced notes.

**Acceptance Scenarios**:

1. **Given** a conversation where DIANA references `[[observations/file-patterns]]`, **When** the conversation is saved, **Then** a stub note is created at `conversations/{conversation-id}.md` containing links to all referenced vault notes.

2. **Given** a conversation anchor exists, **When** viewing the referenced observation in Obsidian, **Then** the observation's Backlinks section includes a link to the conversation anchor.

3. **Given** a conversation anchor note, **When** the user opens it in Obsidian, **Then** they see conversation metadata (title, message count, date) and a reference to the full conversation JSON location.

---

### User Story 4 - Knowledge Rollup Notes (Priority: P4)

DIANA periodically generates summary notes showing knowledge evolution over time. Weekly and monthly rollups aggregate observations, proposals, and their outcomes, helping users understand how DIANA's understanding has grown.

**Why this priority**: Rollup notes provide high-level visibility into DIANA's activity and the evolution of the knowledge graph. This is valuable but not essential for core functionality.

**Independent Test**: Can be fully tested by having DIANA generate a weekly rollup for a period with existing notes, then verifying the rollup contains accurate statistics and links to the relevant notes.

**Acceptance Scenarios**:

1. **Given** 5 observations and 3 proposals created in a week, **When** a weekly rollup is generated, **Then** the rollup note shows counts (5 observations, 3 proposals) and links to each note.

2. **Given** proposals with different statuses (approved, rejected, pending), **When** a rollup is generated, **Then** the rollup shows status breakdown (e.g., "2 approved, 1 rejected").

3. **Given** a rollup generation request, **When** executed via command or schedule, **Then** the rollup is created at `rollups/{period}.md` (e.g., `rollups/2025-W50.md` for weekly).

4. **Given** notes referenced in a rollup, **When** viewing those notes in Obsidian, **Then** their Backlinks sections include the rollup note.

---

### Edge Cases

- What happens when a note links to a non-existent note (dangling link)?
  - The system should not create the target note, but should track the reference for when the target is eventually created.

- How does the system handle circular references (A links to B, B links to A)?
  - Both notes should have the other in their `referencedBy` arrays; the system must avoid infinite loops during updates.

- What happens if the vault becomes inaccessible during a backlink update?
  - The write queue mechanism (existing) should queue the backlink update for retry; the source note write should still succeed.

- How does migration handle notes with existing manual "Backlinks" sections?
  - Migration should merge with existing sections, avoiding duplicates, and preserve user-added content.

## Requirements

### Functional Requirements

- **FR-001**: System MUST track outgoing links (`references`) in note frontmatter when notes are created or updated.
- **FR-002**: System MUST track incoming links (`referencedBy`) in target note frontmatter when references are created.
- **FR-003**: System MUST auto-generate a "## Backlinks" section in notes that have incoming links.
- **FR-004**: System MUST update backlinks atomically to prevent corruption during concurrent writes.
- **FR-005**: System MUST remove backlink references when the source note no longer links to the target.
- **FR-006**: System MUST support extracting wiki-links from note content in `[[path]]` and `[[path|display]]` formats.
- **FR-007**: Facts MUST include optional `sourceNote` field linking to the observation that established the fact.
- **FR-008**: System MUST create conversation anchor notes when conversations reference vault notes.
- **FR-009**: System MUST generate weekly rollup notes summarizing observations, proposals, and their statuses.
- **FR-010**: System MUST generate monthly rollup notes with period statistics and links.
- **FR-011**: System MUST provide a migration utility to add backlink tracking to existing vault notes.
- **FR-012**: LLM tools MUST expose `relatedNotes` parameter for creating linked observations and daily notes.
- **FR-013**: System MUST provide a tool for querying related notes (incoming, outgoing, or both directions).

### Key Entities

- **Note Reference**: A directional link from one note to another, tracked in both source (`references`) and target (`referencedBy`) frontmatter.
- **Backlinks Section**: An auto-maintained markdown section listing all notes that reference the current note.
- **Conversation Anchor**: A lightweight stub note bridging conversation storage (JSON) to the Obsidian vault.
- **Rollup Note**: A periodic summary note aggregating vault activity with statistics and links.
- **Key Fact**: A learned user preference or information with optional provenance link to source observation.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can navigate from any note to all notes that reference it within 1 click (via Backlinks section).
- **SC-002**: 100% of newly created notes that contain wiki-links have corresponding backlinks in target notes within the same write operation.
- **SC-003**: Users can trace any fact to its source observation via a single link click.
- **SC-004**: Concurrent write operations (up to 10 simultaneous) complete without data corruption in backlink tracking.
- **SC-005**: Weekly rollup notes accurately reflect 100% of observations and proposals created in that period.
- **SC-006**: Migration utility processes existing vaults and adds backlink tracking without data loss (verified via dry-run mode).
- **SC-007**: Conversation anchors are created for 100% of conversations that reference vault notes.

## Assumptions

- The existing Obsidian vault structure (daily/, observations/, proposals/, system/) is maintained.
- The existing atomic write and file locking mechanisms (write-file-atomic, proper-lockfile) will be reused for backlink updates.
- Conversation persistence (Feature 005) is complete and provides conversation metadata including referenced notes.
- Users access the vault primarily through Obsidian, which natively supports wiki-link navigation.
- Rollup generation can be triggered manually or via scheduled task; automatic scheduling is out of scope for initial implementation.
