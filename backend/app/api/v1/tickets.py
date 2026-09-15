"""Student-facing ticket endpoints: create, list, detail, follow-up
messages, status poll. See api_contract.md. All routes scoped to the
authenticated student via get_current_user (app/api/deps.py)."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.ticket import (
    MessageCreate,
    MessageOut,
    TicketCreate,
    TicketDetailOut,
    TicketOut,
    TicketStatusOut,
)
from app.services import ticket_service
from app.services.ticket_service import TicketAccessError

router = APIRouter()


@router.post("", response_model=TicketOut, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    payload: TicketCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TicketOut:
    ticket = await ticket_service.create_ticket(
        db, user.id, payload.subject, payload.message, payload.category
    )
    return TicketOut.model_validate(ticket)


@router.get("", response_model=list[TicketOut])
async def list_tickets(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[TicketOut]:
    tickets = await ticket_service.list_tickets_for_student(db, user.id)
    return [TicketOut.model_validate(t) for t in tickets]


@router.get("/{ticket_id}", response_model=TicketDetailOut)
async def get_ticket(
    ticket_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TicketDetailOut:
    try:
        ticket, messages = await ticket_service.get_ticket_with_messages(db, ticket_id, user.id)
    except TicketAccessError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return TicketDetailOut(
        id=ticket.id,
        subject=ticket.subject,
        status=ticket.status,
        category=ticket.category,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        messages=[MessageOut.model_validate(m) for m in messages],
    )


@router.post(
    "/{ticket_id}/messages", response_model=MessageOut, status_code=status.HTTP_201_CREATED
)
async def add_message(
    ticket_id: uuid.UUID,
    payload: MessageCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageOut:
    try:
        message = await ticket_service.add_message(db, ticket_id, user.id, payload.content)
    except TicketAccessError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return MessageOut.model_validate(message)


@router.get("/{ticket_id}/status", response_model=TicketStatusOut)
async def get_status(
    ticket_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TicketStatusOut:
    try:
        ticket = await ticket_service.get_ticket_status(db, ticket_id, user.id)
    except TicketAccessError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return TicketStatusOut.model_validate(ticket)
