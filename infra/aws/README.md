# AWS Infrastructure (DEVOPS-05)

Placeholder Terraform IaC, mapped exactly to `architecture.md` §7's
free-tier -> AWS mapping table. **Not deployed.** No AWS account exists
for this project as of this writing — this is a skeleton to deploy from
later, not a running stack.

## What's here

| File | Maps to |
|---|---|
| `vpc.tf` | Network topology — public subnets (ALB) / private subnets (ECS tasks, RDS, Redis) |
| `security_groups.tf` | Mirrors `docker-compose.yml`'s `helpdesk-net` bridge-network isolation |
| `ecs.tf` | Compute — architecture.md §7: "Docker Compose (Render/Railway) → EC2 / ECS" |
| `rds.tf` | Managed Postgres — §7: "Supabase / local Postgres → RDS" |
| `redis.tf` | ElastiCache (Celery broker) — not in §7's table explicitly, but load-bearing infra, included for completeness |
| `s3.tf` | Object storage — §7: "MinIO → S3" |
| `ecr.tf` | Image registry for the four images `docker/*.Dockerfile` (DEVOPS-02) build |
| `alb.tf` | Load balancing — §7: "NGINX → Elastic Load Balancer". Routing rules (`/api/*` → backend, else → frontend) mirror `docker/nginx/nginx.conf` exactly |
| `cloudwatch.tf` | Monitoring — §7: "Prometheus/Grafana/Loki → CloudWatch". Doesn't replace `docker/monitoring/` (DEVOPS-06) — both mappings coexist per §7's table, same as MinIO/S3 |
| `iam.tf` | Task execution role (pull images, write logs, read the DB secret) + task role (S3 access, scoped to the one attachments bucket) |

Auth (§7: "Backend JWT → Cognito (optional)") and CDN/Edge (§7:
"Cloudflare → CloudFront") are **not** provisioned here — both are marked
optional/deferred in §7, and CloudFront specifically needs a real domain
name this project doesn't have yet. Add `cloudfront.tf` and (if the
Cognito path is ever chosen over the backend's own JWT) `cognito.tf` when
those become real decisions, not guessed at here.

celery-worker and email-worker don't get their own ECR repo or
Dockerfile reference — they reuse the `fastapi-backend` image with a
command override, exactly matching `docker-compose.yml`'s own pattern
(see `variables.tf`'s `backend_worker_commands`).

## What's deliberately NOT done

- **No remote state backend configured** (`versions.tf`). Local state by
  default — add an `s3`/`dynamodb` backend block when this actually gets
  deployed, not guessed at with a bucket name nobody's created.
- **No HTTPS listener / ACM certificate** (`alb.tf`) — needs a real domain
  name that doesn't exist yet.
- **No NAT gateway** (`vpc.tf`) — has an hourly cost even idle, which
  doesn't fit a placeholder-skeleton budget. Private-subnet tasks
  currently have no outbound internet route; add one before relying on
  any task pulling from the public internet (e.g. a model hub).
- **No CI/CD wiring** — `.github/workflows/ci.yml` (DEVOPS-04) doesn't
  push to these ECR repos or run `terraform apply`. That's a real,
  separate decision (which branch triggers a deploy, whether `apply` runs
  automatically or requires approval) — not made silently here.

## Verification performed

**Structural only** — no AWS credentials or Terraform binary were
available in this environment to run `terraform plan`/`apply` against a
real account (same class of limitation as every DEVOPS-* docker-compose
change in `task_board.md`: "no Docker daemon available", flagged rather
than hidden, applies here too). What *was* verified:

- Every `.tf` file parses as valid HCL — checked with `python-hcl2`
  against the exact files in this directory (not simplified stand-ins),
  confirming no syntax errors, unclosed blocks, or malformed
  interpolations.
- Every cross-file resource reference (e.g. `aws_subnet.private[*].id`,
  `aws_ecr_repository.images[each.value.image_repo_key]`) was checked by
  hand against the resource/data source it points to, confirming names
  and attribute paths are consistent across files.
- Variable defaults in `variables.tf` were cross-checked against
  `backend/.env.example`, `docker-compose.yml`, and `architecture.md` §7
  for consistency (e.g. `db_name = "helpdesk"` matches the existing
  `DATABASE_URL`, `container_port_map` matches each Dockerfile's actual
  port).

**Not verified:** whether this would actually `terraform apply`
successfully against a real AWS account (provider-level validation,
IAM permission correctness, actual quota/limits) — that requires a real
account and the `terraform` binary, neither available here. Review before
ever running `apply` against a real account, same as any Terraform
skeleton nobody has deployed yet.

## Usage (once ready to actually use this)

```bash
cd infra/aws
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars, add a remote backend block to versions.tf
terraform init
terraform plan   # review carefully before apply — this is untested against a real account
terraform apply
```
