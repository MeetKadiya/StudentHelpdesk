"""AI-02 — knowledgebase doc -> chunks -> embeddings -> FAISS.

Reads .md/.txt files from knowledgebase/{documents,policies,circulars,faqs}
(architecture.md §4.5's source subfolders — knowledgebase/embeddings/ and
knowledgebase/metadata/ are OUTPUTS of this pipeline, not inputs), chunks
each with agents/rag/chunker.py, embeds all chunks in one batch via
agents/embeddings/embedder.py, and builds/persists a FaissIndex.

Per architecture.md §4.5: "Only verified documents are indexed." This
module does not enforce *what* counts as verified (that's an
admin-upload / Learning-Agent-write concern upstream of this pipeline —
BACKEND-05/AI-05) — it ingests whatever .md/.txt files exist in the
source subfolders. Empty subfolders (the current state — no content has
been curated yet) are handled cleanly: ingest() returns an index with
zero vectors rather than erroring, matching AI-01's NullRetriever
fail-safe philosophy.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from agents.config import AgentSettings, get_agent_settings
from agents.embeddings.embedder import Embedder, get_embedder
from agents.rag.chunker import chunk_text
from agents.rag.faiss_index import FaissIndex

_SOURCE_SUBFOLDERS = ("documents", "policies", "circulars", "faqs")
_SOURCE_EXTENSIONS = {".md", ".txt"}

REPO_ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class SourceDocument:
    path: Path
    category: str  # which knowledgebase/ subfolder it came from


def discover_documents(kb_root: Path) -> list[SourceDocument]:
    """Lists ingestible files under the canonical source subfolders.
    Missing subfolders are skipped, not an error — folder_structure.md's
    skeleton is pre-created but "don't assume files exist just because a
    folder does" applies to the folders themselves too."""
    docs: list[SourceDocument] = []
    for sub in _SOURCE_SUBFOLDERS:
        folder = kb_root / sub
        if not folder.is_dir():
            continue
        for path in sorted(folder.rglob("*")):
            if path.is_file() and path.suffix.lower() in _SOURCE_EXTENSIONS:
                docs.append(SourceDocument(path=path, category=sub))
    return docs


def build_chunks(
    docs: list[SourceDocument], *, kb_root: Path, chunk_size: int, overlap: int
) -> list[dict]:
    """Returns metadata dicts (content/source/category/chunk_index) for
    every chunk of every document — one list, ready to hand to an
    embedder in a single batch call."""
    all_chunks: list[dict] = []
    for doc in docs:
        text = doc.path.read_text(encoding="utf-8")
        for i, chunk in enumerate(chunk_text(text, chunk_size=chunk_size, overlap=overlap)):
            all_chunks.append(
                {
                    "content": chunk,
                    "source": str(doc.path.relative_to(kb_root)),
                    "category": doc.category,
                    "chunk_index": i,
                }
            )
    return all_chunks


def ingest(
    *,
    kb_root: Path,
    embedder: Embedder,
    chunk_size: int = 800,
    overlap: int = 100,
) -> FaissIndex:
    """Runs the full pipeline and returns the built (in-memory) FaissIndex
    — caller decides whether/where to persist it (see main() below for the
    CLI's choice)."""
    docs = discover_documents(kb_root)
    chunks = build_chunks(docs, kb_root=kb_root, chunk_size=chunk_size, overlap=overlap)

    index = FaissIndex(dim=embedder.dimension)
    if chunks:
        vectors = embedder.embed([c["content"] for c in chunks])
        index.add(vectors, chunks)
    return index


def main() -> None:  # pragma: no cover - CLI entrypoint, exercised via ingest()
    settings: AgentSettings = get_agent_settings()
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
    print(f"Ingested {len(index.metadatas)} chunks from {kb_root} -> {settings.FAISS_INDEX_PATH}")


if __name__ == "__main__":  # pragma: no cover
    main()
