import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const orgId = searchParams.get("state");
  const zohoError = searchParams.get("error");

  const origin = new URL(req.url).origin;
  const xHost = req.headers.get("x-forwarded-host");
  const xProto = req.headers.get("x-forwarded-proto") ?? "https";
  const derivedOrigin = xHost ? `${xProto}://${xHost}` : origin;

  if (zohoError) {
    return NextResponse.redirect(`${derivedOrigin}/zoho?error=${encodeURIComponent(zohoError)}`);
  }

  if (!code || !orgId) {
    return NextResponse.redirect(`${derivedOrigin}/zoho?error=missing_params`);
  }

  const cfg = await prisma.zohoConfig.findUnique({
    where: { orgId },
    select: { clientId: true, clientSecret: true },
  });
  if (!cfg) {
    return NextResponse.redirect(`${derivedOrigin}/zoho?error=not_configured`);
  }

  const callbackUrl = process.env.ZOHO_REDIRECT_URI ?? `${derivedOrigin}/api/zoho/callback`;
  const params = new URLSearchParams({
    code,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    redirect_uri: callbackUrl,
    grant_type: "authorization_code",
  });

  const res = await fetch(`https://accounts.zoho.com/oauth/v2/token?${params.toString()}`, {
    method: "POST",
  });

  if (!res.ok) {
    return NextResponse.redirect(`${derivedOrigin}/zoho?error=token_failed`);
  }

  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    api_domain?: string;
  };

  if (!data.refresh_token) {
    return NextResponse.redirect(`${derivedOrigin}/zoho?error=no_refresh_token`);
  }

  await prisma.zohoConfig.update({
    where: { orgId },
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      apiDomain: data.api_domain ?? "https://www.zohoapis.com",
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
      connected: true,
    },
  });

  return NextResponse.redirect(`${derivedOrigin}/zoho?connected=1`);
}
