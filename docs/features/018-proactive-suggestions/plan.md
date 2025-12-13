Create implementation plan for Proactive Suggestions

Technical context:
- Language: TypeScript 5.9+ with Node.js 18+
- Depends on: Calendar, tasks, reminders, file access
- Storage: Pattern data in local store
- Notifications: Reuse reminder infrastructure

Research needed:
- Pattern recognition approaches
- Calendar event pre-processing
- Non-intrusive notification UX
- User preference learning

Key deliverables:
1. src/agents/proactive/index.ts - Main suggestion engine
2. src/agents/proactive/triggers.ts - Trigger detection
3. src/agents/proactive/patterns.ts - Pattern analysis
4. src/agents/proactive/suggestions.ts - Suggestion generation
5. Configuration for suggestion preferences
6. Tests for trigger detection and suggestion quality
