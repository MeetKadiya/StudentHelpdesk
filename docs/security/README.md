# Security

## Authentication

JWT-based: `POST /auth/login` returns an access token (short-lived) and a
refresh token (7 days). Passwords are hashed with bcrypt (`passlib`).
Tokens are validated server-side on every request via FastAPI dependency
injection (`get_current_user`) — never trusted from client-side state
alone.

**Known limitation, disclosed rather than hidden:** the frontend stores
tokens in `localStorage`, which is readable by any script running on the
page (an XSS risk). This was a deliberate, flagged simplification for
this project's scope — a production hardening pass (httpOnly cookies set
by the backend, or a dedicated session-management library) is a real,
separate task, not something to silently upgrade later without noting it
here.

## Authorization (RBAC)

Three roles — `student`, `faculty`, `admin` — enforced **exclusively
server-side**, via FastAPI dependencies (`get_current_user`,
`require_admin`, `require_role(*roles)`). The frontend hides UI a user
shouldn't see, but that's a UX convenience, not the security boundary —
every protected route re-checks the role independently on the backend.

**Ownership scoping:** a student can only see their own tickets; a
faculty member can only see tickets routed to them. This is enforced at
the query level (`WHERE student_id = current_user.id`, etc.), and a
resource that exists but isn't the caller's returns **404**, not 403 —
so the API never confirms to an unauthorized caller that a given
resource even exists.

## Known gap: no first-admin bootstrap

There is currently no in-product way to create the first admin account.
`signup` always creates a `student`, and the only role-promotion path
(`PATCH /admin/users/{id}/role`) itself requires an existing admin
caller. This is a genuine, unresolved product gap — flagged explicitly
during integration testing, not fixed unilaterally, because it's a real
decision (a seed script? a first-run bootstrap flag? an env-var-gated
one-time promotion endpoint?) that deserves an explicit choice rather
than a silently-added backdoor. **Do not deploy this to real users
without resolving this first.**

## Secrets & configuration

All configuration — database URL, JWT secret, Redis URL, MinIO
credentials, API keys — is read from environment variables
(`backend/app/core/config.py`'s `Settings`, loaded from `.env`). Nothing
is hardcoded. `.env` files are gitignored everywhere they appear
(`backend/.env`, `docker/.env`, `frontend/.env.local`). In the AWS
skeleton, the database URL specifically is stored in Secrets Manager
rather than as a plain environment variable or Terraform output.

## Input validation

Every request body is validated by a Pydantic schema before it reaches
business logic — malformed input is rejected with a 422 before any
database access happens. Ticket/message content requires a minimum
length; role updates are restricted to a fixed enum
(`student|faculty|admin`) via a regex pattern.

## Network isolation for internal services

The ai-worker's write-back to the backend
(`POST /internal/v1/tickets/{id}/ai-result`) and calls to the
faiss-service are **not** protected by application-level authentication.
Instead, they rely on network-level isolation: both live on the same
internal Docker bridge network, and nginx never forwards
`/internal/*` or the faiss-service's port to the public internet. This
is a legitimate pattern for internal-only service-to-service calls, but
it means the security boundary is the network topology, not the
application — anyone who deploys this stack needs to preserve that
isolation (e.g. the AWS skeleton's security groups only allow
inter-service traffic within the VPC, never from the internet directly
to these ports).

## Rate limiting

Rate limiting on public auth endpoints (signup/login), to blunt
credential-stuffing and brute-force attempts, is a stated requirement
(`requirements.md` NFR-6) that has **not yet been implemented**. This is
a real, disclosed gap — worth prioritizing before any public deployment.

## Audit logging

Every admin mutation (role change, routing-rule create/delete) writes a
row to `audit_logs` (actor, action, target, timestamp). This satisfies
the project's audit-logging requirement (NFR-7) for admin actions
specifically; it does not currently log student/faculty actions (ticket
creation, responses) — only privileged mutations.

## Dependency & image scanning

ECR repositories in the AWS skeleton have `scan_on_push` enabled, so
container images get scanned for known vulnerabilities on every push
once actually deployed. No dependency-vulnerability scanning (e.g.
`pip-audit`, `npm audit` in CI) is currently wired into the GitHub
Actions workflow — a reasonable addition to `DEVOPS-04`'s CI job later.

## Summary of open security work

1. No first-admin bootstrap path (see above — the most important gap).
2. Token storage in `localStorage`, not httpOnly cookies.
3. No rate limiting on auth endpoints.
4. No dependency-vulnerability scanning in CI.
5. HTTPS/TLS termination isn't configured anywhere yet (dev stack is
   plain HTTP; the AWS ALB has no HTTPS listener since there's no domain
   yet) — this stack should never be exposed to real users over plain
   HTTP.

None of these are hidden or silently deferred — each is a real,
named decision waiting on either a product call or a dedicated task.
