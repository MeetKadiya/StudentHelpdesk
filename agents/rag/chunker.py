"""Text chunking for AI-02's ingestion pipeline (doc -> chunks -> embeddings
-> FAISS). Pure function, no external dependencies, deliberately kept that
way so it's trivially unit-testable and reusable from ingest.py without
pulling in faiss/sentence-transformers just to split text.

Word-boundary-safe, character-budgeted chunking with an overlap window
(not token-exact — a cheap, dependency-free approximation is fine here;
embedding models tokenize their own way regardless).
"""

from __future__ import annotations


def chunk_text(text: str, *, chunk_size: int = 800, overlap: int = 100) -> list[str]:
    """Splits `text` into chunks of at most ~chunk_size characters, each
    consecutive pair overlapping by ~overlap characters, breaking only on
    word boundaries. Returns [] for empty/whitespace-only input.

    chunk_size and overlap are both in characters, not tokens. overlap
    must be smaller than chunk_size or it's effectively ignored (each
    chunk still advances by at least one word to guarantee termination).
    """
    text = text.strip()
    if not text:
        return []

    words = text.split()
    chunks: list[str] = []
    start = 0
    n = len(words)

    while start < n:
        end = start
        length = 0
        while end < n and (length + len(words[end]) + 1 <= chunk_size or end == start):
            length += len(words[end]) + 1
            end += 1

        chunks.append(" ".join(words[start:end]))

        if end >= n:
            break

        # Walk back from `end` far enough to cover ~overlap characters,
        # but never past `start` — guarantees forward progress even when
        # overlap >= chunk_size.
        back = end
        covered = 0
        while back > start + 1 and covered < overlap:
            back -= 1
            covered += len(words[back]) + 1
        start = back

    return chunks
