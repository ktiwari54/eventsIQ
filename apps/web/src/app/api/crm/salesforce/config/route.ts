import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  instanceUrl: z.string().url().optional().or(z.literal("")),
});

async function requireCrmPlan(orgId: string): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({
    where: { orgId },
    include: { plan: { select: { tier: true } } },
  });
  return sub?.plan.tier === "PRO" || sub?.plan.tier === "ENTERPRISE";
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await requireCrmPlan(token.orgId as string);
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

  const { clientId, clientSecret, instanceUrl } = parsed.data;

  await prisma.salesforceConfig.upsert({
    where: { orgId: token.orgId as string },
    update: { clientId, clientSecret, instanceUrl: instanceUrl || null, connected: false },
    create: {
      orgId: token.orgId as string,
      clientId,
      clientSecret,
      instanceUrl: instanceUrl || null,
      connected: false,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await prisma.salesforceConfig.findUnique({
    where: { orgId: token.orgId as string },
    select: { clientId: true, instanceUrl: true, connected: true },
  });

  return NextResponse.json(config ?? { connected: false });
}
