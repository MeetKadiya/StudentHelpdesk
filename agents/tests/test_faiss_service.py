"""AI-03 tests for agents/service/main.py. Mocks FaissRetriever.load and
ingest() rather than building a real index — this environment has no path
to the sentence-transformers model hub (same limitation already
documented for AI-01/AI-02), so this proves the HTTP wrapper's request/
response handling and caching behavior, not end-to-end embedding quality.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import agents.service.main as service_main


class FakeRetriever:
    def __init__(self, chunks):
        self._chunks = chunks

    def retrieve(self, query: str, *, top_k: int = 5):
        return self._chunks[:top_k]


@pytest.fixture(autouse=True)
def reset_singleton():
    service_main._retriever = None
    yield
    service_main._retriever = None


def test_health():
    client = TestClient(service_main.app)
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_search_rejects_empty_query():
    client = TestClient(service_main.app)
    resp = client.post("/search", json={"query": "   "})
    assert resp.status_code == 422


def test_search_returns_503_when_no_index_built(monkeypatch):
    def raise_not_found(settings):
        raise FileNotFoundError("no index at ...")

    monkeypatch.setattr(service_main.FaissRetriever, "load", staticmethod(raise_not_found))
    client = TestClient(service_main.app)
    resp = client.post("/search", json={"query": "wifi help"})
    assert resp.status_code == 503


def test_search_returns_results_from_retriever(monkeypatch):
    fake_chunks = [
        {"content": "Reset wifi password here.", "source": "faqs/wifi.md", "score": 0.9},
    ]

    def fake_load(settings):
        return FakeRetriever(fake_chunks)

    monkeypatch.setattr(service_main.FaissRetriever, "load", staticmethod(fake_load))
    client = TestClient(service_main.app)
    resp = client.post("/search", json={"query": "wifi help", "top_k": 3})
    assert resp.status_code == 200
    assert resp.json()["results"] == [
        {"content": "Reset wifi password here.", "source": "faqs/wifi.md", "score": 0.9}
    ]


def test_reindex_returns_chunk_count_and_resets_cache(monkeypatch):
    class FakeIndex:
        def __init__(self):
            self.metadatas = [{"content": "a"}, {"content": "b"}]

        def save(self, index_path, metadata_path):
            pass

    monkeypatch.setattr(service_main, "ingest", lambda **kwargs: FakeIndex())
    monkeypatch.setattr(service_main, "get_embedder", lambda settings: object())

    service_main._retriever = "sentinel-should-be-cleared"

    client = TestClient(service_main.app)
    resp = client.post("/reindex")
    assert resp.status_code == 200
    assert resp.json() == {"chunks_indexed": 2}
    assert service_main._retriever is None
