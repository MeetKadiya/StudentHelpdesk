"""HTTP client for the ai-worker -> backend write-back contract proposed
in api_contract.md v0.6 (POST /internal/v1/tickets/{ticket_id}/ai-result).

That endpoint is implemented as of 2026-08-10 (BACKEND-07) —
backend/app/api/internal.py / backend/app/services/ai_result_service.py,
exactly per this contract. This client is real and tested against a
mocked HTTP transport (httpx.MockTransport), not against a live backend
in this environment (no Docker daemon here to run both services
together); run_graph_for_ticket's caller (the Celery task) still catches
and retries on any transport error, so a real deployment's transient
network issues are handled the same way whether or not this session
happened to test against a live server.
"""

from __future__ import annotations

import httpx

from agents.config import AgentSettings


class BackendClient:
    def __init__(self, settings: AgentSettings, *, client: httpx.Client | None = None) -> None:
        self._base_url = settings.BACKEND_INTERNAL_BASE_URL.rstrip("/")
        self._client = client or httpx.Client(timeout=settings.BACKEND_WRITE_BACK_TIMEOUT_SECONDS)

    def post_ai_result(self, ticket_id: str, result: dict) -> httpx.Response:
        url = f"{self._base_url}/internal/v1/tickets/{ticket_id}/ai-result"
        response = self._client.post(url, json=result)
        response.raise_for_status()
        return response
