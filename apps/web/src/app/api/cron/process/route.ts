import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { cronMatches } from "@/server/cron";
import { runReport } from "@/server/report-run";

// GET /api/cron/process — Vercel Cron entry point (serverless staging has no
// always-on worker). Fires any enabled report schedule whose cron is due this
// minute. Protected by CRON_SECRET (Vercel sends it as a Bearer token).
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    const qs = new URL(req.url).searchParams.get("secret");
    if (auth !== `Bearer ${secret}` && qs !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const schedules = await prisma.reportSchedule.findMany({ where: { enabled: true } });
  // Due this minute, and not already fired in the last ~minute (idempotency
  // against overlapping cron invocations).
  const due = schedules.filter(
    (s) =>
      cronMatches(s.cron, now) &&
      (!s.lastRunAt || now.getTime() - s.lastRunAt.getTime() > 55_000),
  );

  const results = await Promise.allSettled(
    due.map((s) => runReport({ orgId: s.orgId, type: s.type, format: s.format, scheduleId: s.id })),
  );

  return NextResponse.json({
    checked: schedules.length,
    fired: due.length,
    ok: results.filter((r) => r.status === "fulfilled").length,
    at: now.toISOString(),
  });
}
