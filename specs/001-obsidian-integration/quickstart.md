# Quickstart: Obsidian Integration

**Feature**: 001-obsidian-integration
**Date**: 2025-12-10

## Overview

This guide helps you get started with DIANA's Obsidian vault integration for logging activities, observations, and proposals.

## Prerequisites

1. **Node.js 18+** with TypeScript
2. **Obsidian vault** created at the configured path
3. **DIANA project** cloned and dependencies installed

## Installation

```bash
# Install dependencies
npm install gray-matter date-fns write-file-atomic proper-lockfile

# Install dev dependencies
npm install -D mock-fs @types/mock-fs
```

## Configuration

Update `config/diana.config.ts`:

```typescript
export const config = {
  obsidian: {
    // Path to your Obsidian vault
    vaultPath: '/mnt/c/Users/joshu/Obsidian/DIANA/DIANA_brain',

    // Fallback log location when vault unavailable
    fallbackLogPath: '/home/diana/logs',

    // Date format for daily log filenames
    dateFormat: 'yyyy-MM-dd',

    // Write operation settings
    maxRetries: 3,
    lockTimeout: 10000
  }
};
```

## Basic Usage

### Initialize the Writer

```typescript
import { ObsidianWriter } from './src/obsidian';
import { config } from './config/diana.config';

const writer = new ObsidianWriter(config.obsidian);
```

### Write a Daily Log Entry

```typescript
const result = await writer.writeDaily({
  activity: 'Detected new files in Downloads folder',
  title: 'File Detection',
  relatedNotes: ['observations/2025-12-10-download-patterns']
});

if (result.success) {
  console.log(`Logged to: ${result.filePath}`);
} else {
  console.error(`Failed: ${result.error.message}`);
}
```

### Create an Observation

```typescript
const result = await writer.writeObservation({
  title: 'Download Folder Patterns',
  context: 'Monitoring user download behavior',
  details: 'User frequently downloads PDF invoices on Mondays',
  subject: '/mnt/c/Users/joshu/Downloads',
  confidence: 'medium',
  tags: ['patterns', 'downloads']
});
```

### Document a Proposal

```typescript
const result = await writer.writeProposal({
  proposalId: 'organize-downloads-001',
  summary: 'Organize Downloads folder by file type',
  reasoning: 'Downloads contains 150+ files with no organization...',
  action: 'move',
  confidence: 'high',
  evidence: ['observations/2025-12-10-download-patterns']
});
```

### Log System Events

```typescript
const result = await writer.writeSystem({
  category: 'startup',
  title: 'DIANA Service Started',
  details: 'All components initialized successfully',
  component: 'core'
});
```

### Update the Index

```typescript
// Call after creating notes to keep index current
await writer.updateIndex();
```

## Vault Structure

After using the writer, your vault will have this structure:

```
DIANA_brain/
├── index.md                           # Map of Content
├── daily/
│   ├── 2025-12-10.md                 # Today's log
│   └── 2025-12-09.md
├── observations/
│   └── 2025-12-10-download-patterns.md
├── proposals/
│   └── 2025-12-10-organize-downloads.md
└── system/
    └── 2025-12-10-startup.md
```

## Note Format Example

Each note includes YAML frontmatter:

```markdown
---
type: daily-log
date: '2025-12-10'
tags:
  - diana
  - daily
created: '2025-12-10T14:30:00'
modified: '2025-12-10T15:45:00'
---

# Daily Log - 2025-12-10

## 14:30:00 - File Detection

Detected new files in Downloads folder

[[observations/2025-12-10-download-patterns]]

---

## 15:45:00 - Proposal Created

Created proposal for organizing Downloads

[[proposals/2025-12-10-organize-downloads]]
```

## Error Handling

```typescript
const result = await writer.writeDaily({ activity: 'Test' });

if (!result.success) {
  switch (result.error.code) {
    case 'VAULT_NOT_FOUND':
      console.error('Vault path does not exist');
      break;
    case 'VAULT_NOT_WRITABLE':
      console.error('Permission denied');
      break;
    case 'WRITE_CONFLICT':
      console.error('File locked by another process');
      break;
    case 'LOCK_TIMEOUT':
      console.error('Could not acquire lock');
      break;
  }

  // Check if fallback was used
  if (result.fallbackPath) {
    console.log(`Written to fallback: ${result.fallbackPath}`);
  }
}
```

## Testing

### Run Unit Tests

```bash
npm test -- --filter obsidian
```

### Run Integration Tests

```bash
# Uses real temp directory
npm test -- --filter obsidian.integration
```

## Common Issues

### "VAULT_NOT_FOUND" Error

Ensure the vault path exists:

```bash
# Check if path is accessible from WSL
ls -la /mnt/c/Users/joshu/Obsidian/DIANA/DIANA_brain
```

### "EBUSY" or File Locked Errors

If Obsidian has a file open, writes may fail. The writer retries automatically, but you can:

1. Close Obsidian temporarily
2. Increase `maxRetries` in config
3. Check fallback logs at `/home/diana/logs/`

### Frontmatter Not Showing in Obsidian

Ensure your Obsidian settings have "Properties view" enabled:
1. Open Obsidian Settings
2. Go to Editor
3. Enable "Properties in document"

## Next Steps

- See [data-model.md](data-model.md) for entity schemas
- See [contracts/api.ts](contracts/api.ts) for TypeScript interfaces
- See [research.md](research.md) for technical decisions
