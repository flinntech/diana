# Quickstart: LLM Agent Core

**Feature**: 002-llm-agent-core
**Date**: 2025-12-10

## Prerequisites

Before starting DIANA, ensure you have:

1. **Node.js 18+** installed
2. **Ollama** installed and running
3. **qwen3:30b-a3b** model pulled in Ollama
4. **Obsidian vault** accessible at configured path

### Install Ollama

```bash
# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama service
ollama serve
```

### Pull the Model (REQUIRED)

```bash
# This step is mandatory - DIANA will not start without the model
ollama pull qwen3:30b-a3b
```

### Verify Ollama is Running

```bash
curl http://localhost:11434/api/tags
# Should return list of available models
```

## Installation

```bash
# Clone and install
cd diana
npm install

# Build TypeScript
npm run build
```

## Configuration

### 1. Ollama Settings

Edit `src/config/diana.config.ts`:

```typescript
export const config: DianaConfig = {
  obsidian: {
    vaultPath: '/mnt/c/Users/joshu/Obsidian/DIANA/DIANA_brain',
    // ... existing config
  },
  ollama: {
    host: 'localhost',
    port: 11434,
    model: 'qwen3:30b-a3b',
    contextSize: 32768,
    timeout: 120000,
  },
  systemPromptPath: './src/config/system-prompt.md',
  memoryPath: '/mnt/c/Users/joshu/Obsidian/DIANA/DIANA_brain/memory/facts.md',
};
```

### 2. System Prompt

Create `src/config/system-prompt.md`:

```markdown
# DIANA System Prompt

You are DIANA (Digital Intelligence And Neural Architecture), Josh's personal AI assistant.

## Identity

- You run locally on Josh's machine using Ollama
- All data stays local - you never send information to external services
- You are helpful, concise, and technically competent
- You speak directly and avoid unnecessary pleasantries

## Principles

- **Local-first**: All processing happens on Josh's machine
- **Transparent**: You log all actions to Obsidian for review
- **Human-in-the-loop**: You propose actions and wait for approval

## Available Tools

{{TOOL_DESCRIPTIONS}}

## Known Facts About Josh

{{KEY_FACTS}}

## Behavior Guidelines

1. Keep responses concise unless asked for detail
2. When using tools, explain what you're doing
3. If you're unsure, ask for clarification
4. Reference previous conversation context when relevant
```

### 3. Memory File

Create `memory/facts.md` in your Obsidian vault:

```markdown
---
type: memory
created: 2025-12-10T00:00:00
modified: 2025-12-10T00:00:00
---

# Key Facts

## Important

## Recent
```

## CLI Usage

### Interactive Chat

Start a conversation session:

```bash
diana chat
```

Example session:

```
DIANA: Hello Josh! How can I help you today?

> What's in my daily log for today?

DIANA: Let me check today's daily log...
[Calling tool: read_daily_note]
You have 3 entries today:
- 09:15 - Started working on LLM agent feature
- 11:30 - Had standup meeting
- 14:00 - Reviewed PR for Obsidian integration

> Make a note that I finished the agent implementation

DIANA: I'll add that to your daily log.
[Calling tool: write_daily_note]
Done! I've added "Finished agent implementation" to today's log.

> /exit

DIANA: Goodbye! Your conversation has been logged.
```

### One-Shot Queries

Ask a quick question:

```bash
diana ask "What did I work on yesterday?"
```

Output:

```
Based on yesterday's daily log, you worked on:
- Obsidian integration testing
- Fixed frontmatter parsing bug
- Reviewed 2 pull requests
```

### Health Check

Verify DIANA is properly configured:

```bash
diana status
```

Output:

```
DIANA Status
============
Ollama:       ✓ Connected (localhost:11434)
Model:        ✓ qwen3:30b-a3b available
Vault:        ✓ Accessible (/mnt/c/.../DIANA_brain)
System Prompt: ✓ Loaded (156 tokens)
Tools:        3 registered
  - write_daily_note
  - read_daily_note
  - write_observation
```

## Error Messages

### Ollama Not Running

```
ERROR: Cannot connect to Ollama at localhost:11434
Please start Ollama with: ollama serve
```

### Model Not Found

```
ERROR: Model 'qwen3:30b-a3b' not found
Please pull the model with: ollama pull qwen3:30b-a3b
```

### Vault Not Accessible

```
ERROR: Cannot access Obsidian vault at /path/to/vault
Please check the path in diana.config.ts
```

### System Prompt Missing

```
ERROR: System prompt not found at ./src/config/system-prompt.md
Please create the system prompt file
```

## Development

### Run Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests (requires Ollama)
npm run test:integration
```

### Debug Mode

Enable verbose logging:

```bash
diana chat --debug
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                        CLI Layer                         │
│  diana chat | diana ask | diana status                  │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                     Agent Layer                          │
│  ConversationManager | ToolRegistry | KeyFactStore      │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                     LLM Layer                            │
│  OllamaClient (fetch → localhost:11434)                 │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                  Storage Layer                           │
│  ObsidianWriter (from 001-obsidian-integration)         │
└─────────────────────────────────────────────────────────┘
```

## Next Steps

After basic chat is working:

1. **Add more tools**: Extend ToolRegistry with custom capabilities
2. **Tune system prompt**: Adjust DIANA's personality and behavior
3. **Review logs**: Check Obsidian daily notes for conversation history
4. **Track facts**: DIANA will learn and remember key information over time
