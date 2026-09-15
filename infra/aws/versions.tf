terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote state intentionally left unconfigured (local backend by
  # default). DEVOPS-05 is a placeholder skeleton per task_board.md — no
  # AWS account has been provisioned for this project, so an S3/DynamoDB
  # backend would just be dead config nobody could point at yet. Whoever
  # actually deploys this should add a backend "s3" block here as a real,
  # deliberate step, not something silently pre-guessed.
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "student-helpdesk-ai"
      ManagedBy   = "terraform"
      Environment = var.environment
    }
  }
}
