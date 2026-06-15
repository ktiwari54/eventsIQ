import { handler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { taskCreateSchema } from "@/server/validation";

async function assertEvent(id: string, orgId: string) {
  const e = await prisma.event.findFirst({ where: { id, orgId }, select: { id: true } });
  if (!e) throw Object.assign(new Error("Not found"), { status: 404 });
}

// GET /api/events/:id/tasks
export const GET = handler("event:read", async (_req, ctx, params) => {
  await assertEvent(params.id, ctx.orgId);
  return {
    items: await prisma.task.findMany({
      where: { eventId: params.id },
      include: { assignee: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  };
});

// POST /api/events/:id/tasks
export const POST = handler("task:create", async (req, ctx, params) => {
  await assertEvent(params.id, ctx.orgId);
  const body = taskCreateSchema.parse(await req.json());
  return prisma.task.create({ data: { eventId: params.id, ...body } });
});
