"""Celery app + task entrypoint for the ai-worker service (docker-compose's
`ai-worker`, consuming queue settings.AI_TASK_QUEUE). All actual task logic
lives in agents/worker/graph_runner.py, kept Celery-free so it's directly
unit-testable — this module is deliberately thin.
"""

from __future__ import annotations

from celery import Celery

from agents.config import get_agent_settings
from agents.learning.learning_agent import ingest_verified_answer
from agents.worker.graph_runner import run_graph_for_ticket

_settings = get_agent_settings()

celery_app = Celery("ai_worker", broker=_settings.REDIS_URL, backend=_settings.REDIS_URL)
celery_app.conf.task_default_queue = _settings.AI_TASK_QUEUE


@celery_app.task(
    name="agents.worker.process_ticket_job",
    bind=True,
    max_retries=3,
    default_retry_delay=10,
)
def process_ticket_job(self, job: dict) -> dict:
    """job is the payload documented in api_contract.md v0.6 (ticket_id,
    question, conversation_history, graph_version). Backend enqueues this
    on ticket create/follow-up via
    backend/app/services/ai_dispatch_service.py's enqueue_ai_job()
    (BACKEND-07, done 2026-08-10) — send_task by this task's string name,
    no import from agents/."""
    try:
        return run_graph_for_ticket(job)
    except Exception as exc:  # transient failures get Celery's retry policy
        # Transient failures (backend unreachable, etc.) get Celery's retry
        # policy; real bugs still surface after max_retries rather than
        # being swallowed silently.
        raise self.retry(exc=exc) from exc


@celery_app.task(
    name="agents.worker.process_learning_job",
    bind=True,
    max_retries=3,
    default_retry_delay=10,
)
def process_learning_job(self, job: dict) -> dict:
    """AI-05's Learning Agent entrypoint. job keys: ticket_id, message_id,
    question, answer, category (optional) — see
    agents/learning/learning_agent.py's ingest_verified_answer docstring.
    Backend enqueues this from BACKEND-05's verify endpoint
    (faculty_service.mark_message_verified) via
    backend/app/services/ai_dispatch_service.py's enqueue_learning_job(),
    the same send_task-by-name pattern used for process_ticket_job."""
    try:
        return ingest_verified_answer(job)
    except Exception as exc:  # same retry-on-failure reasoning as above
        raise self.retry(exc=exc) from exc
