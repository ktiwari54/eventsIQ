import { handler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { userInviteSchema } from "@/server/validation";
import bcrypt from "bcryptjs";

// GET /api/users — list users in the caller's org (for assignment dropdowns
// and the admin console).
export const GET = handler("event:read", async (_req, ctx) => {
  return {
    items: await prisma.user.findMany({
      where: { orgId: ctx.orgId },
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  };
});

// POST /api/users — invite/create a user in the org (admin only). If a password
// is supplied the user is ACTIVE; otherwise they're INVITED (SSO/first login).
export const POST = handler(
  "user:manage",
  async (req, ctx) => {
    const body = userInviteSchema.parse(await req.json());
    const email = body.email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) throw Object.assign(new Error("A user with that email already exists"), { status: 422 });

    return prisma.user.create({
      data: {
        orgId: ctx.orgId,
        name: body.name,
        email,
        role: body.role,
        status: body.password ? "ACTIVE" : "INVITED",
        password: body.password ? await bcrypt.hash(body.password, 10) : null,
      },
      select: { id: true, name: true, email: true, role: true, status: true },
    });
  },
  { auditAction: "user.invite" },
);
