import { handler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { userUpdateSchema } from "@/server/validation";

async function findOrgUser(id: string, orgId: string) {
  return prisma.user.findFirst({ where: { id, orgId }, select: { id: true } });
}

// PUT /api/users/:id — change a user's role/status/name (admin only).
export const PUT = handler(
  "user:manage",
  async (req, ctx, params) => {
    if (!(await findOrgUser(params.id, ctx.orgId)))
      throw Object.assign(new Error("Not found"), { status: 404 });
    const body = userUpdateSchema.parse(await req.json());
    return prisma.user.update({
      where: { id: params.id },
      data: body,
      select: { id: true, name: true, email: true, role: true, status: true },
    });
  },
  { auditAction: "user.update" },
);

// DELETE /api/users/:id — remove a user. Guards against deleting yourself.
export const DELETE = handler(
  "user:manage",
  async (_req, ctx, params) => {
    if (params.id === ctx.userId)
      throw Object.assign(new Error("You cannot remove your own account"), { status: 422 });
    if (!(await findOrgUser(params.id, ctx.orgId)))
      throw Object.assign(new Error("Not found"), { status: 404 });
    await prisma.user.delete({ where: { id: params.id } });
    return { deleted: true };
  },
  { auditAction: "user.delete" },
);
