import { Queue } from "bullmq";
import { redis } from "@/lib/redis";

// BullMQ queues for background work. The connection is shared with the app's
// Redis client. Workers live in src/server/worker.ts and run as a separate
// process (see Dockerfile.worker).

export const ZOHO_QUEUE = "zoho-sync";
export const SCORING_QUEUE = "lead-scoring";
export const REPORT_QUEUE = "report-generation";

const connection = redis;

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

export async function enqueueReport(orgId: string, type: string, format: string): Promise<void> {
  await reportQueue.add("generate", { orgId, type, format }, { attempts: 3 });
}
