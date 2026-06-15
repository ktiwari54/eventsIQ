import { handler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { recomputeRoiForEvent } from "@/server/roi-service";
import { forecastRevenue } from "@/server/roi";

// GET /api/roi — ranked ROI table across the org plus a revenue forecast.
export const GET = handler("roi:read", async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const recompute = searchParams.get("recompute") === "1";

  if (recompute) {
    const events = await prisma.event.findMany({
      where: { orgId: ctx.orgId },
      select: { id: true },
    });
    await Promise.all(events.map((e) => recomputeRoiForEvent(e.id)));
  }

  const metrics = await prisma.roiMetric.findMany({
    where: { event: { orgId: ctx.orgId } },
    include: { event: { select: { name: true, city: true, status: true } } },
    orderBy: { roi: "desc" },
  });

  // Assign ranks.
  const ranked = metrics.map((m, i) => ({ ...m, rank: i + 1 }));
  const forecast = forecastRevenue(metrics.map((m) => Number(m.revenue)).reverse());

  return { items: ranked, forecast };
});
