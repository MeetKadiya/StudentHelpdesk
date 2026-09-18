"""Schemas for direct email system (Faculty/Admin to Student) and SMTP configuration."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class EmailSendIn(BaseModel):
    recipient_email: EmailStr
    subject: str = Field(..., min_length=1, max_length=255)
    body: str = Field(..., min_length=1)


class BroadcastEmailIn(BaseModel):
    subject: str = Field(..., min_length=1, max_length=255)
    body: str = Field(..., min_length=1)
    target_group: str = Field(default="all_students")


class BroadcastEmailResultOut(BaseModel):
    total_recipients: int
    delivered_smtp_count: int
    portal_saved_count: int
    failed_smtp_count: int
    recipient_emails: list[str]
    subject: str
    status_summary: str


class EmailOut(BaseModel):
    id: uuid.UUID
    sender_id: uuid.UUID
    sender_email: str
    sender_role: str
    recipient_email: str
    recipient_id: uuid.UUID | None
    subject: str
    body: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StudentRecipientOut(BaseModel):
    id: uuid.UUID
    email: str
    role: str

    model_config = ConfigDict(from_attributes=True)


class SmtpConfigIn(BaseModel):
    smtp_host: str = Field(..., min_length=1, max_length=255)
    smtp_port: int = Field(default=587, ge=1, le=65535)
    smtp_user: str = Field(..., min_length=1, max_length=255)
    smtp_password: str | None = None
    smtp_tls: bool = True
    from_email: str | None = None
    from_name: str = "University Faculty & Academic Advising"
    is_active: bool = True


class SmtpConfigOut(BaseModel):
    id: uuid.UUID
    smtp_host: str
    smtp_port: int
    smtp_user: str
    has_password: bool
    smtp_tls: bool
    from_email: str
    from_name: str
    is_active: bool
    last_status: str | None
    last_tested_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class SmtpTestIn(BaseModel):
    test_recipient: EmailStr
