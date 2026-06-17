import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const orgId = searchParams.get("state");

  const origin = new URL(req.url).origin;

  if (!code || !orgId) {
    return NextResponse.redirect(`${origin}/zoho?error=missing_params`);
  }

  const cfg = await prisma.zohoConfig.findUnique({
    where: { orgId },
    select: { clientId: true, clientSecret: true },
  });
  if (!cfg) {
    return NextResponse.redirect(`${origin}/zoho?error=not_configured`);
  }

  const callbackUrl = `${origin}/api/zoho/callback`;
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
    return NextResponse.redirect(`${origin}/zoho?error=token_failed`);
  }

  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    api_domain?: string;
  };

  if (!data.refresh_token) {
    return NextResponse.redirect(`${origin}/zoho?error=no_refresh_token`);
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

  return NextResponse.redirect(`${origin}/zoho?connected=1`);
}
