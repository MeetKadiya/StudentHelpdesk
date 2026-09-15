"""ai-worker job enqueue (BACKEND-07's other half — the round trip's
receiving side, POST /internal/v1/tickets/{ticket_id}/ai-result, was
already built; this is what actually calls the ai-worker in the first
place, which was flagged as a gap in project_status.md's Known Blockers).

Sends via Celery's send_task by string task name, NOT by importing
agents.worker.celery_app.process_ticket_job directly — deliberately, so
backend/ never imports anything from agents/ (matches architecture.md's
"everything communicates through APIs" rule; here the "API" is the Redis
broker + a shared task-name/queue-name contract instead of HTTP, but the
decoupling principle is the same — backend/ and agents/ stay independently
deployable and don't share Python import paths).

Job payload shape matches api_contract.md v0.6 / agents/state/graph_state.py's
AgentState exactly: ticket_id (str), question (str), conversation_history
(list of {sender_type, content} dicts — the SAME literal values as
messages.sender_type, no translation needed). graph_version is
deliberately omitted here — agents/worker/graph_runner.py defaults it to
agents/config.py's own GRAPH_VERSION setting if not provided, and the
backend has no business overriding that.

Enqueue failures (Redis unreachable, etc.) are logged and swallowed, not
raised — a ticket must still save even if the AI pipeline can't currently
be reached; the student just won't get an AI response until whatever's
wrong with Redis/ai-worker is fixed. This mirrors run_graph_for_ticket's
own failure philosophy on the other end (escalate/log rather than crash).
"""

from __future__ import annotations

import logging
import uuid

from celery import Celery

from app.core.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()
_celery_client = Celery(broker=settings.REDIS_URL)


def enqueue_ai_job(
    ticket_id: uuid.UUID, question: str, conversation_history: list[dict[str, str]]
) -> None:
    job = {
        "ticket_id": str(ticket_id),
        "question": question,
        "conversation_history": conversation_history,
    }
    try:
        _celery_client.send_task(
            "agents.worker.process_ticket_job",
            args=[job],
            queue=settings.AI_TASK_QUEUE,
        )
    except Exception:  # deliberately broad, see module docstring
        logger.exception(
            "Failed to enqueue AI job for ticket %s — ticket was saved, but "
            "won't get an AI response until this is resolved.",
            ticket_id,
        )


def enqueue_learning_job(
    ticket_id: uuid.UUID,
    message_id: uuid.UUID,
    question: str,
    answer: str,
    category: str | None,
) -> None:
    """AI-05's Learning Agent (agents/learning/learning_agent.py) enqueue
    side — called from faculty_service.mark_message_verified once a staff
    response is marked verified (FR-25). Same task-name/queue mechanism
    and same fail-open philosophy as enqueue_ai_job: a Redis outage must
    never block the verify action itself, since the message is already
    verified in the DB regardless of whether the knowledgebase re-index
    succeeds."""
    job = {
        "ticket_id": str(ticket_id),
        "message_id": str(message_id),
        "question": question,
        "answer": answer,
        "category": category,
    }
    try:
        _celery_client.send_task(
            "agents.worker.process_learning_job",
            args=[job],
            queue=settings.AI_TASK_QUEUE,
        )
    except Exception:  # deliberately broad, see module docstring
        logger.exception(
            "Failed to enqueue Learning Agent job for ticket %s / message "
            "%s — the message is still marked verified, but it won't be "
            "re-indexed into the knowledgebase until this is resolved.",
            ticket_id,
            message_id,
        )
