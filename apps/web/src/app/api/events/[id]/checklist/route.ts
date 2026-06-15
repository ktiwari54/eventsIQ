import { handler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { checklistItemSchema, checklistToggleSchema } from "@/server/validation";

async function assertEvent(id: string, orgId: string) {
  const e = await prisma.event.findFirst({ where: { id, orgId }, select: { id: true } });
  if (!e) throw Object.assign(new Error("Not found"), { status: 404 });
}

// GET /api/events/:id/checklist
export const GET = handler("event:read", async (_req, ctx, params) => {
  await assertEvent(params.id, ctx.orgId);
  return {
    items: await prisma.checklistItem.findMany({
      where: { eventId: params.id },
      orderBy: { order: "asc" },
    }),
  };
});

// POST /api/events/:id/checklist — add an item.
export const POST = handler("event:update", async (req, ctx, params) => {
  await assertEvent(params.id, ctx.orgId);
  const body = checklistItemSchema.parse(await req.json());
  const count = await prisma.checklistItem.count({ where: { eventId: params.id } });
  return prisma.checklistItem.create({
    data: { eventId: params.id, title: body.title, order: body.order ?? count },
  });
});

// PATCH /api/events/:id/checklist — toggle an item done/undone.
export const PATCH = handler("event:update", async (req, ctx, params) => {
  await assertEvent(params.id, ctx.orgId);
  const { id, done } = checklistToggleSchema.parse(await req.json());
  return prisma.checklistItem.update({ where: { id }, data: { done } });
});
