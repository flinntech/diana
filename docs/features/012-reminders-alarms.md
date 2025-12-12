# 012: Reminders & Alarms

**Phase**: 2 (Core Tools)
**Score**: 4.0
**Value**: 8 | **Effort**: 2

## Overview

Time-based triggers for reminders and alarms. Let DIANA proactively notify users about scheduled events.

## Dependencies

- 004-agent-mcp-foundation (recommended)

## Enables

- "Remind me in 30 minutes"
- "Wake me up at 7am"
- Scheduled task notifications
- Future proactive suggestions

---

## speckit.specify Prompt

```
Reminders and Alarms for DIANA

Add time-based notification capabilities:

1. Reminder Types
   - One-time reminders ("in 30 minutes", "at 3pm", "tomorrow at 9am")
   - Recurring reminders ("every day at 9am", "every Monday")
   - Contextual reminders ("when I get home" - future, needs location)

2. Alarm Features
   - System notifications (desktop)
   - Sound alerts (optional)
   - Snooze functionality
   - Dismiss/acknowledge

3. Persistence
   - Reminders survive DIANA restart
   - Store in local JSON/SQLite
   - Sync status to Obsidian log

4. Tool Interface
   - reminder_create: Set a new reminder
   - reminder_list: View pending reminders
   - reminder_cancel: Remove a reminder
   - reminder_snooze: Delay a triggered reminder

5. Notification Delivery
   - Desktop notifications (node-notifier or similar)
   - Log to Obsidian when triggered
   - Optional: WSL → Windows notification bridge

Constraints:
- Local-first: No cloud push services
- Persist across restarts
- Efficient: Don't poll, use scheduling (node-cron)
- Handle timezone correctly
```

---

## speckit.plan Prompt

```
Create implementation plan for Reminders & Alarms

Technical context:
- Language: TypeScript 5.9+ with Node.js 18+
- Scheduling: node-cron for time-based triggers
- Notifications: node-notifier for desktop alerts
- Storage: JSON file or SQLite for persistence
- Environment: WSL with Windows host

Research needed:
- node-cron usage patterns
- node-notifier in WSL environment
- WSL → Windows notification options
- Natural language time parsing (chrono-node?)

Key deliverables:
1. src/agents/reminders/index.ts - Agent implementation
2. src/agents/reminders/scheduler.ts - Cron-based scheduling
3. src/agents/reminders/storage.ts - Persistence layer
4. src/agents/reminders/notifier.ts - Notification delivery
5. Natural language time parsing
6. Tests for scheduling and persistence
```
