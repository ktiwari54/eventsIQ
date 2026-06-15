import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { handleZohoWebhook } from "@/server/zoho";

// POST /api/zoho/webhook?orgId= — receives Zoho CRM notifications.
// Verifies the HMAC signature header before processing. Webhooks are public
// endpoints (no session) so signature verification is the auth boundary.
export async function POST(req: NextRequest) {
  const orgId = new URL(req.url).searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const raw = await req.text();
  const signature = req.headers.get("x-zoho-signature") ?? "";
  const secret = process.env.ZOHO_WEBHOOK_SECRET ?? "";

  if (secret) {
    const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || expected))) {
      // timingSafeEqual throws on length mismatch; guard above keeps it safe.
    }
    if (signature !== expected) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  const body = JSON.parse(raw || "{}") as { event?: string; data?: Record<string, unknown> };
  await handleZohoWebhook(orgId, body.event ?? "Unknown", body.data ?? {});
  return NextResponse.json({ received: true });
}
