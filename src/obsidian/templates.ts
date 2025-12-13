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
  ConversationAnchorInput,
  RollupStats,
} from '../types/obsidian.js';
import {
  BACKLINKS_MARKER_START,
  BACKLINKS_MARKER_END,
  BACKLINKS_HEADING,
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
// Backlinks Section Templates (Feature: 006-obsidian-rich-linking)
// =============================================================================

/**
 * Generate the backlinks section content.
 * Returns empty string if there are no backlinks.
 *
 * Format:
 * ```markdown
 * <!-- DIANA-BACKLINKS:START -->
 * ## Backlinks
 *
 * - [[path/to/note1]]
 * - [[path/to/note2]]
 * <!-- DIANA-BACKLINKS:END -->
 * ```
 */
export function generateBacklinksSection(backlinks: string[]): string {
  if (backlinks.length === 0) {
    return '';
  }

  // Sort for deterministic output
  const sorted = [...backlinks].sort();

  const lines = [
    BACKLINKS_MARKER_START,
    BACKLINKS_HEADING,
    '',
    ...sorted.map((link) => `- ${toWikilink(link)}`),
    BACKLINKS_MARKER_END,
  ];

  return lines.join('\n');
}

/**
 * Update the backlinks section in existing content.
 * - If markers exist, replace the content between them
 * - If no markers exist, append at the end
 * - If backlinks is empty, remove the section entirely
 *
 * @param content - Existing note content
 * @param backlinks - Array of paths to include in backlinks section
 * @returns Updated content
 */
export function updateBacklinksSection(content: string, backlinks: string[]): string {
  const section = generateBacklinksSection(backlinks);
  const hasMarkers = content.includes(BACKLINKS_MARKER_START);

  if (hasMarkers) {
    // Replace existing section (idempotent)
    const regex = new RegExp(
      `${escapeRegex(BACKLINKS_MARKER_START)}[\\s\\S]*?${escapeRegex(BACKLINKS_MARKER_END)}`,
      'g'
    );

    if (section) {
      return content.replace(regex, section);
    } else {
      // Remove section and any trailing newlines before it
      return content.replace(new RegExp(`\\n*${regex.source}\\n*`, 'g'), '\n').trimEnd() + '\n';
    }
  } else if (section) {
    // Append at end (first time)
    return content.trimEnd() + '\n\n' + section + '\n';
  }

  // No markers and no backlinks - return as is
  return content;
}

/**
 * Check if content has a backlinks section
 */
export function hasBacklinksSection(content: string): boolean {
  return content.includes(BACKLINKS_MARKER_START) && content.includes(BACKLINKS_MARKER_END);
}

/**
 * Extract existing backlinks from a note's content.
 * Parses the wiki-links between the markers.
 */
export function extractBacklinksFromContent(content: string): string[] {
  if (!hasBacklinksSection(content)) {
    return [];
  }

  const regex = new RegExp(
    `${escapeRegex(BACKLINKS_MARKER_START)}([\\s\\S]*?)${escapeRegex(BACKLINKS_MARKER_END)}`,
    'g'
  );

  const match = regex.exec(content);
  if (!match) {
    return [];
  }

  const sectionContent = match[1];
  const linkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  const links: string[] = [];

  let linkMatch;
  while ((linkMatch = linkRegex.exec(sectionContent)) !== null) {
    links.push(linkMatch[1]);
  }

  return links;
}

// =============================================================================
// Conversation Anchor Templates (Feature: 006-obsidian-rich-linking)
// =============================================================================

/**
 * Generate conversation anchor note content
 */
export function generateConversationAnchorTemplate(
  input: ConversationAnchorInput,
  date: Date = new Date()
): string {
  const frontmatter = {
    type: 'conversation-anchor' as const,
    date: formatDate(date),
    tags: ['diana', 'conversation'],
    created: formatDateTime(date),
    conversationId: input.id,
    messageCount: input.messageCount,
    references: input.referencedNotes,
    jsonPath: input.jsonPath,
  };

  let content = `# Conversation: ${input.title}\n\n`;
  content += `**Started**: ${input.startedAt.split('T')[0]} ${input.startedAt.split('T')[1]?.slice(0, 5) || ''}\n`;
  content += `**Messages**: ${input.messageCount}\n\n`;

  // Referenced notes section
  if (input.referencedNotes.length > 0) {
    content += `## Referenced Notes\n\n`;
    for (const note of input.referencedNotes) {
      content += `- ${toWikilink(note)}\n`;
    }
    content += '\n';
  }

  content += `## Full Conversation\n\n`;
  content += `See: \`${input.jsonPath}\`\n`;

  return stringifyNote(frontmatter, content);
}

// =============================================================================
// Rollup Templates (Feature: 006-obsidian-rich-linking)
// =============================================================================

/**
 * Generate weekly rollup note content
 */
export function generateWeeklyRollupTemplate(
  weekStr: string,
  year: number,
  weekNumber: number,
  startDate: string,
  endDate: string,
  stats: RollupStats,
  notes: {
    dailyLogs: string[];
    observations: string[];
    proposalsApproved: string[];
    proposalsRejected: string[];
    proposalsPending: string[];
    systemNotes: string[];
  },
  date: Date = new Date()
): string {
  const frontmatter = {
    type: 'rollup' as const,
    period: 'weekly' as const,
    week: weekStr,
    year,
    weekNumber,
    startDate,
    endDate,
    date: startDate,
    tags: ['diana', 'rollup', 'weekly'],
    created: formatDateTime(date),
    stats,
  };

  let content = `# Week ${weekNumber} - ${year}\n\n`;
  content += `## Summary\n\n`;
  content += `This week: ${stats.dailyLogs} daily logs, ${stats.observations} observations, `;
  content += `${stats.proposals} proposals (${stats.proposalsApproved} approved, ${stats.proposalsPending} pending).\n\n`;

  // Statistics section
  content += `## Statistics\n\n`;
  content += `- **Daily Logs**: ${stats.dailyLogs} entries\n`;
  content += `- **Observations**: ${stats.observations} notes\n`;
  content += `- **Proposals**: ${stats.proposals} total (${stats.proposalsApproved} approved, ${stats.proposalsPending} pending)\n`;
  content += `- **System Notes**: ${stats.systemNotes} entries\n\n`;

  // Daily Logs
  if (notes.dailyLogs.length > 0) {
    content += `## Daily Logs\n\n`;
    for (const log of notes.dailyLogs) {
      content += `- ${toWikilink(log)}\n`;
    }
    content += '\n';
  }

  // Observations
  if (notes.observations.length > 0) {
    content += `## Observations\n\n`;
    for (const obs of notes.observations) {
      content += `- ${toWikilink(obs)}\n`;
    }
    content += '\n';
  }

  // Proposals
  if (stats.proposals > 0) {
    content += `## Proposals\n\n`;
    if (notes.proposalsApproved.length > 0) {
      content += `### Approved\n\n`;
      for (const prop of notes.proposalsApproved) {
        content += `- ${toWikilink(prop)}\n`;
      }
      content += '\n';
    }
    if (notes.proposalsPending.length > 0) {
      content += `### Pending\n\n`;
      for (const prop of notes.proposalsPending) {
        content += `- ${toWikilink(prop)}\n`;
      }
      content += '\n';
    }
    if (notes.proposalsRejected.length > 0) {
      content += `### Rejected\n\n`;
      for (const prop of notes.proposalsRejected) {
        content += `- ${toWikilink(prop)}\n`;
      }
      content += '\n';
    }
  }

  // System Notes
  if (notes.systemNotes.length > 0) {
    content += `## System Notes\n\n`;
    for (const sys of notes.systemNotes) {
      content += `- ${toWikilink(sys)}\n`;
    }
  }

  return stringifyNote(frontmatter, content);
}

/**
 * Generate monthly rollup note content
 */
export function generateMonthlyRollupTemplate(
  monthStr: string,
  year: number,
  monthNumber: number,
  startDate: string,
  endDate: string,
  stats: RollupStats,
  notes: {
    dailyLogs: string[];
    observations: string[];
    proposalsApproved: string[];
    proposalsRejected: string[];
    proposalsPending: string[];
    systemNotes: string[];
  },
  weeks: string[],
  date: Date = new Date()
): string {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = monthNames[monthNumber - 1] || 'Unknown';

  const frontmatter = {
    type: 'rollup' as const,
    period: 'monthly' as const,
    month: monthStr,
    year,
    monthNumber,
    startDate,
    endDate,
    date: startDate,
    tags: ['diana', 'rollup', 'monthly'],
    created: formatDateTime(date),
    stats,
    weeks,
  };

  let content = `# ${monthName} ${year}\n\n`;
  content += `## Summary\n\n`;
  content += `This month: ${stats.dailyLogs} daily logs, ${stats.observations} observations, `;
  content += `${stats.proposals} proposals (${stats.proposalsApproved} approved, ${stats.proposalsPending} pending).\n\n`;

  // Statistics section
  content += `## Statistics\n\n`;
  content += `- **Daily Logs**: ${stats.dailyLogs} entries\n`;
  content += `- **Observations**: ${stats.observations} notes\n`;
  content += `- **Proposals**: ${stats.proposals} total (${stats.proposalsApproved} approved, ${stats.proposalsPending} pending)\n`;
  content += `- **System Notes**: ${stats.systemNotes} entries\n`;
  if (weeks.length > 0) {
    content += `- **Weeks**: ${weeks.join(', ')}\n`;
  }
  content += '\n';

  // Observations (highlight for monthly)
  if (notes.observations.length > 0) {
    content += `## Key Observations\n\n`;
    for (const obs of notes.observations) {
      content += `- ${toWikilink(obs)}\n`;
    }
    content += '\n';
  }

  // Proposals
  if (stats.proposals > 0) {
    content += `## Proposals\n\n`;
    if (notes.proposalsApproved.length > 0) {
      content += `### Approved\n\n`;
      for (const prop of notes.proposalsApproved) {
        content += `- ${toWikilink(prop)}\n`;
      }
      content += '\n';
    }
    if (notes.proposalsPending.length > 0) {
      content += `### Pending\n\n`;
      for (const prop of notes.proposalsPending) {
        content += `- ${toWikilink(prop)}\n`;
      }
      content += '\n';
    }
  }

  return stringifyNote(frontmatter, content);
}

// =============================================================================
// Utilities
// =============================================================================

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
