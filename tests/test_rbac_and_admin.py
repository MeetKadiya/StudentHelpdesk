"""TEST-01: RBAC enforcement (require_role/require_admin/require_faculty)
and admin routing-rule/role-management validation, driven through real
HTTP requests -- never exercised end-to-end before this file (prior
sessions verified faculty_service/admin_service directly, bypassing the
FastAPI Depends() chain entirely)."""

import pytest
from httpx import AsyncClient

from tests.helpers import auth_headers, login


@pytest.mark.asyncio
async def test_student_forbidden_from_faculty_and_admin_routes(client: AsyncClient, make_user):
    await make_user("stu6@example.edu", role="student")
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


@pytest.mark.asyncio
async def test_student_password_reset_flow(client: AsyncClient, make_user):
    await make_user("stu9@example.edu", password="originalpass123", role="student")

    # 1. Reset password
    reset_resp = await client.post(
        "/api/v1/auth/reset-password",
        json={"email": "stu9@example.edu", "new_password": "brandnewpass456"},
    )
    assert reset_resp.status_code == 200
    assert reset_resp.json()["success"] is True

    # 2. Login with old password fails
    old_login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "stu9@example.edu", "password": "originalpass123"},
    )
    assert old_login_resp.status_code == 401

    # 3. Login with new password succeeds
    new_token = await login(client, "stu9@example.edu", password="brandnewpass456")
    assert new_token is not None

