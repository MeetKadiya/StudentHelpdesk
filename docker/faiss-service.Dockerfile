# DEVOPS-02 — faiss-service.Dockerfile
# Build context (see docker-compose.yml, ARCH-DECISION-02 resolution):
# repo root ("..", i.e. I:\StudentHelpDesk), NOT a top-level rag/ package
# and NOT a bare ../agents context. Reasoning:
#   - agents/rag/ingest.py defines REPO_ROOT = Path(__file__).parents[2],
#     i.e. it assumes agents/ and knowledgebase/ are siblings under one
#     root. That's the actual, tested layout (AI-02/AI-03 built and ran
#     against it) — a top-level rag/ package was never in
#     folder_structure.md and would require moving tested code.
#   - A context of just ../agents would drop knowledgebase/ out of the
#     build entirely, breaking that same REPO_ROOT-relative assumption
#     (ingest()/reindex() read from <root>/knowledgebase/...).
# So: context = repo root, copy both agents/ and knowledgebase/, preserving
# their sibling relationship exactly as agents/rag/ingest.py expects.
# knowledgebase/ is also bind-mounted at runtime in docker-compose.yml so
# admin-curated docs and the FAISS index survive rebuilds — the COPY here
# just means the image is self-contained if run without that mount.

FROM python:3.12-slim AS base

WORKDIR /app

# Install CPU-only torch FIRST, from PyTorch's CPU wheel index with PyPI fallback
# for general dependencies, before `pip install -r requirements.txt` resolves
# sentence-transformers' torch dependency. Without this, pip pulls the default
# GPU/CUDA-enabled torch wheel — over 1GB of nvidia-* packages (cuDNN, cuSPARSELt,
# NCCL, etc.) that this Docker Compose setup has no GPU passthrough to ever use.
# Using --extra-index-url ensures dependencies (sympy, networkx, fsspec, etc.)
# are fetched from fast PyPI CDN while torch comes from PyTorch CPU repo.
# High timeout and retries protect against network drops during the ~200MB download.
RUN pip install --no-cache-dir --default-timeout=1000 --retries=10 torch --extra-index-url https://download.pytorch.org/whl/cpu

COPY agents/requirements.txt ./agents/requirements.txt
RUN pip install --no-cache-dir --default-timeout=1000 --retries=10 -r agents/requirements.txt

COPY agents ./agents
COPY knowledgebase ./knowledgebase

ENV PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

EXPOSE 8001

CMD ["uvicorn", "agents.service.main:app", "--host", "0.0.0.0", "--port", "8001"]
