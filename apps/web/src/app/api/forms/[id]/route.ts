import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  active: z.boolean().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req });
  if (!token?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const form = await prisma.form.findFirst({
    where: { id, orgId: token.orgId as string },
    include: {
      fields: { orderBy: { order: "asc" } },
      _count: { select: { submissions: true } },
    },
  });

  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(form);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req });
  if (!token?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 422 });

  const form = await prisma.form.findFirst({ where: { id, orgId: token.orgId as string } });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.form.update({ where: { id }, data: parsed.data });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req });
  if (!token?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const form = await prisma.form.findFirst({ where: { id, orgId: token.orgId as string } });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.form.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
