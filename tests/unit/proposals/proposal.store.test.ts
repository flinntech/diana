/**
 * Unit Tests: ProposalStore
 *
 * Feature: 003-file-watcher-proposals
 * Task: T021
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  ProposalStore,
  createProposalStore,
  serializeProposal,
  deserializeProposal,
  type StoreData,
  type SerializedProposal,
} from '../../../src/proposals/proposal.store.js';
import type { Proposal } from '../../../src/proposals/proposal.types.js';

describe('ProposalStore', () => {
  let testDir: string;
  let storePath: string;
  let store: ProposalStore;

  beforeEach(async () => {
    // Create unique temp directory for each test
    testDir = join(tmpdir(), `diana-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
    storePath = join(testDir, 'proposals.json');
    store = createProposalStore(storePath);
  });

  afterEach(async () => {
    // Cleanup
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  describe('load', () => {
    it('returns empty state when file does not exist', async () => {
      const data = await store.load();

      expect(data.version).toBe(1);
      expect(data.proposals).toEqual([]);
      expect(data.cooldowns).toEqual({});
    });

    it('loads existing proposals from file', async () => {
      const existing: StoreData = {
        version: 1,
        lastModified: new Date().toISOString(),
        proposals: [
          {
            id: 'test-id-1',
            createdAt: '2025-12-11T10:00:00Z',
            sourcePath: '/test/source.txt',
            sourceFilename: 'source.txt',
            sourceSize: 1024,
            sourceMtime: 1733913600000,
            action: 'move',
            destinationPath: '/test/dest/source.txt',
            category: 'misc',
            confidence: 'high',
            reasoning: 'Test proposal',
            sensitive: false,
            status: 'pending',
          },
        ],
        cooldowns: {
          '/test/rejected.txt': '2025-12-12T10:00:00Z',
        },
      };

      await writeFile(storePath, JSON.stringify(existing));

      const data = await store.load();

      expect(data.proposals).toHaveLength(1);
      expect(data.proposals[0].id).toBe('test-id-1');
      expect(data.cooldowns['/test/rejected.txt']).toBe('2025-12-12T10:00:00Z');
    });

    it('returns empty state for corrupted JSON', async () => {
      await writeFile(storePath, 'not valid json {{{');

      const data = await store.load();

      expect(data.version).toBe(1);
      expect(data.proposals).toEqual([]);
    });

    it('returns empty state for unknown version', async () => {
      const future: StoreData = {
        version: 99,
        lastModified: new Date().toISOString(),
        proposals: [],
        cooldowns: {},
      };

      await writeFile(storePath, JSON.stringify(future));

      const data = await store.load();

      expect(data.version).toBe(1);
      expect(data.proposals).toEqual([]);
    });

    it('returns empty state for invalid proposals array', async () => {
      await writeFile(storePath, JSON.stringify({
        version: 1,
        lastModified: new Date().toISOString(),
        proposals: 'not an array',
        cooldowns: {},
      }));

      const data = await store.load();

      expect(data.proposals).toEqual([]);
    });
  });

  describe('save', () => {
    it('creates file with correct structure', async () => {
      const data: StoreData = {
        version: 1,
        lastModified: '2025-12-11T10:00:00Z',
        proposals: [],
        cooldowns: {},
      };

      await store.save(data);

      expect(existsSync(storePath)).toBe(true);

      const content = await readFile(storePath, 'utf-8');
      const saved = JSON.parse(content) as StoreData;

      expect(saved.version).toBe(1);
      expect(saved.proposals).toEqual([]);
    });

    it('creates parent directories if they do not exist', async () => {
      const deepPath = join(testDir, 'deep', 'nested', 'proposals.json');
      const deepStore = createProposalStore(deepPath);

      await deepStore.save({
        version: 1,
        lastModified: new Date().toISOString(),
        proposals: [],
        cooldowns: {},
      });

      expect(existsSync(deepPath)).toBe(true);
    });

    it('updates lastModified timestamp', async () => {
      const oldTime = '2020-01-01T00:00:00Z';
      const data: StoreData = {
        version: 1,
        lastModified: oldTime,
        proposals: [],
        cooldowns: {},
      };

      await store.save(data);

      const content = await readFile(storePath, 'utf-8');
      const saved = JSON.parse(content) as StoreData;

      expect(saved.lastModified).not.toBe(oldTime);
      expect(new Date(saved.lastModified).getTime()).toBeGreaterThan(new Date(oldTime).getTime());
    });

    it('persists proposals correctly', async () => {
      const proposal: SerializedProposal = {
        id: 'save-test',
        createdAt: '2025-12-11T10:00:00Z',
        sourcePath: '/test/file.pdf',
        sourceFilename: 'file.pdf',
        sourceSize: 2048,
        sourceMtime: 1733913600000,
        action: 'move',
        destinationPath: '/organized/file.pdf',
        category: 'finances',
        confidence: 'high',
        reasoning: 'Financial document',
        sensitive: true,
        sensitiveReason: 'Contains financial data',
        status: 'pending',
      };

      await store.save({
        version: 1,
        lastModified: new Date().toISOString(),
        proposals: [proposal],
        cooldowns: {},
      });

      const data = await store.load();

      expect(data.proposals).toHaveLength(1);
      expect(data.proposals[0]).toMatchObject({
        id: 'save-test',
        category: 'finances',
        sensitive: true,
      });
    });
  });
});

describe('Serialization helpers', () => {
  describe('serializeProposal', () => {
    it('converts dates to ISO strings', () => {
      const proposal: Proposal = {
        id: 'test-id',
        createdAt: new Date('2025-12-11T10:00:00Z'),
        sourcePath: '/test/file.txt',
        sourceFilename: 'file.txt',
        sourceSize: 1024,
        sourceMtime: 1733913600000,
        action: 'move',
        destinationPath: '/dest/file.txt',
        category: 'misc',
        confidence: 'medium',
        reasoning: 'Test',
        sensitive: false,
        status: 'pending',
      };

      const serialized = serializeProposal(proposal);

      expect(serialized.createdAt).toBe('2025-12-11T10:00:00.000Z');
      expect(typeof serialized.createdAt).toBe('string');
    });

    it('handles resolvedAt date', () => {
      const proposal: Proposal = {
        id: 'test-id',
        createdAt: new Date('2025-12-11T10:00:00Z'),
        sourcePath: '/test/file.txt',
        sourceFilename: 'file.txt',
        sourceSize: 1024,
        sourceMtime: 1733913600000,
        action: 'move',
        destinationPath: '/dest/file.txt',
        category: 'misc',
        confidence: 'medium',
        reasoning: 'Test',
        sensitive: false,
        status: 'approved',
        resolvedAt: new Date('2025-12-11T11:00:00Z'),
      };

      const serialized = serializeProposal(proposal);

      expect(serialized.resolvedAt).toBe('2025-12-11T11:00:00.000Z');
    });
  });

  describe('deserializeProposal', () => {
    it('converts ISO strings to dates', () => {
      const serialized: SerializedProposal = {
        id: 'test-id',
        createdAt: '2025-12-11T10:00:00.000Z',
        sourcePath: '/test/file.txt',
        sourceFilename: 'file.txt',
        sourceSize: 1024,
        sourceMtime: 1733913600000,
        action: 'move',
        destinationPath: '/dest/file.txt',
        category: 'misc',
        confidence: 'medium',
        reasoning: 'Test',
        sensitive: false,
        status: 'pending',
      };

      const proposal = deserializeProposal(serialized);

      expect(proposal.createdAt).toBeInstanceOf(Date);
      expect(proposal.createdAt.toISOString()).toBe('2025-12-11T10:00:00.000Z');
    });

    it('handles optional resolvedAt', () => {
      const serialized: SerializedProposal = {
        id: 'test-id',
        createdAt: '2025-12-11T10:00:00.000Z',
        sourcePath: '/test/file.txt',
        sourceFilename: 'file.txt',
        sourceSize: 1024,
        sourceMtime: 1733913600000,
        action: 'move',
        destinationPath: '/dest/file.txt',
        category: 'misc',
        confidence: 'medium',
        reasoning: 'Test',
        sensitive: false,
        status: 'approved',
        resolvedAt: '2025-12-11T11:00:00.000Z',
      };

      const proposal = deserializeProposal(serialized);

      expect(proposal.resolvedAt).toBeInstanceOf(Date);
      expect(proposal.resolvedAt?.toISOString()).toBe('2025-12-11T11:00:00.000Z');
    });

    it('handles missing optional fields', () => {
      const serialized: SerializedProposal = {
        id: 'test-id',
        createdAt: '2025-12-11T10:00:00.000Z',
        sourcePath: '/test/file.txt',
        sourceFilename: 'file.txt',
        sourceSize: 1024,
        sourceMtime: 1733913600000,
        action: 'move',
        destinationPath: '/dest/file.txt',
        category: 'misc',
        confidence: 'medium',
        reasoning: 'Test',
        sensitive: false,
        status: 'pending',
      };

      const proposal = deserializeProposal(serialized);

      expect(proposal.resolvedAt).toBeUndefined();
      expect(proposal.sensitiveReason).toBeUndefined();
      expect(proposal.executionError).toBeUndefined();
    });
  });
});
