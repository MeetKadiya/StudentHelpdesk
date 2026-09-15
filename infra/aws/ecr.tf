/**
 * ECR repositories — one per image actually built by DEVOPS-02's
 * Dockerfiles (docker/frontend.Dockerfile, backend.Dockerfile,
 * ai-worker.Dockerfile, faiss-service.Dockerfile). celery-worker/
 * email-worker reuse the backend image (see docker-compose.yml's command
 * overrides, and variables.tf's backend_worker_commands) so they don't
 * get their own repo — pushing a second copy of the same image under a
 * different name would just be duplicate storage for zero benefit.
 */

locals {
  ecr_repo_names = ["nextjs-frontend", "fastapi-backend", "ai-worker", "faiss-service"]
}

resource "aws_ecr_repository" "images" {
  for_each             = toset(local.ecr_repo_names)
  name                 = "${var.project_name}/${each.value}"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = { Name = "${var.project_name}-${each.value}-ecr" }
}

resource "aws_ecr_lifecycle_policy" "images" {
  for_each   = aws_ecr_repository.images
  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep the last 10 images, expire the rest"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 10
        }
        action = { type = "expire" }
      }
    ]
  })
}
