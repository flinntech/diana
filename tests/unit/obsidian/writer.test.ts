/**
 * Unit Tests for ObsidianWriter
 *
 * Feature: 001-obsidian-integration
 *
 * Note: These tests use real temp directories instead of mock-fs
 * because mock-fs doesn't work well with ESM imports.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFile, mkdir, rm, access, readdir } from 'fs/promises';
import { constants } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ObsidianWriter } from '../../../src/obsidian/writer.js';

// Helper to create a unique temp directory
async function createTempVault(): Promise<string> {
  const tempDir = join(tmpdir(), `diana-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(tempDir, { recursive: true });
  await mkdir(join(tempDir, 'daily'), { recursive: true });
  await mkdir(join(tempDir, 'observations'), { recursive: true });
  await mkdir(join(tempDir, 'proposals'), { recursive: true });
  await mkdir(join(tempDir, 'system'), { recursive: true });
  return tempDir;
}

describe('ObsidianWriter', () => {
  let vaultPath: string;

  beforeEach(async () => {
    // Use fake timers for consistent dates
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-12-10T14:30:00'));
    vaultPath = await createTempVault();
  });

  afterEach(async () => {
    vi.useRealTimers();
    // Clean up temp directory
    await rm(vaultPath, { recursive: true, force: true });
  });

  describe('writeDaily', () => {
    it('creates new daily log file', async () => {
      const writer = new ObsidianWriter({ vaultPath });
      const result = await writer.writeDaily({
        activity: 'Test activity',
        title: 'Test Title',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.filePath).toContain('2025-12-10.md');
      }

      const content = await readFile(join(vaultPath, 'daily', '2025-12-10.md'), 'utf8');
      expect(content).toContain('type: daily-log');
      expect(content).toContain('# Daily Log - 2025-12-10');
      expect(content).toContain('## 14:30:00 - Test Title');
      expect(content).toContain('Test activity');
    });

    it('appends to existing daily log', async () => {
      const writer = new ObsidianWriter({ vaultPath });

      // First write
      await writer.writeDaily({ activity: 'First activity', title: 'First' });

      // Advance time
      vi.setSystemTime(new Date('2025-12-10T15:00:00'));

      // Second write
      const result = await writer.writeDaily({ activity: 'Second activity', title: 'Second' });

      expect(result.success).toBe(true);

      const content = await readFile(join(vaultPath, 'daily', '2025-12-10.md'), 'utf8');
      expect(content).toContain('## 14:30:00 - First');
      expect(content).toContain('First activity');
      expect(content).toContain('## 15:00:00 - Second');
      expect(content).toContain('Second activity');
    });

    it('adds related notes as wikilinks', async () => {
      const writer = new ObsidianWriter({ vaultPath });
      await writer.writeDaily({
        activity: 'Created proposal',
        title: 'Proposal',
        relatedNotes: ['observations/2025-12-10-patterns', 'proposals/2025-12-10-test'],
      });

      const content = await readFile(join(vaultPath, 'daily', '2025-12-10.md'), 'utf8');
      expect(content).toContain('[[observations/2025-12-10-patterns]]');
      expect(content).toContain('[[proposals/2025-12-10-test]]');
    });

    it('creates daily directory if not exists', async () => {
      // Remove the daily directory
      await rm(join(vaultPath, 'daily'), { recursive: true, force: true });

      const writer = new ObsidianWriter({ vaultPath });
      const result = await writer.writeDaily({ activity: 'Test' });

      expect(result.success).toBe(true);
      await expect(access(join(vaultPath, 'daily'), constants.F_OK)).resolves.not.toThrow();
    });
  });

  describe('isVaultAccessible', () => {
    it('returns true for accessible vault', async () => {
      const writer = new ObsidianWriter({ vaultPath });
      const result = await writer.isVaultAccessible();
      expect(result).toBe(true);
    });

    it('returns false for non-existent vault', async () => {
      const writer = new ObsidianWriter({ vaultPath: '/nonexistent-path-12345' });
      const result = await writer.isVaultAccessible();
      expect(result).toBe(false);
    });
  });

  describe('error handling', () => {
    it('returns error when vault not found', async () => {
      const writer = new ObsidianWriter({ vaultPath: '/nonexistent-path-12345' });
      const result = await writer.writeDaily({ activity: 'Test' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VAULT_NOT_FOUND');
      }
    });
  });
});

describe('ObsidianWriter - Observations', () => {
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

  it('creates observation note', async () => {
    const writer = new ObsidianWriter({ vaultPath });
    const result = await writer.writeObservation({
      title: 'File Patterns',
      context: 'Monitoring downloads',
      details: 'User downloads PDFs on Mondays',
      subject: '/Downloads',
      confidence: 'medium',
      tags: ['patterns'],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.filePath).toContain('file-patterns.md');
    }

    const files = await readdir(join(vaultPath, 'observations'));
    expect(files.some(f => f.includes('file-patterns'))).toBe(true);
  });
});

describe('ObsidianWriter - Proposals', () => {
  let vaultPath: string;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-12-10T11:00:00'));
    vaultPath = await createTempVault();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await rm(vaultPath, { recursive: true, force: true });
  });

  it('creates proposal note', async () => {
    const writer = new ObsidianWriter({ vaultPath });
    const result = await writer.writeProposal({
      proposalId: 'organize-downloads',
      summary: 'Organize Downloads folder',
      reasoning: 'Too many files',
      action: 'move',
      confidence: 'high',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.filePath).toContain('organize-downloads.md');
    }
  });
});

describe('ObsidianWriter - System Notes', () => {
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

  it('creates system note', async () => {
    const writer = new ObsidianWriter({ vaultPath });
    const result = await writer.writeSystem({
      category: 'startup',
      title: 'DIANA Started',
      details: 'All systems operational',
      component: 'core',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.filePath).toContain('startup.md');
    }
  });
});

describe('ObsidianWriter - Index', () => {
  let vaultPath: string;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-12-10T15:00:00'));
    vaultPath = await createTempVault();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await rm(vaultPath, { recursive: true, force: true });
  });

  it('creates and updates index', async () => {
    const writer = new ObsidianWriter({ vaultPath });

    // Create some notes first
    await writer.writeDaily({ activity: 'Test activity' });
    await writer.writeObservation({
      title: 'Test observation',
      context: 'Context',
      details: 'Details',
      confidence: 'medium',
    });

    // Update index
    const result = await writer.updateIndex();

    expect(result.success).toBe(true);

    const indexContent = await readFile(join(vaultPath, 'index.md'), 'utf8');
    expect(indexContent).toContain('# DIANA Brain - Index');
    expect(indexContent).toContain('## Daily Logs');
    expect(indexContent).toContain('## Recent Observations');
  });
});
