# Data Model: Obsidian Rich Linking

**Feature**: 006-obsidian-rich-linking
**Date**: 2025-12-13
**Status**: Phase 1 Design

## Entity Overview

```
┌─────────────────┐     references      ┌─────────────────┐
│   VaultNote     │────────────────────▶│   VaultNote     │
│                 │◀────────────────────│                 │
└─────────────────┘    referencedBy     └─────────────────┘
        │
        │ contains
        ▼
┌─────────────────┐
│    WikiLink     │
└─────────────────┘

┌─────────────────┐     sourceNote      ┌─────────────────┐
│    KeyFact      │────────────────────▶│   VaultNote     │
└─────────────────┘                     │  (observation)  │
                                        └─────────────────┘

┌─────────────────┐     references      ┌─────────────────┐
│ ConversationAnchor├──────────────────▶│   VaultNote     │
└─────────────────┘                     └─────────────────┘

┌─────────────────┐     aggregates      ┌─────────────────┐
│   RollupNote    │────────────────────▶│   VaultNote     │
└─────────────────┘                     └─────────────────┘
```

---

## Entity Definitions

### 1. WikiLink

Represents a parsed wiki-link extracted from note content.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `raw` | string | Yes | Full original text (e.g., `[[path\|alias]]`) |
| `path` | string | Yes | Target note path without extension |
| `alias` | string | No | Display text (after `\|`) |
| `heading` | string | No | Target heading (after `#`) |
| `blockId` | string | No | Target block ID (after `^`) |
| `isEmbed` | boolean | Yes | Whether prefixed with `!` |

**Validation Rules:**
- `path` must be non-empty after trimming
- `path` must not contain newlines
- `path` must not contain invalid filesystem chars: `<>:"|?*`

**Source of Truth:** Content wiki-links are authoritative; frontmatter is derived.

---

### 2. NoteReferences (Frontmatter Extension)

Extended frontmatter fields for tracking relationships.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `references` | string[] | No | Outgoing links (paths this note links to) |
| `referencedBy` | string[] | No | Incoming links (paths that link to this note) |

**Validation Rules:**
- Arrays contain normalized vault-relative paths (without `.md`)
- No duplicates within each array
- Arrays are sorted alphabetically for deterministic output

**Example Frontmatter:**
```yaml
---
type: observation
date: 2025-12-13
tags: [diana, observation]
created: 2025-12-13T10:30:00
references:
  - daily/2025-12-13
  - observations/file-patterns
referencedBy:
  - proposals/organize-downloads
---
```

---

### 3. BacklinksSection

Auto-generated content section in note body.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `markerStart` | string | Yes | `<!-- DIANA-BACKLINKS:START -->` |
| `markerEnd` | string | Yes | `<!-- DIANA-BACKLINKS:END -->` |
| `heading` | string | Yes | `## Backlinks` |
| `links` | string[] | Yes | Sorted list of wiki-links |

**Placement:** Always at end of file content.

**Format:**
```markdown
<!-- DIANA-BACKLINKS:START -->
## Backlinks

- [[proposals/2025-12-13-organize-downloads]]
- [[daily/2025-12-13]]
<!-- DIANA-BACKLINKS:END -->
```

**State Transitions:**
- No backlinks → No section (markers removed)
- Has backlinks → Section present with markers
- User deletes markers → Section skipped (repair via CLI)

---

### 4. KeyFact (Extended)

Existing entity with new optional field for provenance.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string | Yes | Fact text |
| `tags` | string[] | Yes | Hashtags for categorization |
| `createdAt` | Date | Yes | When fact was learned |
| `sourceNote` | string | No | **NEW** - Wiki-link to source observation |

**Format with Provenance:**
```markdown
- User prefers dark mode (from [[observations/2025-12-13-ui-preferences]]) #preference
```

**Validation Rules:**
- `sourceNote` must be a valid vault path if provided
- Format: `(from [[path]])` appears before tags in serialized form

---

### 5. ConversationAnchor

Stub note bridging conversation JSON to vault.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Conversation UUID |
| `title` | string | Yes | LLM-generated title |
| `startedAt` | ISODateTime | Yes | Conversation start time |
| `messageCount` | number | Yes | Number of user+assistant messages |
| `referencedNotes` | string[] | Yes | Vault notes mentioned in conversation |
| `jsonPath` | string | Yes | Path to full conversation JSON |

**Frontmatter:**
```yaml
---
type: conversation-anchor
date: 2025-12-13
tags: [diana, conversation]
created: 2025-12-13T14:30:00
conversationId: 550e8400-e29b-41d4-a716-446655440000
messageCount: 12
references:
  - observations/file-patterns
  - proposals/organize-downloads
jsonPath: ~/.diana/conversations/550e8400-e29b-41d4-a716-446655440000.json
---
```

**Content:**
```markdown
# Conversation: Organizing download files

**Started**: 2025-12-13 14:30
**Messages**: 12

## Referenced Notes

- [[observations/file-patterns]]
- [[proposals/organize-downloads]]

## Full Conversation

See: `~/.diana/conversations/550e8400-e29b-41d4-a716-446655440000.json`
```

**File Location:** `conversations/{id}.md`

---

### 6. RollupNote

Periodic summary aggregating vault activity.

#### Weekly Rollup

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `'rollup'` | Yes | Note type |
| `period` | `'weekly'` | Yes | Period type |
| `week` | string | Yes | ISO week (e.g., `2025-W50`) |
| `year` | number | Yes | Year number |
| `weekNumber` | number | Yes | Week number (1-53) |
| `startDate` | ISODate | Yes | Monday of the week |
| `endDate` | ISODate | Yes | Sunday of the week |
| `stats` | RollupStats | Yes | Aggregated counts |

#### Monthly Rollup

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `'rollup'` | Yes | Note type |
| `period` | `'monthly'` | Yes | Period type |
| `month` | string | Yes | ISO month (e.g., `2025-12`) |
| `year` | number | Yes | Year number |
| `monthNumber` | number | Yes | Month number (1-12) |
| `startDate` | ISODate | Yes | First day of month |
| `endDate` | ISODate | Yes | Last day of month |
| `stats` | RollupStats | Yes | Aggregated counts |
| `weeks` | string[] | No | ISO weeks in this month |

#### RollupStats

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dailyLogs` | number | Yes | Count of daily log entries |
| `observations` | number | Yes | Count of observations |
| `proposals` | number | Yes | Total proposals |
| `proposalsApproved` | number | Yes | Approved proposals |
| `proposalsRejected` | number | Yes | Rejected proposals |
| `proposalsPending` | number | Yes | Pending proposals |
| `systemNotes` | number | Yes | Count of system notes |

**File Locations:**
- Weekly: `rollups/weekly/2025-W50.md`
- Monthly: `rollups/monthly/2025-12.md`

---

## Relationships

### Note References Graph

```
Source Note ──[references]──▶ Target Note
     │                              │
     │                              │
     └──────[referencedBy]◀─────────┘
```

**Invariants:**
1. If A.references contains B, then B.referencedBy contains A
2. Content wiki-links are source of truth for references
3. Frontmatter `references`/`referencedBy` are derived caches

### Backlink Update Flow

```
1. Note A created/updated with [[B]] link
2. LinkManager.extractOutgoingLinks(A.content) → [B]
3. ObsidianWriter.writeNote(A) with references: [B]
4. ObsidianWriter.updateBacklinks(B, add: A)
   └─ Read B
   └─ Add A to B.frontmatter.referencedBy
   └─ Update B.content backlinks section
   └─ Write B atomically
```

### Conversation Anchor Flow

```
1. Conversation references [[observations/X]], [[proposals/Y]]
2. ConversationStore.save() triggers anchor creation
3. ObsidianWriter.writeConversationAnchor({
     id, title, referencedNotes: [X, Y]
   })
4. Backlink updates: X.referencedBy += conversation, Y.referencedBy += conversation
```

---

## State Transitions

### BacklinksSection States

```
┌───────────────┐
│   No Section  │ ◀─── Initial state or zero backlinks
└───────┬───────┘
        │ First incoming link
        ▼
┌───────────────┐
│   Has Section │ ◀─── Markers + heading + links
└───────┬───────┘
        │ Last link removed
        ▼
┌───────────────┐
│   No Section  │ (markers removed)
└───────────────┘
```

### Migration States (per note)

```
┌─────────────┐    scan     ┌─────────────┐   update    ┌─────────────┐
│  Unscanned  │ ──────────▶ │   Scanned   │ ──────────▶ │  Migrated   │
└─────────────┘             └─────────────┘             └─────────────┘
                                   │
                                   │ corrupted frontmatter
                                   ▼
                            ┌─────────────┐
                            │   Skipped   │ (logged for manual review)
                            └─────────────┘
```

---

## Validation Rules Summary

| Entity | Rule | Error Handling |
|--------|------|----------------|
| WikiLink.path | Non-empty, no newlines, no invalid chars | Filter from results |
| references/referencedBy | No duplicates, sorted | Dedupe and sort on write |
| BacklinksSection | Markers present for update | Skip if markers deleted |
| ConversationAnchor | Valid conversation ID | Fail anchor creation |
| RollupNote.week | Valid ISO week format | Validation error |
| KeyFact.sourceNote | Valid vault path | Allow empty for legacy |

---

## Index Structures

### In-Memory Link Index (LinkManager)

```typescript
class LinkManager {
  // Forward index: source → targets
  private outgoing: Map<string, Set<string>>;

  // Reverse index: target → sources
  private incoming: Map<string, Set<string>>;

  // Methods
  extractOutgoingLinks(path: string, content: string): string[];
  getBacklinks(path: string): string[];
  updateIndex(path: string, newOutgoing: string[]): void;
  removeFromIndex(path: string): void;
}
```

### Backlink Queue (extends existing InMemoryWriteQueue)

```typescript
interface BacklinkUpdate {
  targetPath: string;
  sourcePath: string;
  action: 'add' | 'remove';
  retryCount: number;
  timestamp: ISODateTime;
}
```

---

## File System Layout

```
vault/
├── index.md
├── daily/
│   └── 2025-12-13.md
├── observations/
│   └── 2025-12-13-file-patterns.md    # Has references, referencedBy
├── proposals/
│   └── 2025-12-13-organize-downloads.md
├── system/
│   └── 2025-12-13-health.md
├── conversations/                      # NEW
│   └── 550e8400-uuid.md               # Conversation anchor
├── rollups/                           # NEW
│   ├── weekly/
│   │   └── 2025-W50.md
│   └── monthly/
│       └── 2025-12.md
└── memory/
    └── facts.md                       # Extended with sourceNote
```
