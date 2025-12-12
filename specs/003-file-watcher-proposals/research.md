# Research: File Watcher & Proposals

**Feature**: 003-file-watcher-proposals
**Date**: 2025-12-11

---

## Architecture Decisions

### 1. Watcher-to-Main Process Communication

**Decision**: In-process event emitter pattern (no IPC)

**Rationale**: DIANA runs as a single Node.js process. The watcher service and chat interface share the same process, communicating via an EventEmitter-based message bus.

**Architecture**:
```
┌─────────────────────────────────────────────────┐
│                DIANA Process                     │
│                                                  │
│  ┌──────────────┐        ┌──────────────────┐   │
│  │  FileWatcher │──emit──▶│  ProposalService │   │
│  │  (chokidar)  │        │  (proposal store) │   │
│  └──────────────┘        └────────┬─────────┘   │
│                                   │              │
│  ┌──────────────┐        ┌────────▼─────────┐   │
│  │    Session   │◀─tools─│  ToolRegistry    │   │
│  │   (chat)     │        │  (proposal tools)│   │
│  └──────────────┘        └──────────────────┘   │
└─────────────────────────────────────────────────┘
```

**Alternatives considered**:
- **IPC/Worker Threads**: Adds complexity for no benefit since file watching is I/O-bound, not CPU-bound
- **Separate process with socket**: Over-engineered for a local-first desktop tool

**Implementation**:
```typescript
// FileWatcher emits events
watcher.on('file:new', (analysis: FileAnalysis) => proposalService.createProposal(analysis));

// ProposalService manages state, tools query it
tools.register(createListProposalsTool(proposalService));
```

---

### 2. Duplicate Proposal Prevention

**Decision**: File path-based deduplication with configurable cooldown

**Rationale**: A file should only have one pending proposal at a time. If a file is modified again while a proposal is pending, the old proposal should be invalidated and replaced.

**Strategy**:
1. **Primary key**: Normalized absolute file path
2. **Pending proposal map**: `Map<filePath, proposalId>` for O(1) lookup
3. **Cooldown period**: After rejection, don't re-propose the same file for 24 hours (configurable)
4. **Modification tracking**: Store `mtime` in proposal; if file `mtime` changes, mark proposal `invalid`

**State transitions**:
```
New file detected → Check pending map →
  - If exists: Update existing proposal OR invalidate & create new
  - If not: Create new proposal

Proposal approved → Remove from pending map → Execute action → Log to Obsidian
Proposal rejected → Remove from pending map → Add to cooldown set → Log to Obsidian
```

**Alternatives considered**:
- **Content hash deduplication**: Too expensive for large files, and filename changes should trigger new proposals
- **No deduplication**: Would flood users with duplicate proposals on frequently-modified files

---

### 3. File Content Analysis

**Decision**: Hybrid approach - metadata-first with optional content sampling

**Rationale**: Most file categorization can be done with filename patterns and extension. Content analysis is expensive and only needed for ambiguous cases.

**Analysis layers** (in order):

| Layer | Trigger | Method | Cost |
|-------|---------|--------|------|
| 1. Pattern matching | Always | Regex on filename | Negligible |
| 2. Extension mapping | Always | Lookup table | Negligible |
| 3. Text content | Text files < 1MB | Read first 4KB | Low |
| 4. PDF metadata | PDF files | pdf-parse first page | Medium |
| 5. LLM classification | Confidence < medium | Qwen3 prompt | High |

**Pattern matching examples**:
```typescript
const PATTERNS = {
  screenshot: /^(screenshot|screen shot|capture|snip)/i,
  invoice: /(invoice|receipt|bill|statement)/i,
  installer: /\.(exe|msi|dmg|deb|pkg|appimage)$/i,
};
```

**PDF handling**:
- Use `pdf-parse` to extract first page text (title, sender, date)
- Extract metadata (Author, Title, CreationDate)
- Limit to first 2 pages for performance

**Office file handling** (.xlsx, .pptx, .docx):
- These are ZIP archives with XML inside - cannot sample as text
- Classify by **filename patterns + extension defaults**:
  - `.pptx/.ppt` → `work` (high confidence) - presentations are almost always work
  - `.xlsx/.xls` → `work` (medium confidence) - spreadsheets default to work
  - `.docx/.doc` → `work` (low confidence) - needs filename refinement
- Filename patterns override extension defaults:
  - `budget.xlsx` → `finances`
  - `Resume.docx` → `personal`
  - `User Guide.docx` → `reference`
- No content extraction needed for initial implementation
- Future: optional `xlsx` package for deeper spreadsheet analysis

**Text content sampling**:
```typescript
async function sampleContent(filePath: string, maxBytes = 4096): Promise<string | null> {
  const stats = await stat(filePath);
  if (stats.size > 1_000_000) return null; // Skip files > 1MB

  const fd = await open(filePath, 'r');
  const buffer = Buffer.alloc(Math.min(maxBytes, stats.size));
  await fd.read(buffer, 0, buffer.length, 0);
  await fd.close();

  return buffer.toString('utf8');
}
```

**LLM classification prompt**:
```
Analyze this file for organization. File: {filename}, Size: {size}
Content preview: {preview}

Respond with JSON: { "category": string, "confidence": "low"|"medium"|"high", "reasoning": string }
Categories: finances, screenshots, installers, work, personal, reference, media, archives, code, misc
```

**Alternatives considered**:
- **Always use LLM**: Too slow for background processing, violates Resource Consciousness principle
- **Never use LLM**: Misses nuanced categorization opportunities

---

### 4. Startup Sequence

**Decision**: Ordered initialization with graceful degradation

**Sequence**:
```
1. Load configuration
   └─ Parse diana.config.ts
   └─ Validate watch directories exist

2. Initialize proposal storage
   └─ Load proposals.json from disk (or create empty)
   └─ Validate pending proposals (check source files still exist)
   └─ Mark invalid proposals whose source files are missing

3. Initialize proposal service
   └─ Create ProposalService with loaded state
   └─ Initialize file path index for deduplication

4. Register watcher tools
   └─ Create tool instances with ProposalService reference
   └─ Register with ToolRegistry

5. Start file watcher
   └─ Initialize chokidar with configured directories
   └─ Attach event handlers
   └─ Begin monitoring (does NOT scan existing files)

6. Ready state
   └─ Log startup to Obsidian
   └─ Accept chat interactions
```

**Graceful degradation**:
- If proposals.json is corrupted → Start with empty state, log warning
- If a watch directory doesn't exist → Skip it, log warning, continue with others
- If chokidar fails to initialize → Disable watcher, tools still work for manual proposal management

**Alternatives considered**:
- **Scan existing files on startup**: Violates Resource Consciousness (could generate hundreds of proposals)
- **Lazy initialization**: Adds complexity, makes debugging harder

---

### 5. Handling In-Progress File Writes

**Decision**: Stability detection with configurable delay

**Rationale**: Files being downloaded or written show size/mtime changes. We wait for stability before analysis.

**Implementation**:
```typescript
interface PendingFile {
  path: string;
  lastSize: number;
  lastMtime: number;
  stableAt?: number; // Timestamp when stability detected
}

const STABILITY_DELAY_MS = 3000; // Wait 3 seconds of no changes
const pendingFiles = new Map<string, PendingFile>();

// On file add/change event:
function onFileChange(filePath: string, stats: Stats) {
  const pending = pendingFiles.get(filePath);

  if (!pending) {
    // First detection - start tracking
    pendingFiles.set(filePath, {
      path: filePath,
      lastSize: stats.size,
      lastMtime: stats.mtimeMs,
    });
    scheduleStabilityCheck(filePath, STABILITY_DELAY_MS);
    return;
  }

  // File changed - reset stability timer
  pending.lastSize = stats.size;
  pending.lastMtime = stats.mtimeMs;
  pending.stableAt = undefined;
  scheduleStabilityCheck(filePath, STABILITY_DELAY_MS);
}

async function checkStability(filePath: string) {
  const pending = pendingFiles.get(filePath);
  if (!pending) return;

  const currentStats = await stat(filePath);
  if (currentStats.size === pending.lastSize &&
      currentStats.mtimeMs === pending.lastMtime) {
    // File is stable - proceed with analysis
    pendingFiles.delete(filePath);
    await analyzeFile(filePath);
  }
  // If not stable, another change event will have scheduled a new check
}
```

**Configuration**:
```typescript
interface WatcherConfig {
  stabilityDelayMs: number; // Default: 3000
  maxWaitMs: number;        // Default: 60000 (don't wait forever)
}
```

**Edge cases**:
- Very slow downloads → `maxWaitMs` timeout triggers analysis with available content
- Rapid modifications → Each modification resets the timer
- File deleted during wait → Remove from pending, no proposal generated

**Alternatives considered**:
- **Immediate processing**: Would analyze incomplete downloads
- **Lock file detection**: Complex and platform-dependent

---

## Dependency Evaluation

### chokidar

**Purpose**: File system watching
**Version**: `^4.0.0` (latest, ESM-compatible)
**License**: MIT
**Offline capable**: Yes (pure Node.js fs events)

**Why chokidar over native fs.watch**:
- Cross-platform consistency (WSL, Windows, macOS)
- Handles edge cases (atomic saves, recursive watching)
- Better performance with large directory trees
- Already specified in constitution's Technology Stack

**Configuration**:
```typescript
const watcher = chokidar.watch(paths, {
  ignored: /(^|[\/\\])\../, // Ignore dotfiles
  persistent: true,
  ignoreInitial: true,      // Don't emit events for existing files
  awaitWriteFinish: false,  // We handle stability ourselves
  depth: 1,                 // Don't recurse deeply (configurable)
});
```

### pdf-parse (optional)

**Purpose**: Extract text from PDFs for classification
**Version**: `^1.1.1`
**License**: MIT
**Offline capable**: Yes

**Trade-offs**:
- Adds ~2MB to dependencies
- Only needed if PDF classification is required
- Can be lazy-loaded on first PDF encounter

**Decision**: Include as optional peer dependency. Graceful degradation if not installed - PDFs analyzed by filename/extension only.

---

## Constitution Compliance Notes

| Principle | Status | Notes |
|-----------|--------|-------|
| Local-First Privacy | ✅ | All processing local, no cloud APIs |
| Human-in-the-Loop | ✅ | Proposals require explicit approval |
| Transparent Logging | ✅ | All actions logged to Obsidian |
| Simplicity | ✅ | Single process, event-driven, no IPC complexity |
| Test-First for Destructive | ⚠️ | File operations (approve) require tests first |
| Graceful Degradation | ✅ | Fallbacks for missing directories, corrupted state |
| Resource Consciousness | ✅ | Batched analysis, no startup scan, LLM only when needed |
| Predictable Behavior | ✅ | Pattern-first classification, documented rules |

---

## Open Questions Resolved

1. ✅ **Watcher-to-main communication**: In-process EventEmitter
2. ✅ **Duplicate prevention**: File path map with cooldown
3. ✅ **Content analysis**: Layered (pattern → extension → content → LLM)
4. ✅ **Startup sequence**: Load state → init service → register tools → start watcher
5. ✅ **In-progress files**: Stability detection with 3-second delay
6. ✅ **Recursive detection prevention**: Dedicated base path outside watched directories

---

## 6. Preventing Recursive Proposal Detection

**Decision**: All organized files go to a dedicated `basePath` folder that is NOT a watched directory.

**Rationale**: If we move files to a watched directory (e.g., Documents), they would be detected again, creating an infinite loop of proposals.

**Implementation**:

```typescript
// Configuration
const DEFAULT_BASE_PATH = '/mnt/c/Users/joshu/Organized';

// This folder is NEVER watched
const WATCHED_DIRECTORIES = [
  '/mnt/c/Users/joshu/Downloads',
  '/mnt/c/Users/joshu/Documents',
];

// Validation before creating proposal
function isValidDestination(dest: string, watchedDirs: string[]): boolean {
  for (const watched of watchedDirs) {
    // Destination cannot be inside a watched directory
    if (normalize(dest).startsWith(normalize(watched) + '/')) {
      return false;
    }
    if (normalize(dest) === normalize(watched)) {
      return false;
    }
  }
  return true;
}
```

**Organized folder structure**:
```
/mnt/c/Users/joshu/Organized/
├── Finances/
│   └── 2025/
├── Screenshots/
│   └── 2025/12/
├── Installers/
├── Work/
│   ├── ProjectA/
│   └── Misc/
├── Personal/
├── Reference/
├── Media/
├── Archives/
├── Code/
└── Misc/          ← Catchall for uncategorizable files
```

**Content-based document classification**:
Instead of a generic "Documents" category, files are classified by content:

| Category | Detection Keywords | Destination |
|----------|-------------------|-------------|
| Work | meeting, project, client, report | Organized/Work/{project}/ |
| Personal | letter, application, certificate | Organized/Personal/ |
| Reference | manual, guide, documentation | Organized/Reference/ |
| Finances | invoice, receipt, tax, budget | Organized/Finances/{year}/ |
| Misc | No patterns match | Organized/Misc/ |

**Alternatives considered**:
- **Subdirectories of watched folders**: Would require complex exclusion rules, easy to break
- **Generic "Documents" destination**: Would be a watched folder, causing recursion
