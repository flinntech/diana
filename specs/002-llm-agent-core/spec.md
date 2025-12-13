# Feature Specification: LLM Agent Core - DIANA's Brain

**Feature Branch**: `002-llm-agent-core`
**Created**: 2025-12-10
**Status**: Implemented
**Input**: User description: "DIANA Core - LLM Agent Foundation: Central LLM interface with identity, conversation ability, and tool-use capability. All future features are tools DIANA gains access to."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Interactive Conversation (Priority: P1)

As Josh, I want to have a conversation with DIANA so I can ask questions, give instructions, and interact naturally.

**Why this priority**: This is the foundational capability - without conversation, DIANA cannot function as an assistant. Everything else builds on being able to communicate with her.

**Independent Test**: Can be fully tested by starting the chat interface, sending a message to DIANA, and receiving a coherent response that demonstrates understanding of the query.

**Acceptance Scenarios**:

1. **Given** DIANA is running and Ollama is available, **When** Josh types `diana chat`, **Then** an interactive chat session starts with a welcome message
2. **Given** Josh is in a chat session, **When** he types a question, **Then** DIANA responds with relevant, contextual information
3. **Given** Josh sends a message, **When** DIANA processes it, **Then** the response streams to the terminal character-by-character for a natural feel
4. **Given** a chat session is active, **When** Josh types `/exit` or presses Ctrl+C, **Then** the session ends gracefully with a farewell message

---

### User Story 2 - One-Shot Queries (Priority: P1)

As Josh, I want to ask DIANA a quick question without entering a full chat session so I can get fast answers for simple queries.

**Why this priority**: Equal to interactive chat - provides a complementary quick interaction mode essential for command-line workflows.

**Independent Test**: Can be fully tested by running `diana ask "What time is it?"` and verifying a relevant response is returned and the process exits.

**Acceptance Scenarios**:

1. **Given** DIANA is running, **When** Josh runs `diana ask "What files did I work on today?"`, **Then** DIANA responds directly in the terminal and exits
2. **Given** a one-shot query is made, **When** DIANA responds, **Then** the conversation is logged to the daily notes but no session state is preserved
3. **Given** Ollama is unavailable, **When** Josh runs a one-shot query, **Then** DIANA displays a clear error message explaining the LLM is not accessible

---

### User Story 3 - Consistent Identity (Priority: P1)

As DIANA, I need a persistent identity defined by my system prompt so I behave consistently as Josh's local AI assistant across all interactions.

**Why this priority**: Identity is core to the user experience - DIANA must be recognizable and consistent, not a generic chatbot.

**Independent Test**: Can be fully tested by starting multiple chat sessions and verifying DIANA consistently refers to herself by name, follows her principles, and maintains her personality.

**Acceptance Scenarios**:

1. **Given** DIANA starts, **When** she loads her system prompt, **Then** her identity, principles, and personality are established before any conversation
2. **Given** Josh asks "Who are you?", **When** DIANA responds, **Then** she identifies herself by name and explains her role as Josh's local AI assistant
3. **Given** the system prompt references the constitution, **When** DIANA makes decisions, **Then** she follows the principles (local-first, human-in-the-loop, transparency)
4. **Given** DIANA has tools available, **When** she loads her system prompt, **Then** the prompt includes descriptions of her current capabilities

---

### User Story 4 - Tool Calling (Priority: P2)

As DIANA, I need to call tools to take actions so I can do things beyond just chatting, like writing notes, watching files, and executing tasks.

**Why this priority**: Tools transform DIANA from a chatbot into a capable assistant. Without tools, she can only talk; with tools, she can act.

**Independent Test**: Can be fully tested by asking DIANA to write a note, then verifying the ObsidianWriter tool was called and a note was created in the vault.

**Acceptance Scenarios**:

1. **Given** DIANA has the ObsidianWriter tool registered, **When** Josh asks her to "make a note about our conversation", **Then** she calls the tool and confirms the note was written
2. **Given** a tool call is requested, **When** DIANA executes it, **Then** the result is returned and incorporated into her response
3. **Given** a tool call fails, **When** DIANA receives the error, **Then** she explains the failure to Josh and suggests alternatives
4. **Given** multiple tools are available, **When** a request could use different tools, **Then** DIANA selects the most appropriate one based on context
5. **Given** a tool has required parameters, **When** Josh's request is missing information, **Then** DIANA asks for the missing details before calling the tool

---

### User Story 5 - Session Memory (Priority: P2)

As DIANA, I need conversation memory within a session so I maintain context during our interaction.

**Why this priority**: Context is what makes conversation feel natural. Without memory, each message would be isolated and DIANA couldn't follow multi-turn discussions.

**Independent Test**: Can be fully tested by having a multi-turn conversation where later messages reference earlier ones, and verifying DIANA correctly recalls the context.

**Acceptance Scenarios**:

1. **Given** Josh mentions "the file I mentioned earlier" in a conversation, **When** DIANA processes this, **Then** she correctly recalls the file from earlier in the session
2. **Given** a long conversation, **When** the context approaches the model's limit, **Then** older messages are summarized to make room for new ones
3. **Given** DIANA uses a tool during conversation, **When** the tool returns a result, **Then** that result becomes part of the conversation context
4. **Given** Josh starts a new chat session, **When** it begins, **Then** previous session context is not automatically loaded (sessions are independent)

---

### User Story 6 - Cross-Session Memory (Priority: P3)

As Josh, I want DIANA to remember key facts across sessions so she knows my preferences and history over time.

**Why this priority**: Important for long-term relationship but not required for basic functionality. The system works without it initially.

**Independent Test**: Can be fully tested by telling DIANA a preference, ending the session, starting a new one, and verifying she remembers the preference.

**Acceptance Scenarios**:

1. **Given** Josh tells DIANA "I prefer dark mode in all my apps", **When** he starts a new session later, **Then** DIANA remembers this preference
2. **Given** key facts are stored, **When** DIANA loads for a new session, **Then** relevant facts are included in her context
3. **Given** a stored fact becomes outdated, **When** Josh corrects it, **Then** DIANA updates her persistent memory
4. **Given** many facts accumulate over time, **When** loading context, **Then** tagged facts are always included plus the most recent untagged facts (semantic similarity deferred to future)

---

### Edge Cases

- What happens when Ollama is not running? DIANA MUST NOT start; displays clear error message directing user to start Ollama
- What happens when the model is not loaded in Ollama? DIANA displays error with model name and instructions to run `ollama pull qwen3:30b-a3b`. Auto-pull is deferred to future enhancement.
- What happens during a network timeout to Ollama? Retry with exponential backoff (3 attempts), then inform user
- What happens if conversation exceeds context window? Older messages are summarized and compressed to make room
- What happens when a tool returns malformed data? DIANA logs the error and informs Josh the tool had an issue
- What happens if system prompt file is missing? DIANA refuses to start; prompts user to create the system prompt file
- What happens during graceful shutdown mid-conversation? Current session state is saved before exit
- What happens if multiple chat sessions run simultaneously? Each session operates independently with isolated memory (no cross-talk)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST connect to Ollama at `localhost:11434` for all LLM operations
- **FR-002**: System MUST use the `qwen3:30b-a3b` model for chat completions
- **FR-003**: System MUST load DIANA's identity from a system prompt file before any conversation
- **FR-004**: System MUST provide streaming responses for natural conversation flow
- **FR-005**: System MUST maintain message history for context during active sessions
- **FR-006**: System MUST implement tool calling using Ollama's function calling format
- **FR-007**: System MUST register tools with name, description, and parameter schema
- **FR-008**: System MUST return tool execution results back to the conversation
- **FR-009**: System MUST provide `diana chat` command for interactive conversations
- **FR-010**: System MUST provide `diana ask "<query>"` command for one-shot queries
- **FR-011**: System MUST perform health checks on Ollama before starting conversations
- **FR-012**: System MUST refuse to start if Ollama is unavailable (no silent fallback for core functionality)
- **FR-013**: System MUST log all conversations to Obsidian daily notes via ObsidianWriter
- **FR-014**: System MUST support graceful shutdown with session state preservation
- **FR-015**: System MUST handle context window limits by using an LLM call to summarize older messages into a compressed context when token estimate exceeds 80% of the model's context window (approximately 26,000 tokens for qwen3:30b-a3b's 32k window)
- **FR-016**: System MUST register ObsidianWriter (from 001-obsidian-integration) as DIANA's first tool
- **FR-017**: System MUST persist key user facts across sessions in Obsidian notes (e.g., `/memory/facts.md`) for human-readable long-term memory
- **FR-018**: System MUST include available tool descriptions in the system prompt
- **FR-019**: System SHOULD provide `diana status` command for health checks (Ollama connection, model availability, vault access, system prompt status)

### Key Entities

- **Message**: A single unit of conversation - either from Josh (user), DIANA (assistant), or a tool result. Contains role, content, and optional tool call data.
- **Conversation**: An ordered sequence of messages forming a dialogue. Has a session ID, start time, and maintains context state.
- **Tool**: A capability DIANA can invoke. Has a name, description, parameter schema, and execute function.
- **System Prompt**: DIANA's identity document defining who she is, her principles, available tools, and personality.
- **Session**: A single interactive chat from start to exit. Contains the conversation and temporary state.
- **Key Fact**: A persistent piece of information about Josh or his preferences that survives across sessions. Can be tagged as "important" for guaranteed inclusion in context.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can start a chat session and receive the first response within 3 seconds of typing
- **SC-002**: Conversations maintain correct context for at least 20 turns without degradation
- **SC-003**: DIANA successfully calls tools on 95% of requests where the user explicitly names a tool action (e.g., "write a note", "log this", "save to daily notes")
- **SC-004**: System correctly refuses to start when Ollama is unavailable 100% of the time
- **SC-005**: Streaming responses begin within 500ms of sending a message
- **SC-006**: All conversations are logged to Obsidian within 5 seconds of session end
- **SC-007**: DIANA correctly recalls key facts from previous sessions 90% of the time
- **SC-008**: Context window management allows conversations of 50+ turns without failure
- **SC-009**: Tool call failures are communicated to the user within 2 seconds with actionable information
- **SC-010**: Graceful shutdown preserves session state within 1 second of signal receipt

## Clarifications

### Session 2025-12-10

- Q: Where should cross-session key facts be stored? → A: Obsidian notes (markdown files in vault, e.g., `/memory/facts.md`)
- Q: How should DIANA determine which facts are relevant for context? → A: Hybrid of manual tagging + recency (tagged facts always included, then most recent); semantic similarity deferred to future enhancement
- Q: What happens if Josh runs multiple `diana chat` sessions simultaneously? → A: Allow multiple sessions with isolated memory (no cross-talk between concurrent sessions)
- Q: How should context window summarization work? → A: DIANA summarizes via LLM call (ask Ollama to compress old context into a summary)
- Q: Does FR-012 (refuse to start without Ollama) conflict with Constitution Principle VI (Graceful Degradation)? → A: No. Principle VI applies to features that can meaningfully degrade. The LLM agent's core purpose IS conversation—without Ollama, there is no meaningful fallback. Fail-fast is appropriate per plan.md rationale: "Fallback to basic responses would violate user expectations of AI assistant." The `diana status` command remains functional for diagnostics.

## Assumptions

- Ollama is installed and running on localhost:11434
- The qwen3:30b-a3b model is available in Ollama (or can be pulled)
- Ollama supports tool/function calling in its API (native or via chat format)
- The ObsidianWriter from 001-obsidian-integration is implemented and available
- Josh has terminal access to run CLI commands
- The system has sufficient memory to run the LLM model
- Network latency to local Ollama is negligible (<10ms)

## Dependencies

- **001-obsidian-integration**: ObsidianWriter tool for logging conversations and notes
- Ollama running locally with qwen3:30b-a3b model
- File system access for system prompt and configuration files
- Terminal/TTY for CLI interface

## Out of Scope

- Voice input/output (text-only interface)
- Multi-user support (single user: Josh)
- Remote/cloud LLM providers
- GUI or web interface
- Training or fine-tuning the model
- Real-time collaboration with other assistants
- Automated task scheduling (future feature)
- File watching and organization (future feature - separate tools)
