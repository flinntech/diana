/**
 * CLI Vault Commands
 *
 * Feature: 006-obsidian-rich-linking
 * Date: 2025-12-13
 *
 * Commands for vault migration and validation.
 */

import { parseISO } from 'date-fns';
import { config } from '../config/diana.config.js';
import { createVaultMigrator } from '../obsidian/vault-migrator.js';
import { createRollupGenerator } from '../obsidian/rollup-generator.js';
import type { MigrationResult, ValidationResult, RepairResult } from '../obsidian/vault-migrator.js';
import type { RollupResult } from '../obsidian/rollup-generator.js';

// =============================================================================
// Migrate Command
// =============================================================================

interface MigrateOptions {
  dryRun?: boolean;
}

export async function migrateVault(options: MigrateOptions): Promise<void> {
  const migrator = createVaultMigrator(config.obsidian.vaultPath);

  console.log(`\nMigrating vault: ${config.obsidian.vaultPath}`);
  console.log(options.dryRun ? '(DRY RUN - no changes will be made)\n' : '');

  try {
    let result: MigrationResult;

    if (options.dryRun) {
      result = await migrator.dryRun();
    } else {
      // Pre-migration validation
      console.log('Running pre-migration validation...');
      const validation = await migrator.validate();

      if (validation.corruptedNotes.length > 0) {
        console.warn('\nWarning: Found corrupted notes that will be skipped:');
        for (const path of validation.corruptedNotes.slice(0, 5)) {
          console.warn(`  - ${path}`);
        }
        if (validation.corruptedNotes.length > 5) {
          console.warn(`  ... and ${validation.corruptedNotes.length - 5} more`);
        }
        console.log('');
      }

      result = await migrator.migrate();
    }

    // Output results
    printMigrationResult(result, options.dryRun);
  } catch (error) {
    console.error(`\nMigration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

function printMigrationResult(result: MigrationResult, dryRun?: boolean): void {
  const action = dryRun ? 'Would update' : 'Updated';

  console.log('\n--- Migration Results ---\n');
  console.log(`Total notes scanned: ${result.totalNotes}`);
  console.log(`${action}: ${result.updated} notes`);
  console.log(`Skipped (already up-to-date): ${result.skipped} notes`);
  console.log(`Failed: ${result.failed} notes`);

  if (result.corrupted.length > 0) {
    console.log(`\nCorrupted frontmatter (${result.corrupted.length} notes):`);
    for (const path of result.corrupted.slice(0, 10)) {
      console.log(`  - ${path}`);
    }
    if (result.corrupted.length > 10) {
      console.log(`  ... and ${result.corrupted.length - 10} more`);
    }
  }

  if (result.noFrontmatter.length > 0) {
    console.log(`\nNo frontmatter (${result.noFrontmatter.length} notes):`);
    for (const path of result.noFrontmatter.slice(0, 10)) {
      console.log(`  - ${path}`);
    }
    if (result.noFrontmatter.length > 10) {
      console.log(`  ... and ${result.noFrontmatter.length - 10} more`);
    }
  }

  if (Object.keys(result.errors).length > 0) {
    console.log(`\nErrors:`);
    for (const [path, error] of Object.entries(result.errors).slice(0, 10)) {
      console.log(`  - ${path}: ${error}`);
    }
    if (Object.keys(result.errors).length > 10) {
      console.log(`  ... and ${Object.keys(result.errors).length - 10} more`);
    }
  }

  console.log('');
}

// =============================================================================
// Validate Command
// =============================================================================

interface ValidateOptions {
  repair?: boolean;
}

export async function validateVault(options: ValidateOptions): Promise<void> {
  const migrator = createVaultMigrator(config.obsidian.vaultPath);

  console.log(`\nValidating vault: ${config.obsidian.vaultPath}\n`);

  try {
    const result = await migrator.validate();
    printValidationResult(result);

    if (!result.valid && options.repair) {
      console.log('\nRepairing issues...\n');
      const repairResult = await migrator.repair();
      printRepairResult(repairResult);
    } else if (!result.valid) {
      console.log('\nRun with --repair to fix these issues.');
      process.exit(1);
    }
  } catch (error) {
    console.error(`\nValidation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

function printValidationResult(result: ValidationResult): void {
  console.log('--- Validation Results ---\n');
  console.log(`Total notes scanned: ${result.totalNotes}`);
  console.log(`Status: ${result.valid ? 'VALID' : 'INVALID'}`);

  if (result.missingBacklinks.length > 0) {
    console.log(`\nMissing backlinks (${result.missingBacklinks.length} notes):`);
    for (const issue of result.missingBacklinks.slice(0, 10)) {
      console.log(`  - ${issue.path}: missing ${issue.missing.length} backlink(s)`);
      for (const missing of issue.missing.slice(0, 3)) {
        console.log(`      - ${missing}`);
      }
      if (issue.missing.length > 3) {
        console.log(`      ... and ${issue.missing.length - 3} more`);
      }
    }
    if (result.missingBacklinks.length > 10) {
      console.log(`  ... and ${result.missingBacklinks.length - 10} more notes`);
    }
  }

  if (result.extraBacklinks.length > 0) {
    console.log(`\nExtra backlinks (${result.extraBacklinks.length} notes):`);
    for (const issue of result.extraBacklinks.slice(0, 10)) {
      console.log(`  - ${issue.path}: ${issue.extra.length} orphaned backlink(s)`);
    }
    if (result.extraBacklinks.length > 10) {
      console.log(`  ... and ${result.extraBacklinks.length - 10} more notes`);
    }
  }

  if (result.corruptedNotes.length > 0) {
    console.log(`\nCorrupted notes (${result.corruptedNotes.length}):`);
    for (const path of result.corruptedNotes.slice(0, 10)) {
      console.log(`  - ${path}`);
    }
    if (result.corruptedNotes.length > 10) {
      console.log(`  ... and ${result.corruptedNotes.length - 10} more`);
    }
  }

  if (result.orphanNotes.length > 0) {
    console.log(`\nOrphan notes (no links) (${result.orphanNotes.length}):`);
    for (const path of result.orphanNotes.slice(0, 10)) {
      console.log(`  - ${path}`);
    }
    if (result.orphanNotes.length > 10) {
      console.log(`  ... and ${result.orphanNotes.length - 10} more`);
    }
  }

  console.log('');
}

function printRepairResult(result: RepairResult): void {
  console.log('--- Repair Results ---\n');
  console.log(`Repaired: ${result.repaired} notes`);
  console.log(`Failed: ${result.failed.length} notes`);

  if (Object.keys(result.details).length > 0) {
    console.log(`\nDetails:`);
    for (const [path, detail] of Object.entries(result.details).slice(0, 10)) {
      console.log(`  - ${path}: ${detail}`);
    }
    if (Object.keys(result.details).length > 10) {
      console.log(`  ... and ${Object.keys(result.details).length - 10} more`);
    }
  }

  if (result.failed.length > 0) {
    console.log(`\nFailed to repair:`);
    for (const path of result.failed.slice(0, 10)) {
      console.log(`  - ${path}`);
    }
  }

  console.log('');
}

// =============================================================================
// Rollup Command
// =============================================================================

interface RollupOptions {
  date?: string;
}

export async function rollupWeekly(options: RollupOptions): Promise<void> {
  const generator = createRollupGenerator(config.obsidian.vaultPath);

  let targetDate = new Date();
  if (options.date) {
    try {
      targetDate = parseISO(options.date);
    } catch {
      console.error(`Invalid date format: ${options.date}. Use YYYY-MM-DD.`);
      process.exit(1);
    }
  }

  console.log(`\nGenerating weekly rollup for week containing: ${targetDate.toISOString().split('T')[0]}`);
  console.log(`Vault: ${config.obsidian.vaultPath}\n`);

  try {
    const result: RollupResult = await generator.generateWeekly(targetDate);

    if (result.success) {
      printRollupResult('Weekly', result);
    } else {
      console.error(`\nRollup generation failed: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`\nRollup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

export async function rollupMonthly(options: RollupOptions): Promise<void> {
  const generator = createRollupGenerator(config.obsidian.vaultPath);

  let targetDate = new Date();
  if (options.date) {
    try {
      targetDate = parseISO(options.date);
    } catch {
      console.error(`Invalid date format: ${options.date}. Use YYYY-MM-DD.`);
      process.exit(1);
    }
  }

  console.log(`\nGenerating monthly rollup for: ${targetDate.toISOString().slice(0, 7)}`);
  console.log(`Vault: ${config.obsidian.vaultPath}\n`);

  try {
    const result: RollupResult = await generator.generateMonthly(targetDate);

    if (result.success) {
      printRollupResult('Monthly', result);
    } else {
      console.error(`\nRollup generation failed: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`\nRollup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

function printRollupResult(period: string, result: RollupResult): void {
  console.log(`--- ${period} Rollup Generated ---\n`);
  console.log(`File: ${result.filePath}`);

  if (result.stats) {
    console.log(`\nStatistics:`);
    console.log(`  Daily logs: ${result.stats.dailyLogs}`);
    console.log(`  Observations: ${result.stats.observations}`);
    console.log(`  Proposals: ${result.stats.proposals}`);
    console.log(`    - Approved: ${result.stats.proposalsApproved}`);
    console.log(`    - Rejected: ${result.stats.proposalsRejected}`);
    console.log(`    - Pending: ${result.stats.proposalsPending}`);
    console.log(`  System notes: ${result.stats.systemNotes}`);
  }

  console.log('');
}
