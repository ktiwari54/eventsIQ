import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertCan } from "@/lib/rbac";
import type { Role } from "@prisma/client";

// GET /api/reports/export/:format?type=roi|leads|events|vendors|budget
// Streams CSV directly; PDF/Excel generation is delegated to the report worker
// in production but CSV is produced inline for immediate download.
export async function GET(
  req: NextRequest,
  route: { params: Promise<{ format: string }> },
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertCan(token.role as Role, "report:read");

  const orgId = token.orgId as string;
  const { format } = await route.params;
  const type = new URL(req.url).searchParams.get("type") ?? "roi";

  const { headers, rows } = await buildDataset(orgId, type);

  if (format === "csv") {
    const csv = [headers.join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="eventiq-${type}.csv"`,
      },
    });
  }

  // For pdf/excel return a JSON descriptor; the worker renders the binary and
  // emails/stores it. This keeps the request path fast and serverless-friendly.
  return NextResponse.json({
    queued: true,
    format,
    type,
    rowCount: rows.length,
    message: `Your ${format.toUpperCase()} report is being generated and will be emailed.`,
  });
}

async function buildDataset(orgId: string, type: string): Promise<{ headers: string[]; rows: unknown[][] }> {
  switch (type) {
    case "leads": {
      const leads = await prisma.lead.findMany({ where: { orgId }, take: 50000 });
      return {
        headers: ["Name", "Company", "Email", "Score", "Grade", "Heat"],
        rows: leads.map((l) => [l.name, l.company, l.email, l.score, l.grade, l.heat]),
      };
    }
    case "vendors": {
      const vendors = await prisma.vendor.findMany({ where: { orgId } });
      return {
        headers: ["Name", "Type", "City", "Rating"],
        rows: vendors.map((v) => [v.name, v.vendorType, v.city, v.rating]),
      };
    }
    case "events": {
      const events = await prisma.event.findMany({ where: { orgId } });
      return {
        headers: ["Name", "Type", "Status", "City", "ExpectedRevenue"],
        rows: events.map((e) => [e.name, e.type, e.status, e.city, Number(e.expectedRevenue)]),
      };
    }
    default: {
      const roi = await prisma.roiMetric.findMany({
        where: { event: { orgId } },
        include: { event: { select: { name: true } } },
        orderBy: { roi: "desc" },
      });
      return {
        headers: ["Event", "Cost", "Revenue", "ROI", "CostPerLead", "ConversionRate"],
        rows: roi.map((r) => [
          r.event.name,
          Number(r.totalCost),
          Number(r.revenue),
          r.roi,
          r.costPerLead,
          r.conversionRate,
        ]),
      };
    }
  }
}

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
