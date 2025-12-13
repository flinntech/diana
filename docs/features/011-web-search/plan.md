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
