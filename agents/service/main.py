"""AI-03 — faiss-service application code.

Location note (see task_board.md ARCH-DECISION-02): this lives under
agents/service/ for now because that's Claude-2's own territory and
doesn't require touching docker-compose.yml (Claude-4's file) or
guessing at a top-level rag/ package layout that was never added to
architecture.md/folder_structure.md. docker-compose.yml currently points
faiss-service's build context at a top-level ../rag instead — unresolved,
tracked as ARCH-DECISION-02. Once that's settled, this module either
moves as-is to wherever the decision lands, or the compose file's context
changes to point here. The retrieval/ingestion logic itself
(agents/rag/, agents/embeddings/) is not duplicated regardless of the
outcome — this file only adds an HTTP wrapper around it.

Exposes:
- GET  /health           liveness check
- POST /search            {query, top_k?} -> {results: [{content, source,
                           score}]}, backed by FaissRetriever
- POST /reindex            re-runs agents/rag/ingest.py's pipeline over
                           knowledgebase/ and persists a fresh index

Not yet wired: agents/nodes/retriever.py's build_retriever_node() calling
this service over HTTP (AI-04's ai-worker concern, matching the compose
graph's `ai-worker depends_on faiss-service`) vs. calling FaissRetriever
in-process. Both are valid depending on where AI-04 lands; not decided
here.
"""
from __future__ import annotations

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from agents.config import get_agent_settings
from agents.embeddings.embedder import get_embedder
from agents.rag.ingest import REPO_ROOT, ingest
from agents.rag.retriever_adapter import FaissRetriever

app = FastAPI(title="faiss-service", version="0.1.0")

# Lazy singleton: loading the embedder + FAISS index is not free, and this
# service has no per-request state otherwise. Reset to None by /reindex so
# the next /search picks up the freshly written index instead of serving
# a stale in-memory one.
_retriever: FaissRetriever | None = None


class SearchRequest(BaseModel):
    query: str
    top_k: int = Field(default=5, ge=1, le=50)


class SearchResultItem(BaseModel):
    content: str
    source: str
    score: float


class SearchResponse(BaseModel):
    results: list[SearchResultItem]


class ReindexResponse(BaseModel):
    chunks_indexed: int


def _get_retriever() -> FaissRetriever:
    global _retriever
    if _retriever is None:
        settings = get_agent_settings()
        try:
            _retriever = FaissRetriever.load(settings)
        except FileNotFoundError as exc:
            # No index built yet — a 503 (not 500) so callers can
            # distinguish "not ready yet" from a real failure.
            raise HTTPException(status_code=503, detail=str(exc)) from exc
    return _retriever


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/search", response_model=SearchResponse)
def search(req: SearchRequest) -> SearchResponse:
    if not req.query.strip():
        raise HTTPException(status_code=422, detail="query must not be empty")

    retriever = _get_retriever()
    chunks = retriever.retrieve(req.query, top_k=req.top_k)
    return SearchResponse(results=[SearchResultItem(**c) for c in chunks])


@app.post("/reindex", response_model=ReindexResponse)
def reindex() -> ReindexResponse:
    global _retriever

    settings = get_agent_settings()
    embedder = get_embedder(settings)
    kb_root = REPO_ROOT / "knowledgebase"

    index = ingest(
        kb_root=kb_root,
        embedder=embedder,
        chunk_size=settings.CHUNK_SIZE,
        overlap=settings.CHUNK_OVERLAP,
    )
    index.save(
        REPO_ROOT / settings.FAISS_INDEX_PATH,
        REPO_ROOT / settings.FAISS_METADATA_PATH,
    )
    _retriever = None
    return ReindexResponse(chunks_indexed=len(index.metadatas))
