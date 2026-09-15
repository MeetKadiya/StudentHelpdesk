# Coding Standards — Student HelpDesk AI

Status: v2.0 — updated for the flat Clean Architecture backend layout and
expanded tech stack (see architecture.md v2 / folder_structure.md v2).

## General
- Keep style consistent with what's already in a file/module before
  introducing a new pattern.
- Never rewrite completed modules to "improve style" — only touch code
  that's in scope for your current task.
- Every new module/function gets at least a docstring explaining purpose.
- No secrets/credentials committed. Use `.env` (gitignored) + `.env.example`
  at both the service level (e.g. `backend/.env.example`) and root
  (`.env.example`) — see folder_structure.md.
- Every feature ships with: documentation, input validation, error
  handling, logging, tests, and env-var configuration. Not optional.

## Backend — Clean Architecture layering (backend/, no `app/` wrapper)
Request flow: `api/` (routes) → `controllers/` (reserved) → `services/`
(business logic) → `repositories/` (data access) → `models/` (ORM).

- `api/` — FastAPI routers only. Parse/validate request (via `schemas/`),
  call a service (or controller if one exists for that route), return the
  response. No business logic, no direct DB/ORM access here.
- `controllers/` — RESERVED layer. Add a controller for a route only when
  it needs orchestration beyond a single service call (e.g. calling 2+
  services and combining results, or non-trivial request shaping). If a
  route is a straight passthrough to one service method, call the service
  directly from `api/` — don't add a pass-through controller with no logic.
- `services/` — business logic, orchestrates repositories, contains the
  actual rules (e.g. "signup fails if email exists"). Services never
  import FastAPI types (no `Request`, no `HTTPException` — raise plain
  exceptions, let `api/` translate them to HTTP responses).
- `repositories/` — the only layer that touches SQLAlchemy queries
  directly. One repository per aggregate/model (e.g. `UserRepository`,
  `TicketRepository`). Services call repositories, never `db.execute`/
  `db.scalar` directly.
- `models/` — SQLAlchemy ORM models only, no business logic.
- `schemas/` — Pydantic v2 request/response models.
- `middleware/` — CORS, logging, rate limiting — cross-cutting HTTP
  concerns, registered in `main.py`.
- `security/` — password hashing (`security/password.py`), JWT
  (`security/jwt.py`). No business logic.
- `config/` — env-based settings (pydantic-settings).
- `database/` — `session.py` (engine/session factory) + `migrations/`
  (Alembic). No ORM models here — those live in `models/`.
- `workers/` — Celery / email worker entrypoints. Thin — call into
  `services/` for actual logic.
- `utils/` — small stateless helpers with no home in the layers above.
- `tests/` — `pytest`, `test_*.py`, mirroring the layer being tested
  (e.g. `tests/services/test_auth_service.py`).

Python 3.12+, formatted with `black`, linted with `ruff`. Type hints
required on public functions. FastAPI + Pydantic v2. SQLAlchemy async ORM +
Alembic for migrations — never a raw migration-less schema change.
Logging via the standard `logging` module (structured where possible) — no
bare `print()` in application code.

## Frontend (Next.js 15 / React 19 / TypeScript)
- TypeScript strict mode. `prettier` + `eslint` (Next.js config).
- App Router, server components by default, client components only where
  interactivity requires it (`"use client"` explicit).
- Structure: `app/ components/ features/ hooks/ providers/ contexts/
  services/ styles/ types/ utils/ assets/ public/` (see folder_structure.md).
  `services/` centralizes API calls — components don't `fetch` backend
  routes directly.
- Styling: TailwindCSS + shadcn/ui. Never duplicate a component that
  already exists — prefer composing/extending.
- Data fetching/caching: TanStack Query. Forms: React Hook Form + Zod for
  validation. Motion: Framer Motion, used sparingly and purposefully.

## AI Platform (agents/) — LangGraph / LangChain
- Each pipeline stage (`intent/ entity/ retrieval/ decision/ confidence/
  learning/ analytics/ rag/`) is its own isolated module — no stage
  reaches into another stage's internals; they communicate via the shared
  LangGraph state schema.
- Each agent node is a pure function of (state) -> (state patch) where
  feasible; side effects (LLM calls, retrieval, embeddings) isolated and
  documented.
- Prompts live in `agents/prompts/` as versioned template files, not
  inlined as raw strings scattered through node code.
- Embeddings: Sentence Transformers by default; `agents/embeddings/`
  isolates the embedding-model choice so it can change without touching
  retrieval logic.
- LLM provider abstraction: both an OpenAI and a Gemini client wrapper are
  expected (architecture.md tech stack) — code against a small internal
  interface, not a specific provider's SDK, so the default can be swapped
  via config.
- Agent state schema changes are a big deal — document in
  `project_status.md` "Current Architecture Decisions" and coordinate via
  task_board.md since other agents may depend on the shape.
- `agents/evaluation/` and `agents/tests/` — every new agent stage ships
  with at least one evaluation case, per requirements.md FR-27.

## API Contracts
- Any new/changed REST endpoint MUST be reflected in `api_contract.md` in
  the same session it's implemented — not "later."
- Never rename an existing API endpoint or change its response shape
  without a task_board.md entry and a note in project_status.md (breaking
  change).

## Database
- Never rename existing tables/columns without an explicit task_board.md
  entry (agent1.md rule: "Never rename database tables").
- All schema changes go through Alembic migrations
  (`backend/database/migrations/`), and `database_schema.md` is updated to
  match in the same session.

## Security (NFR-6)
- Input validation via Pydantic schemas on every endpoint.
- RBAC enforced in `api/deps.py` dependencies (`get_current_user`,
  `require_role(...)`) — never trust a role claim from the frontend alone.
- Rate limiting and secure headers via `middleware/`.
- Audit log sensitive actions (role changes, knowledgebase document
  edits/deletes) — table/mechanism TBD, track as a task when designed.

## Commits / Change Hygiene (even without live git ops per session)
- Each session's work should be describable as a clean, reviewable diff:
  one task (or a small tightly-related set) per session where possible.
- Update the owning state file and task_board.md before ending a session —
  no undocumented partial work.
- User-facing meta files (README.md, CHANGELOG.md) get updated when a
  session ships something a human reviewer would care about — not every
  internal refactor needs a CHANGELOG entry, but every new feature does.
