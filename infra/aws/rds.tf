/**
 * RDS Postgres — production mapping for the Supabase/local-Postgres
 * "free/dev implementation" in architecture.md §7. Matches
 * database_schema.md's schema (users/tickets/messages/agent_runs/
 * faculty_routing_rules/audit_logs) at the engine level only — this file
 * provisions the instance, not the schema; Alembic migrations
 * (backend/app/db/migrations/) remain the source of truth for tables.
 */

resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = { Name = "${var.project_name}-db-subnet-group" }
}

resource "random_password" "db_master" {
  length  = 32
  special = false # avoid characters RDS's password field rejects outright
}

resource "aws_db_instance" "main" {
  identifier     = "${var.project_name}-${var.environment}"
  engine         = "postgres"
  engine_version = "16"
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage_gb
  storage_type          = "gp3"
  storage_encrypted     = true
  db_name               = var.db_name
  username              = var.db_username
  password              = random_password.db_master.result
  db_subnet_group_name  = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  multi_az            = false # dev-tier default; flip for a real prod deploy
  publicly_accessible = false
  skip_final_snapshot = var.environment != "prod"
  deletion_protection = var.environment == "prod"

  backup_retention_period = var.environment == "prod" ? 7 : 1

  tags = { Name = "${var.project_name}-${var.environment}-db" }
}

# Master password stored in Secrets Manager rather than left in plain
# Terraform state/output — ai_result_service.py and the rest of the
# backend already read DATABASE_URL from an env var (core/config.py), not
# from Terraform, so this is the deploy-time handoff point, not a runtime
# dependency of the app itself.
resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "${var.project_name}/${var.environment}/database-url"
  description = "Full DATABASE_URL for the backend, matching backend/.env.example's asyncpg DSN format."
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = "postgresql+asyncpg://${var.db_username}:${random_password.db_master.result}@${aws_db_instance.main.address}:5432/${var.db_name}"
}
