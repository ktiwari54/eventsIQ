import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const PLAN_DEFAULTS = {
  STARTER:    { name: "Starter",    monthlyPrice: 49,  yearlyPrice: 39,  maxUsers: 5,    maxEvents: 10,   maxLeads: 500 },
  PRO:        { name: "Pro",        monthlyPrice: 149, yearlyPrice: 119, maxUsers: 15,   maxEvents: 9999, maxLeads: 5000 },
  ENTERPRISE: { name: "Enterprise", monthlyPrice: 399, yearlyPrice: 319, maxUsers: 9999, maxEvents: 9999, maxLeads: 999999 },
} as const;

const schema = z.object({
  tier: z.enum(["STARTER", "PRO", "ENTERPRISE"]),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]).optional().default("MONTHLY"),
});

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (token.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 422 });

  const { tier, billingCycle } = parsed.data;
  const defaults = PLAN_DEFAULTS[tier];

  const planRecord = await prisma.plan.upsert({
    where: { tier },
    update: {},
    create: { tier, ...defaults, features: [] },
  });

  const existing = await prisma.subscription.findUnique({
    where: { orgId: token.orgId as string },
  });

  if (existing) {
    await prisma.subscription.update({
      where: { orgId: token.orgId as string },
      data: {
        planId: planRecord.id,
        billingCycle,
        status: "ACTIVE",
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  } else {
    await prisma.subscription.create({
      data: {
        orgId: token.orgId as string,
        planId: planRecord.id,
        billingCycle,
        status: "ACTIVE",
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  return NextResponse.json({ ok: true, tier, name: defaults.name });
}
