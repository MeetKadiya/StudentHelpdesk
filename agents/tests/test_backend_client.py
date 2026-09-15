from __future__ import annotations

import httpx

from agents.config import AgentSettings
from agents.worker.backend_client import BackendClient


def test_post_ai_result_sends_expected_request():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["method"] = request.method
        return httpx.Response(200, json={"status": "ok"})

    transport = httpx.MockTransport(handler)
    settings = AgentSettings(BACKEND_INTERNAL_BASE_URL="http://fastapi-backend:8000")
    client = BackendClient(settings, client=httpx.Client(transport=transport))

    response = client.post_ai_result("t1", {"decision": "auto_respond"})
    assert response.status_code == 200
    assert captured["url"] == "http://fastapi-backend:8000/internal/v1/tickets/t1/ai-result"
    assert captured["method"] == "POST"


def test_post_ai_result_raises_on_http_error():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, json={"error": "boom"})

    transport = httpx.MockTransport(handler)
    settings = AgentSettings()
    client = BackendClient(settings, client=httpx.Client(transport=transport))

    try:
        client.post_ai_result("t1", {"decision": "auto_respond"})
        assert False, "expected HTTPStatusError"
    except httpx.HTTPStatusError:
        pass
