import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { syncInvoiceToZoho } from "@/server/zoho";

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = token.orgId as string;

  const invoices = await prisma.invoice.findMany({
    where: { orgId, zohoSyncedAt: null },
    take: 50,
  });

  const results = await Promise.allSettled(invoices.map((i) => syncInvoiceToZoho(orgId, i.id)));
  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({ synced: succeeded, failed, total: invoices.length });
}
