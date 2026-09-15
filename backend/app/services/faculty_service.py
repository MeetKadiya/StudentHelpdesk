"""Faculty business logic (BACKEND-05) — list routed tickets, respond,
mark a response verified (triggers the learning-loop re-index)."""

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.message import Message
from app.db.models.ticket import Ticket
from app.db.models.user import User
from app.workers.celery_app import send_email_notification

logger = logging.getLogger(__name__)


class FacultyAccessError(Exception):
    """Ticket doesn't exist or isn't routed to this faculty member."""


async def _get_routed_ticket(
    db: AsyncSession, ticket_id: uuid.UUID, faculty_id: uuid.UUID
) -> Ticket:
    ticket = await db.get(Ticket, ticket_id)
    if ticket is None or ticket.assigned_faculty_id != faculty_id:
        raise FacultyAccessError("Ticket not found.")
    return ticket


async def list_routed_tickets(db: AsyncSession, faculty_id: uuid.UUID) -> list[Ticket]:
    result = await db.scalars(
        select(Ticket)
        .where(Ticket.assigned_faculty_id == faculty_id)
        .order_by(Ticket.created_at.desc())
    )
    return list(result)


async def get_ticket_with_messages(
    db: AsyncSession, ticket_id: uuid.UUID, faculty_id: uuid.UUID
) -> tuple[Ticket, list[Message]]:
    ticket = await _get_routed_ticket(db, ticket_id, faculty_id)
    messages = await db.scalars(
        select(Message).where(Message.ticket_id == ticket_id).order_by(Message.created_at)
    )
    return ticket, list(messages)


async def respond_to_ticket(
    db: AsyncSession, ticket_id: uuid.UUID, faculty_id: uuid.UUID, content: str
) -> Message:
    ticket = await _get_routed_ticket(db, ticket_id, faculty_id)
    message = Message(
        ticket_id=ticket.id,
        sender_type="staff",
        sender_id=faculty_id,
        content=content,
    )
    db.add(message)
    ticket.status = "answered"
    await db.commit()
    await db.refresh(message)

    # Step 6: Notify the student via email
    try:
        student = await db.get(User, ticket.student_id)
        if student and student.email:
            subj = f"[HelpDesk Update] Faculty Response Received: Ticket #{str(ticket.id)[:8]}"
            body = (
                f"Hello,\n\n"
                f"A faculty member has replied to your support request:\n\n"
                f"• Ticket ID: {ticket.id}\n"
                f"• Category: {ticket.category or 'General'}\n"
                f"• Subject: {ticket.subject or 'Support Request'}\n\n"
                f"Faculty Response:\n{content}\n\n"
                f"You can view the full thread and reply anytime at:\n"
                f"http://localhost:8080/tickets/{ticket.id}\n"
            )
            send_email_notification.apply_async(args=[student.email, subj, body], queue="email")
            logger.info("Enqueued student email notification to %s for ticket %s", student.email, ticket.id)
    except Exception as exc:
        logger.warning("Failed to dispatch student email notification: %s", exc)

    return message


async def mark_message_verified(
    db: AsyncSession, ticket_id: uuid.UUID, message_id: uuid.UUID, faculty_id: uuid.UUID
) -> Message:
    """Marks a staff message on a routed ticket as verified (FR-18).
    Per user requirement Step 7, knowledge base ingestion is deferred until
    explicit Admin Approval in the Admin Console."""
    await _get_routed_ticket(db, ticket_id, faculty_id)

    message = await db.get(Message, message_id)
    if message is None or message.ticket_id != ticket_id or message.sender_type != "staff":
        raise FacultyAccessError("Message not found.")

    message.is_verified = True
    message.is_kb_approved = False
    await db.commit()
    await db.refresh(message)
    logger.info("Message %s marked as verified by faculty %s (pending Admin approval)", message_id, faculty_id)

    return message

