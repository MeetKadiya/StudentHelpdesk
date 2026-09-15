# Architecture — Student HelpDesk AI

Status: v2.1 — v2.0's enterprise restructure adopted per stakeholder
direction; §4.2's Clean Architecture backend layout was superseded
2026-08-10 by ARCH-DECISION-01 (backend/app/ kept as definitive — see
that section for why). Do not redesign again without a similar explicit
instruction — see §9 Change Control.

## 1. Overview
Cloud-based, multi-agent AI Student Help Desk built as a set of independently
deployable services communicating over APIs. Students, faculty, and admins
each get a portal; questions flow through a multi-stage AI agent pipeline
(intent → entity → retrieval/RAG → decision → confidence) before either
auto-answering or escalating to a routed faculty member.

## 2. High-Level Architecture
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
Rule: everything communicates through APIs. Never allow direct
frontend-to-database or module-to-module bypass of the service layer.

## 3. Repository Layout (top level)
```
student-helpdesk-ai/
├── frontend/           # Next.js app — OWNER: Claude-3
├── backend/            # FastAPI — OWNER: Claude-1 (see §4.2 — NOT Clean
│                         Architecture; ARCH-DECISION-01 settled this)
├── agents/             # AI platform (intent/entity/RAG/decision/etc) — OWNER: Claude-2
├── knowledgebase/       # Source documents for RAG ingestion — OWNER: Claude-2
├── docker/               # Dockerfiles per service — OWNER: Claude-4
├── infra/                 # AWS IaC + free-tier deployment configs — OWNER: Claude-4
├── monitoring/              # Prometheus/Grafana/Loki configs — OWNER: Claude-4
├── docs/                      # Human-facing documentation — OWNER: Claude-4
├── tests/                       # Cross-service integration/E2E tests — OWNER: Claude-4
├── design/                        # UX/UI design assets — OWNER: Claude-3 (superseded
│                                     by diagrams/ + docs/diagrams for system diagrams;
│                                     design/ remains for UI mockups specifically)
├── diagrams/                        # System/architecture diagrams (source files)
├── presentation/                      # Slides / demo material for assignment
├── handoff/                             # Cross-agent handoff notes (see below)
├── scripts/                              # Maintenance / one-off scripts
├── .github/                                # CI workflows
├── project-management/                       # Multi-agent coordination docs
├── README.md
├── LICENSE
├── CHANGELOG.md
├── CONTRIBUTING.md
├── TEAM_PROTOCOL.md
├── PROJECT_STATUS.md              # human-facing summary; live tracking stays
│                                    in project-management/project_status.md
├── docker-compose.yml              # top-level, references docker/*.Dockerfile
└── .env.example
```

## 4. Application Modules

### 4.1 Frontend (Claude-3)
Student Portal, Faculty Portal, Admin Portal, Authentication, Analytics
Dashboard, AI Chat, Knowledge Base browser, Notifications, Ticket Management.
Structure: `app/ components/ features/ hooks/ providers/ contexts/ services/
styles/ types/ utils/ assets/ public/`.

### 4.2 Backend (Claude-1)
ARCH-DECISION-01 (resolved 2026-08-10): the previously-specified Clean
Architecture layers (`api/ → controllers/ → services/ → repositories/ →
models/`) were NOT adopted. `backend/app/` — the layout BACKEND-01..04
actually built and tested against — is the definitive, permanent
structure instead. Reasoning: that code was already working and tested
(auth, student ticket CRUD, pytest suite passing) by the time the
Clean Architecture spec arrived; migrating it for zero functional gain
directly worked against getting Part 2 (faculty/admin/AI write-back)
shipped quickly. Real layout:
```
backend/
├── app/
│   ├── main.py          # FastAPI app + router mounting
│   ├── core/            # config.py (Settings), security.py (JWT/hashing)
│   ├── db/
│   │   ├── session.py   # async engine + Base + get_db()
│   │   ├── models/      # SQLAlchemy ORM models, one file per table
│   │   └── migrations/  # Alembic — versions/, env.py, script.py.mako
│   ├── api/
│   │   ├── deps.py      # get_current_user, require_admin, require_role()
│   │   ├── internal.py  # ai-worker write-back — mounted at /internal/v1,
│   │   │                  NOT under /api/v1 / nginx routing
│   │   └── v1/          # __init__.py aggregates: health, auth, tickets,
│   │                      faculty, admin route modules
│   ├── schemas/         # Pydantic request/response models, one per domain
│   ├── services/        # business logic, one file per domain — this IS
│   │                      the "services layer" Clean Architecture wanted,
│   │                      just without a separate repositories/ layer
│   │                      underneath it (services talk to the ORM
│   │                      directly via AsyncSession)
│   └── workers/         # reserved — Celery worker entrypoints, if the
│                          backend ever needs its own (distinct from
│                          agents/worker/, which is ai-worker's)
├── alembic.ini
├── requirements.txt
├── pyproject.toml       # pytest/black/ruff config
└── tests/               # unit tests (pytest + httpx.AsyncClient)
```
There is no `controllers/` or `repositories/` layer, and no
`backend/database/` (migrations live under `app/db/migrations/`
permanently — not moving). `middleware/`, `security/`, `config/` as
separate top-level dirs were also not adopted; that logic lives in
`core/` and inline FastAPI dependency injection instead.
Responsibilities (unchanged from the original spec): Authentication,
RBAC, Ticket Engine, Notification Service, Knowledge Base APIs, Faculty
APIs, Student APIs, Admin APIs, Analytics APIs — Faculty/Admin API
implementation status tracked in task_board.md (BACKEND-05/06/07 done as
of 2026-08-10; Knowledge Base and Analytics APIs still open).

### 4.3 AI Platform (Claude-2)
Pipeline stages, each an isolated module under `agents/`:
`intent/ entity/ retrieval/ decision/ confidence/ learning/ analytics/ rag/
prompts/ embeddings/ evaluation/ tests/`.
- Intent Recognition — classify the question type.
- Entity Extraction — pull structured fields (course code, deadline, etc).
- Retrieval / RAG — FAISS-backed retrieval over `knowledgebase/`.
- Decision Agent — auto-answer vs escalate.
- Confidence Agent — scores the candidate answer; low score forces escalation.
- Learning Agent — ingests faculty-verified answers back into the knowledge
  base (only verified content gets indexed — see §4.5).
- Analytics Agent — feeds ticket/agent-performance analytics.
Orchestration: LangGraph graph wiring these nodes; LangChain for LLM/tool
primitives.

### 4.4 Database (Claude-1 for schema, shared)
- PostgreSQL — system of record.
- Redis — cache, Celery broker, sessions (ephemeral, never system of record).
- Vector DB (FAISS service) — derived index over knowledgebase content.
- Object Storage (MinIO, S3-compatible) — attachments, exports.

### 4.5 Knowledge Base (Claude-2)
`knowledgebase/documents/ policies/ circulars/ faqs/ embeddings/ metadata/`.
Only verified documents are indexed — faculty-approved answers from the
Learning Agent land in `documents/` (or a `verified/` subpath) before
re-indexing; nothing is auto-indexed from unverified student/AI content.

### 4.6 Infrastructure (Claude-4)
Docker + Docker Compose (single `docker compose up` boots everything),
NGINX, Prometheus + Grafana + Loki (monitoring/), GitHub Actions (CI/CD),
AWS mapping for production (see §7).

## 5. Roles & RBAC
Three roles: `student`, `faculty`, `admin`.
- **student** — own tickets only (create, view, follow-up).
- **faculty** — sees tickets routed/escalated to them or their department;
  can respond, mark answers as verified (feeds the Learning Agent).
- **admin** — sees everything; manages knowledgebase, users, routing rules,
  analytics.
RBAC enforced at the API layer (`security/` + dependency injection in
`api/deps.py`), never trusted from the frontend alone.

## 6. High-Level Request Flow
1. Student submits a question (frontend → NGINX → FastAPI `api/`).
2. Backend authenticates (JWT), persists ticket/message (PostgreSQL),
   enqueues an AI job (Redis).
3. AI worker runs the LangGraph pipeline: intent → entity → retrieval (RAG
   over FAISS) → decision → confidence.
4. If confidence is high enough: auto-answer written back, student notified.
   If not: ticket is escalated and routed to the appropriate faculty member
   (routing keyed off category/department — see database_schema.md).
5. Faculty responds via Faculty Portal; can mark their answer "verified",
   which triggers the Learning Agent to add it to the knowledge base.
6. Email Notification Service sends transactional emails at each state
   transition (ticket created, answered, escalated, resolved).
7. Attachments/exports via MinIO. Prometheus/Grafana/Loki observe backend,
   workers, and infra health. Analytics Agent + Analytics APIs surface
   ticket volume, escalation rate, response time, agent accuracy.

## 7. Cloud Strategy
Assignment requires an AWS architecture narrative; implementation may use
free-tier equivalents, documented as an explicit mapping (see
`docs/cloud/` once Claude-4 writes it):
| Component        | Free/dev implementation | Production AWS mapping |
|-------------------|--------------------------|--------------------------|
| Compute            | Docker Compose (Render/Railway) | EC2 / ECS |
| Managed Postgres    | Supabase / local Postgres        | RDS |
| Object storage       | MinIO                              | S3 |
| Auth                   | Backend JWT                          | Cognito (optional) |
| CDN/Edge                 | Cloudflare                             | CloudFront |
| Monitoring                 | Prometheus/Grafana/Loki                  | CloudWatch |
| Load balancing               | NGINX                                      | Elastic Load Balancer |

## 8. Non-Goals / Out of Scope (v1)
- Multi-institution / multi-tenant support.
- Native mobile apps.
- Voice/phone channel.

## 9. Change Control
This file is the source of truth for architecture. Any Claude instance that
believes a change is needed proposes it via `task_board.md` /
`project_status.md` rather than silently redesigning — the v1→v2 change
recorded here came directly from the project stakeholder, not from agent
improvisation, and is recorded as such in project_status.md's decision log.
