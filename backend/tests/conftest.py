"""Shared pytest fixtures for backend tests.

Scope note (DEVOPS-03): this only wires up an ASGI test client for
DB-independent routes (health, root). Endpoints that touch the database
(auth, tickets) need a real Postgres test database / migration-driven setup
and are intentionally NOT covered here — that's a separate task (see
task_board.md) so it can be given its own review rather than folded
silently into test scaffolding.
"""

from collections.abc import AsyncGenerator

import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
