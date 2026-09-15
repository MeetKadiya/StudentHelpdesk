# Changelog

## [Unreleased]
### Added
- Project bootstrap: repo skeleton, project-management coordination docs
  (architecture, requirements, folder_structure, coding_standards,
  api_contract, database_schema, task_board, project_status) and 4 per-agent
  state files.
- Backend: FastAPI scaffold, health check.
- Backend: users/tickets/messages tables (Alembic migration
  0001_initial_schema).
- Backend: auth endpoints (signup/login/refresh) with JWT + bcrypt.
- Scope expansion: enterprise architecture (Part 2) — faculty portal, RBAC,
  expanded AI agent roster, expanded tech stack, root-level project files.
  See project-management/project_status.md decision log for details.

### Known conflicts (unresolved — see task_board.md)
- Backend layout conflict: implemented code uses
  `backend/app/{main,core,db,api,schemas,services}`; Part 2 spec proposes
  `backend/{api,controllers,services,repositories,schemas,models,
  middleware,security,config,workers,database,tests,utils}`. Not yet
  reconciled — do not assume either is final until task_board.md resolves it.
