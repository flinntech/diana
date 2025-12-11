/**
 * Unit Tests for SystemPromptLoader
 *
 * Feature: 002-llm-agent-core
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { SystemPromptLoader, createPromptLoader } from '../../../src/agent/prompt.js';

// Helper to create a unique temp directory
async function createTempDir(): Promise<string> {
  const tempDir = join(
    tmpdir(),
    `diana-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  await mkdir(tempDir, { recursive: true });
  return tempDir;
}

describe('SystemPromptLoader', () => {
  let tempDir: string;
  let promptPath: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    promptPath = join(tempDir, 'system-prompt.md');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('stores the prompt path', () => {
      const loader = new SystemPromptLoader(promptPath);
      expect(loader.getPath()).toBe(promptPath);
    });
  });

  describe('load', () => {
    it('loads template from file', async () => {
      await writeFile(promptPath, 'You are a helpful assistant.');

      const loader = new SystemPromptLoader(promptPath);
      await loader.load();

      expect(loader.isLoaded()).toBe(true);
    });

    it('throws error when file does not exist', async () => {
      const loader = new SystemPromptLoader('/nonexistent/path.md');

      await expect(loader.load()).rejects.toThrow('System prompt not found');
    });
  });

  describe('isLoaded', () => {
    it('returns false before load', () => {
      const loader = new SystemPromptLoader(promptPath);
      expect(loader.isLoaded()).toBe(false);
    });

    it('returns true after load', async () => {
      await writeFile(promptPath, 'Template');

      const loader = new SystemPromptLoader(promptPath);
      await loader.load();

      expect(loader.isLoaded()).toBe(true);
    });
  });

  describe('getPrompt', () => {
    it('throws error when not loaded', () => {
      const loader = new SystemPromptLoader(promptPath);
      expect(() => loader.getPrompt()).toThrow('System prompt not loaded');
    });

    it('returns template without variables', async () => {
      await writeFile(promptPath, 'Simple prompt without variables.');

      const loader = new SystemPromptLoader(promptPath);
      await loader.load();

      const prompt = loader.getPrompt();
      expect(prompt).toBe('Simple prompt without variables.');
    });

    it('injects TOOL_DESCRIPTIONS variable', async () => {
      await writeFile(promptPath, 'Tools: {{TOOL_DESCRIPTIONS}}');

      const loader = new SystemPromptLoader(promptPath);
      await loader.load();

      const prompt = loader.getPrompt({
        TOOL_DESCRIPTIONS: '### write_note\nWrites a note to Obsidian.',
      });

      expect(prompt).toBe('Tools: ### write_note\nWrites a note to Obsidian.');
    });

    it('injects KEY_FACTS variable', async () => {
      await writeFile(promptPath, 'Facts: {{KEY_FACTS}}');

      const loader = new SystemPromptLoader(promptPath);
      await loader.load();

      const prompt = loader.getPrompt({
        KEY_FACTS: '- User prefers dark mode\n- User is a developer',
      });

      expect(prompt).toBe('Facts: - User prefers dark mode\n- User is a developer');
    });

    it('replaces TOOL_DESCRIPTIONS with default when not provided', async () => {
      await writeFile(promptPath, 'Tools: {{TOOL_DESCRIPTIONS}}');

      const loader = new SystemPromptLoader(promptPath);
      await loader.load();

      const prompt = loader.getPrompt();
      expect(prompt).toBe('Tools: _No tools available_');
    });

    it('replaces KEY_FACTS with default when not provided', async () => {
      await writeFile(promptPath, 'Facts: {{KEY_FACTS}}');

      const loader = new SystemPromptLoader(promptPath);
      await loader.load();

      const prompt = loader.getPrompt();
      expect(prompt).toBe('Facts: _No facts recorded yet_');
    });

    it('handles multiple variables', async () => {
      await writeFile(
        promptPath,
        'You are DIANA.\n\nTools:\n{{TOOL_DESCRIPTIONS}}\n\nFacts:\n{{KEY_FACTS}}'
      );

      const loader = new SystemPromptLoader(promptPath);
      await loader.load();

      const prompt = loader.getPrompt({
        TOOL_DESCRIPTIONS: '### tool1\nA tool.',
        KEY_FACTS: '- Fact 1\n- Fact 2',
      });

      expect(prompt).toContain('### tool1');
      expect(prompt).toContain('- Fact 1');
      expect(prompt).toContain('- Fact 2');
    });

    it('preserves template content outside variables', async () => {
      await writeFile(
        promptPath,
        `# DIANA System Prompt

You are DIANA, a helpful AI assistant.

## Available Tools

{{TOOL_DESCRIPTIONS}}

## User Context

{{KEY_FACTS}}

Please help the user with their requests.`
      );

      const loader = new SystemPromptLoader(promptPath);
      await loader.load();

      const prompt = loader.getPrompt({
        TOOL_DESCRIPTIONS: 'Tool info',
        KEY_FACTS: 'Fact info',
      });

      expect(prompt).toContain('# DIANA System Prompt');
      expect(prompt).toContain('You are DIANA');
      expect(prompt).toContain('## Available Tools');
      expect(prompt).toContain('Tool info');
      expect(prompt).toContain('## User Context');
      expect(prompt).toContain('Fact info');
      expect(prompt).toContain('Please help the user');
    });
  });

  describe('getRawTemplate', () => {
    it('throws error when not loaded', () => {
      const loader = new SystemPromptLoader(promptPath);
      expect(() => loader.getRawTemplate()).toThrow('System prompt not loaded');
    });

    it('returns template without variable substitution', async () => {
      await writeFile(promptPath, 'Template with {{TOOL_DESCRIPTIONS}}');

      const loader = new SystemPromptLoader(promptPath);
      await loader.load();

      const raw = loader.getRawTemplate();
      expect(raw).toBe('Template with {{TOOL_DESCRIPTIONS}}');
    });
  });

  describe('getPath', () => {
    it('returns configured path', () => {
      const loader = new SystemPromptLoader('/custom/path.md');
      expect(loader.getPath()).toBe('/custom/path.md');
    });
  });

  describe('createPromptLoader factory', () => {
    it('creates SystemPromptLoader instance', () => {
      const loader = createPromptLoader(promptPath);
      expect(loader).toBeInstanceOf(SystemPromptLoader);
    });

    it('configures path correctly', () => {
      const loader = createPromptLoader('/test/path.md');
      expect(loader.getPath()).toBe('/test/path.md');
    });
  });
});
