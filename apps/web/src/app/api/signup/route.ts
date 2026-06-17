import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  orgName: z.string().min(2).max(100),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  plan: z.enum(["STARTER", "PRO", "ENTERPRISE"]).default("PRO"),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Validation failed" },
      { status: 422 }
    );
  }

  const { orgName, name, email, password, plan, billingCycle } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  // Check duplicate email
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  // Ensure slug uniqueness
  let slug = slugify(orgName);
  const existing_org = await prisma.organization.findUnique({ where: { slug } });
  if (existing_org) {
    slug = `${slug}-${Date.now()}`;
  }

  // Ensure the plan row exists (seed on first use)
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

  const hashedPassword = await bcrypt.hash(password, 12);
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: { name: orgName, slug },
    });

    await tx.user.create({
      data: {
        orgId: org.id,
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: "SUPER_ADMIN",
        status: "ACTIVE",
      },
    });

    await tx.subscription.create({
      data: {
        orgId: org.id,
        planId: planRecord.id,
        status: "TRIALING",
        billingCycle,
        trialEndsAt,
        currentPeriodEnd: trialEndsAt,
      },
    });
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
