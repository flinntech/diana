# 016: Proactive Suggestions

**Phase**: 5 (Advanced Capabilities)
**Score**: 2.5
**Value**: 10 | **Effort**: 4

## Overview

Enable DIANA to proactively offer suggestions based on context, patterns, and upcoming events. The "true assistant" experience.

## Dependencies

- 004-agent-mcp-foundation
- 007-reclaim-integration (calendar awareness)
- 011-reminders-alarms (notification infrastructure)
- 017-rag-local-files (context from files)

## Enables

- "You have a meeting in 30 minutes"
- "Based on your calendar, you might want to prepare..."
- Pattern-based suggestions
- Anticipatory assistance

---

## speckit.specify Prompt

```
Proactive Suggestions for DIANA

Enable anticipatory, context-aware suggestions:

1. Trigger Types
   - Time-based: Upcoming calendar events, deadlines
   - Pattern-based: "You usually do X at this time"
   - Context-based: Current task + relevant information
   - Event-based: File changes, system events

2. Suggestion Categories
   - Calendar reminders: "Meeting with X in 30 min"
   - Task nudges: "You have 3 overdue tasks"
   - Context links: "Here's the doc for your upcoming meeting"
   - Workflow suggestions: "Want me to prepare the standup notes?"

3. Delivery
   - Non-intrusive notifications
   - Configurable frequency/intensity
   - Easy dismiss/snooze
   - Learn from dismissals (optional)

4. Intelligence
   - Pattern recognition from user behavior
   - Calendar + task correlation
   - File access patterns
   - Time-of-day preferences

Constraints:
- Non-annoying: Quality over quantity
- User control: Easy to disable/configure
- Privacy: All pattern analysis local
- Transparent: Explain why suggesting
```

---

## speckit.plan Prompt

```
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
```
