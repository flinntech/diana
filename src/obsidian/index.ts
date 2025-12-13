/**
 * Obsidian Integration Module Exports
 *
 * Features: 001-obsidian-integration, 006-obsidian-rich-linking
 */

// Main writer class
export { ObsidianWriter } from './writer.js';

// Templates
export {
  generateDailyLogTemplate,
  generateActivityEntry,
  generateObservationTemplate,
  generateProposalTemplate,
  generateSystemTemplate,
  generateIndexTemplate,
  generateWikilink,
  generateBidirectionalLinks,
  TemplateGenerator,
  // 006-obsidian-rich-linking additions
  generateBacklinksSection,
  updateBacklinksSection,
  extractBacklinksFromContent,
  hasBacklinksSection,
  generateConversationAnchorTemplate,
  generateWeeklyRollupTemplate,
  generateMonthlyRollupTemplate,
} from './templates.js';

// Frontmatter utilities
export {
  formatDate,
  formatDateTime,
  formatTime,
  createDailyLogFrontmatter,
  createObservationFrontmatter,
  createProposalFrontmatter,
  createSystemFrontmatter,
  createIndexFrontmatter,
  stringifyNote,
  parseNote,
  updateModified,
  isValidFrontmatter,
  hasCorruptedFrontmatter,
  extractContentFromCorrupted,
  recreateDailyLogFromCorrupted,
} from './frontmatter.js';

// Path utilities
export {
  PathResolver,
  toWikilink,
  fromWikilink,
  getRelativePath,
} from './paths.js';

// Link management (006-obsidian-rich-linking)
export {
  LinkManager,
  normalizePath,
  removeCodeBlocks,
  validateWikiLinkPath,
} from './link-manager.js';

// Vault migration (006-obsidian-rich-linking)
export {
  VaultMigrator,
  createVaultMigrator,
} from './vault-migrator.js';
export type {
  MigrationResult,
  ValidationResult,
  RepairResult,
} from './vault-migrator.js';

// Rollup generation (006-obsidian-rich-linking)
export {
  RollupGenerator,
  createRollupGenerator,
} from './rollup-generator.js';
export type {
  RollupResult,
} from './rollup-generator.js';

// Error classes
export {
  ObsidianWriteError,
  VaultNotFoundError,
  VaultNotWritableError,
  WriteConflictError,
  CorruptedNoteError,
  LockTimeoutError,
  DiskFullError,
  isObsidianError,
  fromSystemError,
  // 006-obsidian-rich-linking additions
  InvalidWikiLinkError,
  BacklinkUpdateError,
  MigrationError,
} from './errors.js';

// Re-export types
export type {
  IObsidianWriter,
  ObsidianWriterConfig,
  DailyLogInput,
  ObservationInput,
  ProposalInput,
  SystemNoteInput,
  WriteResult,
  WriteSuccess,
  WriteFailure,
  VaultStats,
  IndexSections,
  NoteType,
  ConfidenceLevel,
  ProposalStatus,
  SystemCategory,
  Severity,
  BaseFrontmatter,
  DailyLogFrontmatter,
  ObservationFrontmatter,
  ProposalFrontmatter,
  SystemFrontmatter,
  IndexFrontmatter,
  // 006-obsidian-rich-linking additions
  WikiLink,
  NoteReferences,
  BacklinksUpdateResult,
  QueuedBacklinkUpdate,
  RollupStats,
  RollupPeriod,
  WeeklyRollupFrontmatter,
  MonthlyRollupFrontmatter,
  ConversationAnchorFrontmatter,
  ConversationAnchorInput,
  KeyFactWithProvenance,
} from '../types/obsidian.js';

// Re-export backlink markers (006-obsidian-rich-linking)
export {
  BACKLINKS_MARKER_START,
  BACKLINKS_MARKER_END,
  BACKLINKS_HEADING,
} from '../types/obsidian.js';
