# 015: Multi-Step Planning

**Phase**: 4 (Intelligence)
**Score**: 2.67
**Value**: 8 | **Effort**: 3

## Overview

Enable DIANA to break down complex tasks into steps and execute them with ReAct-style reasoning. Agent loops for sophisticated task handling.

## Dependencies

- 004-agent-mcp-foundation
- Multiple tools available (search, files, etc.)

## Enables

- Complex multi-step tasks
- Reasoning about tool selection
- Self-correction on failures
- More capable assistant behavior

---

## speckit.specify Prompt

```
Multi-Step Planning for DIANA

Add ReAct-style reasoning and planning:

1. Planning Capabilities
   - Break complex requests into steps
   - Identify required tools for each step
   - Handle dependencies between steps
   - Revise plan based on intermediate results

2. Execution Loop
   - Think → Act → Observe cycle
   - Tool selection based on current state
   - Error handling and retry logic
   - Know when to ask for clarification

3. Reasoning Transparency
   - Show thinking process to user
   - Explain tool choices
   - Log reasoning to Obsidian

4. Safeguards
   - Maximum iteration limit
   - Human checkpoint for destructive actions
   - Ability to interrupt/cancel plan
   - Cost awareness (LLM calls)

Constraints:
- Human-in-the-loop for destructive steps
- Transparent reasoning (no black box)
- Bounded iterations to prevent runaway
- Efficient: Don't over-plan simple tasks
```

---

## speckit.plan Prompt

```
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
```
