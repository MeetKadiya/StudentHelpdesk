"""Learning Agent (AI-05) — closes requirements.md FR-25's loop: a
faculty-verified staff response (BACKEND-05's verify endpoint) gets
written into knowledgebase/faqs/ as a new source document and the FAISS
index gets rebuilt, so future retrieval can surface it. Per
requirements.md FR-25 / architecture.md §4.5 "only verified documents are
indexed" — this is the ONLY path that writes into knowledgebase/faqs/ on
the AI side; nothing here indexes an unverified answer.

Deliberately reuses agents/rag/ingest.py's ingest() + FaissIndex.save()
directly — the exact same call agents/service/main.py's POST /reindex
makes — rather than making an HTTP call to that endpoint. Runs
in-process, same reasoning AI-04 already used for retrieval
(agents/worker/graph_runner.py's docstring): avoids a network hop and a
service-liveness dependency for something that can run in the same
container image regardless.

Writes to knowledgebase/faqs/ specifically (not documents/policies/
circulars) — a verified Q&A pair is structurally an FAQ entry, and faqs/
is already one of agents/rag/ingest.py's four canonical source
subfolders (_SOURCE_SUBFOLDERS), so no change to discover_documents() is
needed.

Full-index-rebuild on every call, not incremental — matches AI-02's
existing ingest() design (it rescans knowledgebase/ from scratch every
time regardless of caller). Fine at this knowledgebase's expected scale
(FaissIndex's own docstring already made this tradeoff); revisit only if
profiling shows it's a real problem.
"""
from __future__ import annotations

import hashlib
import logging
from pathlib import Path

from agents.config import AgentSettings, get_agent_settings
from agents.embeddings.embedder import Embedder, get_embedder
from agents.rag.ingest import REPO_ROOT, ingest

logger = logging.getLogger(__name__)


def _faq_filename(ticket_id: str, message_id: str) -> str:
    """Short, stable, collision-resistant without a DB round trip here —
    the same (ticket_id, message_id) pair always produces the same
    filename, so re-running this (e.g. a retried Celery task, or a
    faculty member re-triggering verify somehow) overwrites the same file
    rather than duplicating the knowledgebase entry."""
    digest = hashlib.sha256(f"{ticket_id}:{message_id}".encode()).hexdigest()[:12]
    return f"verified_{digest}.md"


def write_verified_answer(
    *,
    kb_root: Path,
    ticket_id: str,
    message_id: str,
    question: str,
    answer: str,
    category: str | None,
) -> Path:
    """Writes one verified Q&A pair as a knowledgebase/faqs/ markdown doc.
    Idempotent by (ticket_id, message_id) — see _faq_filename. Returns the
    path written (mainly for tests/logging, not otherwise consumed)."""
    faqs_dir = kb_root / "faqs"
    faqs_dir.mkdir(parents=True, exist_ok=True)

    path = faqs_dir / _faq_filename(ticket_id, message_id)
    category_line = f"Category: {category}\n" if category else ""
    content = (
        f"<!-- ticket_id: {ticket_id} | message_id: {message_id} | "
        f"source: faculty_verified -->\n"
        f"{category_line}\n"
        f"## Q: {question}\n\n"
        f"{answer}\n"
    )
    path.write_text(content, encoding="utf-8")
    return path


def reindex(settings: AgentSettings, *, embedder: Embedder | None = None) -> int:
    """Rebuilds and persists the FAISS index over the full knowledgebase/
    (including whatever write_verified_answer() just added). Returns the
    number of chunks indexed.

    This duplicates agents/service/main.py's POST /reindex body (~10
    lines) rather than one calling the other or both calling a shared
    helper — at this size a shared-helper indirection isn't worth it yet;
    if these two ever drift out of sync, that's a real bug to fix
    (matching database_schema.md's audit_logs entry style: naming the
    tradeoff explicitly beats silently accepting duplication with no
    note)."""
    embedder = embedder or get_embedder(settings)
    kb_root = REPO_ROOT / "knowledgebase"

    index = ingest(
        kb_root=kb_root,
        embedder=embedder,
        chunk_size=settings.CHUNK_SIZE,
        overlap=settings.CHUNK_OVERLAP,
    )
    index.save(
        REPO_ROOT / settings.FAISS_INDEX_PATH,
        REPO_ROOT / settings.FAISS_METADATA_PATH,
    )
    return len(index.metadatas)


def ingest_verified_answer(
    job: dict,
    *,
    settings: AgentSettings | None = None,
    embedder: Embedder | None = None,
) -> dict:
    """Learning Agent's Celery-task entrypoint (agents/worker/celery_app.py's
    process_learning_job wraps this the same way process_ticket_job wraps
    run_graph_for_ticket — kept Celery-free here for the same
    direct-unit-testability reason AI-04 used).

    job keys: ticket_id, message_id, question, answer, category (optional).
    Returns {"chunks_indexed": int, "path": str} on success. Does NOT
    catch reindex failures — a partially-written knowledgebase doc with a
    stale index is a real problem the caller (the Celery task) should see
    and retry on, not one this function should silently paper over."""
    settings = settings or get_agent_settings()
    kb_root = REPO_ROOT / "knowledgebase"

    path = write_verified_answer(
        kb_root=kb_root,
        ticket_id=job["ticket_id"],
        message_id=job["message_id"],
        question=job["question"],
        answer=job["answer"],
        category=job.get("category"),
    )

    try:
        chunks_indexed = reindex(settings, embedder=embedder)
    except Exception:
        logger.exception(
            "Learning Agent: verified answer for ticket %s written to %s, "
            "but reindex failed — it won't be retrievable until a manual "
            "/reindex or a successful retry of this job.",
            job["ticket_id"],
            path,
        )
        raise

    return {"chunks_indexed": chunks_indexed, "path": str(path)}
