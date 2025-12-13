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
