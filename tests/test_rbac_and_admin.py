"""TEST-01: RBAC enforcement (require_role/require_admin/require_faculty)
and admin routing-rule/role-management validation, driven through real
HTTP requests -- never exercised end-to-end before this file (prior
sessions verified faculty_service/admin_service directly, bypassing the
FastAPI Depends() chain entirely)."""

import pytest
from httpx import AsyncClient

from tests.helpers import auth_headers, login


@pytest.mark.asyncio
async def test_student_forbidden_from_faculty_and_admin_routes(client: AsyncClient):
    await client.post(
        "/api/v1/auth/signup",
        json={"email": "stu6@example.edu", "password": "testpass123"},
    )
    token = await login(client, "stu6@example.edu")

    faculty_resp = await client.get(
        "/api/v1/faculty/tickets", headers=auth_headers(token)
    )
    assert faculty_resp.status_code == 403

    admin_resp = await client.get("/api/v1/admin/users", headers=auth_headers(token))
    assert admin_resp.status_code == 403


@pytest.mark.asyncio
async def test_unauthenticated_requests_are_rejected(client: AsyncClient):
    resp = await client.get("/api/v1/tickets")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_admin_rejects_routing_rule_for_non_faculty_user(
    client: AsyncClient, make_user
):
    await make_user("admin2@example.edu", role="admin")
    student = await make_user("stu7@example.edu", role="student")
    admin_token = await login(client, "admin2@example.edu")

    resp = await client.post(
        "/api/v1/admin/routing-rules",
        json={"category": "billing", "faculty_id": str(student.id)},
        headers=auth_headers(admin_token),
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_admin_can_promote_a_student_to_faculty(client: AsyncClient, make_user):
    await make_user("admin3@example.edu", role="admin")
    student = await make_user("stu8@example.edu", role="student")
    admin_token = await login(client, "admin3@example.edu")

    resp = await client.patch(
        f"/api/v1/admin/users/{student.id}/role",
        json={"role": "faculty"},
        headers=auth_headers(admin_token),
    )
    assert resp.status_code == 200
    assert resp.json()["role"] == "faculty"

    # The promoted user can now actually use faculty-only routes -- proves
    # the promotion took effect at the auth/RBAC layer, not just in the DB.
    new_faculty_token = await login(client, "stu8@example.edu")
    faculty_check = await client.get(
        "/api/v1/faculty/tickets", headers=auth_headers(new_faculty_token)
    )
    assert faculty_check.status_code == 200
