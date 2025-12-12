# 017: LLM Delegation (Claude & Gemini)

**Phase**: 5 (Advanced Capabilities)
**Score**: 2.5
**Value**: 5 | **Effort**: 2

## Overview

Give DIANA the ability to recognize when tasks exceed her local model's capabilities and delegate to more powerful cloud LLMs. Claude for complex reasoning/coding tasks, Gemini for research with its large context window.

## Dependencies

- 004-agent-mcp-foundation (recommended)

## Enables

- Complex reasoning beyond 30b model capability
- Long-form research and analysis
- Code generation for difficult tasks
- Fact-checking with more capable models
- Best-of-both: local privacy for simple tasks, cloud power when needed

---

## speckit.specify Prompt

```
LLM Delegation for DIANA

Enable DIANA to delegate to cloud LLMs for complex tasks:

1. Delegation Triggers
   - Explicit user request ("ask Claude about this")
   - Self-recognized complexity (DIANA decides she needs help)
   - Task type routing (research → Gemini, coding → Claude)
   - Configurable automatic delegation threshold

2. Cloud LLM Options
   - Claude (Anthropic): Complex reasoning, coding, analysis
   - Gemini (Google): Research with large context, web grounding
   - Configurable: Which models available, preferences

3. Tool Interface
   - llm_ask_claude: Send query to Claude API
   - llm_ask_gemini: Send query to Gemini API
   - llm_delegate: Auto-route based on task type
   - llm_research: Extended research session with Gemini

4. Context Handling
   - Pass relevant conversation context to cloud LLM
   - Summarize long contexts before sending
   - Bring response back into DIANA's conversation
   - Attribute responses ("Claude says...")

5. Cost & Privacy Controls
   - User approval before cloud API calls (configurable)
   - Cost tracking/limits
   - Sensitive data filtering option
   - Clear indication when using cloud vs local

Constraints:
- Explicit user consent for cloud usage (first time or per-session)
- Never send sensitive data without warning
- Cost awareness: Show estimated cost before expensive queries
- Graceful fallback if APIs unavailable
- API keys stored securely in config
```

---

## speckit.plan Prompt

```
Create implementation plan for LLM Delegation

Technical context:
- Language: TypeScript 5.9+ with Node.js 18+
- Claude API: @anthropic-ai/sdk
- Gemini API: @google/generative-ai
- Existing: Conversation management, tool registry

Research needed:
- Claude API best practices and pricing
- Gemini API capabilities (especially grounding/search)
- Context window management strategies
- Cost estimation approaches

Key deliverables:
1. src/agents/llm-delegate/index.ts - Delegation agent
2. src/agents/llm-delegate/claude.ts - Claude API client
3. src/agents/llm-delegate/gemini.ts - Gemini API client
4. src/agents/llm-delegate/router.ts - Task type routing logic
5. src/agents/llm-delegate/tools.ts - Tool definitions
6. Config additions for API keys and preferences
7. Cost tracking and limits
8. Tests with mocked API responses
```
