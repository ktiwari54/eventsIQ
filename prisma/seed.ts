import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { scoreLead } from "../apps/web/src/server/scoring";
import { computeRoi } from "../apps/web/src/server/roi";

// Seed a realistic demo org so the app is browsable immediately after setup.
const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "demo" },
    update: {},
    create: { name: "Demo Enterprises", slug: "demo" },
  });

  const passwordHash = await bcrypt.hash("Password123!", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@eventiq.dev" },
    update: {},
    create: {
      orgId: org.id,
      name: "Super Admin",
      email: "admin@eventiq.dev",
      role: "SUPER_ADMIN",
      password: passwordHash,
    },
  });

  await prisma.user.upsert({
    where: { email: "sales@eventiq.dev" },
    update: {},
    create: {
      orgId: org.id,
      name: "Sales Exec",
      email: "sales@eventiq.dev",
      role: "SALES_EXECUTIVE",
      password: passwordHash,
    },
  });

  const eventsData = [
    { name: "IMC 2027", type: "TRADE_SHOW", city: "New Delhi", revenue: 21000000, budget: 5500000, leads: 842 },
    { name: "GITEX Global", type: "EXHIBITION", city: "Dubai", revenue: 16000000, budget: 8000000, leads: 610 },
    { name: "Brand Launch", type: "BRAND_LAUNCH", city: "Mumbai", revenue: 9000000, budget: 4000000, leads: 390 },
    { name: "Tech Expo", type: "EXHIBITION", city: "Chennai", revenue: 4000000, budget: 3000000, leads: 195 },
  ] as const;

  for (const e of eventsData) {
    const event = await prisma.event.create({
      data: {
        orgId: org.id,
        ownerId: admin.id,
        name: e.name,
        type: e.type,
        status: "ACTIVE",
        city: e.city,
        country: e.city === "Dubai" ? "UAE" : "India",
        startDate: new Date("2027-02-01"),
        endDate: new Date("2027-02-04"),
        expectedLeads: e.leads,
        expectedRevenue: e.revenue,
        budgetTotal: e.budget,
      },
    });

    // A budget line + matching expense so ROI has real cost data.
    const budget = await prisma.budget.create({
      data: { eventId: event.id, category: "BOOTH", estimated: e.budget, approved: e.budget, actual: e.budget, status: "APPROVED" },
    });
    await prisma.expense.create({
      data: { budgetId: budget.id, eventId: event.id, amount: e.budget, description: "Booth + logistics" },
    });

    // A few scored leads per event.
    const sampleLeads = [
      { name: "Rajan Gupta", company: "Alpha Electronics", designation: "Director", vol: 4_000_000, brands: ["Samsung", "Vivo"] },
      { name: "Anjali Nair", company: "SmartZone", designation: "CEO", vol: 4_800_000, brands: ["Samsung"] },
      { name: "Meena Iyer", company: "TechHub Retail", designation: "Manager", vol: 1_500_000, brands: ["Apple"] },
    ];
    for (const l of sampleLeads) {
      const s = scoreLead({
        monthlyPurchaseVolume: l.vol,
        designation: l.designation,
        interestedBrands: l.brands,
        region: e.city,
        buyingTimelineDays: 30,
        companySize: 500,
        previousInteractions: 2,
      });
      await prisma.lead.create({
        data: {
          orgId: org.id,
          eventId: event.id,
          ownerId: admin.id,
          name: l.name,
          company: l.company,
          designation: l.designation,
          city: e.city,
          interestedBrands: l.brands,
          monthlyPurchaseVolume: l.vol,
          source: "MANUAL",
          score: s.score,
          grade: s.grade,
          heat: s.heat,
          scoreFactors: s.factors,
          aiSuggestion: s.suggestion,
          converted: s.score > 80,
        },
      });
    }

    const roi = computeRoi({
      totalCost: e.budget,
      revenue: e.revenue,
      totalLeads: e.leads,
      qualifiedLeads: Math.round(e.leads * 0.3),
      convertedLeads: Math.round(e.leads * 0.08),
    });
    await prisma.roiMetric.create({
      data: {
        eventId: event.id,
        totalCost: e.budget,
        revenue: e.revenue,
        roi: roi.roi,
        costPerLead: roi.costPerLead,
        costPerQL: roi.costPerQL,
        revenuePerLead: roi.revenuePerLead,
        conversionRate: roi.conversionRate,
      },
    });
  }

  await prisma.vendor.createMany({
    data: [
      { orgId: org.id, name: "Display World", vendorType: "Booth Fabricator", city: "Delhi", rating: 5 },
      { orgId: org.id, name: "PrintMaster India", vendorType: "Printer", city: "Mumbai", rating: 4 },
      { orgId: org.id, name: "Taj Hotels Group", vendorType: "Hotel", city: "Multiple", rating: 5 },
    ],
  });

  // ----------------------------------------------------------------------------
  // TFC Organization
  // ----------------------------------------------------------------------------
  const tfc = await prisma.organization.upsert({
    where: { slug: "tfc" },
    update: {},
    create: { name: "TFC", slug: "tfc" },
  });

  const tfcAdmin = await prisma.user.upsert({
    where: { email: "admin@tfc.dev" },
    update: {},
    create: {
      orgId: tfc.id,
      name: "TFC Admin",
      email: "admin@tfc.dev",
      role: "SUPER_ADMIN",
      password: passwordHash,
    },
  });

  await prisma.user.upsert({
    where: { email: "sales@tfc.dev" },
    update: {},
    create: {
      orgId: tfc.id,
      name: "TFC Sales Exec",
      email: "sales@tfc.dev",
      role: "SALES_EXECUTIVE",
      password: passwordHash,
    },
  });

  const tfcEventsData = [
    { name: "TFC Expo 2027", type: "EXHIBITION", city: "Bangalore", revenue: 12000000, budget: 4000000, leads: 500 },
    { name: "TFC Summit", type: "CONFERENCE", city: "Mumbai", revenue: 8000000, budget: 3000000, leads: 320 },
  ] as const;

  for (const e of tfcEventsData) {
    const event = await prisma.event.create({
      data: {
        orgId: tfc.id,
        ownerId: tfcAdmin.id,
        name: e.name,
        type: e.type,
        status: "ACTIVE",
        city: e.city,
        country: "India",
        startDate: new Date("2027-03-01"),
        endDate: new Date("2027-03-04"),
        expectedLeads: e.leads,
        expectedRevenue: e.revenue,
        budgetTotal: e.budget,
      },
    });

    const budget = await prisma.budget.create({
      data: { eventId: event.id, category: "BOOTH", estimated: e.budget, approved: e.budget, actual: e.budget, status: "APPROVED" },
    });
    await prisma.expense.create({
      data: { budgetId: budget.id, eventId: event.id, amount: e.budget, description: "Booth + logistics" },
    });

    const tfcLeads = [
      { name: "Anil Sharma", company: "TFC Partners", designation: "CEO", vol: 3_000_000, brands: ["Samsung"] },
      { name: "Priya Mehta", company: "TFC Retail", designation: "Director", vol: 2_500_000, brands: ["Apple", "Vivo"] },
    ];
    for (const l of tfcLeads) {
      const s = scoreLead({
        monthlyPurchaseVolume: l.vol,
        designation: l.designation,
        interestedBrands: l.brands,
        region: e.city,
        buyingTimelineDays: 30,
        companySize: 300,
        previousInteractions: 1,
      });
      await prisma.lead.create({
        data: {
          orgId: tfc.id,
          eventId: event.id,
          ownerId: tfcAdmin.id,
          name: l.name,
          company: l.company,
          designation: l.designation,
          city: e.city,
          interestedBrands: l.brands,
          monthlyPurchaseVolume: l.vol,
          source: "MANUAL",
          score: s.score,
          grade: s.grade,
          heat: s.heat,
          scoreFactors: s.factors,
          aiSuggestion: s.suggestion,
          converted: s.score > 80,
        },
      });
    }

    const roi = computeRoi({
      totalCost: e.budget,
      revenue: e.revenue,
      totalLeads: e.leads,
      qualifiedLeads: Math.round(e.leads * 0.3),
      convertedLeads: Math.round(e.leads * 0.08),
    });
    await prisma.roiMetric.create({
      data: {
        eventId: event.id,
        totalCost: e.budget,
        revenue: e.revenue,
        roi: roi.roi,
        costPerLead: roi.costPerLead,
        costPerQL: roi.costPerQL,
        revenuePerLead: roi.revenuePerLead,
        conversionRate: roi.conversionRate,
      },
    });
  }

  await prisma.vendor.createMany({
    data: [
      { orgId: tfc.id, name: "TFC Displays", vendorType: "Booth Fabricator", city: "Bangalore", rating: 4 },
      { orgId: tfc.id, name: "TFC Print Co", vendorType: "Printer", city: "Mumbai", rating: 4 },
    ],
  });

  console.log("✅ Seed complete.");
  console.log("   Demo org  → admin@eventiq.dev / Password123!");
  console.log("   TFC org   → admin@tfc.dev / Password123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
