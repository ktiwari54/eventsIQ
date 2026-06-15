import { handler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { reportScheduleSchema } from "@/server/validation";
import { scheduleRepeatingReport, unscheduleRepeatingReport } from "@/server/queue";

// PUT /api/reports/schedules/:id — update and re-register the cron job.
export const PUT = handler(
  "report:create",
  async (req, ctx, params) => {
    const body = reportScheduleSchema.partial().parse(await req.json());
    const existing = await prisma.reportSchedule.findFirst({
      where: { id: params.id, orgId: ctx.orgId },
    });
    if (!existing) throw Object.assign(new Error("Not found"), { status: 404 });

    const updated = await prisma.reportSchedule.update({ where: { id: params.id }, data: body });

    // Re-sync the repeatable job: drop the old one, add the new if enabled.
    await unscheduleRepeatingReport(existing.id, existing.cron).catch(() => {});
    if (updated.enabled) {
      await scheduleRepeatingReport({
        scheduleId: updated.id,
        orgId: ctx.orgId,
        type: updated.type,
        format: updated.format,
        cron: updated.cron,
      }).catch(() => {});
    }
    return updated;
  },
  { auditAction: "report.schedule.update" },
);

// DELETE /api/reports/schedules/:id
export const DELETE = handler(
  "report:create",
  async (_req, ctx, params) => {
    const existing = await prisma.reportSchedule.findFirst({
      where: { id: params.id, orgId: ctx.orgId },
    });
    if (!existing) throw Object.assign(new Error("Not found"), { status: 404 });
    await unscheduleRepeatingReport(existing.id, existing.cron).catch(() => {});
    await prisma.reportSchedule.delete({ where: { id: params.id } });
    return { deleted: true };
  },
  { auditAction: "report.schedule.delete" },
);
