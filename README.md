# DIANA

**Digital Intelligence And Neural Architecture**

A local AI assistant that organizes files, tracks activities, manages tasks, and maintains a unified view across your digital workspace.

---

## Overview

DIANA is a personal AI assistant that runs entirely on your local machine, powered by a local LLM (Qwen3:30b-a3b via Ollama). Unlike cloud-based assistants, DIANA keeps your data private while providing intelligent file organization, activity tracking, and task management across local folders, cloud sync directories, Notion, and Obsidian.

### Key Principles

- **Local-First**: All processing happens on your machine. Your files never leave your system.
- **Human-in-the-Loop**: DIANA proposes actions and awaits your approval before making changes.
- **Transparent Operations**: Every decision and action is logged in human-readable format in your Obsidian vault.
- **Privacy by Design**: No telemetry, no cloud dependencies for core functionality.

---

## Features

### Phase 1 (Current Focus)

- **File Watching**: Monitor `~/Downloads` and other configured directories for new files
- **Intelligent Organization**: Propose file moves based on content analysis and file type
- **Semantic Search**: Query your files using natural language via ChromaDB vector embeddings
- **CLI Chat Interface**: Simple command-line interface for interacting with DIANA
- **Activity Logging**: Track what DIANA observes and proposes in your Obsidian vault

### Future Phases

- **Cloud Sync Integration**: Monitor and organize synced cloud storage folders
- **Notion Integration**: Sync tasks and projects with Notion databases
- **Obsidian Deep Integration**: Link files to notes, auto-generate MOCs
- **Pattern Learning**: Learn your organization preferences over time
- **Web UI**: Browser-based dashboard for DIANA interactions

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    DIANA Core Service                   │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │   Watcher   │  │   Indexer   │  │  Scheduler  │      │
│  │  (Events)   │  │  (Vectors)  │  │   (Tasks)   │      │
│  └─────────────┘  └─────────────┘  └─────────────┘      │
├─────────────────────────────────────────────────────────┤
│                     Agent Brain                         │
│              (Qwen3:30b-a3b via Ollama)                 │
├─────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │  Local   │ │  Cloud   │ │  Notion  │ │ Obsidian │    │
│  │  Files   │ │  Sync    │ │   API    │ │  Vault   │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
├─────────────────────────────────────────────────────────┤
│                     Chat Interface                      │
│              (Web UI / CLI / System Tray)               │
└─────────────────────────────────────────────────────────┘
```

### Core Components

| Component     | Purpose                               | Technology          |
| ------------- | ------------------------------------- | ------------------- |
| **Watcher**   | File system event monitoring          | chokidar            |
| **Indexer**   | Vector embeddings for semantic search | ChromaDB (embedded) |
| **Organizer** | File organization proposals           | Qwen3:30b-a3b       |
| **Logger**    | Human-readable activity journal       | Obsidian Markdown   |
| **Scheduler** | Periodic tasks and reminders          | node-cron           |

---

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **LLM**: Qwen3:30b-a3b via Ollama (19GB, 3B active parameters)
- **Vector DB**: ChromaDB (embedded, local)
- **File Watching**: chokidar
- **Memory/Logs**: Obsidian vault (Markdown files)
- **Future UI**: React/Electron or web-based

---

## Prerequisites

- **Hardware**: GPU with 24GB+ VRAM recommended (RTX 3090/4090/5090)
- **Software**:
    - Node.js 20+
    - [Ollama](https://ollama.ai) with `qwen3:30b-a3b` model
    - Obsidian (for activity logs and notes)

### Installing Ollama & Model

```bash
# Install Ollama (Linux)
curl -fsSL https://ollama.ai/install.sh | sh

# Pull the model
ollama pull qwen3:30b-a3b

# Verify
ollama list
```

---

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/diana.git
cd diana

# Install dependencies
npm install

# Copy and configure settings
cp config/diana.config.example.ts config/diana.config.ts
# Edit diana.config.ts with your paths

# Build
npm run build

# Start DIANA
npm start
```

---

## Configuration

Edit `config/diana.config.ts` to customize:

```typescript
export const config = {
  // Directories to watch
  watchPaths: [
    '~/Downloads',
    '~/Documents/Inbox'
  ],
  
  // Organization rules
  organizeRules: {
    images: '~/Pictures/Organized',
    documents: '~/Documents/Organized',
    code: '~/Projects/Downloads'
  },
  
  // Obsidian vault for DIANA's logs
  obsidianVault: '~/Obsidian/DIANA',
  
  // Ollama settings
  ollama: {
    host: 'http://localhost:11434',
    model: 'qwen3:30b-a3b',
    keepAlive: '5m'
  },
  
  // ChromaDB settings
  chromadb: {
    path: '~/.diana/chromadb'
  }
};
```

---

## Usage

### CLI Commands

```bash
# Start interactive chat
diana chat

# Ask DIANA about your files
diana ask "Where are my tax documents from 2024?"

# Review pending proposals
diana proposals

# Approve a proposal
diana approve <proposal-id>

# Reject a proposal
diana reject <proposal-id>

# View activity log
diana log --today
```

### Example Interactions

```
You: What files did I download today?

DIANA: I observed 5 new files in ~/Downloads today:
  1. quarterly-report-2024.pdf (2.3 MB) - Business document
  2. IMG_4521.jpg (4.1 MB) - Photo, likely from iPhone
  3. setup-v2.1.exe (45 MB) - Windows installer
  4. notes-meeting.md (12 KB) - Markdown notes
  5. invoice-december.pdf (156 KB) - Financial document

I have organization proposals ready for review. 
Would you like to see them?
```

```
You: Show proposals

DIANA: Here are my organization proposals:

  [P-001] Move quarterly-report-2024.pdf
          → ~/Documents/Work/Reports/2024/
          Reason: Business report, matches existing pattern
          
  [P-002] Move IMG_4521.jpg  
          → ~/Pictures/2024/12-December/
          Reason: Photo dated 2024-12-10
          
  [P-003] Move invoice-december.pdf
          → ~/Documents/Finance/Invoices/2024/
          Reason: Invoice document, matches naming pattern

Approve all? (y/n) or specify: approve P-001 P-002
```

---

## Project Structure

```
diana/
├── src/
│   ├── index.ts          # Main service entry
│   ├── watcher.ts        # File system event monitoring
│   ├── indexer.ts        # ChromaDB integration
│   ├── organizer.ts      # Organization logic + proposals
│   ├── ollama.ts         # Qwen client
│   ├── obsidian.ts       # Vault integration for logs
│   ├── cli.ts            # Command-line interface
│   └── types.ts          # TypeScript type definitions
├── config/
│   └── diana.config.ts   # User configuration
├── .specify/             # Spec-driven development artifacts
│   ├── memory/
│   │   └── constitution.md
│   ├── specs/
│   └── templates/
├── package.json
├── tsconfig.json
└── README.md
```

---

## Development

This project uses **Spec-Driven Development** with GitHub Spec Kit.

```bash
# Initialize spec-kit (if not already done)
specify init --here --ai claude

# Create a new feature specification
/speckit.specify <feature description>

# Generate implementation plan
/speckit.plan <technical requirements>

# Generate tasks
/speckit.tasks

# Implement
/speckit.implement
```

See `.specify/memory/constitution.md` for project principles.

---

## Contributing

Contributions are welcome! Please read the constitution in `.specify/memory/constitution.md` to understand the project's architectural principles before contributing.

1. Fork the repository
2. Create a feature branch following Spec-Kit conventions
3. Write specs first, then implementation
4. Submit a pull request

---

## License

MIT License - See [LICENSE](LICENSE) for details.

---

## Acknowledgments

- **Qwen Team** for the excellent Qwen3 model family
- **Ollama** for making local LLM deployment simple
- **GitHub Spec Kit** for the spec-driven development methodology
- **ChromaDB** for the embedded vector database