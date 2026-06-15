import { handler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// GET /api/notifications — current user's notifications (own + org broadcasts).
export const GET = handler("dashboard:read", async (req, ctx) => {
  const unreadOnly = new URL(req.url).searchParams.get("unread") === "1";
  const where = {
    orgId: ctx.orgId,
    OR: [{ userId: ctx.userId }, { userId: null }],
    ...(unreadOnly ? { read: false } : {}),
  };
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.notification.count({
      where: { orgId: ctx.orgId, OR: [{ userId: ctx.userId }, { userId: null }], read: false },
    }),
  ]);
  return { items, unread };
});

const markSchema = z.object({ id: z.string().cuid().optional(), all: z.boolean().optional() });

// PATCH /api/notifications — mark one (id) or all (all:true) as read.
export const PATCH = handler("dashboard:read", async (req, ctx) => {
  const { id, all } = markSchema.parse(await req.json());
  if (all) {
    await prisma.notification.updateMany({
      where: { orgId: ctx.orgId, OR: [{ userId: ctx.userId }, { userId: null }], read: false },
      data: { read: true },
    });
    return { ok: true };
  }
  if (id) {
    await prisma.notification.updateMany({
      where: { id, orgId: ctx.orgId, OR: [{ userId: ctx.userId }, { userId: null }] },
      data: { read: true },
    });
  }
  return { ok: true };
});
