# 006: Wikipedia Lookup

**Phase**: 1 (Quick Wins)
**Score**: 5.0
**Value**: 5 | **Effort**: 1

## Overview

Add Wikipedia lookup capability for quick knowledge queries. Simple API integration, minimal effort for decent value.

## Dependencies

- 004-agent-mcp-foundation (optional, can be standalone tool)

## Enables

- Quick fact-checking during conversations
- Knowledge queries without web search

---

## speckit.specify Prompt

```
Wikipedia Lookup Tool for DIANA

Add ability to query Wikipedia for information:

1. Core Functionality
   - Search Wikipedia for articles by query
   - Retrieve article summaries (first paragraph/section)
   - Get full article content when needed
   - Handle disambiguation pages

2. Tool Interface
   - wikipedia_search: Find articles matching a query
   - wikipedia_summary: Get article summary by title
   - wikipedia_content: Get full article sections

3. Integration
   - Register as tool in existing tool registry
   - Optionally structure as agent module for future
   - Cache recent lookups to reduce API calls

4. Error Handling
   - Graceful handling of no results
   - Network failure fallback messaging
   - Rate limiting awareness

Constraints:
- Use Wikipedia REST API (no API key required)
- Local-first: cache results locally
- Keep responses concise for chat context
```

---

## speckit.plan Prompt

```
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
```
