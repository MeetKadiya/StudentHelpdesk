"""Exam models: ExamControlSetting (Start/Stop exam form) and ExamRegistration."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class ExamControlSetting(Base):
    __tablename__ = "exam_control_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    session_name: Mapped[str] = mapped_column(
        String(255), nullable=False, default="Summer / Spring 2026 Regular & Remedial"
    )
    start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    end_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    announcement: Mapped[str | None] = mapped_column(Text, nullable=True)
    fee_amount: Mapped[int] = mapped_column(Integer, nullable=False, default=1200)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


class ExamRegistration(Base):
    __tablename__ = "exam_registrations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    enrollment_number: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    student_name: Mapped[str] = mapped_column(String(255), nullable=False)
    student_email: Mapped[str] = mapped_column(String(255), nullable=False)
    branch: Mapped[str] = mapped_column(String(100), nullable=False)
    semester: Mapped[str] = mapped_column(String(30), nullable=False)
    papers: Mapped[str] = mapped_column(Text, nullable=False)  # JSON string
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="submitted")
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
