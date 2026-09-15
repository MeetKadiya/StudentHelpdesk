# Contributing

This repo is developed by a four-agent (Claude-1..4) team coordinating
through `project-management/`. See `TEAM_PROTOCOL.md` for the full
coordination protocol.

## Before you touch code
1. Read `project-management/requirements.md`, `architecture.md`, and
   `task_board.md`.
2. Read your own `project-management/state_claudeX.md` and resume from its
   "Exact Resume Point".
3. Only work within your ownership area (see `folder_structure.md`) unless
   `task_board.md` explicitly assigns you elsewhere.

## While working
- Follow `project-management/coding_standards.md`.
- Update `api_contract.md` / `database_schema.md` in the same session you
  change an endpoint or a table.
- Never rename existing APIs, tables, or folders without a `task_board.md`
  entry recording the decision.

## Before ending a session
- Update your state file (checkpoint format — see `TEAM_PROTOCOL.md`).
- Update `task_board.md` status for any task you touched.
- Update `project_status.md` (progress %, blockers, decisions).
