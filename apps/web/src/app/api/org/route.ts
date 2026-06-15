import { handler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { orgUpdateSchema } from "@/server/validation";

// GET /api/org — current organization profile + member count.
export const GET = handler("org:read", async (_req, ctx) => {
  const org = await prisma.organization.findUnique({
    where: { id: ctx.orgId },
    select: { id: true, name: true, slug: true, createdAt: true, _count: { select: { users: true, events: true } } },
  });
  if (!org) throw Object.assign(new Error("Not found"), { status: 404 });
  return org;
});

// PUT /api/org — rename the organization (admin only).
export const PUT = handler(
  "user:manage",
  async (req, ctx) => {
    const { name } = orgUpdateSchema.parse(await req.json());
    return prisma.organization.update({
      where: { id: ctx.orgId },
      data: { name },
      select: { id: true, name: true },
    });
  },
  { auditAction: "org.update" },
);
