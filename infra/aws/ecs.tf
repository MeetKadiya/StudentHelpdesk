/**
 * ECS Fargate cluster + task definitions/services — production mapping
 * for docker-compose.yml's compute services (architecture.md §7's
 * "Compute" row: Docker Compose/Render/Railway -> EC2/ECS). Fargate
 * specifically (not EC2-backed ECS) so there's no host fleet to patch —
 * appropriate for a dev-tier skeleton with no ops team.
 *
 * Six task definitions: the four from var.ecs_services, plus
 * celery-worker/email-worker (backend image + command override, exactly
 * matching docker-compose.yml's own pattern — see variables.tf's
 * backend_worker_commands). Only nextjs-frontend and fastapi-backend get
 * an ECS service wired to the ALB; ai-worker/faiss-service/celery-worker/
 * email-worker are internal-only (no target group), matching
 * app/api/internal.py's and agents/service/main.py's non-nginx-routed
 * design and docker-compose.yml's lack of published ports for them.
 */

resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

locals {
  # Merge the four ECR-backed services with the two backend-image workers
  # into one map so task defs/services can be built with a single
  # for_each instead of duplicating six near-identical resource blocks.
  ecs_task_configs = merge(
    {
      for name in var.ecs_services : name => {
        image_repo_key = name
        command        = null
        container_port = var.container_port_map[name]
        has_alb        = contains(["nextjs-frontend", "fastapi-backend"], name)
      }
    },
    {
      for name, cmd in var.backend_worker_commands : name => {
        image_repo_key = "fastapi-backend"
        command        = cmd
        container_port = null
        has_alb        = false
      }
    }
  )
}

resource "aws_ecs_task_definition" "services" {
  for_each = local.ecs_task_configs

  family                   = "${var.project_name}-${each.key}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = tostring(var.task_cpu[each.key])
  memory                   = tostring(var.task_memory[each.key])
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = each.key
      image     = "${aws_ecr_repository.images[each.value.image_repo_key].repository_url}:latest"
      essential = true
      command   = each.value.command
      portMappings = each.value.container_port == null ? [] : [
        {
          containerPort = each.value.container_port
          protocol      = "tcp"
        }
      ]
      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = aws_secretsmanager_secret.db_credentials.arn
        }
      ]
      environment = [
        {
          name  = "REDIS_URL"
          value = "redis://${aws_elasticache_cluster.main.cache_nodes[0].address}:6379/0"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.services[each.key].name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = each.key
        }
      }
    }
  ])

  tags = { Name = "${var.project_name}-${each.key}-taskdef" }
}

resource "aws_ecs_service" "services" {
  for_each = local.ecs_task_configs

  name            = "${var.project_name}-${each.key}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.services[each.key].arn
  desired_count   = 1 # dev-tier default — not a capacity-planned value
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  dynamic "load_balancer" {
    for_each = each.value.has_alb ? [each.key] : []
    content {
      target_group_arn = each.key == "nextjs-frontend" ? aws_lb_target_group.frontend.arn : aws_lb_target_group.backend.arn
      container_name    = each.key
      container_port    = each.value.container_port
    }
  }

  depends_on = [aws_lb_listener.http]
}
