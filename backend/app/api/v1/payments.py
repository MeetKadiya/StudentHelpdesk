"""Payment Gateway API endpoints for checkout orders, verification, and ledger records."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.payment import (
    PaymentGatewayConfigIn,
    PaymentGatewayConfigOut,
    PaymentOrderCreateIn,
    PaymentOrderOut,
    PaymentSummaryStatsOut,
    PaymentTransactionOut,
    PaymentVerifyIn,
)
from app.services import payment_service
from app.services.payment_service import PaymentServiceError

router = APIRouter()
require_admin = require_role("admin")
require_staff_or_admin = require_role("faculty", "admin")


@router.post("/create-order", response_model=PaymentOrderOut, status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: PaymentOrderCreateIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaymentOrderOut:
    """Creates a new payment gateway checkout order for fee payment."""
    try:
        return await payment_service.create_payment_order(db, current_user, payload)
    except PaymentServiceError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/verify", response_model=PaymentTransactionOut)
async def verify_payment(
    payload: PaymentVerifyIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaymentTransactionOut:
    """Verifies payment completion, records ledger transaction, and issues official receipt."""
    try:
        txn = await payment_service.verify_and_complete_payment(db, current_user, payload)
        return PaymentTransactionOut.model_validate(txn)
    except PaymentServiceError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/history", response_model=list[PaymentTransactionOut])
async def get_my_payments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[PaymentTransactionOut]:
    """Returns the authenticated student's fee payment history and official receipts."""
    txns = await payment_service.list_student_payments(db, current_user)
    return [PaymentTransactionOut.model_validate(t) for t in txns]


@router.get("/all", response_model=list[PaymentTransactionOut])
async def get_all_payments(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[PaymentTransactionOut]:
    """Admin only: Lists all student payment transactions across the university."""
    txns = await payment_service.list_all_payments(db)
    return [PaymentTransactionOut.model_validate(t) for t in txns]


@router.get("/stats", response_model=PaymentSummaryStatsOut)
async def get_payment_stats(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> PaymentSummaryStatsOut:
    """Admin only: Retrieves campus fee collections overview and gateway status metrics."""
    return await payment_service.get_payment_stats(db)


@router.get("/config", response_model=PaymentGatewayConfigOut)
async def get_gateway_config(
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaymentGatewayConfigOut:
    """Retrieves active payment gateway provider and public client keys."""
    return await payment_service.get_gateway_config_out(db)


@router.post("/config", response_model=PaymentGatewayConfigOut)
async def update_gateway_config(
    payload: PaymentGatewayConfigIn,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> PaymentGatewayConfigOut:
    """Admin only: Updates payment gateway provider (Sandbox, Razorpay, or Stripe) and credentials."""
    return await payment_service.update_gateway_config(db, payload)
