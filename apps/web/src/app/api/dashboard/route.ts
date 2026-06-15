import { handler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { cached } from "@/lib/redis";

// GET /api/dashboard — aggregated KPIs + chart series for the org. Cached 60s.
export const GET = handler("dashboard:read", async (_req, ctx) => {
  return cached(`dash:${ctx.orgId}`, 60, async () => {
    const [eventCount, leadCount, gradeAgg, heatAgg, roiAgg, expenseAgg, roiTable] =
      await Promise.all([
        prisma.event.count({ where: { orgId: ctx.orgId } }),
        prisma.lead.count({ where: { orgId: ctx.orgId } }),
        prisma.lead.groupBy({ by: ["grade"], where: { orgId: ctx.orgId }, _count: true }),
        prisma.lead.groupBy({ by: ["heat"], where: { orgId: ctx.orgId }, _count: true }),
        prisma.roiMetric.aggregate({
          where: { event: { orgId: ctx.orgId } },
          _sum: { revenue: true, totalCost: true },
          _avg: { roi: true, costPerLead: true },
          _max: { roi: true },
        }),
        prisma.expense.aggregate({
          where: { event: { orgId: ctx.orgId } },
          _sum: { amount: true },
        }),
        prisma.roiMetric.findMany({
          where: { event: { orgId: ctx.orgId } },
          include: { event: { select: { name: true, city: true } } },
          orderBy: { revenue: "desc" },
          take: 8,
        }),
      ]);

    const revenue = Number(roiAgg._sum.revenue ?? 0);
    const spend = Number(expenseAgg._sum.amount ?? roiAgg._sum.totalCost ?? 0);

    return {
      kpis: {
        totalEvents: eventCount,
        totalLeads: leadCount,
        revenue,
        totalSpend: spend,
        costPerLead: leadCount > 0 ? Math.round(spend / leadCount) : 0,
        roiPercent: spend > 0 ? Math.round(((revenue - spend) / spend) * 100) : 0,
        bestRoi: Number(roiAgg._max.roi ?? 0),
      },
      gradeFunnel: gradeAgg.map((g) => ({ grade: g.grade, count: g._count })),
      heatBreakdown: heatAgg.map((h) => ({ heat: h.heat, count: h._count })),
      eventPerformance: roiTable.map((r) => ({
        name: r.event.name,
        city: r.event.city,
        revenue: Number(r.revenue),
        cost: Number(r.totalCost),
        roi: r.roi,
      })),
    };
  });
});
