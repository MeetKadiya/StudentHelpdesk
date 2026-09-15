"""Request/response schemas for faculty-facing endpoints (BACKEND-05)."""

import uuid

from pydantic import BaseModel, Field

from app.schemas.ticket import MessageOut, TicketOut


class FacultyTicketOut(TicketOut):
    """Same shape as the student TicketOut plus who it's assigned to —
    faculty only ever see tickets routed to them (FR-19), so this is
    scoped at the query layer, not by hiding a field."""

    assigned_faculty_id: uuid.UUID | None


class FacultyRespondIn(BaseModel):
    content: str = Field(..., min_length=1)


class FacultyMessageOut(MessageOut):
    is_verified: bool


class FacultyTicketDetailOut(FacultyTicketOut):
    """Added alongside FRONTEND-04 (Claude-3) — GET /faculty/tickets only
    ever returned the list shape (no messages), but responding/verifying
    requires seeing the thread first (and verify needs a message_id the
    faculty UI has no other way to discover). Mirrors
    ticket.TicketDetailOut's pattern exactly, just faculty-scoped and with
    FacultyMessageOut so is_verified is visible per message."""

    messages: list[FacultyMessageOut]


class VerifyResponseIn(BaseModel):
    verified: bool = True
