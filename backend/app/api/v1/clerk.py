import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_clerk
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.clerk import (
    ClerkForwardIn,
    ClerkRespondIn,
    ClerkStatsOut,
    ClerkTicketDetailOut,
    ClerkTicketOut,
)
from app.services import clerk_portal_service

router = APIRouter()


@router.get("/stats", response_model=ClerkStatsOut)
async def get_clerk_stats(
    _: User = Depends(require_clerk),
    db: AsyncSession = Depends(get_db),
) -> ClerkStatsOut:
    return await clerk_portal_service.get_clerk_stats(db)


@router.get("/faculty", response_model=list[dict[str, str]])
async def list_faculty_members(
    _: User = Depends(require_clerk),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, str]]:
    return await clerk_portal_service.list_faculty_members(db)


@router.get("/tickets", response_model=list[ClerkTicketOut])
async def list_tickets(
    branch: str | None = Query(None),
    semester: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    forwarded_to: str | None = Query(None),
    _: User = Depends(require_clerk),
    db: AsyncSession = Depends(get_db),
) -> list[ClerkTicketOut]:
    return await clerk_portal_service.list_clerk_tickets(
        db,
        branch=branch,
        semester=semester,
        status_filter=status_filter,
        forwarded_to=forwarded_to,
    )


@router.get("/tickets/{ticket_id}", response_model=ClerkTicketDetailOut)
async def get_ticket_detail(
    ticket_id: uuid.UUID,
    _: User = Depends(require_clerk),
    db: AsyncSession = Depends(get_db),
) -> ClerkTicketDetailOut:
    detail = await clerk_portal_service.get_clerk_ticket_detail(db, ticket_id)
    if not detail:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found.")
    return detail


@router.post("/tickets/{ticket_id}/forward", response_model=ClerkTicketDetailOut)
async def forward_ticket(
    ticket_id: uuid.UUID,
    payload: ClerkForwardIn,
    user: User = Depends(require_clerk),
    db: AsyncSession = Depends(get_db),
) -> ClerkTicketDetailOut:
    detail = await clerk_portal_service.forward_ticket(db, ticket_id, user, payload)
    if not detail:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found.")
    return detail


@router.post("/tickets/{ticket_id}/respond", response_model=ClerkTicketDetailOut)
async def respond_to_ticket(
    ticket_id: uuid.UUID,
    payload: ClerkRespondIn,
    user: User = Depends(require_clerk),
    db: AsyncSession = Depends(get_db),
) -> ClerkTicketDetailOut:
    detail = await clerk_portal_service.respond_to_ticket(db, ticket_id, user, payload)
    if not detail:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found.")
    return detail
