import { handler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { eventCreateSchema } from "@/server/validation";

// GET /api/events — list events for the caller's org with pagination + filters.
export const GET = handler("event:read", async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(100, Number(searchParams.get("pageSize") ?? 20));
  const status = searchParams.get("status") ?? undefined;
  const search = searchParams.get("q") ?? undefined;

  const where = {
    orgId: ctx.orgId,
    ...(status ? { status: status as never } : {}),
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.event.findMany({
      where,
      include: { roiMetric: true, _count: { select: { leads: true } } },
      orderBy: { startDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.event.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
});

// POST /api/events — create a new event (starts in DRAFT).
export const POST = handler(
  "event:create",
  async (req, ctx) => {
    const body = eventCreateSchema.parse(await req.json());
    return prisma.event.create({
      data: {
        orgId: ctx.orgId,
        ownerId: ctx.userId,
        name: body.name,
        type: body.type,
        category: body.category,
        startDate: body.startDate,
        endDate: body.endDate,
        venue: body.venue,
        city: body.city,
        country: body.country,
        organizer: body.organizer,
        objectives: body.objectives,
        expectedLeads: body.expectedLeads,
        expectedRevenue: body.expectedRevenue,
        budgetTotal: body.budgetTotal,
      },
    });
  },
  { auditAction: "event.create" },
);
