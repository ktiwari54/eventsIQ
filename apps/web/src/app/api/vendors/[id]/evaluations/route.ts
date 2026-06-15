import { handler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { vendorEvaluationSchema } from "@/server/validation";

// POST /api/vendors/:id/evaluations — add an evaluation and recompute the
// vendor's overall rating + SLA score from all evaluations.
export const POST = handler(
  "vendor:evaluate",
  async (req, ctx, params) => {
    const vendor = await prisma.vendor.findFirst({
      where: { id: params.id, orgId: ctx.orgId },
      select: { id: true },
    });
    if (!vendor) throw Object.assign(new Error("Not found"), { status: 404 });

    const body = vendorEvaluationSchema.parse(await req.json());

    const evaluation = await prisma.vendorEvaluation.create({
      data: { vendorId: params.id, ...body },
    });

    // Recompute rating (avg of the three dimensions) + SLA (timeline focus).
    const agg = await prisma.vendorEvaluation.aggregate({
      where: { vendorId: params.id },
      _avg: { quality: true, timeline: true, cost: true },
    });
    const rating =
      ((agg._avg.quality ?? 0) + (agg._avg.timeline ?? 0) + (agg._avg.cost ?? 0)) / 3;
    await prisma.vendor.update({
      where: { id: params.id },
      data: { rating: Math.round(rating * 10) / 10, slaScore: agg._avg.timeline ?? 0 },
    });

    return evaluation;
  },
  { auditAction: "vendor.evaluate" },
);
