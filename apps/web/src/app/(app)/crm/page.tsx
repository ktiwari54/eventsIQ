"use client";

import { useEffect, useState } from "react";

type SalesforceConfig = { clientId?: string; instanceUrl?: string; connected: boolean };
type DynamicsConfig = { tenantId?: string; clientId?: string; resourceUrl?: string; connected: boolean };

function StatusPill({ connected }: { connected: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${connected ? "bg-green-500/20 text-green-400" : "bg-slate-700 text-muted"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-400" : "bg-slate-500"}`} />
      {connected ? "Connected" : "Not connected"}
    </span>
  );
}

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg text-sm font-semibold shadow-lg z-50 ${type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
      {msg}
    </div>
  );
}

export default function CrmPage() {
  const [sf, setSf] = useState<SalesforceConfig>({ connected: false });
  const [sfForm, setSfForm] = useState({ clientId: "", clientSecret: "", instanceUrl: "" });
  const [sfSaving, setSfSaving] = useState(false);

  const [dyn, setDyn] = useState<DynamicsConfig>({ connected: false });
  const [dynForm, setDynForm] = useState({ tenantId: "", clientId: "", clientSecret: "", resourceUrl: "" });
  const [dynSaving, setDynSaving] = useState(false);

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    fetch("/api/crm/salesforce/config").then((r) => r.json()).then((d: SalesforceConfig) => {
      setSf(d);
      if (d.clientId) setSfForm((f) => ({ ...f, clientId: d.clientId ?? "", instanceUrl: d.instanceUrl ?? "" }));
    });
    fetch("/api/crm/dynamics/config").then((r) => r.json()).then((d: DynamicsConfig) => {
      setDyn(d);
      if (d.clientId) setDynForm((f) => ({ ...f, tenantId: d.tenantId ?? "", clientId: d.clientId ?? "", resourceUrl: d.resourceUrl ?? "" }));
    });
  }, []);

  async function saveSalesforce(e: React.FormEvent) {
    e.preventDefault();
    setSfSaving(true);
    try {
      const res = await fetch("/api/crm/salesforce/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sfForm),
      });
      if (!res.ok) { showToast("Failed to save Salesforce config.", "error"); return; }
      setSf((s) => ({ ...s, clientId: sfForm.clientId, instanceUrl: sfForm.instanceUrl }));
      showToast("Salesforce config saved.", "success");
    } finally { setSfSaving(false); }
  }

  async function saveDynamics(e: React.FormEvent) {
    e.preventDefault();
    setDynSaving(true);
    try {
      const res = await fetch("/api/crm/dynamics/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dynForm),
      });
      if (!res.ok) { showToast("Failed to save Dynamics config.", "error"); return; }
      setDyn((d) => ({ ...d, tenantId: dynForm.tenantId, clientId: dynForm.clientId, resourceUrl: dynForm.resourceUrl }));
      showToast("Dynamics config saved.", "success");
    } finally { setDynSaving(false); }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-white mb-6">CRM Integrations</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Zoho CRM */}
        <div className="card">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="font-bold text-white text-lg">🔗 Zoho CRM</h2>
              <p className="text-muted text-sm mt-1">Sync leads, contacts and deals with Zoho CRM.</p>
            </div>
            <StatusPill connected={false} />
          </div>
          <a href="/settings" className="btn btn-ghost text-sm mt-2 inline-block">Configure in Settings →</a>
        </div>

        {/* Salesforce */}
        <div className="card">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="font-bold text-white text-lg">☁️ Salesforce</h2>
              <p className="text-muted text-sm mt-1">Connect your Salesforce org to sync leads and opportunities.</p>
            </div>
            <StatusPill connected={sf.connected} />
          </div>
          <form onSubmit={saveSalesforce} className="space-y-3 mt-4">
            <div>
              <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">Client ID</label>
              <input className="input w-full" value={sfForm.clientId} onChange={(e) => setSfForm((f) => ({ ...f, clientId: e.target.value }))} required placeholder="Consumer Key" />
            </div>
            <div>
              <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">Client Secret</label>
              <input className="input w-full" type="password" value={sfForm.clientSecret} onChange={(e) => setSfForm((f) => ({ ...f, clientSecret: e.target.value }))} placeholder="Consumer Secret" />
            </div>
            <div>
              <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">Instance URL</label>
              <input className="input w-full" value={sfForm.instanceUrl} onChange={(e) => setSfForm((f) => ({ ...f, instanceUrl: e.target.value }))} placeholder="https://yourorg.salesforce.com" />
            </div>
            <button type="submit" disabled={sfSaving} className="btn btn-primary disabled:opacity-50 text-sm">
              {sfSaving ? "Saving…" : "Save Configuration"}
            </button>
          </form>
        </div>

        {/* Microsoft Dynamics 365 */}
        <div className="card">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="font-bold text-white text-lg">🏢 Microsoft Dynamics 365</h2>
              <p className="text-muted text-sm mt-1">Integrate with Microsoft Dynamics CRM for enterprise pipelines.</p>
            </div>
            <StatusPill connected={dyn.connected} />
          </div>
          <form onSubmit={saveDynamics} className="space-y-3 mt-4">
            <div>
              <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">Tenant ID</label>
              <input className="input w-full" value={dynForm.tenantId} onChange={(e) => setDynForm((f) => ({ ...f, tenantId: e.target.value }))} required placeholder="Azure Tenant ID" />
            </div>
            <div>
              <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">Client ID</label>
              <input className="input w-full" value={dynForm.clientId} onChange={(e) => setDynForm((f) => ({ ...f, clientId: e.target.value }))} required placeholder="App (Client) ID" />
            </div>
            <div>
              <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">Client Secret</label>
              <input className="input w-full" type="password" value={dynForm.clientSecret} onChange={(e) => setDynForm((f) => ({ ...f, clientSecret: e.target.value }))} placeholder="Client Secret Value" />
            </div>
            <div>
              <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">Resource URL</label>
              <input className="input w-full" value={dynForm.resourceUrl} onChange={(e) => setDynForm((f) => ({ ...f, resourceUrl: e.target.value }))} placeholder="https://yourorg.crm.dynamics.com" />
            </div>
            <button type="submit" disabled={dynSaving} className="btn btn-primary disabled:opacity-50 text-sm">
              {dynSaving ? "Saving…" : "Save Configuration"}
            </button>
          </form>
        </div>

        {/* Excel / Google Sheets */}
        <div className="card">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="font-bold text-white text-lg">📊 Excel / Google Sheets</h2>
              <p className="text-muted text-sm mt-1">
                Import leads via CSV upload (available now via Lead Import) or connect via Microsoft Graph API.
              </p>
            </div>
            <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-500/20 text-yellow-400">
              Coming soon
            </span>
          </div>
          <p className="text-muted text-sm">
            Use the <a href="/leads" className="text-accent hover:underline">Lead Import</a> feature to upload CSV files today.
          </p>
        </div>
      </div>
      {toast && <Toast {...toast} />}
    </div>
  );
}
