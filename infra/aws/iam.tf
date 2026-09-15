/**
 * IAM — task execution role (pulls images, writes logs — standard ECS
 * plumbing) and a task role (what the running app itself can call, e.g.
 * S3/Secrets Manager). Split deliberately per AWS's own recommended
 * pattern, not merged into one over-broad role.
 */

data "aws_iam_policy_document" "ecs_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ecs_task_execution" {
  name               = "${var.project_name}-ecs-task-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume_role.json
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Execution role also needs to read the DB secret to inject DATABASE_URL
# into the container at launch (ECS "secrets" task-def field, not baked
# into the image) — narrower than a blanket SecretsManagerReadWrite.
data "aws_iam_policy_document" "read_db_secret" {
  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.db_credentials.arn]
  }
}

resource "aws_iam_role_policy" "ecs_task_execution_secrets" {
  name   = "${var.project_name}-read-db-secret"
  role   = aws_iam_role.ecs_task_execution.id
  policy = data.aws_iam_policy_document.read_db_secret.json
}

resource "aws_iam_role" "ecs_task" {
  name               = "${var.project_name}-ecs-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume_role.json
}

# Task role: S3 access scoped to the one attachments bucket only, matching
# app.services (once a Knowledge Base / attachments upload path exists —
# FR-8's admin document endpoints are still not built as of DEVOPS-05,
# per task_board.md's api_contract.md v0.11 note — this policy is
# provisioned ahead of that so it's ready, not because the app calls S3
# yet).
data "aws_iam_policy_document" "task_s3_access" {
  statement {
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:ListBucket",
    ]
    resources = [
      aws_s3_bucket.attachments.arn,
      "${aws_s3_bucket.attachments.arn}/*",
    ]
  }
}

resource "aws_iam_role_policy" "ecs_task_s3" {
  name   = "${var.project_name}-task-s3-access"
  role   = aws_iam_role.ecs_task.id
  policy = data.aws_iam_policy_document.task_s3_access.json
}
