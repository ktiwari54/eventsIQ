import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const profileSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
});

export async function PATCH(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 422 });
  }

  const { name, email } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  // Check email not taken by another user
  const conflict = await prisma.user.findFirst({
    where: { email: normalizedEmail, NOT: { id: token.uid as string } },
  });
  if (conflict) {
    return NextResponse.json({ error: "Email is already in use by another account." }, { status: 409 });
  }

  const updated = await prisma.user.update({
    where: { id: token.uid as string },
    data: { name, email: normalizedEmail },
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json(updated);
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: token.uid as string },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(user);
}
