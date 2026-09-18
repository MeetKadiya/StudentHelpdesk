"""Retriever node — first node in the graph (task_board.md AI-01 order:
retriever -> specialist router -> specialist agent -> supervisor).

COORDINATION BOUNDARY (Claude-2, AI-02/AI-03 not yet built): this node
does NOT import rag/ directly, because rag/retriever/'s real interface
doesn't exist yet. Instead it depends on a small `Retriever` protocol
defined here. Once AI-02/AI-03 land a real FAISS-backed retriever, wire it
in via `build_retriever_node(real_retriever)` — no change needed to this
file's node logic, only to whatever constructs the graph (see
agents/graphs/main_graph.py).

Until then, `NullRetriever` is used as a safe default: it returns no
chunks rather than raising, so the graph can run end-to-end (with an
honest, low-confidence answer) even before ingestion exists.
"""

from __future__ import annotations

from typing import Protocol

from agents.state.graph_state import AgentState, RetrievedChunk


class Retriever(Protocol):
    def retrieve(self, query: str, *, top_k: int = 5) -> list[RetrievedChunk]: ...


class NullRetriever:
    """Placeholder used until AI-02/AI-03 provide a real FAISS retriever.
    Always returns an empty result set — never fabricates chunks."""

    def retrieve(self, query: str, *, top_k: int = 5) -> list[RetrievedChunk]:
        return []


def build_retriever_node(retriever: Retriever):
    """Returns a LangGraph-compatible node: (AgentState) -> dict patch."""

    def retrieve_node(state: AgentState) -> dict:
        try:
            chunks = retriever.retrieve(state["question"])
            return {"retrieved_chunks": chunks}
        except Exception as exc:  # noqa: BLE001 - node boundary, must not crash the graph
            return {"retrieved_chunks": [], "error": f"retriever failed: {exc}"}

    return retrieve_node
