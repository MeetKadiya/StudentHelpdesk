# Folder Structure — Student HelpDesk AI

Status: v2.1 — v2.0's enterprise restructure (supersedes v1's flat
backend/app layout) adopted, EXCEPT the backend/ section, which
ARCH-DECISION-01 (2026-08-10) reverted back to an app/-wrapped layout —
see that section below for the real structure. Canonical. Do not change
without approval — propose via task_board.md.

## Top level
```
student-helpdesk-ai/
├── frontend/
├── backend/
├── agents/
├── knowledgebase/
├── docker/
├── infra/
├── monitoring/
├── docs/
├── tests/
├── design/
├── diagrams/
├── presentation/
├── handoff/
├── scripts/
├── .github/
├── project-management/
├── README.md
├── LICENSE
├── CHANGELOG.md
├── CONTRIBUTING.md
├── TEAM_PROTOCOL.md
├── PROJECT_STATUS.md
├── docker-compose.yml
└── .env.example
```

## frontend/ (OWNER: Claude-3)
```
frontend/
├── app/
├── components/
├── features/
├── hooks/
├── providers/
├── contexts/
├── services/
├── styles/
├── types/
├── utils/
├── assets/
└── public/
```

## backend/ (OWNER: Claude-1) — real layout, `app/`-wrapped
ARCH-DECISION-01 (resolved 2026-08-10): the flat Clean Architecture layout
below was never actually built. `backend/app/` — what BACKEND-01..07
built and tested against — is the real, permanent structure. See
architecture.md §4.2 for the full reasoning.
```
backend/
├── app/
│   ├── main.py            # FastAPI entrypoint, mounts /api/v1 + /internal/v1
│   ├── core/
│   │   ├── config.py       # Settings (pydantic-settings)
│   │   └── security.py      # password hashing, JWT issue/verify
│   ├── db/
│   │   ├── session.py       # async engine, Base, get_db()
│   │   ├── models/           # one file per table (user, ticket, message,
│   │   │                       agent_run, faculty_routing_rule, audit_log)
│   │   └── migrations/        # Alembic — versions/, env.py
│   ├── api/
│   │   ├── deps.py            # get_current_user, require_admin,
│   │   │                        require_role() factory
│   │   ├── internal.py         # ai-worker write-back, mounted at
│   │   │                         /internal/v1 — NOT under /api/v1
│   │   └── v1/                  # __init__.py aggregates health, auth,
│   │                              tickets, faculty, admin route modules
│   ├── schemas/                  # Pydantic I/O, one file per domain
│   ├── services/                  # business logic, one file per domain —
│   │                                talks to the ORM directly (no separate
│   │                                repositories/ layer underneath)
│   └── workers/                    # reserved, currently empty
├── alembic.ini
├── requirements.txt
├── pyproject.toml
└── tests/                            # pytest + httpx.AsyncClient
```
No `controllers/`, `repositories/`, `middleware/`, `security/`, `config/`,
or `database/` as separate top-level dirs — that logic lives inside
`app/core/`, `app/api/`, and `app/db/` instead.

## agents/ (OWNER: Claude-2) — AI platform, each stage isolated
```
agents/
├── intent/
├── entity/
├── retrieval/
├── decision/
├── confidence/
├── learning/
├── analytics/
├── rag/
├── prompts/
├── embeddings/
├── evaluation/
└── tests/
```

## knowledgebase/ (OWNER: Claude-2)
```
knowledgebase/
├── documents/
├── policies/
├── circulars/
├── faqs/
├── embeddings/
└── metadata/
```
Only verified documents are indexed (see architecture.md §4.5).

## docker/ (OWNER: Claude-4)
Per-service Dockerfiles (frontend, backend, ai-worker, faiss-service, etc.)
referenced by the root `docker-compose.yml`.

## infra/ (OWNER: Claude-4)
AWS IaC + free-tier deployment configs (Render/Railway/Supabase), with a
documented mapping to AWS in `docs/cloud/`.

## monitoring/ (OWNER: Claude-4)
Prometheus, Grafana, Loki configs.

## docs/ (OWNER: Claude-4) — human-facing documentation
```
docs/
├── architecture/
├── database/
├── api/
├── deployment/
├── cloud/
├── security/
├── assignment-report/
├── user-manual/
├── developer-guide/
└── diagrams/            # exported/rendered diagrams referenced by docs
```

## tests/ (OWNER: Claude-4)
Cross-service integration and end-to-end tests (distinct from
`backend/tests/`, which is backend-unit-test-only, and `agents/tests/`,
which is AI-pipeline-unit-test-only).

## design/ (OWNER: Claude-3)
UX/UI mockups and design assets (Figma exports, tokens, etc). Distinct from
`diagrams/`, which holds system/architecture diagrams, not UI design.

## diagrams/ (shared — whoever authors a diagram)
Source files (e.g. `.drawio`, `.excalidraw`) for system/architecture
diagrams. Exported images referenced from docs live in `docs/diagrams/`.

## presentation/ (OWNER: Claude-4, content from all)
Slides / demo material for the assignment submission.

## handoff/ (shared)
Cross-agent handoff notes for anything that doesn't fit the structured
`project-management/state_claudeX.md` format — e.g. a longer design
rationale doc one agent wants the next to read before touching a module.
Keep this light; `project-management/` remains the primary coordination
mechanism per agent1.md.

## Root meta files
- `README.md` — project overview, quickstart (`docker compose up`).
- `LICENSE` — project license.
- `CHANGELOG.md` — human-readable release/change log (distinct from the
  Change Log sections inside individual project-management/*.md files).
- `CONTRIBUTING.md` — contribution guidelines.
- `TEAM_PROTOCOL.md` — human-readable summary of the four-agent protocol
  (derived from agent1.md); project-management/ remains the operational
  source of truth.
- `PROJECT_STATUS.md` — human-facing summary of current status; the live,
  continuously-updated tracking file is
  `project-management/project_status.md` — don't let these two drift far
  apart, but PROJECT_STATUS.md is a periodic summary, not updated every
  session.
- `docker-compose.yml` — top-level, single command boots everything.
- `.env.example` — top-level, aggregated example env vars (per-service
  `.env.example` files, e.g. `backend/.env.example`, remain the detailed
  source; root one is for `docker compose up` convenience).

## Notes
- Ownership is a default per agent1.md's team structure; a Claude instance
  touches another owner's folder only if task_board.md explicitly assigns it.
- Subfolders not yet created get added by the owning Claude as work begins —
  the skeleton above is pre-created so paths are stable, but don't assume
  files exist just because a folder does.
