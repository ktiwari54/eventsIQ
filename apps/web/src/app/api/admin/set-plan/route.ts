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

  // Only allow downgrades via self-serve. Upgrades require contacting sales.
  const RANK: Record<string, number> = { STARTER: 0, PRO: 1, ENTERPRISE: 2 };
  const existing_sub = await prisma.subscription.findUnique({
    where: { orgId: token.orgId as string },
    include: { plan: { select: { tier: true } } },
  });
  if (existing_sub) {
    const currentRank = RANK[existing_sub.plan.tier] ?? 0;
    const targetRank = RANK[tier] ?? 0;
    if (targetRank > currentRank) {
      return NextResponse.json(
        { error: "Upgrades require contacting our sales team. Please email sales@eventsiq.com." },
        { status: 403 }
      );
    }
  }

  const planRecord = await prisma.plan.upsert({
    where: { tier },
    update: {},
    create: { tier, ...defaults, features: [] },
  });

  const existingSub = await prisma.subscription.findUnique({
    where: { orgId: token.orgId as string },
  });

  if (existingSub) {
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
