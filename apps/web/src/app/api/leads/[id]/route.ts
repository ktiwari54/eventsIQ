import { handler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { leadUpdateSchema } from "@/server/validation";
import { scoreLead } from "@/server/scoring";

async function findOwnedLead(id: string, orgId: string, ownerOnly?: string) {
  return prisma.lead.findFirst({
    where: { id, orgId, ...(ownerOnly ? { ownerId: ownerOnly } : {}) },
  });
}

// PUT /api/leads/:id — update + re-score. Sales Executives limited to own leads.
export const PUT = handler(
  "lead:update",
  async (req, ctx, params) => {
    const body = leadUpdateSchema.parse(await req.json());
    const ownerOnly = ctx.role === "SALES_EXECUTIVE" ? ctx.userId : undefined;
    const existing = await findOwnedLead(params.id, ctx.orgId, ownerOnly);
    if (!existing) throw Object.assign(new Error("Not found"), { status: 404 });

    const merged = { ...existing, ...body };
    const scoring = scoreLead({
      monthlyPurchaseVolume: merged.monthlyPurchaseVolume
        ? Number(merged.monthlyPurchaseVolume)
        : null,
      designation: merged.designation,
      interestedBrands: merged.interestedBrands,
      region: merged.city ?? merged.country,
      buyingTimelineDays: body.buyingTimelineDays,
      companySize: body.companySize,
      previousInteractions: body.previousInteractions,
    });

    return prisma.lead.update({
      where: { id: params.id },
      data: {
        ...body,
        score: scoring.score,
        grade: scoring.grade,
        heat: scoring.heat,
        scoreFactors: scoring.factors,
        aiSuggestion: scoring.suggestion,
      },
    });
  },
  { auditAction: "lead.update" },
);

// DELETE /api/leads/:id
export const DELETE = handler(
  "lead:delete",
  async (_req, ctx, params) => {
    const existing = await findOwnedLead(params.id, ctx.orgId);
    if (!existing) throw Object.assign(new Error("Not found"), { status: 404 });
    await prisma.lead.delete({ where: { id: params.id } });
    return { deleted: true };
  },
  { auditAction: "lead.delete" },
);
