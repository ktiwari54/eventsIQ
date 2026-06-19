import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const SCOPES = "ZohoCRM.modules.ALL";

// GET /api/zoho/auth-debug — shows the OAuth URL without redirecting, for troubleshooting
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

  const params = new URLSearchParams({
    response_type: "code",
    client_id: cfg.clientId,
    scope: SCOPES,
    redirect_uri: callbackUrl,
    access_type: "offline",
    state: token.orgId as string,
  });

  const dc = cfg.dataCenter ?? "com";
  const fullUrl = `https://accounts.zoho.${dc}/oauth/v2/auth?${params.toString()}`;

  return NextResponse.json({
    redirectUri: callbackUrl,
    fullOAuthUrl: fullUrl,
    dataCenter: dc,
    envVarSet: !!process.env.ZOHO_REDIRECT_URI,
    clientId: cfg.clientId,
  });
}
