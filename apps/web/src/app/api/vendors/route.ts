import { handler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { vendorCreateSchema } from "@/server/validation";

// GET /api/vendors — vendor master list with computed event counts.
export const GET = handler("vendor:read", async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? undefined;
  const vendors = await prisma.vendor.findMany({
    where: { orgId: ctx.orgId, ...(type ? { vendorType: type } : {}) },
    include: { _count: { select: { expenses: true, evaluations: true } } },
    orderBy: { rating: "desc" },
  });
  return { items: vendors };
});

// POST /api/vendors — onboard a vendor.
export const POST = handler(
  "vendor:create",
  async (req, ctx) => {
    const body = vendorCreateSchema.parse(await req.json());
    return prisma.vendor.create({ data: { orgId: ctx.orgId, ...body } });
  },
  { auditAction: "vendor.create" },
);
