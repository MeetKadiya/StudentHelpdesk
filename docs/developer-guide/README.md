# Developer Guide

A guide for engineers working on this codebase.

## Repository layout

```
student-helpdesk-ai/
├── frontend/            Next.js app
├── backend/              FastAPI app
├── agents/                 AI pipeline (LangGraph, RAG, worker)
├── knowledgebase/            Source docs for RAG ingestion
├── docker/                     Dockerfiles + docker-compose.yml
├── infra/aws/                    Terraform (not deployed)
├── docs/                           This directory — human-facing docs
├── tests/                            Cross-service integration tests
├── project-management/                 Multi-agent coordination docs (see below)
└── .github/workflows/                    CI
```

`project-management/` is worth knowing about even if you're not using
it directly: it's a running, detailed log of every decision made on this
project — `architecture.md`, `requirements.md`, `database_schema.md`,
`api_contract.md`, `task_board.md`, and `project_status.md`. If you're
ever unsure *why* something is built a particular way, check there first
— design decisions and their reasoning are recorded there, not just the
end result.

## Local setup

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env       # edit DATABASE_URL etc.
alembic upgrade head
uvicorn app.main:app --reload
```

Run tests: `pytest` (from `backend/`). Lint: `ruff check .`. Format:
`black .`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Build check: `npm run build`. Type check: `npx tsc --noEmit`.

### AI pipeline

```bash
cd agents
pip install -r requirements.txt
cp .env.example .env
pytest
```

Note: `sentence-transformers` (used for embeddings) requires downloading
a model on first use — this hasn't been live-tested in every development
environment (no network path to the model hub was available during some
sessions). Tests use a fake embedder to stay independent of that.

### Full stack

See [Deployment](../deployment/) for Docker Compose instructions.

## Code conventions

- **Backend:** async SQLAlchemy throughout — never mix in sync sessions.
  Business logic lives in `services/`, not in route handlers; route
  handlers stay thin (parse request → call service → shape response).
  A resource not found *or* not owned by the caller both return 404
  (never leak existence via a 403).
- **Frontend:** App Router, server components by default, `"use client"`
  only where interactivity is needed. All backend calls go through
  `lib/api/*.ts` — components never call `fetch` directly against
  backend routes.
- **Cross-file contracts:** when a change touches a shared contract
  (an API shape, a database column), update `project-management/
  api_contract.md` or `database_schema.md` in the **same session** —
  these files are the coordination point between the backend, frontend,
  and AI codebases, which don't share types directly.

## Testing philosophy

This project's development process has repeatedly found real bugs by
actually running code rather than trusting it by inspection — for
example, a JSONB column that silently doesn't compile on SQLite, a
bcrypt/passlib version incompatibility that crashes every password hash
call, and a JWT `sub` claim that was never parsed to a `UUID` before
being used in a database lookup. None of these were caught by reading
the code; all were caught by running it. **When in doubt, run it** —
structural validation (parsing, type-checking) is good, but it isn't a
substitute for execution wherever execution is possible.

Test layout:
- `backend/tests/` — unit/integration tests against the FastAPI app
  (async `httpx` client, in-memory SQLite).
- `agents/tests/` — AI pipeline tests (fake LLM/embedder, no live model
  calls).
- `tests/` (repo root) — cross-service integration tests that drive the
  full FastAPI app through real HTTP requests and the real RBAC
  dependency chain, with Celery's `send_task` mocked so job payloads can
  be asserted exactly.

## Setting up the first admin account

There's currently no in-product way to do this (see
[Security](../security/) for why this is flagged as an open gap, not
silently worked around). Until a proper bootstrap mechanism exists, the
only way is direct database access:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

Sign up normally first, then run this against your database. This is a
stopgap for development, not a documented production procedure — a real
deployment needs a proper seed script or bootstrap flag before going
live with real users.

## AI pipeline internals

The pipeline is a 4-node LangGraph graph (`agents/graphs/main_graph.py`):
router → specialist → supervisor → (write-back, handled by the backend).
See [Architecture](../architecture/) for the full flow and the reasoning
behind not splitting this into the originally-specified 7-module
pipeline.

Retrieval is in-process (`FaissRetriever`, loaded directly into the
worker) rather than an HTTP call to the standalone `faiss-service` — both
exist; the worker uses the in-process path to avoid a network hop for
something running in the same container image regardless. The standalone
`faiss-service` remains useful as an independently-scalable/testable
component and is what the worker falls back to conceptually if that
design changes.

## Known limitations to be aware of

See [Architecture](../architecture/)'s "Known, disclosed gaps" section
for the full list. The two most likely to affect a new contributor:

1. **Nothing has been tested against real Postgres, real Redis+Celery,
   or a real Docker/AWS deployment** — only SQLite and mocked brokers,
   in sandboxes, throughout development. Treat the first real
   integration test against actual infrastructure as genuinely new
   ground, not a formality.
2. **No first-admin bootstrap** — see above.
