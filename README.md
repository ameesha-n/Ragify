# Ragify
# Ragify

Turn static documents into intelligent conversations.

## Overview

Ragify is an AI-powered Retrieval-Augmented Generation (RAG) platform that allows users to upload PDF documents and interact with them through natural language conversations.

The system extracts text from PDFs, generates semantic embeddings, stores them in a vector database, retrieves relevant context, and generates intelligent responses using Large Language Models.

---

## Features

- Upload and process PDF documents
- Semantic document search using embeddings
- AI-powered contextual question answering
- Retrieval-Augmented Generation (RAG)
- FastAPI backend architecture
- ChromaDB vector storage
- SentenceTransformer embeddings
- Modern scalable AI pipeline

---

## Architecture

```mermaid
graph TD
    A[PDF Upload] --> B[Text Extraction]
    B --> C[Chunking]
    C --> D[Embedding Generation]
    D --> E[ChromaDB Vector Store]

    F[User Query] --> G[Query Embedding]
    G --> H[Similarity Search]
    H --> I[Relevant Context Retrieval]
    I --> J[LLM Response Generation]