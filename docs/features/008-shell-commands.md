# 008: Shell Commands

**Phase**: 2 (Core Tools)
**Score**: 4.5
**Value**: 9 | **Effort**: 2

## Overview

Allow DIANA to execute shell commands with user approval. Powerful capability that requires careful safety controls.

## Dependencies

- 004-agent-mcp-foundation
- Robust approval flow (from 005)

## Enables

- System automation
- Development workflows
- Script execution
- Package management

---

## speckit.specify Prompt

```
Shell Command Execution for DIANA

Add ability to execute shell commands with approval flow:

1. Core Functionality
   - Execute arbitrary shell commands
   - Capture stdout, stderr, exit code
   - Support for working directory specification
   - Timeout handling for long-running commands

2. Safety Controls (Critical)
   - ALL commands require explicit user approval
   - Display full command before execution
   - Blocked command patterns (rm -rf /, etc.)
   - Configurable command allowlist/blocklist
   - Log all executed commands to Obsidian

3. Tool Interface
   - shell_execute: Run command with approval
   - shell_script: Run multi-line script with approval

4. Output Handling
   - Stream output for long-running commands (optional)
   - Truncate very long outputs with summary
   - Parse structured output (JSON, tables) when possible

Constraints:
- Never execute without explicit approval
- Never execute commands that could damage system
- All executions logged for audit
- Timeout default: 30 seconds, configurable
- WSL-aware: handle Windows/Linux path differences
```

---

## speckit.plan Prompt

```
Create implementation plan for Shell Commands

Technical context:
- Language: TypeScript 5.9+ with Node.js 18+
- Node.js: child_process.exec or spawn
- Environment: WSL (Linux) with Windows host
- Existing: Approval flow pattern from proposals

Research needed:
- Node.js child_process best practices
- Security patterns for shell execution
- WSL path handling considerations
- Command sanitization approaches

Key deliverables:
1. src/agents/system/shell.ts - Shell execution with safety
2. src/agents/system/blocked-commands.ts - Dangerous command patterns
3. Approval integration for command execution
4. Comprehensive logging of all executions
5. Tests for safety controls and execution
```
