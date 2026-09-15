# Deployment

Two paths exist: a local/dev stack via Docker Compose (fully built), and
a production AWS path (Terraform skeleton, not yet deployed). Read the
**Verification status** section before assuming either has actually been
run — this page states plainly what has and hasn't been tested.

## Local / dev: Docker Compose

Everything needed to run the full stack locally lives under `docker/`:

- `docker/docker-compose.yml` — wires all 13 services (nginx, frontend,
  backend, postgres, redis, ai-worker, faiss-service, celery-worker,
  email-worker, minio, prometheus, grafana, adminer).
- `docker/*.Dockerfile` — one each for frontend, backend, ai-worker,
  faiss-service. `celery-worker`/`email-worker` reuse the backend image
  with a different startup command (same code, different entrypoint) —
  they don't get their own Dockerfile.
- `docker/nginx/nginx.conf` — reverse proxy: `/` → frontend, `/api/*` →
  backend.
- `docker/monitoring/` — Prometheus scrape config, Loki + Promtail
  config, Grafana datasource provisioning.
- `docker/.env.example` — infra-level credentials (Postgres, MinIO,
  Grafana admin password). Copy to `docker/.env`.
- `backend/.env.example` — application-level config (DB URL, JWT secret,
  Redis URL, MinIO credentials). Copy to `backend/.env`.

### Bringing it up

```bash
cp docker/.env.example docker/.env
cp backend/.env.example backend/.env
# edit both — at minimum change JWT_SECRET_KEY away from the default

cd docker
docker compose up --build
```

This should start every service and run `alembic upgrade head`
automatically as part of the backend container's startup (see
`docker/backend.Dockerfile`).

### Ports (dev)

| Service | Port |
|---|---|
| App (via nginx) | 80 |
| MinIO console | 9001 |
| Prometheus | 9090 |
| Grafana | 3001 |
| Adminer | 8081 |

## Production: AWS (Terraform skeleton)

`infra/aws/` contains a Terraform skeleton mapped field-for-field to the
free-tier → AWS table in [Cloud Strategy](../cloud/). It provisions:
VPC + subnets, an Application Load Balancer, ECS Fargate (one task
definition per service, matching docker-compose's service list), RDS
Postgres, ElastiCache Redis, S3 (attachments), ECR repositories, IAM
roles, and CloudWatch log groups.

**This has never been deployed.** No AWS account exists for this project
yet. See `infra/aws/README.md` for the full file-by-file breakdown and,
importantly, exactly what's deliberately *not* provisioned (HTTPS/ACM —
needs a real domain; a NAT gateway — ongoing cost with nothing deployed
yet; remote Terraform state — nothing to point it at; CI/CD wiring to
push images or run `apply`).

To actually use it:

```bash
cd infra/aws
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars, add a remote state backend to versions.tf
terraform init
terraform plan   # review carefully — untested against a real account
terraform apply
```

## CI

`.github/workflows/ci.yml` runs three independent jobs on push: backend
(lint + test), agents (lint + test), frontend (lint + typecheck — no test
script exists yet). No Postgres/Redis service containers are spun up in
CI — the current test suites don't need them (SQLite/mocked-broker based).
There's no `docker compose build`/`up` CI job, since there's been no
Docker daemon available during development to confirm one would pass.

## Verification status — read this before assuming anything works

Nothing above has been run against real infrastructure during
development, because none was available: no Docker daemon, no AWS
account, no live Redis/Postgres/LLM API key. Every artifact has instead
been **structurally verified**:

- `docker-compose.yml` — parsed with PyYAML; every `depends_on` and named
  volume reference resolves; service count matches the architecture doc.
- Dockerfiles — reviewed line-by-line against each service's actual
  dependencies and entrypoint.
- `infra/aws/*.tf` — parsed with a real HCL parser (zero syntax errors);
  every resource/variable/data-source reference cross-checked against
  what's actually declared (zero unresolved, across 39 resources).
- The backend itself, and the AI pipeline, **have** been run for real —
  against SQLite standing in for Postgres and a mocked Celery broker
  standing in for Redis+a live worker. See [Developer Guide](../developer-guide/)
  for what that verification actually covered.

The first real deployment (Docker or AWS) should treat this as
genuinely untested integration surface, not a formality — start with the
backend + Postgres + Redis alone and confirm `alembic upgrade head` and a
live signup→login→ticket round trip before bringing up the full stack.
