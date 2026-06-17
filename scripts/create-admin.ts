import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "ktiwari54@gmail.com";
  const password = "Admin@eventsIQ1";
  const orgName = "EventsIQ";
  const slug = "eventsiq";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`User ${email} already exists — skipping user creation.`);
  }

  let org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) {
    org = await prisma.organization.create({ data: { name: orgName, slug } });
    console.log(`Created org: ${orgName} (${org.id})`);
  } else {
    console.log(`Org already exists: ${orgName} (${org.id})`);
  }

  if (!existing) {
    const hash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: {
        orgId: org.id,
        name: "Admin",
        email,
        password: hash,
        role: "SUPER_ADMIN",
        status: "ACTIVE",
      },
    });
    console.log(`Created user: ${email}`);
  }

  const planRecord = await prisma.plan.upsert({
    where: { tier: "PRO" },
    update: {},
    create: {
      name: "Pro",
      tier: "PRO",
      monthlyPrice: 149,
      yearlyPrice: 119,
      maxUsers: 15,
      maxEvents: 9999,
      maxLeads: 5000,
      features: [],
    },
  });

  await prisma.subscription.upsert({
    where: { orgId: org.id },
    update: {
      planId: planRecord.id,
      status: "ACTIVE",
      billingCycle: "MONTHLY",
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
    create: {
      orgId: org.id,
      planId: planRecord.id,
      status: "ACTIVE",
      billingCycle: "MONTHLY",
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  console.log("✅ Done!");
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);
  console.log(`   Plan:     Pro (ACTIVE)`);
  console.log(`   Org:      ${orgName}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
