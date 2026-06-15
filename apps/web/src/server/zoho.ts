import { prisma } from "@/lib/prisma";
import { notify } from "./notifications";
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
    await notify({
      orgId,
      type: "zoho",
      title: "Zoho sync failed",
      body: `Lead "${lead.name}" — ${String(err).slice(0, 120)}`,
      link: "/zoho",
    });
    throw err;
  }
}

// ----------------------------------------------------------------------------
// Contacts & Accounts (outbound) + Deals (inbound) — deeper bidirectional sync
// ----------------------------------------------------------------------------

async function zohoUpsert(
  orgId: string,
  module: "Contacts" | "Accounts",
  record: Record<string, unknown>,
  zohoId?: string | null,
): Promise<string | undefined> {
  const log = await prisma.zohoSyncLog.create({
    data: { orgId, entity: module, direction: "OUTBOUND", status: "PENDING" },
  });
  try {
    const { accessToken, apiDomain } = await getZohoToken(orgId);
    const url = zohoId ? `${apiDomain}/crm/v2/${module}/${zohoId}` : `${apiDomain}/crm/v2/${module}`;
    const res = await fetch(url, {
      method: zohoId ? "PUT" : "POST",
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ data: [record] }),
    });
    const json = (await res.json()) as { data?: Array<{ details?: { id?: string } }> };
    if (!res.ok) throw new Error(`Zoho ${module} responded ${res.status}`);
    const newId = json.data?.[0]?.details?.id ?? zohoId ?? undefined;
    await prisma.zohoSyncLog.update({
      where: { id: log.id },
      data: { status: "SUCCESS", zohoId: newId, attempts: { increment: 1 } },
    });
    return newId;
  } catch (err) {
    await prisma.zohoSyncLog.update({
      where: { id: log.id },
      data: { status: "FAILED", attempts: { increment: 1 }, error: String(err) },
    });
    return undefined;
  }
}

/** Push a lead as a Zoho Contact under its Company's Account. */
export async function syncContactToZoho(orgId: string, lead: Lead): Promise<void> {
  if (lead.company) {
    await zohoUpsert(orgId, "Accounts", { Account_Name: lead.company });
  }
  await zohoUpsert(orgId, "Contacts", {
    Last_Name: lead.name,
    Account_Name: lead.company ?? undefined,
    Email: lead.email ?? undefined,
    Phone: lead.phone ?? undefined,
    Title: lead.designation ?? undefined,
  });
}

/**
 * Pull recently-modified Deals from Zoho and reconcile won/lost status onto the
 * matching local leads. A lightweight inbound full-sync used by the worker.
 */
export async function pullDealsFromZoho(orgId: string): Promise<{ processed: number }> {
  const log = await prisma.zohoSyncLog.create({
    data: { orgId, entity: "Deal", direction: "INBOUND", status: "PENDING" },
  });
  try {
    const { accessToken, apiDomain } = await getZohoToken(orgId);
    const res = await fetch(`${apiDomain}/crm/v2/Deals?fields=Deal_Name,Stage,Contact_Name&per_page=200`, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });
    if (!res.ok) throw new Error(`Zoho Deals responded ${res.status}`);
    const json = (await res.json()) as {
      data?: Array<{ Stage?: string; Contact_Name?: { id?: string } }>;
    };
    const deals = json.data ?? [];
    let processed = 0;
    for (const deal of deals) {
      const won = /won/i.test(deal.Stage ?? "");
      const contactId = deal.Contact_Name?.id;
      if (won && contactId) {
        const r = await prisma.lead.updateMany({ where: { orgId, zohoId: contactId }, data: { converted: true } });
        processed += r.count;
      }
    }
    await prisma.zohoSyncLog.update({ where: { id: log.id }, data: { status: "SUCCESS", attempts: { increment: 1 } } });
    return { processed };
  } catch (err) {
    await prisma.zohoSyncLog.update({
      where: { id: log.id },
      data: { status: "FAILED", attempts: { increment: 1 }, error: String(err) },
    });
    return { processed: 0 };
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
  // Contact/Account updates: stamp the matching lead as freshly synced.
  if ((event === "Contact Created" || event === "Contact Updated" || event === "Account Updated") && zohoId) {
    await prisma.lead.updateMany({ where: { orgId, zohoId }, data: { zohoSyncedAt: new Date() } });
  }
  if (event === "Deal Won" && zohoId) {
    await prisma.lead.updateMany({ where: { orgId, zohoId }, data: { converted: true } });
  }
  if (event === "Deal Lost" && zohoId) {
    await prisma.lead.updateMany({ where: { orgId, zohoId }, data: { converted: false } });
  }
}
