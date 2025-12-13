Create implementation plan for Multi-Step Planning

Technical context:
- Language: TypeScript 5.9+ with Node.js 18+
- Pattern: ReAct (Reasoning + Acting)
- Existing: Tool registry, conversation management
- LLM: Ollama with qwen3:30b-a3b

Research needed:
- ReAct pattern implementation details
- LangChain/similar agent loop patterns
- Prompt engineering for planning
- Iteration limits and escape conditions

Key deliverables:
1. src/agent/planner.ts - Plan generation and management
2. src/agent/executor.ts - ReAct execution loop
3. Updated conversation handling for multi-turn planning
4. Prompts for planning and reflection
5. Tests for planning and execution scenarios
