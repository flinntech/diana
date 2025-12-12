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

---

## Capability Matrix

| Capability             | Value | Effort | Score | Notes                                    |
| ---------------------- | ----- | ------ | ----- | ---------------------------------------- |
| **Information Access** |       |        |       |                                          |
| Web search             | 8     | 2      | 4.0   | SerpAPI ready, needs page reading        |
| Read web pages         | 8     | 2      | 4.0   | Readability.js, pairs with search        |
| RAG over local files   | 9     | 4      | 2.25  | ChromaDB exists, needs integration       |
| Wikipedia lookup       | 5     | 1      | 5.0   | Simple API, quick win                    |
| **Productivity**       |       |        |       |                                          |
| Reclaim.ai integration | 10    | 2      | 5.0   | Tasks + calendar in one, REST API exists |
| Notion integration     | 8     | 2      | 4.0   | Project notes, MCP server exists         |
| Gmail (personal)       | 8     | 2      | 4.0   | MCP server exists, OAuth2 ready          |
| Outlook (work)         | 7     | 2      | 3.5   | MCP server running locally               |
| Reminders/alarms       | 8     | 2      | 4.0   | node-cron + notifications                |
| **System Control**     |       |        |       |                                          |
| Run shell commands     | 9     | 2      | 4.5   | Powerful but dangerous                   |
| File System Agent      | 7     | 1      | 7.0   | CRUD + watch mode, refactors watcher     |
| App launching          | 5     | 2      | 2.5   | OS-specific                              |
| Clipboard access       | 6     | 2      | 3.0   | WSL→Windows bridge via clip.exe/PS       |
| **Communication**      |       |        |       |                                          |
| Voice input (STT)      | 4     | 3      | 1.33  | Whisper local or API                     |
| Voice output (TTS)     | 4     | 2      | 2.0   | Edge TTS, Piper, etc.                    |
| SMS/notifications      | 5     | 3      | 1.67  | Twilio or Pushover                       |
| **Smart Home**         |       |        |       |                                          |
| Home Assistant         | 7     | 3      | 2.33  | REST API integration                     |
| Music control          | 5     | 2      | 2.5   | Spotify API                              |
| **Intelligence**       |       |        |       |                                          |
| LLM delegation         | 5     | 2      | 2.5   | Claude for complex, Gemini for research  |
| Proactive suggestions  | 10    | 4      | 2.5   | Pattern recognition, context             |
| Learning preferences   | 7     | 3      | 2.33  | Expand key facts system                  |
| Multi-step planning    | 8     | 3      | 2.67  | Agent loops, ReAct pattern               |
| Code execution         | 7     | 3      | 2.33  | Sandboxed Python/JS                      |
| **Architecture**       |       |        |       |                                          |
| Plugin architecture    | 8     | 3      | 2.67  | MCP servers + Agent interface            |
| Multi-agent system     | 8     | 4      | 2.0   | Orchestrator + specialized agents        |
| Service communication  | 7     | 3      | 2.33  | HTTP REST + Redis pub/sub                |

---

## Recommended Build Order

*Architecture first, then capabilities by Score (Value/Effort ratio)*

### Phase 0: Architecture Foundation

1. **Agent + MCP foundation** - Agent interface + MCP client pattern
2. **File System Agent** (7.0) - CRUD + watch mode for organization

### Phase 1: Quick Wins (Score 5.0+)

3. **Wikipedia lookup** (5.0) - Simple knowledge queries
4. **Reclaim.ai integration** (5.0) - Tasks + calendar in one

### Phase 2: Core Tools (Score 4.0-4.5)

5. **Shell commands** (4.5) - With approval flow
6. **Gmail (personal)** (4.0) - Personal email, MCP server ready
7. **Web search + page reading** (4.0) - External knowledge
8. **Notion integration** (4.0) - Access project notes
9. **Reminders/alarms** (4.0) - Time-based triggers

### Phase 3: System & Email (Score 3.0-3.5)

10. **Outlook (work)** (3.5) - Work email, MCP server ready
11. **Clipboard access** (3.0) - WSL→Windows bridge

### Phase 4: Intelligence (Score 2.67)

12. **Multi-step planning** (2.67) - Agent loops, ReAct

### Phase 5: Advanced Capabilities (Score ≤ 2.5)

13. **Proactive suggestions** (2.5) - "You have a meeting in 30min"
14. **LLM delegation** (2.5) - Claude for complex, Gemini for research
15. **RAG over local files** (2.25) - Internal knowledge base
16. **Home Assistant** (2.33) - Smart home control
17. **Learning preferences** (2.33) - Personalization
18. **Voice output (TTS)** (2.0) - Spoken responses
19. **Obsidian MCP migration** - Move logging to external MCP server
20. **Voice input (STT)** (1.33) - Hands-free queries

---

## Quick Wins (Low effort, decent value)

- File System Agent (Effort: 1) - watcher refactored + CRUD
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
│  Web Agent    │  │ Productivity  │  │ System Agent  │
│ (search/fetch)│  │    Agent      │  │ (shell/files) │
└───────────────┘  │ (Reclaim.ai)  │  └───────────────┘
                   └───────────────┘
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