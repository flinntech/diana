# Research: Obsidian Rich Linking

**Feature**: 006-obsidian-rich-linking
**Date**: 2025-12-13
**Status**: Complete

## Executive Summary

Three research areas were investigated for the Obsidian Rich Linking feature:

1. **Wiki-link extraction** - Regex-based extraction with code block filtering
2. **Backlinks section merging** - HTML comment markers at end of file
3. **Rollup note generation** - ISO week format with hybrid content structure

All approaches align with existing codebase patterns and require no new dependencies.

---

## Research Area 1: Wiki-Link Extraction

### Decision: Regex with Code Block Preprocessing

Use a simple regex pattern combined with preprocessing to remove code blocks. This provides the best balance of simplicity, performance, and correctness.

### Rationale

- Fast execution (~100ms per file for regex + filtering vs ~500ms for full parser)
- No new dependencies (existing gray-matter handles frontmatter)
- Direct control over edge cases
- Sufficient for DIANA's use case (extraction, not transformation)

### Alternatives Considered

| Approach | Performance | Complexity | Dependencies | Decision |
|----------|-------------|------------|--------------|----------|
| Pure regex | 50ms | Low | None | Risk: False positives in code |
| **Regex + code filter** | 100ms | Moderate | **None** | **Selected** |
| remark-wiki-link | 500ms | High | unified, remark, etc. | Overkill for extraction |
| micromark | 400ms | High | micromark ecosystem | Overkill for extraction |

### Implementation Pattern

```typescript
// Core regex pattern for wiki-links
const WIKILINK_PATTERN = /(!?)\[\[([^\]|#^]+)(?:#([^\]|^]+))?(?:\^([^\]|]+))?(?:\|([^\]]+))?\]\]/g;

// Capture groups:
// 1: embed marker (!)
// 2: path (required)
// 3: heading (optional, after #)
// 4: block ID (optional, after ^)
// 5: alias (optional, after |)

function extractWikiLinks(content: string): WikiLink[] {
  // Step 1: Remove code blocks
  const cleaned = removeCodeBlocks(content);

  // Step 2: Extract with regex
  const links: WikiLink[] = [];
  let match;
  while ((match = WIKILINK_PATTERN.exec(cleaned)) !== null) {
    links.push({
      raw: match[0],
      path: match[2].trim(),
      heading: match[3]?.trim(),
      blockId: match[4]?.trim(),
      alias: match[5]?.trim(),
      isEmbed: match[1] === '!'
    });
  }

  return deduplicateLinks(links);
}

function removeCodeBlocks(content: string): string {
  let result = content;
  // Fenced code blocks
  result = result.replace(/^```[\s\S]*?^```/gm, '');
  result = result.replace(/^~~~[\s\S]*?^~~~/gm, '');
  // Inline code
  result = result.replace(/`[^`\n]+`/g, '');
  // Indented code blocks
  result = result.replace(/^(    |\t).+$/gm, '');
  return result;
}
```

### Edge Cases

| Edge Case | Handling |
|-----------|----------|
| Links in fenced code blocks | Removed by preprocessing |
| Links in inline code | Removed by preprocessing |
| Empty links `[[]]` | Filtered by validation |
| Links with newlines | Filtered by validation |
| Invalid filesystem chars | Filtered by validation |
| Duplicate links | Deduplicated by path |
| Embed syntax `![[]]` | Marked with `isEmbed: true` |

---

## Research Area 2: Backlinks Section Merging

### Decision: HTML Comment Markers at End of File

Use HTML comment delimiters with clear START/END markers, placed at the end of the file.

### Rationale

- Follows established pattern (markdown-magic, markdown-toc)
- Invisible in Obsidian reading view
- Namespaced to avoid conflicts (`DIANA-BACKLINKS`)
- Simple regex replacement for updates
- End-of-file placement minimizes disruption

### Alternatives Considered

| Approach | Visibility | Robustness | Complexity | Decision |
|----------|------------|------------|------------|----------|
| **HTML comments** | Hidden | High | Low | **Selected** |
| Special markdown heading | Visible | Medium | Low | Visible clutter |
| Frontmatter only | Hidden | High | Medium | Can't show in note |
| Custom syntax | Hidden | Low | High | Non-standard |

### Implementation Pattern

```markdown
<!-- DIANA-BACKLINKS:START -->
## Backlinks

- [[proposals/2025-12-13-feature]]
- [[daily/2025-12-13]]
<!-- DIANA-BACKLINKS:END -->
```

```typescript
const MARKER_START = '<!-- DIANA-BACKLINKS:START -->';
const MARKER_END = '<!-- DIANA-BACKLINKS:END -->';

function updateBacklinksSection(content: string, backlinks: string[]): string {
  const section = generateBacklinksSection(backlinks);

  if (content.includes(MARKER_START)) {
    // Replace existing section (idempotent)
    const regex = new RegExp(
      `${escapeRegex(MARKER_START)}[\\s\\S]*?${escapeRegex(MARKER_END)}`,
      'g'
    );
    return content.replace(regex, section);
  } else {
    // Append at end (first time)
    return content.trimEnd() + '\n\n' + section + '\n';
  }
}

function generateBacklinksSection(backlinks: string[]): string {
  if (backlinks.length === 0) return '';

  const sorted = [...backlinks].sort(); // Deterministic order
  return [
    MARKER_START,
    '## Backlinks',
    '',
    ...sorted.map(link => `- [[${link}]]`),
    MARKER_END
  ].join('\n');
}
```

### Edge Cases

| Edge Case | Handling |
|-----------|----------|
| User deletes markers | Skip update; repair via `diana vault validate` |
| User modifies content in markers | Overwrite (markers indicate auto-zone) |
| Empty backlinks | Remove entire section including markers |
| Note has manual backlinks | Wrap in markers on migration, merge links |
| User wants to disable | Frontmatter option `diana.auto-backlinks: false` |

---

## Research Area 3: Rollup Note Generation

### Decision: ISO Week Format with Hybrid Content Structure

Use ISO 8601 week dates (YYYY-WNN) for weekly rollups and YYYY-MM for monthly. Content includes both summary statistics and full note links.

### Rationale

- ISO week format is unambiguous and internationally standardized
- Works well with date-fns library (already a dependency)
- Nested directory structure (`rollups/weekly/`, `rollups/monthly/`) keeps vault organized
- Hybrid content (stats + links) supports both quick review and deep exploration

### Alternatives Considered

| Naming Format | Sorting | Clarity | Decision |
|---------------|---------|---------|----------|
| **2025-W50.md** | Correct | High | **Selected for weekly** |
| 2025-12-week-2.md | Ambiguous | Low | Non-standard |
| week-50-2025.md | Wrong | Medium | Sorting issues |
| **2025-12.md** | Correct | High | **Selected for monthly** |

### Implementation Pattern

**Directory Structure:**
```
rollups/
├── weekly/
│   ├── 2025-W49.md
│   ├── 2025-W50.md
│   └── 2025-W51.md
└── monthly/
    ├── 2025-11.md
    └── 2025-12.md
```

**Weekly Rollup Frontmatter:**
```yaml
---
type: rollup
period: weekly
week: 2025-W50
year: 2025
weekNumber: 50
startDate: 2025-12-08
endDate: 2025-12-14
date: 2025-12-08
tags:
  - diana
  - rollup
  - weekly
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
```

**Content Structure (Hybrid):**
```markdown
# Week 50 - 2025

## Summary
This week saw 7 daily logs, 3 observations, and 2 proposals (1 approved, 1 pending).

## Statistics
- **Daily Logs**: 7 entries
- **Observations**: 3 notes
- **Proposals**: 2 total (1 approved, 1 pending)
- **System Notes**: 1 entry

## Daily Logs
- [[daily/2025-12-08]] - Monday
- [[daily/2025-12-09]] - Tuesday
...

## Observations
- [[observations/2025-12-10-file-patterns]] - File organization patterns

## Proposals

### Approved
- [[proposals/2025-12-09-organize-downloads]]

### Pending
- [[proposals/2025-12-12-archive-logs]]

## System Notes
- [[system/2025-12-10-health]] - Weekly health check
```

### Integration with Existing Code

Extend `PathResolver` with:
```typescript
getRollupPath(period: 'weekly' | 'monthly', date: Date = new Date()): string {
  if (period === 'weekly') {
    const week = getWeek(date, { weekStartsOn: 1, firstWeekContainsDate: 4 });
    const year = getWeekYear(date, { weekStartsOn: 1, firstWeekContainsDate: 4 });
    return join(this.vaultPath, 'rollups', 'weekly', `${year}-W${String(week).padStart(2, '0')}.md`);
  }
  return join(this.vaultPath, 'rollups', 'monthly', `${format(date, 'yyyy-MM')}.md`);
}
```

Leverage existing `scanVaultForIndex()` pattern in `ObsidianWriter` for date-range queries.

---

## Summary of Decisions

| Research Area | Decision | Key Benefit |
|---------------|----------|-------------|
| Wiki-link extraction | Regex + code block filtering | Fast, no dependencies |
| Backlinks section | HTML comment markers at EOF | Invisible, idempotent |
| Rollup naming | ISO week (2025-W50) / ISO month (2025-12) | Unambiguous, sortable |
| Rollup content | Hybrid (stats + full links) | Quick overview + drill-down |
| Rollup location | `rollups/weekly/` and `rollups/monthly/` | Organized vault structure |

---

## References

### Wiki-Link Extraction
- [obsidian-dataview](https://github.com/blacksmithgu/obsidian-dataview) - Reference implementation
- [remark-wiki-link](https://github.com/landakram/remark-wiki-link) - Parser approach
- [markdown-it-obsidian](https://www.npmjs.com/package/markdown-it-obsidian) - Alternative parser

### Backlinks Section
- [markdown-magic](https://github.com/DavidWells/markdown-magic) - Comment marker pattern
- [markdown-toc](https://github.com/jonschlinkert/markdown-toc) - Section replacement pattern
- [obsidian-auto-backlink](https://github.com/jackvaughan09/obsidian-auto-backlink) - Obsidian plugin

### Rollup Notes
- [ISO 8601 Week Date](https://en.wikipedia.org/wiki/ISO_week_date) - Standard format
- [obsidian-periodic-notes](https://github.com/liamcain/obsidian-periodic-notes) - Best practices
- [date-fns getWeek](https://date-fns.org/docs/getWeek) - Implementation reference
