"""AI-05 — Learning Agent tests. Uses a fake Embedder (same pattern
agents/tests/test_faiss_index.py and test_ingest.py already established)
so these tests don't need a real sentence-transformers model download —
no network path to the model hub in this environment (same limitation
AI-01/AI-02 already documented)."""

from __future__ import annotations

from pathlib import Path

from agents.config import AgentSettings
from agents.learning.learning_agent import (
    _faq_filename,
    ingest_verified_answer,
    write_verified_answer,
)


class FakeEmbedder:
    """Spreads character codes across all dimensions rather than encoding
    by magnitude on one axis — AI-02's own test-bug note (project_status.md
    2026-08-08) flagged that a magnitude-only fake collapses to an
    identical direction after FAISS's L2 normalization, since cosine
    similarity is direction-only. This fake avoids that."""

    dimension = 8

    def embed(self, texts: list[str]) -> list[list[float]]:
        vectors = []
        for text in texts:
            vector = [0.0] * self.dimension
            for i, ch in enumerate(text):
                vector[i % self.dimension] += ord(ch)
            vectors.append(vector)
        return vectors


def _settings(tmp_path: Path) -> AgentSettings:
    return AgentSettings(
        CHUNK_SIZE=800,
        CHUNK_OVERLAP=100,
        FAISS_INDEX_PATH=str(tmp_path / "embeddings" / "index.faiss"),
        FAISS_METADATA_PATH=str(tmp_path / "metadata" / "chunks.jsonl"),
    )


def test_write_verified_answer_creates_expected_file(tmp_path):
    kb_root = tmp_path / "knowledgebase"
    path = write_verified_answer(
        kb_root=kb_root,
        ticket_id="t1",
        message_id="m1",
        question="How do I reset my password?",
        answer="Go to Settings > Security > Reset Password.",
        category="it_support",
    )
    assert path.exists()
    assert path.parent.name == "faqs"
    assert path.name == _faq_filename("t1", "m1")
    content = path.read_text()
    assert "How do I reset my password?" in content
    assert "Reset Password" in content
    assert "it_support" in content


def test_write_verified_answer_is_idempotent_by_ticket_and_message_id(tmp_path):
    kb_root = tmp_path / "knowledgebase"
    path1 = write_verified_answer(
        kb_root=kb_root,
        ticket_id="t1",
        message_id="m1",
        question="Q",
        answer="First answer",
        category=None,
    )
    path2 = write_verified_answer(
        kb_root=kb_root,
        ticket_id="t1",
        message_id="m1",
        question="Q",
        answer="Second answer",
        category=None,
    )
    # Same (ticket_id, message_id) -> same file, overwritten not duplicated.
    assert path1 == path2
    assert "Second answer" in path2.read_text()
    assert list((kb_root / "faqs").glob("*.md")) == [path1]


def test_reindex_persists_index_and_metadata(tmp_path):
    kb_root = tmp_path / "knowledgebase"
    write_verified_answer(
        kb_root=kb_root,
        ticket_id="t1",
        message_id="m1",
        question="What are the library hours?",
        answer="The library is open 8am-10pm on weekdays.",
        category="general",
    )
    settings = _settings(tmp_path)

    # reindex() reads REPO_ROOT / settings.FAISS_INDEX_PATH internally, but
    # REPO_ROOT is fixed to the real repo root — so this test instead calls
    # ingest() the same way reindex() does, scoped to our tmp_path kb_root,
    # to keep the test hermetic. See test_ingest_verified_answer_end_to_end
    # below for the REPO_ROOT-relative path exercised for real.
    from agents.rag.ingest import ingest

    index = ingest(
        kb_root=kb_root,
        embedder=FakeEmbedder(),
        chunk_size=settings.CHUNK_SIZE,
        overlap=settings.CHUNK_OVERLAP,
    )
    assert len(index.metadatas) >= 1
    assert any("library" in m["content"].lower() for m in index.metadatas)


def test_ingest_verified_answer_end_to_end(tmp_path, monkeypatch):
    """Exercises the real ingest_verified_answer() entrypoint, including
    its REPO_ROOT-relative path resolution — monkeypatches REPO_ROOT to
    tmp_path so this stays hermetic rather than writing into the real
    repo's knowledgebase/ during a test run."""
    import agents.learning.learning_agent as learning_agent_module

    monkeypatch.setattr(learning_agent_module, "REPO_ROOT", tmp_path)

    settings = AgentSettings(
        CHUNK_SIZE=800,
        CHUNK_OVERLAP=100,
        FAISS_INDEX_PATH="knowledgebase/embeddings/index.faiss",
        FAISS_METADATA_PATH="knowledgebase/metadata/chunks.jsonl",
    )
    job = {
        "ticket_id": "t42",
        "message_id": "m42",
        "question": "What time does the library open?",
        "answer": "The library opens at 8am on weekdays.",
        "category": "general",
    }

    result = ingest_verified_answer(job, settings=settings, embedder=FakeEmbedder())

    assert result["chunks_indexed"] >= 1
    written_path = Path(result["path"])
    assert written_path.exists()
    assert "library" in written_path.read_text().lower()

    index_path = tmp_path / settings.FAISS_INDEX_PATH
    metadata_path = tmp_path / settings.FAISS_METADATA_PATH
    assert index_path.exists()
    assert metadata_path.exists()
    assert "library" in metadata_path.read_text().lower()


def test_ingest_verified_answer_is_actually_retrievable_after(tmp_path, monkeypatch):
    """The real point of the Learning Agent (FR-25): a verified answer
    must be searchable afterward, not just written to disk. Loads a fresh
    FaissRetriever over the index ingest_verified_answer() just built and
    confirms a relevant query surfaces it."""
    import agents.learning.learning_agent as learning_agent_module
    import agents.rag.retriever_adapter as retriever_adapter_module

    monkeypatch.setattr(learning_agent_module, "REPO_ROOT", tmp_path)
    monkeypatch.setattr(retriever_adapter_module, "REPO_ROOT", tmp_path)

    settings = AgentSettings(
        CHUNK_SIZE=800,
        CHUNK_OVERLAP=100,
        FAISS_INDEX_PATH="knowledgebase/embeddings/index.faiss",
        FAISS_METADATA_PATH="knowledgebase/metadata/chunks.jsonl",
    )
    job = {
        "ticket_id": "t42",
        "message_id": "m42",
        "question": "What time does the library open?",
        "answer": "The library opens at 8am on weekdays.",
        "category": "general",
    }
    ingest_verified_answer(job, settings=settings, embedder=FakeEmbedder())

    from agents.rag.retriever_adapter import FaissRetriever

    retriever = FaissRetriever.load(settings, embedder=FakeEmbedder())
    results = retriever.retrieve("library opening time", top_k=3)
    assert any("library" in r["content"].lower() for r in results)
