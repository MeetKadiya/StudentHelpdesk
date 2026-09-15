# Database

PostgreSQL is the system of record, accessed via SQLAlchemy (async) with
Alembic migrations under `backend/app/db/migrations/`. This page is a
human-facing summary — for the exact column-by-column source of truth
(including in-flight/draft tables), see
`project-management/database_schema.md`.

## Entity overview

```
users ──┬──< tickets >──< messages
        │        │
        │        └──> agent_runs
        │
        ├──< faculty_routing_rules (faculty_id, created_by)
        └──< audit_logs (actor_id)
```

## Tables

### `users`
| column | type | notes |
|---|---|---|
| id | UUID (PK) | |
| email | text, unique | |
| password_hash | text | bcrypt |
| role | text | `student` \| `faculty` \| `admin` — application-level only, no DB constraint |
| created_at | timestamptz | |

### `tickets`
| column | type | notes |
|---|---|---|
| id | UUID (PK) | |
| student_id | UUID (FK → users) | owner |
| subject | text, nullable | optional short title |
| status | text | `open` \| `answered` \| `escalated` \| `closed` |
| category | text, nullable | set by the AI pipeline's router |
| assigned_faculty_id | UUID (FK → users), nullable | set on escalation via routing rules |
| created_at / updated_at | timestamptz | |

### `messages`
| column | type | notes |
|---|---|---|
| id | UUID (PK) | |
| ticket_id | UUID (FK → tickets) | |
| sender_type | text | `student` \| `ai_agent` \| `staff` |
| sender_id | UUID, nullable | null for `ai_agent` |
| content | text | |
| is_verified | bool, default false | set by a faculty member; read by the Learning Agent |
| created_at | timestamptz | |

### `agent_runs`
One row per AI pipeline execution — the audit trail for what the AI did
and how confident it was.
| column | type | notes |
|---|---|---|
| id | UUID (PK) | |
| ticket_id | UUID (FK → tickets) | |
| graph_version | text | which pipeline version ran |
| status | text | `running` \| `completed` \| `escalated` \| `error` |
| confidence | float, nullable | the model's own confidence score |
| started_at / finished_at | timestamptz | |

### `faculty_routing_rules`
Admin-managed category → faculty mapping.
| column | type | notes |
|---|---|---|
| id | UUID (PK) | |
| category | text | matches `tickets.category` |
| faculty_id | UUID (FK → users) | must be a `role='faculty'` user (enforced at the service layer) |
| created_by | UUID (FK → users) | the admin who set the rule |
| created_at | timestamptz | |

### `audit_logs`
Every admin mutation (role change, routing-rule change) writes a row here.
| column | type | notes |
|---|---|---|
| id | UUID (PK) | |
| actor_id | UUID (FK → users) | |
| action | text | e.g. `role_changed`, `routing_rule_changed` |
| target | text, nullable | free-form reference to the affected entity |
| metadata | JSON, nullable | plain JSON (not `JSONB` — see note below) |
| created_at | timestamptz | |

### Draft tables (not yet built)
`knowledgebase_documents` and `attachments` are designed but not
implemented — no currently active feature needs them yet. The AI
pipeline currently ingests documents placed directly under
`knowledgebase/` on disk rather than through a database-tracked upload
flow.

## The vector index isn't a Postgres table

FAISS's vector index is a **derived artifact**, built by the RAG
ingestion pipeline from the files under `knowledgebase/`. Postgres
remains the system of record for the source content; the FAISS index can
always be rebuilt from it (`POST /reindex` on the faiss-service, or the
ingestion CLI).

## One implementation note worth knowing

`audit_logs.metadata` uses plain `JSON`, not PostgreSQL's `JSONB` type.
This was a deliberate choice made after discovering `JSONB` doesn't
compile at all against SQLite — which would have silently blocked any
future SQLite-based test fixture. Nothing currently queries the JSON
contents with indexed/operator-level access, so `JSONB`'s main advantage
isn't in play yet; revisit if that changes.

## Migrations

- `0001_initial_schema` — `users`, `tickets`, `messages`.
- `0002_faculty_routing_and_agent_runs` — adds `tickets.assigned_faculty_id`,
  `messages.is_verified`, and the `agent_runs`, `faculty_routing_rules`,
  `audit_logs` tables.

**Verification status, stated plainly:** both migrations have been
verified at the SQLAlchemy-model level (`Base.metadata.create_all`
against an in-memory SQLite database, plus service-layer smoke tests on
top of that schema). Neither has been run with `alembic upgrade head`
against a real PostgreSQL instance — none was available during
development. The DDL is standard enough that this is low-risk, but it's
the first thing worth confirming when a real Postgres instance becomes
available.
