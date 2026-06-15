import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

// GET /api/health — liveness/readiness probe for Railway/ECS/Kubernetes.
export async function GET() {
  const checks: Record<string, string> = {};
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = "ok";
  } catch {
    checks.db = "down";
  }
  try {
    await redis.ping();
    checks.redis = "ok";
  } catch {
    checks.redis = "down";
  }
  const healthy = Object.values(checks).every((v) => v === "ok");
  return NextResponse.json(
    { status: healthy ? "healthy" : "degraded", checks, ts: new Date().toISOString() },
    { status: healthy ? 200 : 503 },
  );
}
