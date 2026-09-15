# Requirements — Student HelpDesk AI

Status: v2.0 — expanded per stakeholder-directed enterprise scope (faculty
portal, RBAC, escalation/routing, learning loop, analytics, testing/docs/
assignment-report deliverables). Supersedes v0.1's single-admin-role model.
Refine via task_board.md; do not silently rewrite.

## 1. Actors
- **Student** — submits questions/tickets, views answers/history.
- **Faculty** — receives escalated/routed tickets for their
  department/category, responds, can mark a response "verified" (feeds the
  Learning Agent / knowledge base).
- **Admin** — sees everything; manages knowledgebase, users, routing rules,
  analytics; can also respond directly.
- **System (AI agents)** — attempts to answer automatically before
  escalation; routes escalated tickets to the right faculty.

## 2. Functional Requirements

### 2.1 Student-facing (IMPLEMENTED — see api_contract.md v0.4)
- FR-1: Student can sign up / log in (JWT auth). ✅
- FR-2: Student can submit a question (free text, optional attachment via
  MinIO). ✅ (attachment upload not yet implemented — see Open Items)
- FR-3: Student sees an AI-generated answer, with confidence/source
  indication where available. (blocked on AI-01..04)
- FR-4: Student can continue a conversation (follow-up messages). ✅
- FR-5: Student can see ticket history and status. ✅

### 2.2 Faculty-facing (NEW — not yet implemented)
- FR-16: Faculty can log in and see tickets routed/escalated to them (by
  category/department).
- FR-17: Faculty can respond to a routed ticket.
- FR-18: Faculty can mark their response "verified" — this triggers the
  Learning Agent to add the Q&A pair to the knowledge base for future RAG
  retrieval.
- FR-19: Faculty sees only tickets routed to them, not the full ticket set
  (RBAC-enforced, not just UI-hidden).

### 2.3 Admin-facing (partially implemented — dashboard shell TODO)
- FR-6: Admin can view all tickets, filter by status/agent/date.
- FR-7: Admin can manually respond to escalated tickets.
- FR-8: Admin can manage knowledgebase documents (upload/update/delete).
- FR-9: Admin can view analytics (ticket volume, escalation rate, response
  time, agent accuracy) via Grafana or an in-app dashboard.
- FR-20: Admin manages routing rules (which category/department maps to
  which faculty member(s)).
- FR-21: Admin manages user roles (promote/demote student/faculty/admin).

### 2.4 AI / Agent System (NEW pipeline shape — was single retriever+specialist)
- FR-10: Incoming questions routed through a LangGraph multi-agent graph.
- FR-11: Retrieval step (RAG over FAISS) grounds answers in knowledgebase
  content.
- FR-12: Low-confidence or out-of-scope questions are escalated (status =
  escalated), not silently guessed.
- FR-13: Specialist categories now map to faculty routing — exact set
  finalized in agents/ docs by Claude-2, must align with FR-20 routing
  rules.
- FR-22: Intent Recognition stage classifies the question type before
  retrieval.
- FR-23: Entity Extraction pulls structured fields (course code, deadline,
  etc.) to aid routing/retrieval.
- FR-24: Confidence Agent scores the candidate answer; score below
  threshold forces escalation (see FR-12).
- FR-25: Learning Agent ingests faculty-verified answers (FR-18) into the
  knowledge base — only verified content is indexed, never raw AI or
  unverified student content.
- FR-26: Analytics Agent feeds ticket/agent-performance analytics (FR-9).

### 2.5 Platform
- FR-14: Transactional emails sent via email-worker (ticket created,
  answered, escalated, resolved — expanded from "answered" only).
- FR-15: System deployable to AWS; local dev fully reproducible via
  docker-compose. ✅ docker-compose.yml drafted (DEVOPS-01); Dockerfiles
  pending (DEVOPS-02).
- FR-27: RBAC enforced at the API layer via dependency injection — never
  trusted from the frontend alone.
- FR-28: Analytics event tracking (PostHog) for product-usage insight,
  separate from Prometheus/Grafana infra metrics.

## 3. Non-Functional Requirements
- NFR-1: Backend API responses (non-AI) < 300ms p95 under normal load.
- NFR-2: AI-generated answers return within a reasonable async window; UI
  doesn't block synchronously (job status polling — resolved, see §5).
- NFR-3: All secrets/config via environment variables — never hardcoded.
- NFR-4: Observability: Prometheus + Grafana + Loki (logs) for
  health/latency/error-rate/log aggregation.
- NFR-5: Data isolation: student sees only own tickets; faculty sees only
  routed tickets; admin sees all. Enforced server-side (FR-27).
- NFR-6: Rate limiting on public auth endpoints (signup/login) to blunt
  credential-stuffing/brute-force.
- NFR-7: Audit logging for admin actions (role changes, routing rule
  changes, knowledgebase document changes).
- NFR-8: Every feature ships with docs + validation + error handling +
  logging + tests + config — no feature is "complete" without all five
  (per stakeholder engineering standard).

## 4. Explicitly Out of Scope (v1)
- Multi-institution/tenant support.
- Native mobile apps.
- Voice/phone channel.

## 5. Resolved / Open Questions
- RESOLVED: Real-time channel = polling (5s interval on ticket status),
  not websockets — implemented in FRONTEND-02, see project_status.md.
- RESOLVED: Specialist agent categories = academic, it_support,
  admissions_enrollment, financial_aid_billing, general (AI-01's
  SpecialistCategory enum, agents/state/graph_state.py). This was actually
  decided before this line was last edited — requirements.md just hadn't
  been updated to reflect it; see project_status.md's Architecture
  Decisions log for when. FR-13/FR-20 routing rules can now use this list.
- OPEN: SLA targets for escalation response time.
- OPEN: Backend folder-layout reconciliation — see task_board.md
  ARCH-DECISION-01 (Clean Architecture spec vs. already-implemented
  `backend/app/` layout).
- OPEN: architecture.md §1's high-level flow lists "decision →
  confidence", but §4.3 describes the Confidence Agent as scoring the
  candidate answer and forcing escalation below threshold — which reads
  as confidence feeding the decision, not following it. AI-05 (Claude-2)
  interpreted this as confidence-then-decision (see project_status.md
  Architecture Decisions) since a decision needs a score as input. Flagged
  here rather than silently resolved; someone with authority over
  architecture.md may want to fix the diagram's ordering to match.

## 6. Deliverables (added — assignment context, not just the app itself)
- Assignment Report — docs/assignment-report/ (Claude-4 owns; content from
  all four agents' work).
- User Manual + Developer Guide — docs/ (Claude-4).
- Architecture/DB/API/Deployment/Cloud/Security diagrams — diagrams/
  (source) + docs/ (rendered/linked).
- Presentation/demo material — presentation/ (Claude-4, near the end).
- Test suite — tests/ (cross-service) + backend/tests/ (unit) + agents/tests
  (agent eval) — see coding_standards.md.
