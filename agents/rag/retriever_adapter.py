"""Adapts a persisted FaissIndex to agents/nodes/retriever.py's Retriever
protocol from AI-01, so main_graph.py can swap NullRetriever for this with
no change to graph/node code (per retriever.py's own docstring: "wire it
in via build_retriever_node(real_retriever)").

Scope note (coordinates with AI-03): this is in-process FAISS retrieval —
load the index, embed the query, search, done. AI-03 ("stand up
faiss-service as a standalone microservice") is a separate deployment
concern: wrapping *this same logic* behind a network service boundary so
faiss-service can be its own docker-compose service/container. Not
duplicated here — AI-03 should import and reuse FaissRetriever, not
reimplement retrieval.
"""
from __future__ import annotations

from pathlib import Path

from agents.config import AgentSettings
from agents.embeddings.embedder import Embedder, get_embedder
from agents.rag.faiss_index import FaissIndex
from agents.rag.ingest import REPO_ROOT
from agents.state.graph_state import RetrievedChunk


class FaissRetriever:
    def __init__(self, index: FaissIndex, embedder: Embedder) -> None:
        self._index = index
        self._embedder = embedder

    def retrieve(self, query: str, *, top_k: int = 5) -> list[RetrievedChunk]:
        vector = self._embedder.embed([query])[0]
        results = self._index.search(vector, top_k=top_k)
        return [
            RetrievedChunk(content=meta["content"], source=meta["source"], score=score)
            for score, meta in results
        ]

    @classmethod
    def load(cls, settings: AgentSettings, *, embedder: Embedder | None = None) -> FaissRetriever:
        """Loads the index persisted by `python -m agents.rag.ingest`.
        Raises FileNotFoundError with a clear message if ingestion hasn't
        run yet — callers (AI-04's ai-worker wiring) should catch this and
        fall back to NullRetriever rather than crash the worker, but that
        fallback policy belongs in AI-04, not decided here.

        `embedder` is optional and defaults to get_embedder(settings) —
        added for AI-05 (agents/tests/test_learning_agent.py), matching
        the same injectable-dependency pattern already used throughout
        this codebase (run_graph_for_ticket's graph/backend_client,
        ingest()'s embedder) so tests don't need a real sentence-
        transformers model download."""
        embedder = embedder or get_embedder(settings)
        index_path = REPO_ROOT / settings.FAISS_INDEX_PATH
        metadata_path = REPO_ROOT / settings.FAISS_METADATA_PATH

        if not index_path.exists():
            raise FileNotFoundError(
                f"No FAISS index at {index_path} — run "
                "`python -m agents.rag.ingest` first."
            )

        index = FaissIndex.load(index_path, metadata_path, dim=embedder.dimension)
        return cls(index, embedder)
