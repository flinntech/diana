/**
 * Unit Tests for Obsidian Templates
 *
 * Feature: 001-obsidian-integration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mockDate, restoreDate } from '../../setup.js';
import {
  generateDailyLogTemplate,
  generateActivityEntry,
  generateObservationTemplate,
  generateProposalTemplate,
  generateSystemTemplate,
  generateIndexTemplate,
  generateWikilink,
} from '../../../src/obsidian/templates.js';

describe('Daily Log Templates', () => {
  beforeEach(() => {
    mockDate('2025-12-10T14:30:00');
  });

  afterEach(() => {
    restoreDate();
  });

  it('generates daily log with correct frontmatter', () => {
    const result = generateDailyLogTemplate();

    expect(result).toContain('type: daily-log');
    expect(result).toContain("date: '2025-12-10'");
    expect(result).toContain('- diana');
    expect(result).toContain('- daily');
    expect(result).toContain("created: '2025-12-10T14:30:00'");
    expect(result).toContain('# Daily Log - 2025-12-10');
  });

  it('uses provided date for daily log', () => {
    const customDate = new Date('2025-12-09T10:00:00');
    const result = generateDailyLogTemplate(customDate);

    expect(result).toContain("date: '2025-12-09'");
    expect(result).toContain('# Daily Log - 2025-12-09');
  });

  it('generates activity entry with timestamp', () => {
    const input = {
      activity: 'Detected new files in Downloads folder',
      title: 'File Detection',
    };
    const result = generateActivityEntry(input);

    expect(result).toContain('## 14:30:00 - File Detection');
    expect(result).toContain('Detected new files in Downloads folder');
    expect(result).toContain('---');
  });

  it('generates activity entry with related notes', () => {
    const input = {
      activity: 'Created a new proposal',
      title: 'Proposal Created',
      relatedNotes: ['observations/2025-12-10-patterns', 'proposals/2025-12-10-organize'],
    };
    const result = generateActivityEntry(input);

    expect(result).toContain('[[observations/2025-12-10-patterns]]');
    expect(result).toContain('[[proposals/2025-12-10-organize]]');
  });

  it('uses default title when not provided', () => {
    const input = { activity: 'Some activity' };
    const result = generateActivityEntry(input);

    expect(result).toContain('## 14:30:00 - Activity');
  });
});

describe('Observation Templates', () => {
  beforeEach(() => {
    mockDate('2025-12-10T10:15:00');
  });

  afterEach(() => {
    restoreDate();
  });

  it('generates observation with correct frontmatter', () => {
    const input = {
      title: 'Download Patterns',
      context: 'Monitoring user download behavior',
      details: 'User frequently downloads PDF invoices on Mondays',
      subject: '/mnt/c/Users/joshu/Downloads',
      confidence: 'medium' as const,
      tags: ['patterns', 'downloads'],
    };
    const result = generateObservationTemplate(input);

    expect(result).toContain('type: observation');
    expect(result).toContain("date: '2025-12-10'");
    expect(result).toContain('- diana');
    expect(result).toContain('- observation');
    expect(result).toContain('- patterns');
    expect(result).toContain('- downloads');
    expect(result).toContain('subject: /mnt/c/Users/joshu/Downloads');
    expect(result).toContain('confidence: medium');
    expect(result).toContain('# Observation: Download Patterns');
    expect(result).toContain('## Context');
    expect(result).toContain('## Details');
  });

  it('includes related notes section', () => {
    const input = {
      title: 'Test',
      context: 'Test context',
      details: 'Test details',
      confidence: 'medium' as const,
      relatedNotes: ['daily/2025-12-10'],
    };
    const result = generateObservationTemplate(input);

    expect(result).toContain('## Related');
    expect(result).toContain('[[daily/2025-12-10]]');
  });
});

describe('Proposal Templates', () => {
  beforeEach(() => {
    mockDate('2025-12-10T11:00:00');
  });

  afterEach(() => {
    restoreDate();
  });

  it('generates proposal with correct frontmatter', () => {
    const input = {
      proposalId: 'organize-downloads',
      summary: 'Organize Downloads folder by file type',
      reasoning: 'Downloads contains 150+ files with no organization',
      action: 'move',
      confidence: 'high' as const,
      tags: ['organization'],
    };
    const result = generateProposalTemplate(input);

    expect(result).toContain('type: proposal');
    expect(result).toContain('proposalId: organize-downloads');
    expect(result).toContain('status: pending');
    expect(result).toContain('confidence: high');
    expect(result).toContain('action: move');
    expect(result).toContain('# Proposal: Organize Downloads folder by file type');
    expect(result).toContain('## Summary');
    expect(result).toContain('## Reasoning');
    expect(result).toContain('## Outcome');
  });

  it('includes evidence links', () => {
    const input = {
      proposalId: 'test',
      summary: 'Test proposal',
      reasoning: 'Test reasoning',
      action: 'move',
      confidence: 'high' as const,
      evidence: ['observations/2025-12-10-patterns'],
    };
    const result = generateProposalTemplate(input);

    expect(result).toContain('## Evidence');
    expect(result).toContain('[[observations/2025-12-10-patterns]]');
  });
});

describe('System Note Templates', () => {
  beforeEach(() => {
    mockDate('2025-12-10T08:00:00');
  });

  afterEach(() => {
    restoreDate();
  });

  it('generates system note with correct frontmatter', () => {
    const input = {
      category: 'startup' as const,
      title: 'DIANA Service Started',
      details: 'All components initialized successfully',
      component: 'core',
    };
    const result = generateSystemTemplate(input);

    expect(result).toContain('type: system');
    expect(result).toContain('category: startup');
    expect(result).toContain('- diana');
    expect(result).toContain('- system');
    expect(result).toContain('- startup');
    expect(result).toContain('# System: Startup - DIANA Service Started');
    expect(result).toContain('## Timestamp');
    expect(result).toContain('2025-12-10T08:00:00');
    expect(result).toContain('## Details');
    expect(result).toContain('## Context');
  });

  it('includes severity for error category', () => {
    const input = {
      category: 'error' as const,
      title: 'Vault Write Failed',
      details: 'Could not write to vault',
      severity: 'error' as const,
    };
    const result = generateSystemTemplate(input);

    expect(result).toContain('severity: error');
    expect(result).toContain('## Resolution');
    expect(result).toContain('*Pending resolution*');
  });

  it('includes custom resolution when provided', () => {
    const input = {
      category: 'error' as const,
      title: 'Vault Write Failed',
      details: 'Could not write to vault',
      severity: 'error' as const,
      resolution: 'Restarted the service',
    };
    const result = generateSystemTemplate(input);

    expect(result).toContain('Restarted the service');
  });
});

describe('Index Templates', () => {
  beforeEach(() => {
    mockDate('2025-12-10T15:00:00');
  });

  afterEach(() => {
    restoreDate();
  });

  it('generates index with all sections', () => {
    const sections = {
      dailyLogs: [{ path: 'daily/2025-12-10', title: 'December 10, 2025' }],
      observations: [{ path: 'observations/2025-12-10-patterns', title: 'File Patterns' }],
      proposals: [{ path: 'proposals/2025-12-10-organize', title: 'Organize Downloads', status: 'pending' as const }],
      systemNotes: [{ path: 'system/2025-12-10-startup', title: 'DIANA Started' }],
    };
    const result = generateIndexTemplate(sections);

    expect(result).toContain('type: index');
    expect(result).toContain('noteCount: 4');
    expect(result).toContain('# DIANA Brain - Index');
    expect(result).toContain('## Daily Logs');
    expect(result).toContain('[[daily/2025-12-10]]');
    expect(result).toContain('## Recent Observations');
    expect(result).toContain('[[observations/2025-12-10-patterns]]');
    expect(result).toContain('## Active Proposals');
    expect(result).toContain('[[proposals/2025-12-10-organize]]');
    expect(result).toContain('## System Status');
    expect(result).toContain('[[system/2025-12-10-startup]]');
  });

  it('shows empty state for sections with no entries', () => {
    const sections = {
      dailyLogs: [],
      observations: [],
      proposals: [],
      systemNotes: [],
    };
    const result = generateIndexTemplate(sections);

    expect(result).toContain('*No daily logs yet*');
    expect(result).toContain('*No observations yet*');
    expect(result).toContain('*No proposals yet*');
    expect(result).toContain('*No system notes yet*');
    expect(result).toContain('noteCount: 0');
  });

  it('shows status icons for proposals', () => {
    const sections = {
      dailyLogs: [],
      observations: [],
      proposals: [
        { path: 'proposals/p1', title: 'Pending', status: 'pending' as const },
        { path: 'proposals/p2', title: 'Approved', status: 'approved' as const },
        { path: 'proposals/p3', title: 'Rejected', status: 'rejected' as const },
      ],
      systemNotes: [],
    };
    const result = generateIndexTemplate(sections);

    expect(result).toContain('🔄 [[proposals/p1]]');
    expect(result).toContain('✅ [[proposals/p2]]');
    expect(result).toContain('❌ [[proposals/p3]]');
  });
});

describe('Wikilink Generation', () => {
  it('generates basic wikilink', () => {
    expect(generateWikilink('observations/2025-12-10-test')).toBe('[[observations/2025-12-10-test]]');
  });

  it('generates wikilink with display text', () => {
    expect(generateWikilink('daily/2025-12-10', 'Today')).toBe('[[daily/2025-12-10|Today]]');
  });
});
