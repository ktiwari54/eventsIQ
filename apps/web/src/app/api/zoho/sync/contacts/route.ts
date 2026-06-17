import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { syncContactToZoho } from "@/server/zoho";

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = token.orgId as string;

  const leads = await prisma.lead.findMany({
    where: { orgId, email: { not: null } },
    take: 50,
  });

  const results = await Promise.allSettled(leads.map((l) => syncContactToZoho(orgId, l)));
  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({ synced: succeeded, failed, total: leads.length });
}
