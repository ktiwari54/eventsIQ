import { Queue, type ConnectionOptions } from "bullmq";
import { redis } from "@/lib/redis";

// BullMQ queues for background work. The connection is shared with the app's
// Redis client. Workers live in src/server/worker.ts and run as a separate
// process (see Dockerfile.worker).

export const ZOHO_QUEUE = "zoho-sync";
export const SCORING_QUEUE = "lead-scoring";
export const REPORT_QUEUE = "report-generation";

// BullMQ bundles its own nested ioredis; cast our shared client to BullMQ's
// ConnectionOptions to reconcile the duplicate ioredis type identities.
const connection = redis as unknown as ConnectionOptions;

export const zohoQueue = new Queue(ZOHO_QUEUE, { connection });
export const reportQueue = new Queue(REPORT_QUEUE, { connection });

export async function enqueueZohoSync(orgId: string, leadId: string): Promise<void> {
  await zohoQueue.add(
    "sync-lead",
    { orgId, leadId },
    {
      attempts: 5,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  );
}

/** Enqueue a full bidirectional Zoho sync (contacts out, deals in) for an org. */
export async function enqueueZohoFullSync(orgId: string): Promise<void> {
  await zohoQueue.add("full-sync", { orgId }, { attempts: 2, removeOnComplete: 100 });
}

export async function enqueueReport(
  orgId: string,
  type: string,
  format: string,
  scheduleId?: string,
): Promise<void> {
  await reportQueue.add("generate", { orgId, type, format, scheduleId }, { attempts: 3 });
}

/** Register a cron-driven repeatable job for a report schedule. */
export async function scheduleRepeatingReport(opts: {
  scheduleId: string;
  orgId: string;
  type: string;
  format: string;
  cron: string;
}): Promise<void> {
  await reportQueue.add(
    "generate",
    { orgId: opts.orgId, type: opts.type, format: opts.format, scheduleId: opts.scheduleId },
    { repeat: { pattern: opts.cron }, jobId: `sched:${opts.scheduleId}` },
  );
}

/** Remove a previously-registered repeatable report job. */
export async function unscheduleRepeatingReport(scheduleId: string, cron: string): Promise<void> {
  await reportQueue.removeRepeatable("generate", { pattern: cron }, `sched:${scheduleId}`);
}
