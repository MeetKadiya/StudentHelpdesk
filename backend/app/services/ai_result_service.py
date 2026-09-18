"""ai-worker write-back logic (BACKEND-07). Implements the receiving side
of the contract AI-04 proposed in api_contract.md v0.6. On receipt:
- writes an agent_runs row
- on auto_respond/clarify: adds an ai_agent message, updates category
- on escalate: looks up faculty_routing_rules by category and sets
  tickets.assigned_faculty_id + status='escalated'
- on error: still writes the agent_runs row (status='error') so failures
  are visible, does not touch the ticket otherwise
"""

import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.agent_run import AgentRun
from app.db.models.faculty_routing_rule import FacultyRoutingRule
from app.db.models.message import Message
from app.db.models.ticket import Ticket
from app.db.models.user import User
from app.schemas.internal import AiResultIn
from app.workers.celery_app import send_email_notification

logger = logging.getLogger(__name__)


class AiResultError(Exception):
    """Ticket not found -> caller should 404."""


async def apply_ai_result(db: AsyncSession, ticket_id: uuid.UUID, payload: AiResultIn) -> Ticket:
    ticket = await db.get(Ticket, ticket_id)
    if ticket is None:
        raise AiResultError("Ticket not found.")

    run_status = "error" if payload.error else "completed"
    db.add(
        AgentRun(
            ticket_id=ticket_id,
            graph_version=payload.graph_version,
            status=run_status,
            confidence=payload.confidence,
            finished_at=datetime.now(timezone.utc),
        )
    )

    if payload.error:
        await db.commit()
        await db.refresh(ticket)
        return ticket

    if payload.category:
        ticket.category = payload.category

    if payload.decision in ("auto_respond", "clarify"):
        content = (
            payload.clarifying_question if payload.decision == "clarify" else payload.draft_answer
        )
        if content:
            db.add(
                Message(
                    ticket_id=ticket_id, sender_type="ai_agent", sender_id=None, content=content
                )
            )
        ticket.status = "answered" if payload.decision == "auto_respond" else "open"

    elif payload.decision == "escalate":
        prev_assigned = ticket.assigned_faculty_id
        rule = None
        if payload.category:
            rule = await db.scalar(
                select(FacultyRoutingRule).where(FacultyRoutingRule.category == payload.category)
            )
        if rule is None:
            rule = await db.scalar(
                select(FacultyRoutingRule).where(FacultyRoutingRule.category == "general")
            )
        if rule is not None:
            ticket.assigned_faculty_id = rule.faculty_id

        ticket.status = "escalated"

        # Step 4: Send email notification to the respective faculty
        if ticket.assigned_faculty_id and ticket.assigned_faculty_id != prev_assigned:
            try:
                faculty = await db.get(User, ticket.assigned_faculty_id)
                if faculty and faculty.email:
                    first_msg = await db.scalar(
                        select(Message)
                        .where(Message.ticket_id == ticket_id, Message.sender_type == "student")
                        .order_by(Message.created_at)
                    )
                    query_text = first_msg.content if first_msg else "(No details provided)"
                    subj = f"[HelpDesk] New Student Ticket Assigned: #{str(ticket.id)[:8]} ({ticket.category or 'General'})"
                    body = (
                        f"Hello Professor,\n\n"
                        f"A student inquiry has been routed to your department ({ticket.category or 'General'}):\n\n"
                        f"• Ticket ID: {ticket.id}\n"
                        f"• Category: {ticket.category or 'General'}\n"
                        f"• Subject: {ticket.subject or 'No subject'}\n\n"
                        f"Student Query:\n{query_text}\n\n"
                        f"Please log in to your HelpDesk Faculty Portal to review and respond:\n"
                        f"http://localhost:8080/faculty/{ticket.id}\n"
                    )
                    send_email_notification.apply_async(args=[faculty.email, subj, body], queue="email", retry=False)
                    logger.info("Enqueued faculty notification email to %s for ticket %s", faculty.email, ticket.id)
            except Exception as exc:  # noqa: BLE001
                logger.warning("Failed to dispatch faculty notification email: %s", exc)

    await db.commit()
    await db.refresh(ticket)
    return ticket

