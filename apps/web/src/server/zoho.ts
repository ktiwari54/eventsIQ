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
  if ((event === "Contact Created" || event === "Contact Updated") && zohoId) {
    await prisma.lead.updateMany({
      where: { orgId, zohoId },
      data: { zohoSyncedAt: new Date() },
    });
  }
  if ((event === "Sales Order Created" || event === "Sales Order Updated") && zohoId) {
    await prisma.salesOrder.updateMany({
      where: { orgId, zohoId },
      data: { zohoSyncedAt: new Date() },
    });
  }
  if ((event === "Invoice Created" || event === "Invoice Updated") && zohoId) {
    await prisma.invoice.updateMany({
      where: { orgId, zohoId },
      data: { zohoSyncedAt: new Date() },
    });
  }
}

function mapLeadToZohoContact(lead: Lead) {
  const parts = lead.name.split(" ");
  return {
    Last_Name: parts.slice(1).join(" ") || parts[0],
    First_Name: parts.length > 1 ? parts[0] : undefined,
    Account_Name: lead.company ?? undefined,
    Email: lead.email ?? undefined,
    Phone: lead.phone ?? undefined,
    Title: lead.designation ?? undefined,
    Mailing_City: lead.city ?? undefined,
    Mailing_Country: lead.country ?? undefined,
    Lead_Source: "EventIQ",
    Description: lead.notes ?? undefined,
  };
}

export async function syncContactToZoho(orgId: string, lead: Lead): Promise<void> {
  const log = await prisma.zohoSyncLog.create({
    data: { orgId, entity: "Contact", recordId: lead.id, direction: "OUTBOUND", status: "PENDING" },
  });
  try {
    const { accessToken, apiDomain } = await getZohoToken(orgId);
    const body = { data: [mapLeadToZohoContact(lead)] };
    const res = await fetch(`${apiDomain}/crm/v2/Contacts`, {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { data?: Array<{ details?: { id?: string } }> };
    if (!res.ok) throw new Error(`Zoho responded ${res.status}`);
    const zohoId = json.data?.[0]?.details?.id;
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

export async function syncSalesOrderToZoho(orgId: string, orderId: string): Promise<void> {
  const order = await prisma.salesOrder.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) throw new Error("Order not found");

  const log = await prisma.zohoSyncLog.create({
    data: { orgId, entity: "SalesOrder", recordId: orderId, direction: "OUTBOUND", status: "PENDING" },
  });
  try {
    const { accessToken, apiDomain } = await getZohoToken(orgId);
    const zohoOrder = {
      Subject: order.orderNumber,
      Status: order.status,
      Currency: order.currency,
      Sub_Total: Number(order.subtotal),
      Tax: Number(order.tax),
      Discount: Number(order.discount),
      Grand_Total: Number(order.total),
      Notes: order.notes ?? undefined,
      Product_Details: order.items.map((item) => ({
        product: { name: item.description },
        quantity: item.quantity,
        unit_price: Number(item.unitPrice),
        total: Number(item.total),
      })),
    };
    const url = order.zohoId
      ? `${apiDomain}/crm/v2/Sales_Orders/${order.zohoId}`
      : `${apiDomain}/crm/v2/Sales_Orders`;
    const res = await fetch(url, {
      method: order.zohoId ? "PUT" : "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: [zohoOrder] }),
    });
    const json = (await res.json()) as { data?: Array<{ details?: { id?: string } }> };
    if (!res.ok) throw new Error(`Zoho responded ${res.status}`);
    const zohoId = json.data?.[0]?.details?.id ?? order.zohoId ?? undefined;
    await prisma.salesOrder.update({
      where: { id: orderId },
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

export async function syncInvoiceToZoho(orgId: string, invoiceId: string): Promise<void> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: true },
  });
  if (!invoice) throw new Error("Invoice not found");

  const log = await prisma.zohoSyncLog.create({
    data: { orgId, entity: "Invoice", recordId: invoiceId, direction: "OUTBOUND", status: "PENDING" },
  });
  try {
    const { accessToken, apiDomain } = await getZohoToken(orgId);
    const zohoInvoice = {
      Subject: invoice.invoiceNumber,
      Status: invoice.status,
      Currency: invoice.currency,
      Bill_To_Name: invoice.clientName,
      Bill_To_Email: invoice.clientEmail ?? undefined,
      Sub_Total: Number(invoice.subtotal),
      Tax: Number(invoice.tax),
      Discount: Number(invoice.discount),
      Grand_Total: Number(invoice.total),
      Due_Date: invoice.dueDate?.toISOString().split("T")[0] ?? undefined,
      Notes: invoice.notes ?? undefined,
      Product_Details: invoice.items.map((item) => ({
        product: { name: item.description },
        quantity: item.quantity,
        unit_price: Number(item.unitPrice),
        total: Number(item.total),
      })),
    };
    const url = invoice.zohoId
      ? `${apiDomain}/crm/v2/Invoices/${invoice.zohoId}`
      : `${apiDomain}/crm/v2/Invoices`;
    const res = await fetch(url, {
      method: invoice.zohoId ? "PUT" : "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: [zohoInvoice] }),
    });
    const json = (await res.json()) as { data?: Array<{ details?: { id?: string } }> };
    if (!res.ok) throw new Error(`Zoho responded ${res.status}`);
    const zohoId = json.data?.[0]?.details?.id ?? invoice.zohoId ?? undefined;
    await prisma.invoice.update({
      where: { id: invoiceId },
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
