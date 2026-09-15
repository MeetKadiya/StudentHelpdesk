from __future__ import annotations

from agents.rag.chunker import chunk_text


def test_empty_text_returns_no_chunks():
    assert chunk_text("") == []
    assert chunk_text("   \n  ") == []


def test_short_text_returns_single_chunk():
    text = "How do I reset my campus email password?"
    chunks = chunk_text(text, chunk_size=800, overlap=100)
    assert chunks == [text]


def test_long_text_splits_into_multiple_chunks():
    text = " ".join(f"word{i}" for i in range(500))  # ~3500 chars
    chunks = chunk_text(text, chunk_size=200, overlap=50)
    assert len(chunks) > 1
    for c in chunks:
        assert len(c) <= 200 + 20  # small slack for the boundary word

    # every chunk boundary lands on a whole word, never mid-word
    for c in chunks:
        assert not c.startswith(" ") and not c.endswith(" ")


def test_consecutive_chunks_overlap():
    text = " ".join(f"word{i}" for i in range(200))
    chunks = chunk_text(text, chunk_size=200, overlap=50)
    assert len(chunks) > 1

    def word_indices(chunk: str) -> set[int]:
        return {int(w[len("word"):]) for w in chunk.split()}

    # Genuine invariant: the shared word-index range between adjacent
    # chunks is non-empty (checking only the first/last 3 words is wrong
    # when the actual overlap window is wider than 3 words on either side
    # — caught this by running the test for real: it failed against a
    # correct chunker because the assertion itself was checking the wrong
    # thing).
    assert word_indices(chunks[0]) & word_indices(chunks[1])


def test_terminates_when_overlap_exceeds_chunk_size():
    text = " ".join(f"word{i}" for i in range(50))
    chunks = chunk_text(text, chunk_size=30, overlap=1000)
    assert len(chunks) > 1  # must still make forward progress, not hang
