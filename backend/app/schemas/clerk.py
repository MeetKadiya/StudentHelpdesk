import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.ticket import MessageOut


class ClerkTicketOut(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    student_email: str | None = None
    subject: str | None
    status: str
    category: str | None
    branch: str | None = None
    semester: str | None = None
    forwarded_to: str | None = None
    clerk_notes: str | None = None
    assigned_faculty_id: uuid.UUID | None = None
    assigned_faculty_email: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ClerkTicketDetailOut(ClerkTicketOut):
    messages: list[MessageOut] = []


class ClerkForwardIn(BaseModel):
    target_role: str = Field(..., pattern="^(faculty|admin)$")
    assigned_faculty_id: uuid.UUID | None = None
    branch: str | None = None
    semester: str | None = None
    clerk_notes: str = Field(..., min_length=1)


class ClerkRespondIn(BaseModel):
    content: str = Field(..., min_length=1)
    status: str | None = None


class ClerkStatsOut(BaseModel):
    total_tickets: int
    pending_tickets: int
    forwarded_to_faculty: int
    forwarded_to_admin: int
    resolved_tickets: int
    by_branch: dict[str, int]
    by_semester: dict[str, int]
