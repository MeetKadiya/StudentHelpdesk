variable "aws_region" {
  description = "AWS region for all resources."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Short project slug used to prefix resource names."
  type        = string
  default     = "helpdesk-ai"
}

variable "environment" {
  description = "Deployment environment name (dev/staging/prod)."
  type        = string
  default     = "dev"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.20.0.0/16"
}

variable "availability_zones" {
  description = "AZs to spread public/private subnets across. Two is the
  minimum for an RDS Multi-AZ-capable subnet group; kept at two here since
  this is a dev-tier skeleton, not a production sizing decision."
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "db_instance_class" {
  description = "RDS instance class. db.t4g.micro is the free-tier-eligible
  default — matches architecture.md §7's 'free/dev implementation' framing
  even for the AWS-mapping column, since nothing here is deployed yet."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_name" {
  description = "Postgres database name — matches backend/.env.example's
  DATABASE_URL database segment (helpdesk)."
  type        = string
  default     = "helpdesk"
}

variable "db_username" {
  description = "Postgres master username."
  type        = string
  default     = "helpdesk_admin"
}

variable "db_allocated_storage_gb" {
  description = "RDS allocated storage in GB."
  type        = number
  default     = 20
}

variable "ecs_services" {
  description = "ECS Fargate services to define task definitions for,
  mapped 1:1 to docker/*.Dockerfile (DEVOPS-02) and docker-compose.yml's
  service list (DEVOPS-01) — NOT independently invented here. celery-
  worker and email-worker are omitted from ECS task defs deliberately:
  compose runs them as the backend image with a different command
  (DEVOPS-01's docker-compose.yml comment), so in ECS they'd be a second
  task definition reusing the same backend image + a command override,
  which is exactly what backend_worker_commands below expresses instead
  of duplicating the whole service block."
  type        = list(string)
  default     = ["nextjs-frontend", "fastapi-backend", "ai-worker", "faiss-service"]
}

variable "backend_worker_commands" {
  description = "Command overrides for backend-image-based worker tasks,
  mirroring docker-compose.yml's celery-worker/email-worker command
  overrides exactly (same image, different entrypoint command)."
  type        = map(list(string))
  default = {
    celery-worker = ["celery", "-A", "app.workers.celery_app", "worker", "--loglevel=info"]
    email-worker  = ["celery", "-A", "app.workers.celery_app", "worker", "--loglevel=info", "--queues=email", "-n", "email-worker@%h"]
  }
}

variable "container_port_map" {
  description = "Container port per ECS service, matching each
  Dockerfile's EXPOSE / docker-compose.yml's implicit service port."
  type        = map(number)
  default = {
    nextjs-frontend = 3000
    fastapi-backend = 8000
    ai-worker       = 8000 # not internet-facing; no ALB target group for this one
    faiss-service   = 8000
  }
}

variable "task_cpu" {
  description = "Fargate task CPU units, per service. 256 (.25 vCPU) is the
  smallest Fargate size — a dev-tier default, not a capacity-planned value."
  type        = map(number)
  default = {
    nextjs-frontend = 256
    fastapi-backend = 512
    ai-worker       = 512
    faiss-service   = 512
    celery-worker   = 256
    email-worker    = 256
  }
}

variable "task_memory" {
  description = "Fargate task memory (MB), per service."
  type        = map(number)
  default = {
    nextjs-frontend = 512
    fastapi-backend = 1024
    ai-worker       = 1024
    faiss-service   = 1024
    celery-worker   = 512
    email-worker    = 512
  }
}
