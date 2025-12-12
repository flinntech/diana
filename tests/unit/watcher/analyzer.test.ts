/**
 * Unit Tests: FileAnalyzer
 *
 * Feature: 003-file-watcher-proposals
 * Task: T040
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  FileAnalyzer,
  createFileAnalyzer,
  getExtensionCategory,
  classifyOfficeFile,
  extractTextContent,
  EXTENSION_DEFAULTS,
} from '../../../src/watcher/analyzer.js';

describe('FileAnalyzer', () => {
  let testDir: string;
  let analyzer: FileAnalyzer;

  beforeEach(async () => {
    testDir = join(tmpdir(), `diana-analyzer-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
    analyzer = createFileAnalyzer({ enableLlmClassification: false });
  });

  afterEach(async () => {
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  const mockResolver = (category: string, filename: string) =>
    join('/organized', category, filename);

  describe('analyze', () => {
    it('classifies screenshot files by pattern', async () => {
      const filePath = join(testDir, 'Screenshot 2025-12-11.png');
      await writeFile(filePath, 'fake image data');

      const result = await analyzer.analyze(filePath, mockResolver);

      expect(result.suggestedCategory).toBe('screenshots');
      expect(result.confidence).toBe('high');
      expect(result.analysisMethod).toBe('pattern');
    });

    it('classifies invoice files as finances', async () => {
      const filePath = join(testDir, 'invoice-december.pdf');
      await writeFile(filePath, '%PDF-1.4 fake pdf');

      const result = await analyzer.analyze(filePath, mockResolver);

      expect(result.suggestedCategory).toBe('finances');
      expect(result.sensitive).toBe(true);
    });

    it('classifies exe files as installers', async () => {
      const filePath = join(testDir, 'setup.exe');
      await writeFile(filePath, 'MZ fake exe');

      const result = await analyzer.analyze(filePath, mockResolver);

      expect(result.suggestedCategory).toBe('installers');
      expect(result.confidence).toBe('high');
    });

    it('classifies zip files as archives', async () => {
      const filePath = join(testDir, 'documents.zip');
      await writeFile(filePath, 'PK fake zip');

      const result = await analyzer.analyze(filePath, mockResolver);

      expect(result.suggestedCategory).toBe('archives');
    });

    it('classifies office files by extension', async () => {
      const filePath = join(testDir, 'presentation.pptx');
      await writeFile(filePath, 'PK fake pptx');

      const result = await analyzer.analyze(filePath, mockResolver);

      expect(result.suggestedCategory).toBe('work');
    });

    it('overrides office file category based on filename', async () => {
      const filePath = join(testDir, 'budget-2025.xlsx');
      await writeFile(filePath, 'PK fake xlsx');

      const result = await analyzer.analyze(filePath, mockResolver);

      expect(result.suggestedCategory).toBe('finances');
    });

    it('sets destination path correctly', async () => {
      const filePath = join(testDir, 'test.txt');
      await writeFile(filePath, 'test content');

      const result = await analyzer.analyze(filePath, mockResolver);

      expect(result.suggestedDestination).toContain('test.txt');
    });

    it('includes file metadata in analysis', async () => {
      const filePath = join(testDir, 'test-file.txt');
      await writeFile(filePath, 'test content here');

      const result = await analyzer.analyze(filePath, mockResolver);

      expect(result.path).toBe(filePath);
      expect(result.filename).toBe('test-file.txt');
      expect(result.extension).toBe('txt');
      expect(result.size).toBeGreaterThan(0);
      expect(result.mtime).toBeGreaterThan(0);
      expect(result.analyzedAt).toBeInstanceOf(Date);
    });
  });

  describe('getExtensionCategory', () => {
    it('returns category for known extensions', () => {
      expect(getExtensionCategory('exe')?.category).toBe('installers');
      expect(getExtensionCategory('zip')?.category).toBe('archives');
      expect(getExtensionCategory('mp4')?.category).toBe('media');
      expect(getExtensionCategory('ts')?.category).toBe('code');
    });

    it('handles extension with or without dot', () => {
      expect(getExtensionCategory('.exe')?.category).toBe('installers');
      expect(getExtensionCategory('exe')?.category).toBe('installers');
    });

    it('is case insensitive', () => {
      expect(getExtensionCategory('EXE')?.category).toBe('installers');
      expect(getExtensionCategory('Pdf')?.category).toBe('misc');
    });

    it('returns null for unknown extensions', () => {
      expect(getExtensionCategory('xyz')).toBeNull();
      expect(getExtensionCategory('unknown')).toBeNull();
    });
  });

  describe('classifyOfficeFile', () => {
    it('classifies spreadsheets as work by default', () => {
      const result = classifyOfficeFile('data.xlsx', 'xlsx');
      expect(result.category).toBe('work');
    });

    it('classifies budget spreadsheets as finances', () => {
      const result = classifyOfficeFile('budget-2025.xlsx', 'xlsx');
      expect(result.category).toBe('finances');
    });

    it('classifies expense spreadsheets as finances', () => {
      const result = classifyOfficeFile('expense-report.xlsx', 'xlsx');
      expect(result.category).toBe('finances');
    });

    it('classifies resumes as personal', () => {
      const result = classifyOfficeFile('resume-john.docx', 'docx');
      expect(result.category).toBe('personal');
    });

    it('classifies CVs as personal', () => {
      const result = classifyOfficeFile('CV-2025.docx', 'docx');
      expect(result.category).toBe('personal');
    });

    it('classifies manuals as reference', () => {
      const result = classifyOfficeFile('user-manual.docx', 'docx');
      expect(result.category).toBe('reference');
    });

    it('classifies presentations as work', () => {
      const result = classifyOfficeFile('quarterly-review.pptx', 'pptx');
      expect(result.category).toBe('work');
    });

    it('classifies meeting documents as work', () => {
      const result = classifyOfficeFile('meeting-notes.docx', 'docx');
      expect(result.category).toBe('work');
    });
  });

  describe('extractTextContent', () => {
    it('extracts text from text files', async () => {
      const filePath = join(testDir, 'test.txt');
      await writeFile(filePath, 'Hello, this is test content.');

      const content = await extractTextContent(filePath);

      expect(content).toContain('Hello');
      expect(content).toContain('test content');
    });

    it('limits extraction to maxBytes', async () => {
      const filePath = join(testDir, 'large.txt');
      const largeContent = 'A'.repeat(10000);
      await writeFile(filePath, largeContent);

      const content = await extractTextContent(filePath, 100);

      expect(content?.length).toBeLessThanOrEqual(100);
    });

    it('returns null for binary files', async () => {
      const filePath = join(testDir, 'binary.bin');
      // Create binary content with lots of null bytes
      const binaryContent = Buffer.alloc(1000);
      await writeFile(filePath, binaryContent);

      const content = await extractTextContent(filePath);

      expect(content).toBeNull();
    });

    it('returns null for non-existent files', async () => {
      const content = await extractTextContent('/nonexistent/file.txt');
      expect(content).toBeNull();
    });
  });

  describe('EXTENSION_DEFAULTS', () => {
    it('covers common file types', () => {
      // Office
      expect(EXTENSION_DEFAULTS.xlsx).toBeDefined();
      expect(EXTENSION_DEFAULTS.docx).toBeDefined();
      expect(EXTENSION_DEFAULTS.pptx).toBeDefined();

      // Code
      expect(EXTENSION_DEFAULTS.ts).toBeDefined();
      expect(EXTENSION_DEFAULTS.js).toBeDefined();
      expect(EXTENSION_DEFAULTS.py).toBeDefined();

      // Media
      expect(EXTENSION_DEFAULTS.mp4).toBeDefined();
      expect(EXTENSION_DEFAULTS.jpg).toBeDefined();
      expect(EXTENSION_DEFAULTS.mp3).toBeDefined();

      // Archives
      expect(EXTENSION_DEFAULTS.zip).toBeDefined();
      expect(EXTENSION_DEFAULTS.tar).toBeDefined();

      // Installers
      expect(EXTENSION_DEFAULTS.exe).toBeDefined();
      expect(EXTENSION_DEFAULTS.dmg).toBeDefined();
    });

    it('has valid categories and confidence levels', () => {
      const validCategories = [
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
      const validConfidence = ['low', 'medium', 'high'];

      for (const [ext, def] of Object.entries(EXTENSION_DEFAULTS)) {
        expect(validCategories).toContain(def.category);
        expect(validConfidence).toContain(def.confidence);
      }
    });
  });
});
