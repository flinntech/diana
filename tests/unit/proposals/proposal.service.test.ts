/**
 * Unit Tests: ProposalService
 *
 * Feature: 003-file-watcher-proposals
 * Tasks: T022, T023, T024
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, rm, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  ProposalService,
  createProposalService,
} from '../../../src/proposals/proposal.service.js';
import type { FileAnalysis } from '../../../src/types/watcher.js';

describe('ProposalService', () => {
  let testDir: string;
  let storePath: string;
  let sourceDir: string;
  let destDir: string;
  let service: ProposalService;

  beforeEach(async () => {
    // Create unique temp directories for each test
    testDir = join(tmpdir(), `diana-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    sourceDir = join(testDir, 'source');
    destDir = join(testDir, 'dest');

    await mkdir(sourceDir, { recursive: true });
    await mkdir(destDir, { recursive: true });

    storePath = join(testDir, 'proposals.json');
    service = createProposalService(storePath, { cooldownHours: 24 });
    await service.initialize();
  });

  afterEach(async () => {
    await service.shutdown();
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  // Helper to create a mock FileAnalysis
  function createMockAnalysis(overrides: Partial<FileAnalysis> = {}): FileAnalysis {
    return {
      path: join(sourceDir, 'test-file.txt'),
      filename: 'test-file.txt',
      extension: 'txt',
      size: 1024,
      mtime: Date.now(),
      matchedPatterns: [],
      suggestedCategory: 'misc',
      suggestedDestination: join(destDir, 'test-file.txt'),
      confidence: 'medium',
      reasoning: 'Test analysis',
      sensitive: false,
      analyzedAt: new Date(),
      analysisMethod: 'extension',
      ...overrides,
    };
  }

  describe('initialize / shutdown', () => {
    it('loads empty state from non-existent file', async () => {
      const proposals = service.getAll();
      expect(proposals).toEqual([]);
    });

    it('can be initialized multiple times safely', async () => {
      await service.initialize();
      await service.initialize();
      expect(service.getAll()).toEqual([]);
    });
  });

  describe('createFromAnalysis', () => {
    it('creates a proposal from file analysis', async () => {
      const analysis = createMockAnalysis();

      const proposal = await service.createFromAnalysis(analysis);

      expect(proposal).not.toBeNull();
      expect(proposal!.sourcePath).toBe(analysis.path);
      expect(proposal!.destinationPath).toBe(analysis.suggestedDestination);
      expect(proposal!.status).toBe('pending');
      expect(proposal!.category).toBe('misc');
    });

    it('returns null if pending proposal exists for path', async () => {
      const analysis = createMockAnalysis();

      await service.createFromAnalysis(analysis);
      const second = await service.createFromAnalysis(analysis);

      expect(second).toBeNull();
    });

    it('emits proposal:created event', async () => {
      const analysis = createMockAnalysis();
      const handler = vi.fn();
      service.on('proposal:created', handler);

      await service.createFromAnalysis(analysis);

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].sourcePath).toBe(analysis.path);
    });

    it('generates unique IDs for each proposal', async () => {
      const analysis1 = createMockAnalysis({ path: join(sourceDir, 'file1.txt') });
      const analysis2 = createMockAnalysis({ path: join(sourceDir, 'file2.txt') });

      const proposal1 = await service.createFromAnalysis(analysis1);
      const proposal2 = await service.createFromAnalysis(analysis2);

      expect(proposal1!.id).not.toBe(proposal2!.id);
    });

    it('returns null if path is on cooldown', async () => {
      const analysis = createMockAnalysis();

      // Create and reject a proposal to put path on cooldown
      const proposal = await service.createFromAnalysis(analysis);
      await service.reject(proposal!.id);

      // Try to create another proposal for same path
      const second = await service.createFromAnalysis(analysis);

      expect(second).toBeNull();
    });
  });

  describe('query methods', () => {
    it('getAll returns all proposals', async () => {
      const analysis1 = createMockAnalysis({ path: join(sourceDir, 'file1.txt') });
      const analysis2 = createMockAnalysis({ path: join(sourceDir, 'file2.txt') });

      await service.createFromAnalysis(analysis1);
      await service.createFromAnalysis(analysis2);

      expect(service.getAll()).toHaveLength(2);
    });

    it('getPending returns only pending proposals', async () => {
      const analysis1 = createMockAnalysis({ path: join(sourceDir, 'file1.txt') });
      const analysis2 = createMockAnalysis({ path: join(sourceDir, 'file2.txt') });

      const proposal1 = await service.createFromAnalysis(analysis1);
      await service.createFromAnalysis(analysis2);
      await service.reject(proposal1!.id);

      const pending = service.getPending();

      expect(pending).toHaveLength(1);
      expect(pending[0].sourcePath).toContain('file2.txt');
    });

    it('getById returns correct proposal', async () => {
      const analysis = createMockAnalysis();
      const created = await service.createFromAnalysis(analysis);

      const found = service.getById(created!.id);

      expect(found).toBeDefined();
      expect(found!.id).toBe(created!.id);
    });

    it('getById returns undefined for non-existent ID', () => {
      const found = service.getById('non-existent-id');
      expect(found).toBeUndefined();
    });

    it('getBySourcePath returns proposal for path', async () => {
      const analysis = createMockAnalysis();
      await service.createFromAnalysis(analysis);

      const found = service.getBySourcePath(analysis.path);

      expect(found).toBeDefined();
      expect(found!.sourcePath).toBe(analysis.path);
    });

    it('hasPendingForPath returns true for pending proposal', async () => {
      const analysis = createMockAnalysis();
      await service.createFromAnalysis(analysis);

      expect(service.hasPendingForPath(analysis.path)).toBe(true);
    });

    it('hasPendingForPath returns false after rejection', async () => {
      const analysis = createMockAnalysis();
      const proposal = await service.createFromAnalysis(analysis);
      await service.reject(proposal!.id);

      expect(service.hasPendingForPath(analysis.path)).toBe(false);
    });
  });

  describe('approve', () => {
    it('returns error for non-existent proposal', async () => {
      const result = await service.approve('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('returns error for already approved proposal', async () => {
      const sourcePath = join(sourceDir, 'file.txt');
      await writeFile(sourcePath, 'test content');

      const analysis = createMockAnalysis({ path: sourcePath });
      const proposal = await service.createFromAnalysis(analysis);

      // First approval
      await service.approve(proposal!.id);

      // Second approval attempt
      const result = await service.approve(proposal!.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already approved');
    });

    it('returns error if source file no longer exists', async () => {
      // Don't create the source file - it won't exist
      const analysis = createMockAnalysis();
      const proposal = await service.createFromAnalysis(analysis);

      const result = await service.approve(proposal!.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('no longer exists');
    });

    it('returns error for sensitive proposal without confirmation', async () => {
      const sourcePath = join(sourceDir, 'tax-return.pdf');
      await writeFile(sourcePath, 'sensitive content');

      const analysis = createMockAnalysis({
        path: sourcePath,
        sensitive: true,
        sensitiveReason: 'Tax document',
      });
      const proposal = await service.createFromAnalysis(analysis);

      const result = await service.approve(proposal!.id, false);

      expect(result.success).toBe(false);
      expect(result.error).toContain('sensitive');
    });

    it('moves file when approved', async () => {
      const sourcePath = join(sourceDir, 'document.txt');
      const destPath = join(destDir, 'document.txt');
      await writeFile(sourcePath, 'content to move');

      const analysis = createMockAnalysis({
        path: sourcePath,
        suggestedDestination: destPath,
      });
      const proposal = await service.createFromAnalysis(analysis);

      const result = await service.approve(proposal!.id);

      expect(result.success).toBe(true);
      expect(existsSync(sourcePath)).toBe(false);
      expect(existsSync(destPath)).toBe(true);
    });

    it('creates destination directories if needed', async () => {
      const sourcePath = join(sourceDir, 'nested.txt');
      const destPath = join(destDir, 'deep', 'nested', 'path', 'nested.txt');
      await writeFile(sourcePath, 'content');

      const analysis = createMockAnalysis({
        path: sourcePath,
        suggestedDestination: destPath,
      });
      const proposal = await service.createFromAnalysis(analysis);

      const result = await service.approve(proposal!.id);

      expect(result.success).toBe(true);
      expect(existsSync(destPath)).toBe(true);
    });

    it('returns error if destination already exists', async () => {
      const sourcePath = join(sourceDir, 'source.txt');
      const destPath = join(destDir, 'existing.txt');
      await writeFile(sourcePath, 'source content');
      await writeFile(destPath, 'existing content');

      const analysis = createMockAnalysis({
        path: sourcePath,
        suggestedDestination: destPath,
      });
      const proposal = await service.createFromAnalysis(analysis);

      const result = await service.approve(proposal!.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('approves sensitive proposal with confirmation', async () => {
      const sourcePath = join(sourceDir, 'invoice.pdf');
      const destPath = join(destDir, 'invoice.pdf');
      await writeFile(sourcePath, 'sensitive financial data');

      const analysis = createMockAnalysis({
        path: sourcePath,
        suggestedDestination: destPath,
        sensitive: true,
        sensitiveReason: 'Financial document',
      });
      const proposal = await service.createFromAnalysis(analysis);

      const result = await service.approve(proposal!.id, true);

      expect(result.success).toBe(true);
      expect(existsSync(destPath)).toBe(true);
    });

    it('emits proposal:approved event', async () => {
      const sourcePath = join(sourceDir, 'file.txt');
      const destPath = join(destDir, 'file.txt');
      await writeFile(sourcePath, 'content');

      const analysis = createMockAnalysis({
        path: sourcePath,
        suggestedDestination: destPath,
      });
      const proposal = await service.createFromAnalysis(analysis);

      const handler = vi.fn();
      service.on('proposal:approved', handler);

      await service.approve(proposal!.id);

      expect(handler).toHaveBeenCalledOnce();
    });

    it('updates proposal status to approved', async () => {
      const sourcePath = join(sourceDir, 'file.txt');
      await writeFile(sourcePath, 'content');

      const analysis = createMockAnalysis({
        path: sourcePath,
        suggestedDestination: join(destDir, 'file.txt'),
      });
      const proposal = await service.createFromAnalysis(analysis);

      await service.approve(proposal!.id);

      const updated = service.getById(proposal!.id);
      expect(updated!.status).toBe('approved');
      expect(updated!.resolvedAt).toBeDefined();
    });
  });

  describe('reject', () => {
    it('returns error for non-existent proposal', async () => {
      const result = await service.reject('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('returns error for already rejected proposal', async () => {
      const analysis = createMockAnalysis();
      const proposal = await service.createFromAnalysis(analysis);

      await service.reject(proposal!.id);
      const result = await service.reject(proposal!.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already rejected');
    });

    it('updates proposal status to rejected', async () => {
      const analysis = createMockAnalysis();
      const proposal = await service.createFromAnalysis(analysis);

      await service.reject(proposal!.id);

      const updated = service.getById(proposal!.id);
      expect(updated!.status).toBe('rejected');
      expect(updated!.resolvedAt).toBeDefined();
    });

    it('returns cooldown expiry time', async () => {
      const analysis = createMockAnalysis();
      const proposal = await service.createFromAnalysis(analysis);

      const result = await service.reject(proposal!.id);

      expect(result.success).toBe(true);
      expect(result.cooldownUntil).toBeDefined();
      expect(result.cooldownUntil!.getTime()).toBeGreaterThan(Date.now());
    });

    it('adds path to cooldown', async () => {
      const analysis = createMockAnalysis();
      const proposal = await service.createFromAnalysis(analysis);

      await service.reject(proposal!.id);

      expect(service.isOnCooldown(analysis.path)).toBe(true);
    });

    it('emits proposal:rejected event', async () => {
      const analysis = createMockAnalysis();
      const proposal = await service.createFromAnalysis(analysis);

      const handler = vi.fn();
      service.on('proposal:rejected', handler);

      await service.reject(proposal!.id);

      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('invalidate', () => {
    it('marks proposal as invalid', async () => {
      const analysis = createMockAnalysis();
      const proposal = await service.createFromAnalysis(analysis);

      service.invalidate(proposal!.id, 'File was deleted');

      const updated = service.getById(proposal!.id);
      expect(updated!.status).toBe('invalid');
      expect(updated!.executionError).toBe('File was deleted');
    });

    it('emits proposal:invalidated event', async () => {
      const analysis = createMockAnalysis();
      const proposal = await service.createFromAnalysis(analysis);

      const handler = vi.fn();
      service.on('proposal:invalidated', handler);

      service.invalidate(proposal!.id, 'Test reason');

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][1]).toBe('Test reason');
    });

    it('does nothing for non-existent proposal', () => {
      // Should not throw
      service.invalidate('non-existent', 'reason');
    });

    it('does nothing for non-pending proposal', async () => {
      const analysis = createMockAnalysis();
      const proposal = await service.createFromAnalysis(analysis);
      await service.reject(proposal!.id);

      service.invalidate(proposal!.id, 'reason');

      const updated = service.getById(proposal!.id);
      expect(updated!.status).toBe('rejected'); // Unchanged
    });
  });

  describe('clearAllPending', () => {
    it('marks all pending proposals as invalid', async () => {
      const analysis1 = createMockAnalysis({ path: join(sourceDir, 'file1.txt') });
      const analysis2 = createMockAnalysis({ path: join(sourceDir, 'file2.txt') });

      await service.createFromAnalysis(analysis1);
      await service.createFromAnalysis(analysis2);

      const cleared = service.clearAllPending();

      expect(cleared).toBe(2);
      expect(service.getPending()).toHaveLength(0);
    });

    it('returns count of cleared proposals', async () => {
      const analysis = createMockAnalysis();
      await service.createFromAnalysis(analysis);

      expect(service.clearAllPending()).toBe(1);
      expect(service.clearAllPending()).toBe(0); // No more pending
    });
  });

  describe('approveAll', () => {
    it('approves all non-sensitive proposals', async () => {
      const sourcePath1 = join(sourceDir, 'file1.txt');
      const sourcePath2 = join(sourceDir, 'file2.txt');
      await writeFile(sourcePath1, 'content1');
      await writeFile(sourcePath2, 'content2');

      const analysis1 = createMockAnalysis({
        path: sourcePath1,
        suggestedDestination: join(destDir, 'file1.txt'),
      });
      const analysis2 = createMockAnalysis({
        path: sourcePath2,
        suggestedDestination: join(destDir, 'file2.txt'),
      });

      await service.createFromAnalysis(analysis1);
      await service.createFromAnalysis(analysis2);

      const result = await service.approveAll();

      expect(result.approved).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('skips sensitive proposals by default', async () => {
      const sourcePath1 = join(sourceDir, 'regular.txt');
      const sourcePath2 = join(sourceDir, 'sensitive.pdf');
      await writeFile(sourcePath1, 'regular');
      await writeFile(sourcePath2, 'sensitive');

      const analysis1 = createMockAnalysis({
        path: sourcePath1,
        suggestedDestination: join(destDir, 'regular.txt'),
        sensitive: false,
      });
      const analysis2 = createMockAnalysis({
        path: sourcePath2,
        suggestedDestination: join(destDir, 'sensitive.pdf'),
        sensitive: true,
      });

      await service.createFromAnalysis(analysis1);
      await service.createFromAnalysis(analysis2);

      const result = await service.approveAll(false);

      expect(result.approved).toBe(1);
      expect(result.skipped).toBe(1);
    });

    it('includes sensitive proposals when requested', async () => {
      const sourcePath = join(sourceDir, 'sensitive.pdf');
      await writeFile(sourcePath, 'sensitive content');

      const analysis = createMockAnalysis({
        path: sourcePath,
        suggestedDestination: join(destDir, 'sensitive.pdf'),
        sensitive: true,
      });

      await service.createFromAnalysis(analysis);

      const result = await service.approveAll(true);

      expect(result.approved).toBe(1);
      expect(result.skipped).toBe(0);
    });

    it('reports failed proposals', async () => {
      // Create proposal but don't create source file
      const analysis = createMockAnalysis();
      await service.createFromAnalysis(analysis);

      const result = await service.approveAll();

      expect(result.approved).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('persistence', () => {
    it('persists proposals across service restarts', async () => {
      const analysis = createMockAnalysis();
      await service.createFromAnalysis(analysis);
      await service.shutdown();

      // Create new service instance
      const service2 = createProposalService(storePath, { cooldownHours: 24 });
      await service2.initialize();

      expect(service2.getAll()).toHaveLength(1);
      expect(service2.getPending()).toHaveLength(1);

      await service2.shutdown();
    });

    it('persists cooldowns across restarts', async () => {
      const analysis = createMockAnalysis();
      const proposal = await service.createFromAnalysis(analysis);
      await service.reject(proposal!.id);
      await service.shutdown();

      // Create new service instance
      const service2 = createProposalService(storePath, { cooldownHours: 24 });
      await service2.initialize();

      expect(service2.isOnCooldown(analysis.path)).toBe(true);

      await service2.shutdown();
    });
  });
});
