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
# >>> GIT CHECKPOINT HERE <<<     # Commit spec.md before planning
/speckit.checklist <domain>       # Optional: validate requirements quality
/speckit.clarify                  # Ask clarifying questions, refine spec
/speckit.plan <requirements>      # Generate implementation plan
/speckit.tasks                    # Generate tasks
/speckit.analyze                  # Cross-artifact consistency check
/speckit.implement                # Implement
```

**Git Checkpoints:** Always create a commit after `/speckit.specify` completes. This provides a rollback point if the spec needs adjustment before regenerating code. Commit message format: `docs(spec): add <feature-name> specification`

**Quality Gates:**
- `/speckit.checklist <domain>` - Run after checkpoint, before clarify (see domain guidance below)
- `/speckit.clarify` - Run after checklist to identify underspecified areas
- `/speckit.analyze` - Run after tasks to verify consistency across spec, plan, and tasks

**Checklist Domains** (use judgment - not every feature needs a checklist):
- `requirements` - Default for complex features with many moving parts
- `local-first` - Features touching external APIs, user data, or cloud services
- `human-in-the-loop` - Features with destructive actions (file ops, email send, shell)
- `architecture` - Foundational features that other features depend on
- `api` - Features exposing new tool interfaces

*Skip checklists for:* Simple integrations, minor enhancements, well-understood patterns.
*One checklist per feature is usually sufficient.* Pick the most relevant domain.

Project principles are documented in `.specify/memory/constitution.md`.

## Active Technologies
- Node.js with TypeScript (ES modules, strict mode) (001-obsidian-integration)
- File system - Obsidian vault at `/mnt/c/Users/joshu/Obsidian/DIANA/DIANA_brain` (001-obsidian-integration)
- Node.js 18+ with TypeScript 5.9 (ES modules, strict mode) (002-llm-agent-core)
- File system (Obsidian vault markdown files) (002-llm-agent-core)
- TypeScript 5.9+ with Node.js 18+ (ES modules, strict mode) + chokidar ^4.0.0, existing DIANA framework (date-fns, gray-matter) (003-file-watcher-proposals)
- JSON file (`/home/diana/proposals.json`) + Obsidian vault (audit logs) (003-file-watcher-proposals)
- TypeScript 5.9+ with Node.js 18+ (ES modules, strict mode) + `@modelcontextprotocol/sdk` (MCP TypeScript SDK), existing DIANA framework (004-agent-mcp-foundation)
- N/A (stateless orchestrator; MCP config in `config/mcp-servers.json`) (004-agent-mcp-foundation)
- TypeScript 5.9+ with Node.js 18+ (ES modules, strict mode) + write-file-atomic (existing), inquirer (for interactive picker), date-fns (existing) (005-conversation-persistence)
- JSON files in `~/.diana/conversations/` (index.json + {id}.json per conversation) (005-conversation-persistence)

## Recent Changes
- 001-obsidian-integration: Added Node.js with TypeScript (ES modules, strict mode)
