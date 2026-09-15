# Cloud Strategy

The assignment calls for an AWS architecture narrative. Development used
free-tier-equivalent tools instead of a live AWS account (none was
provisioned), with every component explicitly mapped to its AWS
production equivalent — mirrored 1:1 as an actual Terraform skeleton
under `infra/aws/`, not just a narrative table.

## The mapping

| Component | Dev implementation (what actually runs) | Production AWS mapping | Terraform file |
|---|---|---|---|
| Compute | Docker Compose | EC2 / ECS (Fargate) | `infra/aws/ecs.tf` |
| Managed Postgres | Local Postgres container | RDS | `infra/aws/rds.tf` |
| Object storage | MinIO | S3 | `infra/aws/s3.tf` |
| Auth | Backend JWT | Cognito *(optional — not provisioned)* | — |
| CDN / Edge | Cloudflare | CloudFront *(not provisioned — needs a domain)* | — |
| Monitoring | Prometheus + Grafana + Loki | CloudWatch | `infra/aws/cloudwatch.tf` |
| Load balancing | NGINX | Elastic Load Balancer | `infra/aws/alb.tf` |
| Image registry | Local Docker images | ECR | `infra/aws/ecr.tf` |
| Cache / broker | Redis (container) | ElastiCache | `infra/aws/redis.tf` |

## Why Cognito and CloudFront aren't provisioned

Both are marked optional/deferred in the architecture spec itself, and
CloudFront specifically needs a real domain name, which this project
doesn't have. The backend's own JWT auth is a complete, working
substitute for Cognito for this project's scope — Cognito would be worth
revisiting only if there's a concrete reason to offload session
management (e.g. social login, MFA) that JWT doesn't already cover.

## What the Terraform skeleton actually provisions

- A VPC with public subnets (ALB) and private subnets (ECS tasks, RDS,
  Redis) across 2 availability zones.
- Security groups mirroring the same network isolation Docker Compose's
  bridge network already enforces — only the load balancer is reachable
  from the internet.
- One ECS Fargate task definition per service (frontend, backend,
  ai-worker, faiss-service, plus celery-worker/email-worker as command
  overrides on the backend image — matching Docker Compose's own
  pattern exactly, not a different AWS-specific approach).
- RDS Postgres, with the database URL stored in Secrets Manager (never in
  Terraform state as plaintext, never hardcoded).
- An S3 bucket for attachments, encrypted, versioned, with public access
  fully blocked.
- ECR repositories for the four images that actually get built (not the
  two backend-image-reusing workers).
- CloudWatch log groups, one per service, matching the naming Promtail
  already uses in the dev stack so a query reads the same way in either
  system.

## What's deliberately not there yet

- **HTTPS / ACM certificate** — needs a real domain name.
- **NAT gateway** — has an hourly cost even sitting idle, which doesn't
  fit a placeholder skeleton with nothing actually deployed.
- **Remote Terraform state backend** (S3 + DynamoDB) — nothing to point
  it at until an AWS account exists.
- **CI/CD wiring** — the GitHub Actions workflow doesn't push images to
  these ECR repos or run `terraform apply`. That's a real, separate
  decision (which branch deploys, manual approval vs. automatic) that
  shouldn't be made silently inside a docs task.

## Cost posture

Every default in `infra/aws/variables.tf` is a dev-tier choice, not a
capacity-planned production value: `db.t4g.micro` (RDS free-tier
eligible), `cache.t4g.micro` (smallest ElastiCache node), Fargate's
smallest CPU/memory tiers, `desired_count = 1` everywhere. None of this
has been priced against real traffic because there's no real traffic yet
— revisit sizing once actual usage exists to measure against.
