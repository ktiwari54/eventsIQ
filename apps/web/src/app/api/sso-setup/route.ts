import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  orgName: z.string().min(2).max(100),
  plan: z.enum(["STARTER", "PRO", "ENTERPRISE"]).default("PRO"),
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Must have a valid SSO session with email but no orgId yet
  if (!token?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (token.orgId) return NextResponse.json({ error: "Organization already exists." }, { status: 409 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 422 });
  }

  const { orgName, plan } = parsed.data;
  const email = (token.email as string).toLowerCase();
  const name = (token.name as string | undefined) ?? email.split("@")[0];

  // Guard: user may have been created by a parallel request
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) return NextResponse.json({ ok: true, alreadyExists: true });

  let slug = slugify(orgName);
  const slugConflict = await prisma.organization.findUnique({ where: { slug } });
  if (slugConflict) slug = `${slug}-${Date.now()}`;

  const planRecord = await prisma.plan.upsert({
    where: { tier: plan },
    update: {},
    create: {
      name: plan === "STARTER" ? "Starter" : plan === "PRO" ? "Pro" : "Enterprise",
      tier: plan,
      monthlyPrice: plan === "STARTER" ? 49 : plan === "PRO" ? 149 : 399,
      yearlyPrice: plan === "STARTER" ? 39 : plan === "PRO" ? 119 : 319,
      maxUsers: plan === "STARTER" ? 5 : plan === "PRO" ? 15 : 9999,
      maxEvents: plan === "STARTER" ? 10 : plan === "PRO" ? 9999 : 9999,
      maxLeads: plan === "STARTER" ? 500 : plan === "PRO" ? 5000 : 999999,
      features: [],
    },
  });

  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({ data: { name: orgName, slug } });

    await tx.user.create({
      data: {
        orgId: org.id,
        name,
        email,
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        image: (token.picture as string | undefined) ?? null,
        // No password — SSO-only account
      },
    });

    await tx.subscription.create({
      data: {
        orgId: org.id,
        planId: planRecord.id,
        status: "TRIALING",
        billingCycle: "MONTHLY",
        trialEndsAt,
        currentPeriodEnd: trialEndsAt,
      },
    });
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
