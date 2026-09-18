"""Admin-facing endpoints (BACKEND-06): routing rules + user role
management (FR-20, FR-21). All routes require_admin (app/api/deps.py)."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.admin import (
    AdminTicketDetailOut,
    AdminTicketOut,
    AdminTicketReassign,
    AdminTicketRespond,
    AnalyticsSummaryOut,
    KbApprovalResultOut,
    PendingKbItemOut,
    RoutingRuleCreate,
    RoutingRuleOut,
    UserRoleUpdate,
)
from app.schemas.auth import UserOut
from app.schemas.ticket import MessageOut
from app.services import admin_service
from app.services.admin_service import AdminServiceError

router = APIRouter()


@router.get("/routing-rules", response_model=list[RoutingRuleOut])
async def list_routing_rules(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[RoutingRuleOut]:
    rules = await admin_service.list_routing_rules(db)
    return [RoutingRuleOut.model_validate(r) for r in rules]


@router.post("/routing-rules", response_model=RoutingRuleOut, status_code=status.HTTP_201_CREATED)
async def create_routing_rule(
    payload: RoutingRuleCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> RoutingRuleOut:
    try:
        rule = await admin_service.create_routing_rule(
            db, admin.id, payload.category, payload.faculty_id
        )
    except AdminServiceError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return RoutingRuleOut.model_validate(rule)


@router.delete("/routing-rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_routing_rule(
    rule_id: uuid.UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    try:
        await admin_service.delete_routing_rule(db, admin.id, rule_id)
    except AdminServiceError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/users", response_model=list[UserOut])
async def list_users(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[UserOut]:
    users = await admin_service.list_users(db)
    return [UserOut.model_validate(u) for u in users]


@router.patch("/users/{user_id}/role", response_model=UserOut)
async def update_user_role(
    user_id: uuid.UUID,
    payload: UserRoleUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    try:
        user = await admin_service.update_user_role(db, admin.id, user_id, payload.role)
    except AdminServiceError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return UserOut.model_validate(user)


@router.get("/analytics/summary", response_model=AnalyticsSummaryOut)
async def get_analytics_summary(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AnalyticsSummaryOut:
    summary = await admin_service.get_analytics_summary(db)
    return AnalyticsSummaryOut.model_validate(summary)


@router.get("/knowledgebase/pending", response_model=list[PendingKbItemOut])
async def list_pending_kb_approvals(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[PendingKbItemOut]:
    """Returns faculty-verified answers awaiting Admin approval before knowledge base indexing."""
    items = await admin_service.list_pending_kb_approvals(db)
    return [PendingKbItemOut.model_validate(i) for i in items]


@router.post("/knowledgebase/{message_id}/approve", response_model=KbApprovalResultOut)
async def approve_kb_entry(
    message_id: uuid.UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> KbApprovalResultOut:
    """Admin approves a faculty-verified answer to be ingested into the FAISS knowledge base."""
    try:
        result = await admin_service.approve_kb_entry(db, admin.id, message_id)
        return KbApprovalResultOut.model_validate(result)
    except AdminServiceError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/knowledgebase/{message_id}/reject", response_model=KbApprovalResultOut)
async def reject_kb_entry(
    message_id: uuid.UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> KbApprovalResultOut:
    """Admin rejects a faculty-verified answer from being ingested into the knowledge base."""
    try:
        result = await admin_service.reject_kb_entry(db, admin.id, message_id)
        return KbApprovalResultOut.model_validate(result)
    except AdminServiceError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# Clerk Assistant Inquiries & Triage Queue (Admin Desk)
# ---------------------------------------------------------------------------


@router.get("/tickets", response_model=list[AdminTicketOut])
async def list_admin_tickets(
    target_role: str | None = None,
    category: str | None = None,
    status: str | None = None,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[AdminTicketOut]:
    """Lists all student inquiries across the institution, sorted by Clerk Assistant triage destination."""
    items = await admin_service.list_all_tickets(
        db, target_role=target_role, category=category, status_filter=status
    )
    return [AdminTicketOut.model_validate(item) for item in items]


@router.get("/tickets/{ticket_id}", response_model=AdminTicketDetailOut)
async def get_admin_ticket(
    ticket_id: uuid.UUID,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminTicketDetailOut:
    """Gets complete ticket details, full conversation thread, and Clerk triage metadata."""
    try:
        detail = await admin_service.get_admin_ticket_detail(db, ticket_id)
        return AdminTicketDetailOut.model_validate(detail)
    except AdminServiceError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post(
    "/tickets/{ticket_id}/respond", response_model=MessageOut, status_code=status.HTTP_201_CREATED
)
async def respond_to_ticket_as_admin(
    ticket_id: uuid.UUID,
    payload: AdminTicketRespond,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> MessageOut:
    """Administrator replies directly to a student ticket."""
    try:
        message = await admin_service.respond_as_admin(db, ticket_id, admin.id, payload.content)
        return MessageOut.model_validate(message)
    except AdminServiceError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/tickets/{ticket_id}/reassign", response_model=AdminTicketOut)
async def reassign_ticket_queue(
    ticket_id: uuid.UUID,
    payload: AdminTicketReassign,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminTicketOut:
    """Reassigns a ticket between Faculty and Administration queues, or changes its department."""
    try:
        ticket = await admin_service.reassign_ticket(
            db,
            ticket_id,
            admin.id,
            assigned_to_id=payload.assigned_to_id,
            new_category=payload.category,
            new_status=payload.status,
        )
        detail = await admin_service.get_admin_ticket_detail(db, ticket.id)
        return AdminTicketOut.model_validate(detail)
    except AdminServiceError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
