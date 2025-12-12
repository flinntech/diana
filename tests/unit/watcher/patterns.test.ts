/**
 * Unit Tests: Pattern Matching
 *
 * Feature: 003-file-watcher-proposals
 * Task: T039
 */

import { describe, it, expect } from 'vitest';
import {
  matchPatterns,
  getBestMatch,
  checkSensitivity,
  SCREENSHOT_PATTERNS,
  FINANCIAL_PATTERNS,
  INSTALLER_PATTERNS,
  SENSITIVE_PATTERNS,
} from '../../../src/watcher/patterns.js';

describe('Pattern Matching', () => {
  describe('matchPatterns', () => {
    it('matches screenshot filenames', () => {
      const matches = matchPatterns('Screenshot 2025-12-11 at 10.30.00.png');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].category).toBe('screenshots');
    });

    it('matches screenshot prefix variations', () => {
      expect(getBestMatch('screenshot_test.png')?.category).toBe('screenshots');
      expect(getBestMatch('Screen Shot 2025.png')?.category).toBe('screenshots');
      expect(getBestMatch('capture_window.png')?.category).toBe('screenshots');
      expect(getBestMatch('snipping_tool_001.png')?.category).toBe('screenshots');
    });

    it('matches invoice filenames', () => {
      const matches = matchPatterns('invoice-december-2025.pdf');
      expect(matches.some((m) => m.category === 'finances')).toBe(true);
    });

    it('matches receipt filenames', () => {
      expect(getBestMatch('receipt_amazon_2025.pdf')?.category).toBe('finances');
      expect(getBestMatch('RCPT_12345.pdf')?.category).toBe('finances');
    });

    it('matches tax document filenames', () => {
      expect(getBestMatch('tax-return-2024.pdf')?.category).toBe('finances');
      expect(getBestMatch('W-2_2024.pdf')?.category).toBe('finances');
      expect(getBestMatch('1099-MISC.pdf')?.category).toBe('finances');
    });

    it('matches installer filenames by extension', () => {
      expect(getBestMatch('program-installer.exe')?.category).toBe('installers');
      expect(getBestMatch('app-setup.msi')?.category).toBe('installers');
      expect(getBestMatch('App.dmg')?.category).toBe('installers');
      expect(getBestMatch('package.deb')?.category).toBe('installers');
    });

    it('matches work document patterns', () => {
      expect(getBestMatch('meeting-notes-2025.docx')?.category).toBe('work');
      expect(getBestMatch('project-proposal.pdf')?.category).toBe('work');
      expect(getBestMatch('client-report.xlsx')?.category).toBe('work');
    });

    it('matches personal document patterns', () => {
      expect(getBestMatch('resume-john-doe.pdf')?.category).toBe('personal');
      expect(getBestMatch('CV_2025.docx')?.category).toBe('personal');
      expect(getBestMatch('certificate-of-completion.pdf')?.category).toBe('personal');
    });

    it('matches reference material patterns', () => {
      expect(getBestMatch('user-manual.pdf')?.category).toBe('reference');
      expect(getBestMatch('installation-guide.pdf')?.category).toBe('reference');
      expect(getBestMatch('API-documentation.pdf')?.category).toBe('reference');
    });

    it('returns empty array for unrecognized filenames', () => {
      const matches = matchPatterns('random-file-12345.txt');
      expect(matches).toEqual([]);
    });

    it('returns matches sorted by confidence (highest first)', () => {
      // Create a filename that matches multiple patterns
      const matches = matchPatterns('invoice-setup.pdf');

      // Should have at least one high confidence match
      if (matches.length > 1) {
        const confidenceOrder = { high: 3, medium: 2, low: 1 };
        for (let i = 1; i < matches.length; i++) {
          expect(confidenceOrder[matches[i - 1].confidence]).toBeGreaterThanOrEqual(
            confidenceOrder[matches[i].confidence]
          );
        }
      }
    });
  });

  describe('getBestMatch', () => {
    it('returns highest confidence match', () => {
      const match = getBestMatch('Screenshot_2025-12-11.png');
      expect(match).not.toBeNull();
      expect(match?.category).toBe('screenshots');
      expect(match?.confidence).toBe('high');
    });

    it('returns null for non-matching filename', () => {
      const match = getBestMatch('completely-random-file-12345.xyz');
      expect(match).toBeNull();
    });
  });

  describe('checkSensitivity', () => {
    it('flags tax documents as sensitive', () => {
      const result = checkSensitivity('tax-return-2024.pdf');
      expect(result.sensitive).toBe(true);
      expect(result.reason).toContain('Tax');
    });

    it('flags W-2 forms as sensitive', () => {
      const result = checkSensitivity('W-2_2024.pdf');
      expect(result.sensitive).toBe(true);
    });

    it('flags 1099 forms as sensitive', () => {
      const result = checkSensitivity('1099-MISC.pdf');
      expect(result.sensitive).toBe(true);
    });

    it('flags invoices as sensitive', () => {
      const result = checkSensitivity('invoice-december.pdf');
      expect(result.sensitive).toBe(true);
      expect(result.reason).toContain('Financial');
    });

    it('flags passport documents as sensitive', () => {
      const result = checkSensitivity('passport-scan.pdf');
      expect(result.sensitive).toBe(true);
      expect(result.reason).toContain('Identity');
    });

    it('flags driver license as sensitive', () => {
      const result = checkSensitivity('driver-license.jpg');
      expect(result.sensitive).toBe(true);
    });

    it('flags credential files as sensitive', () => {
      const result = checkSensitivity('password-list.txt');
      expect(result.sensitive).toBe(true);
      expect(result.reason).toContain('Credential');
    });

    it('flags key files as sensitive', () => {
      const result = checkSensitivity('server.pem');
      expect(result.sensitive).toBe(true);
    });

    it('flags medical documents as sensitive', () => {
      const result = checkSensitivity('medical-records.pdf');
      expect(result.sensitive).toBe(true);
      expect(result.reason).toContain('Medical');
    });

    it('returns not sensitive for regular files', () => {
      const result = checkSensitivity('screenshot_2025.png');
      expect(result.sensitive).toBe(false);
    });

    it('checks content for sensitivity', () => {
      const result = checkSensitivity(
        'document.pdf',
        'This invoice is for services rendered...'
      );
      expect(result.sensitive).toBe(true);
      expect(result.reason).toContain('Content');
    });

    it('returns matchedPattern when sensitive', () => {
      const result = checkSensitivity('tax-document.pdf');
      expect(result.sensitive).toBe(true);
      expect(result.matchedPattern).toBeDefined();
    });
  });

  describe('pattern definitions', () => {
    it('has screenshot patterns', () => {
      expect(SCREENSHOT_PATTERNS.length).toBeGreaterThan(0);
      expect(SCREENSHOT_PATTERNS.every((p) => p.category === 'screenshots')).toBe(true);
    });

    it('has financial patterns', () => {
      expect(FINANCIAL_PATTERNS.length).toBeGreaterThan(0);
      expect(FINANCIAL_PATTERNS.every((p) => p.category === 'finances')).toBe(true);
    });

    it('has installer patterns', () => {
      expect(INSTALLER_PATTERNS.length).toBeGreaterThan(0);
      expect(INSTALLER_PATTERNS.every((p) => p.category === 'installers')).toBe(true);
    });

    it('has sensitive patterns with reasons', () => {
      expect(SENSITIVE_PATTERNS.length).toBeGreaterThan(0);
      expect(SENSITIVE_PATTERNS.every((p) => p.reason)).toBe(true);
    });
  });
});
