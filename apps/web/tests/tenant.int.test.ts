import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/tenant";

// DB-backed integration tests. They run only when DATABASE_URL is set (CI `test`
// job + local dev with a migrated database); otherwise they are skipped so the
// pure unit suite stays hermetic.
const itDb = process.env.DATABASE_URL ? it : it.skip;

describe("tenant context + lead dedupe (integration)", () => {
  const ids: string[] = [];

  afterAll(async () => {
    if (process.env.DATABASE_URL) {
      await prisma.organization.deleteMany({ where: { id: { in: ids } } }).catch(() => {});
      await prisma.$disconnect().catch(() => {});
    }
  });

  itDb("sets app.current_org transaction-locally inside withTenant", async () => {
    const org = await prisma.organization.create({ data: { name: "T", slug: "t-" + Date.now() } });
    ids.push(org.id);

    const inside = await withTenant(org.id, async (tx) => {
      const rows = await tx.$queryRaw<{ v: string | null }[]>`SELECT current_setting('app.current_org', true) AS v`;
      return rows[0]?.v;
    });
    expect(inside).toBe(org.id);

    // Outside any tenant context the GUC is not set to our org.
    const outside = await prisma.$queryRaw<{ v: string | null }[]>`SELECT current_setting('app.current_org', true) AS v`;
    expect(outside[0]?.v ?? "").not.toBe(org.id);
  });

  itDb("deduplicates leads by (orgId, email) on import", async () => {
    const org = await prisma.organization.create({ data: { name: "D", slug: "d-" + Date.now() } });
    ids.push(org.id);

    const rows = [
      { orgId: org.id, name: "A", email: "dup@x.com" },
      { orgId: org.id, name: "B", email: "dup@x.com" }, // duplicate email
      { orgId: org.id, name: "C", email: "unique@x.com" },
    ];
    const first = await prisma.lead.createMany({ data: rows, skipDuplicates: true });
    expect(first.count).toBe(2); // one duplicate skipped

    // Re-importing the same emails inserts nothing new.
    const second = await prisma.lead.createMany({ data: rows, skipDuplicates: true });
    expect(second.count).toBe(0);
  });
});
