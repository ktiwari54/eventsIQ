import { handler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { enqueueZohoFullSync } from "@/server/queue";

// POST /api/zoho/sync — trigger a full bidirectional Zoho sync for the org
// (contacts/accounts outbound, deals inbound). Runs in the BullMQ worker.
export const POST = handler(
  "event:update",
  async (_req, ctx) => {
    const cfg = await prisma.zohoConfig.findUnique({
      where: { orgId: ctx.orgId },
      select: { connected: true },
    });
    if (!cfg?.connected) {
      throw Object.assign(new Error("Zoho is not connected"), { status: 422 });
    }
    await enqueueZohoFullSync(ctx.orgId);
    return { queued: true };
  },
  { auditAction: "zoho.fullsync" },
);
