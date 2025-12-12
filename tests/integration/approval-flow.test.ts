/**
 * Integration Test: Approval Flow
 *
 * Feature: 003-file-watcher-proposals
 * Task: T025
 *
 * Tests the complete approval flow where files actually move on disk.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  ProposalService,
  createProposalService,
} from '../../src/proposals/proposal.service.js';
import type { FileAnalysis } from '../../src/types/watcher.js';

describe('Approval Flow Integration', () => {
  let testDir: string;
  let sourceDir: string;
  let destDir: string;
  let storePath: string;
  let service: ProposalService;

  beforeEach(async () => {
    // Create unique temp directories
    testDir = join(tmpdir(), `diana-integration-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    sourceDir = join(testDir, 'Downloads'); // Simulated watched directory
    destDir = join(testDir, 'Organized'); // Simulated organization destination

    await mkdir(sourceDir, { recursive: true });
    await mkdir(destDir, { recursive: true });

    storePath = join(testDir, '.diana', 'proposals.json');
    service = createProposalService(storePath, { cooldownHours: 24 });
    await service.initialize();
  });

  afterEach(async () => {
    await service.shutdown();
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  function createAnalysis(
    filename: string,
    category: string,
    options: Partial<FileAnalysis> = {}
  ): FileAnalysis {
    return {
      path: join(sourceDir, filename),
      filename,
      extension: filename.split('.').pop() || '',
      size: 1024,
      mtime: Date.now(),
      matchedPatterns: [],
      suggestedCategory: category as FileAnalysis['suggestedCategory'],
      suggestedDestination: join(destDir, category, filename),
      confidence: 'high',
      reasoning: `Classified as ${category}`,
      sensitive: false,
      analyzedAt: new Date(),
      analysisMethod: 'pattern',
      ...options,
    };
  }

  describe('Complete approval workflow', () => {
    it('moves file from source to destination when approved', async () => {
      // Setup: Create file in "Downloads"
      const filename = 'invoice-2025.pdf';
      const sourcePath = join(sourceDir, filename);
      const fileContent = 'Invoice content for December 2025';
      await writeFile(sourcePath, fileContent);

      // Create analysis and proposal
      const analysis = createAnalysis(filename, 'finances');
      const proposal = await service.createFromAnalysis(analysis);

      expect(proposal).not.toBeNull();
      expect(proposal!.status).toBe('pending');
      expect(existsSync(sourcePath)).toBe(true);

      // Approve the proposal
      const result = await service.approve(proposal!.id);

      // Verify file moved
      expect(result.success).toBe(true);
      expect(existsSync(sourcePath)).toBe(false);
      expect(existsSync(analysis.suggestedDestination)).toBe(true);

      // Verify content preserved
      const movedContent = await readFile(analysis.suggestedDestination, 'utf-8');
      expect(movedContent).toBe(fileContent);

      // Verify proposal updated
      const updated = service.getById(proposal!.id);
      expect(updated!.status).toBe('approved');
    });

    it('creates nested destination directories', async () => {
      const filename = 'screenshot.png';
      const sourcePath = join(sourceDir, filename);
      await writeFile(sourcePath, 'fake image data');

      // Deep nested destination
      const analysis = createAnalysis(filename, 'screenshots', {
        suggestedDestination: join(destDir, 'Screenshots', '2025', '12', filename),
      });

      const proposal = await service.createFromAnalysis(analysis);
      const result = await service.approve(proposal!.id);

      expect(result.success).toBe(true);
      expect(existsSync(join(destDir, 'Screenshots', '2025', '12', filename))).toBe(true);
    });

    it('handles sensitive files with confirmation', async () => {
      const filename = 'tax-return-2024.pdf';
      const sourcePath = join(sourceDir, filename);
      await writeFile(sourcePath, 'tax data');

      const analysis = createAnalysis(filename, 'finances', {
        sensitive: true,
        sensitiveReason: 'Tax document detected',
      });

      const proposal = await service.createFromAnalysis(analysis);

      // First attempt without confirmation - should fail
      const failedResult = await service.approve(proposal!.id, false);
      expect(failedResult.success).toBe(false);
      expect(failedResult.error).toContain('sensitive');
      expect(existsSync(sourcePath)).toBe(true);

      // Second attempt with confirmation - should succeed
      const successResult = await service.approve(proposal!.id, true);
      expect(successResult.success).toBe(true);
      expect(existsSync(sourcePath)).toBe(false);
    });

    it('rejects proposal and adds cooldown', async () => {
      const filename = 'random-file.txt';
      const sourcePath = join(sourceDir, filename);
      await writeFile(sourcePath, 'content');

      const analysis = createAnalysis(filename, 'misc');
      const proposal = await service.createFromAnalysis(analysis);

      const result = await service.reject(proposal!.id, 'User wants to keep this file');

      expect(result.success).toBe(true);
      expect(result.cooldownUntil).toBeDefined();

      // File should NOT be moved
      expect(existsSync(sourcePath)).toBe(true);

      // Should be on cooldown
      expect(service.isOnCooldown(sourcePath)).toBe(true);

      // Cannot create new proposal for same file
      const newProposal = await service.createFromAnalysis(analysis);
      expect(newProposal).toBeNull();
    });

    it('handles batch approval of multiple files', async () => {
      // Create multiple files
      const files = [
        { name: 'doc1.pdf', category: 'work' },
        { name: 'doc2.txt', category: 'misc' },
        { name: 'image.png', category: 'media' },
      ];

      for (const file of files) {
        await writeFile(join(sourceDir, file.name), `Content of ${file.name}`);
        const analysis = createAnalysis(file.name, file.category);
        await service.createFromAnalysis(analysis);
      }

      expect(service.getPending()).toHaveLength(3);

      // Batch approve
      const result = await service.approveAll();

      expect(result.approved).toBe(3);
      expect(result.failed).toBe(0);
      expect(service.getPending()).toHaveLength(0);

      // All files should be moved
      for (const file of files) {
        expect(existsSync(join(sourceDir, file.name))).toBe(false);
        expect(existsSync(join(destDir, file.category, file.name))).toBe(true);
      }
    });

    it('batch approval skips sensitive files', async () => {
      await writeFile(join(sourceDir, 'regular.txt'), 'regular');
      await writeFile(join(sourceDir, 'sensitive.pdf'), 'sensitive');

      await service.createFromAnalysis(
        createAnalysis('regular.txt', 'misc', { sensitive: false })
      );
      await service.createFromAnalysis(
        createAnalysis('sensitive.pdf', 'finances', {
          sensitive: true,
          sensitiveReason: 'Financial data',
        })
      );

      const result = await service.approveAll(false);

      expect(result.approved).toBe(1);
      expect(result.skipped).toBe(1);

      // Regular file moved
      expect(existsSync(join(sourceDir, 'regular.txt'))).toBe(false);

      // Sensitive file NOT moved
      expect(existsSync(join(sourceDir, 'sensitive.pdf'))).toBe(true);
    });

    it('preserves state across service restarts', async () => {
      // Create proposal
      await writeFile(join(sourceDir, 'persistent.txt'), 'content');
      const analysis = createAnalysis('persistent.txt', 'misc');
      const proposal = await service.createFromAnalysis(analysis);

      // Shutdown and restart
      await service.shutdown();

      const service2 = createProposalService(storePath, { cooldownHours: 24 });
      await service2.initialize();

      // Proposal should still exist
      const loaded = service2.getById(proposal!.id);
      expect(loaded).toBeDefined();
      expect(loaded!.status).toBe('pending');

      // Should be able to approve it
      const result = await service2.approve(proposal!.id);
      expect(result.success).toBe(true);

      await service2.shutdown();
    });

    it('invalidates proposal when source file is deleted', async () => {
      const filename = 'will-be-deleted.txt';
      const sourcePath = join(sourceDir, filename);
      await writeFile(sourcePath, 'content');

      const analysis = createAnalysis(filename, 'misc');
      const proposal = await service.createFromAnalysis(analysis);

      // Delete the source file
      await rm(sourcePath);

      // Try to approve
      const result = await service.approve(proposal!.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('no longer exists');

      // Proposal should be invalidated
      const updated = service.getById(proposal!.id);
      expect(updated!.status).toBe('invalid');
    });

    it('prevents duplicate proposals for same file', async () => {
      const filename = 'duplicate-test.txt';
      await writeFile(join(sourceDir, filename), 'content');

      const analysis = createAnalysis(filename, 'misc');

      const proposal1 = await service.createFromAnalysis(analysis);
      const proposal2 = await service.createFromAnalysis(analysis);

      expect(proposal1).not.toBeNull();
      expect(proposal2).toBeNull();
    });

    it('clears all pending proposals', async () => {
      // Create several proposals
      for (let i = 0; i < 5; i++) {
        const filename = `file-${i}.txt`;
        await writeFile(join(sourceDir, filename), `content ${i}`);
        await service.createFromAnalysis(createAnalysis(filename, 'misc'));
      }

      expect(service.getPending()).toHaveLength(5);

      const cleared = service.clearAllPending();

      expect(cleared).toBe(5);
      expect(service.getPending()).toHaveLength(0);

      // Files should still exist (not moved)
      for (let i = 0; i < 5; i++) {
        expect(existsSync(join(sourceDir, `file-${i}.txt`))).toBe(true);
      }
    });
  });

  describe('Error handling', () => {
    it('handles destination already exists', async () => {
      const filename = 'conflict.txt';
      const sourcePath = join(sourceDir, filename);
      await writeFile(sourcePath, 'source content');

      // Pre-create destination
      const destPath = join(destDir, 'misc', filename);
      await mkdir(join(destDir, 'misc'), { recursive: true });
      await writeFile(destPath, 'existing content');

      const analysis = createAnalysis(filename, 'misc');
      const proposal = await service.createFromAnalysis(analysis);

      const result = await service.approve(proposal!.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');

      // Source file should still be there
      expect(existsSync(sourcePath)).toBe(true);
    });

    it('fails gracefully on permission errors', async () => {
      // This test is platform-dependent and may not work in all environments
      // Skip if running as root or on Windows
      if (process.platform === 'win32' || process.getuid?.() === 0) {
        return;
      }

      const filename = 'no-permission.txt';
      const sourcePath = join(sourceDir, filename);
      await writeFile(sourcePath, 'content');

      // Create destination directory with no write permission
      const restrictedDir = join(destDir, 'restricted');
      await mkdir(restrictedDir, { mode: 0o555 });

      const analysis = createAnalysis(filename, 'misc', {
        suggestedDestination: join(restrictedDir, filename),
      });
      const proposal = await service.createFromAnalysis(analysis);

      const result = await service.approve(proposal!.id);

      expect(result.success).toBe(false);

      // Cleanup - restore permissions
      const { chmod } = await import('fs/promises');
      await chmod(restrictedDir, 0o755);
    });
  });
});
