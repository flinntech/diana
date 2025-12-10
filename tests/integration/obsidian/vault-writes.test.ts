/**
 * Integration Tests for Obsidian Vault Writes
 *
 * Feature: 001-obsidian-integration
 *
 * These tests verify end-to-end functionality using a real filesystem
 * with temporary directories.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFile, mkdir, rm, readdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import matter from 'gray-matter';
import { ObsidianWriter } from '../../../src/obsidian/writer.js';

// Helper to create a unique temp vault
async function createTempVault(): Promise<string> {
  const tempDir = join(tmpdir(), `diana-integration-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(tempDir, { recursive: true });
  return tempDir;
}

describe('Integration: Daily Log Creation (T013)', () => {
  let vaultPath: string;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-12-10T14:30:00'));
    vaultPath = await createTempVault();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await rm(vaultPath, { recursive: true, force: true });
  });

  it('creates daily log with proper frontmatter and content', async () => {
    const writer = new ObsidianWriter({ vaultPath, skipLocking: true });

    // Create daily log
    const result = await writer.writeDaily({
      activity: 'Started monitoring Downloads folder',
      title: 'File Monitoring',
      tags: ['monitoring'],
    });

    expect(result.success).toBe(true);

    // Verify file exists
    const content = await readFile(join(vaultPath, 'daily', '2025-12-10.md'), 'utf8');

    // Parse and validate frontmatter
    const { data: frontmatter, content: body } = matter(content);
    expect(frontmatter.type).toBe('daily-log');
    expect(frontmatter.date).toBe('2025-12-10');
    expect(frontmatter.tags).toContain('diana');
    expect(frontmatter.tags).toContain('daily');
    expect(frontmatter.created).toBeDefined();

    // Validate content
    expect(body).toContain('# Daily Log - 2025-12-10');
    expect(body).toContain('## 14:30:00 - File Monitoring');
    expect(body).toContain('Started monitoring Downloads folder');
  });

  it('appends multiple entries to same daily log', async () => {
    const writer = new ObsidianWriter({ vaultPath, skipLocking: true });

    // First entry
    await writer.writeDaily({ activity: 'First activity', title: 'First' });

    // Advance time
    vi.setSystemTime(new Date('2025-12-10T15:00:00'));

    // Second entry
    await writer.writeDaily({ activity: 'Second activity', title: 'Second' });

    // Advance time again
    vi.setSystemTime(new Date('2025-12-10T16:30:00'));

    // Third entry
    await writer.writeDaily({ activity: 'Third activity', title: 'Third' });

    // Verify all entries in one file
    const content = await readFile(join(vaultPath, 'daily', '2025-12-10.md'), 'utf8');
    expect(content).toContain('## 14:30:00 - First');
    expect(content).toContain('## 15:00:00 - Second');
    expect(content).toContain('## 16:30:00 - Third');

    // Verify only one file created
    const files = await readdir(join(vaultPath, 'daily'));
    expect(files.length).toBe(1);
  });

  it('creates directory structure automatically', async () => {
    const writer = new ObsidianWriter({ vaultPath, skipLocking: true });

    await writer.writeDaily({ activity: 'Test' });

    const files = await readdir(vaultPath);
    expect(files).toContain('daily');
  });
});

describe('Integration: Proposal with Linked Observations (T026)', () => {
  let vaultPath: string;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-12-10T10:00:00'));
    vaultPath = await createTempVault();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await rm(vaultPath, { recursive: true, force: true });
  });

  it('creates proposal with wikilinks to observations', async () => {
    const writer = new ObsidianWriter({ vaultPath, skipLocking: true });

    // Create observation first
    const obsResult = await writer.writeObservation({
      title: 'Download Patterns',
      context: 'Monitoring user download behavior',
      details: 'User downloads PDFs on Mondays',
      subject: '/mnt/c/Users/joshu/Downloads',
      confidence: 'medium',
      tags: ['patterns'],
    });

    expect(obsResult.success).toBe(true);

    // Create proposal linked to observation
    const propResult = await writer.writeProposal({
      proposalId: 'organize-downloads',
      summary: 'Organize Downloads folder by file type',
      reasoning: 'Based on observed pattern of PDF downloads',
      action: 'move',
      confidence: 'high',
      evidence: ['observations/2025-12-10-download-patterns'],
      tags: ['organization'],
    });

    expect(propResult.success).toBe(true);

    // Verify observation content
    const obsFiles = await readdir(join(vaultPath, 'observations'));
    expect(obsFiles.length).toBe(1);
    expect(obsFiles[0]).toContain('download-patterns');

    const obsContent = await readFile(join(vaultPath, 'observations', obsFiles[0]), 'utf8');
    const { data: obsFm } = matter(obsContent);
    expect(obsFm.type).toBe('observation');
    expect(obsFm.confidence).toBe('medium');
    expect(obsFm.subject).toBe('/mnt/c/Users/joshu/Downloads');

    // Verify proposal content has evidence links
    const propFiles = await readdir(join(vaultPath, 'proposals'));
    expect(propFiles.length).toBe(1);

    const propContent = await readFile(join(vaultPath, 'proposals', propFiles[0]), 'utf8');
    const { data: propFm } = matter(propContent);
    expect(propFm.type).toBe('proposal');
    expect(propFm.status).toBe('pending');
    expect(propFm.confidence).toBe('high');
    expect(propContent).toContain('[[observations/2025-12-10-download-patterns]]');
  });

  it('allows dangling wikilinks (observation may not exist)', async () => {
    const writer = new ObsidianWriter({ vaultPath, skipLocking: true });

    // Create proposal with reference to non-existent observation
    const result = await writer.writeProposal({
      proposalId: 'test-proposal',
      summary: 'Test proposal',
      reasoning: 'Testing dangling links',
      action: 'move',
      confidence: 'low',
      evidence: ['observations/2025-12-10-nonexistent'],
    });

    expect(result.success).toBe(true);

    const propFiles = await readdir(join(vaultPath, 'proposals'));
    const propContent = await readFile(join(vaultPath, 'proposals', propFiles[0]), 'utf8');
    expect(propContent).toContain('[[observations/2025-12-10-nonexistent]]');
  });
});

describe('Integration: Note Format Compatibility (T036)', () => {
  let vaultPath: string;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-12-10T08:00:00'));
    vaultPath = await createTempVault();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await rm(vaultPath, { recursive: true, force: true });
  });

  it('creates notes with Obsidian-compatible YAML frontmatter', async () => {
    const writer = new ObsidianWriter({ vaultPath, skipLocking: true });

    // Create system note
    await writer.writeSystem({
      category: 'startup',
      title: 'DIANA Service Started',
      details: 'All components initialized',
      component: 'core',
    });

    const sysFiles = await readdir(join(vaultPath, 'system'));
    const sysContent = await readFile(join(vaultPath, 'system', sysFiles[0]), 'utf8');
    const { data: sysFm } = matter(sysContent);

    // Verify Obsidian compatibility
    expect(sysFm.type).toBe('system');
    expect(sysFm.category).toBe('startup');
    expect(sysFm.date).toMatch(/^\d{4}-\d{2}-\d{2}$/); // ISO date
    expect(sysFm.created).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/); // ISO datetime
    expect(Array.isArray(sysFm.tags)).toBe(true);
    expect(sysFm.tags.every((t: unknown) => typeof t === 'string')).toBe(true);
  });

  it('uses plural tags field (Obsidian convention)', async () => {
    const writer = new ObsidianWriter({ vaultPath, skipLocking: true });

    await writer.writeDaily({ activity: 'Test', tags: ['custom', 'tags'] });

    const content = await readFile(join(vaultPath, 'daily', '2025-12-10.md'), 'utf8');

    // Check raw YAML uses 'tags:' not 'tag:'
    expect(content).toContain('tags:');
    expect(content).not.toContain('tag:');
  });

  it('creates working wikilinks between notes', async () => {
    const writer = new ObsidianWriter({ vaultPath, skipLocking: true });

    // Create daily log with link to proposal
    await writer.writeDaily({
      activity: 'Created proposal for organizing files',
      title: 'Proposal Created',
      relatedNotes: ['proposals/2025-12-10-organize-downloads'],
    });

    const dailyContent = await readFile(join(vaultPath, 'daily', '2025-12-10.md'), 'utf8');
    expect(dailyContent).toContain('[[proposals/2025-12-10-organize-downloads]]');
  });

  it('all note types are searchable by type tag', async () => {
    const writer = new ObsidianWriter({ vaultPath, skipLocking: true });

    await writer.writeDaily({ activity: 'Daily entry' });
    await writer.writeObservation({
      title: 'Test Observation',
      context: 'Test',
      details: 'Test',
      confidence: 'medium',
    });
    await writer.writeProposal({
      proposalId: 'test',
      summary: 'Test',
      reasoning: 'Test',
      action: 'move',
      confidence: 'medium',
    });
    await writer.writeSystem({
      category: 'startup',
      title: 'Test',
      details: 'Test',
    });

    // Read all notes and verify type-specific tags
    const dailyContent = await readFile(join(vaultPath, 'daily', '2025-12-10.md'), 'utf8');
    const { data: dailyFm } = matter(dailyContent);
    expect(dailyFm.tags).toContain('daily');

    const obsFiles = await readdir(join(vaultPath, 'observations'));
    const obsContent = await readFile(join(vaultPath, 'observations', obsFiles[0]), 'utf8');
    const { data: obsFm } = matter(obsContent);
    expect(obsFm.tags).toContain('observation');

    const propFiles = await readdir(join(vaultPath, 'proposals'));
    const propContent = await readFile(join(vaultPath, 'proposals', propFiles[0]), 'utf8');
    const { data: propFm } = matter(propContent);
    expect(propFm.tags).toContain('proposal');

    const sysFiles = await readdir(join(vaultPath, 'system'));
    const sysContent = await readFile(join(vaultPath, 'system', sysFiles[0]), 'utf8');
    const { data: sysFm } = matter(sysContent);
    expect(sysFm.tags).toContain('system');
  });
});

describe('Integration: Index Auto-Update (T045)', () => {
  let vaultPath: string;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-12-10T12:00:00'));
    vaultPath = await createTempVault();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await rm(vaultPath, { recursive: true, force: true });
  });

  it('creates index with links to all note types', async () => {
    const writer = new ObsidianWriter({ vaultPath, skipLocking: true });

    // Create notes of each type
    await writer.writeDaily({ activity: 'Daily entry' });
    await writer.writeObservation({
      title: 'File Patterns',
      context: 'Monitoring',
      details: 'Pattern detected',
      confidence: 'high',
    });
    await writer.writeProposal({
      proposalId: 'organize',
      summary: 'Organize files',
      reasoning: 'Better organization',
      action: 'move',
      confidence: 'medium',
    });
    await writer.writeSystem({
      category: 'startup',
      title: 'Service Started',
      details: 'All systems go',
    });

    // Update index
    const result = await writer.updateIndex();
    expect(result.success).toBe(true);

    // Verify index content
    const indexContent = await readFile(join(vaultPath, 'index.md'), 'utf8');
    const { data: indexFm } = matter(indexContent);

    expect(indexFm.type).toBe('index');
    expect(indexFm.noteCount).toBe(4);

    // Verify links to all note types
    expect(indexContent).toContain('[[daily/2025-12-10]]');
    expect(indexContent).toContain('[[observations/');
    expect(indexContent).toContain('[[proposals/');
    expect(indexContent).toContain('[[system/');
  });

  it('sorts notes in reverse chronological order', async () => {
    const writer = new ObsidianWriter({ vaultPath, skipLocking: true });

    // Create notes on different days
    vi.setSystemTime(new Date('2025-12-08T10:00:00'));
    await writer.writeDaily({ activity: 'Day 1' });

    vi.setSystemTime(new Date('2025-12-09T10:00:00'));
    await writer.writeDaily({ activity: 'Day 2' });

    vi.setSystemTime(new Date('2025-12-10T10:00:00'));
    await writer.writeDaily({ activity: 'Day 3' });

    await writer.updateIndex();

    const indexContent = await readFile(join(vaultPath, 'index.md'), 'utf8');

    // Verify newest first (2025-12-10 should appear before 2025-12-08)
    const idx10 = indexContent.indexOf('2025-12-10');
    const idx08 = indexContent.indexOf('2025-12-08');
    expect(idx10).toBeLessThan(idx08);
  });

  it('returns vault stats', async () => {
    const writer = new ObsidianWriter({ vaultPath, skipLocking: true });

    await writer.writeDaily({ activity: 'Log 1' });
    await writer.writeDaily({ activity: 'Log 2' }); // Same day, appends
    await writer.writeObservation({
      title: 'Obs 1',
      context: 'Test',
      details: 'Test',
      confidence: 'medium',
    });
    await writer.writeProposal({
      proposalId: 'p1',
      summary: 'P1',
      reasoning: 'R1',
      action: 'move',
      confidence: 'low',
    });

    const stats = await writer.getVaultStats();

    expect(stats.totalNotes).toBe(3); // 1 daily, 1 obs, 1 proposal
    expect(stats.dailyLogs).toBe(1);
    expect(stats.observations).toBe(1);
    expect(stats.proposals).toBe(1);
    expect(stats.systemNotes).toBe(0);
  });

  it('handles empty vault gracefully', async () => {
    const writer = new ObsidianWriter({ vaultPath, skipLocking: true });

    const result = await writer.updateIndex();
    expect(result.success).toBe(true);

    const indexContent = await readFile(join(vaultPath, 'index.md'), 'utf8');
    expect(indexContent).toContain('*No daily logs yet*');
    expect(indexContent).toContain('*No observations yet*');
    expect(indexContent).toContain('*No proposals yet*');
    expect(indexContent).toContain('*No system notes yet*');
  });
});
