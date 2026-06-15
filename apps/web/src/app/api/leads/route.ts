import { handler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { leadCreateSchema } from "@/server/validation";
import { scoreLead } from "@/server/scoring";
import { enqueueZohoSync } from "@/server/queue";

// GET /api/leads — list/search leads. Sales Executives only see their own.
export const GET = handler("lead:read", async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(100, Number(searchParams.get("pageSize") ?? 25));
  const grade = searchParams.get("grade") ?? undefined;
  const heat = searchParams.get("heat") ?? undefined;
  const eventId = searchParams.get("eventId") ?? undefined;
  const search = searchParams.get("q") ?? undefined;

  const scopedToOwn = ctx.role === "SALES_EXECUTIVE";

  const where = {
    orgId: ctx.orgId,
    ...(scopedToOwn ? { ownerId: ctx.userId } : {}),
    ...(grade ? { grade: grade as never } : {}),
    ...(heat ? { heat: heat as never } : {}),
    ...(eventId ? { eventId } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { company: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: { event: { select: { name: true } } },
      orderBy: { score: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.lead.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
});

// POST /api/leads — capture a lead, run AI scoring synchronously, queue Zoho sync.
export const POST = handler(
  "lead:create",
  async (req, ctx) => {
    const body = leadCreateSchema.parse(await req.json());

    const scoring = scoreLead({
      monthlyPurchaseVolume: body.monthlyPurchaseVolume,
      companySize: body.companySize,
      designation: body.designation,
      buyingTimelineDays: body.buyingTimelineDays,
      previousInteractions: body.previousInteractions,
      interestedBrands: body.interestedBrands,
      region: body.city ?? body.country,
    });

    const lead = await prisma.lead.create({
      data: {
        orgId: ctx.orgId,
        ownerId: ctx.userId,
        eventId: body.eventId,
        name: body.name,
        company: body.company,
        designation: body.designation,
        email: body.email,
        phone: body.phone,
        city: body.city,
        country: body.country,
        interestedBrands: body.interestedBrands,
        monthlyPurchaseVolume: body.monthlyPurchaseVolume,
        source: body.source,
        notes: body.notes,
        score: scoring.score,
        grade: scoring.grade,
        heat: scoring.heat,
        scoreFactors: scoring.factors,
        aiSuggestion: scoring.suggestion,
      },
    });

    // Fire-and-forget Zoho sync via the queue (won't block the response).
    await enqueueZohoSync(ctx.orgId, lead.id).catch(() => {});

    return lead;
  },
  { auditAction: "lead.create" },
);
