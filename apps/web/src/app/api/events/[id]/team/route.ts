import { handler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { teamMemberSchema } from "@/server/validation";

async function assertEvent(id: string, orgId: string) {
  const e = await prisma.event.findFirst({ where: { id, orgId }, select: { id: true } });
  if (!e) throw Object.assign(new Error("Not found"), { status: 404 });
}

// GET /api/events/:id/team
export const GET = handler("event:read", async (_req, ctx, params) => {
  await assertEvent(params.id, ctx.orgId);
  return {
    items: await prisma.eventTeamMember.findMany({
      where: { eventId: params.id },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    }),
  };
});

// POST /api/events/:id/team — assign a user (must belong to the same org).
export const POST = handler("event:update", async (req, ctx, params) => {
  await assertEvent(params.id, ctx.orgId);
  const body = teamMemberSchema.parse(await req.json());
  const member = await prisma.user.findFirst({
    where: { id: body.userId, orgId: ctx.orgId },
    select: { id: true },
  });
  if (!member) throw Object.assign(new Error("User not in org"), { status: 422 });
  return prisma.eventTeamMember.upsert({
    where: { eventId_userId: { eventId: params.id, userId: body.userId } },
    create: { eventId: params.id, userId: body.userId, roleTag: body.roleTag },
    update: { roleTag: body.roleTag },
  });
});

// DELETE /api/events/:id/team?userId=
export const DELETE = handler("event:update", async (req, ctx, params) => {
  await assertEvent(params.id, ctx.orgId);
  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) throw Object.assign(new Error("userId required"), { status: 422 });
  await prisma.eventTeamMember.deleteMany({ where: { eventId: params.id, userId } });
  return { removed: true };
});
