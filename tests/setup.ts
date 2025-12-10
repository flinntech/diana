/**
 * Vitest Setup File
 *
 * This file runs before all tests. It configures mock-fs and
 * provides common test utilities.
 */

import { afterEach, vi } from 'vitest';
import mockFs from 'mock-fs';

// Restore real filesystem after each test
afterEach(() => {
  mockFs.restore();
});

// Mock date for consistent test results
export function mockDate(date: Date | string): void {
  const mockDateObj = typeof date === 'string' ? new Date(date) : date;
  vi.useFakeTimers();
  vi.setSystemTime(mockDateObj);
}

// Restore real date
export function restoreDate(): void {
  vi.useRealTimers();
}

// Create a mock vault structure for testing
export function createMockVault(vaultPath: string = '/test-vault'): void {
  mockFs({
    [vaultPath]: {
      'daily': {},
      'observations': {},
      'proposals': {},
      'system': {},
      'index.md': `---
type: index
date: '2025-12-10'
tags:
  - diana
  - moc
created: '2025-12-10T00:00:00'
modified: '2025-12-10T00:00:00'
---

# DIANA Brain - Index

*Last updated: 2025-12-10 00:00:00*

## Daily Logs

## Recent Observations

## Active Proposals

## System Status
`,
    },
  });
}

// Create an empty mock filesystem
export function createEmptyFs(): void {
  mockFs({});
}

// Create a mock vault with some existing notes
export function createPopulatedVault(vaultPath: string = '/test-vault'): void {
  mockFs({
    [vaultPath]: {
      'daily': {
        '2025-12-09.md': `---
type: daily-log
date: '2025-12-09'
tags:
  - diana
  - daily
created: '2025-12-09T08:00:00'
---

# Daily Log - 2025-12-09

## 08:00:00 - Startup

DIANA started successfully.
`,
        '2025-12-10.md': `---
type: daily-log
date: '2025-12-10'
tags:
  - diana
  - daily
created: '2025-12-10T08:00:00'
---

# Daily Log - 2025-12-10

## 08:00:00 - Startup

DIANA started successfully.
`,
      },
      'observations': {
        '2025-12-09-file-patterns.md': `---
type: observation
date: '2025-12-09'
tags:
  - diana
  - observation
  - patterns
created: '2025-12-09T10:00:00'
subject: /Downloads
confidence: medium
---

# Observation: File Patterns

## Context

Monitoring user download behavior.

## Details

User frequently downloads PDF invoices on Mondays.
`,
      },
      'proposals': {
        '2025-12-09-organize-downloads.md': `---
type: proposal
date: '2025-12-09'
tags:
  - diana
  - proposal
created: '2025-12-09T11:00:00'
proposalId: organize-downloads
status: pending
confidence: high
action: move
---

# Proposal: Organize Downloads

## Summary

Organize Downloads folder by file type.

## Reasoning

Downloads contains 150+ files with no organization.
`,
      },
      'system': {
        '2025-12-09-startup.md': `---
type: system
date: '2025-12-09'
tags:
  - diana
  - system
  - startup
created: '2025-12-09T08:00:00'
category: startup
---

# System: Startup - DIANA Started

## Timestamp

2025-12-09T08:00:00

## Details

All components initialized successfully.
`,
      },
      'index.md': `---
type: index
date: '2025-12-09'
tags:
  - diana
  - moc
created: '2025-12-09T00:00:00'
modified: '2025-12-10T08:00:00'
noteCount: 4
---

# DIANA Brain - Index

*Last updated: 2025-12-10 08:00:00*

## Daily Logs

- [[daily/2025-12-10]] - December 10, 2025
- [[daily/2025-12-09]] - December 9, 2025

## Recent Observations

- [[observations/2025-12-09-file-patterns]] - File Patterns

## Active Proposals

- [[proposals/2025-12-09-organize-downloads]] - Organize Downloads

## System Status

- [[system/2025-12-09-startup]] - DIANA Started
`,
    },
  });
}
