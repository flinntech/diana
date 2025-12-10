/**
 * Performance Benchmark Tests for Obsidian Integration
 *
 * Feature: 001-obsidian-integration
 *
 * Verifies performance constraints from spec.md:
 * - SC-002: Write operations complete in < 1 second
 * - SC-006: Index update completes in < 5 seconds
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { ObsidianWriter } from '../../../src/obsidian/writer.js';

// Helper to create a unique temp vault
async function createTempVault(): Promise<string> {
  const tempDir = join(tmpdir(), `diana-perf-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(tempDir, { recursive: true });
  return tempDir;
}

describe('Performance: Write Operations (SC-002)', () => {
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

  it('writeDaily completes in under 1 second', async () => {
    const writer = new ObsidianWriter({ vaultPath, skipLocking: true });

    const start = performance.now();
    await writer.writeDaily({
      activity: 'Performance test activity with some reasonable content to simulate real usage',
      title: 'Performance Test',
      tags: ['performance', 'test'],
    });
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(1000); // < 1 second
    console.log(`writeDaily completed in ${elapsed.toFixed(2)}ms`);
  });

  it('writeObservation completes in under 1 second', async () => {
    const writer = new ObsidianWriter({ vaultPath, skipLocking: true });

    const start = performance.now();
    await writer.writeObservation({
      title: 'Performance Test Observation',
      context: 'Testing write performance for observation notes',
      details: 'This observation contains typical content to measure realistic performance characteristics',
      subject: '/mnt/c/Users/test/Documents',
      confidence: 'medium',
      tags: ['performance', 'benchmark'],
    });
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(1000); // < 1 second
    console.log(`writeObservation completed in ${elapsed.toFixed(2)}ms`);
  });

  it('writeProposal completes in under 1 second', async () => {
    const writer = new ObsidianWriter({ vaultPath, skipLocking: true });

    const start = performance.now();
    await writer.writeProposal({
      proposalId: 'perf-test-proposal',
      summary: 'Performance test proposal with realistic content',
      reasoning: 'Testing to ensure proposal writes meet the performance requirements',
      action: 'move',
      confidence: 'high',
      evidence: ['observations/2025-12-10-test-1', 'observations/2025-12-10-test-2'],
      tags: ['performance'],
    });
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(1000); // < 1 second
    console.log(`writeProposal completed in ${elapsed.toFixed(2)}ms`);
  });

  it('writeSystem completes in under 1 second', async () => {
    const writer = new ObsidianWriter({ vaultPath, skipLocking: true });

    const start = performance.now();
    await writer.writeSystem({
      category: 'startup',
      title: 'Performance Test System Note',
      details: 'System note created for performance benchmarking purposes',
      component: 'test',
    });
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(1000); // < 1 second
    console.log(`writeSystem completed in ${elapsed.toFixed(2)}ms`);
  });

  it('handles 10 sequential writes in under 10 seconds', async () => {
    const writer = new ObsidianWriter({ vaultPath, skipLocking: true });

    const start = performance.now();
    for (let i = 0; i < 10; i++) {
      vi.setSystemTime(new Date(`2025-12-10T12:0${i}:00`));
      await writer.writeDaily({
        activity: `Activity ${i + 1}`,
        title: `Entry ${i + 1}`,
      });
    }
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(10000); // < 10 seconds for 10 writes
    console.log(`10 sequential writes completed in ${elapsed.toFixed(2)}ms (${(elapsed / 10).toFixed(2)}ms avg)`);
  });
});

describe('Performance: Index Update (SC-006)', () => {
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

  it('updateIndex completes in under 5 seconds with empty vault', async () => {
    const writer = new ObsidianWriter({ vaultPath, skipLocking: true });

    const start = performance.now();
    await writer.updateIndex();
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(5000); // < 5 seconds
    console.log(`updateIndex (empty) completed in ${elapsed.toFixed(2)}ms`);
  });

  it('updateIndex completes in under 5 seconds with 50 notes', async () => {
    const writer = new ObsidianWriter({ vaultPath, skipLocking: true });

    // Create 50 notes of various types
    for (let i = 0; i < 15; i++) {
      vi.setSystemTime(new Date(`2025-12-${String(i + 1).padStart(2, '0')}T10:00:00`));
      await writer.writeDaily({ activity: `Activity ${i}`, title: `Day ${i}` });
    }

    for (let i = 0; i < 15; i++) {
      vi.setSystemTime(new Date(`2025-12-10T${String(10 + i).padStart(2, '0')}:00:00`));
      await writer.writeObservation({
        title: `Observation ${i}`,
        context: 'Test',
        details: 'Test details',
        confidence: 'medium',
      });
    }

    for (let i = 0; i < 10; i++) {
      vi.setSystemTime(new Date(`2025-12-10T${String(10 + i).padStart(2, '0')}:30:00`));
      await writer.writeProposal({
        proposalId: `proposal-${i}`,
        summary: `Proposal ${i}`,
        reasoning: 'Test',
        action: 'move',
        confidence: 'medium',
      });
    }

    for (let i = 0; i < 10; i++) {
      vi.setSystemTime(new Date(`2025-12-10T${String(10 + i).padStart(2, '0')}:45:00`));
      await writer.writeSystem({
        category: 'startup',
        title: `System ${i}`,
        details: 'Test',
      });
    }

    // Now time the index update
    const start = performance.now();
    await writer.updateIndex();
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(5000); // < 5 seconds
    console.log(`updateIndex (50 notes) completed in ${elapsed.toFixed(2)}ms`);
  });

  it('getVaultStats completes quickly', async () => {
    const writer = new ObsidianWriter({ vaultPath, skipLocking: true });

    // Create some notes
    for (let i = 0; i < 10; i++) {
      vi.setSystemTime(new Date(`2025-12-${String(i + 1).padStart(2, '0')}T10:00:00`));
      await writer.writeDaily({ activity: `Activity ${i}` });
    }

    const start = performance.now();
    const stats = await writer.getVaultStats();
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(1000); // < 1 second
    expect(stats.dailyLogs).toBe(10);
    console.log(`getVaultStats completed in ${elapsed.toFixed(2)}ms`);
  });
});
