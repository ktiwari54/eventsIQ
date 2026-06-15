import { handler } from "@/lib/api";
import { prisma } from "@/lib/prisma";

// GET /api/zoho/sync-log — connection status + recent sync log + counters for
// the Zoho sync dashboard.
export const GET = handler("event:read", async (_req, ctx) => {
  const [config, logs, success, failed, pending] = await Promise.all([
    prisma.zohoConfig.findUnique({
      where: { orgId: ctx.orgId },
      select: { connected: true, apiDomain: true, expiresAt: true },
    }),
    prisma.zohoSyncLog.findMany({
      where: { orgId: ctx.orgId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.zohoSyncLog.count({ where: { orgId: ctx.orgId, status: "SUCCESS" } }),
    prisma.zohoSyncLog.count({ where: { orgId: ctx.orgId, status: "FAILED" } }),
    prisma.zohoSyncLog.count({ where: { orgId: ctx.orgId, status: "PENDING" } }),
  ]);

  return {
    connected: config?.connected ?? false,
    apiDomain: config?.apiDomain,
    stats: { success, failed, pending },
    logs,
  };
});
