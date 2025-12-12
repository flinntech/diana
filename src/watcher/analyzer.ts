/**
 * File Analyzer
 *
 * Feature: 003-file-watcher-proposals
 * Date: 2025-12-11
 *
 * Layered file classification: patterns → extension → content → LLM
 */

import { stat, readFile, open } from 'fs/promises';
import { extname, basename } from 'path';
import type { FileCategory, ConfidenceLevel } from '../proposals/proposal.types.js';
import type {
  FileAnalysis,
  AnalysisMethod,
  PdfMetadata,
  LlmClassificationContext,
  LlmClassificationResult,
  WatcherConfig,
} from '../types/watcher.js';
import { matchPatterns, getBestMatch, checkSensitivity } from './patterns.js';

// =============================================================================
// Extension Mapping
// =============================================================================

/** Default category by file extension */
export const EXTENSION_DEFAULTS: Record<
  string,
  { category: FileCategory; confidence: ConfidenceLevel }
> = {
  // Office documents
  xlsx: { category: 'work', confidence: 'medium' },
  xls: { category: 'work', confidence: 'medium' },
  pptx: { category: 'work', confidence: 'high' },
  ppt: { category: 'work', confidence: 'high' },
  docx: { category: 'work', confidence: 'low' },
  doc: { category: 'work', confidence: 'low' },

  // PDF - could be many things, low confidence
  pdf: { category: 'misc', confidence: 'low' },

  // Installers
  exe: { category: 'installers', confidence: 'high' },
  msi: { category: 'installers', confidence: 'high' },
  dmg: { category: 'installers', confidence: 'high' },
  deb: { category: 'installers', confidence: 'high' },
  pkg: { category: 'installers', confidence: 'high' },
  appimage: { category: 'installers', confidence: 'high' },

  // Archives
  zip: { category: 'archives', confidence: 'high' },
  tar: { category: 'archives', confidence: 'high' },
  gz: { category: 'archives', confidence: 'high' },
  '7z': { category: 'archives', confidence: 'high' },
  rar: { category: 'archives', confidence: 'high' },

  // Code
  ts: { category: 'code', confidence: 'high' },
  js: { category: 'code', confidence: 'high' },
  py: { category: 'code', confidence: 'high' },
  rs: { category: 'code', confidence: 'high' },
  go: { category: 'code', confidence: 'high' },
  java: { category: 'code', confidence: 'high' },
  json: { category: 'code', confidence: 'medium' },
  yaml: { category: 'code', confidence: 'medium' },
  yml: { category: 'code', confidence: 'medium' },
  xml: { category: 'code', confidence: 'medium' },

  // Media - images
  jpg: { category: 'media', confidence: 'medium' },
  jpeg: { category: 'media', confidence: 'medium' },
  png: { category: 'media', confidence: 'medium' },
  gif: { category: 'media', confidence: 'high' },
  webp: { category: 'media', confidence: 'high' },
  svg: { category: 'media', confidence: 'high' },
  bmp: { category: 'media', confidence: 'high' },

  // Media - video
  mp4: { category: 'media', confidence: 'high' },
  mov: { category: 'media', confidence: 'high' },
  avi: { category: 'media', confidence: 'high' },
  mkv: { category: 'media', confidence: 'high' },
  webm: { category: 'media', confidence: 'high' },

  // Media - audio
  mp3: { category: 'media', confidence: 'high' },
  wav: { category: 'media', confidence: 'high' },
  flac: { category: 'media', confidence: 'high' },
  ogg: { category: 'media', confidence: 'high' },

  // Text
  txt: { category: 'misc', confidence: 'low' },
  md: { category: 'misc', confidence: 'low' },
  rtf: { category: 'misc', confidence: 'low' },
};

/**
 * Get category by file extension
 */
export function getExtensionCategory(
  extension: string
): { category: FileCategory; confidence: ConfidenceLevel } | null {
  const ext = extension.toLowerCase().replace(/^\./, '');
  return EXTENSION_DEFAULTS[ext] || null;
}

// =============================================================================
// Content Analysis
// =============================================================================

/**
 * Extract text content from a file (first N bytes)
 *
 * Returns null if file is too large or binary
 */
export async function extractTextContent(
  filePath: string,
  maxBytes = 4096
): Promise<string | null> {
  try {
    const stats = await stat(filePath);

    // Skip large files
    if (stats.size > 10_000_000) {
      return null;
    }

    // Read first N bytes
    const fd = await open(filePath, 'r');
    try {
      const buffer = Buffer.alloc(Math.min(maxBytes, stats.size));
      await fd.read(buffer, 0, buffer.length, 0);
      const text = buffer.toString('utf8');

      // Check if content looks like text (high ratio of printable chars)
      const printableRatio = countPrintable(text) / text.length;
      if (printableRatio < 0.8) {
        return null; // Likely binary
      }

      return text;
    } finally {
      await fd.close();
    }
  } catch {
    return null;
  }
}

/**
 * Count printable characters in a string
 */
function countPrintable(str: string): number {
  let count = 0;
  for (const char of str) {
    const code = char.charCodeAt(0);
    if (
      (code >= 32 && code <= 126) || // ASCII printable
      code === 9 || // Tab
      code === 10 || // LF
      code === 13 || // CR
      code >= 192 // Extended Latin
    ) {
      count++;
    }
  }
  return count;
}

/**
 * Extract PDF metadata using pdf-parse (if available)
 *
 * Returns null if pdf-parse is not installed or parsing fails
 */
export async function extractPdfMetadata(filePath: string): Promise<PdfMetadata | null> {
  try {
    // Dynamic import - pdf-parse is optional
    // @ts-expect-error - pdf-parse doesn't have type definitions
    const pdfParse = await import('pdf-parse').catch(() => null);
    if (!pdfParse) {
      return null;
    }

    const buffer = await readFile(filePath);
    const data = await pdfParse.default(buffer, {
      max: 2, // Only parse first 2 pages
    });

    return {
      title: data.info?.Title,
      author: data.info?.Author,
      subject: data.info?.Subject,
      creator: data.info?.Creator,
      creationDate: data.info?.CreationDate
        ? new Date(data.info.CreationDate)
        : undefined,
      pageCount: data.numpages,
      firstPageText: data.text?.slice(0, 500),
    };
  } catch {
    return null;
  }
}

/**
 * Classify Office files by filename patterns
 *
 * Office files (xlsx, pptx, docx) are ZIP archives - we can't easily read content
 * Instead, use filename patterns to refine the extension default
 */
export function classifyOfficeFile(
  filename: string,
  ext: string
): { category: FileCategory; confidence: ConfidenceLevel } {
  const defaultCat = EXTENSION_DEFAULTS[ext] ?? { category: 'misc', confidence: 'low' };

  // Finance keywords (override to finances)
  if (/budget|expense|invoice|receipt|tax/i.test(filename)) {
    return { category: 'finances', confidence: 'high' };
  }

  // Personal keywords (override to personal)
  if (/resume|cv|letter|application/i.test(filename)) {
    return { category: 'personal', confidence: 'high' };
  }

  // Reference keywords (override to reference)
  if (/manual|guide|handbook|template/i.test(filename)) {
    return { category: 'reference', confidence: 'medium' };
  }

  // Work confirmation
  if (/meeting|project|client|report|presentation/i.test(filename)) {
    return { category: 'work', confidence: 'high' };
  }

  return defaultCat;
}

// =============================================================================
// LLM Classification
// =============================================================================

/** LLM classification prompt template */
export const LLM_CLASSIFICATION_PROMPT = `Analyze this file for organization.

File: {filename}
Extension: {extension}
Size: {size} bytes
{contentSection}

Respond with ONLY valid JSON (no markdown, no explanation):
{"category": "string", "confidence": "low|medium|high", "reasoning": "string"}

Categories (choose one):
- finances: invoices, receipts, tax documents, budgets, statements
- screenshots: screen captures
- installers: executables, packages, setup files
- work: work/business documents, presentations, reports
- personal: personal documents, letters, certificates, resumes
- reference: manuals, guides, documentation
- media: images, videos, audio
- archives: compressed files
- code: source code, configuration files
- misc: cannot determine category`;

/**
 * Classify a file using LLM
 *
 * This is the fallback for files that can't be classified by patterns or extension
 */
export async function classifyWithLlm(
  context: LlmClassificationContext,
  llmQuery: (prompt: string) => Promise<string>
): Promise<LlmClassificationResult> {
  let contentSection = '';

  if (context.contentPreview) {
    contentSection = `\nContent preview:\n${context.contentPreview.slice(0, 1000)}`;
  } else if (context.pdfMetadata) {
    const meta = context.pdfMetadata;
    contentSection = `\nPDF metadata:
- Title: ${meta.title || 'unknown'}
- Author: ${meta.author || 'unknown'}
- Pages: ${meta.pageCount || 'unknown'}`;
    if (meta.firstPageText) {
      contentSection += `\nFirst page text:\n${meta.firstPageText}`;
    }
  }

  const prompt = LLM_CLASSIFICATION_PROMPT.replace('{filename}', context.filename)
    .replace('{extension}', context.extension)
    .replace('{size}', String(context.size))
    .replace('{contentSection}', contentSection);

  try {
    const response = await llmQuery(prompt);

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        category: 'misc',
        confidence: 'low',
        reasoning: 'Failed to parse LLM response',
      };
    }

    const result = JSON.parse(jsonMatch[0]) as LlmClassificationResult;

    // Validate category
    const validCategories: FileCategory[] = [
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

    if (!validCategories.includes(result.category)) {
      result.category = 'misc';
    }

    // Validate confidence
    const validConfidence: ConfidenceLevel[] = ['low', 'medium', 'high'];
    if (!validConfidence.includes(result.confidence)) {
      result.confidence = 'low';
    }

    return result;
  } catch (error) {
    return {
      category: 'misc',
      confidence: 'low',
      reasoning: `LLM classification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// =============================================================================
// FileAnalyzer Class
// =============================================================================

/**
 * Analyzes files to determine category and destination
 */
export class FileAnalyzer {
  private readonly config: Pick<
    WatcherConfig,
    'maxContentPreviewBytes' | 'maxFileSizeForContent' | 'enableLlmClassification'
  >;
  private readonly llmQuery?: (prompt: string) => Promise<string>;

  constructor(
    config: Partial<WatcherConfig> = {},
    llmQuery?: (prompt: string) => Promise<string>
  ) {
    this.config = {
      maxContentPreviewBytes: config.maxContentPreviewBytes ?? 4096,
      maxFileSizeForContent: config.maxFileSizeForContent ?? 10_000_000,
      enableLlmClassification: config.enableLlmClassification ?? true,
    };
    this.llmQuery = llmQuery;
  }

  /**
   * Analyze a file and return classification result
   *
   * Uses layered approach: patterns → extension → content → LLM
   * Gracefully handles file access errors by returning low-confidence proposals
   */
  async analyze(
    filePath: string,
    resolveDestination: (category: FileCategory, filename: string) => string
  ): Promise<FileAnalysis> {
    const filename = basename(filePath);
    const ext = extname(filename).toLowerCase().replace(/^\./, '');

    // Try to get file stats - handle permission denied and other access errors
    let stats: { size: number; mtimeMs: number };
    try {
      stats = await stat(filePath);
    } catch (error) {
      const errCode = (error as NodeJS.ErrnoException).code;
      let reasoning = 'Could not analyze file';

      if (errCode === 'ENOENT') {
        reasoning = 'File no longer exists';
      } else if (errCode === 'EACCES' || errCode === 'EPERM') {
        reasoning = 'Permission denied - cannot read file';
      } else if (errCode === 'EBUSY') {
        reasoning = 'File is locked by another process';
      }

      // Return a low-confidence analysis for inaccessible files
      const sensitivity = checkSensitivity(filename);
      const fallbackCategory = getExtensionCategory(ext)?.category ?? 'misc';
      return {
        path: filePath,
        filename,
        extension: ext,
        size: 0,
        mtime: Date.now(),
        matchedPatterns: [],
        suggestedCategory: fallbackCategory,
        suggestedDestination: resolveDestination(fallbackCategory, filename),
        confidence: 'low',
        reasoning,
        sensitive: sensitivity.sensitive,
        sensitiveReason: sensitivity.reason,
        analyzedAt: new Date(),
        analysisMethod: 'extension',
      };
    }

    // Layer 1: Pattern matching
    const patternMatch = getBestMatch(filename);
    if (patternMatch && patternMatch.confidence === 'high') {
      const sensitivity = checkSensitivity(filename);
      return this.createAnalysis(filePath, stats, {
        category: patternMatch.category,
        confidence: patternMatch.confidence,
        reasoning: `Filename matches ${patternMatch.pattern} pattern`,
        method: 'pattern',
        matchedPatterns: [patternMatch.pattern],
        sensitivity,
        resolveDestination,
      });
    }

    // Layer 2: Extension mapping
    const extCategory = getExtensionCategory(ext);

    // Special handling for Office files
    const officeExts = ['xlsx', 'xls', 'pptx', 'ppt', 'docx', 'doc'];
    if (officeExts.includes(ext)) {
      const classified = classifyOfficeFile(filename, ext);
      const sensitivity = checkSensitivity(filename);
      return this.createAnalysis(filePath, stats, {
        category: classified.category,
        confidence: classified.confidence,
        reasoning: `Office file classified by filename and extension`,
        method: 'extension',
        matchedPatterns: patternMatch ? [patternMatch.pattern] : [],
        sensitivity,
        resolveDestination,
      });
    }

    // High confidence extension match
    if (extCategory && extCategory.confidence === 'high') {
      const sensitivity = checkSensitivity(filename);
      return this.createAnalysis(filePath, stats, {
        category: extCategory.category,
        confidence: extCategory.confidence,
        reasoning: `File extension .${ext} indicates ${extCategory.category}`,
        method: 'extension',
        matchedPatterns: patternMatch ? [patternMatch.pattern] : [],
        sensitivity,
        resolveDestination,
      });
    }

    // Layer 3: Content analysis for text/PDF files
    let contentPreview: string | undefined;
    let pdfMetadata: PdfMetadata | undefined;

    if (ext === 'pdf') {
      pdfMetadata = (await extractPdfMetadata(filePath)) || undefined;
      if (pdfMetadata?.firstPageText) {
        // Try pattern matching on PDF content
        const contentPatterns = matchPatterns(pdfMetadata.firstPageText);
        if (contentPatterns.length > 0 && contentPatterns[0].confidence !== 'low') {
          const sensitivity = checkSensitivity(
            filename,
            pdfMetadata.firstPageText
          );
          return this.createAnalysis(filePath, stats, {
            category: contentPatterns[0].category,
            confidence: contentPatterns[0].confidence,
            reasoning: `PDF content matches ${contentPatterns[0].pattern} pattern`,
            method: 'pdf',
            matchedPatterns: contentPatterns.map((p) => p.pattern),
            pdfMetadata,
            sensitivity,
            resolveDestination,
          });
        }
      }
    } else if (stats.size < this.config.maxFileSizeForContent) {
      contentPreview = (await extractTextContent(
        filePath,
        this.config.maxContentPreviewBytes
      )) || undefined;

      if (contentPreview) {
        // Try pattern matching on content
        const contentPatterns = matchPatterns(contentPreview);
        if (contentPatterns.length > 0 && contentPatterns[0].confidence !== 'low') {
          const sensitivity = checkSensitivity(filename, contentPreview);
          return this.createAnalysis(filePath, stats, {
            category: contentPatterns[0].category,
            confidence: contentPatterns[0].confidence,
            reasoning: `File content matches ${contentPatterns[0].pattern} pattern`,
            method: 'content',
            matchedPatterns: contentPatterns.map((p) => p.pattern),
            contentPreview,
            sensitivity,
            resolveDestination,
          });
        }
      }
    }

    // Layer 4: LLM classification (if enabled and available)
    if (this.config.enableLlmClassification && this.llmQuery) {
      const llmResult = await classifyWithLlm(
        {
          filename,
          extension: ext,
          size: stats.size,
          contentPreview,
          pdfMetadata,
        },
        this.llmQuery
      );

      const sensitivity = checkSensitivity(filename, contentPreview);
      return this.createAnalysis(filePath, stats, {
        category: llmResult.category,
        confidence: llmResult.confidence,
        reasoning: llmResult.reasoning,
        method: 'llm',
        matchedPatterns: patternMatch ? [patternMatch.pattern] : [],
        contentPreview,
        pdfMetadata,
        sensitivity,
        resolveDestination,
      });
    }

    // Fallback: use extension default or misc
    const fallbackCategory = extCategory?.category ?? 'misc';
    const sensitivity = checkSensitivity(filename, contentPreview);
    return this.createAnalysis(filePath, stats, {
      category: fallbackCategory,
      confidence: 'low',
      reasoning: `Unable to determine category with high confidence`,
      method: 'extension',
      matchedPatterns: patternMatch ? [patternMatch.pattern] : [],
      contentPreview,
      pdfMetadata,
      sensitivity,
      resolveDestination,
    });
  }

  /**
   * Create FileAnalysis object
   */
  private createAnalysis(
    filePath: string,
    stats: { size: number; mtimeMs: number },
    options: {
      category: FileCategory;
      confidence: ConfidenceLevel;
      reasoning: string;
      method: AnalysisMethod;
      matchedPatterns: string[];
      contentPreview?: string;
      pdfMetadata?: PdfMetadata;
      sensitivity: { sensitive: boolean; reason?: string };
      resolveDestination: (category: FileCategory, filename: string) => string;
    }
  ): FileAnalysis {
    const filename = basename(filePath);
    const ext = extname(filename).toLowerCase().replace(/^\./, '');

    return {
      path: filePath,
      filename,
      extension: ext,
      size: stats.size,
      mtime: stats.mtimeMs,
      matchedPatterns: options.matchedPatterns,
      contentPreview: options.contentPreview,
      pdfMetadata: options.pdfMetadata,
      suggestedCategory: options.category,
      suggestedDestination: options.resolveDestination(options.category, filename),
      confidence: options.confidence,
      reasoning: options.reasoning,
      sensitive: options.sensitivity.sensitive,
      sensitiveReason: options.sensitivity.reason,
      analyzedAt: new Date(),
      analysisMethod: options.method,
    };
  }
}

/**
 * Create a new FileAnalyzer instance
 */
export function createFileAnalyzer(
  config?: Partial<WatcherConfig>,
  llmQuery?: (prompt: string) => Promise<string>
): FileAnalyzer {
  return new FileAnalyzer(config, llmQuery);
}
