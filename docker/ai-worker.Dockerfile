# DEVOPS-02 — ai-worker.Dockerfile
# Build context: repo root ("..") — same reasoning as faiss-service.Dockerfile
# (see comments there re: ARCH-DECISION-02 / REPO_ROOT-relative paths).
# Deliberately near-identical to faiss-service.Dockerfile rather than
# sharing one image via `command:` override (the celery-worker/email-worker
# pattern in docker-compose.yml) — the two services have different
# resource/scaling profiles (CPU-bound embedding+FAISS search vs.
# LangGraph/LLM calls + Celery), so keeping them separately buildable
# leaves room to diverge later without a task_board.md-worthy rewrite.

FROM python:3.12-slim AS base

WORKDIR /app

# See faiss-service.Dockerfile's comment on this same block — identical
# fix, same reasoning (CPU-only torch with PyPI fallback and high timeout/retries).
RUN pip install --no-cache-dir --default-timeout=1000 --retries=10 torch --extra-index-url https://download.pytorch.org/whl/cpu

COPY agents/requirements.txt ./agents/requirements.txt
RUN pip install --no-cache-dir --default-timeout=1000 --retries=10 -r agents/requirements.txt

COPY agents ./agents
COPY knowledgebase ./knowledgebase

ENV PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# AI-04's graph_runner loads FaissRetriever in-process (falls back to
# NullRetriever if no index exists yet) — no network call to
# faiss-service needed for retrieval itself, per project_status.md's
# 2026-08-08 architecture decision.
CMD ["celery", "-A", "agents.worker.celery_app", "worker", "--loglevel=info"]
