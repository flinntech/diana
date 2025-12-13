Obsidian Rich Linking for DIANA

Transform DIANA's Obsidian vault from one-way notes into a bidirectional knowledge graph:

1. Auto-Maintained Backlinks
   - Track outgoing links (`references`) in note frontmatter
   - Track incoming links (`referencedBy`) in target note frontmatter
   - Auto-generate "## Backlinks" section in notes with incoming links
   - Content wiki-links are authoritative; frontmatter is derived/cached
   - Support `[[path]]` and `[[path|display]]` wiki-link formats

2. Concurrency & Data Integrity
   - 5 second lock timeout; on timeout, queue for retry (fail silently)
   - 3 retries with exponential backoff for failed backlink updates
   - Deadlock prevention: acquire locks in alphabetical order by file path
   - Eventual consistency: source write succeeds even if target update fails

3. Fact Provenance
   - Facts include optional `sourceNote` field linking to source observation
   - Users can trace facts back to originating observations

4. Conversation Anchors
   - Create stub notes in vault when conversations reference vault notes
   - Bridge conversation JSON storage to Obsidian knowledge graph
   - Anchor notes include conversation metadata and links to referenced notes

5. Knowledge Rollups
   - Weekly rollup notes: `rollups/2025-W50.md`
   - Monthly rollup notes: `rollups/2025-12.md`
   - Aggregate stats: observation/proposal counts, approval rates
   - Links to all notes created in period

6. Migration Utility
   - `diana vault migrate` - Add backlink tracking to existing vault
   - Add frontmatter if missing; skip corrupted with logging
   - Idempotent and resume-safe
   - Dry-run mode for preview

7. Validation Command
   - `diana vault validate` - Detect orphaned/missing backlinks
   - Optional `--fix` flag to repair inconsistencies

Constraints:
- Component boundaries: LinkManager extracts/tracks in memory; ObsidianWriter handles all file I/O
- Reuse existing: write-file-atomic, proper-lockfile, gray-matter
- Follow existing patterns: ObsidianWriter, PathResolver, frontmatter.ts
