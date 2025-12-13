# DIANA Capability Roadmap

Building toward JARVIS - a truly useful AI assistant.

## Scoring Key

- **Value**: 1-10 (10 = daily use, transformative impact)
- **Effort**: 1-5 (5 = weeks of work, major undertaking)
- **Score**: Value / Effort (higher = do first)

---

## Current Capabilities (Done)

- [x] Chat interface (CLI)
- [x] Obsidian daily logging
- [x] Cross-session memory (key facts)
- [x] File watcher with organization proposals
- [x] Date/time awareness
- [x] Warm personality
- [x] Agent + MCP foundation [004]
- [x] Conversation persistence [005]
- [x] Obsidian rich linking [006]

---

## Capability Matrix

| Capability             | Value | Effort | Score | Notes                                                                    |
| ---------------------- | ----- | ------ | ----- | ------------------------------------------------------------------------ |
| **Information Access** |       |        |       |                                                                          |
| Web search             | 8     | 2      | 4.0   | SerpAPI ready, needs page reading [012]                                  |
| Read web pages         | 8     | 2      | 4.0   | Readability.js, pairs with search [012]                                  |
| RAG over local files   | 9     | 4      | 2.25  | ChromaDB exists, needs integration [020]                                 |
| Wikipedia lookup       | 5     | 1      | 5.0   | Simple API, quick win [008]                                              |
| **Productivity**       |       |        |       |                                                                          |
| Reclaim.ai integration | 10    | 2      | 5.0   | Tasks + calendar in one, REST API exists [009]                           |
| Notion integration     | 8     | 2      | 4.0   | Project notes, MCP server exists [013]                                   |
| Gmail (personal)       | 8     | 2      | 4.0   | MCP server exists, OAuth2 ready [011]                                    |
| Outlook (work)         | 7     | 2      | 3.5   | MCP server running locally [015]                                         |
| Reminders/alarms       | 8     | 2      | 4.0   | node-cron + notifications [014]                                          |
| **System Control**     |       |        |       |                                                                          |
| Run shell commands     | 9     | 2      | 4.5   | Powerful but dangerous [010]                                             |
| File System Agent      | 8     | 2      | 4.0   | Unified file expert: search + CRUD + watch + compound ops [007]          |
| App launching          | 5     | 2      | 2.5   | OS-specific                                                              |
| Clipboard access       | 6     | 2      | 3.0   | WSL→Windows bridge via clip.exe/PS [016]                                 |
| **Communication**      |       |        |       |                                                                          |
| Voice input (STT)      | 4     | 3      | 1.33  | Whisper local or API [025]                                               |
| Voice output (TTS)     | 4     | 2      | 2.0   | Edge TTS, Piper, etc. [023]                                              |
| SMS/notifications      | 5     | 3      | 1.67  | Twilio or Pushover                                                       |
| **Smart Home**         |       |        |       |                                                                          |
| Home Assistant         | 7     | 3      | 2.33  | REST API integration [021]                                               |
| Music control          | 5     | 2      | 2.5   | Spotify API                                                              |
| **Intelligence**       |       |        |       |                                                                          |
| LLM delegation         | 5     | 2      | 2.5   | Claude for complex, Gemini for research [019]                            |
| Proactive suggestions  | 10    | 4      | 2.5   | Pattern recognition, context [018]                                       |
| Learning preferences   | 7     | 3      | 2.33  | Expand key facts system [022]                                            |
| Code execution         | 7     | 3      | 2.33  | Sandboxed Python/JS                                                      |
| **Architecture**       |       |        |       |                                                                          |
| Agent + MCP foundation | 8     | 3      | 2.67  | ✅ Done - Agent interface + MCP client pattern [004]                     |
| Conversation persist.  | 9     | 1      | 9.0   | ✅ Done - Save/resume conversations, list history [005]                  |
| Obsidian Rich Linking  | 7     | 2      | 3.5   | ✅ Done - Wikilinks, backlinks, knowledge graph [006]                    |
| Obsidian MCP migration | 6     | 2      | 3.0   | Move logging to external MCP server [024]                                |
| Multi-step planning    | 8     | 3      | 2.67  | Single-agent ReAct loops, task breakdown [017]                           |
| Multi-agent system     | 8     | 4      | 2.0   | Orchestrator + specialized agents                                        |
| Service communication  | 7     | 3      | 2.33  | HTTP REST + Redis pub/sub                                                |

---

## Recommended Build Order

*Architecture first, then capabilities by Score (Value/Effort ratio). Feature IDs link to specs in `docs/features/`.*

### Phase 0: Architecture Foundation

1. **[004] Agent + MCP foundation** ✅ - Agent interface + MCP client pattern
2. **[005] Conversation Persistence** ✅ - Save and resume conversations across sessions
3. **[006] Obsidian Rich Linking** ✅ - Wikilinks, backlinks, and knowledge graph for daily logs
4. **[007] File System Agent** (4.0) - Unified file expert: content search (Windows Index + WSL), CRUD, watch mode, compound ops like "find and organize"

*Reasoning: Multi-step workflows arise naturally once multiple agents exist. File System Agent is the first real agent implementation and handles all local file operations in one place.*

### Phase 1: Quick Wins (Score 5.0+)

5. **[008] Wikipedia lookup** (5.0) - Simple knowledge queries
6. **[009] Reclaim.ai integration** (5.0) - Tasks + calendar in one

### Phase 2: Core Tools (Score 4.0-4.5)

7. **[010] Shell commands** (4.5) - With approval flow
8. **[011] Gmail (personal)** (4.0) - Personal email, MCP server ready
9. **[012] Web search + page reading** (4.0) - External knowledge
10. **[013] Notion integration** (4.0) - Access project notes
11. **[014] Reminders/alarms** (4.0) - Time-based triggers

### Phase 3: System & Email (Score 3.0-3.5)

12. **[015] Outlook (work)** (3.5) - Work email, MCP server ready
13. **[016] Clipboard access** (3.0) - WSL→Windows bridge

### Phase 4: Intelligence (Score 2.67)

14. **[017] Multi-step planning** (2.67) - Single-agent ReAct loops within domain, task breakdown

### Phase 5: Advanced Capabilities (Score ≤ 2.5)

15. **[018] Proactive suggestions** (2.5) - "You have a meeting in 30min"
16. **[019] LLM delegation** (2.5) - Claude for complex, Gemini for research
17. **[020] RAG over local files** (2.25) - Internal knowledge base
18. **[021] Home Assistant** (2.33) - Smart home control
19. **[022] Learning preferences** (2.33) - Personalization
20. **[023] Voice output (TTS)** (2.0) - Spoken responses
21. **[024] Obsidian MCP migration** - Move logging to external MCP server
22. **[025] Voice input (STT)** (1.33) - Hands-free queries

---

## Quick Wins (Low effort, decent value)

- Wikipedia lookup (Effort: 1)
- Current weather (Effort: 1)
- System info (Effort: 1)

---

## Architecture Vision

### Current (Monolith)

```
CLI → Session → Ollama
         ↓
    Tool Registry → Tools (all in-process)
```

### Future (Multi-Agent Microservices)

```
                    ┌─────────────────┐
                    │  Orchestrator   │
                    │    (DIANA)      │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  Web Agent    │  │ Productivity  │  │ File System   │
│ (search/fetch)│  │    Agent      │  │    Agent      │
└───────────────┘  │ (Reclaim.ai)  │  │(search/CRUD)  │
                   └───────────────┘  └───────────────┘
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ Voice Agent   │  │ Memory Agent  │  │  Home Agent   │
│  (STT/TTS)    │  │  (RAG/facts)  │  │(Home Assistant)│
└───────────────┘  └───────────────┘  └───────────────┘
```

### Architecture Decisions

1. **Communication**: HTTP REST for sync calls + Redis pub/sub for events

   - Most agent calls are request/response → REST
   - Events (file changes, reminders, proactive alerts) → pub/sub
   - Redis is lightweight, local-friendly, handles caching too
1. **Runtime**: In-process modules, designed for separation

   - Start with everything in one process
   - Each agent is a module with clean interface
   - Agents communicate through orchestrator, not directly
   - Extract to separate process when pain hits (crashy, slow, resource-heavy)
1. **When**: Design now, implement incrementally

   - Define Agent interface now
   - Structure new features as agent modules
   - Build orchestrator routing logic
   - Defer process separation until needed
1. **Tool Interface**: MCP servers where possible

   - Use Model Context Protocol for standardized tool exposure
   - Enables tool reuse across different LLM applications
   - Each agent can expose its capabilities as MCP server
   - Leverage existing MCP ecosystem (filesystem, git, etc.)

### Routing and Execution Flow

When a query arrives, the orchestrator performs a **routing step** before execution. Routing context contains lightweight agent summaries derived from manifests—not full tool definitions. This keeps token usage minimal regardless of how many agents or tools exist in the system.

```
User Query
    │
    ▼
┌─────────────────────────────────────────┐
│           Routing Step                  │
│  (agent summaries from manifests only)  │
└────────────────┬────────────────────────┘
                 │
                 ▼
         Selected Agent
                 │
                 ▼
┌─────────────────────────────────────────┐
│          Execution Step                 │
│   (load full tool set for this agent)   │
└─────────────────────────────────────────┘
```

The LLM never sees all tools from all agents simultaneously. This prevents context bloat and keeps routing decisions fast and focused.

### Task Breakdown Agent

For complex queries that span agent boundaries (like "update firmware on all non-compliant devices"), the orchestrator invokes **planning logic** to decompose the request into discrete steps. Each step routes to a single agent.

The Task Breakdown Agent (or planning logic within the orchestrator) produces a structured plan:

1. **Decomposition**: Break query into single-agent steps
2. **Read Phase**: Execute read operations to gather context
3. **Approval Gate**: Pause for user approval with full context
4. **Write Phase**: Execute write operations only after approval

```
Complex Query: "Update firmware on non-compliant devices"
    │
    ▼
┌─────────────────────────────────────────┐
│         Task Breakdown Agent            │
└────────────────┬────────────────────────┘
                 │
                 ▼
    Step 1: [System Agent] List all devices
    Step 2: [System Agent] Check compliance status
    Step 3: [System Agent] Identify non-compliant  ← Read phase ends
    ─────────────────────────────────────────────
    >>> APPROVAL GATE: "Found 3 devices. Proceed?"
    ─────────────────────────────────────────────
    Step 4: [System Agent] Update device A firmware  ← Write phase
    Step 5: [System Agent] Update device B firmware
    Step 6: [System Agent] Update device C firmware
```

This agent sits alongside the orchestrator conceptually—it's the "how do we break this down" brain before routing happens. It ensures users approve with full knowledge of what will be affected.

### Multi-Model Future

The architecture assumes all agents initially use the same generalist LLM (`qwen3:30b-a3b`). However, each agent encapsulates its own LLM client, allowing future specialization.

**Evolution path**:

1. **Baseline**: All agents use the generalist model
2. **Instrumentation**: Track per-agent tool selection accuracy and parameter formatting
3. **Identification**: Agents with inconsistent results become candidates for specialist models
4. **Specialization**: Swap in fine-tuned models for specific agents

The manifest's optional `modelRequirements` field supports this evolution without architectural changes. The orchestrator and other agents don't know or care which model powers a given agent—model selection is an agent implementation detail.