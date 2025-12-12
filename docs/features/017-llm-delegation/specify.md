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
