"""Direct Email Communication Endpoints (FR-28) and SMTP Configuration."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.email import (
    BroadcastEmailIn,
    BroadcastEmailResultOut,
    EmailOut,
    EmailSendIn,
    SmtpConfigIn,
    SmtpConfigOut,
    SmtpTestIn,
    StudentRecipientOut,
)
from app.services import email_service
from app.services.email_service import EmailServiceError

router = APIRouter()
require_staff_or_admin = require_role("faculty", "admin")


@router.post("/send", response_model=EmailOut, status_code=status.HTTP_201_CREATED)
async def send_email(
    payload: EmailSendIn,
    sender: User = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
) -> EmailOut:
    """Allows Faculty and Admin to send official emails directly to students."""
    try:
        email = await email_service.send_email_to_student(
            db, sender, payload.recipient_email, payload.subject, payload.body
        )
        return EmailOut.model_validate(email)
    except EmailServiceError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/broadcast", response_model=BroadcastEmailResultOut, status_code=status.HTTP_201_CREATED)
async def broadcast_email(
    payload: BroadcastEmailIn,
    sender: User = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
) -> BroadcastEmailResultOut:
    """Allows Faculty and Admin to broadcast announcements to all registered students."""
    try:
        return await email_service.send_broadcast_email(
            db, sender, payload.subject, payload.body, payload.target_group
        )
    except EmailServiceError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc



@router.get("/sent", response_model=list[EmailOut])
async def list_sent_emails(
    sender: User = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
) -> list[EmailOut]:
    """Returns sent emails history for faculty / admin."""
    emails = await email_service.list_sent_emails(db, sender)
    return [EmailOut.model_validate(e) for e in emails]


@router.get("/inbox", response_model=list[EmailOut])
async def get_student_inbox(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[EmailOut]:
    """Returns received emails for the authenticated student."""
    emails = await email_service.list_inbox_emails(db, current_user)
    return [EmailOut.model_validate(e) for e in emails]


@router.get("/students", response_model=list[StudentRecipientOut])
async def get_students_directory(
    _: User = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
) -> list[StudentRecipientOut]:
    """Returns directory of registered students for email autocomplete/dropdown."""
    students = await email_service.list_students_directory(db)
    return [StudentRecipientOut.model_validate(s) for s in students]


@router.get("/smtp", response_model=SmtpConfigOut)
async def get_smtp_config(
    _: User = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
) -> SmtpConfigOut:
    """Retrieves current SMTP server configuration and connection status."""
    return await email_service.get_smtp_config_out(db)


@router.post("/smtp", response_model=SmtpConfigOut)
async def update_smtp_config(
    payload: SmtpConfigIn,
    _: User = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
) -> SmtpConfigOut:
    """Updates SMTP server settings for live mailbox delivery."""
    return await email_service.update_smtp_config(db, payload)


@router.post("/smtp/test")
async def test_smtp_connection(
    payload: SmtpTestIn,
    _: User = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Sends a verification email through the configured SMTP server."""
    try:
        return await email_service.test_smtp_connection(db, payload.test_recipient)
    except EmailServiceError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
