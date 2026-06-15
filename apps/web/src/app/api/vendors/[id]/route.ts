import { handler } from "@/lib/api";
import { prisma } from "@/lib/prisma";

// GET /api/vendors/:id — vendor detail with scorecard + event/spend history.
export const GET = handler("vendor:read", async (_req, ctx, params) => {
  const vendor = await prisma.vendor.findFirst({
    where: { id: params.id, orgId: ctx.orgId },
    include: {
      evaluations: { orderBy: { createdAt: "desc" } },
      expenses: {
        include: { event: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });
  if (!vendor) throw Object.assign(new Error("Not found"), { status: 404 });

  // Scorecard: average each dimension across evaluations (1-5 scale).
  const evals = vendor.evaluations;
  const avg = (sel: (e: (typeof evals)[number]) => number) =>
    evals.length ? evals.reduce((s, e) => s + sel(e), 0) / evals.length : 0;

  const scorecard = {
    quality: round1(avg((e) => e.quality)),
    timeline: round1(avg((e) => e.timeline)),
    cost: round1(avg((e) => e.cost)),
    overall: round1(avg((e) => (e.quality + e.timeline + e.cost) / 3)),
    evaluationCount: evals.length,
  };

  const totalSpend = vendor.expenses.reduce((s, e) => s + Number(e.amount), 0);
  const eventsServed = new Set(vendor.expenses.map((e) => e.eventId)).size;

  return { vendor, scorecard, history: { totalSpend, eventsServed } };
});

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
