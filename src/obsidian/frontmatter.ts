/**
 * Frontmatter Handling for Obsidian Integration
 *
 * Feature: 001-obsidian-integration
 */

import matter from 'gray-matter';
import { format, formatISO } from 'date-fns';
import type {
  BaseFrontmatter,
  DailyLogFrontmatter,
  ObservationFrontmatter,
  ProposalFrontmatter,
  SystemFrontmatter,
  IndexFrontmatter,
  NoteType,
  ConfidenceLevel,
  ProposalStatus,
  SystemCategory,
  Severity,
} from '../types/obsidian.js';
import { CorruptedNoteError } from './errors.js';

// =============================================================================
// Date Formatting
// =============================================================================

/**
 * Format a date as ISO 8601 date string (YYYY-MM-DD)
 */
export function formatDate(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Format a date as ISO 8601 datetime string (YYYY-MM-DDTHH:mm:ss)
 */
export function formatDateTime(date: Date = new Date()): string {
  return formatISO(date, { representation: 'complete' }).slice(0, 19);
}

/**
 * Format a time string (HH:mm:ss)
 */
export function formatTime(date: Date = new Date()): string {
  return format(date, 'HH:mm:ss');
}

// =============================================================================
// Frontmatter Generation
// =============================================================================

/**
 * Create base frontmatter fields
 */
function createBaseFrontmatter(type: NoteType, tags: string[], date: Date = new Date()): BaseFrontmatter {
  return {
    type,
    date: formatDate(date),
    tags,
    created: formatDateTime(date),
  };
}

/**
 * Create frontmatter for a daily log note
 */
export function createDailyLogFrontmatter(date: Date = new Date()): DailyLogFrontmatter {
  return {
    ...createBaseFrontmatter('daily-log', ['diana', 'daily'], date),
    type: 'daily-log',
  };
}

/**
 * Create frontmatter for an observation note
 */
export function createObservationFrontmatter(
  options: {
    subject?: string;
    confidence?: ConfidenceLevel;
    tags?: string[];
    date?: Date;
  } = {}
): ObservationFrontmatter {
  const { subject, confidence = 'medium', tags = [], date = new Date() } = options;
  const allTags = ['diana', 'observation', ...tags];

  const frontmatter: ObservationFrontmatter = {
    ...createBaseFrontmatter('observation', allTags, date),
    type: 'observation',
    confidence,
  };

  // Only include subject if it's defined (avoid undefined in YAML)
  if (subject) {
    frontmatter.subject = subject;
  }

  return frontmatter;
}

/**
 * Create frontmatter for a proposal note
 */
export function createProposalFrontmatter(
  proposalId: string,
  action: string,
  confidence: ConfidenceLevel,
  options: {
    status?: ProposalStatus;
    tags?: string[];
    date?: Date;
  } = {}
): ProposalFrontmatter {
  const { status = 'pending', tags = [], date = new Date() } = options;
  const allTags = ['diana', 'proposal', ...tags];

  return {
    ...createBaseFrontmatter('proposal', allTags, date),
    type: 'proposal',
    proposalId,
    status,
    confidence,
    action,
  };
}

/**
 * Create frontmatter for a system note
 */
export function createSystemFrontmatter(
  category: SystemCategory,
  options: {
    severity?: Severity;
    tags?: string[];
    date?: Date;
  } = {}
): SystemFrontmatter {
  const { severity, tags = [], date = new Date() } = options;
  const allTags = ['diana', 'system', category, ...tags];

  const frontmatter: SystemFrontmatter = {
    ...createBaseFrontmatter('system', allTags, date),
    type: 'system',
    category,
  };

  if (severity) {
    frontmatter.severity = severity;
  }

  return frontmatter;
}

/**
 * Create frontmatter for the index note
 */
export function createIndexFrontmatter(
  noteCount?: number,
  date: Date = new Date()
): IndexFrontmatter {
  const frontmatter: IndexFrontmatter = {
    ...createBaseFrontmatter('index', ['diana', 'moc'], date),
    type: 'index',
    modified: formatDateTime(date),
  };

  if (noteCount !== undefined) {
    frontmatter.noteCount = noteCount;
  }

  return frontmatter;
}

// =============================================================================
// Frontmatter Serialization
// =============================================================================

/**
 * Serialize frontmatter and content to a Markdown string
 */
export function stringifyNote(frontmatter: BaseFrontmatter, content: string): string {
  return matter.stringify(content, frontmatter);
}

/**
 * Parse a Markdown note and extract frontmatter
 */
export function parseNote<T extends BaseFrontmatter>(
  fileContent: string,
  filePath: string
): { frontmatter: T; content: string } {
  try {
    const parsed = matter(fileContent);
    return {
      frontmatter: parsed.data as T,
      content: parsed.content,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown parse error';
    throw new CorruptedNoteError(filePath, message);
  }
}

/**
 * Update the modified timestamp in frontmatter
 */
export function updateModified<T extends BaseFrontmatter>(frontmatter: T, date: Date = new Date()): T {
  return {
    ...frontmatter,
    modified: formatDateTime(date),
  };
}

// =============================================================================
// Frontmatter Validation
// =============================================================================

/**
 * Check if frontmatter is valid YAML for Obsidian
 */
export function isValidFrontmatter(frontmatter: unknown): boolean {
  if (!frontmatter || typeof frontmatter !== 'object') {
    return false;
  }

  const fm = frontmatter as Record<string, unknown>;

  // Required fields
  if (typeof fm.type !== 'string') return false;
  if (typeof fm.date !== 'string') return false;
  if (!Array.isArray(fm.tags)) return false;
  if (typeof fm.created !== 'string') return false;

  // Validate date formats
  if (!isValidISODate(fm.date as string)) return false;
  if (!isValidISODateTime(fm.created as string)) return false;
  if (fm.modified && !isValidISODateTime(fm.modified as string)) return false;

  // Validate tags array
  if (!fm.tags.every((tag: unknown) => typeof tag === 'string')) return false;

  return true;
}

/**
 * Check if a string is a valid ISO 8601 date (YYYY-MM-DD)
 */
function isValidISODate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Check if a string is a valid ISO 8601 datetime (YYYY-MM-DDTHH:mm:ss)
 */
function isValidISODateTime(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value);
}

// =============================================================================
// Corrupted Frontmatter Recovery
// =============================================================================

/**
 * Detect if a file has corrupted frontmatter (invalid YAML)
 * Returns true if the frontmatter is corrupted
 */
export function hasCorruptedFrontmatter(fileContent: string): boolean {
  try {
    const parsed = matter(fileContent);
    return !isValidFrontmatter(parsed.data);
  } catch {
    return true;
  }
}

/**
 * Attempt to extract content from a note with corrupted frontmatter
 * Returns the content without frontmatter, or empty string if extraction fails
 */
export function extractContentFromCorrupted(fileContent: string): string {
  // Try to find the end of frontmatter (---)
  const lines = fileContent.split('\n');
  let inFrontmatter = false;
  let contentStartIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '---') {
      if (!inFrontmatter) {
        inFrontmatter = true;
      } else {
        contentStartIndex = i + 1;
        break;
      }
    }
  }

  if (contentStartIndex > 0) {
    return lines.slice(contentStartIndex).join('\n').trim();
  }

  // No frontmatter delimiters found, return original content
  return fileContent;
}

/**
 * Recreate a daily log note from scratch when frontmatter is corrupted
 * Preserves the content but creates new valid frontmatter
 */
export function recreateDailyLogFromCorrupted(
  corruptedContent: string,
  date: Date = new Date()
): string {
  const content = extractContentFromCorrupted(corruptedContent);
  const frontmatter = createDailyLogFrontmatter(date);
  return stringifyNote(frontmatter, content);
}
