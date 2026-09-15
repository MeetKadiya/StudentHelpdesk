"""add faculty routing, agent runs, audit logs (DB-01)

Revision ID: 0002_faculty_routing
Revises: 0001_initial_schema
Create Date: 2026-08-10
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002_faculty_routing"
down_revision: str | None = "0001_initial_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # users.role: no DB-level enum/check constraint added — role stays a
    # free-form string as it already was (migration 0001), 'faculty' is
    # simply a new valid application-level value. Adding a CHECK constraint
    # here would be a separate, more disruptive decision; not done silently.
    op.add_column(
        "tickets",
        sa.Column(
            "assigned_faculty_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
    )
    op.create_index("ix_tickets_assigned_faculty_id", "tickets", ["assigned_faculty_id"])

    op.add_column(
        "messages",
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
    )

    op.create_table(
        "agent_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "ticket_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tickets.id"), nullable=False
        ),
        sa.Column("graph_version", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column(
            "started_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_agent_runs_ticket_id", "agent_runs", ["ticket_id"])

    op.create_table(
        "faculty_routing_rules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("category", sa.String(length=100), nullable=False),
        sa.Column(
            "faculty_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False
        ),
        sa.Column(
            "created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_faculty_routing_rules_category", "faculty_routing_rules", ["category"])
    op.create_index("ix_faculty_routing_rules_faculty_id", "faculty_routing_rules", ["faculty_id"])

    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "actor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False
        ),
        sa.Column("action", sa.String(length=50), nullable=False),
        sa.Column("target", sa.String(length=255), nullable=True),
        # sa.JSON, not postgresql.JSONB — see app/db/models/audit_log.py's
        # docstring (2026-08-10): JSONB doesn't compile on SQLite at all,
        # which would block a future SQLite-based CI test fixture.
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_audit_logs_actor_id", "audit_logs", ["actor_id"])


def downgrade() -> None:
    op.drop_index("ix_audit_logs_actor_id", table_name="audit_logs")
    op.drop_table("audit_logs")

    op.drop_index("ix_faculty_routing_rules_faculty_id", table_name="faculty_routing_rules")
    op.drop_index("ix_faculty_routing_rules_category", table_name="faculty_routing_rules")
    op.drop_table("faculty_routing_rules")

    op.drop_index("ix_agent_runs_ticket_id", table_name="agent_runs")
    op.drop_table("agent_runs")

    op.drop_column("messages", "is_verified")

    op.drop_index("ix_tickets_assigned_faculty_id", table_name="tickets")
    op.drop_column("tickets", "assigned_faculty_id")
