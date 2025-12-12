/**
 * File Pattern Matching
 *
 * Feature: 003-file-watcher-proposals
 * Date: 2025-12-11
 *
 * Pattern definitions for classifying files by filename.
 */

import type { FileCategory, ConfidenceLevel } from '../proposals/proposal.types.js';
import type { PatternMatch, SensitivityResult } from '../types/watcher.js';

// =============================================================================
// Pattern Definitions
// =============================================================================

/** Pattern definition with regex and metadata */
interface PatternDef {
  name: string;
  pattern: RegExp;
  category: FileCategory;
  confidence: ConfidenceLevel;
}

/**
 * Screenshot filename patterns
 * Matches common screenshot naming conventions across platforms
 */
export const SCREENSHOT_PATTERNS: PatternDef[] = [
  {
    name: 'screenshot_prefix',
    pattern: /^(screenshot|screen shot|capture|snip|snipping)/i,
    category: 'screenshots',
    confidence: 'high',
  },
  {
    name: 'screenshot_dated',
    pattern: /^Screenshot[_\s-]?\d{4}[-_]?\d{2}[-_]?\d{2}/i,
    category: 'screenshots',
    confidence: 'high',
  },
  {
    name: 'macos_screenshot',
    pattern: /^Screen\s?Shot\s?\d{4}/i,
    category: 'screenshots',
    confidence: 'high',
  },
  {
    name: 'windows_snip',
    pattern: /Snip\s?&\s?Sketch/i,
    category: 'screenshots',
    confidence: 'high',
  },
];

/**
 * Financial document patterns
 */
export const FINANCIAL_PATTERNS: PatternDef[] = [
  {
    name: 'invoice',
    pattern: /invoice|faktura|rechnung/i,
    category: 'finances',
    confidence: 'high',
  },
  {
    name: 'receipt',
    pattern: /receipt|rcpt|quittung|bon/i,
    category: 'finances',
    confidence: 'high',
  },
  {
    name: 'tax_document',
    pattern: /tax|w-?2|1099|steuer/i,
    category: 'finances',
    confidence: 'high',
  },
  {
    name: 'budget',
    pattern: /budget|expense|ausgaben/i,
    category: 'finances',
    confidence: 'medium',
  },
  {
    name: 'bank_statement',
    pattern: /statement|kontoauszug|bank/i,
    category: 'finances',
    confidence: 'medium',
  },
];

/**
 * Installer patterns by extension
 */
export const INSTALLER_PATTERNS: PatternDef[] = [
  {
    name: 'windows_exe',
    pattern: /\.(exe|msi)$/i,
    category: 'installers',
    confidence: 'high',
  },
  {
    name: 'macos_installer',
    pattern: /\.(dmg|pkg)$/i,
    category: 'installers',
    confidence: 'high',
  },
  {
    name: 'linux_package',
    pattern: /\.(deb|rpm|appimage)$/i,
    category: 'installers',
    confidence: 'high',
  },
  {
    name: 'setup',
    pattern: /setup|install/i,
    category: 'installers',
    confidence: 'medium',
  },
];

/**
 * Work-related document patterns
 */
export const WORK_PATTERNS: PatternDef[] = [
  {
    name: 'meeting',
    pattern: /meeting|agenda|minutes/i,
    category: 'work',
    confidence: 'medium',
  },
  {
    name: 'project',
    pattern: /project|proposal|report/i,
    category: 'work',
    confidence: 'medium',
  },
  {
    name: 'presentation',
    pattern: /presentation|slides|deck/i,
    category: 'work',
    confidence: 'medium',
  },
  {
    name: 'contract',
    pattern: /contract|agreement|nda|sow/i,
    category: 'work',
    confidence: 'high',
  },
];

/**
 * Personal document patterns
 */
export const PERSONAL_PATTERNS: PatternDef[] = [
  {
    name: 'resume',
    pattern: /resume|cv|lebenslauf/i,
    category: 'personal',
    confidence: 'high',
  },
  {
    name: 'letter',
    pattern: /letter|correspondence|brief/i,
    category: 'personal',
    confidence: 'medium',
  },
  {
    name: 'certificate',
    pattern: /certificate|diploma|license|zertifikat/i,
    category: 'personal',
    confidence: 'high',
  },
  {
    name: 'application',
    pattern: /application|form|antrag/i,
    category: 'personal',
    confidence: 'low',
  },
];

/**
 * Reference material patterns
 */
export const REFERENCE_PATTERNS: PatternDef[] = [
  {
    name: 'manual',
    pattern: /manual|handbuch|guide/i,
    category: 'reference',
    confidence: 'high',
  },
  {
    name: 'documentation',
    pattern: /documentation|docs|howto/i,
    category: 'reference',
    confidence: 'medium',
  },
  {
    name: 'specification',
    pattern: /spec|specification|reference/i,
    category: 'reference',
    confidence: 'medium',
  },
  {
    name: 'template',
    pattern: /template|vorlage/i,
    category: 'reference',
    confidence: 'low',
  },
];

/**
 * All patterns combined
 */
export const ALL_PATTERNS: PatternDef[] = [
  ...SCREENSHOT_PATTERNS,
  ...FINANCIAL_PATTERNS,
  ...INSTALLER_PATTERNS,
  ...WORK_PATTERNS,
  ...PERSONAL_PATTERNS,
  ...REFERENCE_PATTERNS,
];

// =============================================================================
// Sensitive File Patterns
// =============================================================================

/** Patterns that indicate sensitive files requiring extra confirmation */
export const SENSITIVE_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  // Financial
  { pattern: /tax|w-?2|1099/i, reason: 'Tax document' },
  { pattern: /invoice|receipt|statement/i, reason: 'Financial document' },
  { pattern: /budget|expense/i, reason: 'Financial data' },

  // Personal identity
  { pattern: /passport/i, reason: 'Identity document' },
  { pattern: /driver.?license|license.?id/i, reason: 'Identity document' },
  { pattern: /ssn|social.?security/i, reason: 'Social security number' },
  { pattern: /\bID\b|identification/i, reason: 'Identity document' },

  // Credentials
  { pattern: /password|credential|secret/i, reason: 'Credential data' },
  { pattern: /\.pem$|\.key$/i, reason: 'Security key file' },
  { pattern: /\.env$/i, reason: 'Environment configuration' },

  // Medical
  { pattern: /medical|prescription|health|insurance/i, reason: 'Medical/health data' },

  // Legal
  { pattern: /contract|agreement|legal/i, reason: 'Legal document' },
];

// =============================================================================
// Pattern Matching Functions
// =============================================================================

/**
 * Match a filename against all patterns
 *
 * Returns all matching patterns sorted by confidence (highest first)
 */
export function matchPatterns(filename: string): PatternMatch[] {
  const matches: PatternMatch[] = [];

  for (const def of ALL_PATTERNS) {
    if (def.pattern.test(filename)) {
      matches.push({
        pattern: def.name,
        category: def.category,
        confidence: def.confidence,
      });
    }
  }

  // Sort by confidence: high > medium > low
  const confidenceOrder: Record<ConfidenceLevel, number> = {
    high: 3,
    medium: 2,
    low: 1,
  };

  matches.sort((a, b) => confidenceOrder[b.confidence] - confidenceOrder[a.confidence]);

  return matches;
}

/**
 * Get the best pattern match for a filename
 *
 * Returns the highest confidence match, or null if no patterns match
 */
export function getBestMatch(filename: string): PatternMatch | null {
  const matches = matchPatterns(filename);
  return matches.length > 0 ? matches[0] : null;
}

/**
 * Check if a filename matches sensitive file patterns
 */
export function checkSensitivity(filename: string, content?: string): SensitivityResult {
  // Check filename patterns
  for (const { pattern, reason } of SENSITIVE_PATTERNS) {
    if (pattern.test(filename)) {
      return {
        sensitive: true,
        reason,
        matchedPattern: pattern.source,
      };
    }
  }

  // Check content if provided
  if (content) {
    for (const { pattern, reason } of SENSITIVE_PATTERNS) {
      if (pattern.test(content)) {
        return {
          sensitive: true,
          reason: `Content: ${reason}`,
          matchedPattern: pattern.source,
        };
      }
    }
  }

  return { sensitive: false };
}
