import { prisma } from "@/lib/prisma";
import { putObject } from "@/lib/s3";
import { buildDataset, toCsv } from "./report-data";
import { generateReport } from "./reports";
import type { ReportFormat, ReportType } from "@prisma/client";

const MIME: Record<ReportFormat, string> = {
  PDF: "application/pdf",
  EXCEL: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  CSV: "text/csv",
};
const EXT: Record<ReportFormat, string> = { PDF: "pdf", EXCEL: "xlsx", CSV: "csv" };

/**
 * Render a report, upload it to S3 and record a ReportRun. Called on-demand
 * ("run now") and by the scheduled-report worker. Returns the ReportRun row.
 */
export async function runReport(opts: {
  orgId: string;
  type: ReportType;
  format: ReportFormat;
  scheduleId?: string;
}) {
  const run = await prisma.reportRun.create({
    data: {
      orgId: opts.orgId,
      scheduleId: opts.scheduleId,
      type: opts.type,
      format: opts.format,
      status: "PENDING",
    },
  });

  try {
    const ds = await buildDataset(opts.orgId, opts.type);
    const body =
      opts.format === "CSV" ? Buffer.from(toCsv(ds), "utf8") : await generateReport(ds, opts.format);

    const key = `org/${opts.orgId}/reports/${opts.type.toLowerCase()}-${Date.now()}.${EXT[opts.format]}`;
    const url = await putObject({ key, body, contentType: MIME[opts.format] });

    const updated = await prisma.reportRun.update({
      where: { id: run.id },
      data: { status: "SUCCESS", url, rowCount: ds.rows.length },
    });
    if (opts.scheduleId) {
      await prisma.reportSchedule.update({
        where: { id: opts.scheduleId },
        data: { lastRunAt: new Date(), lastUrl: url },
      });
    }
    return updated;
  } catch (err) {
    return prisma.reportRun.update({
      where: { id: run.id },
      data: { status: "FAILED", error: String(err) },
    });
  }
}
