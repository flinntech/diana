# 001-obsidian-integration Enhancement: Rich Linking

**Scope**: Level 3 (Knowledge Evolution) with auto-maintained backlinks
**Status**: Blocked on 005-conversation-persistence
**Depends on**: Feature 005 must be complete before implementation (Phase 5 requires conversation storage)

## Overview

Transform DIANA's Obsidian vault from one-way notes into a bidirectional knowledge graph. When note A links to note B, B automatically knows about the link.

## Implementation Phases

### Phase 1: Core Link Infrastructure
**New file**: `src/obsidian/links.ts`

```typescript
export class LinkManager {
  extractLinks(content: string): string[]  // Parse [[wikilinks]] from content
  async updateBacklinks(updates: LinkUpdate[]): Promise<void>  // Update target notes
  async getReferencedBy(path: string): Promise<string[]>  // Incoming links
  async getReferences(path: string): Promise<string[]>  // Outgoing links
}
```

**Type changes** in `src/types/obsidian.ts`:
```typescript
// Add to BaseFrontmatter
references?: string[];      // Outgoing links
referencedBy?: string[];    // Incoming links

// New note types
type NoteType = ... | 'conversation-anchor' | 'rollup';

// New frontmatter interfaces
interface ConversationAnchorFrontmatter extends BaseFrontmatter { ... }
interface RollupFrontmatter extends BaseFrontmatter { ... }
```

### Phase 2: Write Flow Integration
**Modify** `src/obsidian/writer.ts`:

Every write method follows this pattern:
1. Generate content (existing)
2. Extract outgoing links via `LinkManager.extractLinks()`
3. Set `frontmatter.references = outgoingLinks`
4. Write the source note (existing)
5. **NEW**: Call `LinkManager.updateBacklinks()` for each linked note

**Add backlinks section** in `src/obsidian/templates.ts`:
```typescript
export function generateBacklinksSection(referencedBy: string[]): string
```

Notes with incoming links get auto-appended:
```markdown
## Backlinks

- [[daily/2025-12-13]] - Daily Log
- [[proposals/2025-12-13-organize]] - Organize Proposal
```

### Phase 3: Tool Enhancements
**Modify** `src/agent/tools/obsidian.ts`:

Unhide existing parameters:
```typescript
// write_observation - ADD these to parameters:
relatedNotes: { type: 'array', items: { type: 'string' } }
tags: { type: 'array', items: { type: 'string' } }

// write_daily_note - ADD:
relatedNotes: { type: 'array', items: { type: 'string' } }
```

New tool:
```typescript
get_related_notes(notePath, direction: 'incoming'|'outgoing'|'both')
```

### Phase 4: Fact Provenance
**Modify** `src/agent/memory.ts`:

```typescript
interface KeyFact {
  content: string;
  tags: string[];
  sourceNote?: string;  // NEW: [[observations/2025-12-13-user-pref]]
}
```

Facts in `memory/facts.md` include provenance links:
```markdown
- User prefers flat folder structure (from [[observations/2025-12-10-file-org]])
```

### Phase 5: Conversation Anchors
**New**: `src/obsidian/writer.ts` - `writeConversationAnchor()`

When 005-conversation-persistence saves a conversation that references vault notes, create a stub in `/conversations/`:

```markdown
---
type: conversation-anchor
conversationId: abc123
---
# Conversation: Organizing Downloads

**Messages**: 12 | **Started**: Dec 13, 2025

## Referenced Notes
- [[observations/2025-12-13-download-patterns]]
- [[proposals/2025-12-13-organize-downloads]]

*Full conversation at `~/.diana/conversations/abc123.json`*
```

### Phase 6: Rollup Notes
**New file**: `src/obsidian/rollup.ts`

```typescript
export class RollupGenerator {
  async generateWeeklyRollup(weekStart: Date): Promise<WriteResult>
  async generateMonthlyRollup(month: Date): Promise<WriteResult>
}
```

Auto-generated weekly/monthly summaries:
```markdown
# Week of Dec 9 - Knowledge Summary

| Metric | Count |
|--------|-------|
| Observations | 5 |
| Proposals | 3 (2 approved) |

## Observations
- [[observations/2025-12-10-patterns]] - File Patterns
...
```

Triggered via cron or `diana rollup --weekly`.

## File Changes Summary

| File | Change |
|------|--------|
| `src/obsidian/links.ts` | **NEW** - LinkManager class |
| `src/obsidian/rollup.ts` | **NEW** - RollupGenerator class |
| `src/types/obsidian.ts` | Add `references`/`referencedBy` to BaseFrontmatter, new NoteTypes |
| `src/obsidian/writer.ts` | Integrate LinkManager, add `writeConversationAnchor()`, `writeRollup()` |
| `src/obsidian/templates.ts` | Add `generateBacklinksSection()`, anchor/rollup templates |
| `src/obsidian/paths.ts` | Add `getConversationAnchorPath()`, `getRollupPath()` |
| `src/obsidian/frontmatter.ts` | Add frontmatter creators for new types |
| `src/agent/tools/obsidian.ts` | Unhide `relatedNotes`/`tags`, add `get_related_notes` tool |
| `src/agent/memory.ts` | Add `sourceNote` to KeyFact |
| `scripts/migrate-backlinks.ts` | **NEW** - Migration for existing vaults |

## Migration Strategy

Non-destructive migration script:
1. Scan all `.md` files
2. Build link graph in memory
3. Update frontmatter with `references`/`referencedBy`
4. Append `## Backlinks` sections

Run: `diana vault migrate-backlinks [--dry-run]`

## Testing Approach

- Unit tests for `LinkManager.extractLinks()` regex
- Integration tests for backlink updates on write
- Test concurrent writes don't corrupt backlinks (uses existing `proper-lockfile`)
- Test migration on sample vault
