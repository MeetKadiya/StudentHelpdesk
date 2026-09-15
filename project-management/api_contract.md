# API Contract — Student HelpDesk AI

Status: v0.11 — health + auth (incl. GET /me) + student ticket + faculty
(incl. ticket detail) + admin (routing rules/roles/analytics) + internal
ai-worker write-back/enqueue + internal Learning Agent enqueue + internal
faiss-service all implemented. Admin knowledgebase-document endpoints
still planned. This file must be updated in the SAME session any
endpoint is added or changed (see coding_standards.md). Never rename an
existing endpoint without a task_board.md entry.

## Conventions
- Base path: `/api/v1`
- Auth: `Authorization: Bearer <JWT>` unless marked public.
- Content type: `application/json` unless noted (attachments use multipart).
- Standard error shape:
```json
{ "error": { "code": "string", "message": "string", "details": {} } }
```

## Implemented Endpoints

### Health
- `GET /api/v1/health` (public) — liveness check. Returns `{"status": "ok"}`.
  Implemented in `backend/app/api/v1/health.py`.
- `GET /` (public, no /api/v1 prefix) — root service info, returns service
  name + status. Implemented in `backend/app/main.py`.

### Auth
- `POST /api/v1/auth/signup` (public) — body `{email, password}` -> 201 +
  `{id, email, role}`. 409 if email already registered. Implemented in
  `backend/app/api/v1/auth.py`.
- `POST /api/v1/auth/login` (public) — body `{email, password}` -> 200 +
  `{access_token, refresh_token, token_type}`. 401 on bad credentials.
- `POST /api/v1/auth/refresh` (public) — body `{refresh_token}` -> 200 +
  new `{access_token, refresh_token, token_type}`. 401 if invalid/expired.
- Protected-route dependency `get_current_user` (and `require_admin`) added
  in `backend/app/api/deps.py`, expects `Authorization: Bearer <access_token>`.
  First consumed by the BACKEND-04 ticket endpoints below.
- `GET /api/v1/auth/me` (added 2026-08-19, alongside FRONTEND-04) — 200 +
  `UserOut {id, email, role}`. Added because access tokens only encode
  `sub` (user id), not role (`core/security.py`), so there was previously
  no way for the frontend to know whether a logged-in user is
  student/faculty/admin without this. Read-only, reuses
  `get_current_user` + the existing `UserOut` schema. Small,
  self-contained cross-boundary addition into Claude-1's ownership area
  (`app/api/v1/auth.py`), made by Claude-3 to unblock FRONTEND-04 —
  flagged here and in task_board.md per TEAM_PROTOCOL.md rather than
  silently added.

### Tickets (student)
All routes require `Authorization: Bearer <access_token>` and are scoped to
the authenticated student (`get_current_user`). A ticket that exists but
isn't owned by the caller returns 404 (not 403), to avoid leaking existence.
Implemented in `backend/app/api/v1/tickets.py`.
- `POST /api/v1/tickets` — body `{subject?, message}` -> 201 + `TicketOut`.
  Creates the ticket and its first message (`sender_type: "student"`) in one
  transaction.
- `GET /api/v1/tickets` — 200 + `TicketOut[]`, newest first, current user's
  tickets only.
- `GET /api/v1/tickets/{ticket_id}` — 200 + `TicketOut` & `messages:
  MessageOut[]` (chronological). 404 if not found/not owned.
- `POST /api/v1/tickets/{ticket_id}/messages` — body `{content}` -> 201 +
  `MessageOut` (`sender_type: "student"`). 404 if not found/not owned.
- `GET /api/v1/tickets/{ticket_id}/status` — 200 + `{id, status}`. Polling
  approach chosen per requirements.md §5 open question — no websocket infra
  added. 404 if not found/not owned.

### Faculty (BACKEND-05, implemented 2026-08-10)
All routes require `Authorization: Bearer <access_token>` and
`role='faculty'` (`require_faculty`, `backend/app/api/deps.py`). Scoped to
tickets where `assigned_faculty_id` == the caller — a ticket that exists
but isn't routed to the caller returns 404 (same not-found-vs-not-owned
pattern as the student ticket endpoints). Implemented in
`backend/app/api/v1/faculty.py`.
- `GET /api/v1/faculty/tickets` — 200 + `FacultyTicketOut[]`, newest
  first, tickets routed to the caller only.
- `POST /api/v1/faculty/tickets/{ticket_id}/respond` — body `{content}`
  -> 201 + `FacultyMessageOut` (`sender_type: "staff"`), also sets
  `tickets.status = "answered"`. 404 if not routed to caller.
- `GET /api/v1/faculty/tickets/{ticket_id}` (added 2026-08-19, alongside
  FRONTEND-04) — 200 + `FacultyTicketDetailOut` (same shape as
  `FacultyTicketOut` plus `messages: FacultyMessageOut[]`, chronological).
  404 if not routed to caller. Added because the original BACKEND-05 pass
  only ever returned the ticket *list* shape — there was no way to fetch
  a routed ticket's thread at all, which blocks both responding (need to
  read the question first) and verifying (need a `message_id`, which had
  no other source). Mirrors the student `GET /tickets/{ticket_id}`
  pattern exactly. Same cross-boundary-addition note as `GET /auth/me`
  above — Claude-3, flagged per TEAM_PROTOCOL.md.
- `POST /api/v1/faculty/tickets/{ticket_id}/messages/{message_id}/verify`
  — body `{verified: true}` -> 200 + `FacultyMessageOut` with
  `is_verified: true` (FR-18). `verified: false` is rejected (400,
  "un-verifying is not supported"). 404 if ticket not routed to caller or
  message not found/not a staff message on that ticket. Also enqueues
  AI-05's Learning Agent job (see "Internal — Learning Agent job payload"
  below, implemented 2026-08-10) — closes FR-25's loop.

### Admin (BACKEND-06, implemented 2026-08-10)
All routes require `Authorization: Bearer <access_token>` and
`role='admin'` (`require_admin`, `backend/app/api/deps.py`). Every
mutation writes an `audit_logs` row (NFR-7). Implemented in
`backend/app/api/v1/admin.py`.
- `GET /api/v1/admin/routing-rules` — 200 + `RoutingRuleOut[]`, ordered
  by category.
- `POST /api/v1/admin/routing-rules` — body `{category, faculty_id}` ->
  201 + `RoutingRuleOut`. 400 if `faculty_id` doesn't belong to a
  `role='faculty'` user.
- `DELETE /api/v1/admin/routing-rules/{rule_id}` — 204. 404 if not found.
- `GET /api/v1/admin/users` — 200 + `UserOut[]` (reuses the existing
  `app.schemas.auth.UserOut`, not a duplicate schema), ordered by
  `created_at`.
- `PATCH /api/v1/admin/users/{user_id}/role` — body
  `{role: "student"|"faculty"|"admin"}` -> 200 + `UserOut`. 404 if user
  not found.
- `GET /api/v1/admin/analytics/summary` (added 2026-08-19, alongside
  FRONTEND-05) — 200 + `AnalyticsSummaryOut`: `total_tickets`,
  `tickets_by_status` (dict), `escalation_rate` (escalated/total, or
  `null` if no tickets), `avg_first_response_seconds` (avg seconds from
  ticket creation to first non-student message, `null` if none exist),
  `avg_agent_confidence` (avg of `agent_runs.confidence`, a confidence
  proxy — NOT a measured correctness rate, there's no ground-truth
  labeling in this system; named accordingly to avoid overclaiming),
  `ai_auto_resolution_rate` (completed/total `agent_runs`, `null` if
  none exist). Every `null` means "not enough data yet", never a fake 0.
  Deliberately does NOT include a general ticket list/override — no such
  admin capability exists yet (see FRONTEND-03's note above). Cross-
  boundary addition into Claude-1's ownership area by Claude-3, to
  unblock FRONTEND-05 — same disclosed pattern as `GET /auth/me` and
  `GET /faculty/tickets/{id}` above. Verified for real: the exact
  aggregation logic (not a simplified stand-in) was run against an
  in-memory SQLite DB seeded with 3 tickets/5 messages/2 agent_runs,
  asserting each computed number by hand, plus a separate empty-DB case
  confirming every rate/avg field returns `null` rather than crashing or
  showing a misleading 0.

### Internal — ai-worker write-back (BACKEND-07, implemented 2026-08-10)
Mounted at `/internal/v1` directly in `backend/app/main.py` — NOT under
`/api/v1` / nginx's `/api/` routing. No app-level auth: relies on
network-level isolation (ai-worker and backend share docker-compose's
`helpdesk-net` bridge network; nginx never forwards `/internal/`), same
approach as `agents/service/main.py`'s faiss-service. Implemented in
`backend/app/api/internal.py` / `backend/app/services/ai_result_service.py`.
- `POST /internal/v1/tickets/{ticket_id}/ai-result` — body matches the
  contract AI-04 proposed below (v0.6) exactly, no changes. Response:
  `{ticket_id: "<uuid str>", status: "<ticket's new status>"}`. 404 if
  ticket doesn't exist. Behavior on receipt:
  - Always writes an `agent_runs` row (`status="error"` if the payload's
    `error` field is set, `"completed"` otherwise).
  - If `payload.error` is set, stops there — no other ticket state
    changes.
  - `decision="auto_respond"` or `"clarify"`: posts an `ai_agent` message
    (`draft_answer` or `clarifying_question` respectively) and sets
    `tickets.status` to `"answered"` or `"open"`.
  - `decision="escalate"`: looks up `faculty_routing_rules` by
    `payload.category`; if a rule matches, sets
    `tickets.assigned_faculty_id`. Either way sets `tickets.status =
    "escalated"` — even with no matching rule, so it's visible somewhere
    rather than silently staying `"open"` with no owner.
  - `payload.category`, when present, always updates `tickets.category`
    regardless of decision.

### Internal — ai-worker job payload (backend -> ai-worker, implemented 2026-08-10)
Proposed by AI-04 (Claude-2), v0.6; the enqueue side implemented same-day
as BACKEND-07's write-back side. `backend/app/services/ai_dispatch_service.py`
sends via `send_task("agents.worker.process_ticket_job", args=[job],
queue="ai_tasks")` over the shared Redis broker — by string task name,
deliberately not importing anything from `agents/`, so `backend/` and
`agents/` stay decoupled at the Python-import level even though they
share a broker. Wired into `ticket_service.create_ticket`/`add_message` —
every new ticket and every student follow-up message enqueues a job.
Enqueue failures are caught and logged, never raised (a Redis outage must
not break ticket creation — verified in a sandbox with no broker
reachable at all: ticket creation still succeeded, the resulting
ConnectionError was caught and logged).
```json
{
  "ticket_id": "<uuid>",
  "question": "<latest message content>",
  "conversation_history": [{"sender_type": "student|ai_agent|staff", "content": "..."}],
  "graph_version": "v1"
}
```
`graph_version` is omitted by the backend — `agents/worker/graph_runner.py`
defaults it from `agents/config.py`'s own `GRAPH_VERSION` setting.
Verified with a mocked broker in a sandbox: confirmed the exact task
name, queue, and job shape for both a new ticket (`conversation_history:
[]`) and a follow-up message (`conversation_history` correctly populated
with prior messages). Not yet proven against a real Redis+Celery
worker+LLM (no Docker daemon or LLM API key in this environment) — only
against the SQLite/mocked-broker sandbox described here and in
task_board.md's BACKEND-07 entry.

### Internal — Learning Agent job payload (backend -> ai-worker, implemented 2026-08-10)
AI-05's other real deliverable this session (see task_board.md's AI-05
entry, part 1). `backend/app/services/ai_dispatch_service.py`'s
`enqueue_learning_job()` sends via `send_task(
"agents.worker.process_learning_job", args=[job], queue="ai_tasks")` —
same mechanism as the ai-worker job payload above, different task name.
Called from `faculty_service.mark_message_verified()` after the verify
DB write succeeds; enqueue failure is logged and swallowed (the verify
action must succeed regardless of whether the re-index does).
```json
{
  "ticket_id": "<uuid>",
  "message_id": "<uuid>",
  "question": "<the ticket's first student message>",
  "answer": "<the verified staff message's content>",
  "category": "<tickets.category, or null>"
}
```
Consumed by `agents/worker/celery_app.py`'s `process_learning_job` task,
which calls `agents/learning/learning_agent.py`'s `ingest_verified_answer()`
— writes the Q&A pair as a new `knowledgebase/faqs/*.md` doc (idempotent
by `(ticket_id, message_id)`) and rebuilds the FAISS index. Verified with
a mocked broker in a sandbox (exact task name + full payload shape
confirmed) and, separately, with real logic against a fake Embedder
(5 tests in `agents/tests/test_learning_agent.py`, including confirming
the verified answer is actually retrievable afterward via a fresh
`FaissRetriever.load()`) — not yet proven end-to-end with a live
Redis+Celery worker connecting both halves.

## Planned Endpoints (not yet implemented — placeholders for design alignment)

### Knowledgebase (admin)
- `POST /api/v1/admin/knowledgebase/documents` — upload doc (goes to MinIO +
  triggers rag/ ingestion).
- `GET /api/v1/admin/knowledgebase/documents` — list documents.
- `DELETE /api/v1/admin/knowledgebase/documents/{doc_id}` — remove + de-index.

### Internal (faiss-service, AI-03 — not exposed to frontend/nginx)
Deployment resolved (see task_board.md ARCH-DECISION-02, repo-root Docker
build context) — agents/service/ deploys from where it's built, no move.
No auth (internal-network-only service, not behind nginx). Implemented in
`agents/service/main.py`.
- `GET /health` — liveness check. Returns `{"status": "ok"}`.
- `POST /search` — body `{query, top_k?}` (top_k default 5, max 50) -> 200 +
  `{results: [{content, source, score}]}`. 422 if query is empty/whitespace.
  503 if no index has been built yet (run /reindex or the ingest CLI first).
- `POST /reindex` — no body -> 200 + `{chunks_indexed}`. Re-runs
  agents/rag/ingest.py over knowledgebase/ and persists a fresh FAISS index,
  replacing the in-memory retriever on the next /search call.

## Change Log
- v0.11 — same-session cross-boundary addition by Claude-3 (Frontend),
  alongside FRONTEND-05 (Admin analytics dashboard):
  `GET /api/v1/admin/analytics/summary`. Verified for real against an
  in-memory SQLite DB (seeded data + empty-DB case) — see the endpoint's
  own entry above for details.
- v0.10 — same-session addition by Claude-3 (Frontend), alongside
  FRONTEND-04 (Faculty Portal): `GET /api/v1/auth/me` and
  `GET /api/v1/faculty/tickets/{ticket_id}`. Both are small, read-only,
  additive endpoints needed to unblock the faculty UI (role visibility
  after login, and a way to see a routed ticket's thread before
  responding/verifying) — no existing endpoint's shape or behavior
  changed. Cross-boundary into Claude-1's ownership area, disclosed here
  and in task_board.md rather than done silently, per TEAM_PROTOCOL.md.
  Verified by static field-for-field review against the existing, tested
  `get_ticket_with_messages`/`TicketDetailOut` pattern and the real
  `Ticket`/`Message` SQLAlchemy models, not a live sandbox pytest run —
  flagged as a lighter verification bar than usual, not hidden.
- v0.1 — initial placeholder contract, bootstrapped alongside architecture.md
  and requirements.md. No code implemented yet.
- v0.2 — BACKEND-01: implemented `GET /api/v1/health` and `GET /`.
- v0.3 — BACKEND-03: implemented auth signup/login/refresh (JWT access +
  refresh tokens, bcrypt password hashing) and the get_current_user/
  require_admin dependencies for future protected routes.
- v0.4 — BACKEND-04: implemented student ticket endpoints (create, list,
  detail w/ messages, follow-up message, status poll), scoped to the
  authenticated student via get_current_user.
- v0.5 — AI-03: implemented faiss-service (GET /health, POST /search, POST
  /reindex) in agents/service/main.py. Internal service, not routed through
  nginx/api_v1 — deployment location still open, see ARCH-DECISION-02.
- v0.6 — AI-04: proposed (not yet implemented on the backend side) the
  ai-worker job payload contract and the POST /internal/v1/tickets/
  {ticket_id}/ai-result write-back endpoint. Backend-side implementation
  tracked as BACKEND-07.
- v0.7 — BACKEND-05/06/07: implemented faculty endpoints (list routed
  tickets, respond, verify), admin endpoints (routing-rule CRUD, user
  role management), and the ai-worker write-back endpoint exactly per
  v0.6's proposed contract (no shape changes). Verified for real in a
  sandbox against in-memory SQLite — see task_board.md/project_status.md
  for the full 11-step smoke test.
- v0.8 — same session as v0.7: implemented the ai-worker enqueue side
  (backend -> Celery `send_task`), the other half of AI-04's v0.6
  job-payload proposal. Wired into ticket_service.py's create_ticket/
  add_message. BACKEND-07's round trip (enqueue -> AI-04 processes ->
  write-back) is now wired end-to-end at the code level for the first
  time. Verified with a mocked broker + a no-broker-reachable case in a
  sandbox — see task_board.md's BACKEND-07 entry.
- v0.9 — same session: implemented the Learning Agent's enqueue side
  (AI-05 part 1, cross-owner "make it fast" authorization) —
  `enqueue_learning_job()` called from the faculty verify endpoint above.
  Closes requirements.md FR-25's loop for the first time: a
  faculty-verified answer now actually gets written into
  knowledgebase/faqs/ and re-indexed, confirmed retrievable afterward.
  See task_board.md's AI-05 entry for what's still NOT done (the granular
  intent/entity/decision/confidence module split, and the Analytics
  Agent).
