import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const reqUrl = req.url;
  const origin = new URL(req.url).origin;
  const host = req.headers.get("host") ?? "";
  const xForwardedHost = req.headers.get("x-forwarded-host") ?? "";
  const xForwardedProto = req.headers.get("x-forwarded-proto") ?? "";

  const derivedOrigin = xForwardedHost
    ? `${xForwardedProto || "https"}://${xForwardedHost}`
    : origin;

  return NextResponse.json({
    redirectUri: `${derivedOrigin}/api/zoho/callback`,
    debug: { reqUrl, origin, host, xForwardedHost, xForwardedProto, derivedOrigin },
  });
}
