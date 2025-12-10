/**
 * Markdown Templates for Obsidian Notes
 *
 * Feature: 001-obsidian-integration
 */

import {
  createDailyLogFrontmatter,
  createObservationFrontmatter,
  createProposalFrontmatter,
  createSystemFrontmatter,
  createIndexFrontmatter,
  stringifyNote,
  formatTime,
  formatDate,
  formatDateTime,
} from './frontmatter.js';
import { toWikilink } from './paths.js';
import type {
  DailyLogInput,
  ObservationInput,
  ProposalInput,
  SystemNoteInput,
  IndexSections,
  ITemplateGenerator,
} from '../types/obsidian.js';

// =============================================================================
// Daily Log Templates
// =============================================================================

/**
 * Generate a new daily log template with frontmatter
 */
export function generateDailyLogTemplate(date: Date = new Date()): string {
  const frontmatter = createDailyLogFrontmatter(date);
  const dateStr = formatDate(date);
  const content = `# Daily Log - ${dateStr}\n`;
  return stringifyNote(frontmatter, content);
}

/**
 * Generate an activity entry for appending to a daily log
 */
export function generateActivityEntry(
  input: DailyLogInput,
  timestamp: Date = new Date()
): string {
  const timeStr = formatTime(timestamp);
  const title = input.title || 'Activity';

  let entry = `\n## ${timeStr} - ${title}\n\n${input.activity}\n`;

  // Add wikilinks to related notes
  if (input.relatedNotes && input.relatedNotes.length > 0) {
    entry += '\n';
    for (const note of input.relatedNotes) {
      entry += `${toWikilink(note)}\n`;
    }
  }

  entry += '\n---\n';
  return entry;
}

// =============================================================================
// Observation Templates
// =============================================================================

/**
 * Generate an observation note template
 */
export function generateObservationTemplate(
  input: ObservationInput,
  date: Date = new Date()
): string {
  const frontmatter = createObservationFrontmatter({
    subject: input.subject,
    confidence: input.confidence,
    tags: input.tags,
    date,
  });

  let content = `# Observation: ${input.title}\n\n`;
  content += `## Context\n\n${input.context}\n\n`;
  content += `## Details\n\n${input.details}\n`;

  // Add related notes section if any
  if (input.relatedNotes && input.relatedNotes.length > 0) {
    content += '\n## Related\n\n';
    for (const note of input.relatedNotes) {
      content += `- ${toWikilink(note)}\n`;
    }
  }

  return stringifyNote(frontmatter, content);
}

// =============================================================================
// Proposal Templates
// =============================================================================

/**
 * Generate a proposal note template
 */
export function generateProposalTemplate(
  input: ProposalInput,
  date: Date = new Date()
): string {
  const frontmatter = createProposalFrontmatter(
    input.proposalId,
    input.action,
    input.confidence,
    { tags: input.tags, date }
  );

  let content = `# Proposal: ${input.summary}\n\n`;
  content += `## Summary\n\n${input.summary}\n\n`;
  content += `## Reasoning\n\n${input.reasoning}\n\n`;

  // Add evidence section with wikilinks
  if (input.evidence && input.evidence.length > 0) {
    content += `## Evidence\n\n`;
    for (const evidence of input.evidence) {
      content += `- ${toWikilink(evidence)} - Supporting observation\n`;
    }
    content += '\n';
  }

  content += `## Confidence: ${input.confidence}\n\n`;
  content += 'See frontmatter for details.\n\n';

  content += `## Outcome\n\n`;
  content += '*Updated when proposal is resolved*\n\n';
  content += '- Status: pending\n';
  content += '- Resolution date: TBD\n';
  content += '- User feedback: ...\n';

  return stringifyNote(frontmatter, content);
}

// =============================================================================
// System Note Templates
// =============================================================================

/**
 * Generate a system note template
 */
export function generateSystemTemplate(
  input: SystemNoteInput,
  date: Date = new Date()
): string {
  const frontmatter = createSystemFrontmatter(input.category, {
    severity: input.severity,
    date,
  });

  const timestampStr = formatDateTime(date);
  let content = `# System: ${capitalize(input.category)} - ${input.title}\n\n`;
  content += `## Timestamp\n\n${timestampStr}\n\n`;
  content += `## Details\n\n${input.details}\n\n`;
  content += `## Context\n\n`;
  content += `- Component: ${input.component || 'core'}\n`;
  content += `- Action: ${input.category}\n`;

  if (input.resolution) {
    content += `\n## Resolution\n\n${input.resolution}\n`;
  } else if (input.category === 'error') {
    content += `\n## Resolution\n\n*Pending resolution*\n`;
  }

  return stringifyNote(frontmatter, content);
}

// =============================================================================
// Index Templates
// =============================================================================

/**
 * Generate the index/MOC template
 */
export function generateIndexTemplate(
  sections: IndexSections,
  date: Date = new Date()
): string {
  const totalNotes =
    sections.dailyLogs.length +
    sections.observations.length +
    sections.proposals.length +
    sections.systemNotes.length;

  const frontmatter = createIndexFrontmatter(totalNotes, date);
  const timestampStr = formatDateTime(date);

  let content = `# DIANA Brain - Index\n\n`;
  content += `*Last updated: ${timestampStr}*\n\n`;

  // Daily Logs section
  content += `## Daily Logs\n\n`;
  if (sections.dailyLogs.length > 0) {
    for (const log of sections.dailyLogs) {
      content += `- ${toWikilink(log.path)} - ${log.title}\n`;
    }
  } else {
    content += '*No daily logs yet*\n';
  }
  content += '\n';

  // Observations section
  content += `## Recent Observations\n\n`;
  if (sections.observations.length > 0) {
    for (const obs of sections.observations) {
      content += `- ${toWikilink(obs.path)} - ${obs.title}\n`;
    }
  } else {
    content += '*No observations yet*\n';
  }
  content += '\n';

  // Proposals section
  content += `## Active Proposals\n\n`;
  if (sections.proposals.length > 0) {
    for (const prop of sections.proposals) {
      const statusIcon = prop.status === 'pending' ? '🔄' : prop.status === 'approved' ? '✅' : '❌';
      content += `- ${statusIcon} ${toWikilink(prop.path)} - ${prop.title}\n`;
    }
  } else {
    content += '*No proposals yet*\n';
  }
  content += '\n';

  // System section
  content += `## System Status\n\n`;
  if (sections.systemNotes.length > 0) {
    for (const sys of sections.systemNotes) {
      content += `- ${toWikilink(sys.path)} - ${sys.title}\n`;
    }
  } else {
    content += '*No system notes yet*\n';
  }

  return stringifyNote(frontmatter, content);
}

// =============================================================================
// Wikilink Helpers
// =============================================================================

/**
 * Generate a wikilink with optional display text
 */
export function generateWikilink(path: string, displayText?: string): string {
  if (displayText) {
    return `[[${path}|${displayText}]]`;
  }
  return toWikilink(path);
}

/**
 * Generate bidirectional link references
 * Returns markdown links from source to targets
 */
export function generateBidirectionalLinks(
  targets: string[],
  prefix: string = ''
): string {
  if (targets.length === 0) return '';

  let result = '';
  for (const target of targets) {
    result += `${prefix}${toWikilink(target)}\n`;
  }
  return result;
}

// =============================================================================
// Template Generator Implementation
// =============================================================================

/**
 * Template generator implementation
 */
export class TemplateGenerator implements ITemplateGenerator {
  dailyLog(date: Date): string {
    return generateDailyLogTemplate(date);
  }

  observation(input: ObservationInput): string {
    return generateObservationTemplate(input);
  }

  proposal(input: ProposalInput): string {
    return generateProposalTemplate(input);
  }

  systemNote(input: SystemNoteInput): string {
    return generateSystemTemplate(input);
  }

  index(sections: IndexSections): string {
    return generateIndexTemplate(sections);
  }
}

// =============================================================================
// Utilities
// =============================================================================

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
