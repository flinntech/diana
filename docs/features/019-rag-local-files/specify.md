RAG Over Local Files for DIANA

Implement semantic search and retrieval over local documents:

1. Indexing
   - Watch configured directories for documents
   - Support: markdown, text, PDF, common formats
   - Chunking strategy for long documents
   - Incremental indexing (don't reprocess unchanged)

2. Embedding
   - Local embedding model (all-MiniLM-L6-v2 or similar)
   - Store embeddings in ChromaDB
   - Metadata: file path, modified date, chunk position

3. Retrieval
   - Semantic search by query
   - Hybrid search (semantic + keyword)
   - Source attribution (file + location)
   - Relevance scoring

4. Tool Interface
   - rag_search: Find relevant content
   - rag_index_status: Check indexing progress
   - rag_reindex: Force reindex of path

5. Integration
   - Automatic context injection for relevant queries
   - Citation in responses
   - Link back to source files

Constraints:
- Local-first: Embeddings generated locally
- Efficient: Don't block on indexing
- Privacy: Index stored locally only
- Graceful: Work without ChromaDB (degraded mode)
