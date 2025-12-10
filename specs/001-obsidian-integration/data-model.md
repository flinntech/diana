# Data Model: Obsidian Integration

**Feature**: 001-obsidian-integration
**Date**: 2025-12-10

## Overview

This document defines the data structures for DIANA's Obsidian vault integration. All entities are persisted as Markdown files with YAML frontmatter.

---

## Entities

### 1. DailyLog

A chronological record of DIANA's activities for a single day.

**File Location**: `/daily/YYYY-MM-DD.md`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | `'daily-log'` | Yes | Note type identifier |
| date | `string` (ISO 8601) | Yes | The day this log covers |
| tags | `string[]` | Yes | Always includes `'diana'`, `'daily'` |
| created | `string` (ISO 8601) | Yes | When the file was created |
| modified | `string` (ISO 8601) | No | Last modification timestamp |

**Content Structure**:
```markdown
# Daily Log - YYYY-MM-DD

## HH:mm:ss - Activity Title

Activity description and details.

[[observation-123]] - Related observation link

---

## HH:mm:ss - Next Activity

...
```

**State Transitions**: None (append-only)

---

### 2. Observation

A note capturing DIANA's learnings about files, patterns, or user behavior.

**File Location**: `/observations/YYYY-MM-DD-slug.md`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | `'observation'` | Yes | Note type identifier |
| date | `string` (ISO 8601) | Yes | When observation was made |
| tags | `string[]` | Yes | Content-specific tags |
| created | `string` (ISO 8601) | Yes | File creation timestamp |
| subject | `string` | No | What was observed (file path, pattern) |
| confidence | `'low' \| 'medium' \| 'high'` | No | Confidence in observation |

**Content Structure**:
```markdown
# Observation: [Title]

## Context

What triggered this observation.

## Details

What was observed and learned.

## Related

- [[daily/YYYY-MM-DD]] - Daily log reference
- [[proposals/proposal-id]] - Related proposal if any
```

**Validation Rules**:
- `subject` should be a valid file path or pattern identifier
- `confidence` defaults to `'medium'` if not specified

---

### 3. ProposalNote

Documentation of DIANA's reasoning for a specific proposal.

**File Location**: `/proposals/YYYY-MM-DD-proposal-id.md`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | `'proposal'` | Yes | Note type identifier |
| date | `string` (ISO 8601) | Yes | When proposal was created |
| tags | `string[]` | Yes | Always includes `'diana'`, `'proposal'` |
| created | `string` (ISO 8601) | Yes | File creation timestamp |
| proposalId | `string` | Yes | Unique identifier for the proposal |
| status | `'pending' \| 'approved' \| 'rejected'` | Yes | Current proposal status |
| confidence | `'low' \| 'medium' \| 'high'` | Yes | DIANA's confidence level |
| action | `string` | Yes | Proposed action type (move, rename, etc.) |

**Content Structure**:
```markdown
# Proposal: [Action Description]

## Summary

Brief description of what is being proposed.

## Reasoning

Why DIANA is suggesting this action.
- Supporting observation 1
- Supporting observation 2

## Evidence

[[observation-1]] - Link to supporting observation
[[observation-2]] - Another supporting observation

## Confidence: [Level]

Explanation of confidence level.

## Outcome

*Updated when proposal is resolved*

- Status: [pending/approved/rejected]
- Resolution date: YYYY-MM-DD
- User feedback: ...
```

**State Transitions**:
- `pending` → `approved` (user approves)
- `pending` → `rejected` (user rejects)

**Validation Rules**:
- `proposalId` must be unique across all proposals
- `status` must be updated atomically with user action

---

### 4. SystemNote

Technical status information including health checks and errors.

**File Location**: `/system/YYYY-MM-DD-type.md`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | `'system'` | Yes | Note type identifier |
| date | `string` (ISO 8601) | Yes | Date of system event |
| tags | `string[]` | Yes | Always includes `'diana'`, `'system'` |
| created | `string` (ISO 8601) | Yes | File creation timestamp |
| category | `'health' \| 'error' \| 'config' \| 'startup' \| 'shutdown'` | Yes | System note category |
| severity | `'info' \| 'warning' \| 'error'` | No | For error/warning notes |

**Content Structure**:
```markdown
# System: [Category] - [Title]

## Timestamp

YYYY-MM-DDTHH:mm:ss

## Details

System event details.

## Context

- Component: [component name]
- Action: [what triggered this]

## Resolution

*For errors - how it was resolved*
```

**Validation Rules**:
- `severity` required when `category` is `'error'`

---

### 5. Index (MOC)

The master navigation document linking to all notes.

**File Location**: `/index.md`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | `'index'` | Yes | Note type identifier |
| date | `string` (ISO 8601) | Yes | Creation date |
| tags | `string[]` | Yes | Always `['diana', 'moc']` |
| modified | `string` (ISO 8601) | Yes | Last update timestamp |
| noteCount | `number` | No | Total notes in vault |

**Content Structure**:
```markdown
# DIANA Brain - Index

*Last updated: YYYY-MM-DD HH:mm:ss*

## Daily Logs

- [[daily/2025-12-10]] - December 10, 2025
- [[daily/2025-12-09]] - December 9, 2025
...

## Recent Observations

- [[observations/2025-12-10-file-patterns]] - File pattern observation
...

## Active Proposals

- [[proposals/2025-12-10-organize-downloads]] - Organize Downloads folder
...

## System Status

- [[system/2025-12-10-startup]] - Latest startup
...
```

**Validation Rules**:
- Links must be sorted reverse chronologically (newest first)
- Index must be updated within 5 seconds of any note creation

---

## Relationships

```
┌─────────────┐     references      ┌──────────────┐
│  DailyLog   │────────────────────►│ Observation  │
└─────────────┘                     └──────────────┘
       │                                   │
       │ logs activity                     │ supports
       │                                   ▼
       │                            ┌──────────────┐
       └───────────────────────────►│ ProposalNote │
                                    └──────────────┘
                                           │
                                           │ triggers
                                           ▼
                                    ┌──────────────┐
                                    │  SystemNote  │
                                    └──────────────┘

All notes ──────────────────────────► Index (MOC)
              linked from
```

---

## File Path Conventions

| Note Type | Pattern | Example |
|-----------|---------|---------|
| Daily Log | `/daily/YYYY-MM-DD.md` | `/daily/2025-12-10.md` |
| Observation | `/observations/YYYY-MM-DD-slug.md` | `/observations/2025-12-10-download-patterns.md` |
| Proposal | `/proposals/YYYY-MM-DD-id.md` | `/proposals/2025-12-10-organize-downloads.md` |
| System | `/system/YYYY-MM-DD-category.md` | `/system/2025-12-10-startup.md` |
| Index | `/index.md` | `/index.md` |

---

## Frontmatter Schema (YAML)

All notes share a common base schema:

```yaml
---
type: string        # Required: note type identifier
date: string        # Required: ISO 8601 date
tags: string[]      # Required: array of tags
created: string     # Required: ISO 8601 datetime
modified: string    # Optional: ISO 8601 datetime
---
```

Extended fields are type-specific as documented above.
