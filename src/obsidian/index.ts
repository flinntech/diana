/**
 * Obsidian Integration Module Exports
 *
 * Feature: 001-obsidian-integration
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
} from '../types/obsidian.js';
