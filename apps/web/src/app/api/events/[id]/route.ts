import { handler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { eventUpdateSchema } from "@/server/validation";

// GET /api/events/:id — full event detail scoped to the caller's org.
export const GET = handler("event:read", async (_req, ctx, params) => {
  const event = await prisma.event.findFirst({
    where: { id: params.id, orgId: ctx.orgId },
    include: {
      roiMetric: true,
      budgets: true,
      tasks: true,
      documents: true,
      checklist: { orderBy: { order: "asc" } },
      team: { include: { user: { select: { id: true, name: true, role: true } } } },
      _count: { select: { leads: true } },
    },
  });
  if (!event) throw Object.assign(new Error("Not found"), { status: 404 });
  return event;
});

// PUT /api/events/:id — update fields / advance the workflow status.
export const PUT = handler(
  "event:update",
  async (req, ctx, params) => {
    const body = eventUpdateSchema.parse(await req.json());
    const existing = await prisma.event.findFirst({
      where: { id: params.id, orgId: ctx.orgId },
      select: { id: true },
    });
    if (!existing) throw Object.assign(new Error("Not found"), { status: 404 });
    return prisma.event.update({ where: { id: params.id }, data: body });
  },
  { auditAction: "event.update" },
);

// DELETE /api/events/:id — archive/remove an event.
export const DELETE = handler(
  "event:delete",
  async (_req, ctx, params) => {
    const existing = await prisma.event.findFirst({
      where: { id: params.id, orgId: ctx.orgId },
      select: { id: true },
    });
    if (!existing) throw Object.assign(new Error("Not found"), { status: 404 });
    await prisma.event.delete({ where: { id: params.id } });
    return { deleted: true };
  },
  { auditAction: "event.delete" },
);
