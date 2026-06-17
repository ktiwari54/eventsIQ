"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

type Config = { clientId?: string; apiDomain?: string; connected: boolean };
type SyncResult = { synced: number; failed: number; total: number } | null;

const MODULES = [
  { key: "leads", label: "Leads", icon: "👥", desc: "Push unsynced leads to Zoho CRM Leads module." },
  { key: "contacts", label: "Contacts", icon: "📇", desc: "Push leads with email as Zoho CRM Contacts." },
  { key: "sales-orders", label: "Sales Orders", icon: "🛒", desc: "Push unsynced sales orders to Zoho CRM." },
  { key: "invoices", label: "Invoices", icon: "📄", desc: "Push unsynced invoices to Zoho CRM Invoices module." },
] as const;

type ModuleKey = typeof MODULES[number]["key"];

function Toast({ msg, type, onClose }: { msg: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg text-sm font-semibold shadow-lg z-50 flex items-center gap-2 ${type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
      {msg}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">✕</button>
    </div>
  );
}

function ZohoPageInner() {
  const params = useSearchParams();
  const [cfg, setCfg] = useState<Config>({ connected: false });
  const [form, setForm] = useState({ clientId: "", clientSecret: "" });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, SyncResult>>({});
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [copied, setCopied] = useState(false);

  const showToast = useCallback((msg: string, type: "success" | "error") => setToast({ msg, type }), []);

  const redirectUri = typeof window !== "undefined"
    ? `${window.location.origin}/api/zoho/callback`
    : "/api/zoho/callback";

  function copyRedirectUri() {
    navigator.clipboard.writeText(redirectUri).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  useEffect(() => {
    fetch("/api/zoho/config").then((r) => r.json()).then((d: Config) => {
      setCfg(d);
      if (d.clientId) setForm((f) => ({ ...f, clientId: d.clientId ?? "" }));
    });
    if (params.get("connected") === "1") showToast("Zoho CRM connected successfully!", "success");
    if (params.get("error")) showToast(`Connection failed: ${params.get("error")}`, "error");
  }, [params, showToast]);

  async function saveConfig(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/zoho/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? "Failed to save config.", "error"); return; }
      setCfg((c) => ({ ...c, clientId: form.clientId }));
      showToast("Config saved. Now click Connect to authorize.", "success");
    } finally { setSaving(false); }
  }

  async function syncModule(key: ModuleKey) {
    setSyncing((s) => ({ ...s, [key]: true }));
    setResults((r) => ({ ...r, [key]: null }));
    try {
      const res = await fetch(`/api/zoho/sync/${key}`, { method: "POST" });
      const data = await res.json() as SyncResult;
      setResults((r) => ({ ...r, [key]: data }));
      if (data && data.failed === 0) showToast(`${data.synced} ${key} synced to Zoho.`, "success");
      else if (data) showToast(`${data.synced} synced, ${data.failed} failed.`, "error");
    } catch {
      showToast("Sync failed. Check your connection.", "error");
    } finally {
      setSyncing((s) => ({ ...s, [key]: false }));
    }
  }

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/zoho/webhook?orgId=YOUR_ORG_ID`
    : "/api/zoho/webhook?orgId=YOUR_ORG_ID";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-white">🔗 Zoho CRM</h1>
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${cfg.connected ? "bg-green-500/20 text-green-400" : "bg-slate-700 text-muted"}`}>
          {cfg.connected ? "● Connected" : "● Not connected"}
        </span>
      </div>

      {/* Redirect URI box — must be set in Zoho before connecting */}
      <div className="card mb-6 border-accent/40 bg-accent/5">
        <div className="flex items-start gap-3">
          <span className="text-2xl mt-0.5">⚙️</span>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-white mb-1">Before you connect — add this Redirect URI in Zoho</h2>
            <p className="text-muted text-xs mb-3">
              Go to <strong className="text-white">api-console.zoho.com</strong> → your client → Edit → Authorized Redirect URIs → paste exactly:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 min-w-0 text-accent text-xs bg-bg border border-accent/30 rounded-lg px-3 py-2 break-all font-mono">
                {redirectUri}
              </code>
              <button
                onClick={copyRedirectUri}
                className="btn btn-primary text-xs shrink-0 px-3"
              >
                {copied ? "Copied ✓" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Credentials */}
        <div className="card">
          <h2 className="font-bold text-white mb-4">Step 1 — App credentials</h2>
          <p className="text-muted text-xs mb-4">
            Create a <strong className="text-white">Server-based OAuth app</strong> in the Zoho API Console, paste the Redirect URI above, then enter your credentials here.
          </p>
          <form onSubmit={saveConfig} className="space-y-3">
            <div>
              <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">Client ID</label>
              <input className="input w-full" value={form.clientId} onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))} required placeholder="1000.XXXX..." />
            </div>
            <div>
              <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">Client Secret</label>
              <input className="input w-full" type="password" value={form.clientSecret} onChange={(e) => setForm((f) => ({ ...f, clientSecret: e.target.value }))} placeholder="••••••••" />
            </div>
            <button type="submit" disabled={saving} className="btn btn-primary disabled:opacity-50 text-sm">
              {saving ? "Saving…" : "Save Credentials"}
            </button>
          </form>
        </div>

        {/* OAuth connect */}
        <div className="card">
          <h2 className="font-bold text-white mb-4">Step 2 — Authorize access</h2>
          <p className="text-muted text-sm mb-4">
            After saving credentials, click below to authorize EventIQ to access your Zoho CRM data.
            You will be redirected to Zoho and back automatically.
          </p>
          <p className="text-muted text-xs mb-1">Scopes requested:</p>
          <ul className="text-xs text-muted list-disc pl-4 mb-4 space-y-0.5">
            <li>Leads — read/write</li>
            <li>Contacts — read/write</li>
            <li>Sales Orders — read/write</li>
            <li>Invoices — read/write</li>
            <li>Deals — read/write</li>
          </ul>
          <a
            href={cfg.clientId ? "/api/zoho/auth" : undefined}
            className={`btn btn-primary text-sm inline-block ${!cfg.clientId ? "opacity-40 pointer-events-none" : ""}`}
          >
            {cfg.connected ? "Re-authorize Zoho →" : "Connect with Zoho →"}
          </a>
          {!cfg.clientId && (
            <p className="text-xs text-muted mt-2">Save your credentials first.</p>
          )}
        </div>
      </div>

      {/* Sync modules */}
      <h2 className="text-lg font-bold text-white mb-3">Sync modules</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {MODULES.map((mod) => {
          const r = results[mod.key];
          return (
            <div key={mod.key} className="card flex flex-col gap-3">
              <div>
                <div className="text-2xl mb-1">{mod.icon}</div>
                <h3 className="font-bold text-white text-sm">{mod.label}</h3>
                <p className="text-muted text-xs mt-1">{mod.desc}</p>
              </div>
              {r && (
                <div className={`text-xs px-2 py-1.5 rounded ${r.failed === 0 ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                  {r.synced}/{r.total} synced{r.failed > 0 ? `, ${r.failed} failed` : ""}
                </div>
              )}
              <button
                onClick={() => syncModule(mod.key)}
                disabled={!cfg.connected || syncing[mod.key]}
                className="btn btn-primary text-xs disabled:opacity-40 mt-auto"
              >
                {syncing[mod.key] ? "Syncing…" : "Sync Now"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Webhook info */}
      <div className="card">
        <h2 className="font-bold text-white mb-2">Inbound webhook (Zoho → EventIQ)</h2>
        <p className="text-muted text-sm mb-3">
          Configure this URL in Zoho CRM under <span className="text-white">Setup → Developer Space → Notifications</span> to receive real-time events (Lead Created, Deal Won, etc.).
        </p>
        <div className="flex items-center gap-2">
          <code className="text-accent text-xs bg-surface border border-border rounded px-3 py-2 flex-1 break-all">{webhookUrl}</code>
        </div>
        <p className="text-xs text-muted mt-2">
          Set <code className="text-accent">ZOHO_WEBHOOK_SECRET</code> env var to enable HMAC signature verification.
        </p>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default function ZohoPage() {
  return (
    <Suspense>
      <ZohoPageInner />
    </Suspense>
  );
}
