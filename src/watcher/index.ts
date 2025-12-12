/**
 * Watcher Module
 *
 * Feature: 003-file-watcher-proposals
 * Date: 2025-12-11
 *
 * Module exports for the file watcher system.
 */

// Types from types/watcher.ts
export type {
  WatchedDirectory,
  AnalysisMethod,
  PdfMetadata,
  FileAnalysis,
  PatternMatch,
  SensitivityResult,
  LlmClassificationContext,
  LlmClassificationResult,
  DestinationResult,
  WatcherConfig,
  WatcherServiceEvents,
} from '../types/watcher.js';

export {
  DEFAULT_WATCHED_DIRECTORIES,
  DEFAULT_WATCHER_CONFIG,
} from '../types/watcher.js';

// Patterns
export {
  SCREENSHOT_PATTERNS,
  FINANCIAL_PATTERNS,
  INSTALLER_PATTERNS,
  WORK_PATTERNS,
  PERSONAL_PATTERNS,
  REFERENCE_PATTERNS,
  ALL_PATTERNS,
  SENSITIVE_PATTERNS,
  matchPatterns,
  getBestMatch,
  checkSensitivity,
} from './patterns.js';

// Analyzer
export {
  EXTENSION_DEFAULTS,
  getExtensionCategory,
  extractTextContent,
  extractPdfMetadata,
  classifyOfficeFile,
  classifyWithLlm,
  LLM_CLASSIFICATION_PROMPT,
  FileAnalyzer,
  createFileAnalyzer,
} from './analyzer.js';

// Destination resolver
export {
  DEFAULT_DESTINATIONS,
  DestinationResolver,
  createDestinationResolver,
} from './destination.js';

// Watcher service
export { WatcherService, createWatcherService } from './watcher.service.js';
