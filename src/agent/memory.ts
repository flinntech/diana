/**
 * Key Fact Store
 *
 * Feature: 002-llm-agent-core
 * Date: 2025-12-10
 *
 * Persistent cross-session memory via Obsidian markdown.
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import { format, parseISO } from 'date-fns';
import type { KeyFact, IKeyFactStore } from '../types/agent.js';

// =============================================================================
// Constants
// =============================================================================

/** Maximum facts to keep in recent section */
const MAX_RECENT_FACTS = 50;

/** Number of important facts to include in context */
const MAX_IMPORTANT_IN_CONTEXT = 10;

/** Number of recent facts to include in context */
const MAX_RECENT_IN_CONTEXT = 5;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse facts from markdown content
 */
function parseFacts(content: string): KeyFact[] {
  const facts: KeyFact[] = [];

  // Extract facts from markdown list items
  const lines = content.split('\n');
  let currentSection: 'important' | 'recent' | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for section headers
    if (trimmed.toLowerCase().includes('## important')) {
      currentSection = 'important';
      continue;
    }
    if (trimmed.toLowerCase().includes('## recent')) {
      currentSection = 'recent';
      continue;
    }

    // Parse list items
    if (trimmed.startsWith('- ') && currentSection) {
      const factText = trimmed.slice(2).trim();

      // Extract date from [YYYY-MM-DD] prefix if present
      const dateMatch = factText.match(/^\[(\d{4}-\d{2}-\d{2})\]\s*/);
      let content = factText;
      let createdAt = new Date();

      if (dateMatch) {
        content = factText.slice(dateMatch[0].length);
        try {
          createdAt = parseISO(dateMatch[1]);
        } catch {
          // Keep current date if parsing fails
        }
      }

      // Extract tags
      const tags: string[] = [];
      const tagMatches = content.match(/#\w+/g);
      if (tagMatches) {
        tags.push(...tagMatches);
        // Remove tags from content
        content = content.replace(/#\w+/g, '').trim();
      }

      // Add #important tag for items in important section
      if (currentSection === 'important' && !tags.includes('#important')) {
        tags.push('#important');
      }

      facts.push({
        content,
        tags,
        createdAt,
      });
    }
  }

  return facts;
}

/**
 * Format facts to markdown content
 */
function formatFacts(facts: KeyFact[]): string {
  const lines: string[] = [];

  // Add frontmatter
  lines.push('---');
  lines.push('type: memory');
  lines.push(`created: ${format(new Date(), "yyyy-MM-dd'T'HH:mm:ss")}`);
  lines.push(`modified: ${format(new Date(), "yyyy-MM-dd'T'HH:mm:ss")}`);
  lines.push('---');
  lines.push('');
  lines.push('# Key Facts');
  lines.push('');

  // Separate important and recent facts
  const importantFacts = facts.filter((f) => f.tags.includes('#important'));
  const recentFacts = facts
    .filter((f) => !f.tags.includes('#important'))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, MAX_RECENT_FACTS);

  // Important section
  lines.push('## Important');
  lines.push('');
  if (importantFacts.length > 0) {
    for (const fact of importantFacts) {
      const tagStr = fact.tags.filter((t) => t !== '#important').join(' ');
      lines.push(`- ${fact.content}${tagStr ? ' ' + tagStr : ''} #important`);
    }
  }
  lines.push('');

  // Recent section
  lines.push('## Recent');
  lines.push('');
  if (recentFacts.length > 0) {
    for (const fact of recentFacts) {
      const dateStr = format(fact.createdAt, 'yyyy-MM-dd');
      const tagStr = fact.tags.join(' ');
      lines.push(`- [${dateStr}] ${fact.content}${tagStr ? ' ' + tagStr : ''}`);
    }
  }
  lines.push('');

  return lines.join('\n');
}

// =============================================================================
// KeyFactStore Class
// =============================================================================

/**
 * Manager for persistent cross-session memory
 */
export class KeyFactStore implements IKeyFactStore {
  private readonly filePath: string;
  private facts: KeyFact[] = [];
  private lastLoaded: Date | null = null;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /**
   * Load facts from markdown file
   */
  async load(): Promise<void> {
    try {
      const content = await readFile(this.filePath, 'utf-8');
      this.facts = parseFacts(content);
      this.lastLoaded = new Date();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist yet - start with empty facts
        this.facts = [];
        this.lastLoaded = new Date();
      } else {
        throw error;
      }
    }
  }

  /**
   * Save facts to markdown file
   */
  async save(): Promise<void> {
    // Ensure directory exists
    const dir = path.dirname(this.filePath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    const content = formatFacts(this.facts);
    await writeFile(this.filePath, content, 'utf-8');
  }

  /**
   * Add a new fact
   */
  addFact(fact: KeyFact): void {
    // Check for duplicate content (simple matching)
    const existingIndex = this.facts.findIndex(
      (f) =>
        f.content.toLowerCase().trim() === fact.content.toLowerCase().trim()
    );

    if (existingIndex >= 0) {
      // Update existing fact (keep original createdAt, update tags)
      const existing = this.facts[existingIndex];
      this.facts[existingIndex] = {
        ...fact,
        createdAt: existing.createdAt,
        tags: [...new Set([...existing.tags, ...fact.tags])],
      };
    } else {
      // Add new fact
      this.facts.push(fact);
    }
  }

  /**
   * Get facts tagged with #important
   */
  getImportant(): KeyFact[] {
    return this.facts.filter((f) => f.tags.includes('#important'));
  }

  /**
   * Get N most recent facts (excluding important ones)
   */
  getRecent(n: number): KeyFact[] {
    return this.facts
      .filter((f) => !f.tags.includes('#important'))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, n);
  }

  /**
   * Format facts for inclusion in system prompt
   */
  getContextString(): string {
    const important = this.getImportant().slice(0, MAX_IMPORTANT_IN_CONTEXT);
    const recent = this.getRecent(MAX_RECENT_IN_CONTEXT);

    if (important.length === 0 && recent.length === 0) {
      return '_No facts recorded yet_';
    }

    const lines: string[] = [];

    if (important.length > 0) {
      lines.push('**Important:**');
      for (const fact of important) {
        lines.push(`- ${fact.content}`);
      }
    }

    if (recent.length > 0) {
      if (important.length > 0) lines.push('');
      lines.push('**Recent:**');
      for (const fact of recent) {
        lines.push(`- ${fact.content}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Get all facts
   */
  getAllFacts(): KeyFact[] {
    return [...this.facts];
  }

  /**
   * Get the file path
   */
  getFilePath(): string {
    return this.filePath;
  }

  /**
   * Check if facts have been loaded
   */
  isLoaded(): boolean {
    return this.lastLoaded !== null;
  }

  /**
   * Get the number of facts
   */
  size(): number {
    return this.facts.length;
  }
}

/**
 * Create a new KeyFactStore
 */
export function createKeyFactStore(filePath: string): KeyFactStore {
  return new KeyFactStore(filePath);
}
