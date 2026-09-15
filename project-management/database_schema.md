# Database Schema — Student HelpDesk AI

Status: v0.4 — faculty/RBAC/agent_runs/audit_logs migration
(0002_faculty_routing_and_agent_runs) IMPLEMENTED at the model + migration
level and verified against SQLite in a sandbox (2026-08-10) — NOT yet run
against a real Postgres instance (`alembic upgrade head` itself untested,
no Postgres available in this environment). knowledgebase_documents and
attachments remain design-draft, not needed by any currently-open task.
Update this file in the same session any table/column is added or
changed. Never rename an existing table without a task_board.md entry
(agent1.md hard rule).

## Engine
PostgreSQL. Access via SQLAlchemy (async) + Alembic migrations under
`backend/app/db/migrations/` — this is now the PERMANENT layout per
ARCH-DECISION-01 (resolved 2026-08-10, ruled out the Clean Architecture
`backend/database/` path). See task_board.md.

## Tables

### users — IMPLEMENTED (migration 0001)
| column        | type         | notes                                     |
|---------------|--------------|---------------------------------------------|
| id            | UUID PK      |                                                |
| email         | text unique  |                                                 |
| password_hash | text         |                                                  |
| role          | text         | 'student' \| 'faculty' \| 'admin' — 'faculty' added as a valid app-level value in migration 0002; no DB-level enum/check constraint |
| created_at    | timestamptz  |                                                    |

### tickets — IMPLEMENTED (migrations 0001 + 0002)
| column              | type        | notes                                  |
|---------------------|-------------|-------------------------------------------|
| id                  | UUID PK     |                                             |
| student_id          | UUID FK     | -> users.id                                 |
| subject             | text        | optional short title                         |
| status              | text        | 'open' \| 'answered' \| 'escalated' \| 'closed' |
| category            | text null   | specialist agent category                       |
| assigned_faculty_id | UUID FK null | -> users.id, migration 0002 — set by BACKEND-07 on escalation via faculty_routing_rules lookup |
| created_at          | timestamptz |                                                    |
| updated_at          | timestamptz |                                                     |

### messages — IMPLEMENTED (migrations 0001 + 0002)
| column      | type        | notes                                    |
|-------------|-------------|--------------------------------------------|
| id          | UUID PK     |                                              |
| ticket_id   | UUID FK     | -> tickets.id                                |
| sender_type | text        | 'student' \| 'ai_agent' \| 'staff'            |
| sender_id   | UUID null   | user id if staff/student, null if ai_agent      |
| content     | text        |                                                   |
| is_verified | bool        | migration 0002, default false — set true by BACKEND-05's faculty verify endpoint; read (not yet — AI-05 doesn't exist) by the future Learning Agent |
| created_at  | timestamptz |                                                    |

### agent_runs — IMPLEMENTED (migration 0002)
| column        | type        | notes                                     |
|---------------|-------------|----------------------------------------------|
| id            | UUID PK     |                                                |
| ticket_id     | UUID FK     | -> tickets.id                                  |
| graph_version | text        | which LangGraph graph/version ran                |
| status        | text        | 'running' \| 'completed' \| 'escalated' \| 'error' — written by BACKEND-07, only 'completed'/'error' actually used so far |
| confidence    | float null  |                                                      |
| started_at    | timestamptz |                                                       |
| finished_at   | timestamptz null |                                                  |

### knowledgebase_documents — design draft, not yet implemented
| column      | type        | notes                          |
|-------------|-------------|----------------------------------|
| id          | UUID PK     |                                    |
| title       | text        |                                     |
| storage_key | text        | MinIO object key                    |
| status      | text        | 'pending' \| 'indexed' \| 'failed'    |
| source      | text        | NEW — 'admin_upload' \| 'faculty_verified_answer' |
| uploaded_by | UUID FK     | -> users.id                            |
| created_at  | timestamptz |                                          |

### attachments — design draft, not yet implemented
| column      | type        | notes                    |
|-------------|-------------|----------------------------|
| id          | UUID PK     |                              |
| message_id  | UUID FK     | -> messages.id                |
| storage_key | text        | MinIO object key                |
| filename    | text        |                                   |
| created_at  | timestamptz |                                    |

### faculty_routing_rules — IMPLEMENTED (migration 0002)
| column      | type        | notes                                |
|-------------|-------------|-----------------------------------------|
| id          | UUID PK     |                                           |
| category    | text        | matches tickets.category — admin-managed via BACKEND-06, read by BACKEND-07 on escalation |
| faculty_id  | UUID FK     | -> users.id (role='faculty'), enforced at the service layer (BACKEND-06 400s if not) |
| created_by  | UUID FK     | -> users.id (admin who set the rule)          |
| created_at  | timestamptz |                                                 |

### audit_logs — IMPLEMENTED (migration 0002)
| column      | type        | notes                                     |
|-------------|-------------|-----------------------------------------------|
| id          | UUID PK     |                                                 |
| actor_id    | UUID FK     | -> users.id                                     |
| action      | text        | 'role_changed' \| 'routing_rule_changed' (BACKEND-06's actual values so far) |
| target      | text null   | free-form reference to affected entity               |
| metadata    | JSON null   | plain sa.JSON, NOT postgresql.JSONB — JSONB doesn't compile on SQLite at all (found in a sandbox this session), which would've blocked a future SQLite-based CI fixture. Nothing queries the JSON contents yet, so JSONB's indexing/operator edge isn't in use. |
| created_at  | timestamptz |                                                          |

## Notes
- FAISS/vector DB is NOT a Postgres table — it's a derived index built from
  `knowledgebase_documents` content by agents/rag/ ingestion. Postgres
  remains system of record for the source docs.
- knowledgebase_documents and attachments remain design-draft — no
  currently-open task needs them yet.
- Migration 0002 was verified by running `Base.metadata.create_all`
  against an in-memory SQLite DB in a sandbox (all 6 tables succeed) and
  an 11-step service-layer smoke test on top of that schema — NOT by
  actually running `alembic upgrade head` against a real Postgres
  instance, which wasn't available in this environment.

## Change Log
- v0.1 — initial draft schema, no migrations run yet.
- v0.2 — BACKEND-02: implemented `users`, `tickets`, `messages` as
  SQLAlchemy models + Alembic migration `0001_initial_schema`.
- v0.3 — enterprise scope: added faculty_routing_rules, audit_logs tables
  (draft); added assigned_faculty_id to tickets, is_verified to messages,
  role enum expansion on users, source column on knowledgebase_documents —
  all PENDING a follow-up migration.
- v0.4 — DB-01 (2026-08-10): implemented migration
  0002_faculty_routing_and_agent_runs — tickets.assigned_faculty_id,
  messages.is_verified, agent_runs, faculty_routing_rules, audit_logs all
  real now. source column on knowledgebase_documents remains draft
  (that table itself isn't built yet). users.role got no DB-level
  enum/check constraint — 'faculty' is just a new valid string value.
