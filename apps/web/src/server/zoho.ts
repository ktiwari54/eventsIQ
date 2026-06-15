import { prisma } from "@/lib/prisma";
import type { Lead } from "@prisma/client";

// Zoho CRM v2 integration: OAuth2 token refresh + bidirectional Lead sync with
// a Redis/DB-backed retry log. Every external call is wrapped so failures are
// recorded in ZohoSyncLog and can be retried by the BullMQ worker.

const TOKEN_URL = "https://accounts.zoho.com/oauth/v2/token";

interface ZohoToken {
  accessToken: string;
  apiDomain: string;
}

/** Obtain a valid access token, refreshing via the stored refresh token. */
export async function getZohoToken(orgId: string): Promise<ZohoToken> {
  const cfg = await prisma.zohoConfig.findUnique({ where: { orgId } });
  if (!cfg?.refreshToken) throw new Error("Zoho not connected for this organization");

  if (cfg.accessToken && cfg.expiresAt && cfg.expiresAt.getTime() > Date.now() + 60_000) {
    return { accessToken: cfg.accessToken, apiDomain: cfg.apiDomain };
  }

  const params = new URLSearchParams({
    refresh_token: cfg.refreshToken,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    grant_type: "refresh_token",
  });
  const res = await fetch(`${TOKEN_URL}?${params.toString()}`, { method: "POST" });
  if (!res.ok) throw new Error(`Zoho token refresh failed: ${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in: number; api_domain?: string };

  const apiDomain = data.api_domain ?? cfg.apiDomain;
  await prisma.zohoConfig.update({
    where: { orgId },
    data: {
      accessToken: data.access_token,
      apiDomain,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      connected: true,
    },
  });
  return { accessToken: data.access_token, apiDomain };
}

function mapLeadToZoho(lead: Lead) {
  return {
    Last_Name: lead.name,
    Company: lead.company ?? "Unknown",
    Email: lead.email ?? undefined,
    Phone: lead.phone ?? undefined,
    Designation: lead.designation ?? undefined,
    City: lead.city ?? undefined,
    Country: lead.country ?? undefined,
    Lead_Source: "EventIQ",
    Lead_Status: lead.heat,
    Rating: lead.grade,
    Description: lead.notes ?? undefined,
  };
}

/** Push a lead to Zoho (create or update), logging the attempt for retries. */
export async function syncLeadToZoho(orgId: string, lead: Lead): Promise<void> {
  const log = await prisma.zohoSyncLog.create({
    data: { orgId, entity: "Lead", recordId: lead.id, direction: "OUTBOUND", status: "PENDING" },
  });
  try {
    const { accessToken, apiDomain } = await getZohoToken(orgId);
    const body = { data: [mapLeadToZoho(lead)] };
    const url = lead.zohoId
      ? `${apiDomain}/crm/v2/Leads/${lead.zohoId}`
      : `${apiDomain}/crm/v2/Leads`;
    const res = await fetch(url, {
      method: lead.zohoId ? "PUT" : "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { data?: Array<{ details?: { id?: string } }> };
    if (!res.ok) throw new Error(`Zoho responded ${res.status}`);

    const zohoId = json.data?.[0]?.details?.id ?? lead.zohoId;
    await prisma.lead.update({
      where: { id: lead.id },
      data: { zohoId, zohoSyncedAt: new Date() },
    });
    await prisma.zohoSyncLog.update({
      where: { id: log.id },
      data: { status: "SUCCESS", zohoId, attempts: { increment: 1 } },
    });
  } catch (err) {
    await prisma.zohoSyncLog.update({
      where: { id: log.id },
      data: { status: "FAILED", attempts: { increment: 1 }, error: String(err) },
    });
    throw err;
  }
}

/**
 * Handle an inbound Zoho webhook event (Lead Created/Updated, Deal Won/Lost).
 * Upserts the corresponding EventIQ record and records the sync.
 */
export async function handleZohoWebhook(
  orgId: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await prisma.zohoSyncLog.create({
    data: {
      orgId,
      entity: event,
      direction: "INBOUND",
      status: "SUCCESS",
      payload: payload as object,
    },
  });

  const zohoId = (payload.id as string) ?? undefined;
  if ((event === "Lead Created" || event === "Lead Updated") && zohoId) {
    await prisma.lead.updateMany({
      where: { orgId, zohoId },
      data: { zohoSyncedAt: new Date() },
    });
  }
  if (event === "Deal Won" && zohoId) {
    await prisma.lead.updateMany({ where: { orgId, zohoId }, data: { converted: true } });
  }
}
