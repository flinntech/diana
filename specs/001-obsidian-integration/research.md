# Research: Obsidian Integration

**Feature**: 001-obsidian-integration
**Date**: 2025-12-10
**Status**: Complete

## Summary

This document captures technical research and decisions for implementing DIANA's Obsidian vault integration. All research items from the Technical Context have been resolved.

---

## 1. Atomic File Writes

### Decision
Use the `write-file-atomic` npm package for atomic file operations.

### Rationale
- Battle-tested implementation used by npm ecosystem
- Handles write-to-temp-then-rename pattern automatically
- Creates temp files in same directory (critical for atomicity)
- Includes automatic cleanup on errors
- Supports fsync option for critical writes

### Alternatives Considered
- **Custom fs/promises implementation**: Rejected - too many edge cases around cross-filesystem renames, error cleanup, and WSL/Windows interop
- **fs-extra**: Rejected - doesn't provide atomic write guarantees

### Implementation Pattern

```typescript
import { writeFile } from 'write-file-atomic';

async function atomicWrite(targetPath: string, content: string): Promise<void> {
  await writeFile(targetPath, content, {
    encoding: 'utf8',
    fsync: true  // Ensure data is flushed to disk
  });
}
```

### WSL/Windows Considerations
- `fs.rename()` is atomic on NTFS for small files (our Markdown notes)
- Temp file MUST be in same directory as target (package handles this)
- Windows file locking may cause `EBUSY`/`EPERM` if Obsidian has file open
- Add retry logic with exponential backoff for file locking issues:

```typescript
async function writeWithRetry(targetPath: string, content: string, maxRetries = 3): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await writeFile(targetPath, content, { fsync: true });
      return;
    } catch (error: any) {
      if (i === maxRetries - 1) throw error;
      if (error.code === 'EBUSY' || error.code === 'EPERM') {
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, i)));
      } else {
        throw error;
      }
    }
  }
}
```

---

## 2. File Locking Strategy

### Decision
Use `proper-lockfile` npm package for cross-process file locking.

### Rationale
- Industry-standard solution for Node.js file locking
- Uses atomic `mkdir` strategy (works on all filesystems including NFS)
- Automatic stale lock detection via mtime updates
- Cross-process safe with configurable retry logic
- Handles compromised locks gracefully
- Automatic cleanup on process exit

### Alternatives Considered
- **Custom .lock files**: Rejected - stale lock detection is error-prone, no automatic cleanup, many edge cases
- **Database-based locks**: Rejected - overkill for this use case, adds unnecessary dependency
- **Single-writer queue**: Considered - would require architectural changes, proper-lockfile is simpler

### Implementation Pattern

```typescript
import * as lockfile from 'proper-lockfile';

async function withFileLock<T>(
  filePath: string,
  fn: () => Promise<T>
): Promise<T> {
  const release = await lockfile.lock(filePath, {
    retries: {
      retries: 5,
      minTimeout: 100,
      maxTimeout: 1000,
      factor: 2
    },
    stale: 10000,    // Lock stale after 10s
    update: 5000,    // Update mtime every 5s
    realpath: false
  });

  try {
    return await fn();
  } finally {
    await release();
  }
}
```

### Error Handling
- `ELOCKED`: Failed to acquire lock after retries - queue for later or use fallback
- Lock compromised: Log error, release was called but another process took lock

---

## 3. Frontmatter Handling (gray-matter)

### Decision
Use `gray-matter` for YAML frontmatter parsing and serialization.

### Rationale
- De facto standard for frontmatter in Node.js ecosystem
- Handles both parsing and stringifying
- Preserves content while updating frontmatter
- Well-maintained with TypeScript support

### Key Usage Patterns

**Creating notes with frontmatter:**
```typescript
import matter from 'gray-matter';

const frontmatter = {
  type: 'daily-log',
  date: '2025-12-10',
  tags: ['diana', 'activity']
};

const content = '# Daily Log\n\nContent here...';
const note = matter.stringify(content, frontmatter);
```

**Appending to existing notes:**
```typescript
import matter from 'gray-matter';

function appendToNote(existing: string, newContent: string): string {
  const parsed = matter(existing);
  parsed.data.modified = new Date().toISOString().split('T')[0];
  const updatedContent = parsed.content + '\n\n' + newContent;
  return matter.stringify(updatedContent, parsed.data);
}
```

### Obsidian Compatibility Requirements
- **Dates**: Use ISO 8601 format (`YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss`)
- **Tags**: Use plural `tags:` field as array
- **Wikilinks in frontmatter**: Must be quoted: `related: '[[Other Note]]'`
- **Special characters**: Strings with `:`, `#`, `@` need quoting (gray-matter handles automatically)

### Date Formatting with date-fns

```typescript
import { format, formatISO } from 'date-fns';

// Date only: 2025-12-10
const dateOnly = format(new Date(), 'yyyy-MM-dd');

// Full ISO 8601: 2025-12-10T14:30:00
const fullISO = formatISO(new Date(), { representation: 'complete' }).slice(0, 19);
```

---

## 4. Testing Strategy

### Decision
Use `mock-fs` for unit tests with Vitest.

### Rationale
- Simple API for mocking filesystem
- Works with Node.js `fs/promises` API
- Can simulate error conditions (permissions, disk full)
- No actual disk I/O in unit tests
- Integration tests use real temp directories

### Unit Test Pattern

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mockFs from 'mock-fs';
import { ObsidianWriter } from './writer';

describe('ObsidianWriter', () => {
  beforeEach(() => {
    mockFs({
      '/vault': {
        'daily': {},
        'observations': {},
        'proposals': {},
        'system': {},
        'index.md': '# Index\n'
      }
    });
  });

  afterEach(() => {
    mockFs.restore();
  });

  it('creates daily log with frontmatter', async () => {
    const writer = new ObsidianWriter('/vault');
    await writer.writeDaily('Test activity');

    const content = await fs.readFile('/vault/daily/2025-12-10.md', 'utf8');
    expect(content).toContain('type: daily-log');
    expect(content).toContain('Test activity');
  });

  it('handles vault unavailable error', async () => {
    mockFs({});  // Empty filesystem
    const writer = new ObsidianWriter('/nonexistent');

    await expect(writer.writeDaily('Test')).rejects.toThrow('VaultNotFoundError');
  });
});
```

### Integration Test Pattern

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { ObsidianWriter } from './writer';

describe('ObsidianWriter Integration', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'diana-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('writes to real filesystem', async () => {
    const writer = new ObsidianWriter(tempDir);
    await writer.writeDaily('Real filesystem test');

    const dailyPath = join(tempDir, 'daily', '2025-12-10.md');
    const content = await readFile(dailyPath, 'utf8');
    expect(content).toContain('Real filesystem test');
  });
});
```

---

## 5. Error Handling Strategy

### Decision
Custom error classes with fallback logging.

### Error Types

| Error | Trigger | Recovery |
|-------|---------|----------|
| `VaultNotFoundError` | Vault path doesn't exist | Log to fallback, queue writes |
| `VaultNotWritableError` | Permission denied | Log to fallback, alert user |
| `WriteConflictError` | File locked by another process | Retry with backoff, then queue |
| `CorruptedNoteError` | Cannot parse existing frontmatter | Backup file, create new |

### Fallback Logging
When vault is unavailable, write to `/home/diana/logs/` as plain text:

```typescript
async function logToFallback(entry: string): Promise<void> {
  const fallbackPath = '/home/diana/logs';
  const filename = `diana-${format(new Date(), 'yyyy-MM-dd')}.log`;
  const fullPath = join(fallbackPath, filename);

  await mkdir(fallbackPath, { recursive: true });
  await appendFile(fullPath, `${new Date().toISOString()} ${entry}\n`);
}
```

---

## 6. Dependencies Summary

### Runtime Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `gray-matter` | ^4.0.3 | Frontmatter parsing/serialization |
| `date-fns` | ^3.0.0 | Lightweight date formatting |
| `write-file-atomic` | ^5.0.1 | Atomic file writes |
| `proper-lockfile` | ^4.1.2 | Cross-process file locking |

### Dev Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `mock-fs` | ^5.2.0 | Filesystem mocking for tests |
| `vitest` | ^1.0.0 | Test runner |

### No External Dependencies For
- File reading (native `fs/promises`)
- Path manipulation (native `path`)
- Directory creation (native `fs/promises.mkdir`)

---

## 7. Open Questions - Resolved

| Question | Resolution |
|----------|------------|
| Atomic writes on WSL? | Yes, write-file-atomic handles this correctly |
| Lock file strategy? | proper-lockfile with mkdir approach |
| Date format for Obsidian? | ISO 8601 (YYYY-MM-DD or full datetime) |
| Test framework? | Vitest with mock-fs |
| Error recovery? | Fallback log + write queue |
