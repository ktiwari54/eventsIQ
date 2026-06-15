import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { renderMetrics } from "@/lib/metrics";

// GET /api/metrics — Prometheus scrape endpoint. If METRICS_TOKEN is set, the
// scraper must present it via Authorization: Bearer <token>.
export async function GET(req: NextRequest) {
  const token = process.env.METRICS_TOKEN;
  if (token) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${token}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  return new NextResponse(renderMetrics(), {
    headers: { "Content-Type": "text/plain; version=0.0.4" },
  });
}
