import { handler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { budgetCreateSchema } from "@/server/validation";

// GET /api/budgets?eventId= — budget lines with variance for an event.
export const GET = handler("budget:read", async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId") ?? undefined;

  const budgets = await prisma.budget.findMany({
    where: { ...(eventId ? { eventId } : {}), event: { orgId: ctx.orgId } },
    include: { event: { select: { name: true } } },
    orderBy: { category: "asc" },
  });

  const withVariance = budgets.map((b) => ({
    ...b,
    variance: Number(b.approved) - Number(b.actual),
    overspent: Number(b.actual) > Number(b.approved),
  }));

  return { items: withVariance };
});

// POST /api/budgets — create a budget line (enters approval workflow as PENDING).
export const POST = handler(
  "budget:create",
  async (req, ctx) => {
    const body = budgetCreateSchema.parse(await req.json());
    const event = await prisma.event.findFirst({
      where: { id: body.eventId, orgId: ctx.orgId },
      select: { id: true },
    });
    if (!event) throw Object.assign(new Error("Event not found"), { status: 404 });
    return prisma.budget.create({ data: body });
  },
  { auditAction: "budget.create" },
);
