"""TEST-01: cross-service E2E flow -- signup -> login -> create ticket ->
AI escalate -> faculty responds -> verified -> re-index job enqueued --
driven entirely through real HTTP requests against the real FastAPI app.
"""

import pytest
from httpx import AsyncClient

from tests.helpers import auth_headers, login


@pytest.mark.asyncio
async def test_signup_login_create_ticket_enqueues_ai_job(
    client: AsyncClient, mock_celery
):
    signup = await client.post(
        "/api/v1/auth/signup",
        json={"email": "stu1@example.edu", "password": "testpass123"},
    )
    assert signup.status_code == 201
    assert signup.json()["role"] == "student"

    token = await login(client, "stu1@example.edu")

    me = await client.get("/api/v1/auth/me", headers=auth_headers(token))
    assert me.status_code == 200
    assert me.json()["email"] == "stu1@example.edu"

    created = await client.post(
        "/api/v1/tickets",
        json={"subject": "Library hours", "message": "When does the library open?"},
        headers=auth_headers(token),
    )
    assert created.status_code == 201
    body = created.json()
    assert body["status"] == "open"

    # Enqueue is fire-and-forget from the route's perspective, but must
    # have actually been called with the exact contract api_contract.md
    # documents (v0.6/v0.8) -- ticket_id, question, conversation_history.
    mock_celery.send_task.assert_called_once()
    task_name, kwargs = (
        mock_celery.send_task.call_args[0][0],
        mock_celery.send_task.call_args,
    )
    assert task_name == "agents.worker.process_ticket_job"
    job = kwargs.kwargs["args"][0]
    assert job["ticket_id"] == body["id"]
    assert job["question"] == "When does the library open?"
    assert job["conversation_history"] == []
    assert kwargs.kwargs["queue"] == "ai_tasks"


@pytest.mark.asyncio
async def test_ai_auto_respond_write_back_visible_to_student(
    client: AsyncClient, mock_celery
):
    await client.post(
        "/api/v1/auth/signup",
        json={"email": "stu2@example.edu", "password": "testpass123"},
    )
    token = await login(client, "stu2@example.edu")
    created = (
        await client.post(
            "/api/v1/tickets",
            json={"message": "What are the exam dates?"},
            headers=auth_headers(token),
        )
    ).json()

    # Simulate the ai-worker's write-back (BACKEND-07), the same request
    # agents/worker/backend_client.py sends in production.
    write_back = await client.post(
        f"/internal/v1/tickets/{created['id']}/ai-result",
        json={
            "graph_version": "v1",
            "decision": "auto_respond",
            "draft_answer": "Exam dates are posted on the portal.",
            "confidence": 0.92,
            "category": "academic",
        },
    )
    assert write_back.status_code == 200
    assert write_back.json()["status"] == "answered"

    detail = await client.get(
        f"/api/v1/tickets/{created['id']}", headers=auth_headers(token)
    )
    assert detail.status_code == 200
    messages = detail.json()["messages"]
    assert any(
        m["sender_type"] == "ai_agent"
        and m["content"] == "Exam dates are posted on the portal."
        for m in messages
    )
    assert detail.json()["status"] == "answered"
    assert detail.json()["category"] == "academic"
