# EventIQ — minimal AWS infrastructure (ECS Fargate + RDS Postgres + ElastiCache
# Redis). Illustrative baseline; tune sizing, networking and secrets per env.

terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" {
  region = var.region
}

variable "region" {
  default = "ap-south-1"
}
variable "project" {
  default = "eventiq"
}
variable "db_password" {
  sensitive = true
}

# --- Networking (uses default VPC for brevity; use a dedicated VPC in prod) ---
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# --- RDS PostgreSQL ---
resource "aws_db_instance" "postgres" {
  identifier              = "${var.project}-db"
  engine                  = "postgres"
  engine_version          = "16"
  instance_class          = "db.t3.medium"
  allocated_storage       = 50
  max_allocated_storage   = 500
  storage_encrypted       = true # encryption at rest
  db_name                 = "eventiq"
  username                = "eventiq"
  password                = var.db_password
  multi_az                = true
  backup_retention_period = 7
  skip_final_snapshot     = false
  final_snapshot_identifier = "${var.project}-final"
}

# --- ElastiCache Redis ---
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "${var.project}-redis"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
}

# --- ECS Cluster for the API/worker containers ---
resource "aws_ecs_cluster" "main" {
  name = "${var.project}-cluster"
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecr_repository" "web" {
  name                 = "${var.project}-web"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration {
    scan_on_push = true
  }
}

output "db_endpoint" {
  value = aws_db_instance.postgres.endpoint
}
output "redis_endpoint" {
  value = aws_elasticache_cluster.redis.cache_nodes[0].address
}
