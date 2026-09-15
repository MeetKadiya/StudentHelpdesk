"""Root-level cross-service integration/E2E test fixtures (TEST-01).

Distinct from backend/tests/ (backend-unit-tests, DB-independent so far)
and agents/tests/ (AI-pipeline-unit-tests) per folder_structure.md's
tests/ section. Drives the REAL FastAPI app (backend/app) through the
REAL ASGI stack -- HTTP routing, Pydantic validation, and RBAC dependency
injection -- against an in-memory SQLite database. This is a genuine
step up from every prior session's verification of this flow: BACKEND-05/
06/07's "11-step smoke test" and AI-05's enqueue verification were both
done by calling service-layer functions directly (see task_board.md),
never through actual HTTP requests hitting FastAPI's router + Depends()
chain the way a real client would. RBAC (require_admin/require_faculty),
Pydantic request validation, and status-code mapping were never actually
exercised end-to-end before this file.

Celery's send_task is patched (app.services.ai_dispatch_service.
_celery_client) so job payloads can be asserted on exactly, rather than
relying on the fail-open ConnectionError path against an unreachable
broker (that path is already covered by BACKEND-07's own sandbox tests).

Known, disclosed gap this fixture surfaced (see task_board.md's TEST-01
entry): there is no in-product way to create the first admin account --
signup (auth_service.signup) hardcodes role="student", and the only role-
promotion path (PATCH /admin/users/{id}/role) itself requires an existing
admin. make_user below bootstraps roles directly at the DB layer to work
around this for testing; production has no equivalent workaround.
"""

import sys
from collections.abc import AsyncGenerator
from pathlib import Path
from unittest.mock import MagicMock

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.core.security import hash_password
from app.db.models import *
from app.db.models.user import User
from app.db.session import Base, get_db
from app.main import app
from app.services import ai_dispatch_service


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Fresh in-memory SQLite schema per test. StaticPool keeps every
    checkout on the same underlying connection -- required for an
    in-memory SQLite DB to stay visible across the several AsyncSession
    instances a real request cycle creates (one via get_db per request,
    one held directly by the test)."""
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(
        bind=engine, class_=AsyncSession, expire_on_commit=False
    )

    async def _get_db_override() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = _get_db_override

    async with session_factory() as session:
        yield session

    app.dependency_overrides.pop(get_db, None)
    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def mock_celery(monkeypatch: pytest.MonkeyPatch) -> MagicMock:
    mock_client = MagicMock()
    monkeypatch.setattr(ai_dispatch_service, "_celery_client", mock_client)
    return mock_client


@pytest_asyncio.fixture
async def make_user(db_session: AsyncSession):
    async def _make(
        email: str, password: str = "testpass123", role: str = "student"
    ) -> User:
        user = User(email=email, password_hash=hash_password(password), role=role)
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        return user

    return _make


from tests.helpers import auth_headers, login  # noqa: F401
