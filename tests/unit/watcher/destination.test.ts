/**
 * Unit Tests: DestinationResolver
 *
 * Feature: 003-file-watcher-proposals
 * Task: T041
 */

import { describe, it, expect } from 'vitest';
import {
  DestinationResolver,
  createDestinationResolver,
  DEFAULT_DESTINATIONS,
} from '../../../src/watcher/destination.js';
import type { FileAnalysis } from '../../../src/types/watcher.js';

describe('DestinationResolver', () => {
  const basePath = '/mnt/c/Users/test/Organized';
  const watchedDirs = ['/mnt/c/Users/test/Downloads', '/mnt/c/Users/test/Documents'];

  describe('constructor', () => {
    it('normalizes base path', () => {
      const resolver = createDestinationResolver('/mnt/c/Users/test/Organized');
      expect(resolver.getBasePath()).toBe('/mnt/c/Users/test/Organized');
    });

    it('stores watched directories', () => {
      const resolver = createDestinationResolver(basePath, watchedDirs);
      expect(resolver.getWatchedDirectories()).toHaveLength(2);
    });
  });

  describe('resolvePath', () => {
    it('resolves finances path with year', () => {
      const resolver = createDestinationResolver(basePath);
      const path = resolver.resolvePath('finances', 'invoice.pdf');

      expect(path).toContain('Finances');
      expect(path).toMatch(/\d{4}/); // Contains year
      expect(path).toContain('invoice.pdf');
    });

    it('resolves screenshots path with year and month', () => {
      const resolver = createDestinationResolver(basePath);
      const path = resolver.resolvePath('screenshots', 'capture.png');

      expect(path).toContain('Screenshots');
      expect(path).toMatch(/\d{4}/); // Year
      expect(path).toMatch(/\d{2}/); // Month
      expect(path).toContain('capture.png');
    });

    it('resolves installers to flat folder', () => {
      const resolver = createDestinationResolver(basePath);
      const path = resolver.resolvePath('installers', 'setup.exe');

      expect(path).toBe('/mnt/c/Users/test/Organized/Installers/setup.exe');
    });

    it('resolves misc category', () => {
      const resolver = createDestinationResolver(basePath);
      const path = resolver.resolvePath('misc', 'unknown.xyz');

      expect(path).toContain('Misc');
      expect(path).toContain('unknown.xyz');
    });
  });

  describe('isValidDestination', () => {
    it('returns true for paths outside watched directories', () => {
      const resolver = createDestinationResolver(basePath, watchedDirs);
      expect(resolver.isValidDestination('/mnt/c/Users/test/Organized/file.txt')).toBe(
        true
      );
    });

    it('returns false for paths inside watched directories', () => {
      const resolver = createDestinationResolver(basePath, watchedDirs);
      expect(
        resolver.isValidDestination('/mnt/c/Users/test/Downloads/file.txt')
      ).toBe(false);
      expect(
        resolver.isValidDestination('/mnt/c/Users/test/Documents/subfolder/file.txt')
      ).toBe(false);
    });

    it('returns false for watched directory itself', () => {
      const resolver = createDestinationResolver(basePath, watchedDirs);
      expect(resolver.isValidDestination('/mnt/c/Users/test/Downloads')).toBe(false);
    });

    it('returns true when no watched directories configured', () => {
      const resolver = createDestinationResolver(basePath, []);
      expect(resolver.isValidDestination('/any/path/file.txt')).toBe(true);
    });
  });

  describe('resolve', () => {
    it('returns destination result for valid analysis', () => {
      const resolver = createDestinationResolver(basePath, watchedDirs);

      const analysis: FileAnalysis = {
        path: '/mnt/c/Users/test/Downloads/invoice.pdf',
        filename: 'invoice.pdf',
        extension: 'pdf',
        size: 1024,
        mtime: Date.now(),
        matchedPatterns: [],
        suggestedCategory: 'finances',
        suggestedDestination: resolver.resolvePath('finances', 'invoice.pdf'),
        confidence: 'high',
        reasoning: 'test',
        sensitive: false,
        analyzedAt: new Date(),
        analysisMethod: 'pattern',
      };

      const result = resolver.resolve(analysis);

      expect(result).not.toBeNull();
      expect(result?.path).toContain('Finances');
      expect(result?.action).toBe('move');
    });

    it('returns null if destination is in watched directory', () => {
      const resolver = createDestinationResolver(
        '/mnt/c/Users/test/Downloads', // Base path IS a watched directory!
        watchedDirs
      );

      const analysis: FileAnalysis = {
        path: '/mnt/c/Users/test/Downloads/file.txt',
        filename: 'file.txt',
        extension: 'txt',
        size: 1024,
        mtime: Date.now(),
        matchedPatterns: [],
        suggestedCategory: 'misc',
        suggestedDestination: '/mnt/c/Users/test/Downloads/Misc/file.txt',
        confidence: 'low',
        reasoning: 'test',
        sensitive: false,
        analyzedAt: new Date(),
        analysisMethod: 'extension',
      };

      const result = resolver.resolve(analysis);

      expect(result).toBeNull();
    });

    it('returns null if source and destination are the same', () => {
      const resolver = createDestinationResolver(basePath, watchedDirs);

      const analysis: FileAnalysis = {
        path: '/mnt/c/Users/test/Organized/Misc/file.txt',
        filename: 'file.txt',
        extension: 'txt',
        size: 1024,
        mtime: Date.now(),
        matchedPatterns: [],
        suggestedCategory: 'misc',
        suggestedDestination: '/mnt/c/Users/test/Organized/Misc/file.txt',
        confidence: 'low',
        reasoning: 'test',
        sensitive: false,
        analyzedAt: new Date(),
        analysisMethod: 'extension',
      };

      const result = resolver.resolve(analysis);

      expect(result).toBeNull();
    });
  });

  describe('category-specific resolvers', () => {
    const resolver = createDestinationResolver(basePath);

    it('resolves finances with custom year', () => {
      const path = resolver.resolveFinances('tax.pdf', 2024);
      expect(path).toContain('2024');
      expect(path).toContain('Finances');
    });

    it('resolves screenshots with custom date', () => {
      const date = new Date('2023-06-15');
      const path = resolver.resolveScreenshots('capture.png', date);
      expect(path).toContain('2023');
      expect(path).toContain('06');
    });

    it('resolves work with project subfolder', () => {
      const path = resolver.resolveWork('report.docx', 'ClientA');
      expect(path).toContain('Work');
      expect(path).toContain('ClientA');
    });

    it('resolves work without project', () => {
      const path = resolver.resolveWork('notes.txt');
      expect(path).toContain('Work');
      expect(path).not.toContain('undefined');
    });

    it('resolves all category methods', () => {
      expect(resolver.resolveInstallers('app.exe')).toContain('Installers');
      expect(resolver.resolvePersonal('resume.pdf')).toContain('Personal');
      expect(resolver.resolveReference('manual.pdf')).toContain('Reference');
      expect(resolver.resolveMedia('video.mp4')).toContain('Media');
      expect(resolver.resolveArchives('backup.zip')).toContain('Archives');
      expect(resolver.resolveCode('script.py')).toContain('Code');
      expect(resolver.resolveMisc('random.xyz')).toContain('Misc');
    });
  });

  describe('createResolveFunction', () => {
    it('returns a bound resolve function', () => {
      const resolver = createDestinationResolver(basePath);
      const resolveFn = resolver.createResolveFunction();

      const path = resolveFn('finances', 'invoice.pdf');
      expect(path).toContain('Finances');
      expect(path).toContain('invoice.pdf');
    });
  });

  describe('DEFAULT_DESTINATIONS', () => {
    it('has all categories', () => {
      const categories = [
        'finances',
        'screenshots',
        'installers',
        'work',
        'personal',
        'reference',
        'media',
        'archives',
        'code',
        'misc',
      ];

      for (const cat of categories) {
        expect(DEFAULT_DESTINATIONS[cat as keyof typeof DEFAULT_DESTINATIONS]).toBeDefined();
      }
    });

    it('all templates include {basePath}', () => {
      for (const template of Object.values(DEFAULT_DESTINATIONS)) {
        expect(template).toContain('{basePath}');
      }
    });
  });
});
