"""Thin FAISS wrapper for AI-02 — cosine-similarity search over chunk
embeddings, with metadata stored alongside (FAISS itself only stores
vectors). faiss import is deferred (same pattern as agents/llm/provider.py
and agents/embeddings/embedder.py) so agents/ stays importable without it.

Persistence: the FAISS index and its parallel metadata list are saved to
two separate files (index.faiss + chunks.jsonl) — paths come from
AgentSettings.FAISS_INDEX_PATH / FAISS_METADATA_PATH, not hardcoded here.
"""
from __future__ import annotations

import json
from pathlib import Path


class FaissIndex:
    """Wraps a flat, inner-product FAISS index over L2-normalized vectors
    (== cosine similarity). Fine for the knowledgebase's expected scale;
    revisit (IVF/HNSW) only if AI-03/profiling shows it's needed — not
    speculatively built here."""

    def __init__(self, dim: int) -> None:
        import faiss  # type: ignore[import-not-found]

        self._faiss = faiss
        self.dim = dim
        self.index = faiss.IndexFlatIP(dim)
        self.metadatas: list[dict] = []

    def add(self, vectors: list[list[float]], metadatas: list[dict]) -> None:
        if len(vectors) != len(metadatas):
            raise ValueError("vectors and metadatas must be the same length")
        if not vectors:
            return

        import numpy as np

        arr = np.array(vectors, dtype="float32")
        self._faiss.normalize_L2(arr)
        self.index.add(arr)
        self.metadatas.extend(metadatas)

    def search(self, query_vector: list[float], *, top_k: int = 5) -> list[tuple[float, dict]]:
        if self.index.ntotal == 0:
            return []

        import numpy as np

        q = np.array([query_vector], dtype="float32")
        self._faiss.normalize_L2(q)
        scores, indices = self.index.search(q, min(top_k, self.index.ntotal))

        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx == -1:
                continue
            results.append((float(score), self.metadatas[idx]))
        return results

    def save(self, index_path: Path | str, metadata_path: Path | str) -> None:
        index_path = Path(index_path)
        metadata_path = Path(metadata_path)
        index_path.parent.mkdir(parents=True, exist_ok=True)
        metadata_path.parent.mkdir(parents=True, exist_ok=True)

        self._faiss.write_index(self.index, str(index_path))
        with metadata_path.open("w", encoding="utf-8") as f:
            for m in self.metadatas:
                f.write(json.dumps(m) + "\n")

    @classmethod
    def load(cls, index_path: Path | str, metadata_path: Path | str, *, dim: int) -> "FaissIndex":
        obj = cls(dim)
        obj.index = obj._faiss.read_index(str(index_path))
        with Path(metadata_path).open(encoding="utf-8") as f:
            obj.metadatas = [json.loads(line) for line in f if line.strip()]
        return obj
