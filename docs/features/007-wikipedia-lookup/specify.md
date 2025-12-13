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
