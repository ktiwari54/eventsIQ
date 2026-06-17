import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { syncSalesOrderToZoho } from "@/server/zoho";

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = token.orgId as string;

  const orders = await prisma.salesOrder.findMany({
    where: { orgId, zohoSyncedAt: null },
    take: 50,
  });

  const results = await Promise.allSettled(orders.map((o) => syncSalesOrderToZoho(orgId, o.id)));
  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({ synced: succeeded, failed, total: orders.length });
}
