# 006: Obsidian Rich Linking

**Phase**: 0 (Architecture Foundation)
**Score**: 8.5
**Value**: 9 | **Effort**: 2

## Overview

Transform DIANA's Obsidian vault from one-way notes into a bidirectional knowledge graph with auto-maintained backlinks, fact provenance, conversation anchors, and periodic rollup summaries.

## Why High Priority?

The vault currently has disconnected notes - observations reference proposals but proposals don't know about incoming links. This creates a dead-end user experience:
- Users can't discover related content by following backlinks
- Facts have no traceable origin
- Conversations exist separately from the knowledge graph
- No high-level view of activity over time

## Dependencies

- 001-obsidian-integration (ObsidianWriter, frontmatter utilities)
- 005-conversation-persistence (for conversation anchor triggers)

## Enables

- Bidirectional knowledge graph navigation in Obsidian
- Traceable fact provenance
- Conversation-to-vault discovery
- Periodic activity summaries

## Key Capabilities

| Category | Feature |
|----------|---------|
| Backlinks | Auto-maintained `references` and `referencedBy` frontmatter |
| Backlinks | Auto-generated "## Backlinks" section in notes |
| Provenance | Facts link to source observations |
| Anchors | Conversation stub notes in vault |
| Rollups | Weekly/monthly summary notes |
| CLI | `diana vault migrate` - Add backlinks to existing vault |
| CLI | `diana vault validate` - Detect/repair orphaned backlinks |

## Design Constraints

- **Content is truth**: Wiki-links in content are authoritative; frontmatter is derived
- **Eventual consistency**: Source writes succeed; failed backlink updates retry
- **Deadlock-free**: Alphabetical lock ordering prevents circular waits
- **Idempotent**: Migration and validation can run repeatedly safely
