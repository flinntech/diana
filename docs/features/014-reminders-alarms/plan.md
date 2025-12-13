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
