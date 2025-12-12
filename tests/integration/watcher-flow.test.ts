/**
 * Integration Tests: Watcher Flow
 *
 * Feature: 003-file-watcher-proposals
 * Task: T042
 *
 * Tests the full flow: file detection → analysis → proposal creation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { WatcherService, createWatcherService } from '../../src/watcher/watcher.service.js';
import { ProposalService, createProposalService } from '../../src/proposals/proposal.service.js';
import type { WatcherConfig } from '../../src/types/watcher.js';

// Helper to wait for a condition with timeout
async function waitFor(
  conditionFn: () => boolean,
  timeoutMs = 2000,
  intervalMs = 50
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (conditionFn()) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

describe('Watcher Flow Integration', () => {
  let testBase: string;
  let watchDir: string;
  let organizedDir: string;
  let proposalStorePath: string;
  let proposalService: ProposalService;
  let watcherService: WatcherService;

  beforeEach(async () => {
    // Create temporary test directories with unique timestamp
    testBase = join(tmpdir(), `diana-watcher-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    watchDir = join(testBase, 'Downloads');
    organizedDir = join(testBase, 'Organized');
    proposalStorePath = join(testBase, 'proposals.json');

    await mkdir(watchDir, { recursive: true });
    await mkdir(organizedDir, { recursive: true });

    // Create proposal service
    proposalService = createProposalService(proposalStorePath, { cooldownHours: 24 });
    await proposalService.initialize();

    // Create watcher service with short stability delay for tests
    const watcherConfig: Partial<WatcherConfig> = {
      directories: [{ path: watchDir, enabled: true, recursive: false }],
      basePath: organizedDir,
      stabilityDelayMs: 100, // Short for testing
      maxStabilityWaitMs: 5000,
      ignoredPatterns: [/(^|[/\\])\../, /\.tmp$/, /\.part$/, /~$/],
    };

    watcherService = createWatcherService(watcherConfig, proposalService);
  });

  afterEach(async () => {
    // Stop watcher and cleanup
    if (watcherService?.isRunning()) {
      await watcherService.stop();
    }
    if (proposalService) {
      await proposalService.shutdown();
    }

    // Clean up temp directories
    try {
      await rm(testBase, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('file detection', () => {
    it('emits file:detected when file is added', async () => {
      const detected = vi.fn();
      watcherService.on('file:detected', detected);

      await watcherService.start();
      // Give chokidar time to set up
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Add a file
      const testFile = join(watchDir, 'test-document.pdf');
      await writeFile(testFile, 'PDF content here');

      // Wait for detection with polling
      await waitFor(() => detected.mock.calls.length > 0, 2000);

      expect(detected).toHaveBeenCalled();
      expect(detected.mock.calls[0][0]).toBe(testFile);
    });

    it('emits file:stable after stability delay', async () => {
      const stable = vi.fn();
      watcherService.on('file:stable', stable);

      await watcherService.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Add a file
      const testFile = join(watchDir, 'invoice-december.pdf');
      await writeFile(testFile, 'Invoice content');

      // Wait for stability
      await waitFor(() => stable.mock.calls.length > 0, 2000);

      expect(stable).toHaveBeenCalledWith(testFile);
    });

    it('ignores temporary files', async () => {
      const detected = vi.fn();
      watcherService.on('file:detected', detected);

      await watcherService.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Add temp files that should be ignored
      await writeFile(join(watchDir, '.hidden-file'), 'hidden');
      await writeFile(join(watchDir, 'download.tmp'), 'temp');
      await writeFile(join(watchDir, 'file.part'), 'partial');

      // Wait a bit and ensure nothing was detected
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(detected).not.toHaveBeenCalled();
    });
  });

  describe('proposal creation flow', () => {
    it('creates proposal for screenshot file', async () => {
      const analyzed = vi.fn();
      watcherService.on('file:analyzed', analyzed);

      await watcherService.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Add a screenshot
      const testFile = join(watchDir, 'Screenshot 2025-12-11 at 10.30.00.png');
      await writeFile(testFile, 'PNG image data');

      // Wait for analysis
      await waitFor(() => analyzed.mock.calls.length > 0, 2000);

      expect(analyzed).toHaveBeenCalled();

      const analysis = analyzed.mock.calls[0][0];
      expect(analysis.suggestedCategory).toBe('screenshots');
      expect(analysis.confidence).toBe('high');

      // Verify proposal was created
      const proposals = proposalService.getPending();
      expect(proposals.length).toBeGreaterThan(0);
      expect(proposals[0].category).toBe('screenshots');
    });

    it('creates proposal for invoice PDF', async () => {
      const analyzed = vi.fn();
      watcherService.on('file:analyzed', analyzed);

      await watcherService.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Add an invoice
      const testFile = join(watchDir, 'invoice-december-2025.pdf');
      await writeFile(testFile, 'Invoice PDF content');

      // Wait for analysis
      await waitFor(() => analyzed.mock.calls.length > 0, 2000);

      expect(analyzed).toHaveBeenCalled();

      const analysis = analyzed.mock.calls[0][0];
      expect(analysis.suggestedCategory).toBe('finances');

      // Verify proposal
      const proposals = proposalService.getPending();
      expect(proposals.length).toBeGreaterThan(0);
      expect(proposals[0].category).toBe('finances');
    });

    it('creates proposal for installer file', async () => {
      const analyzed = vi.fn();
      watcherService.on('file:analyzed', analyzed);

      await watcherService.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Add an installer
      const testFile = join(watchDir, 'program-setup.exe');
      await writeFile(testFile, 'MZ executable data');

      // Wait for analysis
      await waitFor(() => analyzed.mock.calls.length > 0, 2000);

      expect(analyzed).toHaveBeenCalled();

      const analysis = analyzed.mock.calls[0][0];
      expect(analysis.suggestedCategory).toBe('installers');

      // Verify proposal
      const proposals = proposalService.getPending();
      expect(proposals.length).toBeGreaterThan(0);
      expect(proposals[0].category).toBe('installers');
    });

    it('marks sensitive files appropriately', async () => {
      const analyzed = vi.fn();
      watcherService.on('file:analyzed', analyzed);

      await watcherService.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Add a tax document
      const testFile = join(watchDir, 'tax-return-2024.pdf');
      await writeFile(testFile, 'Tax return data');

      // Wait for analysis
      await waitFor(() => analyzed.mock.calls.length > 0, 2000);

      expect(analyzed).toHaveBeenCalled();

      const analysis = analyzed.mock.calls[0][0];
      expect(analysis.sensitive).toBe(true);

      // Verify proposal
      const proposals = proposalService.getPending();
      expect(proposals.length).toBeGreaterThan(0);
      expect(proposals[0].sensitive).toBe(true);
    });
  });

  describe('debouncing and cooldown', () => {
    it('skips files with pending proposals', async () => {
      await watcherService.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create a file and wait for proposal
      const testFile = join(watchDir, 'invoice-1.pdf');
      await writeFile(testFile, 'Invoice content');

      // Wait for proposal to be created
      await waitFor(() => proposalService.getPending().length > 0, 2000);

      const initialCount = proposalService.getPending().length;
      expect(initialCount).toBe(1);

      // Modify the same file
      await writeFile(testFile, 'Invoice content modified');
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Should still have only one proposal
      expect(proposalService.getPending().length).toBe(1);
    });

    it('skips files on cooldown', async () => {
      await watcherService.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create a file
      const testFile = join(watchDir, 'invoice-2.pdf');
      await writeFile(testFile, 'Invoice content');

      // Wait for proposal to be created
      await waitFor(() => proposalService.getPending().length > 0, 2000);

      // Get and reject the proposal
      const proposals = proposalService.getPending();
      expect(proposals.length).toBe(1);
      await proposalService.reject(proposals[0].id, 'Not needed');

      // Delete and recreate the file
      await rm(testFile);
      await new Promise((resolve) => setTimeout(resolve, 200));
      await writeFile(testFile, 'New invoice content');
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Should not create new proposal (on cooldown)
      expect(proposalService.getPending().length).toBe(0);
    });
  });

  describe('directory management', () => {
    it('adds directory and detects files', async () => {
      // Create additional directory within the same test base
      const additionalDir = join(testBase, 'Documents');
      await mkdir(additionalDir, { recursive: true });

      await watcherService.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Add the new directory
      await watcherService.addDirectory(additionalDir);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const detected = vi.fn();
      watcherService.on('file:detected', detected);

      // Add file to new directory
      const testFile = join(additionalDir, 'report.docx');
      await writeFile(testFile, 'Report content');

      // Wait for detection
      await waitFor(() => detected.mock.calls.length > 0, 2000);

      expect(detected).toHaveBeenCalled();
    });

    it('stops detecting after directory removal', async () => {
      await watcherService.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Remove the directory from watch list
      await watcherService.removeDirectory(watchDir);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const detected = vi.fn();
      watcherService.on('file:detected', detected);

      // Add file to removed directory
      const testFile = join(watchDir, 'undetected.pdf');
      await writeFile(testFile, 'Content');

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Should not have detected the file
      expect(detected).not.toHaveBeenCalled();
    });
  });

  describe('watcher lifecycle', () => {
    it('emits watcher:started on start', async () => {
      const started = vi.fn();
      watcherService.on('watcher:started', started);

      await watcherService.start();

      expect(started).toHaveBeenCalled();
    });

    it('emits watcher:stopped on stop', async () => {
      const stopped = vi.fn();
      watcherService.on('watcher:stopped', stopped);

      await watcherService.start();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await watcherService.stop();

      expect(stopped).toHaveBeenCalled();
    });

    it('stops detecting files after stop', async () => {
      await watcherService.start();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await watcherService.stop();

      const detected = vi.fn();
      watcherService.on('file:detected', detected);

      // Add file after stopping
      const testFile = join(watchDir, 'after-stop.pdf');
      await writeFile(testFile, 'Content');

      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(detected).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('handles file removal during stability check gracefully', async () => {
      await watcherService.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create a file
      const testFile = join(watchDir, 'test.pdf');
      await writeFile(testFile, 'Content');

      // Wait for initial detection (but not stability)
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Delete file before stability check completes (simulates race condition)
      await rm(testFile);

      // The watcher should handle this gracefully
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Should not have crashed
      expect(watcherService.isRunning()).toBe(true);
    });
  });
});
