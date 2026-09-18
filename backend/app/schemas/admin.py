"""Request/response schemas for admin-facing endpoints (BACKEND-06):
routing rules + user role management (FR-20, FR-21). UserOut is NOT
redefined here — reuses app.schemas.auth.UserOut (same shape, avoid a
second near-identical class)."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas.auth import UserOut
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
    role: str = Field(..., pattern="^(student|faculty|admin|clerk)$")


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


# --- Student & Faculty Provisioning Schemas ---


class StudentCreateIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    enrollment_number: str = Field(..., min_length=4, max_length=64)
    phone_number: str = Field(..., min_length=7, max_length=32)
    branch: str = Field(..., min_length=2, max_length=100)
    course: str = Field(default="B.Tech", max_length=100)
    semester: str = Field(default="Sem 1", max_length=30)
    password: str | None = None


class FacultyCreateIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    department: str = Field(..., min_length=2, max_length=100)
    phone_number: str | None = None
    title: str = Field(default="Assistant Professor", max_length=100)
    password: str | None = None


class ClerkCreateIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    department: str = Field(default="Student Helpdesk", max_length=100)
    phone_number: str | None = None
    password: str | None = None


class AdminCreateIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    phone_number: str | None = None
    password: str | None = None


class ImportedStudentItem(BaseModel):
    name: str
    email: str
    enrollment_number: str
    phone_number: str
    branch: str
    course: str
    semester: str
    temp_password: str
    email_dispatched: bool = True
    sms_dispatched: bool = True


class StudentCsvImportResult(BaseModel):
    total_rows: int
    created_count: int
    skipped_count: int
    created_students: list[ImportedStudentItem]
    errors: list[str]


# --- Exam Form Controller Schemas ---


class ExamControlStatusOut(BaseModel):
    id: int
    is_active: bool
    session_name: str
    start_date: datetime | None = None
    end_date: datetime | None = None
    announcement: str | None = None
    fee_amount: int
    total_registrations: int = 0
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ExamControlToggleIn(BaseModel):
    is_active: bool
    session_name: str | None = None
    announcement: str | None = None
    fee_amount: int | None = None


class ExamRegistrationItemOut(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    enrollment_number: str
    student_name: str
    student_email: str
    branch: str
    semester: str
    papers: str
    status: str
    submitted_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Student 360 Comprehensive Inspection Schema ---


class Student360OverviewOut(BaseModel):
    student: UserOut
    fees_summary: dict[str, Any]
    marks: list[dict[str, Any]]
    spi: float | None = None
    cpi: float | None = None
    assignments: list[dict[str, Any]]
    attendance: dict[str, Any]
    exam_registration: dict[str, Any] | None = None
