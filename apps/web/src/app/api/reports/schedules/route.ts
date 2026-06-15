import { handler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { reportScheduleSchema } from "@/server/validation";
import { scheduleRepeatingReport } from "@/server/queue";

// GET /api/reports/schedules — list scheduled reports for the org.
export const GET = handler("report:read", async (_req, ctx) => {
  return {
    items: await prisma.reportSchedule.findMany({
      where: { orgId: ctx.orgId },
      orderBy: { createdAt: "desc" },
    }),
  };
});

// POST /api/reports/schedules — create a schedule and register its cron job.
export const POST = handler(
  "report:create",
  async (req, ctx) => {
    const body = reportScheduleSchema.parse(await req.json());
    const schedule = await prisma.reportSchedule.create({
      data: { orgId: ctx.orgId, createdBy: ctx.userId, ...body },
    });
    if (schedule.enabled) {
      await scheduleRepeatingReport({
        scheduleId: schedule.id,
        orgId: ctx.orgId,
        type: schedule.type,
        format: schedule.format,
        cron: schedule.cron,
      }).catch(() => {});
    }
    return schedule;
  },
  { auditAction: "report.schedule.create" },
);
