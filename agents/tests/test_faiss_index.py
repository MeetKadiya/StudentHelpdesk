from __future__ import annotations

from agents.rag.faiss_index import FaissIndex


def test_search_on_empty_index_returns_no_results():
    index = FaissIndex(dim=4)
    assert index.search([1.0, 0.0, 0.0, 0.0], top_k=5) == []


def test_add_and_search_returns_closest_first():
    index = FaissIndex(dim=3)
    index.add(
        [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
        [{"content": "a"}, {"content": "b"}, {"content": "c"}],
    )
    results = index.search([0.9, 0.1, 0.0], top_k=2)
    assert len(results) == 2
    assert results[0][1]["content"] == "a"


def test_save_and_load_roundtrip(tmp_path):
    index = FaissIndex(dim=2)
    index.add(
        [[1.0, 0.0], [0.0, 1.0]],
        [{"content": "x", "source": "s1"}, {"content": "y", "source": "s2"}],
    )

    index_path = tmp_path / "index.faiss"
    meta_path = tmp_path / "chunks.jsonl"
    index.save(index_path, meta_path)

    assert index_path.exists()
    assert meta_path.exists()

    loaded = FaissIndex.load(index_path, meta_path, dim=2)
    results = loaded.search([1.0, 0.0], top_k=1)
    assert results[0][1]["content"] == "x"


def test_add_rejects_mismatched_lengths():
    index = FaissIndex(dim=2)
    try:
        index.add([[1.0, 0.0]], [{"a": 1}, {"b": 2}])
        assert False, "expected ValueError"
    except ValueError:
        pass
