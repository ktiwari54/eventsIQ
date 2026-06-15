import { handler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { enqueueReport } from "@/server/queue";
import { runReport } from "@/server/report-run";
import { z } from "zod";

const runSchema = z.object({
  type: z.enum(["EVENT", "LEAD", "ROI", "VENDOR", "BUDGET", "FINANCE"]),
  format: z.enum(["PDF", "EXCEL", "CSV"]).default("PDF"),
  async: z.boolean().default(false),
});

// GET /api/reports/runs — recent report run history (with download URLs).
export const GET = handler("report:read", async (_req, ctx) => {
  return {
    items: await prisma.reportRun.findMany({
      where: { orgId: ctx.orgId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  };
});

// POST /api/reports/runs — generate a report now. `async` enqueues to the
// worker; otherwise it renders inline and returns the finished run with its URL.
export const POST = handler(
  "report:read",
  async (req, ctx) => {
    const { type, format, async } = runSchema.parse(await req.json());
    if (async) {
      await enqueueReport(ctx.orgId, type, format);
      return { queued: true };
    }
    return runReport({ orgId: ctx.orgId, type, format });
  },
  { auditAction: "report.run" },
);
