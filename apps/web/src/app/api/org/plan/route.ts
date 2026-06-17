import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sub = await prisma.subscription.findUnique({
    where: { orgId: token.orgId as string },
    include: { plan: { select: { tier: true, name: true, maxUsers: true } } },
  });

  if (!sub) return NextResponse.json({ tier: "STARTER", name: "Starter", maxUsers: 5 });

  return NextResponse.json({
    tier: sub.plan.tier,
    name: sub.plan.name,
    maxUsers: sub.plan.maxUsers,
    status: sub.status,
  });
}
