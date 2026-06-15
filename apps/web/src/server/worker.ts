import { Worker, type ConnectionOptions } from "bullmq";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { syncLeadToZoho } from "./zoho";
import { runReport } from "./report-run";
import { ZOHO_QUEUE, REPORT_QUEUE } from "./queue";
import type { ReportFormat, ReportType } from "@prisma/client";

// Standalone worker process. Run with: tsx src/server/worker.ts
// Handles Zoho sync (with built-in BullMQ retry/backoff) and report jobs.

const connection = redis as unknown as ConnectionOptions;

const zohoWorker = new Worker(
  ZOHO_QUEUE,
  async (job) => {
    if (job.name === "sync-lead") {
      const { orgId, leadId } = job.data as { orgId: string; leadId: string };
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (lead) await syncLeadToZoho(orgId, lead);
    }
  },
  { connection, concurrency: 5 },
);

const reportWorker = new Worker(
  REPORT_QUEUE,
  async (job) => {
    const { orgId, type, format, scheduleId } = job.data as {
      orgId: string;
      type: ReportType;
      format: ReportFormat;
      scheduleId?: string;
    };
    await runReport({ orgId, type, format, scheduleId });
  },
  { connection, concurrency: 2 },
);

zohoWorker.on("failed", (job, err) =>
  console.error(`[worker] zoho job ${job?.id} failed:`, err.message),
);
reportWorker.on("completed", (job) => console.log(`[worker] report job ${job.id} done`));

console.log("EventIQ worker started — listening on zoho-sync, report-generation");
