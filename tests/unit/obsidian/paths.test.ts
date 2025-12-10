/**
 * Unit Tests for Path Resolution Utilities
 *
 * Feature: 001-obsidian-integration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mockDate, restoreDate } from '../../setup.js';
import {
  PathResolver,
  toWikilink,
  fromWikilink,
  getRelativePath,
} from '../../../src/obsidian/paths.js';

describe('PathResolver', () => {
  const vaultPath = '/mnt/c/Users/joshu/Obsidian/DIANA/DIANA_brain';
  let resolver: PathResolver;

  beforeEach(() => {
    mockDate('2025-12-10T14:30:00');
    resolver = new PathResolver(vaultPath);
  });

  afterEach(() => {
    restoreDate();
  });

  describe('getDailyLogPath', () => {
    it('generates correct daily log path for current date', () => {
      const path = resolver.getDailyLogPath();
      expect(path).toBe(`${vaultPath}/daily/2025-12-10.md`);
    });

    it('generates correct daily log path for custom date', () => {
      const customDate = new Date('2025-12-09T10:00:00');
      const path = resolver.getDailyLogPath(customDate);
      expect(path).toBe(`${vaultPath}/daily/2025-12-09.md`);
    });
  });

  describe('getObservationPath', () => {
    it('generates path with date and slug', () => {
      const path = resolver.getObservationPath('file-patterns');
      expect(path).toBe(`${vaultPath}/observations/2025-12-10-file-patterns.md`);
    });

    it('slugifies the input', () => {
      const path = resolver.getObservationPath('File Patterns!');
      expect(path).toBe(`${vaultPath}/observations/2025-12-10-file-patterns.md`);
    });

    it('handles custom date', () => {
      const customDate = new Date('2025-12-08T15:00:00');
      const path = resolver.getObservationPath('test', customDate);
      expect(path).toBe(`${vaultPath}/observations/2025-12-08-test.md`);
    });
  });

  describe('getProposalPath', () => {
    it('generates path with date and proposal ID', () => {
      const path = resolver.getProposalPath('organize-downloads');
      expect(path).toBe(`${vaultPath}/proposals/2025-12-10-organize-downloads.md`);
    });

    it('slugifies the proposal ID', () => {
      const path = resolver.getProposalPath('Organize Downloads!');
      expect(path).toBe(`${vaultPath}/proposals/2025-12-10-organize-downloads.md`);
    });
  });

  describe('getSystemPath', () => {
    it('generates path with date and category', () => {
      const path = resolver.getSystemPath('startup');
      expect(path).toBe(`${vaultPath}/system/2025-12-10-startup.md`);
    });

    it('works with all system categories', () => {
      expect(resolver.getSystemPath('startup')).toContain('startup.md');
      expect(resolver.getSystemPath('shutdown')).toContain('shutdown.md');
      expect(resolver.getSystemPath('error')).toContain('error.md');
      expect(resolver.getSystemPath('config')).toContain('config.md');
      expect(resolver.getSystemPath('maintenance')).toContain('maintenance.md');
    });
  });

  describe('getIndexPath', () => {
    it('generates path to index.md at vault root', () => {
      const path = resolver.getIndexPath();
      expect(path).toBe(`${vaultPath}/index.md`);
    });
  });

  describe('isValidVaultPath', () => {
    it('returns true for paths within vault', () => {
      expect(resolver.isValidVaultPath(`${vaultPath}/daily/2025-12-10.md`)).toBe(true);
      expect(resolver.isValidVaultPath(`${vaultPath}/observations/test.md`)).toBe(true);
    });

    it('returns false for path traversal attempts', () => {
      expect(resolver.isValidVaultPath(`${vaultPath}/../secret.md`)).toBe(false);
      expect(resolver.isValidVaultPath('/etc/passwd')).toBe(false);
    });

    it('returns false for absolute paths outside vault', () => {
      expect(resolver.isValidVaultPath('/tmp/malicious.md')).toBe(false);
    });
  });

  describe('getDirectoryPath', () => {
    it('returns correct directory paths', () => {
      expect(resolver.getDirectoryPath('daily')).toBe(`${vaultPath}/daily`);
      expect(resolver.getDirectoryPath('observations')).toBe(`${vaultPath}/observations`);
      expect(resolver.getDirectoryPath('proposals')).toBe(`${vaultPath}/proposals`);
      expect(resolver.getDirectoryPath('system')).toBe(`${vaultPath}/system`);
    });
  });

  describe('getVaultPath', () => {
    it('returns the vault path', () => {
      expect(resolver.getVaultPath()).toBe(vaultPath);
    });
  });

  describe('custom date format', () => {
    it('uses custom date format when provided', () => {
      const customResolver = new PathResolver(vaultPath, 'yyyy/MM/dd');
      const path = customResolver.getDailyLogPath();
      expect(path).toBe(`${vaultPath}/daily/2025/12/10.md`);
    });
  });
});

describe('Wikilink Utilities', () => {
  describe('toWikilink', () => {
    it('converts relative path to wikilink', () => {
      expect(toWikilink('observations/2025-12-10-patterns')).toBe('[[observations/2025-12-10-patterns]]');
    });

    it('removes .md extension', () => {
      expect(toWikilink('daily/2025-12-10.md')).toBe('[[daily/2025-12-10]]');
    });

    it('handles paths without extension', () => {
      expect(toWikilink('proposals/test')).toBe('[[proposals/test]]');
    });
  });

  describe('fromWikilink', () => {
    it('extracts path from wikilink', () => {
      expect(fromWikilink('[[observations/2025-12-10-patterns]]')).toBe('observations/2025-12-10-patterns');
    });

    it('handles simple wikilinks', () => {
      expect(fromWikilink('[[index]]')).toBe('index');
    });
  });

  describe('getRelativePath', () => {
    it('gets relative path from vault', () => {
      const vaultPath = '/mnt/c/Users/joshu/Obsidian/DIANA/DIANA_brain';
      const absolutePath = `${vaultPath}/daily/2025-12-10.md`;
      expect(getRelativePath(vaultPath, absolutePath)).toBe('daily/2025-12-10');
    });

    it('removes .md extension', () => {
      const vaultPath = '/vault';
      expect(getRelativePath(vaultPath, '/vault/observations/test.md')).toBe('observations/test');
    });
  });
});
