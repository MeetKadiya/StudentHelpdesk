"""Auth business logic — signup/login/refresh. Route handlers stay thin and
delegate here per coding_standards.md."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.models.user import User


class AuthError(Exception):
    """Raised for any auth failure the API layer should turn into a 4xx."""


async def signup(db: AsyncSession, email: str, password: str, role: str = "student") -> User:
    existing = await db.scalar(select(User).where(User.email == email))
    if existing is not None:
        raise AuthError("An account with this email already exists.")

    assigned_role = (
        role.lower().strip()
        if role.lower().strip() in ("student", "faculty", "admin", "clerk")
        else "student"
    )
    user = User(email=email, password_hash=hash_password(password), role=assigned_role)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def authenticate(db: AsyncSession, email: str, password: str) -> User:
    user = await db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(password, user.password_hash):
        raise AuthError("Invalid email or password.")
    return user


def issue_tokens(user: User) -> tuple[str, str]:
    user_id = str(user.id)
    return create_access_token(user_id), create_refresh_token(user_id)


async def refresh_access_token(db: AsyncSession, refresh_token: str) -> tuple[str, str]:
    payload = decode_token(refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise AuthError("Invalid or expired refresh token.")

    # Same fix as app/api/deps.py's get_current_user (2026-08-19, TEST-01) —
    # `sub` is a JWT string claim and must be parsed back into a real
    # uuid.UUID before use as a PK lookup; a bare str only ever worked
    # against asyncpg's driver-side coercion, not SQLAlchemy's generic
    # UUID(as_uuid=True) bind processor.
    try:
        user_id = uuid.UUID(payload["sub"])
    except (TypeError, ValueError, KeyError) as exc:
        raise AuthError("Invalid or expired refresh token.") from exc

    user = await db.get(User, user_id)
    if user is None:
        raise AuthError("User no longer exists.")

    return issue_tokens(user)
