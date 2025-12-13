# Quickstart: Obsidian Rich Linking

**Feature**: 006-obsidian-rich-linking
**Date**: 2025-12-13

## Overview

This feature transforms DIANA's Obsidian vault from one-way notes into a bidirectional knowledge graph. After implementation, notes will automatically track both outgoing links (what they reference) and incoming links (what references them).

## Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| LinkManager | `src/obsidian/link-manager.ts` | Wiki-link extraction and in-memory tracking |
| RollupGenerator | `src/obsidian/rollup-generator.ts` | Weekly/monthly summary generation |
| ObsidianWriter (ext) | `src/obsidian/writer.ts` | Extended with backlink update methods |
| Vault CLI | `src/cli/vault.ts` | Migration, validation, rollup commands |

## Usage Examples

### Automatic Backlink Updates

When DIANA creates a note with wiki-links, backlinks are automatically updated:

```typescript
// Creating an observation that references another note
await writer.writeObservation({
  title: 'User prefers dark mode',
  context: 'Learned from conversation',
  details: 'User mentioned preferring dark mode for UI',
  relatedNotes: ['observations/ui-preferences']  // NEW parameter
});

// Result: observations/ui-preferences.md now has:
// - referencedBy: ['observations/2025-12-13-user-prefers-dark-mode'] in frontmatter
// - ## Backlinks section with link back
```

### Querying Related Notes

```typescript
// Get all notes that reference a specific note
const linkManager = new LinkManager();
const backlinks = linkManager.getBacklinks('observations/file-patterns');
// Returns: ['proposals/organize-downloads', 'daily/2025-12-13']
```

### CLI Commands

```bash
# Migrate existing vault (add backlink tracking)
diana vault migrate --dry-run  # Preview changes
diana vault migrate            # Apply migration

# Validate backlinks (find orphaned references)
diana vault validate
diana vault validate --repair  # Fix orphaned backlinks

# Generate rollup notes
diana vault rollup --weekly                    # Current week
diana vault rollup --monthly                   # Current month
diana vault rollup --weekly --date 2025-12-01  # Specific week
```

### LLM Tools

New tool for querying related notes:

```typescript
// Tool: diana_query_related_notes
const result = await tools.diana_query_related_notes({
  path: 'observations/file-patterns',
  direction: 'both'  // 'incoming', 'outgoing', or 'both'
});
// Returns:
// {
//   incoming: ['proposals/organize-downloads'],
//   outgoing: ['daily/2025-12-13']
// }
```

Extended observation tool with relatedNotes:

```typescript
// Tool: diana_create_observation
await tools.diana_create_observation({
  title: 'New pattern detected',
  context: 'File analysis',
  details: 'Found recurring download pattern',
  relatedNotes: ['observations/file-patterns']  // Creates bidirectional link
});
```

## Data Flow

### Note Creation with Links

```
1. User/LLM creates note with [[wikilinks]]
2. ObsidianWriter.writeObservation() called
3. LinkManager.extractOutgoingLinks() parses content
4. Note written with `references` in frontmatter
5. For each referenced note:
   a. Lock target file
   b. Add source to `referencedBy` frontmatter
   c. Update ## Backlinks section
   d. Write atomically
6. On failure: queue backlink update for retry
```

### Rollup Generation

```
1. diana vault rollup --weekly triggered
2. RollupGenerator.generateWeekly(date) called
3. Scan vault for notes in date range
4. Aggregate statistics by type and status
5. Generate rollup note with links to all notes
6. Write to rollups/weekly/2025-W50.md
7. Update backlinks for all referenced notes
```

## File Structure Changes

**Existing note with backlinks:**

```markdown
---
type: observation
date: 2025-12-13
tags: [diana, observation]
created: 2025-12-13T10:30:00
references:
  - daily/2025-12-13
referencedBy:
  - proposals/organize-downloads
  - rollups/weekly/2025-W50
---

# Observation: File organization patterns

## Context
...

## Details
...

<!-- DIANA-BACKLINKS:START -->
## Backlinks

- [[proposals/organize-downloads]]
- [[rollups/weekly/2025-W50]]
<!-- DIANA-BACKLINKS:END -->
```

**New rollup note:**

```markdown
---
type: rollup
period: weekly
week: 2025-W50
year: 2025
weekNumber: 50
startDate: 2025-12-08
endDate: 2025-12-14
date: 2025-12-08
tags: [diana, rollup, weekly]
created: 2025-12-15T00:00:00
stats:
  dailyLogs: 7
  observations: 3
  proposals: 2
  proposalsApproved: 1
  proposalsRejected: 0
  proposalsPending: 1
  systemNotes: 1
---

# Week 50 - 2025

## Summary
This week: 7 daily logs, 3 observations, 2 proposals (1 approved, 1 pending).

## Observations
- [[observations/2025-12-10-file-patterns]]
- [[observations/2025-12-12-user-preferences]]

## Proposals
### Approved
- [[proposals/2025-12-09-organize-downloads]]
### Pending
- [[proposals/2025-12-12-archive-logs]]
```

## Testing Strategy

### Unit Tests

```typescript
// tests/unit/obsidian/link-manager.test.ts

describe('LinkManager', () => {
  describe('extractWikiLinks', () => {
    it('extracts basic wiki-links', () => {
      const content = 'See [[note1]] and [[note2]].';
      const links = linkManager.extractWikiLinks(content);
      expect(links).toHaveLength(2);
    });

    it('ignores links in code blocks', () => {
      const content = '```\n[[not-a-link]]\n```\n[[real-link]]';
      const links = linkManager.extractWikiLinks(content);
      expect(links).toHaveLength(1);
      expect(links[0].path).toBe('real-link');
    });
  });
});
```

### Integration Tests

```typescript
// tests/integration/backlink-flow.test.ts

describe('Backlink Flow', () => {
  it('updates target note when source links to it', async () => {
    // Create target note
    await writer.writeObservation({ title: 'Target', ... });

    // Create source note linking to target
    await writer.writeObservation({
      title: 'Source',
      relatedNotes: ['observations/target']
    });

    // Verify backlink in target
    const target = await readFile('observations/target.md');
    expect(target).toContain('referencedBy:');
    expect(target).toContain('[[observations/source]]');
  });
});
```

## Configuration

No new configuration required. Uses existing vault path from `diana.config.ts`.

Optional frontmatter to disable auto-backlinks for a note:

```yaml
---
diana:
  autoBacklinks: false
---
```

## Error Handling

| Scenario | Handling |
|----------|----------|
| Backlink update fails (lock timeout) | Queue for retry (max 3 attempts) |
| Target note doesn't exist | Track as dangling link |
| Corrupted target frontmatter | Skip, log for manual review |
| Migration interrupted | Idempotent - safe to re-run |

## Dependencies

No new dependencies. Uses existing:

- `write-file-atomic` - Atomic file writes
- `proper-lockfile` - File locking
- `gray-matter` - Frontmatter parsing
- `date-fns` - ISO week calculations (getWeek, getWeekYear)
