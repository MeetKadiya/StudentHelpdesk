# State — Claude-1 (Architecture + Backend + Database)

# Session
2026-07-21

# Current Task
BACKEND-04 (DONE). No further BACKEND-* task is currently defined on
task_board.md — next backend work will be a new task_board.md entry (e.g.
admin ticket endpoints, or wiring BACKEND-04 into AI-04's ai-worker flow
once Claude-2 gets there).

# Completed Tasks
- SETUP-01: Bootstrapped project-management/ docs (architecture, requirements,
  folder_structure, coding_standards, api_contract, database_schema,
  task_board, project_status) and all 4 state files. Created top-level repo
  folder skeleton (frontend/, backend/, agents/, rag/, docker/, infra/, docs/,
  design/, knowledgebase/, scripts/, .github/).
- BACKEND-01: Scaffolded FastAPI app — app factory, env-based settings, async
  SQLAlchemy engine/session, v1 API router, and a working GET /api/v1/health
  + GET / endpoint. Added requirements.txt and .env.example.
- BACKEND-02: Implemented `users`, `tickets`, `messages` SQLAlchemy models
  (backend/app/db/models/) and the first Alembic migration
  (0001_initial_schema) with async-engine-compatible env.py. Updated
  database_schema.md to v0.2.
- BACKEND-03: Implemented auth endpoints — POST /api/v1/auth/signup, /login,
  /refresh. JWT access + refresh tokens (python-jose), bcrypt password
  hashing (passlib), thin route handlers delegating to
  services/auth_service.py. Added backend/app/api/deps.py with
  get_current_user + require_admin dependencies for future protected routes.
  Updated api_contract.md to v0.3.
- BACKEND-04: Implemented student ticket endpoints — POST /api/v1/tickets,
  GET /api/v1/tickets, GET /api/v1/tickets/{id}, POST
  /api/v1/tickets/{id}/messages, GET /api/v1/tickets/{id}/status. All routes
  use get_current_user and scope to the authenticated student; a ticket that
  exists but isn't owned by the caller returns 404 (not 403). Ticket
  creation writes the Ticket + its first Message in one transaction. Status
  endpoint is a plain poll (websocket question left open per
  requirements.md §5, not resolved by this task). Updated api_contract.md to
  v0.4.

# Files Created
- project-management/architecture.md
- project-management/requirements.md
- project-management/folder_structure.md
- project-management/coding_standards.md
- project-management/api_contract.md
- project-management/database_schema.md
- project-management/task_board.md
- project-management/project_status.md
- project-management/state_claude1.md (this file)
- project-management/state_claude2.md
- project-management/state_claude3.md
- project-management/state_claude4.md
- backend/app/main.py
- backend/app/__init__.py
- backend/app/core/config.py
- backend/app/core/__init__.py
- backend/app/core/security.py
- backend/app/db/session.py
- backend/app/db/__init__.py
- backend/alembic.ini
- backend/app/db/migrations/env.py
- backend/app/db/migrations/script.py.mako
- backend/app/db/migrations/versions/0001_initial_schema.py
- backend/app/db/models/__init__.py
- backend/app/db/models/user.py
- backend/app/db/models/ticket.py
- backend/app/db/models/message.py
- backend/app/api/__init__.py
- backend/app/api/v1/__init__.py (aggregates routers)
- backend/app/api/v1/health.py
- backend/app/api/v1/auth.py
- backend/app/api/deps.py
- backend/app/schemas/__init__.py
- backend/app/schemas/auth.py
- backend/app/services/__init__.py
- backend/app/services/auth_service.py
- backend/app/workers/__init__.py
- backend/tests/  (empty, DEVOPS-03 owns pytest config)
- backend/requirements.txt
- backend/.env.example
- backend/app/schemas/ticket.py
- backend/app/services/ticket_service.py
- backend/app/api/v1/tickets.py

# Files Modified
- project-management/api_contract.md — v0.2, v0.3, then v0.4 (health, then
  auth, then student ticket endpoints documented as Implemented).
- project-management/task_board.md — BACKEND-01 through BACKEND-04 all
  marked DONE.
- project-management/database_schema.md — bumped to v0.2 (users/tickets/
  messages implemented).
- project-management/project_status.md — completion % bumped to ~13%,
  session log updated through BACKEND-04.
- backend/app/api/v1/__init__.py — wired in auth router, then tickets
  router.
- backend/requirements.txt — added email-validator (required by pydantic
  EmailStr).

# Remaining TODO (my ownership)
- None currently on task_board.md for Claude-1 (backend). Watch for a new
  BACKEND-* entry (e.g. admin ticket endpoints, or a job-enqueue contract
  once AI-04 needs one from the backend side).

# Correction Log
- 2026-08-08: The BACKEND-04 session that produced schemas/ticket.py,
  services/ticket_service.py, and api/v1/tickets.py initially wrote those
  three files to the wrong filesystem (Claude's own sandbox, not the real
  I:\StudentHelpDesk repo) — they never actually existed on disk despite
  being reported DONE. Caught during DEVOPS-03 (Claude-4) when the files
  came back ENOENT. Re-created via the Filesystem connector and confirmed
  present with a fresh read + a real pytest run against a mirrored copy (2
  passed). No content changed from what was originally designed — this was
  purely a "which computer" tooling mistake, not a logic error. Flagging so
  no future session assumes a prior DONE task_board.md entry guarantees the
  files are actually on disk without spot-checking.

# Known Bugs
None known. Update 2026-08-08: the health/root routes (and, incidentally,
the full app import graph including auth/tickets) HAVE now been executed for
real — see DEVOPS-03 in project_status.md and the Correction Log above. Auth
and ticket endpoints that touch the database are still unverified against a
real Postgres instance (the DEVOPS-03 smoke-test used SQLite in a throwaway
sandbox, not this repo's Postgres config) — that verification is still
pending on DEVOPS-01 (docker-compose) or an equivalent local Postgres setup.
A full smoke-test should still cover: pip install, alembic upgrade head,
uvicorn boot, and a signup->login->refresh->create-ticket round trip against
real Postgres.

# Current Architecture Decisions
- See project_status.md "Current Architecture Decisions" for the shared log.
- Auth: JWT access token (60 min default) + JWT refresh token (7 days,
  hardcoded in core/security.py — not yet in Settings; consider promoting to
  a configurable setting if a task needs a different refresh lifetime).
- Refresh token strategy is stateless (no refresh-token table/blocklist) —
  acceptable for v1 per requirements.md scope, but means refresh tokens
  cannot be revoked server-side. Flag this if requirements change.

# APIs Added
- GET /api/v1/health (public)
- GET / (public)
- POST /api/v1/auth/signup (public)
- POST /api/v1/auth/login (public)
- POST /api/v1/auth/refresh (public)
- POST /api/v1/tickets (auth required)
- GET /api/v1/tickets (auth required)
- GET /api/v1/tickets/{ticket_id} (auth required)
- POST /api/v1/tickets/{ticket_id}/messages (auth required)
- GET /api/v1/tickets/{ticket_id}/status (auth required)
All documented in api_contract.md v0.4.

# Database Changes
- users, tickets, messages tables (migration 0001_initial_schema). No schema
  changes since BACKEND-02 — BACKEND-03 and BACKEND-04 only read/write
  existing tables/columns.

# Prompt Changes
N/A (not my ownership — see state_claude2.md).

# Important Notes
- backend/requirements.txt is a plain pip requirements file — keep consistent
  unless a task_board.md entry changes tooling.
- DEVOPS-03 ran the app for real in a sandbox (SQLite, not this repo's
  Postgres config) and confirmed it boots and the health/ticket routes work.
  Still verify the stack boots against real Postgres once DEVOPS-01
  (docker-compose) exists.
- get_current_user / require_admin (app/api/deps.py) were consumed directly
  by BACKEND-04's ticket routes — no auth wiring was reinvented.
- Ticket ownership check (`_get_owned_ticket` in ticket_service.py) returns
  404 for both "doesn't exist" and "not yours" — any future admin routes
  that legitimately need cross-student access should use require_admin +
  a separate service function, not loosen this one.

# Exact Resume Point
No BACKEND-* task is currently open for Claude-1 on task_board.md — BACKEND-
01 through BACKEND-04 are all DONE. Start the next session by reading
requirements.md + architecture.md + api_contract.md + database_schema.md +
task_board.md + this file to check whether a new task has been added.
Likely next candidates (not yet on the board, don't start until they are):
admin ticket endpoints (list all/filter, respond, update status — see
api_contract.md "Planned Endpoints"), or backend-side support for AI-04
(job enqueue contract for the ai-worker, once Claude-2 needs one). Backend
code has now been executed and passes (DEVOPS-03, SQLite sandbox) but never
against a real Postgres instance — whoever picks up DEVOPS-01 (docker-
compose) should smoke-test signup -> login -> create ticket -> list -> add
message -> status against real Postgres as part of that work.
