import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

// GET /api/zoho/oauth/authorize — begin the Zoho OAuth2 consent flow.
// Redirects the user to Zoho's accounts consent screen. The org id is carried
// in `state` so the callback can scope the tokens to the right tenant.
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = process.env.ZOHO_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "ZOHO_CLIENT_ID not configured" }, { status: 400 });
  }

  const redirectUri =
    process.env.ZOHO_REDIRECT_URI ?? `${new URL(req.url).origin}/api/zoho/oauth/callback`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: "ZohoCRM.modules.ALL,ZohoCRM.settings.ALL",
    redirect_uri: redirectUri,
    access_type: "offline",
    prompt: "consent",
    state: token.orgId as string,
  });

  const accountsBase = process.env.ZOHO_ACCOUNTS_URL ?? "https://accounts.zoho.com";
  return NextResponse.redirect(`${accountsBase}/oauth/v2/auth?${params.toString()}`);
}
