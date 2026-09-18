"""Auth dependencies for protected routes — used by future ticket endpoints
(BACKEND-04) and admin endpoints."""

import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.db.models.user import User
from app.db.session import get_db

# tokenUrl is documentation-only here (points at the login endpoint) — actual
# verification is our own JWT decode, not OAuth2 password flow machinery.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        raise credentials_error

    # JWT claims are always strings (RFC 7519) — `sub` must be parsed back
    # into a uuid.UUID before use as a PK lookup. Found 2026-08-19 (TEST-01,
    # first real HTTP-level test of this dependency): passing the raw str
    # straight into db.get() only ever worked by accident against asyncpg,
    # which accepts either a str or a uuid.UUID for a UUID column and
    # coerces it driver-side. SQLAlchemy's own Python-side UUID(as_uuid=True)
    # bind processor (used for every non-asyncpg-native path, including the
    # SQLite this session's tests actually run against) requires a real
    # uuid.UUID instance and raises AttributeError on a bare str. Also
    # invalid-UUID-safe: a malformed/tampered `sub` now fails auth cleanly
    # instead of surfacing as an unrelated 500 from the DB layer.
    try:
        user_id = uuid.UUID(payload.get("sub"))
    except (TypeError, ValueError) as exc:
        raise credentials_error from exc

    user = await db.get(User, user_id)
    if user is None:
        raise credentials_error

    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return user


def require_role(*roles: str):
    """Factory for role-gated dependencies (BACKEND-05/06). Generalizes
    require_admin's pattern instead of duplicating it per role — RBAC is
    enforced here at the dependency-injection layer (FR-27), never trusted
    from the frontend alone."""

    async def _check(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of roles: {', '.join(roles)}.",
            )
        return user

    return _check


require_faculty = require_role("faculty")
require_clerk = require_role("clerk", "admin")
