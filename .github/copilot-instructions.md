# DIANA Copilot Instructions

This project follows strict principles defined in `.specify/memory/constitution.md`. Review all code changes against these guidelines.

## Code Review Checklist

### 1. Local-First Privacy
- Flag any code that sends data to external services or cloud APIs
- All processing must happen locally (Ollama for LLM, ChromaDB embedded for vectors)
- No telemetry, analytics, or external API calls for core functionality
- Third-party services are only permitted for optional features with explicit user opt-in

### 2. Human-in-the-Loop
- File operations (move, rename, delete, organize) MUST be proposed, not executed directly
- Flag any code that modifies user data without explicit approval flow
- Batch operations must display every proposed change before execution
- No operation that modifies user data may be automated without prior approval

### 3. Transparent Logging
- All actions should be logged to Obsidian vault in human-readable Markdown
- Flag functions that affect state but don't include logging
- Logs must include timestamps, reasoning, and outcomes
- If it's not logged, it didn't happen

### 4. Graceful Degradation
- Check that external dependency failures (Ollama, ChromaDB) are handled gracefully
- Errors must be logged and surfaced, never silently swallowed
- Partial functionality is better than complete failure

### 5. Agent-First Architecture
- New capabilities should be structured as agent modules with clean interfaces
- Agents must communicate through the orchestrator, not directly with each other
- MCP (Model Context Protocol) should be used for tool exposure where applicable

### 6. Transport-Agnostic Services
- Services must return structured data rather than performing output directly
- No console.log or readline in service layer code
- Services must emit events for state changes to enable real-time subscriptions
- Flag direct I/O in business logic (services should return data, not print)

### 7. Resource Consciousness
- Flag inefficient patterns: polling instead of events, unbounded memory, excessive LLM calls
- LLM calls should be batched where possible
- CPU usage during idle periods must be negligible

### 8. Testing for Destructive Operations
- File operation code requires tests before implementation
- Integration tests must verify the human-approval flow prevents unauthorized changes
- No PR may disable or skip the approval mechanism

## Anti-Patterns to Flag

- Direct file modifications without proposal/approval flow
- HTTP requests to external APIs in core functionality
- Silent error swallowing (empty catch blocks)
- Services that print to console instead of returning data
- Tight coupling between agents (should go through orchestrator)
- Magic or implicit behavior that users cannot predict
