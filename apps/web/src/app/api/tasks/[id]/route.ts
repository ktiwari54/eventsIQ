import { handler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { taskUpdateSchema } from "@/server/validation";

async function findOrgTask(id: string, orgId: string) {
  return prisma.task.findFirst({ where: { id, event: { orgId } }, select: { id: true } });
}

// PUT /api/tasks/:id — update a task (status, assignee, due date).
export const PUT = handler("task:update", async (req, ctx, params) => {
  if (!(await findOrgTask(params.id, ctx.orgId)))
    throw Object.assign(new Error("Not found"), { status: 404 });
  const body = taskUpdateSchema.parse(await req.json());
  return prisma.task.update({ where: { id: params.id }, data: body });
});

// DELETE /api/tasks/:id
export const DELETE = handler("task:delete", async (_req, ctx, params) => {
  if (!(await findOrgTask(params.id, ctx.orgId)))
    throw Object.assign(new Error("Not found"), { status: 404 });
  await prisma.task.delete({ where: { id: params.id } });
  return { deleted: true };
});
