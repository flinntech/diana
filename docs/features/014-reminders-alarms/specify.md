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
