import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  dataCenter: z.enum(["com", "in", "eu", "com.au", "jp"]).default("com"),
});

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sub = await prisma.subscription.findUnique({
    where: { orgId: token.orgId as string },
    include: { plan: { select: { tier: true } } },
  });
  const allowed = sub?.plan.tier === "PRO" || sub?.plan.tier === "ENTERPRISE";
  if (!allowed) {
    return NextResponse.json(
      { error: "CRM sync is not available on the Starter plan. Upgrade to Pro or Enterprise." },
      { status: 403 }
    );
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 422 });

  const { clientId, clientSecret, dataCenter } = parsed.data;

  await prisma.zohoConfig.upsert({
    where: { orgId: token.orgId as string },
    update: { clientId, clientSecret, dataCenter, connected: false },
    create: {
      orgId: token.orgId as string,
      clientId,
      clientSecret,
      dataCenter,
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
    select: { clientId: true, connected: true, apiDomain: true, dataCenter: true },
  });

  return NextResponse.json({ ...(config ?? { connected: false }), orgId: token.orgId });
}
