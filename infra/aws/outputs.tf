output "alb_dns_name" {
  description = "Public ALB DNS name — point CloudFront/a real domain at this once one exists."
  value       = aws_lb.main.dns_name
}

output "rds_endpoint" {
  description = "RDS Postgres endpoint (private — only reachable from within the VPC)."
  value       = aws_db_instance.main.address
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint (private)."
  value       = aws_elasticache_cluster.main.cache_nodes[0].address
}

output "s3_attachments_bucket" {
  description = "S3 bucket name for attachments/exports (MinIO's production mapping)."
  value       = aws_s3_bucket.attachments.bucket
}

output "ecr_repository_urls" {
  description = "Push targets for `docker build` / CI (DEVOPS-04's ci.yml would push here in a real deploy — not currently wired, see README)."
  value       = { for name, repo in aws_ecr_repository.images : name => repo.repository_url }
}

output "db_credentials_secret_arn" {
  description = "Secrets Manager ARN holding the full DATABASE_URL — fetch at deploy time, never hardcode."
  value       = aws_secretsmanager_secret.db_credentials.arn
  sensitive   = true
}
