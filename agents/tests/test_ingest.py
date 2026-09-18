"""AI-02 ingestion tests. Uses a FakeEmbedder (deterministic, no network/
model download) rather than the real SentenceTransformerEmbedder — this
environment has no path to the model hub, same honest limitation AI-01
already documented for OpenAIProvider/GeminiProvider (interface + wiring
verified for real; live model calls are not)."""

from __future__ import annotations

from agents.rag.ingest import build_chunks, discover_documents, ingest


class FakeEmbedder:
    """Deterministic, no network/model download needed — proves the
    pipeline wiring (chunk -> embed -> FAISS add -> search) is correct,
    not embedding quality. FaissIndex does cosine similarity (L2-normalized
    inner product): a single-axis magnitude-only encoding like
    [len(text), 0, 0] collapses to the *same direction* after
    normalization no matter the value, so it can never distinguish two
    texts — caught this by running the ingest test for real against a
    correct chunker/index and getting the wrong search result. Spreading
    character codes across all 3 dimensions makes different texts point
    in genuinely different directions."""

    dimension = 3

    def embed(self, texts: list[str]) -> list[list[float]]:
        vectors = []
        for t in texts:
            v = [0.0, 0.0, 0.0]
            for i, ch in enumerate(t):
                v[i % 3] += ord(ch)
            vectors.append(v)
        return vectors


def _write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def test_discover_documents_finds_only_known_subfolders(tmp_path):
    _write(tmp_path / "faqs" / "wifi.md", "How do I connect to wifi?")
    _write(tmp_path / "policies" / "attendance.txt", "Attendance policy text.")
    _write(tmp_path / "random_other_folder" / "ignored.md", "should not be found")
    _write(tmp_path / "faqs" / "ignored.pdf", "binary-ish, wrong extension")

    docs = discover_documents(tmp_path)
    sources = {d.path.name for d in docs}
    assert sources == {"wifi.md", "attendance.txt"}


def test_discover_documents_handles_missing_subfolders(tmp_path):
    # kb_root exists but none of the source subfolders were created yet —
    # must not error.
    assert discover_documents(tmp_path) == []


def test_build_chunks_includes_source_and_category(tmp_path):
    _write(
        tmp_path / "faqs" / "wifi.md", "Connect to CampusWifi using your student ID and password."
    )
    docs = discover_documents(tmp_path)

    chunks = build_chunks(docs, kb_root=tmp_path, chunk_size=800, overlap=100)
    assert len(chunks) == 1
    assert chunks[0]["category"] == "faqs"
    assert chunks[0]["source"] == "faqs/wifi.md" or chunks[0]["source"] == "faqs\\wifi.md"
    assert "CampusWifi" in chunks[0]["content"]


def test_ingest_empty_knowledgebase_returns_empty_index(tmp_path):
    index = ingest(kb_root=tmp_path, embedder=FakeEmbedder())
    assert index.index.ntotal == 0
    assert index.search([1.0, 0.0, 0.0]) == []


def test_ingest_end_to_end_is_searchable(tmp_path):
    _write(tmp_path / "faqs" / "wifi.md", "Short wifi answer.")
    _write(
        tmp_path / "policies" / "attendance.txt",
        "This is a much longer attendance policy document with many more words in it.",
    )

    index = ingest(kb_root=tmp_path, embedder=FakeEmbedder())
    assert index.index.ntotal >= 2

    # Search using the same fake embedding of the short chunk's exact
    # text — should surface that chunk, not the unrelated longer one.
    query_vector = FakeEmbedder().embed(["Short wifi answer."])[0]
    results = index.search(query_vector, top_k=1)
    assert results[0][1]["source"] in ("faqs/wifi.md", "faqs\\wifi.md")
