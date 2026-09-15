/**
 * CloudWatch log groups — production mapping for Prometheus/Grafana/Loki
 * (architecture.md §7's monitoring row). One log group per ECS service,
 * matching promtail-config.yml's per-service relabeling
 * (docker/monitoring/promtail-config.yml, DEVOPS-06) so a query in either
 * system reads the same service name.
 *
 * NOTE: this does not replace Prometheus/Grafana/Loki (docker/monitoring/,
 * DEVOPS-06) — those remain the dev-tier implementation per §7's table.
 * This is the "production AWS mapping" column materialized, provisioned
 * ahead of any actual deploy so both paths exist side by side, same
 * pattern as MinIO/S3 in s3.tf.
 */

resource "aws_cloudwatch_log_group" "services" {
  for_each          = toset(concat(local.ecr_repo_names, ["celery-worker", "email-worker"]))
  name              = "/ecs/${var.project_name}-${var.environment}/${each.value}"
  retention_in_days = var.environment == "prod" ? 30 : 7

  tags = { Name = "${var.project_name}-${each.value}-logs" }
}
