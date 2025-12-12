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
