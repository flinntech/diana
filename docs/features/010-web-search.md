# 010: Web Search + Page Reading

**Phase**: 2 (Core Tools)
**Score**: 4.0
**Value**: 8 | **Effort**: 2

## Overview

Add web search capability and ability to read/extract content from web pages. External knowledge access for DIANA.

## Dependencies

- 004-agent-mcp-foundation (recommended)

## Enables

- Answer questions requiring current information
- Research topics beyond training data
- Fact-checking with sources
- Documentation lookup

---

## speckit.specify Prompt

```
Web Search and Page Reading for DIANA

Add external knowledge access via web:

1. Web Search
   - Search query submission
   - Parse search results (title, snippet, URL)
   - Return top N results
   - Support for search filters (site:, date range)

2. Page Reading
   - Fetch web page content
   - Extract readable text (remove nav, ads, etc.)
   - Handle different content types
   - Respect robots.txt

3. Tool Interface
   - web_search: Search query, return results
   - web_read: Fetch and extract page content
   - web_search_and_read: Combined for convenience

4. Content Processing
   - Use Readability.js or similar for extraction
   - Truncate long content with summary
   - Extract metadata (title, author, date)
   - Handle paywalls gracefully (report, don't bypass)

Constraints:
- Local-first: Consider local search API (SearXNG) as option
- Cache recent searches/pages
- Respect rate limits
- User-agent identification
- No credential storage for paid sources
```

---

## speckit.plan Prompt

```
Create implementation plan for Web Search + Page Reading

Technical context:
- Language: TypeScript 5.9+ with Node.js 18+
- Options: SerpAPI, SearXNG (local), DuckDuckGo
- Content extraction: @mozilla/readability, cheerio
- Existing: Tool registry pattern

Research needed:
- SerpAPI vs SearXNG vs other search options
- Readability.js usage in Node.js
- Rate limiting and caching strategies
- robots.txt parsing

Key deliverables:
1. src/agents/web/search.ts - Search implementation
2. src/agents/web/reader.ts - Page content extraction
3. src/agents/web/tools.ts - Tool definitions
4. Caching layer for recent content
5. Tests with mocked responses
```
