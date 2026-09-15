"""Admin business logic (BACKEND-06) — routing rules + user role
management (FR-20, FR-21). Every mutation writes an audit_logs row
(NFR-7).

FRONTEND-05 (2026-08-19): added get_analytics_summary(). Scoped
deliberately to metrics computable from data that actually exists —
tickets.status, messages.created_at, and agent_runs (written by
BACKEND-07). No metric here is invented or approximated with fake data;
each is a plain aggregate with a stated definition. See AnalyticsSummaryOut
docstrings in app/schemas/admin.py for exact definitions."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.agent_run import AgentRun
from app.db.models.audit_log import AuditLog
from app.db.models.faculty_routing_rule import FacultyRoutingRule
from app.db.models.message import Message
from app.db.models.ticket import Ticket
from app.db.models.user import User
from app.services.ai_dispatch_service import enqueue_learning_job



class AdminServiceError(Exception):
    """Raised for not-found / invalid-state admin operations -> 404/400."""


async def _audit(db: AsyncSession, actor_id: uuid.UUID, action: str, target: str) -> None:
    db.add(AuditLog(actor_id=actor_id, action=action, target=target))


async def list_routing_rules(db: AsyncSession) -> list[FacultyRoutingRule]:
    result = await db.scalars(select(FacultyRoutingRule).order_by(FacultyRoutingRule.category))
    return list(result)


async def create_routing_rule(
    db: AsyncSession, admin_id: uuid.UUID, category: str, faculty_id: uuid.UUID
) -> FacultyRoutingRule:
    faculty = await db.get(User, faculty_id)
    if faculty is None or faculty.role != "faculty":
        raise AdminServiceError("faculty_id must belong to a user with role='faculty'.")

    rule = FacultyRoutingRule(category=category, faculty_id=faculty_id, created_by=admin_id)
    db.add(rule)
    await _audit(db, admin_id, "routing_rule_changed", f"category={category}")
    await db.commit()
    await db.refresh(rule)
    return rule


async def delete_routing_rule(db: AsyncSession, admin_id: uuid.UUID, rule_id: uuid.UUID) -> None:
    rule = await db.get(FacultyRoutingRule, rule_id)
    if rule is None:
        raise AdminServiceError("Routing rule not found.")
    await db.delete(rule)
    await _audit(db, admin_id, "routing_rule_changed", f"deleted rule_id={rule_id}")
    await db.commit()


async def list_users(db: AsyncSession) -> list[User]:
    result = await db.scalars(select(User).order_by(User.created_at))
    return list(result)


async def update_user_role(
    db: AsyncSession, admin_id: uuid.UUID, user_id: uuid.UUID, new_role: str
) -> User:
    user = await db.get(User, user_id)
    if user is None:
        raise AdminServiceError("User not found.")

    old_role = user.role
    user.role = new_role
    await _audit(db, admin_id, "role_changed", f"user_id={user_id} {old_role}->{new_role}")
    await db.commit()
    await db.refresh(user)
    return user


def _as_utc(value: datetime) -> datetime:
    """SQLite (this project's only actually-verified DB so far) returns
    naive datetimes even though the columns are DateTime(timezone=True);
    Postgres would return aware ones. Normalize so subtraction below is
    always comparing like-for-like regardless of which DB is running."""
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


async def get_analytics_summary(db: AsyncSession) -> dict:
    """FRONTEND-05's data source. Every field is a plain aggregate over
    real rows — see AnalyticsSummaryOut in app/schemas/admin.py for exact
    field definitions. Returns None (not 0 or a fake number) for any
    metric with no underlying data yet, so the frontend can render "not
    enough data" rather than a misleading zero."""
    total_tickets = await db.scalar(select(func.count()).select_from(Ticket)) or 0

    status_rows = await db.execute(select(Ticket.status, func.count()).group_by(Ticket.status))
    tickets_by_status = {status: count for status, count in status_rows.all()}

    escalated_count = (
        await db.scalar(
            select(func.count()).select_from(Ticket).where(Ticket.assigned_faculty_id.is_not(None))
        )
        or 0
    )
    escalation_rate = (escalated_count / total_tickets) if total_tickets else None

    # First non-student response time per ticket, computed in Python rather
    # than DB-specific date arithmetic (Postgres age()/EXTRACT vs SQLite
    # julianday() aren't portable, and SQLite is the only DB this has
    # actually been run against so far — see task_board.md's repeated
    # "not verified against real Postgres" notes elsewhere in this project).
    tickets_result = await db.execute(select(Ticket.id, Ticket.created_at))
    ticket_created = dict(tickets_result.all())

    first_response_result = await db.execute(
        select(Message.ticket_id, func.min(Message.created_at))
        .where(Message.sender_type != "student")
        .group_by(Message.ticket_id)
    )
    response_seconds: list[float] = []
    for ticket_id, first_reply_at in first_response_result.all():
        created_at = ticket_created.get(ticket_id)
        if created_at is None or first_reply_at is None:
            continue
        delta = (_as_utc(first_reply_at) - _as_utc(created_at)).total_seconds()
        if delta >= 0:
            response_seconds.append(delta)
    avg_first_response_seconds = (
        sum(response_seconds) / len(response_seconds) if response_seconds else None
    )

    avg_agent_confidence = await db.scalar(
        select(func.avg(AgentRun.confidence)).where(AgentRun.confidence.is_not(None))
    )

    total_runs = await db.scalar(select(func.count()).select_from(AgentRun)) or 0
    completed_runs = (
        await db.scalar(
            select(func.count()).select_from(AgentRun).where(AgentRun.status == "completed")
        )
        or 0
    )
    ai_auto_resolution_rate = (completed_runs / total_runs) if total_runs else None

    return {
        "total_tickets": total_tickets,
        "tickets_by_status": tickets_by_status,
        "escalation_rate": escalation_rate,
        "avg_first_response_seconds": avg_first_response_seconds,
        "avg_agent_confidence": avg_agent_confidence,
        "ai_auto_resolution_rate": ai_auto_resolution_rate,
    }


async def list_pending_kb_approvals(db: AsyncSession) -> list[dict]:
    """Finds messages where is_verified=True and is_kb_approved=False.
    Gathers ticket details, student initial query, and faculty info."""
    verified_messages = await db.scalars(
        select(Message)
        .where(Message.is_verified == True, Message.is_kb_approved == False)
        .order_by(Message.created_at.desc())
    )
    items = []
    for msg in verified_messages:
        ticket = await db.get(Ticket, msg.ticket_id)
        first_msg = await db.scalar(
            select(Message)
            .where(Message.ticket_id == msg.ticket_id, Message.sender_type == "student")
            .order_by(Message.created_at)
        )
        faculty = await db.get(User, msg.sender_id) if msg.sender_id else None
        items.append({
            "message_id": msg.id,
            "ticket_id": msg.ticket_id,
            "category": ticket.category if ticket else None,
            "question": first_msg.content if first_msg else "(Question not recorded)",
            "answer": msg.content,
            "faculty_id": msg.sender_id,
            "faculty_email": faculty.email if faculty else None,
            "created_at": msg.created_at,
        })
    return items


async def approve_kb_entry(db: AsyncSession, admin_id: uuid.UUID, message_id: uuid.UUID) -> dict:
    """Approves a verified answer, marks is_kb_approved=True, and enqueues FAISS learning loop."""
    msg = await db.get(Message, message_id)
    if msg is None or not msg.is_verified:
        raise AdminServiceError("Verified message not found.")
    if msg.is_kb_approved:
        raise AdminServiceError("Message has already been approved for Knowledge Base.")

    msg.is_kb_approved = True
    await _audit(db, admin_id, "kb_entry_approved", f"message_id={message_id}")
    await db.commit()
    await db.refresh(msg)

    ticket = await db.get(Ticket, msg.ticket_id)
    first_msg = await db.scalar(
        select(Message)
        .where(Message.ticket_id == msg.ticket_id, Message.sender_type == "student")
        .order_by(Message.created_at)
    )
    question = first_msg.content if first_msg else msg.content

    enqueue_learning_job(
        ticket_id=msg.ticket_id,
        message_id=msg.id,
        question=question,
        answer=msg.content,
        category=ticket.category if ticket else None,
    )

    return {"status": "approved", "message_id": msg.id}


async def reject_kb_entry(db: AsyncSession, admin_id: uuid.UUID, message_id: uuid.UUID) -> dict:
    """Rejects a verified answer, reverting is_verified=False."""
    msg = await db.get(Message, message_id)
    if msg is None:
        raise AdminServiceError("Message not found.")

    msg.is_verified = False
    msg.is_kb_approved = False
    await _audit(db, admin_id, "kb_entry_rejected", f"message_id={message_id}")
    await db.commit()
    return {"status": "rejected", "message_id": msg.id}

