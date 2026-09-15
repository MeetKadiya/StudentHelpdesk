"""Shared test helpers for integration tests."""

from httpx import AsyncClient


async def login(client: AsyncClient, email: str, password: str = "testpass123") -> str:
    """Logs in via the real /auth/login endpoint and returns a bearer access token."""
    resp = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": password}
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def auth_headers(token: str) -> dict[str, str]:
    """Generates bearer authorization headers."""
    return {"Authorization": f"Bearer {token}"}
