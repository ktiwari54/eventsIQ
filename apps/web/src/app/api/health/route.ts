import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

// GET /api/health — liveness/readiness probe for Railway/ECS/Kubernetes.
// Each dependency check is bounded by a short timeout so the probe always
// responds quickly (and reports "down") instead of hanging when a backing
// service is unreachable.
export async function GET() {
  const [db, cache] = await Promise.all([
    withTimeout(prisma.$queryRaw`SELECT 1`, 2000),
    withTimeout(redis.ping(), 2000),
  ]);

  const checks = { db: db ? "ok" : "down", redis: cache ? "ok" : "down" };
  const healthy = checks.db === "ok" && checks.redis === "ok";
  return NextResponse.json(
    { status: healthy ? "healthy" : "degraded", checks, ts: new Date().toISOString() },
    { status: healthy ? 200 : 503 },
  );
}

/** Resolve true if `p` settles successfully within `ms`, else false. */
async function withTimeout(p: Promise<unknown>, ms: number): Promise<boolean> {
  try {
    await Promise.race([
      p,
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
    ]);
    return true;
  } catch {
    return false;
  }
}
