import { prisma } from "@/lib/prisma";
import { computeRoi } from "./roi";

/**
 * Recompute and persist ROI metrics for a single event from its leads,
 * expenses and revenue. Called from the worker and the ROI API on demand.
 */
export async function recomputeRoiForEvent(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      expenses: { select: { amount: true } },
      _count: { select: { leads: true } },
    },
  });
  if (!event) return null;

  const [qualified, converted] = await Promise.all([
    prisma.lead.count({ where: { eventId, grade: { in: ["A_PLUS", "A", "B"] } } }),
    prisma.lead.count({ where: { eventId, converted: true } }),
  ]);

  const totalCost = event.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const revenue = Number(event.expectedRevenue);

  const result = computeRoi({
    totalCost: totalCost || Number(event.budgetTotal),
    revenue,
    totalLeads: event._count.leads,
    qualifiedLeads: qualified,
    convertedLeads: converted,
  });

  return prisma.roiMetric.upsert({
    where: { eventId },
    create: {
      eventId,
      totalCost: totalCost || Number(event.budgetTotal),
      revenue,
      roi: result.roi,
      costPerLead: result.costPerLead,
      costPerQL: result.costPerQL,
      revenuePerLead: result.revenuePerLead,
      conversionRate: result.conversionRate,
    },
    update: {
      totalCost: totalCost || Number(event.budgetTotal),
      revenue,
      roi: result.roi,
      costPerLead: result.costPerLead,
      costPerQL: result.costPerQL,
      revenuePerLead: result.revenuePerLead,
      conversionRate: result.conversionRate,
      computedAt: new Date(),
    },
  });
}
