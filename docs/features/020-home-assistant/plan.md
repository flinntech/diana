Create implementation plan for Home Assistant Integration

Technical context:
- Language: TypeScript 5.9+ with Node.js 18+
- HA API: REST API with long-lived access token
- Existing: Config system, agent pattern

Research needed:
- Home Assistant REST API documentation
- Entity domain types and capabilities
- Service call patterns
- WebSocket API for real-time (optional)

Key deliverables:
1. src/agents/home/index.ts - Agent implementation
2. src/agents/home/api.ts - HA REST API client
3. src/agents/home/entities.ts - Entity management
4. src/agents/home/tools.ts - Tool definitions
5. Config additions for HA URL and token
6. Tests with mocked HA responses
