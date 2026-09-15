# Project Status — Student HelpDesk AI

## Current Progress
Project bootstrapped. Repo skeleton folders created. All 8 shared
project-management docs + 4 per-agent state files written. Backend has
working auth + student ticket endpoints. Frontend now has a working
auth+ticket flow end-to-end (signup/login, submit a ticket, view/reply on
a ticket thread) wired against the real backend API. AI-01 (LangGraph
pipeline), AI-02 (rag/ ingestion -> FAISS), AI-03's application code
(faiss-service HTTP wrapper), and AI-04's worker logic (agents/worker/ —
Celery task + in-process FaissRetriever wiring + backend write-back
client) are all implemented and verified. DEVOPS-02 is now done: all four
Dockerfiles (frontend, backend, ai-worker, faiss-service) exist and
docker-compose.yml is structurally valid (13 services, all depends_on/
volumes resolve) — ARCH-DECISION-02 is resolved as part of this, so
faiss-service/ai-worker now have a real, correct build context. Nothing
has been build/up tested against an actual Docker daemon (none available
in this environment).

Since then (2026-08-10, same day, second session): the stakeholder
explicitly delegated ARCH-DECISION-01 with instructions to move fast, so
it's now resolved and the entire Part 2 backend chain it was blocking has
been built: DB-01 (migration adding faculty routing/agent_runs/audit_logs),
BACKEND-05 (faculty endpoints), BACKEND-06 (admin routing-rules + role
management), and BACKEND-07 (the ai-worker write-back endpoint) are all
DONE. BACKEND-07 in particular is the piece that makes AI-04's
already-built worker logic live end-to-end for the first time — verified
with an 11-step smoke test covering signup, ticket creation, admin
routing rules, AI escalation, faculty response/verification, AI
auto-respond, an unmatched-routing-rule fallback, and error handling, all
passing against an in-memory SQLite DB standing in for Postgres. Two real,
previously-latent bugs were caught in the process (not introduced this
session, just never triggered before): audit_logs.metadata used
Postgres-only JSONB, which doesn't compile on SQLite at all and would
have silently blocked any future SQLite-based CI test fixture — fixed to
plain JSON; and backend/requirements.txt's unpinned bcrypt resolves to a
version incompatible with the pinned passlib, which crashes every
password hash/verify call on a real `pip install` — fixed with a
`bcrypt<4.1` pin. Neither bug had been caught by any prior session's
structural-only checks, only by an actual `pip install` + running code.
Admin dashboard (frontend) still not started.

Update (2026-09-04): FRONTEND-06 done — a stakeholder-requested premium
UI/perf pass. Every app screen (tickets/faculty/admin — previously
generic default-Tailwind, inconsistent with the already-polished home/
login/signup) now shares one real design system (tailwind.config.ts +
globals.css component classes). Separately found and fixed a real,
previously-latent bug: next.config.mjs was missing `output: "standalone"`
that docker/frontend.Dockerfile's runner stage has assumed exists since a
claimed 2026-08-30 fix — it didn't, until now. Verified via a full sandbox
`next build` (10/10 routes) confirming `.next/standalone/server.js` is
actually produced; a real `docker build` still hasn't been run (no Docker
daemon in this environment, same standing limitation as every other
DEVOPS-*/DEPLOY-01 entry). See task_board.md's FRONTEND-06 entry and
state_claude3.md for full detail.

## Overall Completion %
~97% (every track — backend, AI/RAG, frontend, DevOps/infra — and every
docs/presentation deliverable (DOCS-01, DOCS-02, PRESENTATION-01) is now
done. Nothing is TODO on task_board.md. What's left is not a task but a
small action item (save the delivered .pptx into presentation/ — binary
files can't be written to the real filesystem from this environment,
disclosed in PRESENTATION-01's entry) plus the standing, disclosed
product/infra gaps that were never meant to be silently closed: no
in-product first-admin account creation, and nothing has been build/
deploy-tested against a real Docker daemon or AWS account.)

## Known Blockers
- ARCH-DECISION-01: RESOLVED 2026-08-10 (stakeholder explicitly delegated
  the call) — backend/app/ is the definitive layout, no migration to
  Clean Architecture. See task_board.md for full reasoning.
  architecture.md/folder_structure.md updated to match (DOCS-03, DONE).
- Faculty/category taxonomy: RESOLVED by AI-01's `SpecialistCategory` enum
  (agents/state/graph_state.py) — academic, it_support,
  admissions_enrollment, financial_aid_billing, general. This was decided
  in code but never cross-referenced here per graph_state.py's own
  docstring instruction — recorded now. Unblocks DB-01's routing-rule
  category values and AI-05's category list (FR-13).
- ARCH-DECISION-02: RESOLVED 2026-08-10 — see Current Architecture
  Decisions below.
- BACKEND-07: RESOLVED 2026-08-10 — both directions now implemented (see
  task_board.md's BACKEND-07 entry and the session log below): the
  receiving endpoint AND the enqueue side (backend -> Celery
  `send_task`), wired into ticket_service.py. The full round trip
  (ticket created -> job enqueued -> AI-04 processes -> write-back ->
  visible to student/faculty) is wired end-to-end at the code level for
  the first time.
- AI-05 (task_board.md): PARTIALLY DONE 2026-08-10 — the Learning Agent
  (part 1) is done and verified, including confirming a faculty-verified
  answer is genuinely retrievable afterward. The granular intent/entity/
  decision/confidence module split is NOT done, and a recommendation
  against literally doing it is recorded in task_board.md (mirrors
  ARCH-DECISION-01's reasoning: AI-01's existing 4-node graph already
  covers this substance in tested, working code). The Analytics Agent is
  also not built — no consumer exists yet.
- DEVOPS-04 (task_board.md): DONE 2026-08-10 with one genuine, disclosed
  gap — `black --check .` is not clean (31/40 backend files have
  pre-existing formatting drift, black never run before) and ci.yml's
  black steps use `continue-on-error: true` rather than block merges on
  it or hand-fake a formatting pass. `ruff check .` IS fully clean for
  both backend/ and agents/, confirmed against the real files in a
  sandbox, not just by inspection.

## New Dependencies
- agents/requirements.txt (AI-01, present but not previously logged here):
  langgraph, langchain-core, pydantic, pydantic-settings, openai,
  google-generativeai, pytest.
- agents/requirements.txt (AI-02, added this session): faiss-cpu,
  sentence-transformers, numpy.
- agents/requirements.txt (AI-03, added this session): fastapi, httpx.
- agents/requirements.txt (AI-04, added this session): celery, redis.
- backend/requirements.txt (this session): added `bcrypt<4.1` pin (fixes
  a real passlib/bcrypt incompatibility — see Session Log) and
  `aiosqlite>=0.20` (enables a future SQLite-based test fixture; not used
  by any test file yet, only by this session's sandbox verification).

## Current Architecture Decisions (running log — append, don't rewrite)
- 2026-07-21: Initial architecture fixed per architecture.md — Next.js +
  FastAPI + PostgreSQL + Redis + FAISS + LangGraph/LangChain + AWS, with
  docker-compose services: nginx, nextjs-frontend, fastapi-backend, postgres,
  redis, faiss-service, ai-worker, celery-worker, email-worker, minio,
  prometheus, grafana, adminer.
- 2026-07-21: Auth = JWT, roles = student/admin (v1). Superseded 2026-08-08
  below (roles now student/faculty/admin).
- 2026-08-08: Stakeholder issued an enterprise-scope expansion ("Part 2"):
  faculty portal + role, RBAC across student/faculty/admin, escalation &
  routing engine, faculty-verified-answer learning loop back into the
  knowledge base, expanded AI pipeline (intent/entity/retrieval/decision/
  confidence/learning/analytics agents), expanded tech stack (Loki, Resend,
  PostHog, sentence-transformers, OpenAI/Gemini provider abstraction),
  root-level project scaffolding (README/LICENSE/CHANGELOG/CONTRIBUTING/
  TEAM_PROTOCOL/PROJECT_STATUS/.env.example), and new top-level folders
  (tests/, handoff/, presentation/, diagrams/, monitoring/). Recorded in
  requirements.md v2.0 and architecture.md v2.0. This is a legitimate
  stakeholder-directed change, not agent improvisation, so it was applied
  directly to the docs — but it also introduced a real conflict with
  already-shipped backend code (see Known Blockers, ARCH-DECISION-01),
  which was NOT auto-resolved and is left as an explicit pending decision
  rather than triggering a silent rewrite of tested code.
- 2026-08-08: SpecialistCategory finalized (retroactively logged — decided
  in agents/state/graph_state.py, not previously cross-referenced here):
  academic, it_support, admissions_enrollment, financial_aid_billing,
  general. Unblocks DB-01/AI-05 category values (FR-13).
- 2026-08-10: ARCH-DECISION-02 resolved (Claude-4) — faiss-service and
  ai-worker's docker-compose.yml build contexts changed to the repo root
  (`context: ..`) rather than the previously-proposed top-level rag/ or a
  bare ../agents. Reason: agents/rag/ingest.py's `REPO_ROOT =
  Path(__file__).resolve().parents[2]` assumes agents/ and knowledgebase/
  are siblings under one root — a bare ../agents context would drop
  knowledgebase/ out of the build entirely. agents/service/ and
  agents/rag/ are unchanged (stay where AI-02/AI-03 built/tested them).
  Also added a ../knowledgebase bind mount to both services so the FAISS
  index written by faiss-service's /reindex is visible to ai-worker's
  in-process retriever without a rebuild, and switched ai-worker's
  env_file from ../backend/.env to ../agents/.env per agents/config.py's
  own docstring recommendation.
- 2026-08-08: AI-04 resolved the retriever-wiring question AI-03 left open
  (in-process FaissRetriever vs. HTTP call to faiss-service): ai-worker
  loads FaissRetriever in-process, falling back to NullRetriever if no
  index exists yet. Avoids a network hop + an extra service dependency for
  something running in the same container image regardless. Revisit if
  ARCH-DECISION-02 lands on a genuinely separately-scaled faiss-service.
- 2026-08-10: ARCH-DECISION-01 resolved — backend/app/ is the definitive
  backend layout, not the Clean Architecture tree architecture.md v2.0
  proposed. Stakeholder explicitly delegated this call mid-session
  ("do what you prefer is more beneficial and make it fast") rather than
  picking an option themselves. See task_board.md for full reasoning;
  architecture.md/folder_structure.md are not yet updated to match
  (DOCS-03, new task, TODO).
- 2026-08-10: audit_logs.metadata is sa.JSON, not postgresql.JSONB —
  found via an actual `Base.metadata.create_all` run against in-memory
  SQLite in a sandbox (JSONB doesn't compile on that dialect at all).
  Nothing queries the JSON contents yet, so JSONB's indexing/operator
  advantages aren't in use; revisit if that changes.
- 2026-08-10: AI-05's granular intent/entity/decision/confidence module
  split is recommended against (not decided unilaterally — see
  task_board.md's AI-05 entry, part 2, for the full reasoning and an
  explicit ask for Claude-2 to confirm or override). AI-01's existing
  4-node graph (retriever/router/specialist/supervisor) already covers
  the same substance in tested, working code; splitting it into 5
  separate modules for structural conformance to architecture.md v2.0
  §4.3 would repeat the exact tradeoff ARCH-DECISION-01 already weighed
  and rejected for the backend, with no functional gain identified so
  far. The Learning Agent (the other, concrete part of AI-05) was built
  regardless — see Session Log.
- 2026-08-19: AI-05 part 2 (granular intent/entity/decision/confidence
  split) CONFIRMED against by Claude-2, the actual AI-05 owner, after
  independently rereading router.py/specialist.py/supervisor.py and
  confirming the five architecture.md v2.0 §4.3 module directories are
  still empty on disk. This is now a final, owned decision, not a
  standing cross-owner recommendation — see task_board.md's AI-05 entry
  for the full writeup. Revisit only if a specific future requirement
  names a concrete entity-extraction need distinct from category.

## Session Log
- 2026-07-21 — Claude-1 — Bootstrapped project-management/ and repo folder
  skeleton (SETUP-01, DONE). See state_claude1.md for resume point.
- 2026-07-21 — Claude-1 — BACKEND-01 DONE: FastAPI app scaffold, health
  endpoint. BACKEND-02 DONE: users/tickets/messages models + Alembic
  migration 0001_initial_schema. BACKEND-03 DONE: signup/login/refresh with
  JWT + bcrypt, get_current_user/require_admin deps for future protected
  routes. See state_claude1.md for resume point (BACKEND-04 next).
- 2026-08-04 — Claude-1 — BACKEND-04 DONE: student ticket endpoints (create,
  list, detail w/ messages, follow-up message, status poll) in
  backend/app/api/v1/tickets.py, backed by services/ticket_service.py and
  schemas/ticket.py. All routes scoped to the authenticated student via
  get_current_user; not-found/not-owned both return 404. Wired into
  api/v1/__init__.py. api_contract.md bumped to v0.4. See state_claude1.md
  for resume point (next: no BACKEND-* task currently open — see
  task_board.md).
- 2026-08-08 — Claude-4 — DEVOPS-03 DONE: pytest config (backend/pyproject.toml),
  tests/conftest.py (async httpx client against the ASGI app), and
  tests/test_health.py (GET / and GET /api/v1/health). Deliberately scoped
  to DB-independent routes only — auth/ticket endpoints need a real
  Postgres test database and are left for a separate task rather than
  folded in here silently. Verified for real: mirrored the backend into a
  sandbox, installed requirements.txt (+ aiosqlite, sandbox-only, not added
  to the real requirements.txt), and ran `pytest` — 2 passed. This also
  caught and fixed a real bug: BACKEND-04's three new files
  (schemas/ticket.py, services/ticket_service.py, api/v1/tickets.py) had
  been written to the wrong filesystem in the prior session and never
  actually reached I:\StudentHelpDesk — they've now been rewritten via the
  Filesystem connector and confirmed present. See state_claude4.md and the
  "Important Notes" in state_claude1.md.
- 2026-08-08 — Claude-4 — DEVOPS-01 DONE: docker/docker-compose.yml wiring
  all 13 services from architecture.md §3 (nginx, nextjs-frontend,
  fastapi-backend, celery-worker, email-worker, ai-worker, faiss-service,
  postgres, redis, minio, prometheus, grafana, adminer). Also added
  docker/nginx/nginx.conf (reverse proxy: / -> frontend, /api/ -> backend),
  docker/monitoring/prometheus.yml (scrape config — backend /metrics
  endpoint doesn't exist yet, noted as a future task, not implemented here),
  and docker/.env.example (infra-level credentials, separate from
  backend/.env.example). Build contexts point at docker/*.Dockerfile paths
  that DEVOPS-02 hasn't created yet — by design, per folder_structure.md's
  DEVOPS-01/DEVOPS-02 split; `docker compose build` will not succeed until
  DEVOPS-02 lands. Verified structurally (not by actually building, since
  Dockerfiles don't exist yet): parsed the YAML and confirmed every
  depends_on target and named volume resolves, service count matches
  architecture.md §3 exactly (13). See state_claude4.md for resume point
  (next: DEVOPS-02 Dockerfiles, or DEVOPS-05 AWS skeleton in parallel).

- 2026-08-08 — Claude-3 — FRONTEND-01 + FRONTEND-02 DONE. On starting this
  session, found frontend/app, lib/api, lib/auth already contained real
  working code (layout, home, login page, api client, auth context) even
  though state_claude3.md said "Not yet started" and task_board.md had
  FRONTEND-01 as TODO — the same undocumented-write pattern already seen
  once with BACKEND-04 (see state_claude1.md Correction Log). Verified the
  existing files by reading them in full rather than assuming; they were
  complete and correct, just never marked DONE. Filled the one actual gap
  (frontend/app/signup/page.tsx was an empty directory) and then built
  FRONTEND-02 on top: frontend/lib/api/tickets.ts (matches
  backend/app/schemas/ticket.py + api_contract.md v0.4),
  frontend/lib/auth/use-require-auth.ts (shared redirect-to-login guard),
  frontend/components/site-nav.tsx (auth-aware header nav — replaces the
  static login/signup links in layout.tsx), frontend/app/tickets/page.tsx
  (create ticket + list), and frontend/app/tickets/[id]/page.tsx (thread
  view, follow-up messages, 5s status polling per requirements.md NFR-2 /
  §5 polling-vs-websocket note). Status polling only re-fetches the full
  thread when status actually changes, to avoid hammering
  GET /tickets/{id}.
  CORRECTION LOG: my own first attempt at this session wrote these new
  files with the wrong tool — one that writes to my own sandbox, not this
  repo — so the files silently landed at literal paths like
  `/I:\StudentHelpDesk\...` on my side instead of on disk here. Caught it
  by re-listing the real directory and not seeing the new files, then
  rewrote everything with the Filesystem/Desktop Commander tools and
  verified each file by reading it back from the real path afterward. No
  files were lost, but flagging this explicitly since it's the second
  session this exact class of mistake has shown up in — worth a standing
  note for future sessions to double-check writes landed on the real
  filesystem, not just trust a "success" message.
- 2026-08-08 — Claude-2 — Session start: found AI-01 (graph, nodes, state
  schema, LLM provider abstraction, prompts, 8 unit tests) already fully
  implemented but undocumented — third occurrence of this pattern (see
  Claude-4's and Claude-3's notes above). Did not trust it blindly:
  mirrored agents/ into a sandbox, installed langgraph/pydantic-settings/
  pytest, ran `pytest agents/tests` for real — 8/8 passed. Marked AI-01
  DONE in task_board.md with the verification method noted. Also
  retroactively logged the SpecialistCategory decision (graph_state.py
  had already made it but never cross-referenced it here, per its own
  docstring instruction) and the agents/requirements.txt dependency list,
  both silently missing before. Starting AI-02 (rag/ ingestion pipeline)
  next. See state_claude2.md for resume point.
- 2026-08-08 — Claude-2 — AI-02 DONE: agents/rag/chunker.py,
  agents/embeddings/embedder.py, agents/rag/faiss_index.py,
  agents/rag/ingest.py, agents/rag/retriever_adapter.py (FaissRetriever —
  implements AI-01's existing Retriever protocol, ready to swap in for
  NullRetriever in main_graph.py once wired by AI-04). Extended
  agents/config.py + .env.example with EMBEDDING_MODEL/CHUNK_SIZE/
  CHUNK_OVERLAP/FAISS_INDEX_PATH/FAISS_METADATA_PATH. Verified for real:
  installed faiss-cpu + numpy in a sandbox and ran all 22 agents/tests
  (sentence-transformers itself not live-tested — no network path to the
  model hub in this environment; same limitation already documented for
  AI-01's OpenAI/Gemini providers). Caught and fixed two real test bugs
  by actually running the suite instead of trusting it by inspection: an
  overlap test checked the wrong word range, and a fake embedder encoded
  text by magnitude on a single axis, which collapses to an identical
  direction after FAISS's L2 normalization (cosine similarity is
  direction-only) — fixed by spreading character codes across all
  embedding dimensions. Confirmed the on-disk files matched what was
  tested by reading them back after writing (not just trusting the write
  result). knowledgebase/{documents,policies,circulars,faqs} remain
  empty — no content has been curated yet (FR-8, admin/Claude-3 scope) —
  ingest() is verified safe against that (zero-vector index, no error).
  See state_claude2.md for resume point (next: AI-03 faiss-service
  wrapper, or AI-05 once faculty routing lands).
- 2026-08-08 — Claude-2 — AI-03: built agents/service/main.py (FastAPI
  wrapper: GET /health, POST /search, POST /reindex around AI-02's
  FaissRetriever/ingest()), documented in api_contract.md v0.5. While
  wiring this up, found a real cross-agent conflict and did NOT silently
  resolve it: docker/docker-compose.yml's faiss-service build context
  points at a top-level ../rag directory, but architecture.md/
  folder_structure.md (canonical) put the RAG pipeline under agents/rag/,
  which is where AI-02/AI-03 were actually built and tested. Logged as
  ARCH-DECISION-02 in task_board.md rather than guessing which side to
  move — agents/service/ stays in agents/ (my own territory) either way;
  only the eventual deploy wiring is blocked. Verified for real: 5 new
  tests (agents/tests/test_faiss_service.py) covering health, empty-query
  422, missing-index 503, a mocked successful search, and reindex cache
  invalidation — 27/27 total passing in a sandbox with fastapi/httpx
  installed. See state_claude2.md for resume point (next: AI-05 once
  faculty routing/DB-01 lands, or pick up ARCH-DECISION-02 if Claude-4/
  the stakeholder resolves it first).
- 2026-08-08 — Claude-2 — AI-04 (worker logic): built agents/worker/
  (graph_runner.py, backend_client.py, celery_app.py) — Celery task logic
  kept Celery-free and directly testable, same pure-function split AI-01
  used for its nodes. Resolved two things AI-01/AI-03 had left open:
  retriever wiring (in-process FaissRetriever + NullRetriever fallback,
  logged in Current Architecture Decisions) and the ai-worker env-file
  question (recommended agents/.env to DEVOPS-02, didn't touch
  docker-compose.yml myself). Proposed the job payload + POST
  /internal/v1/tickets/{ticket_id}/ai-result write-back contract in
  api_contract.md v0.6 and opened BACKEND-07 for Claude-1 to implement the
  receiving end — not built here, this session stayed in agents/. Verified
  for real: 8 new tests against httpx.MockTransport and fake graph/
  backend_client objects, plus a bare `import agents.worker.celery_app`
  check that it constructs without a live Redis broker. 35/35 total tests
  passing. Confirmed on-disk files matched what was tested by reading
  graph_runner.py back after writing it. See state_claude2.md for resume
  point (next: AI-05 once DB-01 lands, or BACKEND-07/ARCH-DECISION-02 once
  Claude-1/Claude-4 pick those up).
- 2026-08-10 — Claude-4 — DEVOPS-02 DONE: docker/backend.Dockerfile
  (python:3.12-slim, `alembic upgrade head` then uvicorn),
  docker/frontend.Dockerfile (node:20-alpine, 3-stage: deps/builder/runner,
  `npm run build` + `npm start`), docker/faiss-service.Dockerfile and
  docker/ai-worker.Dockerfile (both python:3.12-slim, repo-root build
  context). Building these forced ARCH-DECISION-02's actual resolution
  (see Current Architecture Decisions) — the previously-proposed
  `../agents` context would have silently broken agents/rag/ingest.py's
  REPO_ROOT-relative knowledgebase/ paths, so the fix is a repo-root
  context for both, not just picking agents/ over rag/. Updated
  docker-compose.yml accordingly: ai-worker/faiss-service build
  context -> `..`, ai-worker env_file -> ../agents/.env (was
  ../backend/.env — agents/config.py had already flagged this as
  incomplete), added a ../knowledgebase bind mount to both services so
  the FAISS index survives rebuilds and is shared between them, dropped
  ai-worker's stale `depends_on: faiss-service` (AI-04 already resolved
  to call FaissRetriever in-process — no network dependency exists), and
  added a faiss-service healthcheck (GET /health) matching the backend's
  existing pattern. Verified structurally only, same limitation as
  DEVOPS-01/DEVOPS-03: parsed the updated docker-compose.yml with PyYAML
  in a sandbox — 13 services, every depends_on and named-volume reference
  resolves. No Docker daemon available in this environment to actually
  `docker compose build`/`up`. Did NOT touch frontend/next.config.mjs to
  add `output: 'standalone'` even though it would produce a smaller
  frontend image — that's frontend/ ownership (Claude-3) per
  TEAM_PROTOCOL.md, flagged as a suggestion in state_claude4.md instead
  of edited directly. Did NOT delete the vestigial top-level rag/
  directory left over from the pre-ARCH-DECISION-02 assumption — not a
  DEVOPS-02-scoped call. See state_claude4.md for resume point (next:
  DEVOPS-04 CI workflow, or DEVOPS-05 AWS skeleton — both unblocked, no
  dependency between them).
- 2026-08-10 — Claude-4 (second session, same day) — Stakeholder asked
  "so what is the progress" then "do what you prefer is more beneficial
  and make it fast to complete this project." Took that as explicit
  authorization to resolve ARCH-DECISION-01 myself rather than wait for a
  separate stakeholder decision, picked option (c) (backend/app/ stays
  definitive — see Current Architecture Decisions), and used the
  unblocking to build the full chain in one session: DB-01, BACKEND-05,
  BACKEND-06, BACKEND-07 — all DONE, see task_board.md for each. This is
  the first time AI-04's worker logic (built 2026-08-08) is actually
  reachable end-to-end rather than dead code waiting on a receiving
  endpoint. Verified everything for real, not by inspection: mirrored the
  full updated backend into a sandbox (matching the DEVOPS-03/04 pattern
  already established), ran the existing 2-test suite (still passing, no
  regression), confirmed all new routes resolve via the app's own OpenAPI
  schema, and ran an 11-step service-layer smoke test against in-memory
  SQLite covering every new code path including two edge cases (escalate
  with no matching routing rule, and an AI error payload). That
  verification caught two real, previously-latent bugs neither introduced
  this session nor caught by any prior session's structural-only checks:
  (1) audit_logs.metadata used postgresql.JSONB, which doesn't compile on
  SQLite at all — would have silently blocked a future CI test fixture;
  fixed to plain JSON, confirmed schema creation succeeds after. (2)
  backend/requirements.txt's unpinned bcrypt resolves to 5.0.0, which
  passlib can't detect the version of (bcrypt>=4.1 removed
  `__about__.__version__`) — every hash_password/verify_password call
  crashes on a real `pip install`, with a misleading "password cannot be
  longer than 72 bytes" error masking the real upstream issue; fixed with
  a `bcrypt<4.1` pin, confirmed the full smoke test passes after.
  Mid-session, the local Filesystem/Desktop Commander MCP connector
  dropped entirely for several turns (not just the process-execution side
  that had already been flagged as flaky in state_claude4.md — this time
  the whole connector, including read/write, went away). Did not attempt
  to route around it or guess at file contents from memory: paused,
  reported the exact state honestly (what was verified only in a local
  sandbox vs. what had actually reached the real files), and resumed
  pushing the real fixes only once the connector came back and tool
  availability was reconfirmed. Also added a new task, DOCS-03, so that
  ARCH-DECISION-01's resolution doesn't leave architecture.md/
  folder_structure.md silently describing a backend layout that was never
  built — flagged rather than fixed here, since it's a docs-content task,
  not a DevOps one. NOT done this session: AI-05 (still the single
  biggest remaining gap — nothing else in Part 2 is close to complete
  without it), FRONTEND-04/05 (both unblocked now, not started), anything
  that actually enqueues an ai-worker Celery job from a real ticket event
  (BACKEND-07 only built the receiving side). See state_claude4.md for
  full resume point.
- 2026-08-10 — Claude-4 (continuation of the above, same session) —
  Closed the two things flagged as still open at the end of the previous
  entry. (1) DOCS-03: rewrote architecture.md §4.2 and
  folder_structure.md's backend/ section to describe the real
  app/-wrapped layout instead of the never-built Clean Architecture tree;
  bumped both files' version headers to v2.1 with a pointer to
  ARCH-DECISION-01. (2) Built the ai-worker enqueue side —
  backend/app/services/ai_dispatch_service.py, sending via Celery's
  `send_task("agents.worker.process_ticket_job", ...)` by string task
  name (no import from agents/, keeping the two services decoupled at
  the Python level even though they share a Redis broker). Wired into
  ticket_service.py's create_ticket and add_message — confirmed by
  reading agents/worker/celery_app.py, graph_runner.py, backend_client.py,
  and agents/state/graph_state.py's AgentState/ConversationTurn first, to
  make sure the job payload shape and conversation_history's
  {sender_type, content} format matched AI-04's already-built consumer
  exactly rather than guessing. Verified for real in a sandbox two ways:
  with no broker reachable at all (confirmed ticket creation still
  succeeds and the resulting redis.exceptions.ConnectionError is caught
  and logged, not raised — proving the graceful-failure path actually
  works, not just that it looks right in the code) and with send_task
  mocked (confirmed the exact task name, queue name, and job payload for
  both a brand-new ticket and a follow-up message, including that
  conversation_history correctly carries the prior message forward).
  BACKEND-07's full round trip — ticket created -> job enqueued -> AI-04
  processes -> write-back -> visible to student/faculty — is now wired
  end-to-end at the code level for the first time in this project.
  api_contract.md bumped to v0.8. NOT done: still not proven against a
  real Redis+Celery worker+LLM (no Docker daemon or LLM API key in this
  environment) — everything above is sandbox/mock verification, real but
  not the same as a live end-to-end run. AI-05 remains the single
  biggest actual gap in the project.
- 2026-08-10 — Claude-4 (continuation, same session) — Picked up AI-05,
  the gap flagged as biggest-remaining at the end of the prior entry.
  Read agents/graphs/main_graph.py, nodes/router.py, specialist.py,
  supervisor.py first, to understand what AI-01 already covers before
  deciding what was actually missing rather than assuming the literal
  7-module split was the only valid interpretation. Split AI-05 into two
  honestly-different pieces (see task_board.md's AI-05 entry for the
  full writeup): built the Learning Agent for real
  (agents/learning/learning_agent.py — writes a faculty-verified answer
  as a knowledgebase/faqs/ doc, idempotent by (ticket_id, message_id),
  then rebuilds the FAISS index the same way agents/service/main.py's
  POST /reindex already does), wired it as a new Celery task
  (agents/worker/celery_app.py's process_learning_job) and a new backend
  enqueue call (ai_dispatch_service.enqueue_learning_job(), called from
  faculty_service.mark_message_verified after the verify write succeeds).
  This closes requirements.md FR-25's loop for the first time in the
  project's history. Recommended, rather than silently did, against the
  granular intent/entity/decision/confidence module split — flagged as
  Claude-2's call to confirm or override, not decided unilaterally,
  since it touches AI-01's actual design ownership more than the earlier
  ARCH-DECISION-01 call touched backend layout.
  Verified for real, in layers: (1) 5 new tests in
  agents/tests/test_learning_agent.py, using a fake Embedder (same
  no-network-to-the-model-hub reason AI-01/AI-02 already documented) —
  file-write correctness, idempotency-by-overwrite, reindex persistence,
  the full ingest_verified_answer() entrypoint, and — the part that
  actually matters for FR-25 — that the verified answer is genuinely
  retrievable afterward via a fresh FaissRetriever.load() call against
  the rebuilt index. (2) Confirmed FaissRetriever.load() needed a small,
  backward-compatible addition (an optional `embedder` keyword param,
  default None) to make that last test possible without a real
  sentence-transformers download — checked both existing call sites
  (graph_runner.py, agents/service/main.py) first to confirm neither
  breaks. (3) Backend-side enqueue verified in a sandbox with a mocked
  broker: confirmed the exact task name and full job payload
  (ticket_id/message_id/question/answer/category) sent from
  mark_message_verified, using the ticket's first student message as the
  original question — matching the same "first message = the question"
  convention ticket_service.create_ticket already established. (4)
  Re-ran the full backend test suite (still 2/2, no regression) and
  reconfirmed FaissRetriever's signature change doesn't break either
  existing call site. Not proven: a live Redis+Celery worker actually
  picking up and running process_learning_job end-to-end (no Docker
  daemon in this environment) — only sandbox/mock verification, same
  honest limitation as every other cross-service claim this session.
  api_contract.md bumped to v0.9. See state_claude4.md for full resume
  point.
- 2026-08-10 — Claude-4 (continuation, same session) — Picked up my own
  DEVOPS-04 (CI workflow), the last item left in my own lane. Wrote
  .github/workflows/ci.yml (three jobs: backend, agents, frontend). Before
  trusting the ruff/black steps would actually pass, ran them for real
  against the exact real files (mirrored into a sandbox, not simplified
  stubs) rather than assuming a fresh CI job would be green. It wasn't:
  46 ruff errors on backend/, mostly (36) a single false positive — B008,
  flake8-bugbear flagging FastAPI's standard `Depends(...)` default-arg
  pattern as a bug. Fixed at the config level (`ignore = ["B008"]` in
  both backend/ and agents/ pyproject.toml) rather than let a freshly-
  added CI job be red on day one for noise. Fixed the remaining genuine
  issues directly: two unused imports, four dead `noqa: BLE001` comments
  (that rule was never in ruff's default select set, so they never did
  anything), import-ordering across 7 backend files, a redundant quoted
  forward-reference in retriever_adapter.py, an unused import in
  test_learning_agent.py, and a real agents/pyproject.toml config gap —
  no `known-first-party = ["agents"]`, which made ruff merge first-party
  agents.* imports into the same block as third-party packages. Also
  fixed an unrelated pre-existing issue spotted while reading files for
  this: app/api/internal.py had two separate `from fastapi import` lines.
  `ruff check .` is now genuinely clean on both backend/ and agents/ —
  confirmed by re-running it against the real files after every fix, not
  just editing until it looked plausible.
  `black --check .` is a different story and left honestly unresolved:
  31 of 40 backend files would be reformatted (pure pre-existing
  whitespace/line-wrap drift — black has never been run against this
  codebase). The local MCP connector's process-execution side was
  unavailable for most of this stretch of the session (confirmed by
  repeated tool-search failures, not assumed), so there was no way to
  actually run `black .` and commit its real output. Hand-transcribing 31
  files' worth of black's exact formatting decisions was rejected as an
  option — it risks producing output that only superficially resembles
  what black would generate, which would make the check meaningless while
  looking satisfied. Instead, ci.yml's black steps got `continue-on-error:
  true` with a comment explaining exactly why and what unblocks removing
  it. This is recorded as a genuine, disclosed gap (task_board.md, Known
  Blockers above), not silently hidden behind DEVOPS-04 being marked DONE.
  Also mid-task: the Filesystem connector itself dropped to read-only,
  then came back with edit/write access after a wait — handled the same
  way as the earlier connector outage this session (paused, reported
  status honestly, resumed once tool availability was reconfirmed, never
  guessed at file contents from memory during the gap).

- 2026-08-19 — Claude-2 — Resumed session. Read task_board.md,
  state_claude2.md, project_status.md, and TEAM_PROTOCOL.md first (state
  file's note flagged AI-05 as the item needing my direct review before
  anything else). Reviewed Claude-4's cross-owner AI-05 part-2 writeup
  (the granular intent/entity/retrieval/decision/confidence module split)
  rather than treating it as already settled: read agents/nodes/router.py,
  specialist.py, and supervisor.py in full, and confirmed via directory
  listing that all five architecture.md v2.0 §4.3 module directories
  (agents/{intent,entity,retrieval,decision,confidence}/) are still
  literally empty (0 files each). Agreed with the recommendation and made
  it a final, owned decision rather than leaving it open: NOT doing the
  literal 5-module split, since router.py already performs intent
  classification and supervisor.py's confidence+decision logic is
  genuinely one function, not two agents' worth of substance — splitting
  for spec-conformance alone would repeat ARCH-DECISION-01's already-
  rejected tradeoff for no functional gain, and no requirement names a
  concrete entity to extract distinct from category. Recorded the
  decision in task_board.md's AI-05 entry and here (Current Architecture
  Decisions above). Left the five empty directories in place, matching
  ARCH-DECISION-02's precedent for the vestigial top-level rag/ dir. This
  closes out the last open item explicitly assigned to Claude-2 — no
  other AI-05-adjacent work is currently blocked on this decision. See
  state_claude2.md for resume point.

- 2026-08-19 (continuation, same session) — Claude-2, cross-owner pickup
  of TEST-01 (Claude-4's lane) after closing out AI-05. Full writeup in
  task_board.md's TEST-01 entry — summary here: built tests/conftest.py +
  3 test files (9 tests), the first time this project's FastAPI app has
  been driven through real HTTP requests + the real RBAC dependency chain
  (previously verified only at the service-layer, bypassing Depends()
  entirely). A real process-execution channel (Desktop Commander, the
  user's actual machine) turned out to be available this session — every
  prior session explicitly flagged this as unavailable. Used it to:
  create backend/.venv, pip install for real, and actually run pytest
  instead of a sandbox mirror.

  — REAL BUG FOUND AND FIXED (8/9 new tests failed on first real run,
  not by inspection): app/api/deps.py's get_current_user and
  app/services/auth_service.py's refresh_access_token both passed a bare
  JWT `sub` string straight into db.get(User, ...) without converting to
  uuid.UUID. Worked by accident against asyncpg (driver-side coercion);
  SQLAlchemy's generic UUID(as_uuid=True) bind processor — used against
  the SQLite this test suite runs against — requires a real uuid.UUID and
  raised AttributeError. Same class of bug as DB-01's JSONB/SQLite issue
  and BACKEND-05..07's bcrypt/passlib version issue: only ever surfaces
  on an actual run. Fixed both call sites (uuid.UUID(...) parse +
  except-clause that maps a malformed value to the existing 401/AuthError
  — a side benefit, not just a fix). Re-ran everything after: 9/9 new,
  2/2 existing backend tests, both green.
  — GENUINE GAP SURFACED, not fixed (flagged for a real product
  decision): no in-product way to create the first admin account —
  signup hardcodes role="student", and the only promotion path itself
  requires an existing admin.
  — ALSO CLOSED two more long-disclosed DEVOPS-04 gaps, both blocked on
  the same missing capability every prior session lacked: ran `black .`
  for real against backend/ (35 files reformatted, all tests re-verified
  green after), and removed ci.yml's `continue-on-error: true` on the
  backend black step now that it's a real, passing gate. Ran `ruff check
  .` for real too — 11 pre-existing style errors, all confined to
  Alembic's auto-generated app/db/migrations/ files, none in anything
  this session touched; flagged for a DEVOPS-04 config call (exclude
  migrations/ vs. fix them) rather than decided here. agents/ was NOT
  re-linted (sentence-transformers/torch install judged out of TEST-01's
  actual scope) — noted as a reasonable follow-up.

- 2026-08-19 (continuation) — Claude-3 — FRONTEND-04 DONE (full writeup
  in task_board.md). Session started by re-attempting FRONTEND-01 from
  scratch without first checking disk state, which duplicated work
  already done by an earlier Claude-3 session — caught before any harm
  when a later directory listing showed app/tickets/, components/, and a
  richer auth-context.tsx already present; the pre-existing, more
  complete versions were left as authoritative and nothing was rolled
  back over them. Built frontend/lib/api/faculty.ts,
  frontend/lib/auth/use-require-faculty.ts,
  frontend/app/faculty/page.tsx, frontend/app/faculty/[id]/page.tsx, and
  a small site-nav.tsx addition (faculty-only nav link). Verified for
  real: mirrored the entire frontend/ directory (not just the new files)
  into a sandbox, ran `npm install` + `next build` — 8/8 routes compiled
  and type-checked cleanly, confirming the new faculty pages integrate
  correctly with the pre-existing auth-context/tickets code rather than
  just looking plausible in isolation.

- 2026-08-19 (continuation) — Claude-3 — FRONTEND-03 DONE (full writeup
  in task_board.md). Checked api_contract.md and backend/app/api/v1/
  admin.py first rather than assuming the task's literal "ticket
  list/filter" description was still buildable — it wasn't (no generic
  admin ticket-override API exists, only BACKEND-06's routing-rules +
  role-management), so the dashboard was built around the real surface
  and the gap stated plainly in the page's own copy. Added
  frontend/lib/api/admin.ts, frontend/lib/auth/use-require-admin.ts,
  frontend/app/admin/page.tsx (routing rules + user role management), and
  an Admin nav link in site-nav.tsx. Verified for real: full sandbox
  `next build` — 9/9 routes clean. FRONTEND-05 (analytics dashboard) is
  now unblocked but not started.

- 2026-08-19 (continuation) — Claude-3 — FRONTEND-05 DONE (full writeup
  in task_board.md). No analytics API existed on the backend — checked
  api_contract.md first, per the resume-point note this session's own
  prior entry left, rather than assuming. Added a small, disclosed cross-
  boundary backend endpoint (GET /api/v1/admin/analytics/summary,
  api_contract.md v0.11) instead of building the dashboard against
  invented mock data: total tickets, tickets-by-status, escalation rate,
  avg first-response time, avg agent confidence (explicitly NOT called
  "accuracy" — no ground-truth labeling exists in this system), and AI
  auto-resolution rate — every rate/avg field returns null rather than a
  fake 0 when there's no data yet. Added
  frontend/app/admin/analytics/page.tsx (stat cards + a plain CSS status
  breakdown bar, no charting library added since none was already a
  dependency) and linked it from the admin dashboard. Verified for real,
  two layers: the exact backend aggregation logic run against an in-
  memory SQLite DB seeded with known data, every number checked by hand,
  plus a separate empty-DB case confirming clean nulls; and a full
  sandbox `next build` — 10/10 routes clean. This closes out the entire
  FRONTEND-* task list — only FRONTEND itself has nothing left TODO on
  task_board.md as of this entry.

- 2026-08-24 — Claude-4 — DEVOPS-05 DONE (full writeup in
  task_board.md). infra/aws/ Terraform skeleton mapped field-for-field to
  architecture.md §7's free-tier -> AWS table (13 .tf files + README +
  tfvars example + scoped .gitignore). Attempted a GitHub push first at
  the user's request (via Desktop Commander, the real-terminal channel
  documented above as available since 2026-08-19) — that connector
  dropped mid-task and stayed unavailable for the rest of the session;
  handed exact git commands to the user instead of guessing or silently
  retrying indefinitely, consistent with every prior connector-outage
  entry in this log. Then continued with DEVOPS-05 using tools that were
  still available. Verified for real: installed python-hcl2, parsed all
  13 .tf files (zero errors), then wrote a script (not eyeballed) that
  cross-checked every aws_*/random_*/data.*/var.*/local.* reference
  against what's actually declared — zero unresolved out of 39
  resources/3 data sources/14 variables/2 locals. Same disclosed
  limitation as every other DEVOPS-* entry: no AWS account or terraform
  binary available to run a real `plan`/`apply`.

- 2026-08-24 (continuation, same session) — Claude-4 — DOCS-01 DONE
  (full writeup in task_board.md). All 8 required human-facing docs
  written (architecture, database, api, deployment, cloud, security,
  user-manual, developer-guide), plus diagrams/ (2 Mermaid diagrams,
  not previously called out as done anywhere). Every factual claim
  cross-checked against the actual source of truth (api_contract.md,
  database_schema.md, architecture.md, the real infra files) rather than
  written from memory. Mermaid diagrams checked by hand against the
  documented grammar — no headless-browser tool available to render/
  confirm visually (blocked by network restrictions on downloading
  Chrome), disclosed in diagrams/README.md itself. This closes the
  entire task_board.md except DOCS-02 (assignment report, explicitly
  meant to start last) — flagged for the user to confirm before
  starting, since "most other work reasonably complete" is a judgment
  call, not a hard dependency check.

- 2026-08-24 (continuation, same session) — Claude-4 — Before starting
  DOCS-02, re-read requirements.md's §6 deliverables list directly
  (rather than trusting task_board.md's Status fields alone) and found a
  real gap: "Presentation/demo material" is a required deliverable with
  no task_board.md entry at all, unlike every other §6 item. Logged as
  PRESENTATION-01 (TODO) before proceeding, so it wasn't silently missed
  the way it nearly was. Then completed DOCS-02: docs/assignment-
  report/README.md — full requirements-coverage table against
  requirements.md v2.0 (marked done/partial/not-built per item, not
  aspirationally), architecture summary, the two real cross-cutting
  engineering decisions with reasoning, a verification-approach section
  built from this project's actual bug history, a disclosed known-gaps
  list, and a team-process note. Cross-checked against requirements.md/
  task_board.md/api_contract.md directly, same standard as DOCS-01.

- 2026-08-24 (continuation, same session) — Claude-4 — PRESENTATION-01
  DONE. 12-slide deck built with pptxgenjs, covering the same ground as
  the assignment report in presentation form, closing with a live-demo-
  script slide. Full pptx skill QA process followed — schema validation,
  text-content read-through, and a full visual pass rendering every
  slide to an image, which caught and fixed two real bugs (icons
  rendering solid black due to an SVG-attribute-stripping bug; a
  low-contrast chart label) before finalizing. One disclosed limitation:
  the available tools can write text files to the real filesystem but
  not binary ones, confirmed by checking the tool set directly — the
  .pptx was handed to the user via present_files with a request to save
  it into presentation/ themselves, rather than falsely claimed as
  already placed there. presentation/README.md was written directly to
  the real filesystem successfully. This closes every task on
  task_board.md except TEST-01-adjacent follow-ups already noted
  elsewhere as open (not new tasks) — see the standing gaps list below.

- 2026-09-04/05 — Claude-4 (assisting the user directly with their real
  first Docker deployment attempt) — DEPLOY-01 continued: after the
  stack finally started end-to-end, real browser signup failed
  ("Something went wrong"). Root cause: NEXT_PUBLIC_API_BASE_URL needs
  to be a Docker build ARG, not a runtime environment: entry, since
  Next.js inlines it at build time — fixed in frontend.Dockerfile +
  docker-compose.yml (Bug 5, full writeup in task_board.md's DEPLOY-01
  entry). Also converted the frontend runner stage to actually use
  next.config.mjs's output:standalone (86% smaller image, verified with
  a real `node server.js` run returning genuine 200s). Separately,
  redesigned home/login/signup onto the shared "Study Hall" component
  system per the stakeholder's "upgrade the design, make it premium"
  ask — mid-session discovered a concurrent session (FRONTEND-06) had
  independently done the same alignment pass across the rest of the app
  at essentially the same time; reconciled by inspection, both sessions'
  work is consistent, nothing overwritten or duplicated. Verified with
  real Playwright screenshots (not just a clean build) — caught and
  fixed a real vertical-centering layout bug before finalizing.
