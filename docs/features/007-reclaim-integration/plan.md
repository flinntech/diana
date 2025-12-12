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
