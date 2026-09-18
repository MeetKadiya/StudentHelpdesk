"""Request/response schemas for admin-facing endpoints (BACKEND-06):
routing rules + user role management (FR-20, FR-21). UserOut is NOT
redefined here — reuses app.schemas.auth.UserOut (same shape, avoid a
second near-identical class)."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.ticket import MessageOut


class RoutingRuleCreate(BaseModel):
    category: str = Field(..., min_length=1, max_length=100)
    faculty_id: uuid.UUID


class RoutingRuleOut(BaseModel):
    id: uuid.UUID
    category: str
    faculty_id: uuid.UUID
    created_by: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserRoleUpdate(BaseModel):
    role: str = Field(..., pattern="^(student|faculty|admin)$")


class AnalyticsSummaryOut(BaseModel):
    """FRONTEND-05's data source (2026-08-19). Every field is a real
    aggregate, defined precisely so the frontend doesn't have to guess:
    """

    total_tickets: int
    tickets_by_status: dict[str, int]
    # escalated_tickets / total_tickets. None if total_tickets == 0.
    escalation_rate: float | None
    # Average seconds between a ticket's creation and its first non-student
    # message (staff or ai_agent), averaged only over tickets that have
    # received at least one. None if no ticket has one yet.
    avg_first_response_seconds: float | None
    # Average of agent_runs.confidence across all runs where it was set.
    # This is a confidence proxy, not a measured correctness rate — there
    # is no ground-truth labeling in this system to compute real accuracy
    # against. Named accordingly, not as "accuracy", to avoid overclaiming.
    avg_agent_confidence: float | None
    # completed agent_runs / total agent_runs (excludes running/error). A
    ai_auto_resolution_rate: float | None


class PendingKbItemOut(BaseModel):
    message_id: uuid.UUID
    ticket_id: uuid.UUID
    category: str | None
    question: str
    answer: str
    faculty_id: uuid.UUID | None
    faculty_email: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class KbApprovalResultOut(BaseModel):
    status: str
    message_id: uuid.UUID
    chunks_indexed: int | None = None


class AdminTicketOut(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    student_email: str | None = None
    subject: str | None = None
    category: str | None = None
    status: str
    assigned_faculty_id: uuid.UUID | None = None
    assigned_name: str | None = None
    target_role: str | None = None  # "admin" vs "faculty"
    department: str | None = None
    priority: str = "normal"
    snippet: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminTicketDetailOut(AdminTicketOut):
    messages: list[MessageOut]


class AdminTicketRespond(BaseModel):
    content: str = Field(..., min_length=1)


class AdminTicketReassign(BaseModel):
    assigned_to_id: uuid.UUID | None = None
    category: str | None = None
    status: str | None = None
