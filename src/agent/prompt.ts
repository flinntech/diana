/**
 * System Prompt Loader
 *
 * Feature: 002-llm-agent-core
 * Date: 2025-12-10
 *
 * Loads and processes DIANA's system prompt with template variable support.
 */

import { readFile } from 'fs/promises';
import { createAgentError } from '../types/agent.js';

// =============================================================================
// Types
// =============================================================================

/** Template variables that can be injected into the system prompt */
export interface PromptVariables {
  /** Tool descriptions in markdown format */
  TOOL_DESCRIPTIONS?: string;

  /** Key facts about the user in markdown format */
  KEY_FACTS?: string;
}

// =============================================================================
// SystemPromptLoader Class
// =============================================================================

/**
 * Loads and processes the system prompt template
 */
export class SystemPromptLoader {
  private readonly promptPath: string;
  private template: string | null = null;

  constructor(promptPath: string) {
    this.promptPath = promptPath;
  }

  /**
   * Load the system prompt template from file
   */
  async load(): Promise<void> {
    try {
      this.template = await readFile(this.promptPath, 'utf-8');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      throw createAgentError(
        'SYSTEM_PROMPT_MISSING',
        `System prompt not found at ${this.promptPath}: ${err.message}`,
        { path: this.promptPath }
      );
    }
  }

  /**
   * Check if the template has been loaded
   */
  isLoaded(): boolean {
    return this.template !== null;
  }

  /**
   * Get the processed system prompt with variables injected
   */
  getPrompt(variables: PromptVariables = {}): string {
    if (!this.template) {
      throw createAgentError(
        'SYSTEM_PROMPT_MISSING',
        'System prompt not loaded. Call load() first.'
      );
    }

    let prompt = this.template;

    // Inject TOOL_DESCRIPTIONS
    if (variables.TOOL_DESCRIPTIONS !== undefined) {
      prompt = prompt.replace('{{TOOL_DESCRIPTIONS}}', variables.TOOL_DESCRIPTIONS);
    } else {
      prompt = prompt.replace('{{TOOL_DESCRIPTIONS}}', '_No tools available_');
    }

    // Inject KEY_FACTS
    if (variables.KEY_FACTS !== undefined) {
      prompt = prompt.replace('{{KEY_FACTS}}', variables.KEY_FACTS);
    } else {
      prompt = prompt.replace('{{KEY_FACTS}}', '_No facts recorded yet_');
    }

    return prompt;
  }

  /**
   * Get the raw template without variable substitution
   */
  getRawTemplate(): string {
    if (!this.template) {
      throw createAgentError(
        'SYSTEM_PROMPT_MISSING',
        'System prompt not loaded. Call load() first.'
      );
    }
    return this.template;
  }

  /**
   * Get the path to the prompt file
   */
  getPath(): string {
    return this.promptPath;
  }
}

/**
 * Create a system prompt loader instance
 */
export function createPromptLoader(promptPath: string): SystemPromptLoader {
  return new SystemPromptLoader(promptPath);
}
