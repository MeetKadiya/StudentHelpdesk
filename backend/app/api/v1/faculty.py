"""Faculty-facing endpoints (BACKEND-05). All routes require role='faculty'
(require_faculty, app/api/deps.py) and are scoped to tickets routed to the
caller (FR-19) — enforced server-side, not just hidden in the UI (FR-27)."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_faculty
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.faculty import (
    FacultyMessageOut,
    FacultyRespondIn,
    FacultyTicketDetailOut,
    FacultyTicketOut,
    VerifyResponseIn,
)
from app.services import faculty_service
from app.services.faculty_service import FacultyAccessError

router = APIRouter()


@router.get("", response_model=list[FacultyTicketOut])
async def list_routed_tickets(
    user: User = Depends(require_faculty),
    db: AsyncSession = Depends(get_db),
) -> list[FacultyTicketOut]:
    tickets = await faculty_service.list_routed_tickets(db, user.id)
    return [FacultyTicketOut.model_validate(t) for t in tickets]


@router.get("/{ticket_id}", response_model=FacultyTicketDetailOut)
async def get_routed_ticket(
    ticket_id: uuid.UUID,
    user: User = Depends(require_faculty),
    db: AsyncSession = Depends(get_db),
) -> FacultyTicketDetailOut:
    """Added alongside FRONTEND-04 (Claude-3) — see
    faculty_service.get_ticket_with_messages docstring."""
    try:
        ticket, messages = await faculty_service.get_ticket_with_messages(db, ticket_id, user.id)
    except FacultyAccessError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return FacultyTicketDetailOut(
        id=ticket.id,
        subject=ticket.subject,
        status=ticket.status,
        category=ticket.category,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        assigned_faculty_id=ticket.assigned_faculty_id,
        messages=[FacultyMessageOut.model_validate(m) for m in messages],
    )


@router.post(
    "/{ticket_id}/respond", response_model=FacultyMessageOut, status_code=status.HTTP_201_CREATED
)
async def respond_to_ticket(
    ticket_id: uuid.UUID,
    payload: FacultyRespondIn,
    user: User = Depends(require_faculty),
    db: AsyncSession = Depends(get_db),
) -> FacultyMessageOut:
    try:
        message = await faculty_service.respond_to_ticket(db, ticket_id, user.id, payload.content)
    except FacultyAccessError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return FacultyMessageOut.model_validate(message)


@router.post("/{ticket_id}/messages/{message_id}/verify", response_model=FacultyMessageOut)
async def verify_response(
    ticket_id: uuid.UUID,
    message_id: uuid.UUID,
    payload: VerifyResponseIn,
    user: User = Depends(require_faculty),
    db: AsyncSession = Depends(get_db),
) -> FacultyMessageOut:
    if not payload.verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un-verifying is not supported.",
        )
    try:
        message = await faculty_service.mark_message_verified(db, ticket_id, message_id, user.id)
    except FacultyAccessError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return FacultyMessageOut.model_validate(message)
