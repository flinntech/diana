# Proposal Tools Contract

**Feature**: 003-file-watcher-proposals
**Date**: 2025-12-11

These tools are registered in the DIANA ToolRegistry and invoked by the LLM during chat sessions.

---

## Tool: list_proposals

List all proposals, optionally filtered by status.

### Parameters

```json
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "enum": ["pending", "approved", "rejected", "invalid", "all"],
      "description": "Filter by proposal status. Defaults to 'pending'."
    },
    "limit": {
      "type": "number",
      "description": "Maximum number of proposals to return. Defaults to 20."
    }
  },
  "required": []
}
```

### Returns

```typescript
interface ListProposalsResult {
  success: true;
  data: {
    proposals: ProposalSummary[];
    total: number;
    hasMore: boolean;
  };
}

interface ProposalSummary {
  id: string;
  filename: string;           // Source filename only
  category: string;
  action: string;             // e.g., "move to Documents/Finances"
  confidence: string;
  sensitive: boolean;
  createdAt: string;          // ISO datetime
  reasoning: string;
}
```

### Example

**User**: "What proposals do you have?"

**Tool call**:
```json
{
  "name": "list_proposals",
  "arguments": { "status": "pending" }
}
```

**Result**:
```json
{
  "success": true,
  "data": {
    "proposals": [
      {
        "id": "a1b2c3d4",
        "filename": "invoice-december.pdf",
        "category": "finances",
        "action": "move to Documents/Finances/2025/",
        "confidence": "high",
        "sensitive": true,
        "createdAt": "2025-12-11T10:00:00Z",
        "reasoning": "PDF filename contains 'invoice' and content references billing"
      }
    ],
    "total": 1,
    "hasMore": false
  }
}
```

---

## Tool: approve_proposal

Approve a proposal to execute the file operation.

### Parameters

```json
{
  "type": "object",
  "properties": {
    "proposal_id": {
      "type": "string",
      "description": "The unique ID of the proposal to approve"
    },
    "confirm_sensitive": {
      "type": "boolean",
      "description": "Must be true to approve sensitive proposals. Defaults to false."
    }
  },
  "required": ["proposal_id"]
}
```

### Returns

```typescript
interface ApproveProposalResult {
  success: boolean;
  data?: {
    action: string;           // Description of what was done
    sourcePath: string;
    destinationPath: string;
  };
  error?: string;
}
```

### Behavior

1. Validates proposal exists and is `pending`
2. Checks if source file still exists
3. If `sensitive` and `confirm_sensitive !== true`, returns error
4. Creates destination directory if needed
5. Executes file operation (move/rename)
6. Updates proposal status to `approved`
7. Logs action to Obsidian daily journal

### Example

**User**: "Approve the invoice proposal"

**Tool call**:
```json
{
  "name": "approve_proposal",
  "arguments": {
    "proposal_id": "a1b2c3d4",
    "confirm_sensitive": true
  }
}
```

**Result**:
```json
{
  "success": true,
  "data": {
    "action": "Moved file",
    "sourcePath": "/mnt/c/Users/joshu/Downloads/invoice-december.pdf",
    "destinationPath": "/mnt/c/Users/joshu/Documents/Finances/2025/invoice-december.pdf"
  }
}
```

### Error cases

| Condition | Error message |
|-----------|---------------|
| Proposal not found | "Proposal 'xyz' not found" |
| Already resolved | "Proposal already approved/rejected" |
| Source file missing | "Source file no longer exists" |
| Destination exists | "Destination file already exists" |
| Permission denied | "Cannot write to destination directory" |
| Sensitive without confirm | "This proposal is flagged as sensitive. Set confirm_sensitive to true." |

---

## Tool: reject_proposal

Reject a proposal without executing any file operation.

### Parameters

```json
{
  "type": "object",
  "properties": {
    "proposal_id": {
      "type": "string",
      "description": "The unique ID of the proposal to reject"
    },
    "reason": {
      "type": "string",
      "description": "Optional reason for rejection (for logging)"
    }
  },
  "required": ["proposal_id"]
}
```

### Returns

```typescript
interface RejectProposalResult {
  success: boolean;
  data?: {
    action: string;
    filename: string;
    cooldownUntil: string;    // ISO datetime when file can be re-proposed
  };
  error?: string;
}
```

### Behavior

1. Validates proposal exists and is `pending`
2. Updates proposal status to `rejected`
3. Adds source path to cooldown map (24 hours by default)
4. Logs rejection to Obsidian daily journal

### Example

**User**: "Reject that one, it's not an invoice"

**Tool call**:
```json
{
  "name": "reject_proposal",
  "arguments": {
    "proposal_id": "a1b2c3d4",
    "reason": "User indicated file is not an invoice"
  }
}
```

**Result**:
```json
{
  "success": true,
  "data": {
    "action": "Rejected proposal",
    "filename": "invoice-december.pdf",
    "cooldownUntil": "2025-12-12T10:00:00Z"
  }
}
```

---

## Tool: approve_all_proposals

Batch approve all pending proposals (except sensitive ones without confirmation).

### Parameters

```json
{
  "type": "object",
  "properties": {
    "include_sensitive": {
      "type": "boolean",
      "description": "If true, also approve sensitive proposals. Defaults to false."
    }
  },
  "required": []
}
```

### Returns

```typescript
interface ApproveAllResult {
  success: true;
  data: {
    approved: number;
    skipped: number;          // Sensitive proposals when include_sensitive=false
    failed: number;           // Proposals that failed to execute
    errors: string[];         // Error messages for failed proposals
  };
}
```

### Example

**Tool call**:
```json
{
  "name": "approve_all_proposals",
  "arguments": { "include_sensitive": false }
}
```

**Result**:
```json
{
  "success": true,
  "data": {
    "approved": 5,
    "skipped": 1,
    "failed": 0,
    "errors": []
  }
}
```

---

## Tool: clear_all_proposals

Remove all pending proposals without executing any file operations.

### Parameters

```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

### Returns

```typescript
interface ClearAllResult {
  success: true;
  data: {
    cleared: number;
  };
}
```

---

## Tool: get_watched_directories

List all configured watched directories.

### Parameters

```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

### Returns

```typescript
interface GetWatchedResult {
  success: true;
  data: {
    directories: Array<{
      path: string;
      enabled: boolean;
      recursive: boolean;
    }>;
    watcherStatus: 'running' | 'stopped';
  };
}
```

---

## Tool: add_watched_directory

Add a new directory to the watch list.

### Parameters

```json
{
  "type": "object",
  "properties": {
    "path": {
      "type": "string",
      "description": "Absolute path to the directory to watch"
    },
    "recursive": {
      "type": "boolean",
      "description": "Whether to watch subdirectories. Defaults to false."
    }
  },
  "required": ["path"]
}
```

### Returns

```typescript
interface AddWatchedResult {
  success: boolean;
  data?: {
    path: string;
    enabled: boolean;
  };
  error?: string;
}
```

### Error cases

| Condition | Error message |
|-----------|---------------|
| Path doesn't exist | "Directory does not exist" |
| Not a directory | "Path is not a directory" |
| Already watched | "Directory is already being watched" |
| Not readable | "Cannot read directory" |

---

## Tool: remove_watched_directory

Remove a directory from the watch list.

### Parameters

```json
{
  "type": "object",
  "properties": {
    "path": {
      "type": "string",
      "description": "Absolute path of the directory to stop watching"
    }
  },
  "required": ["path"]
}
```

### Returns

```typescript
interface RemoveWatchedResult {
  success: boolean;
  data?: {
    path: string;
  };
  error?: string;
}
```

---

## Tool: start_watcher

Start or resume the file watcher.

### Parameters

```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

### Returns

```typescript
interface StartWatcherResult {
  success: boolean;
  data?: {
    status: 'running';
    watchedDirectories: number;
  };
  error?: string;
}
```

---

## Tool: stop_watcher

Pause the file watcher (does not clear proposals).

### Parameters

```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

### Returns

```typescript
interface StopWatcherResult {
  success: boolean;
  data?: {
    status: 'stopped';
  };
  error?: string;
}
```

---

## Implementation Notes

All tools follow the existing DIANA tool pattern from [tools.ts](../../../src/agent/tools.ts):

```typescript
// Tool factory example
export function createListProposalsTool(proposalService: ProposalService): Tool {
  return {
    name: 'list_proposals',
    description: 'List pending file organization proposals waiting for your approval',
    parameters: { /* JSON Schema above */ },
    execute: async (args) => {
      // Implementation
    }
  };
}

// Registration in session
export function registerProposalTools(
  registry: ToolRegistry,
  proposalService: ProposalService,
  watcherService: WatcherService
): void {
  registry.register(createListProposalsTool(proposalService));
  registry.register(createApproveProposalTool(proposalService));
  // ... etc
}
```
