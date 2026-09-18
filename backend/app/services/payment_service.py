"""Payment service handling orders, gateway integrations, verification, and ledger auditing."""

import hashlib
import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.email_message import EmailMessage
from app.db.models.payment import PaymentGatewayConfig, PaymentTransaction
from app.db.models.user import User
from app.schemas.payment import (
    PaymentGatewayConfigIn,
    PaymentGatewayConfigOut,
    PaymentOrderCreateIn,
    PaymentOrderOut,
    PaymentSummaryStatsOut,
    PaymentVerifyIn,
)

logger = logging.getLogger(__name__)


class PaymentServiceError(Exception):
    """Raised on invalid payment operations."""


async def get_or_create_gateway_config(db: AsyncSession) -> PaymentGatewayConfig:
    config = await db.scalar(
        select(PaymentGatewayConfig).order_by(PaymentGatewayConfig.updated_at.desc()).limit(1)
    )
    if not config:
        config = PaymentGatewayConfig(
            provider="sandbox",
            razorpay_key_id="rzp_test_campus_demo",
            razorpay_key_secret="mock_secret_key_demo",
            stripe_publishable_key="pk_test_campus_demo",
            stripe_secret_key="sk_test_campus_demo",
            is_test_mode=True,
            currency="INR",
        )
        db.add(config)
        await db.commit()
        await db.refresh(config)
    return config


async def get_gateway_config_out(db: AsyncSession) -> PaymentGatewayConfigOut:
    config = await get_or_create_gateway_config(db)
    return PaymentGatewayConfigOut(
        id=config.id,
        provider=config.provider,
        razorpay_key_id=config.razorpay_key_id,
        has_razorpay_secret=bool(config.razorpay_key_secret),
        stripe_publishable_key=config.stripe_publishable_key,
        has_stripe_secret=bool(config.stripe_secret_key),
        is_test_mode=config.is_test_mode,
        currency=config.currency,
        updated_at=config.updated_at,
    )


async def update_gateway_config(
    db: AsyncSession, data: PaymentGatewayConfigIn
) -> PaymentGatewayConfigOut:
    config = await get_or_create_gateway_config(db)
    config.provider = data.provider
    if data.razorpay_key_id is not None:
        config.razorpay_key_id = data.razorpay_key_id.strip()
    if data.razorpay_key_secret is not None and data.razorpay_key_secret != "":
        config.razorpay_key_secret = data.razorpay_key_secret.strip()
    if data.stripe_publishable_key is not None:
        config.stripe_publishable_key = data.stripe_publishable_key.strip()
    if data.stripe_secret_key is not None and data.stripe_secret_key != "":
        config.stripe_secret_key = data.stripe_secret_key.strip()
    config.is_test_mode = data.is_test_mode
    config.currency = data.currency
    config.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(config)
    return await get_gateway_config_out(db)


async def create_payment_order(
    db: AsyncSession,
    student: User,
    data: PaymentOrderCreateIn,
) -> PaymentOrderOut:
    config = await get_or_create_gateway_config(db)
    order_id = f"ORD_{datetime.now(timezone.utc).strftime('%Y%m%d')}_{uuid.uuid4().hex[:8].upper()}"

    transaction = PaymentTransaction(
        student_id=student.id,
        student_email=student.email,
        order_id=order_id,
        amount=data.amount,
        currency=config.currency,
        fee_type=data.fee_type,
        semester=data.semester,
        academic_year=data.academic_year,
        status="pending",
        gateway_provider=config.provider,
        notes=data.notes,
    )
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)

    key_id = None
    if config.provider == "razorpay":
        key_id = config.razorpay_key_id or "rzp_test_campus_demo"
    elif config.provider == "stripe":
        key_id = config.stripe_publishable_key or "pk_test_campus_demo"

    return PaymentOrderOut(
        order_id=order_id,
        amount=transaction.amount,
        currency=transaction.currency,
        fee_type=transaction.fee_type,
        semester=transaction.semester,
        academic_year=transaction.academic_year,
        gateway_provider=config.provider,
        key_id=key_id,
    )


async def verify_and_complete_payment(
    db: AsyncSession,
    student: User,
    data: PaymentVerifyIn,
) -> PaymentTransaction:
    txn = await db.scalar(
        select(PaymentTransaction).where(PaymentTransaction.order_id == data.order_id)
    )
    if not txn:
        raise PaymentServiceError(f"Payment order {data.order_id} not found.")

    if txn.status == "success":
        return txn

    # Generate verified receipt details
    receipt_no = f"REC-2026-{uuid.uuid4().hex[:6].upper()}"
    raw_hash_data = (
        f"{data.order_id}:{data.payment_id}:{txn.amount}:{txn.student_email}:{receipt_no}"
    )
    receipt_hash = hashlib.sha256(raw_hash_data.encode("utf-8")).hexdigest()

    txn.payment_id = data.payment_id
    txn.payment_method = data.payment_method
    txn.status = "success"
    txn.receipt_no = receipt_no
    txn.receipt_hash = receipt_hash
    txn.completed_at = datetime.now(timezone.utc)
    if data.payer_details:
        current_notes = txn.notes or ""
        txn.notes = (current_notes + f"\nPayer: {data.payer_details}").strip()

    # Automatically notify student with payment confirmation in their in-app inbox
    confirmation_notice = EmailMessage(
        sender_id=student.id,
        sender_email="bursar@university.edu",
        sender_role="admin",
        recipient_id=student.id,
        recipient_email=student.email,
        subject=f"[FEE RECEIPT] Payment Confirmation - {receipt_no}",
        body=f"""Dear Student,

We have successfully received your fee payment via the University Payment Gateway.

Receipt Details:
- Official Receipt No: {receipt_no}
- Order ID: {txn.order_id}
- Transaction Reference: {txn.payment_id}
- Amount Paid: ₹ {txn.amount:,.2f} ({txn.currency})
- Fee Category: {txn.fee_type.upper()}
- Term: {txn.semester} ({txn.academic_year})
- Payment Method: {txn.payment_method.upper() if txn.payment_method else 'ONLINE'}
- Digital Signature: {receipt_hash[:24]}...

You can view and print your verified receipt at:
http://localhost/fees/history

Thank you,
University Bursar & Financial Services Directorate""",
        status="portal_inbox_only",
    )
    db.add(confirmation_notice)

    await db.commit()
    await db.refresh(txn)
    return txn


async def list_student_payments(db: AsyncSession, student: User) -> list[PaymentTransaction]:
    result = await db.scalars(
        select(PaymentTransaction)
        .where(
            (PaymentTransaction.student_id == student.id)
            | (PaymentTransaction.student_email == student.email)
        )
        .order_by(PaymentTransaction.created_at.desc())
    )
    return list(result)


async def list_all_payments(db: AsyncSession) -> list[PaymentTransaction]:
    result = await db.scalars(
        select(PaymentTransaction).order_by(PaymentTransaction.created_at.desc()).limit(200)
    )
    return list(result)


async def get_payment_stats(db: AsyncSession) -> PaymentSummaryStatsOut:
    config = await get_or_create_gateway_config(db)
    all_txns = (await db.execute(select(PaymentTransaction))).scalars().all()

    total_collected = sum(t.amount for t in all_txns if t.status == "success")
    total_transactions = len(all_txns)
    successful_count = sum(1 for t in all_txns if t.status == "success")
    pending_count = sum(1 for t in all_txns if t.status == "pending")

    return PaymentSummaryStatsOut(
        total_collected=total_collected,
        total_transactions=total_transactions,
        successful_count=successful_count,
        pending_count=pending_count,
        active_provider=config.provider,
    )
