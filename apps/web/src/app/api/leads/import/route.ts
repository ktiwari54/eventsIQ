import { handler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { parseCsv } from "@/server/csv";
import { scoreLead } from "@/server/scoring";
import type { LeadSource, Prisma } from "@prisma/client";
import { z } from "zod";

// POST /api/leads/import — bulk-import leads from CSV.
// Body: { csv: string, eventId?: string }. Expected headers (case-insensitive):
// name, company, designation, email, phone, city, country, interestedbrands,
// monthlypurchasevolume. Each row is AI-scored, then inserted in one batch.
const importSchema = z.object({
  csv: z.string().min(1).max(5_000_000), // ~5MB cap
  eventId: z.string().cuid().optional(),
});

const MAX_ROWS = 50_000;

export const POST = handler(
  "lead:create",
  async (req, ctx) => {
    const { csv, eventId } = importSchema.parse(await req.json());
    const rows = parseCsv(csv);

    if (rows.length === 0) return { created: 0, skipped: 0, errors: ["No data rows found"] };
    if (rows.length > MAX_ROWS)
      throw Object.assign(new Error(`Too many rows (max ${MAX_ROWS})`), { status: 422 });

    const errors: string[] = [];
    const data: Prisma.LeadCreateManyInput[] = [];

    rows.forEach((row, idx) => {
      const name = row.name || row["full name"] || row.fullname;
      if (!name) {
        errors.push(`Row ${idx + 2}: missing name — skipped`);
        return;
      }
      const brands = (row.interestedbrands || row.brands || "")
        .split(/[;|]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const volume = parseNumber(row.monthlypurchasevolume || row.volume);

      const scoring = scoreLead({
        monthlyPurchaseVolume: volume,
        designation: row.designation || row.title,
        interestedBrands: brands,
        region: row.city || row.country,
      });

      data.push({
        orgId: ctx.orgId,
        ownerId: ctx.userId,
        eventId,
        name,
        company: row.company || undefined,
        designation: row.designation || row.title || undefined,
        email: row.email || undefined,
        phone: row.phone || row.mobile || undefined,
        city: row.city || undefined,
        country: row.country || undefined,
        interestedBrands: brands,
        monthlyPurchaseVolume: volume ?? undefined,
        source: "CSV_UPLOAD" as LeadSource,
        score: scoring.score,
        grade: scoring.grade,
        heat: scoring.heat,
        scoreFactors: scoring.factors,
        aiSuggestion: scoring.suggestion,
      });
    });

    const result = data.length
      ? await prisma.lead.createMany({ data, skipDuplicates: true })
      : { count: 0 };

    return { created: result.count, skipped: rows.length - data.length, errors: errors.slice(0, 50) };
  },
  { auditAction: "lead.import" },
);

function parseNumber(v?: string): number | null {
  if (!v) return null;
  const n = Number(v.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}
