"""TEST-01: escalation -> faculty routing -> respond -> verify -> Learning
Agent enqueue, and the no-matching-routing-rule edge case BACKEND-07's
entry explicitly calls out. All through real HTTP requests.
"""

import pytest
from httpx import AsyncClient

from tests.helpers import auth_headers, login


@pytest.mark.asyncio
async def test_full_escalation_to_verified_learning_enqueue(
    client: AsyncClient, mock_celery, make_user
):
    # Student creates a ticket.
    await client.post(
        "/api/v1/auth/signup",
        json={"email": "stu3@example.edu", "password": "testpass123"},
    )
    student_token = await login(client, "stu3@example.edu")
    ticket = (
        await client.post(
            "/api/v1/tickets",
            json={"message": "How do I appeal a grade?"},
            headers=auth_headers(student_token),
        )
    ).json()

    # Bootstrap faculty + admin directly at the DB layer (see conftest's
    # make_user docstring -- no in-product path exists for this).
    faculty = await make_user("prof1@example.edu", role="faculty")
    await make_user("admin1@example.edu", role="admin")
    admin_token = await login(client, "admin1@example.edu")

    # Admin creates a routing rule for the ticket's eventual category.
    rule = await client.post(
        "/api/v1/admin/routing-rules",
        json={"category": "grades", "faculty_id": str(faculty.id)},
        headers=auth_headers(admin_token),
    )
    assert rule.status_code == 201

    # AI escalates with a matching category.
    write_back = await client.post(
        f"/internal/v1/tickets/{ticket['id']}/ai-result",
        json={"graph_version": "v1", "decision": "escalate", "category": "grades"},
    )
    assert write_back.status_code == 200
    assert write_back.json()["status"] == "escalated"

    # Faculty sees the routed ticket.
    faculty_token = await login(client, "prof1@example.edu")
    routed = await client.get(
        "/api/v1/faculty/tickets", headers=auth_headers(faculty_token)
    )
    assert routed.status_code == 200
    assert any(t["id"] == ticket["id"] for t in routed.json())

    detail = await client.get(
        f"/api/v1/faculty/tickets/{ticket['id']}", headers=auth_headers(faculty_token)
    )
    assert detail.status_code == 200
    assert detail.json()["assigned_faculty_id"] == str(faculty.id)
    assert any(
        m["content"] == "How do I appeal a grade?" for m in detail.json()["messages"]
    )

    # Faculty responds.
    respond = await client.post(
        f"/api/v1/faculty/tickets/{ticket['id']}/respond",
        json={"content": "Submit form GR-1 to the registrar within 10 days."},
        headers=auth_headers(faculty_token),
    )
    assert respond.status_code == 201
    message_id = respond.json()["id"]
    assert respond.json()["is_verified"] is False

    # Student sees the staff response.
    student_view = await client.get(
        f"/api/v1/tickets/{ticket['id']}", headers=auth_headers(student_token)
    )
    assert any(
        m["content"] == "Submit form GR-1 to the registrar within 10 days."
        for m in student_view.json()["messages"]
    )

    # Faculty verifies it -- must enqueue the Learning Agent job (AI-05 /
    # FR-25) with the exact payload api_contract.md v0.9 documents.
    mock_celery.reset_mock()
    verify = await client.post(
        f"/api/v1/faculty/tickets/{ticket['id']}/messages/{message_id}/verify",
        json={"verified": True},
        headers=auth_headers(faculty_token),
    )
    assert verify.status_code == 200
    assert verify.json()["is_verified"] is True

    mock_celery.send_task.assert_called_once()
    args, kwargs = mock_celery.send_task.call_args
    assert args[0] == "agents.worker.process_learning_job"
    job = kwargs["args"][0]
    assert job["ticket_id"] == ticket["id"]
    assert job["message_id"] == message_id
    assert job["question"] == "How do I appeal a grade?"
    assert job["answer"] == "Submit form GR-1 to the registrar within 10 days."
    assert job["category"] == "grades"

    # Un-verifying is explicitly rejected (400), per api_contract.md.
    unverify = await client.post(
        f"/api/v1/faculty/tickets/{ticket['id']}/messages/{message_id}/verify",
        json={"verified": False},
        headers=auth_headers(faculty_token),
    )
    assert unverify.status_code == 400


@pytest.mark.asyncio
async def test_escalation_with_no_matching_routing_rule_stays_visible(
    client: AsyncClient,
):
    """BACKEND-07's documented behavior: no matching rule still marks the
    ticket escalated (not silently left 'open' with no owner), and
    assigned_faculty_id stays unset rather than a crash."""
    await client.post(
        "/api/v1/auth/signup",
        json={"email": "stu4@example.edu", "password": "testpass123"},
    )
    student_token = await login(client, "stu4@example.edu")
    ticket = (
        await client.post(
            "/api/v1/tickets",
            json={"message": "Unusual request with no routing rule."},
            headers=auth_headers(student_token),
        )
    ).json()

    write_back = await client.post(
        f"/internal/v1/tickets/{ticket['id']}/ai-result",
        json={
            "graph_version": "v1",
            "decision": "escalate",
            "category": "nonexistent-category",
        },
    )
    assert write_back.status_code == 200
    assert write_back.json()["status"] == "escalated"

    detail = await client.get(
        f"/api/v1/tickets/{ticket['id']}", headers=auth_headers(student_token)
    )
    assert detail.json()["status"] == "escalated"


@pytest.mark.asyncio
async def test_faculty_cannot_see_ticket_not_routed_to_them(
    client: AsyncClient, make_user
):
    """404, not 403 -- avoids leaking that the ticket exists at all, per
    faculty_service's documented not-found-vs-not-owned pattern."""
    await client.post(
        "/api/v1/auth/signup",
        json={"email": "stu5@example.edu", "password": "testpass123"},
    )
    student_token = await login(client, "stu5@example.edu")
    ticket = (
        await client.post(
            "/api/v1/tickets",
            json={"message": "Private question."},
            headers=auth_headers(student_token),
        )
    ).json()

    await make_user("prof2@example.edu", role="faculty")
    faculty_token = await login(client, "prof2@example.edu")

    resp = await client.get(
        f"/api/v1/faculty/tickets/{ticket['id']}", headers=auth_headers(faculty_token)
    )
    assert resp.status_code == 404
