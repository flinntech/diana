Reclaim.ai Integration for DIANA

Integrate with Reclaim.ai REST API for productivity management:

1. Calendar Features
   - View today's schedule
   - View upcoming events (day/week)
   - Check availability for time ranges
   - View scheduled tasks

2. Task Features
   - List tasks (filtered by status, priority)
   - Create new tasks with duration estimates
   - Mark tasks complete
   - Reschedule tasks

3. Tool Interface
   - reclaim_schedule: Get calendar for date range
   - reclaim_availability: Find free time slots
   - reclaim_tasks: List/filter tasks
   - reclaim_create_task: Add new task
   - reclaim_complete_task: Mark task done

4. Authentication
   - Store API key in config
   - Secure credential handling
   - Token refresh if needed

Constraints:
- API key stored locally, never logged
- Human-in-the-loop for task modifications
- Cache calendar data briefly to reduce API calls
- Handle API rate limits gracefully
