# Quickstart: File Watcher & Proposals

**Feature**: 003-file-watcher-proposals
**Date**: 2025-12-11

---

## Overview

DIANA's File Watcher monitors designated folders for new and changed files, analyzes them, and creates organization proposals. You approve or reject proposals through natural conversation.

```
Download a file → DIANA detects it → Creates proposal → You review → Approve/Reject
```

---

## Getting Started

### 1. Start DIANA

```bash
npm run build && npm start
```

The watcher automatically starts monitoring:
- `/mnt/c/Users/joshu/Downloads`
- `/mnt/c/Users/joshu/Documents`

### 2. Review Pending Proposals

In the chat interface:

```
You: What proposals do you have?

DIANA: I have 3 pending proposals:

1. **invoice-december.pdf** (high confidence)
   → Move to Organized/Finances/2025/
   ⚠️ Flagged as sensitive (financial document)
   Reason: PDF filename contains 'invoice'

2. **Screenshot 2025-12-11.png** (high confidence)
   → Move to Organized/Screenshots/2025/12/
   Reason: Matches screenshot filename pattern

3. **setup.exe** (medium confidence)
   → Move to Organized/Installers/
   Reason: Executable file type
```

### 3. Approve or Reject

```
You: Approve the screenshot proposal

DIANA: ✓ Moved Screenshot 2025-12-11.png to Organized/Screenshots/2025/12/
```

```
You: Reject the setup.exe one, I still need it

DIANA: ✓ Rejected proposal. Won't re-propose this file for 24 hours.
```

For sensitive files:
```
You: Approve the invoice proposal

DIANA: This proposal is flagged as sensitive (financial document).
       Are you sure you want to approve it?

You: Yes, approve it

DIANA: ✓ Moved invoice-december.pdf to Organized/Finances/2025/
```

### 4. Batch Operations

```
You: Approve all pending proposals

DIANA: Approved 5 proposals.
       Skipped 1 sensitive proposal (use "approve all including sensitive").
```

```
You: Clear all proposals

DIANA: Cleared 3 pending proposals without executing any file moves.
```

---

## Managing Watched Directories

### View current directories

```
You: What directories are you watching?

DIANA: Currently watching:
       • /mnt/c/Users/joshu/Downloads (enabled)
       • /mnt/c/Users/joshu/Documents (enabled)

       Watcher status: running
```

### Add a directory

```
You: Start watching my Projects folder

DIANA: ✓ Now watching /mnt/c/Users/joshu/Projects
```

### Remove a directory

```
You: Stop watching Downloads

DIANA: ✓ Stopped watching /mnt/c/Users/joshu/Downloads
```

### Pause/resume watching

```
You: Stop the file watcher

DIANA: ✓ File watcher paused. Existing proposals preserved.
```

```
You: Start the file watcher

DIANA: ✓ File watcher running. Monitoring 2 directories.
```

---

## File Categories

DIANA categorizes files based on content and filename patterns. All files are organized into a dedicated `Organized/` folder (configurable) to prevent recursive detection.

| Category | Detection | Default Destination |
|----------|-----------|---------------------|
| Finances | Invoice, receipt, tax keywords; budget.xlsx | Organized/Finances/{year}/ |
| Screenshots | Screenshot filename patterns | Organized/Screenshots/{year}/{month}/ |
| Installers | .exe, .msi, .dmg, .deb | Organized/Installers/ |
| Work | .pptx, .xlsx; meeting/project keywords | Organized/Work/{project}/ |
| Personal | Resume/CV, letters, certificates | Organized/Personal/ |
| Reference | Manuals, guides, documentation | Organized/Reference/ |
| Media | .jpg, .png, .mp4 (non-screenshot) | Organized/Media/{year}/ |
| Archives | .zip, .tar, .7z | Organized/Archives/ |
| Code | .ts, .py, .js, configs | Organized/Code/ |
| Misc | Uncategorizable files | Organized/Misc/ |

**Office files** (.xlsx, .pptx, .docx): Classified by filename patterns. Spreadsheets and presentations default to `work`. Budget/expense spreadsheets go to `finances`. Resumes go to `personal`.

---

## Sensitive File Detection

Files matching these patterns are flagged as **sensitive**:
- Tax documents (tax, w-2, 1099)
- Financial records (invoice, receipt, statement)
- Personal identity (passport, license, SSN)
- Credentials (password, .pem, .key files)
- Medical records

Sensitive proposals require explicit confirmation before approval.

---

## Configuration

Edit `config/diana.config.ts`:

```typescript
export const watcherConfig: WatcherConfig = {
  // Directories to watch for new files
  directories: [
    { path: '/mnt/c/Users/joshu/Downloads', enabled: true, recursive: false },
    { path: '/mnt/c/Users/joshu/Documents', enabled: true, recursive: false },
  ],

  // Base path for organized files (MUST be outside watched directories)
  basePath: '/mnt/c/Users/joshu/Organized',

  stabilityDelayMs: 3000,        // Wait 3s for file writes to complete
  cooldownHours: 24,             // Don't re-propose rejected files for 24h
  enableLlmClassification: true, // Use Qwen3 for uncertain files
  proposalStorePath: '/home/diana/proposals.json',
};
```

**Important**: The `basePath` must be outside watched directories to prevent recursive proposals.

---

## Logs & Audit Trail

All proposal actions are logged to your Obsidian vault:

**Daily log entry** (`daily/2025-12-11.md`):
```markdown
### 14:32 - File Organization

- **Approved**: invoice-december.pdf → Organized/Finances/2025/
- **Rejected**: notes.txt (user: "still working on this")
```

**Proposal notes** (`proposals/`):
Each proposal creates a note with full details for reference.

---

## Troubleshooting

### No proposals appearing?

1. Check watcher status: "Are you watching for files?"
2. Verify directory exists and is readable
3. Check for ignored patterns (dotfiles, .tmp, .part)
4. Files must be stable for 3 seconds before analysis

### Proposal says file doesn't exist?

The source file was moved or deleted externally. The proposal is automatically marked invalid.

### Wrong category?

Reject the proposal and it won't be re-proposed for 24 hours. Future versions will learn from rejections.

### LLM not being used?

Only ambiguous files (< medium confidence from patterns) trigger LLM. Check `enableLlmClassification` in config.
