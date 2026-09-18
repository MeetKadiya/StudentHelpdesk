"""Payment models for tuition, examination, and campus fee transactions."""

import uuid

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class PaymentTransaction(Base):
    """Immutable ledger record of a student fee payment transaction."""

    __tablename__ = "payment_transactions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    student_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    student_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    order_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    payment_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    fee_type: Mapped[str] = mapped_column(String(50), default="tuition", nullable=False)
    semester: Mapped[str] = mapped_column(String(50), default="Semester 6 - Fall 2026", nullable=False)
    academic_year: Mapped[str] = mapped_column(String(20), default="2025-2026", nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False, index=True)
    payment_method: Mapped[str | None] = mapped_column(String(50), nullable=True)
    gateway_provider: Mapped[str] = mapped_column(String(30), default="sandbox", nullable=False)
    receipt_no: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True, index=True)
    receipt_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    completed_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    student = relationship("User", foreign_keys=[student_id])


class PaymentGatewayConfig(Base):
    """Configures active payment gateway provider and API credentials."""

    __tablename__ = "payment_gateway_configs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    provider: Mapped[str] = mapped_column(String(30), default="sandbox", nullable=False)
    razorpay_key_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    razorpay_key_secret: Mapped[str | None] = mapped_column(String(255), nullable=True)
    stripe_publishable_key: Mapped[str | None] = mapped_column(String(255), nullable=True)
    stripe_secret_key: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_test_mode: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
