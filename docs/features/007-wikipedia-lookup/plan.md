Create implementation plan for Wikipedia Lookup

Technical context:
- Language: TypeScript 5.9+ with Node.js 18+
- Wikipedia API: https://en.wikipedia.org/api/rest_v1/
- Existing: Tool registry pattern for registration

Research needed:
- Wikipedia REST API endpoints and response format
- Rate limiting considerations
- Best practices for extracting summaries

Key deliverables:
1. src/agent/tools/wikipedia.ts - Tool implementation
2. Simple in-memory cache for recent lookups
3. Tests for search, summary, and error cases
4. Tool descriptions for LLM understanding
