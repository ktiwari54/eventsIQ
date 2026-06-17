import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (token.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  if (id === token.sub) return NextResponse.json({ error: "Cannot remove yourself." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id }, select: { orgId: true } });
  if (!user || user.orgId !== token.orgId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
