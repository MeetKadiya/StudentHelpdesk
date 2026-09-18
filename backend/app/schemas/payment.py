"""Pydantic schemas for Payment Gateway orders, verification, and ledger records."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PaymentOrderCreateIn(BaseModel):
    amount: float = Field(..., gt=0, description="Amount in currency units (e.g. INR)")
    fee_type: str = Field(default="tuition", min_length=2, max_length=50)
    semester: str = Field(default="Semester 6 - Fall 2026", min_length=2, max_length=50)
    academic_year: str = Field(default="2025-2026", min_length=4, max_length=20)
    notes: str | None = None


class PaymentOrderOut(BaseModel):
    order_id: str
    amount: float
    currency: str
    fee_type: str
    semester: str
    academic_year: str
    gateway_provider: str
    key_id: str | None = None


class PaymentVerifyIn(BaseModel):
    order_id: str
    payment_id: str
    signature: str | None = None
    payment_method: str = Field(default="upi", description="upi, card, netbanking, wallet")
    payer_details: str | None = None


class PaymentTransactionOut(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID | None
    student_email: str
    order_id: str
    payment_id: str | None
    amount: float
    currency: str
    fee_type: str
    semester: str
    academic_year: str
    status: str
    payment_method: str | None
    gateway_provider: str
    receipt_no: str | None
    receipt_hash: str | None
    notes: str | None
    created_at: datetime
    completed_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class PaymentGatewayConfigIn(BaseModel):
    provider: str = Field(default="sandbox", pattern="^(sandbox|razorpay|stripe)$")
    razorpay_key_id: str | None = None
    razorpay_key_secret: str | None = None
    stripe_publishable_key: str | None = None
    stripe_secret_key: str | None = None
    is_test_mode: bool = True
    currency: str = Field(default="INR", max_length=10)


class PaymentGatewayConfigOut(BaseModel):
    id: uuid.UUID
    provider: str
    razorpay_key_id: str | None
    has_razorpay_secret: bool
    stripe_publishable_key: str | None
    has_stripe_secret: bool
    is_test_mode: bool
    currency: str
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaymentSummaryStatsOut(BaseModel):
    total_collected: float
    total_transactions: int
    successful_count: int
    pending_count: int
    active_provider: str
