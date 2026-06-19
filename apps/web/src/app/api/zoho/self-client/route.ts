import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

const schema = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  authCode: z.string().min(1),
  dataCenter: z.enum(["com", "in", "eu", "com.au", "jp"]).default("com"),
});

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { clientId, clientSecret, authCode, dataCenter } = parsed.data;

  // Exchange auth code — Self Client doesn't use redirect_uri
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code: authCode,
  });

  const tokenRes = await fetch(`https://accounts.zoho.${dataCenter}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = await tokenRes.json() as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    api_domain?: string;
    error?: string;
  };

  if (!tokenRes.ok || data.error) {
    return NextResponse.json(
      { error: data.error ?? "Token exchange failed", zohoResponse: data },
      { status: 400 }
    );
  }

  if (!data.refresh_token) {
    return NextResponse.json(
      { error: "No refresh_token returned — make sure auth code is fresh and access_type=offline", zohoResponse: data },
      { status: 400 }
    );
  }

  const { prisma } = await import("@/lib/prisma");

  await prisma.zohoConfig.upsert({
    where: { orgId: token.orgId as string },
    create: {
      orgId: token.orgId as string,
      clientId,
      clientSecret,
      dataCenter,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      apiDomain: data.api_domain ?? "https://www.zohoapis.com",
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
      connected: true,
    },
    update: {
      clientId,
      clientSecret,
      dataCenter,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      apiDomain: data.api_domain ?? "https://www.zohoapis.com",
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
      connected: true,
    },
  });

  return NextResponse.json({ success: true, apiDomain: data.api_domain });
}
