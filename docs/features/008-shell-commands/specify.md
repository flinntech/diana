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
