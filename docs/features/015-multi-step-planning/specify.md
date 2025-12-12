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
