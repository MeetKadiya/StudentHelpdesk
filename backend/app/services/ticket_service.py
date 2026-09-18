"""Ticket business logic (student-facing) — route handlers stay thin and
delegate here per coding_standards.md. All reads/writes are scoped to the
owning student_id; a ticket that exists but belongs to someone else is
treated the same as "not found" (no ownership leakage via 403 vs 404)."""

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.faculty_routing_rule import FacultyRoutingRule
from app.db.models.message import Message
from app.db.models.ticket import Ticket
from app.db.models.user import User
from app.services.ai_dispatch_service import enqueue_ai_job
from app.services.clerk_service import triage_student_query
from app.workers.celery_app import send_email_notification

logger = logging.getLogger(__name__)


class TicketAccessError(Exception):
    """Raised when a ticket doesn't exist or isn't owned by the requesting
    student. The API layer should turn this into a 404."""


def _detect_category(subject: str | None, message: str, category: str | None) -> str:
    """Classifies the inquiry into an appropriate university department category."""
    if category and category.strip():
        cat_lower = category.lower().strip()
        for valid in (
            "academic",
            "it_support",
            "admissions_enrollment",
            "financial_aid_billing",
            "general",
        ):
            if valid in cat_lower or cat_lower in valid:
                return valid
        if any(
            k in cat_lower
            for k in ("it", "wifi", "tech", "device", "computer", "network", "system", "login")
        ):
            return "it_support"
        if any(
            k in cat_lower for k in ("fee", "finance", "billing", "aid", "tuition", "scholarship")
        ):
            return "financial_aid_billing"
        if any(
            k in cat_lower for k in ("course", "grade", "academic", "advising", "class", "exam")
        ):
            return "academic"
        if any(k in cat_lower for k in ("admission", "enroll", "registrar", "transcript")):
            return "admissions_enrollment"

    text = f"{subject or ''} {message}".lower()
    if any(
        k in text
        for k in (
            "wifi",
            "wi-fi",
            "network",
            "login",
            "password",
            "portal",
            "canvas",
            "vpn",
            "laptop",
            "software",
            "device",
            "printer",
            "computer",
            "mfa",
            "otp",
            "reset",
        )
    ):
        return "it_support"
    if any(
        k in text
        for k in (
            "fee",
            "fees",
            "tuition",
            "scholarship",
            "aid",
            "billing",
            "bill",
            "payment",
            "refund",
            "receipt",
            "invoice",
            "dues",
            "finance",
            "loan",
        )
    ):
        return "financial_aid_billing"
    if any(
        k in text
        for k in (
            "grade",
            "grades",
            "gpa",
            "course",
            "courses",
            "class",
            "classes",
            "syllabus",
            "professor",
            "faculty",
            "exam",
            "exams",
            "attendance",
            "lecture",
            "homework",
            "assignment",
        )
    ):
        return "academic"
    if any(
        k in text
        for k in (
            "admission",
            "admissions",
            "enroll",
            "enrollment",
            "apply",
            "application",
            "transcript",
            "transcripts",
            "transfer",
            "major",
            "minor",
            "degree",
            "registration",
            "admit",
        )
    ):
        return "admissions_enrollment"
    return "general"


async def _get_owned_ticket(db: AsyncSession, ticket_id: uuid.UUID, user_id: uuid.UUID) -> Ticket:
    ticket = await db.get(Ticket, ticket_id)
    if ticket is None:
        raise TicketAccessError("Ticket not found.")
    user = await db.get(User, user_id)
    if user and user.role in ("admin", "faculty", "clerk"):
        return ticket
    if ticket.student_id != user_id:
        raise TicketAccessError("Ticket not found.")
    return ticket


async def create_ticket(
    db: AsyncSession,
    student_id: uuid.UUID,
    subject: str | None,
    message: str,
    category: str | None = None,
    branch: str | None = None,
    semester: str | None = None,
) -> Ticket:
    # Clerk Assistant Triages and sorts the student inquiry
    triage = triage_student_query(subject, message, category)
    detected_cat = triage.category_slug

    # Step 3: Identify appropriate department & resolve designated authority
    assigned_faculty = None
    if triage.target_role == "faculty":
        rule = await db.scalar(
            select(FacultyRoutingRule).where(FacultyRoutingRule.category == detected_cat)
        )
        if rule is None:
            rule = await db.scalar(
                select(FacultyRoutingRule).where(FacultyRoutingRule.category == "general")
            )
        assigned_faculty = rule.faculty_id if rule else None
        if not assigned_faculty:
            first_faculty = await db.scalar(select(User).where(User.role == "faculty"))
            if first_faculty:
                assigned_faculty = first_faculty.id
    else:
        # Triaged to Administration (Bursar, Registrar, IT, etc.)
        first_admin = await db.scalar(select(User).where(User.role == "admin"))
        if first_admin:
            assigned_faculty = first_admin.id

    # Step 1 & 2: Generate Ticket ID & store ticket query in database
    ticket = Ticket(
        student_id=student_id,
        subject=subject,
        category=detected_cat,
        branch=branch,
        semester=semester,
        assigned_faculty_id=assigned_faculty,
        status="open",
    )
    db.add(ticket)
    await db.flush()  # generates ticket.id (UUID)

    # Initial Student Inquiry message
    first_message = Message(
        ticket_id=ticket.id,
        sender_type="student",
        sender_id=student_id,
        content=message,
    )
    db.add(first_message)

    # Automated Clerk Assistant Triage & Sorting Note
    clerk_note = (
        f"🤖 **Clerk Assistant Intake & Routing Note**\n\n"
        f"• **Assigned Destination**: {triage.summary_banner}\n"
        f"• **Department Desk**: {triage.department}\n"
        f"• **Triage Classification**: {triage.category_slug.replace('_', ' ').title()}\n"
        f"• **Priority Level**: {triage.priority.upper()}\n"
        f"• **Routing Rationale**: {triage.reason}\n\n"
        f"*Inquiry sorted by Clerk Assistant and placed in the appropriate department queue.*"
    )
    clerk_message = Message(
        ticket_id=ticket.id,
        sender_type="ai_agent",
        sender_id=None,
        content=clerk_note,
    )
    db.add(clerk_message)

    await db.commit()
    await db.refresh(ticket)

    # Step 4: Send email notification to the respective faculty
    if assigned_faculty:
        try:
            faculty = await db.get(User, assigned_faculty)
            if faculty and faculty.email:
                subj = f"[HelpDesk] New Student Ticket Assigned: #{str(ticket.id)[:8]} ({ticket.category})"
                body = (
                    f"Hello Professor,\n\n"
                    f"A new student support request has been routed to your department ({ticket.category}):\n\n"
                    f"• Ticket ID: {ticket.id}\n"
                    f"• Category: {ticket.category}\n"
                    f"• Subject: {ticket.subject or 'No subject'}\n\n"
                    f"Student Query:\n{message}\n\n"
                    f"Please log in to the HelpDesk Faculty Portal to review and respond:\n"
                    f"http://localhost:8080/faculty/{ticket.id}\n"
                )
                send_email_notification.apply_async(
                    args=[faculty.email, subj, body], queue="email", retry=False
                )
                logger.info(
                    "Dispatched faculty notification email to %s for new ticket %s",
                    faculty.email,
                    ticket.id,
                )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to dispatch faculty notification email: %s", exc)

    # Dispatch to AI agent graph asynchronously
    enqueue_ai_job(ticket.id, question=message, conversation_history=[])

    return ticket


async def list_tickets_for_student(db: AsyncSession, student_id: uuid.UUID) -> list[Ticket]:
    result = await db.scalars(
        select(Ticket).where(Ticket.student_id == student_id).order_by(Ticket.created_at.desc())
    )
    return list(result)


async def get_ticket_with_messages(
    db: AsyncSession, ticket_id: uuid.UUID, student_id: uuid.UUID
) -> tuple[Ticket, list[Message]]:
    ticket = await _get_owned_ticket(db, ticket_id, student_id)
    messages = await db.scalars(
        select(Message).where(Message.ticket_id == ticket_id).order_by(Message.created_at)
    )
    return ticket, list(messages)


async def add_message(
    db: AsyncSession, ticket_id: uuid.UUID, student_id: uuid.UUID, content: str
) -> Message:
    ticket = await _get_owned_ticket(db, ticket_id, student_id)

    # Fetch history BEFORE adding the new message — conversation_history
    # in the AI job payload (agents/state/graph_state.py's AgentState)
    # means "prior turns", with the new one passed separately as
    # `question`. sender_type/content map straight across to
    # ConversationTurn with no translation needed (see
    # ai_dispatch_service.py's module docstring).
    prior_messages = await db.scalars(
        select(Message).where(Message.ticket_id == ticket_id).order_by(Message.created_at)
    )
    conversation_history = [
        {"sender_type": m.sender_type, "content": m.content} for m in prior_messages
    ]

    user = await db.get(User, student_id)
    sender_type = "staff" if user and user.role in ("faculty", "admin") else "student"
    if sender_type == "staff":
        ticket.status = "answered"

    message = Message(
        ticket_id=ticket.id,
        sender_type=sender_type,
        sender_id=student_id,
        content=content,
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)

    if sender_type == "student":
        enqueue_ai_job(ticket.id, question=content, conversation_history=conversation_history)

    return message


async def get_ticket_status(
    db: AsyncSession, ticket_id: uuid.UUID, student_id: uuid.UUID
) -> Ticket:
    return await _get_owned_ticket(db, ticket_id, student_id)
