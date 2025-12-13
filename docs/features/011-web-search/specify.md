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
