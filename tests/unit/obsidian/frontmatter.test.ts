/**
 * Unit Tests for Frontmatter Utilities
 *
 * Feature: 001-obsidian-integration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mockDate, restoreDate } from '../../setup.js';
import {
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
} from '../../../src/obsidian/frontmatter.js';

describe('Date Formatting', () => {
  beforeEach(() => {
    mockDate('2025-12-10T14:30:45');
  });

  afterEach(() => {
    restoreDate();
  });

  describe('formatDate', () => {
    it('formats date as ISO 8601 date string', () => {
      expect(formatDate()).toBe('2025-12-10');
    });

    it('formats custom date', () => {
      const customDate = new Date('2025-06-15T10:00:00');
      expect(formatDate(customDate)).toBe('2025-06-15');
    });
  });

  describe('formatDateTime', () => {
    it('formats date as ISO 8601 datetime string', () => {
      expect(formatDateTime()).toBe('2025-12-10T14:30:45');
    });

    it('formats custom datetime', () => {
      const customDate = new Date('2025-06-15T10:30:00');
      expect(formatDateTime(customDate)).toBe('2025-06-15T10:30:00');
    });
  });

  describe('formatTime', () => {
    it('formats time as HH:mm:ss', () => {
      expect(formatTime()).toBe('14:30:45');
    });
  });
});

describe('Frontmatter Generation', () => {
  beforeEach(() => {
    mockDate('2025-12-10T14:30:00');
  });

  afterEach(() => {
    restoreDate();
  });

  describe('createDailyLogFrontmatter', () => {
    it('creates correct frontmatter structure', () => {
      const fm = createDailyLogFrontmatter();
      expect(fm.type).toBe('daily-log');
      expect(fm.date).toBe('2025-12-10');
      expect(fm.tags).toContain('diana');
      expect(fm.tags).toContain('daily');
      expect(fm.created).toBe('2025-12-10T14:30:00');
    });

    it('uses custom date', () => {
      const customDate = new Date('2025-12-09T10:00:00');
      const fm = createDailyLogFrontmatter(customDate);
      expect(fm.date).toBe('2025-12-09');
    });
  });

  describe('createObservationFrontmatter', () => {
    it('creates correct frontmatter structure', () => {
      const fm = createObservationFrontmatter({
        subject: '/Downloads',
        confidence: 'high',
        tags: ['patterns'],
      });
      expect(fm.type).toBe('observation');
      expect(fm.subject).toBe('/Downloads');
      expect(fm.confidence).toBe('high');
      expect(fm.tags).toContain('diana');
      expect(fm.tags).toContain('observation');
      expect(fm.tags).toContain('patterns');
    });

    it('defaults confidence to medium', () => {
      const fm = createObservationFrontmatter({});
      expect(fm.confidence).toBe('medium');
    });

    it('omits subject when undefined', () => {
      const fm = createObservationFrontmatter({});
      expect(fm.subject).toBeUndefined();
    });
  });

  describe('createProposalFrontmatter', () => {
    it('creates correct frontmatter structure', () => {
      const fm = createProposalFrontmatter('organize-downloads', 'move', 'high');
      expect(fm.type).toBe('proposal');
      expect(fm.proposalId).toBe('organize-downloads');
      expect(fm.action).toBe('move');
      expect(fm.confidence).toBe('high');
      expect(fm.status).toBe('pending');
    });

    it('allows custom status', () => {
      const fm = createProposalFrontmatter('test', 'delete', 'medium', { status: 'approved' });
      expect(fm.status).toBe('approved');
    });
  });

  describe('createSystemFrontmatter', () => {
    it('creates correct frontmatter structure', () => {
      const fm = createSystemFrontmatter('startup');
      expect(fm.type).toBe('system');
      expect(fm.category).toBe('startup');
      expect(fm.tags).toContain('diana');
      expect(fm.tags).toContain('system');
      expect(fm.tags).toContain('startup');
    });

    it('includes severity when provided', () => {
      const fm = createSystemFrontmatter('error', { severity: 'error' });
      expect(fm.severity).toBe('error');
    });

    it('omits severity when not provided', () => {
      const fm = createSystemFrontmatter('startup');
      expect(fm.severity).toBeUndefined();
    });
  });

  describe('createIndexFrontmatter', () => {
    it('creates correct frontmatter structure', () => {
      const fm = createIndexFrontmatter(42);
      expect(fm.type).toBe('index');
      expect(fm.noteCount).toBe(42);
      expect(fm.tags).toContain('diana');
      expect(fm.tags).toContain('moc');
      expect(fm.modified).toBeDefined();
    });

    it('omits noteCount when undefined', () => {
      const fm = createIndexFrontmatter();
      expect(fm.noteCount).toBeUndefined();
    });
  });
});

describe('Frontmatter Serialization', () => {
  beforeEach(() => {
    mockDate('2025-12-10T14:30:00');
  });

  afterEach(() => {
    restoreDate();
  });

  describe('stringifyNote', () => {
    it('creates valid YAML frontmatter', () => {
      const fm = createDailyLogFrontmatter();
      const content = '# Daily Log\n\nSome content';
      const result = stringifyNote(fm, content);

      expect(result).toContain('---');
      expect(result).toContain('type: daily-log');
      expect(result).toContain('# Daily Log');
      expect(result).toContain('Some content');
    });

    it('produces valid YAML that can be parsed', () => {
      const fm = createDailyLogFrontmatter();
      const content = 'Test content';
      const serialized = stringifyNote(fm, content);
      const parsed = parseNote(serialized, 'test.md');

      expect(parsed.frontmatter.type).toBe('daily-log');
      expect(parsed.content.trim()).toBe('Test content');
    });
  });

  describe('parseNote', () => {
    it('extracts frontmatter and content', () => {
      const note = `---
type: daily-log
date: '2025-12-10'
tags:
  - diana
  - daily
created: '2025-12-10T14:30:00'
---

# Daily Log

Content here`;

      const { frontmatter, content } = parseNote(note, 'test.md');
      expect(frontmatter.type).toBe('daily-log');
      expect(content).toContain('# Daily Log');
    });

    it('throws CorruptedNoteError on invalid YAML', () => {
      const invalidNote = `---
invalid: yaml: here: [
---
Content`;

      expect(() => parseNote(invalidNote, 'test.md')).toThrow();
    });
  });

  describe('updateModified', () => {
    it('adds modified timestamp', () => {
      const fm = createDailyLogFrontmatter();
      const updated = updateModified(fm);
      expect(updated.modified).toBe('2025-12-10T14:30:00');
    });

    it('preserves original fields', () => {
      const fm = createDailyLogFrontmatter();
      const updated = updateModified(fm);
      expect(updated.type).toBe(fm.type);
      expect(updated.date).toBe(fm.date);
      expect(updated.tags).toEqual(fm.tags);
    });
  });
});

describe('Frontmatter Validation', () => {
  beforeEach(() => {
    mockDate('2025-12-10T14:30:00');
  });

  afterEach(() => {
    restoreDate();
  });

  describe('isValidFrontmatter', () => {
    it('returns true for valid frontmatter', () => {
      const fm = createDailyLogFrontmatter();
      expect(isValidFrontmatter(fm)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isValidFrontmatter(null)).toBe(false);
    });

    it('returns false for non-object', () => {
      expect(isValidFrontmatter('string')).toBe(false);
    });

    it('returns false for missing type', () => {
      expect(isValidFrontmatter({ date: '2025-12-10', tags: [], created: '2025-12-10T14:30:00' })).toBe(false);
    });

    it('returns false for missing date', () => {
      expect(isValidFrontmatter({ type: 'daily-log', tags: [], created: '2025-12-10T14:30:00' })).toBe(false);
    });

    it('returns false for missing tags', () => {
      expect(isValidFrontmatter({ type: 'daily-log', date: '2025-12-10', created: '2025-12-10T14:30:00' })).toBe(false);
    });

    it('returns false for missing created', () => {
      expect(isValidFrontmatter({ type: 'daily-log', date: '2025-12-10', tags: [] })).toBe(false);
    });

    it('returns false for invalid date format', () => {
      expect(isValidFrontmatter({ type: 'daily-log', date: '12-10-2025', tags: [], created: '2025-12-10T14:30:00' })).toBe(false);
    });

    it('returns false for invalid datetime format', () => {
      expect(isValidFrontmatter({ type: 'daily-log', date: '2025-12-10', tags: [], created: '2025-12-10 14:30:00' })).toBe(false);
    });

    it('returns false for non-string tags', () => {
      expect(isValidFrontmatter({ type: 'daily-log', date: '2025-12-10', tags: [1, 2], created: '2025-12-10T14:30:00' })).toBe(false);
    });

    it('validates modified field when present', () => {
      expect(isValidFrontmatter({
        type: 'daily-log',
        date: '2025-12-10',
        tags: [],
        created: '2025-12-10T14:30:00',
        modified: 'invalid',
      })).toBe(false);

      expect(isValidFrontmatter({
        type: 'daily-log',
        date: '2025-12-10',
        tags: [],
        created: '2025-12-10T14:30:00',
        modified: '2025-12-10T15:00:00',
      })).toBe(true);
    });
  });

  describe('hasCorruptedFrontmatter', () => {
    it('returns false for valid notes', () => {
      const fm = createDailyLogFrontmatter();
      const note = stringifyNote(fm, 'Content');
      expect(hasCorruptedFrontmatter(note)).toBe(false);
    });

    it('returns true for invalid YAML', () => {
      const corrupted = `---
invalid: yaml: [
---
Content`;
      expect(hasCorruptedFrontmatter(corrupted)).toBe(true);
    });

    it('returns true for missing required fields', () => {
      const incomplete = `---
type: daily-log
---
Content`;
      expect(hasCorruptedFrontmatter(incomplete)).toBe(true);
    });
  });
});

describe('Corrupted Frontmatter Recovery', () => {
  beforeEach(() => {
    mockDate('2025-12-10T14:30:00');
  });

  afterEach(() => {
    restoreDate();
  });

  describe('extractContentFromCorrupted', () => {
    it('extracts content after frontmatter', () => {
      const corrupted = `---
invalid: yaml
---
# My Content

Body text here`;
      const content = extractContentFromCorrupted(corrupted);
      expect(content).toContain('# My Content');
      expect(content).toContain('Body text here');
    });

    it('returns original content if no frontmatter', () => {
      const noFrontmatter = '# Just Content\n\nNo frontmatter here';
      expect(extractContentFromCorrupted(noFrontmatter)).toBe(noFrontmatter);
    });
  });

  describe('recreateDailyLogFromCorrupted', () => {
    it('preserves content with new valid frontmatter', () => {
      const corrupted = `---
broken: [
---
# Daily Log

## 10:00:00 - First Entry
Did something

## 11:00:00 - Second Entry
Did something else`;

      const fixed = recreateDailyLogFromCorrupted(corrupted);

      // Check new frontmatter is valid
      expect(fixed).toContain('type: daily-log');
      expect(fixed).toContain("date: '2025-12-10'");

      // Check content is preserved
      expect(fixed).toContain('# Daily Log');
      expect(fixed).toContain('## 10:00:00 - First Entry');
      expect(fixed).toContain('## 11:00:00 - Second Entry');
    });

    it('uses provided date for frontmatter', () => {
      const corrupted = `---
broken: yaml
---
Content`;
      const customDate = new Date('2025-12-09T00:00:00');
      const fixed = recreateDailyLogFromCorrupted(corrupted, customDate);
      expect(fixed).toContain("date: '2025-12-09'");
    });
  });
});
