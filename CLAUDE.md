# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DIANA (Digital Intelligence And Neural Architecture) is a local-first AI assistant that organizes files, tracks activities, and manages tasks. All processing happens locally using Qwen3:30b-a3b via Ollama. Data never leaves the user's machine.

## Build and Run Commands

```bash
npm install          # Install dependencies
npm run build        # Build TypeScript
npm start            # Start DIANA service
```

## CLI Commands (planned)

```bash
diana chat                    # Interactive chat
diana ask "<query>"           # Ask about files
diana proposals               # Review pending proposals
diana approve <proposal-id>   # Approve a proposal
diana reject <proposal-id>    # Reject a proposal
diana log --today             # View activity log
```

## Architecture

The system follows a human-in-the-loop pattern where DIANA proposes actions and waits for approval before making changes.

**Core Components:**
- **Watcher** (`watcher.ts`): File system monitoring via chokidar
- **Indexer** (`indexer.ts`): Vector embeddings with ChromaDB for semantic search
- **Organizer** (`organizer.ts`): File organization proposals using LLM
- **Logger** (`obsidian.ts`): Activity journal written to Obsidian vault
- **Scheduler**: Periodic tasks via node-cron

**External Dependencies:**
- Ollama running locally with `qwen3:30b-a3b` model
- ChromaDB (embedded) for vector storage
- Obsidian vault for human-readable logs

## Configuration

User config lives in `config/diana.config.ts` - watch paths, organization rules, Obsidian vault location, and Ollama settings.

## Development Workflow

This project uses Spec-Driven Development with GitHub Spec Kit:

```bash
specify init --here --ai claude   # Initialize spec-kit
/speckit.specify <feature>        # Create feature specification
/speckit.plan <requirements>      # Generate implementation plan
/speckit.tasks                    # Generate tasks
/speckit.implement                # Implement
```

Project principles are documented in `.specify/memory/constitution.md`.

## Active Technologies
- Node.js with TypeScript (ES modules, strict mode) (001-obsidian-integration)
- File system - Obsidian vault at `/mnt/c/Users/joshu/Obsidian/DIANA/DIANA_brain` (001-obsidian-integration)
- Node.js 18+ with TypeScript 5.9 (ES modules, strict mode) (002-llm-agent-core)
- File system (Obsidian vault markdown files) (002-llm-agent-core)
- TypeScript 5.9+ with Node.js 18+ (ES modules, strict mode) + chokidar ^4.0.0, existing DIANA framework (date-fns, gray-matter) (003-file-watcher-proposals)
- JSON file (`/home/diana/proposals.json`) + Obsidian vault (audit logs) (003-file-watcher-proposals)

## Recent Changes
- 001-obsidian-integration: Added Node.js with TypeScript (ES modules, strict mode)
