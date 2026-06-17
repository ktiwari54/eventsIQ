import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const SCOPES = [
  "ZohoCRM.modules.leads.all",
  "ZohoCRM.modules.contacts.all",
  "ZohoCRM.modules.sales_orders.all",
  "ZohoCRM.modules.invoices.all",
  "ZohoCRM.modules.deals.all",
  "ZohoCRM.settings.modules.all",
].join(",");

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prisma } = await import("@/lib/prisma");
  const cfg = await prisma.zohoConfig.findUnique({
    where: { orgId: token.orgId as string },
    select: { clientId: true },
  });
  if (!cfg?.clientId) {
    return NextResponse.json({ error: "Save your Zoho Client ID and Secret first." }, { status: 400 });
  }

  const origin = new URL(req.url).origin;
  const callbackUrl = `${origin}/api/zoho/callback`;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: cfg.clientId,
    scope: SCOPES,
    redirect_uri: callbackUrl,
    access_type: "offline",
    state: token.orgId as string,
  });

  return NextResponse.redirect(`https://accounts.zoho.com/oauth/v2/auth?${params.toString()}`);
}
