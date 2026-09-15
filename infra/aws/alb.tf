/**
 * Application Load Balancer — production mapping for NGINX (architecture.md
 * §7's load-balancing row, and docker/nginx/nginx.conf's routing rules:
 * `/api/` -> backend, `/` -> frontend). Two target groups + two listener
 * rules replicate that same split at the AWS layer.
 */

resource "aws_lb" "main" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  tags = { Name = "${var.project_name}-alb" }
}

resource "aws_lb_target_group" "frontend" {
  name        = "${var.project_name}-frontend-tg"
  port        = var.container_port_map["nextjs-frontend"]
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip" # Fargate tasks register by IP, not instance ID

  health_check {
    path                = "/"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
  }
}

resource "aws_lb_target_group" "backend" {
  name        = "${var.project_name}-backend-tg"
  port        = var.container_port_map["fastapi-backend"]
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/api/v1/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
  }
}

# HTTP listener — default action serves the frontend, matching
# nginx.conf's `location /` fallthrough. HTTPS/ACM cert intentionally
# NOT provisioned here: that requires a real domain name, which this
# placeholder skeleton doesn't have — add an aws_acm_certificate +
# HTTPS listener (with an HTTP->HTTPS redirect default action replacing
# this one) once a domain exists.
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

# Matches nginx.conf's `location /api/` block exactly.
resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}
