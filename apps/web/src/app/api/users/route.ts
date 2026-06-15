import { handler } from "@/lib/api";
import { prisma } from "@/lib/prisma";

// GET /api/users — list users in the caller's org (for assignment dropdowns).
export const GET = handler("event:read", async (_req, ctx) => {
  return {
    items: await prisma.user.findMany({
      where: { orgId: ctx.orgId },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    }),
  };
});
