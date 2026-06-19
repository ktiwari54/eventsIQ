import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const SCOPES = "ZohoCRM.modules.leads.READ";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prisma } = await import("@/lib/prisma");
  const cfg = await prisma.zohoConfig.findUnique({
    where: { orgId: token.orgId as string },
    select: { clientId: true, dataCenter: true },
  });
  if (!cfg?.clientId) {
    return NextResponse.json({ error: "Save your Zoho Client ID and Secret first." }, { status: 400 });
  }

  const origin = new URL(req.url).origin;
  const xHost = req.headers.get("x-forwarded-host");
  const xProto = req.headers.get("x-forwarded-proto") ?? "https";
  const derivedOrigin = xHost ? `${xProto}://${xHost}` : origin;
  const callbackUrl = process.env.ZOHO_REDIRECT_URI ?? `${derivedOrigin}/api/zoho/callback`;

  // Build params without scope to avoid URLSearchParams encoding commas as %2C
  const params = new URLSearchParams({
    response_type: "code",
    client_id: cfg.clientId,
    redirect_uri: callbackUrl,
    access_type: "offline",
    state: token.orgId as string,
  });

  const dc = cfg.dataCenter ?? "com";
  return NextResponse.redirect(`https://accounts.zoho.${dc}/oauth/v2/auth?${params.toString()}&scope=${SCOPES}`);
}
