import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

const inviteSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  role: z.enum(["SUPER_ADMIN", "MANAGER", "SALES_EXECUTIVE"]).default("SALES_EXECUTIVE"),
  password: z.string().min(8).max(128),
});

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await prisma.user.findMany({
    where: { orgId: token.orgId as string },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (token.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Check user limit for current plan
  const sub = await prisma.subscription.findUnique({
    where: { orgId: token.orgId as string },
    include: { plan: { select: { maxUsers: true } } },
  });
  const currentCount = await prisma.user.count({ where: { orgId: token.orgId as string } });
  if (sub && currentCount >= sub.plan.maxUsers) {
    return NextResponse.json(
      { error: `User limit reached (${sub.plan.maxUsers}). Upgrade your plan to add more users.` },
      { status: 403 }
    );
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 422 });

  const { name, email, role, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });

  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      orgId: token.orgId as string,
      name,
      email: normalizedEmail,
      role,
      status: "ACTIVE",
      password: hash,
    },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
  });

  return NextResponse.json(user, { status: 201 });
}
