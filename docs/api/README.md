# API Reference

Base path: `/api/v1` (except the internal write-back endpoints — see
below). All authenticated routes expect `Authorization: Bearer <access
token>`. All request/response bodies are JSON unless noted.

This page is a human-facing summary. The exact, currently-authoritative
contract (kept in sync with the code in the same commit/session it
changes) lives in `project-management/api_contract.md` — check there if
this page and the running API ever disagree.

## Conventions

- **404, not 403, for "not yours."** Any resource-scoped endpoint (a
  ticket you don't own, a ticket not routed to you) returns 404 for both
  "doesn't exist" and "exists but isn't yours" — so the API never
  confirms a resource's existence to someone who shouldn't see it.
- **Error shape:**
  ```json
  { "error": { "code": "string", "message": "string", "details": {} } }
  ```

## Health

| Method & path | Auth | Description |
|---|---|---|
| `GET /` | public | Root service info |
| `GET /api/v1/health` | public | Liveness check → `{"status": "ok"}` |

## Auth

| Method & path | Auth | Description |
|---|---|---|
| `POST /api/v1/auth/signup` | public | `{email, password}` → 201 + user. Always creates a `student`. |
| `POST /api/v1/auth/login` | public | `{email, password}` → 200 + `{access_token, refresh_token, token_type}` |
| `POST /api/v1/auth/refresh` | public | `{refresh_token}` → 200 + new token pair |
| `GET /api/v1/auth/me` | user | 200 + `{id, email, role}` — the only way the frontend learns the caller's role |

## Tickets (student)

Scoped to the authenticated student.

| Method & path | Description |
|---|---|
| `POST /api/v1/tickets` | `{subject?, message}` → creates a ticket + its first message |
| `GET /api/v1/tickets` | List the caller's tickets, newest first |
| `GET /api/v1/tickets/{id}` | Ticket detail + full message thread |
| `POST /api/v1/tickets/{id}/messages` | Add a follow-up message |
| `GET /api/v1/tickets/{id}/status` | Poll current status (used every 5s by the frontend) |

## Faculty

Requires `role=faculty`. Scoped to tickets routed to the caller.

| Method & path | Description |
|---|---|
| `GET /api/v1/faculty/tickets` | Tickets routed to the caller |
| `GET /api/v1/faculty/tickets/{id}` | Ticket detail + thread |
| `POST /api/v1/faculty/tickets/{id}/respond` | `{content}` → posts a staff message, sets status `answered` |
| `POST /api/v1/faculty/tickets/{id}/messages/{message_id}/verify` | `{verified: true}` → marks a staff message verified, triggers the Learning Agent re-index |

## Admin

Requires `role=admin`. Every mutation writes an audit-log row.

| Method & path | Description |
|---|---|
| `GET /api/v1/admin/routing-rules` | List category → faculty routing rules |
| `POST /api/v1/admin/routing-rules` | `{category, faculty_id}` → create a rule |
| `DELETE /api/v1/admin/routing-rules/{id}` | Remove a rule |
| `GET /api/v1/admin/users` | List all users |
| `PATCH /api/v1/admin/users/{id}/role` | `{role}` → change a user's role |
| `GET /api/v1/admin/analytics/summary` | Ticket volume, escalation rate, response time, AI confidence/auto-resolution — see below |

### Analytics fields

Every field is a real, precisely-defined aggregate over live data — never
a placeholder number. Any rate/average with no underlying data yet
returns `null`, not a misleading `0`.

| field | meaning |
|---|---|
| `total_tickets` | count of all tickets |
| `tickets_by_status` | counts grouped by status |
| `escalation_rate` | escalated tickets ÷ total |
| `avg_first_response_seconds` | avg time from ticket creation to first non-student message |
| `avg_agent_confidence` | avg of the AI's own reported confidence score — **not** a measured correctness rate; there's no human-graded accuracy check in this system |
| `ai_auto_resolution_rate` | AI runs that completed without escalating ÷ total AI runs |

## Internal endpoints (not public, not routed through nginx)

These exist for service-to-service communication only, isolated at the
network level (internal Docker network / no nginx route), not behind
application-level auth.

| Method & path | Caller | Description |
|---|---|---|
| `POST /internal/v1/tickets/{id}/ai-result` | ai-worker → backend | Write back the AI pipeline's decision (auto-respond, clarify, or escalate) |
| `GET /health`, `POST /search`, `POST /reindex` (faiss-service, no `/api` prefix) | ai-worker → faiss-service | Vector search over the knowledge base |

## Not yet implemented

- Admin knowledge-base document management (`POST/GET/DELETE
  /api/v1/admin/knowledgebase/documents`) — designed, not built. Content
  currently reaches the index by being placed directly under
  `knowledgebase/` and re-indexed manually.
- A general "list/override any ticket" admin endpoint. The admin surface
  today covers routing rules, user roles, and analytics — not a ticket
  override tool. The admin dashboard's own UI states this limitation
  rather than hiding it.
