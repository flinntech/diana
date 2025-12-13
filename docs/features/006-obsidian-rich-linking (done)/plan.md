Create implementation plan for Obsidian Rich Linking

Technical context:
- Language: TypeScript 5.9+ with Node.js 18+
- Existing: ObsidianWriter (src/obsidian/writer.ts) with atomic writes, file locking
- Existing: PathResolver, frontmatter.ts, templates.ts
- Existing: InMemoryWriteQueue for retry queue
- Existing: ConversationStore (src/conversations/)

Research needed:
- Best approach for extracting wiki-links from markdown content
- How to merge auto-generated Backlinks section with user content
- RollupGenerator integration with existing vault scanning

Key deliverables:
1. src/obsidian/link-manager.ts - Wiki-link extraction and backlink computation
2. src/obsidian/rollup-generator.ts - Weekly/monthly rollup generation
3. src/cli/vault.ts - Vault subcommand (migrate, validate, rollup)
4. Extend ObsidianWriter with updateBacklinks(), writeConversationAnchor(), writeRollup()
5. Extend frontmatter types with references, referencedBy arrays
6. Tests for backlink flow, migration, concurrent writes
