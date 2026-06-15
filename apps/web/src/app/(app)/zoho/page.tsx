"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { apiGet } from "@/lib/client";

interface SyncData {
  connected: boolean;
  apiDomain?: string;
  stats: { success: number; failed: number; pending: number };
  logs: { id: string; entity: string; direction: string; status: string; error: string | null; createdAt: string }[];
}

export default function ZohoPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <ZohoDashboard />
    </Suspense>
  );
}

function ZohoDashboard() {
  const params = useSearchParams();
  const justConnected = params.get("connected") === "1";
  const oauthError = params.get("error");

  const { data, isLoading } = useQuery({
    queryKey: ["zoho-sync"],
    queryFn: () => apiGet<SyncData>("/api/zoho/sync-log"),
    refetchInterval: 15000,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold">🔗 Zoho CRM</h1>
        <a href="/api/zoho/oauth/authorize" className="btn btn-primary">
          {data?.connected ? "Reconnect" : "Connect Zoho"}
        </a>
      </div>

      {justConnected && (
        <div className="rounded-lg p-3 mb-4 text-sm bg-green/5 border border-green/40">✓ Zoho connected successfully.</div>
      )}
      {oauthError && (
        <div className="rounded-lg p-3 mb-4 text-sm bg-danger/5 border border-danger/40">Connection failed: {oauthError}</div>
      )}

      <div className={`rounded-lg p-4 mb-4 text-sm border ${data?.connected ? "bg-green/5 border-green/40" : "bg-card border-border"}`}>
        {isLoading ? (
          "Loading…"
        ) : data?.connected ? (
          <><b>✓ Connected</b> · API domain: {data.apiDomain}</>
        ) : (
          <><b>Not connected.</b> Set <code>ZOHO_CLIENT_ID</code> / <code>ZOHO_CLIENT_SECRET</code>, then click Connect Zoho to authorize OAuth2.</>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Stat label="Synced" value={data?.stats.success ?? 0} color="text-green" />
        <Stat label="Pending" value={data?.stats.pending ?? 0} color="text-gold" />
        <Stat label="Failed" value={data?.stats.failed ?? 0} color="text-danger" />
      </div>

      <div className="card">
        <h2 className="text-sm font-bold mb-3">Sync Log</h2>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted uppercase text-[10px]">
              <th className="py-1">Time</th><th>Entity</th><th>Direction</th><th>Status</th><th>Error</th>
            </tr>
          </thead>
          <tbody>
            {data?.logs.map((l) => (
              <tr key={l.id} className="border-t border-border/40">
                <td className="py-1">{new Date(l.createdAt).toLocaleTimeString()}</td>
                <td>{l.entity}</td>
                <td>{l.direction}</td>
                <td><span className={`pill ${l.status === "SUCCESS" ? "bg-green/20 text-green" : l.status === "FAILED" ? "bg-danger/20 text-danger" : "bg-gold/20 text-gold"}`}>{l.status}</span></td>
                <td className="text-danger">{l.error ?? ""}</td>
              </tr>
            ))}
            {!data?.logs.length && <tr><td colSpan={5} className="text-muted py-2">No sync activity yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card">
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${color}`}>{value}</div>
    </div>
  );
}
