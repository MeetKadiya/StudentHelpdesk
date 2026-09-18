"""Student academic record models: persistent student marks, SPI/CPI, and grades."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class StudentMark(Base):
    __tablename__ = "student_marks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    enrollment_number: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    subject_code: Mapped[str] = mapped_column(String(50), nullable=False)
    subject_name: Mapped[str] = mapped_column(String(255), nullable=False)
    semester: Mapped[str] = mapped_column(String(30), nullable=False)
    internal_marks: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    midterm_marks: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    final_marks: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    total_marks: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    grade: Mapped[str] = mapped_column(String(10), nullable=False, default="AA")
    grade_points: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    credits: Mapped[int] = mapped_column(Integer, nullable=False, default=4)
    spi: Mapped[float | None] = mapped_column(Float, nullable=True)
    cpi: Mapped[float | None] = mapped_column(Float, nullable=True)
    academic_year: Mapped[str] = mapped_column(String(20), nullable=False, default="2025-2026")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
