Agent + MCP Foundation for DIANA

Create the foundational architecture for DIANA's agent-based capability system:

1. Agent Interface
   - Define Agent TypeScript interface with standard methods (initialize, execute, shutdown)
   - Agents communicate through orchestrator, never directly
   - Each agent designed for eventual process separation
   - Support for both sync and async tool execution

2. MCP Client Infrastructure
   - MCP client that can connect to external MCP servers
   - Tool discovery and registration from MCP servers
   - Standard error handling for MCP communication failures
   - Graceful degradation when MCP servers unavailable

3. Orchestrator Foundation
   - Route requests to appropriate agents
   - Maintain agent registry
   - Handle agent lifecycle (start, stop, health checks)

4. Integration with Existing Tools
   - Wrap existing tools (save_fact, obsidian logging) in agent pattern
   - Backward compatible with current tool registry

Constraints:
- Local-first: No cloud services required
- Human-in-the-loop: Agents propose, don't execute destructive actions
- TypeScript with strict mode
- Must not break existing chat/watcher functionality
