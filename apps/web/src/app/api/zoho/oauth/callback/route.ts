import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";

// GET /api/zoho/oauth/callback — exchange the authorization code for tokens and
// persist them (per org) in ZohoConfig. Then redirect back to the Zoho page.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const orgId = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) return redirectBack(req, `error=${encodeURIComponent(error)}`);
  if (!code || !orgId) return redirectBack(req, "error=missing_code");

  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  if (!clientId || !clientSecret) return redirectBack(req, "error=not_configured");

  const redirectUri =
    process.env.ZOHO_REDIRECT_URI ?? `${url.origin}/api/zoho/oauth/callback`;
  const accountsBase = process.env.ZOHO_ACCOUNTS_URL ?? "https://accounts.zoho.com";

  const tokenParams = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  });

  try {
    const res = await fetch(`${accountsBase}/oauth/v2/token?${tokenParams.toString()}`, {
      method: "POST",
    });
    const data = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      api_domain?: string;
      error?: string;
    };
    if (!res.ok || data.error || !data.access_token) {
      return redirectBack(req, `error=${encodeURIComponent(data.error ?? "token_exchange_failed")}`);
    }

    // Encrypt credentials at rest (AES-256-GCM when ENCRYPTION_KEY is set).
    const enc = {
      clientSecret: encryptSecret(clientSecret),
      refreshToken: data.refresh_token ? encryptSecret(data.refresh_token) : undefined,
      accessToken: encryptSecret(data.access_token),
      apiDomain: data.api_domain ?? "https://www.zohoapis.com",
      expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
      connected: true,
    };
    await prisma.zohoConfig.upsert({
      where: { orgId },
      create: { orgId, clientId, ...enc },
      update: { clientId, ...enc },
    });

    return redirectBack(req, "connected=1");
  } catch {
    return redirectBack(req, "error=exception");
  }
}

function redirectBack(req: NextRequest, query: string): NextResponse {
  return NextResponse.redirect(`${new URL(req.url).origin}/zoho?${query}`);
}
