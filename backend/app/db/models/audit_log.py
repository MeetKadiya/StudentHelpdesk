"""audit_logs table — see project-management/database_schema.md (NFR-7).
Written by admin-facing mutating endpoints (BACKEND-06): role changes,
routing rule changes. Not read back by any endpoint yet — write-only
until an admin audit-log viewer is requested.

metadata uses plain sa.JSON, not postgresql.JSONB (2026-08-10, verified in
a sandbox this session): JSONB doesn't compile at all on SQLite
(`CompileError: can't render element of type JSONB`), which would silently
block any future test/CI fixture that uses SQLite instead of a real
Postgres instance — a likely choice for DEVOPS-04's CI workflow, since
spinning up Postgres in CI is extra setup. Nothing here queries the JSON
contents (no ->>, no GIN index), so JSONB's indexing/operator advantages
over JSON aren't in use yet; this can be revisited if that changes."""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    target: Mapped[str | None] = mapped_column(String(255), nullable=True)
    metadata_: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
