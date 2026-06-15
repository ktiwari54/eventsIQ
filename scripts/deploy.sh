#!/usr/bin/env bash
# EventIQ deployment helper: build image, push to ECR, run migrations, deploy ECS.
set -euo pipefail

PROJECT="eventiq"
REGION="${AWS_REGION:-ap-south-1}"
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ECR="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${PROJECT}-web"
TAG="$(git rev-parse --short HEAD)"

echo "▶ Logging into ECR..."
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ECR"

echo "▶ Building web image ($TAG)..."
docker build -f infrastructure/docker/Dockerfile.web -t "${ECR}:${TAG}" -t "${ECR}:latest" .

echo "▶ Pushing image..."
docker push "${ECR}:${TAG}"
docker push "${ECR}:latest"

echo "▶ Running database migrations..."
npm run db:deploy

echo "▶ Forcing ECS service redeploy..."
aws ecs update-service --cluster "${PROJECT}-cluster" --service "${PROJECT}-web" --force-new-deployment --region "$REGION"

echo "✅ Deploy complete: ${ECR}:${TAG}"
