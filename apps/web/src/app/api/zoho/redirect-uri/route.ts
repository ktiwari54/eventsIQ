import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  return NextResponse.json({ redirectUri: `${origin}/api/zoho/callback` });
}
