# 007: Reclaim.ai Integration

**Phase**: 1 (Quick Wins)
**Score**: 5.0
**Value**: 10 | **Effort**: 2

## Overview

Integrate with Reclaim.ai for combined task and calendar management. High value for daily productivity - tasks and calendar in one place.

## Dependencies

- 004-agent-mcp-foundation (recommended for agent structure)

## Enables

- Calendar awareness ("What's on my schedule today?")
- Task management ("Add task: review PR")
- Scheduling intelligence ("When am I free this week?")
- Future proactive suggestions

---

## speckit.specify Prompt

```
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
```

---

## speckit.plan Prompt

```
Create implementation plan for Reclaim.ai Integration

Technical context:
- Language: TypeScript 5.9+ with Node.js 18+
- Reclaim API: REST API with API key auth
- Existing: Tool registry, config system

Research needed:
- Reclaim.ai API documentation and endpoints
- Authentication flow
- Rate limits and best practices
- Task vs event data models

Key deliverables:
1. src/agents/reclaim/index.ts - Agent implementation
2. src/agents/reclaim/api.ts - API client wrapper
3. src/agents/reclaim/tools.ts - Tool definitions
4. Config additions for API key
5. Tests with mocked API responses
```
