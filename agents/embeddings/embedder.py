"""Embedding-model abstraction — isolates the embedding-model choice per
coding_standards.md ("agents/embeddings/ isolates the embedding-model
choice so it can change without touching retrieval logic"), mirroring
agents/llm/provider.py's Protocol + deferred-import pattern from AI-01 so
agents/ stays importable without sentence-transformers installed.

Nodes/ingest code call get_embedder(settings) and only see the Embedder
protocol, never sentence_transformers directly.
"""

from __future__ import annotations

from typing import Protocol

from agents.config import AgentSettings


class Embedder(Protocol):
    def embed(self, texts: list[str]) -> list[list[float]]: ...

    @property
    def dimension(self) -> int: ...


class SentenceTransformerEmbedder:
    """Default embedder per coding_standards.md. Like AI-01's
    OpenAIProvider/GeminiProvider, the import is deferred into __init__ so
    this module (and agents/ generally) can be imported without the
    package installed — real embedding runs are an AI-04/deployment-time
    concern, not something this session live-tests against a downloaded
    model (no network path to the model hub in this environment)."""

    def __init__(self, settings: AgentSettings) -> None:
        try:
            from sentence_transformers import SentenceTransformer  # type: ignore[import-not-found]
        except ImportError as exc:  # pragma: no cover - environment-dependent
            raise RuntimeError(
                "SentenceTransformerEmbedder requires the "
                "'sentence-transformers' package. Add it to "
                "agents/requirements.txt (already listed as of AI-02) and "
                "install it in the ai-worker/faiss-service image — not "
                "installed as part of this session, which wires the "
                "interface + ingestion pipeline against it."
            ) from exc

        self._model = SentenceTransformer(settings.EMBEDDING_MODEL)
        self._dimension = self._model.get_sentence_embedding_dimension()

    def embed(self, texts: list[str]) -> list[list[float]]:
        vectors = self._model.encode(texts, convert_to_numpy=True)
        return [v.tolist() for v in vectors]

    @property
    def dimension(self) -> int:
        return self._dimension


def get_embedder(settings: AgentSettings) -> Embedder:
    return SentenceTransformerEmbedder(settings)
