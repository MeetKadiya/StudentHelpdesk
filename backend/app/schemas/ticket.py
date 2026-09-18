"""Request/response schemas for student-facing ticket endpoints."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TicketCreate(BaseModel):
    subject: str | None = None
    category: str | None = None
    branch: str | None = None
    semester: str | None = None
    message: str = Field(..., min_length=1, description="Initial question content.")


class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1)


class MessageOut(BaseModel):
    id: uuid.UUID
    sender_type: str
    sender_id: uuid.UUID | None
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TicketOut(BaseModel):
    id: uuid.UUID
    subject: str | None
    status: str
    category: str | None
    branch: str | None = None
    semester: str | None = None
    forwarded_to: str | None = None
    clerk_notes: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TicketDetailOut(TicketOut):
    messages: list[MessageOut]


class TicketStatusOut(BaseModel):
    id: uuid.UUID
    status: str

    model_config = ConfigDict(from_attributes=True)
