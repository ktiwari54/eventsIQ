import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 422 });

  const { clientId, clientSecret } = parsed.data;

  await prisma.zohoConfig.upsert({
    where: { orgId: token.orgId as string },
    update: { clientId, clientSecret, connected: false },
    create: {
      orgId: token.orgId as string,
      clientId,
      clientSecret,
      connected: false,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await prisma.zohoConfig.findUnique({
    where: { orgId: token.orgId as string },
    select: { clientId: true, connected: true, apiDomain: true },
  });

  return NextResponse.json(config ?? { connected: false });
}
