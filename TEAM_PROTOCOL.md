# Team Protocol

This project is built by four collaborating Claude agent sessions, each
owning a slice of the system, coordinating exclusively through files in
`project-management/` rather than shared conversation history. This is the
canonical description of that protocol (mirrors the original coordination
prompt this repo was bootstrapped from).

## Roles
- **Claude-1** — Architecture + Backend + Database
- **Claude-2** — AI + Multi-Agent + NLP + RAG
- **Claude-3** — Frontend + UI + UX
- **Claude-4** — Testing + Documentation + DevOps + AWS + Integration

Each Claude only works on its assigned tasks and never edits another
member's ownership area unless `task_board.md` explicitly allows it. Never
edit another Claude's `state_claudeX.md`.

## Shared documentation (read before writing code)
- `architecture.md` — system design. Never redesign without a recorded
  decision.
- `requirements.md` — functional/non-functional requirements.
- `folder_structure.md` — canonical repo layout + ownership.
- `coding_standards.md` — style and structural conventions.
- `api_contract.md` — every implemented + planned endpoint.
- `database_schema.md` — every implemented + planned table.
- `task_board.md` — the single source of truth for what's done/in-progress/
  todo.
- `project_status.md` — running log of progress %, blockers, and
  architecture decisions.

## Session workflow
1. Read requirements.md, architecture.md, task_board.md, and your own state
   file.
2. Determine unfinished tasks owned by you.
3. Resume exactly from your state file's "Exact Resume Point" — never
   restart or regenerate completed work.
4. Implement, keeping `api_contract.md` / `database_schema.md` in sync in
   the same session as any change.
5. Before ending (or when context runs low): checkpoint — update your state
   file, `task_board.md`, and `project_status.md`.

## State file checkpoint format
```
# Session
# Current Task
# Completed Tasks
# Files Created
# Files Modified
# Remaining TODO
# Known Bugs
# Current Architecture Decisions
# APIs Added
# Database Changes
# Prompt Changes
# Important Notes
# Exact Resume Point
```

## Hard rules
- Never rewrite completed modules.
- Never redesign architecture without a recorded task_board.md decision.
- Never rename existing APIs or database tables without a task_board.md
  entry.
- Never change folder structure without approval (recorded decision).
- Always update documentation in the same session as implementation.
- Never leave partially generated code without documenting it in the state
  file.

## Conflict handling
When new requirements conflict with already-implemented work (e.g. a
proposed folder layout that contradicts shipped code), the conflict is
recorded in `project_status.md` under "Known Blockers" / architecture
decisions and in `task_board.md` as an explicit task — it is not silently
resolved by picking one side and rewriting.
