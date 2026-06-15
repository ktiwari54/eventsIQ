"use client";

export default function ZohoPage() {
  return (
    <div>
      <h1 className="text-lg font-bold mb-4">🔗 Zoho CRM</h1>
      <div className="rounded-lg p-4 mb-4 text-sm bg-green/5 border border-green/40">
        <b>✓ OAuth2 connection ready.</b> Configure client credentials in the org
        settings to enable real-time bidirectional sync. Webhook endpoint:
        <code className="text-accent"> /api/zoho/webhook?orgId=…</code>
      </div>
      <div className="card">
        <h2 className="text-sm font-bold mb-3">Sync capabilities</h2>
        <ul className="text-sm text-muted list-disc pl-5 space-y-1">
          <li>Entities: Leads, Contacts, Accounts, Deals, Tasks, Notes</li>
          <li>Outbound sync queued via BullMQ with exponential-backoff retries</li>
          <li>Inbound webhooks: Lead Created/Updated, Deal Won/Lost</li>
          <li>Full sync log persisted in <code>ZohoSyncLog</code> for the sync dashboard</li>
        </ul>
      </div>
    </div>
  );
}
