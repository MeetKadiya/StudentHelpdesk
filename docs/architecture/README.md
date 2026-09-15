# Architecture

Student HelpDesk AI is a cloud-based, multi-agent AI support desk for a
university/college. Students submit questions; an AI pipeline tries to
answer them automatically, grounded in a curated knowledge base; anything
it can't confidently answer gets routed to the right faculty member.
Faculty answers that get marked "verified" flow back into the knowledge
base, so the system gets better at answering similar questions over time.

## System diagram

```
                    Internet
                        │
                 Cloudflare / Nginx
                        │
          ┌─────────────┴─────────────┐
          │                           │
     Next.js Frontend          FastAPI Backend
                                      │
         ┌──────────────┬─────────────┴───────────────┐
         │              │                             │
      PostgreSQL      Redis                     AI Platform
                                                     │
                                  ┌──────────────────┼─────────────────┐
                                  │                  │                 │
                              LangGraph         Vector DB         Knowledge Base
                                  │
                           Multiple AI Agents
                                  │
                           Email Notification
                                  │
                              Faculty Portal
```

Everything communicates through APIs. The frontend never talks to the
database directly, and there's no cross-module bypass anywhere in the
stack.

## Services

| Service | What it does | Tech |
|---|---|---|
| **nginx** | Reverse proxy — `/` → frontend, `/api/*` → backend | nginx |
| **nextjs-frontend** | Student/faculty/admin web UI | Next.js 15, React 19, TypeScript, Tailwind |
| **fastapi-backend** | REST API, auth, business logic, RBAC | FastAPI, SQLAlchemy (async), Alembic |
| **postgres** | System of record | PostgreSQL 16 |
| **redis** | Celery broker | Redis 7 |
| **ai-worker** | Runs the LangGraph pipeline per ticket | Python, LangGraph, LangChain, Celery |
| **faiss-service** | Standalone vector-search HTTP service | FastAPI, FAISS |
| **celery-worker / email-worker** | Background jobs (reuse the backend image, different entrypoint command) | Celery |
| **minio** | Object storage (attachments, exports) | MinIO (S3-compatible) |
| **prometheus / grafana / loki / promtail** | Metrics, dashboards, log aggregation | — |
| **adminer** | DB admin UI (dev convenience) | Adminer |

## The AI pipeline

A ticket flows through a LangGraph graph with four nodes:

1. **Router** — classifies the question into a category (also functions
   as intent recognition) and picks a specialist path.
2. **Specialist** — retrieves relevant knowledge-base chunks (RAG over
   FAISS) and drafts an answer grounded in them.
3. **Supervisor** — scores confidence in the drafted answer and decides:
   auto-respond, ask a clarifying question, or escalate.
4. **Write-back** — the backend receives the decision via an internal
   endpoint, updates the ticket, and (if escalating) routes it to a
   faculty member based on admin-configured routing rules.

If a faculty member marks their response "verified", a **Learning Agent**
writes that Q&A pair into the knowledge base and rebuilds the vector
index — only verified content is ever indexed, never raw AI output or
unverified student text.

> **Design note:** the original spec described a 7-stage pipeline
> (intent/entity/retrieval/decision/confidence/learning/analytics as
> separate modules). After building and testing the 4-node graph above,
> the team decided the substance is already covered — the router node
> does intent classification, and confidence+decision genuinely is one
> function, not two. Splitting further would mean rewriting tested,
> working code purely for structural conformance. See
> `project-management/task_board.md`'s AI-05 entry for the full
> reasoning. Revisit if a concrete future requirement needs true entity
> extraction (e.g. pulling a specific course code out of a question)
> distinct from category.

## Backend layout

```
backend/app/
├── main.py       # FastAPI app + router mounting
├── core/         # config.py (Settings), security.py (JWT/hashing)
├── db/
│   ├── session.py, models/, migrations/
├── api/
│   ├── deps.py   # get_current_user, require_admin, require_role()
│   ├── internal.py  # ai-worker write-back, /internal/v1, not public
│   └── v1/       # health, auth, tickets, faculty, admin
├── schemas/      # Pydantic request/response models
├── services/     # business logic
└── workers/      # reserved for backend-owned Celery entrypoints
```

This is a deliberate departure from a stricter Clean Architecture split
(`controllers/ → services/ → repositories/ → models/`) that an earlier
spec proposed. The simpler layout above was already built, tested, and
working by the time that spec arrived; migrating it for structural
conformance alone would have cost real time for no functional gain. See
`project-management/task_board.md`'s `ARCH-DECISION-01` for the full
reasoning.

## Roles & access control

Three roles: `student`, `faculty`, `admin`.

- **Student** — own tickets only: create, view, follow up.
- **Faculty** — tickets routed to them; can respond and mark answers
  verified.
- **Admin** — everything: users, routing rules, analytics.

Access control is enforced **server-side**, in FastAPI dependency
injection (`get_current_user`, `require_admin`, `require_role(...)`),
never trusted from the frontend. A ticket that exists but isn't owned by
(or routed to) the caller returns **404**, not 403 — the API doesn't
reveal that the ticket exists at all to someone who shouldn't see it.

## Request flow, end to end

1. Student submits a question → frontend → nginx → FastAPI.
2. Backend authenticates (JWT), writes the ticket + first message to
   Postgres, and enqueues an AI job on Redis.
3. `ai-worker` picks up the job, runs the LangGraph pipeline.
4. `ai-worker` calls back to the backend's internal write-back endpoint
   with its decision.
5. If auto-answered: the student sees the answer (polling, see below).
   If escalated: the ticket is routed to the matching faculty member via
   admin-configured routing rules.
6. Faculty responds; if they mark it verified, the Learning Agent
   re-indexes it into the knowledge base.
7. Email notifications fire at each state transition. Prometheus/
   Grafana/Loki observe backend, worker, and infra health.

**Real-time updates:** the frontend polls `GET /tickets/{id}/status`
every 5 seconds rather than using websockets — a deliberate simplicity
choice for this project's scale, not a placeholder for a planned
websocket layer.

## Known, disclosed gaps

- No in-product way to create the **first admin account** — signup
  always creates a student, and the only role-promotion path itself
  requires an existing admin. A real deployment needs a seed script or
  first-run bootstrap step before this decision is made.
- The full stack has never been build/run tested against a real Docker
  daemon or AWS account (none available during development) — every
  infra artifact (`docker-compose.yml`, Dockerfiles, `infra/aws/`) has
  been structurally validated (parses correctly, every reference
  resolves) but not deploy-tested. See [Deployment](../deployment/) for
  what that means in practice.
- Admin knowledge-base document management (upload/list/delete via the
  UI) isn't built yet — the pipeline can ingest documents placed
  directly under `knowledgebase/`, but there's no admin-facing upload
  flow.
