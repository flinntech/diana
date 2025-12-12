# Data Model: File Watcher & Proposals

**Feature**: 003-file-watcher-proposals
**Date**: 2025-12-11

---

## Entities

### Proposal

The core entity representing a suggested file organization action.

```typescript
interface Proposal {
  // Identity
  id: string;                     // UUID v4, e.g. "a1b2c3d4-..."
  createdAt: Date;                // When proposal was generated

  // Source file info (snapshot at detection time)
  sourcePath: string;             // Absolute path, e.g. "/mnt/c/Users/joshu/Downloads/invoice.pdf"
  sourceFilename: string;         // Basename, e.g. "invoice.pdf"
  sourceSize: number;             // Bytes
  sourceMtime: number;            // Unix timestamp ms (for staleness detection)

  // Proposed action
  action: ProposalAction;         // 'move' | 'rename' | 'move_and_rename'
  destinationPath: string;        // Absolute path to destination

  // Classification
  category: FileCategory;         // Detected category
  confidence: ConfidenceLevel;    // 'low' | 'medium' | 'high'
  reasoning: string;              // Human-readable explanation

  // Flags
  sensitive: boolean;             // Requires extra confirmation
  sensitiveReason?: string;       // Why flagged as sensitive

  // State
  status: ProposalStatus;         // 'pending' | 'approved' | 'rejected' | 'invalid'
  resolvedAt?: Date;              // When approved/rejected/invalidated
  executionError?: string;        // If execution failed
}

type ProposalAction = 'move' | 'rename' | 'move_and_rename';
type ProposalStatus = 'pending' | 'approved' | 'rejected' | 'invalid';
type ConfidenceLevel = 'low' | 'medium' | 'high';
type FileCategory =
  | 'finances'      // Invoices, receipts, tax documents, budgets
  | 'screenshots'   // Screen captures
  | 'installers'    // Executables, packages
  | 'work'          // Work/business documents (detected by content/project name)
  | 'personal'      // Personal documents (letters, forms, IDs)
  | 'reference'     // Manuals, guides, reference PDFs
  | 'media'         // Images, videos, audio (non-screenshot)
  | 'archives'      // ZIP, TAR, etc.
  | 'code'          // Source files, configs
  | 'misc';         // Catchall for truly uncategorizable files
```

**Validation rules**:
- `id` must be valid UUID v4
- `sourcePath` must be absolute path
- `destinationPath` must be absolute path and different from `sourcePath`
- `confidence` required for all proposals
- `reasoning` must be non-empty string
- `sensitive` defaults to `false`

**State transitions**:
```
                     ┌──────────────┐
                     │   pending    │
                     └──────┬───────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
         ▼                  ▼                  ▼
┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│    approved    │ │    rejected    │ │    invalid     │
│  (file moved)  │ │  (no action)   │ │ (source gone)  │
└────────────────┘ └────────────────┘ └────────────────┘
```

---

### WatchedDirectory

A directory configured for file monitoring.

```typescript
interface WatchedDirectory {
  path: string;                   // Absolute path to directory
  enabled: boolean;               // Whether actively monitoring
  recursive: boolean;             // Watch subdirectories (default: false)
  addedAt: Date;                  // When added to watch list
  lastEventAt?: Date;             // Last file event detected
}
```

**Validation rules**:
- `path` must be absolute path
- `path` must exist and be a directory
- `path` must be readable

**Default directories**:
```typescript
const DEFAULT_WATCHED_DIRECTORIES: WatchedDirectory[] = [
  { path: '/mnt/c/Users/joshu/Downloads', enabled: true, recursive: false, addedAt: new Date() },
  { path: '/mnt/c/Users/joshu/Documents', enabled: true, recursive: false, addedAt: new Date() },
];
```

---

### FileAnalysis

Result of analyzing a detected file.

```typescript
interface FileAnalysis {
  // File identification
  path: string;                   // Absolute path
  filename: string;               // Basename
  extension: string;              // Lowercase, without dot, e.g. "pdf"
  size: number;                   // Bytes
  mtime: number;                  // Unix timestamp ms

  // Pattern detection
  matchedPatterns: string[];      // Pattern names that matched, e.g. ["screenshot", "dated"]

  // Content analysis (optional)
  contentPreview?: string;        // First 4KB of text content
  pdfMetadata?: PdfMetadata;      // Extracted PDF info

  // Classification result
  suggestedCategory: FileCategory;
  suggestedDestination: string;   // Full suggested path
  confidence: ConfidenceLevel;
  reasoning: string;

  // Sensitivity detection
  sensitive: boolean;
  sensitiveReason?: string;

  // Analysis metadata
  analyzedAt: Date;
  analysisMethod: AnalysisMethod; // How classification was determined
}

type AnalysisMethod =
  | 'pattern'      // Filename pattern matching only
  | 'extension'    // Extension-based lookup
  | 'content'      // Text content analysis
  | 'pdf'          // PDF metadata extraction
  | 'llm';         // LLM classification

interface PdfMetadata {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  creationDate?: Date;
  pageCount?: number;
  firstPageText?: string;         // First 500 chars
}
```

**Note**: `FileAnalysis` is a transient object, not persisted. It exists only during the analysis pipeline.

---

### ProposalStore

Persistent storage interface for proposals.

```typescript
interface ProposalStore {
  // State
  readonly proposals: Map<string, Proposal>;
  readonly pendingByPath: Map<string, string>;  // sourcePath → proposalId
  readonly cooldowns: Map<string, Date>;        // sourcePath → rejectTime

  // CRUD
  add(proposal: Proposal): void;
  get(id: string): Proposal | undefined;
  update(id: string, updates: Partial<Proposal>): void;
  remove(id: string): void;

  // Queries
  getPending(): Proposal[];
  getByPath(sourcePath: string): Proposal | undefined;
  hasPendingForPath(sourcePath: string): boolean;
  isOnCooldown(sourcePath: string): boolean;

  // Persistence
  save(): Promise<void>;
  load(): Promise<void>;
}
```

**Persistence format** (`/home/diana/proposals.json`):
```json
{
  "version": 1,
  "lastModified": "2025-12-11T10:30:00Z",
  "proposals": [
    {
      "id": "a1b2c3d4-...",
      "createdAt": "2025-12-11T10:00:00Z",
      "sourcePath": "/mnt/c/Users/joshu/Downloads/invoice.pdf",
      "sourceFilename": "invoice.pdf",
      "sourceSize": 102400,
      "sourceMtime": 1733913600000,
      "action": "move",
      "destinationPath": "/mnt/c/Users/joshu/Documents/Finances/2025/invoice.pdf",
      "category": "finances",
      "confidence": "high",
      "reasoning": "PDF contains 'Invoice' in filename and content mentions billing",
      "sensitive": true,
      "sensitiveReason": "Contains financial information",
      "status": "pending"
    }
  ],
  "cooldowns": {
    "/mnt/c/Users/joshu/Downloads/notes.txt": "2025-12-12T10:00:00Z"
  }
}
```

---

### WatcherConfig

Configuration for the file watcher service.

```typescript
interface WatcherConfig {
  // Directories to watch
  directories: WatchedDirectory[];

  // Stability detection
  stabilityDelayMs: number;       // Default: 3000
  maxStabilityWaitMs: number;     // Default: 60000

  // Debouncing
  cooldownHours: number;          // Hours before re-proposing rejected file (default: 24)

  // Analysis
  maxContentPreviewBytes: number; // Default: 4096
  maxFileSizeForContent: number;  // Default: 10MB
  enableLlmClassification: boolean; // Default: true

  // Proposal storage
  proposalStorePath: string;      // Default: /home/diana/proposals.json

  // Patterns
  ignoredPatterns: RegExp[];      // Files to never analyze
}

const DEFAULT_WATCHER_CONFIG: WatcherConfig = {
  directories: DEFAULT_WATCHED_DIRECTORIES,
  stabilityDelayMs: 3000,
  maxStabilityWaitMs: 60000,
  cooldownHours: 24,
  maxContentPreviewBytes: 4096,
  maxFileSizeForContent: 10_000_000,
  enableLlmClassification: true,
  proposalStorePath: '/home/diana/proposals.json',
  ignoredPatterns: [
    /^\./,                        // Dotfiles
    /\.tmp$/i,                    // Temp files
    /\.part$/i,                   // Partial downloads
    /~$/,                         // Backup files
    /\.crdownload$/i,             // Chrome downloads in progress
  ],
};
```

---

## Relationships

```
┌─────────────────────┐          ┌─────────────────────┐
│  WatchedDirectory   │          │    WatcherConfig    │
│  ─────────────────  │◀─────────│  ─────────────────  │
│  path               │ contains │  directories[]      │
│  enabled            │          │  stabilityDelayMs   │
│  recursive          │          │  ...                │
└─────────────────────┘          └─────────────────────┘
         │
         │ monitors
         ▼
┌─────────────────────┐          ┌─────────────────────┐
│   File (detected)   │──────────▶│   FileAnalysis     │
│   ───────────────   │ analyzed │  ─────────────────  │
│   path              │    to    │  path               │
│   stats             │          │  suggestedCategory  │
│                     │          │  confidence         │
└─────────────────────┘          └─────────────────────┘
                                          │
                                          │ generates
                                          ▼
                                 ┌─────────────────────┐
                                 │      Proposal       │
                                 │  ─────────────────  │
                                 │  id                 │
                                 │  sourcePath         │
                                 │  destinationPath    │
                                 │  status             │
                                 └─────────────────────┘
                                          │
                                          │ stored in
                                          ▼
                                 ┌─────────────────────┐
                                 │   ProposalStore     │
                                 │  ─────────────────  │
                                 │  proposals.json     │
                                 └─────────────────────┘
```

---

## Indexes

For efficient lookups, the ProposalStore maintains in-memory indexes:

| Index | Key | Value | Purpose |
|-------|-----|-------|---------|
| `pendingByPath` | `sourcePath` | `proposalId` | Deduplicate pending proposals |
| `cooldowns` | `sourcePath` | `Date` | Skip recently rejected files |

---

## Destination Rules

**Critical**: Destinations must NOT be watched directories (to prevent recursive proposals).

### Destination Resolution Logic

```typescript
interface DestinationConfig {
  // Base paths for organization (OUTSIDE watched directories)
  basePath: string;                    // e.g., "/mnt/c/Users/joshu/Organized"

  // Category-specific subdirectories
  categoryPaths: Record<FileCategory, string>;
}

const DEFAULT_DESTINATIONS: Record<FileCategory, string> = {
  // Financial documents - organized by year
  finances: '{basePath}/Finances/{year}/',

  // Screenshots - organized by year/month
  screenshots: '{basePath}/Screenshots/{year}/{month}/',

  // Installers - flat folder
  installers: '{basePath}/Installers/',

  // Work documents - can be further organized by detected project
  work: '{basePath}/Work/{project|Misc}/',

  // Personal documents
  personal: '{basePath}/Personal/',

  // Reference materials (manuals, guides)
  reference: '{basePath}/Reference/',

  // Media files
  media: '{basePath}/Media/{year}/',

  // Archives
  archives: '{basePath}/Archives/',

  // Code/configs
  code: '{basePath}/Code/',

  // Catchall for uncategorizable
  misc: '{basePath}/Misc/',
};
```

### Preventing Recursive Proposals

The system MUST enforce these rules:

1. **Destination validation**: Before creating a proposal, verify:
   ```typescript
   function isValidDestination(dest: string, watchedDirs: string[]): boolean {
     // Destination must not be a watched directory
     for (const watched of watchedDirs) {
       if (dest.startsWith(watched + '/') || dest === watched) {
         // Exception: subdirectories of watched dirs are OK if not recursive
         // But root of watched dir is NEVER valid
         if (dest === watched) return false;
       }
     }
     return true;
   }
   ```

2. **Same-location check**: Never propose moving a file to its current location
   ```typescript
   if (normalize(sourcePath) === normalize(destinationPath)) {
     // Skip - no proposal needed
     return null;
   }
   ```

3. **Parent directory check**: Don't propose moving to parent of watched dir
   ```typescript
   // If Downloads is watched, don't propose moving TO Downloads
   for (const watched of watchedDirs) {
     if (destinationPath.startsWith(watched)) {
       // Invalid - would trigger re-detection
       return null;
     }
   }
   ```

### Default Base Path

```typescript
// Default organized folder (OUTSIDE watched directories)
const DEFAULT_BASE_PATH = '/mnt/c/Users/joshu/Organized';

// This creates structure like:
// /mnt/c/Users/joshu/Organized/
// ├── Finances/
// │   └── 2025/
// ├── Screenshots/
// │   └── 2025/
// │       └── 12/
// ├── Work/
// │   ├── ProjectA/
// │   └── Misc/
// ├── Personal/
// ├── Reference/
// ├── Media/
// ├── Archives/
// ├── Code/
// └── Misc/
```

---

## Extension-Based Classification

For files where content cannot be easily extracted (binary formats, Office files):

```typescript
const EXTENSION_DEFAULTS: Record<string, { category: FileCategory; confidence: ConfidenceLevel }> = {
  // Office documents - default to work, refine by filename patterns
  xlsx: { category: 'work', confidence: 'medium' },   // Spreadsheets
  xls:  { category: 'work', confidence: 'medium' },
  pptx: { category: 'work', confidence: 'high' },     // Presentations are almost always work
  ppt:  { category: 'work', confidence: 'high' },
  docx: { category: 'work', confidence: 'low' },      // Word docs need filename analysis
  doc:  { category: 'work', confidence: 'low' },

  // Installers
  exe:  { category: 'installers', confidence: 'high' },
  msi:  { category: 'installers', confidence: 'high' },
  dmg:  { category: 'installers', confidence: 'high' },
  deb:  { category: 'installers', confidence: 'high' },
  pkg:  { category: 'installers', confidence: 'high' },
  appimage: { category: 'installers', confidence: 'high' },

  // Archives
  zip:  { category: 'archives', confidence: 'high' },
  tar:  { category: 'archives', confidence: 'high' },
  gz:   { category: 'archives', confidence: 'high' },
  '7z': { category: 'archives', confidence: 'high' },
  rar:  { category: 'archives', confidence: 'high' },

  // Code
  ts:   { category: 'code', confidence: 'high' },
  js:   { category: 'code', confidence: 'high' },
  py:   { category: 'code', confidence: 'high' },
  json: { category: 'code', confidence: 'medium' },
  yaml: { category: 'code', confidence: 'medium' },
  yml:  { category: 'code', confidence: 'medium' },

  // Media
  mp4:  { category: 'media', confidence: 'high' },
  mov:  { category: 'media', confidence: 'high' },
  avi:  { category: 'media', confidence: 'high' },
  mp3:  { category: 'media', confidence: 'high' },
  wav:  { category: 'media', confidence: 'high' },
  jpg:  { category: 'media', confidence: 'medium' },  // Could be screenshot
  jpeg: { category: 'media', confidence: 'medium' },
  png:  { category: 'media', confidence: 'medium' },  // Could be screenshot
  gif:  { category: 'media', confidence: 'high' },
};
```

**Office file classification logic**:
1. Check extension → get default category
2. Apply filename patterns to refine:
   - `budget|expense|invoice` in .xlsx → `finances` (override)
   - `meeting|project|client` in .xlsx/.pptx → `work` (confirm)
   - `resume|cv` in .docx → `personal` (override)
3. If no patterns match, use extension default

```typescript
// Example: Office file refinement
function classifyOfficeFile(filename: string, ext: string): FileCategory {
  const defaultCat = EXTENSION_DEFAULTS[ext]?.category ?? 'misc';

  // Check for finance keywords (override to finances)
  if (/budget|expense|invoice|receipt|tax/i.test(filename)) {
    return 'finances';
  }

  // Check for personal keywords (override to personal)
  if (/resume|cv|letter|application/i.test(filename)) {
    return 'personal';
  }

  // Check for reference keywords (override to reference)
  if (/manual|guide|handbook|template/i.test(filename)) {
    return 'reference';
  }

  return defaultCat; // 'work' for xlsx/pptx, pattern-based for docx
}
```

---

## Document Classification Heuristics

For content-based document classification (text files, PDFs):

```typescript
const DOCUMENT_PATTERNS = {
  // Work documents
  work: [
    /meeting|agenda|minutes|proposal|report|presentation/i,
    /project|client|deadline|deliverable/i,
    /contract|agreement|nda|sow/i,
  ],

  // Personal documents
  personal: [
    /letter|correspondence|application|resume|cv/i,
    /form|registration|application/i,
    /certificate|diploma|license/i,
  ],

  // Reference materials
  reference: [
    /manual|guide|handbook|documentation/i,
    /tutorial|howto|instructions/i,
    /reference|spec|specification/i,
  ],

  // Financial (already defined)
  finances: [
    /invoice|receipt|bill|statement/i,
    /tax|w-?2|1099|budget/i,
    /payment|transaction|expense/i,
  ],
};

// If no patterns match → category = 'misc'
```

---

## Sensitive File Patterns

Files matching these patterns are flagged as `sensitive`:

```typescript
const SENSITIVE_PATTERNS = [
  // Financial
  /tax|w-?2|1099|invoice|receipt|statement|budget/i,

  // Personal identity
  /passport|driver.?license|ssn|social.?security/i,

  // Credentials
  /password|credential|secret|\.pem$|\.key$/i,

  // Medical
  /medical|prescription|health|insurance/i,
];
```
