/**
 * Unit Tests for KeyFactStore
 *
 * Feature: 002-llm-agent-core
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, rm, readFile, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { KeyFactStore, createKeyFactStore } from '../../../src/agent/memory.js';

// Helper to create a unique temp directory
async function createTempDir(): Promise<string> {
  const tempDir = join(
    tmpdir(),
    `diana-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  await mkdir(tempDir, { recursive: true });
  return tempDir;
}

describe('KeyFactStore', () => {
  let tempDir: string;
  let filePath: string;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-12-10T10:00:00'));
    tempDir = await createTempDir();
    filePath = join(tempDir, 'facts.md');
  });

  afterEach(async () => {
    vi.useRealTimers();
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('creates store with specified file path', () => {
      const store = new KeyFactStore(filePath);
      expect(store.getFilePath()).toBe(filePath);
    });
  });

  describe('load', () => {
    it('loads empty facts when file does not exist', async () => {
      const store = new KeyFactStore(filePath);
      await store.load();

      expect(store.isLoaded()).toBe(true);
      expect(store.size()).toBe(0);
    });

    it('parses facts from existing markdown file', async () => {
      const content = `---
type: memory
---

# Key Facts

## Important

- User prefers dark mode #important

## Recent

- [2025-12-09] Had a meeting about project
`;
      await writeFile(filePath, content);

      const store = new KeyFactStore(filePath);
      await store.load();

      expect(store.size()).toBe(2);
      expect(store.getImportant()).toHaveLength(1);
      expect(store.getImportant()[0].content).toBe('User prefers dark mode');
    });

    it('parses dates from recent facts', async () => {
      const content = `# Key Facts

## Recent

- [2025-12-08] An old fact
- [2025-12-10] A new fact
`;
      await writeFile(filePath, content);

      const store = new KeyFactStore(filePath);
      await store.load();

      const recent = store.getRecent(10);
      expect(recent).toHaveLength(2);
      // Most recent first
      expect(recent[0].content).toBe('A new fact');
    });

    it('parses tags from facts', async () => {
      const content = `# Key Facts

## Recent

- [2025-12-10] User likes TypeScript #programming #tech
`;
      await writeFile(filePath, content);

      const store = new KeyFactStore(filePath);
      await store.load();

      const facts = store.getAllFacts();
      expect(facts[0].tags).toContain('#programming');
      expect(facts[0].tags).toContain('#tech');
    });
  });

  describe('save', () => {
    it('creates directory if it does not exist', async () => {
      const nestedPath = join(tempDir, 'nested', 'dir', 'facts.md');
      const store = new KeyFactStore(nestedPath);
      await store.load();
      store.addFact({
        content: 'Test fact',
        tags: [],
        createdAt: new Date(),
      });

      await store.save();

      const content = await readFile(nestedPath, 'utf-8');
      expect(content).toContain('Test fact');
    });

    it('saves facts in markdown format', async () => {
      const store = new KeyFactStore(filePath);
      await store.load();
      store.addFact({
        content: 'Important fact',
        tags: ['#important'],
        createdAt: new Date(),
      });
      store.addFact({
        content: 'Recent fact',
        tags: ['#misc'],
        createdAt: new Date(),
      });

      await store.save();

      const content = await readFile(filePath, 'utf-8');
      expect(content).toContain('---');
      expect(content).toContain('type: memory');
      expect(content).toContain('# Key Facts');
      expect(content).toContain('## Important');
      expect(content).toContain('## Recent');
      expect(content).toContain('Important fact');
      expect(content).toContain('Recent fact');
    });

    it('preserves frontmatter format', async () => {
      const store = new KeyFactStore(filePath);
      await store.load();
      await store.save();

      const content = await readFile(filePath, 'utf-8');
      expect(content).toMatch(/^---/);
      expect(content).toContain('created:');
      expect(content).toContain('modified:');
    });
  });

  describe('addFact', () => {
    it('adds new fact to store', () => {
      const store = new KeyFactStore(filePath);
      store.addFact({
        content: 'A new fact',
        tags: [],
        createdAt: new Date(),
      });

      expect(store.size()).toBe(1);
      expect(store.getAllFacts()[0].content).toBe('A new fact');
    });

    it('updates existing fact with same content', () => {
      const store = new KeyFactStore(filePath);
      store.addFact({
        content: 'Same fact',
        tags: ['#tag1'],
        createdAt: new Date('2025-12-09'),
      });
      store.addFact({
        content: 'Same fact',
        tags: ['#tag2'],
        createdAt: new Date('2025-12-10'),
      });

      expect(store.size()).toBe(1);
      const fact = store.getAllFacts()[0];
      // Original createdAt preserved
      expect(fact.createdAt).toEqual(new Date('2025-12-09'));
      // Tags merged
      expect(fact.tags).toContain('#tag1');
      expect(fact.tags).toContain('#tag2');
    });

    it('handles case-insensitive duplicate detection', () => {
      const store = new KeyFactStore(filePath);
      store.addFact({
        content: 'My Fact',
        tags: [],
        createdAt: new Date(),
      });
      store.addFact({
        content: 'my fact',
        tags: ['#updated'],
        createdAt: new Date(),
      });

      expect(store.size()).toBe(1);
    });
  });

  describe('getImportant', () => {
    it('returns only facts with #important tag', () => {
      const store = new KeyFactStore(filePath);
      store.addFact({ content: 'Important 1', tags: ['#important'], createdAt: new Date() });
      store.addFact({ content: 'Normal 1', tags: ['#misc'], createdAt: new Date() });
      store.addFact({ content: 'Important 2', tags: ['#important', '#priority'], createdAt: new Date() });

      const important = store.getImportant();
      expect(important).toHaveLength(2);
      expect(important.every((f) => f.tags.includes('#important'))).toBe(true);
    });

    it('returns empty array when no important facts', () => {
      const store = new KeyFactStore(filePath);
      store.addFact({ content: 'Normal fact', tags: [], createdAt: new Date() });

      expect(store.getImportant()).toEqual([]);
    });
  });

  describe('getRecent', () => {
    it('returns most recent facts first', () => {
      const store = new KeyFactStore(filePath);
      store.addFact({ content: 'Old', tags: [], createdAt: new Date('2025-12-08') });
      store.addFact({ content: 'Middle', tags: [], createdAt: new Date('2025-12-09') });
      store.addFact({ content: 'New', tags: [], createdAt: new Date('2025-12-10') });

      const recent = store.getRecent(3);
      expect(recent[0].content).toBe('New');
      expect(recent[1].content).toBe('Middle');
      expect(recent[2].content).toBe('Old');
    });

    it('excludes important facts', () => {
      const store = new KeyFactStore(filePath);
      store.addFact({ content: 'Important', tags: ['#important'], createdAt: new Date() });
      store.addFact({ content: 'Recent', tags: [], createdAt: new Date() });

      const recent = store.getRecent(10);
      expect(recent).toHaveLength(1);
      expect(recent[0].content).toBe('Recent');
    });

    it('limits results to requested count', () => {
      const store = new KeyFactStore(filePath);
      for (let i = 0; i < 10; i++) {
        store.addFact({ content: `Fact ${i}`, tags: [], createdAt: new Date() });
      }

      expect(store.getRecent(3)).toHaveLength(3);
      expect(store.getRecent(100)).toHaveLength(10);
    });
  });

  describe('getContextString', () => {
    it('returns "no facts" message when empty', () => {
      const store = new KeyFactStore(filePath);
      expect(store.getContextString()).toBe('_No facts recorded yet_');
    });

    it('formats important and recent facts', () => {
      const store = new KeyFactStore(filePath);
      store.addFact({ content: 'Important fact', tags: ['#important'], createdAt: new Date() });
      store.addFact({ content: 'Recent fact', tags: [], createdAt: new Date() });

      const context = store.getContextString();
      expect(context).toContain('**Important:**');
      expect(context).toContain('- Important fact');
      expect(context).toContain('**Recent:**');
      expect(context).toContain('- Recent fact');
    });

    it('limits facts in context string', () => {
      const store = new KeyFactStore(filePath);
      // Add many important facts
      for (let i = 0; i < 20; i++) {
        store.addFact({ content: `Important ${i}`, tags: ['#important'], createdAt: new Date() });
      }
      // Add many recent facts
      for (let i = 0; i < 20; i++) {
        store.addFact({ content: `Recent ${i}`, tags: [], createdAt: new Date() });
      }

      const context = store.getContextString();
      // Should be limited to max counts (10 important, 5 recent)
      const importantMatches = context.match(/Important \d+/g) || [];
      const recentMatches = context.match(/Recent \d+/g) || [];

      expect(importantMatches.length).toBeLessThanOrEqual(10);
      expect(recentMatches.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getAllFacts', () => {
    it('returns copy of all facts', () => {
      const store = new KeyFactStore(filePath);
      store.addFact({ content: 'Fact 1', tags: [], createdAt: new Date() });
      store.addFact({ content: 'Fact 2', tags: ['#important'], createdAt: new Date() });

      const all1 = store.getAllFacts();
      const all2 = store.getAllFacts();

      expect(all1).not.toBe(all2);
      expect(all1).toHaveLength(2);
    });
  });

  describe('isLoaded', () => {
    it('returns false before load', () => {
      const store = new KeyFactStore(filePath);
      expect(store.isLoaded()).toBe(false);
    });

    it('returns true after load', async () => {
      const store = new KeyFactStore(filePath);
      await store.load();
      expect(store.isLoaded()).toBe(true);
    });
  });

  describe('size', () => {
    it('returns count of all facts', () => {
      const store = new KeyFactStore(filePath);
      expect(store.size()).toBe(0);

      store.addFact({ content: 'A', tags: [], createdAt: new Date() });
      expect(store.size()).toBe(1);

      store.addFact({ content: 'B', tags: [], createdAt: new Date() });
      expect(store.size()).toBe(2);
    });
  });

  describe('createKeyFactStore factory', () => {
    it('creates KeyFactStore instance', () => {
      const store = createKeyFactStore(filePath);
      expect(store).toBeInstanceOf(KeyFactStore);
    });
  });
});
