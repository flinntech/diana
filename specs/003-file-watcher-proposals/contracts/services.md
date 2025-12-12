# Service Interfaces Contract

**Feature**: 003-file-watcher-proposals
**Date**: 2025-12-11

Internal service interfaces for the watcher/proposal system.

---

## ProposalService

Manages proposal lifecycle and persistence.

```typescript
interface IProposalService {
  // Lifecycle
  initialize(): Promise<void>;
  shutdown(): Promise<void>;

  // Create proposals (called by watcher)
  createFromAnalysis(analysis: FileAnalysis): Promise<Proposal>;

  // Query proposals
  getAll(): Proposal[];
  getPending(): Proposal[];
  getById(id: string): Proposal | undefined;
  getBySourcePath(path: string): Proposal | undefined;
  hasPendingForPath(path: string): boolean;

  // Modify proposals
  approve(id: string, confirmSensitive?: boolean): Promise<ApproveResult>;
  reject(id: string, reason?: string): Promise<RejectResult>;
  invalidate(id: string, reason: string): void;
  clearAllPending(): number;

  // Batch operations
  approveAll(includeSensitive?: boolean): Promise<BatchApproveResult>;

  // Cooldown management
  isOnCooldown(path: string): boolean;

  // Persistence
  save(): Promise<void>;
}

interface ApproveResult {
  success: boolean;
  sourcePath?: string;
  destinationPath?: string;
  error?: string;
}

interface RejectResult {
  success: boolean;
  cooldownUntil?: Date;
  error?: string;
}

interface BatchApproveResult {
  approved: number;
  skipped: number;
  failed: number;
  errors: string[];
}
```

### Events

```typescript
// ProposalService extends EventEmitter
interface ProposalServiceEvents {
  'proposal:created': (proposal: Proposal) => void;
  'proposal:approved': (proposal: Proposal, result: ApproveResult) => void;
  'proposal:rejected': (proposal: Proposal) => void;
  'proposal:invalidated': (proposal: Proposal, reason: string) => void;
}
```

---

## WatcherService

Monitors file system and coordinates with ProposalService.

```typescript
interface IWatcherService {
  // Lifecycle
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;

  // Directory management
  addDirectory(path: string, options?: WatchOptions): Promise<void>;
  removeDirectory(path: string): Promise<void>;
  getWatchedDirectories(): WatchedDirectory[];

  // Configuration
  getConfig(): WatcherConfig;
  updateConfig(updates: Partial<WatcherConfig>): void;
}

interface WatchOptions {
  recursive?: boolean;
  enabled?: boolean;
}
```

### Events

```typescript
// WatcherService extends EventEmitter
interface WatcherServiceEvents {
  'file:detected': (path: string, stats: Stats) => void;
  'file:stable': (path: string) => void;
  'file:analyzed': (analysis: FileAnalysis) => void;
  'file:error': (path: string, error: Error) => void;
  'watcher:started': () => void;
  'watcher:stopped': () => void;
  'directory:added': (path: string) => void;
  'directory:removed': (path: string) => void;
}
```

---

## FileAnalyzer

Analyzes detected files to determine categorization.

```typescript
interface IFileAnalyzer {
  // Main analysis entry point
  analyze(path: string): Promise<FileAnalysis>;

  // Individual analysis methods (exposed for testing)
  matchPatterns(filename: string): PatternMatch[];
  getExtensionCategory(extension: string): FileCategory | null;
  extractTextContent(path: string, maxBytes: number): Promise<string | null>;
  extractPdfMetadata(path: string): Promise<PdfMetadata | null>;
  classifyWithLlm(context: LlmClassificationContext): Promise<LlmClassificationResult>;

  // Sensitivity detection
  checkSensitivity(filename: string, content?: string): SensitivityResult;
}

interface PatternMatch {
  pattern: string;
  category: FileCategory;
  confidence: ConfidenceLevel;
}

interface LlmClassificationContext {
  filename: string;
  extension: string;
  size: number;
  contentPreview?: string;
  pdfMetadata?: PdfMetadata;
}

interface LlmClassificationResult {
  category: FileCategory;
  confidence: ConfidenceLevel;
  reasoning: string;
}

interface SensitivityResult {
  sensitive: boolean;
  reason?: string;
  matchedPattern?: string;
}
```

---

## ProposalStore

Persistence layer for proposals.

```typescript
interface IProposalStore {
  // Load/save
  load(): Promise<StoreData>;
  save(data: StoreData): Promise<void>;

  // File path
  readonly filePath: string;
}

interface StoreData {
  version: number;
  lastModified: string;
  proposals: SerializedProposal[];
  cooldowns: Record<string, string>; // path → ISO date
}

interface SerializedProposal {
  id: string;
  createdAt: string;
  sourcePath: string;
  sourceFilename: string;
  sourceSize: number;
  sourceMtime: number;
  action: ProposalAction;
  destinationPath: string;
  category: FileCategory;
  confidence: ConfidenceLevel;
  reasoning: string;
  sensitive: boolean;
  sensitiveReason?: string;
  status: ProposalStatus;
  resolvedAt?: string;
  executionError?: string;
}
```

---

## DestinationResolver

Determines destination paths for files.

**Critical Rule**: Destinations must be OUTSIDE watched directories to prevent recursive proposals.

```typescript
interface IDestinationResolver {
  // Main entry point
  resolve(analysis: FileAnalysis): DestinationResult | null;

  // Validation
  isValidDestination(dest: string): boolean;
  getWatchedDirectories(): string[];

  // Category-specific resolution
  resolveFinances(analysis: FileAnalysis): string;
  resolveScreenshots(analysis: FileAnalysis): string;
  resolveInstallers(analysis: FileAnalysis): string;
  resolveWork(analysis: FileAnalysis): string;
  resolvePersonal(analysis: FileAnalysis): string;
  resolveReference(analysis: FileAnalysis): string;
  resolveMisc(analysis: FileAnalysis): string;
}

interface DestinationResult {
  path: string;
  action: ProposalAction;
  reasoning: string;
}

interface DestinationConfig {
  basePath: string;  // Must be OUTSIDE watched directories
  watchedDirectories: string[];
}
```

### Default Destination Mapping

All destinations are under a dedicated "Organized" folder to prevent recursive watching:

```typescript
// Base path OUTSIDE watched directories
const DEFAULT_BASE_PATH = '/mnt/c/Users/joshu/Organized';

const DEFAULT_DESTINATIONS: Record<FileCategory, string> = {
  // Financial - organized by year
  finances: '{basePath}/Finances/{year}/',

  // Screenshots - organized by year/month
  screenshots: '{basePath}/Screenshots/{year}/{month}/',

  // Installers - flat
  installers: '{basePath}/Installers/',

  // Work documents - by detected project or Misc
  work: '{basePath}/Work/{project|Misc}/',

  // Personal documents
  personal: '{basePath}/Personal/',

  // Reference materials (manuals, guides)
  reference: '{basePath}/Reference/',

  // Media files (non-screenshot images, videos)
  media: '{basePath}/Media/{year}/',

  // Archives
  archives: '{basePath}/Archives/',

  // Code/configs
  code: '{basePath}/Code/',

  // Catchall for uncategorizable files
  misc: '{basePath}/Misc/',
};
```

### Destination Validation

```typescript
function isValidDestination(dest: string, watchedDirs: string[]): boolean {
  const normalizedDest = normalize(dest);

  for (const watched of watchedDirs) {
    const normalizedWatched = normalize(watched);

    // Cannot be the watched directory itself
    if (normalizedDest === normalizedWatched) return false;

    // Cannot be inside a watched directory (would trigger re-detection)
    if (normalizedDest.startsWith(normalizedWatched + '/')) return false;
  }

  return true;
}
```

---

## Integration Flow

```
                    ┌──────────────────┐
                    │  WatcherService  │
                    │  (chokidar)      │
                    └────────┬─────────┘
                             │ file:stable event
                             ▼
                    ┌──────────────────┐
                    │  FileAnalyzer    │
                    │  (patterns, LLM) │
                    └────────┬─────────┘
                             │ FileAnalysis
                             ▼
                    ┌──────────────────┐
                    │DestinationResolver│
                    │                  │
                    └────────┬─────────┘
                             │ DestinationResult
                             ▼
                    ┌──────────────────┐
                    │ ProposalService  │
                    │ createFromAnalysis│
                    └────────┬─────────┘
                             │ Proposal
                             ▼
┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ ProposalStore│◀───│  ProposalService │───▶│  ObsidianWriter  │
│ (JSON file)  │    │  (memory + disk) │    │  (audit log)     │
└──────────────┘    └────────┬─────────┘    └──────────────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  ToolRegistry    │
                    │  (proposal tools)│
                    └────────┬─────────┘
                             │ tool calls
                             ▼
                    ┌──────────────────┐
                    │    Session       │
                    │  (LLM chat)      │
                    └──────────────────┘
```
