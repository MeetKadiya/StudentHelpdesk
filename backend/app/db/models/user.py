"""users table — see project-management/database_schema.md."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="student")
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    enrollment_number: Mapped[str | None] = mapped_column(
        String(64), unique=True, nullable=True, index=True
    )
    phone_number: Mapped[str | None] = mapped_column(
        String(32), unique=True, nullable=True, index=True
    )
    branch: Mapped[str | None] = mapped_column(String(100), nullable=True)
    course: Mapped[str | None] = mapped_column(String(100), nullable=True)
    semester: Mapped[str | None] = mapped_column(String(30), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
