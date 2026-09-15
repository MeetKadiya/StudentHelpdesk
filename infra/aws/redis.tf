/**
 * ElastiCache Redis — not in architecture.md §7's table explicitly (that
 * table only lists compute/DB/storage/auth/CDN/monitoring/LB), but Redis
 * is load-bearing infra (Celery broker, per docker-compose.yml's `redis`
 * service) and has no free-tier-vs-AWS distinction worth a mapping row —
 * it's Redis either way. Included here for completeness of the actual
 * deployable stack, not because §7 named it.
 */

resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project_name}-redis-subnet-group"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_cluster" "main" {
  cluster_id           = "${var.project_name}-${var.environment}"
  engine               = "redis"
  engine_version       = "7.1"
  node_type            = "cache.t4g.micro" # smallest ElastiCache node — dev-tier default
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]

  tags = { Name = "${var.project_name}-${var.environment}-redis" }
}
