import { prisma } from "@/lib/prisma";

export interface Dataset {
  title: string;
  headers: string[];
  rows: (string | number | null)[][];
}

// Single source of truth for report datasets, shared by the CSV export route,
// the PDF/Excel generators and scheduled report runs.
export async function buildDataset(orgId: string, type: string): Promise<Dataset> {
  switch (type.toUpperCase()) {
    case "LEAD":
    case "LEADS": {
      const leads = await prisma.lead.findMany({ where: { orgId }, take: 50000 });
      return {
        title: "Lead Report",
        headers: ["Name", "Company", "Email", "Score", "Grade", "Heat"],
        rows: leads.map((l) => [l.name, l.company, l.email, l.score, l.grade, l.heat]),
      };
    }
    case "VENDOR":
    case "VENDORS": {
      const vendors = await prisma.vendor.findMany({ where: { orgId } });
      return {
        title: "Vendor Report",
        headers: ["Name", "Type", "City", "Rating", "SLA Score"],
        rows: vendors.map((v) => [v.name, v.vendorType, v.city, v.rating, v.slaScore ?? "—"]),
      };
    }
    case "EVENT":
    case "EVENTS": {
      const events = await prisma.event.findMany({ where: { orgId } });
      return {
        title: "Event Report",
        headers: ["Name", "Type", "Status", "City", "Expected Revenue"],
        rows: events.map((e) => [e.name, e.type, e.status, e.city, Number(e.expectedRevenue)]),
      };
    }
    case "BUDGET":
    case "FINANCE": {
      const budgets = await prisma.budget.findMany({
        where: { event: { orgId } },
        include: { event: { select: { name: true } } },
      });
      return {
        title: "Budget & Finance Report",
        headers: ["Event", "Category", "Estimated", "Approved", "Actual", "Status"],
        rows: budgets.map((b) => [
          b.event.name,
          b.category,
          Number(b.estimated),
          Number(b.approved),
          Number(b.actual),
          b.status,
        ]),
      };
    }
    default: {
      const roi = await prisma.roiMetric.findMany({
        where: { event: { orgId } },
        include: { event: { select: { name: true } } },
        orderBy: { roi: "desc" },
      });
      return {
        title: "ROI Report",
        headers: ["Event", "Cost", "Revenue", "ROI", "Cost/Lead", "Conversion %"],
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

export function toCsv(ds: Dataset): string {
  const cell = (v: unknown): string => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [ds.headers.join(","), ...ds.rows.map((r) => r.map(cell).join(","))].join("\n");
}
