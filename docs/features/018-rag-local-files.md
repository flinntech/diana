# 018: RAG Over Local Files

**Phase**: 5 (Advanced Capabilities)
**Score**: 2.25
**Value**: 9 | **Effort**: 4

## Overview

Retrieval-Augmented Generation over local files. Let DIANA search and reference your documents for informed responses.

## Dependencies

- 004-agent-mcp-foundation
- ChromaDB (already in stack, needs integration)

## Enables

- "What did the meeting notes say about X?"
- "Find that email about the project deadline"
- Context-aware responses from your files
- Personal knowledge base queries

---

## speckit.specify Prompt

```
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
```

---

## speckit.plan Prompt

```
Create implementation plan for RAG Over Local Files

Technical context:
- Language: TypeScript 5.9+ with Node.js 18+
- Vector DB: ChromaDB (already in dependencies)
- Embeddings: sentence-transformers or similar local model
- File watching: chokidar (already used)

Research needed:
- ChromaDB TypeScript SDK usage
- Local embedding model options for Node.js
- Chunking strategies for different file types
- Hybrid search implementation

Key deliverables:
1. src/agents/memory/indexer.ts - Document indexing
2. src/agents/memory/embeddings.ts - Local embedding generation
3. src/agents/memory/retrieval.ts - Search and retrieval
4. src/agents/memory/tools.ts - Tool definitions
5. ChromaDB collection management
6. Tests for indexing and retrieval accuracy
```
