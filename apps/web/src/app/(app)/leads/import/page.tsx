"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiGet, apiSend } from "@/lib/client";

interface ImportResult {
  created: number;
  skipped: number;
  errors: string[];
}

const SAMPLE =
  "name,company,designation,email,phone,city,interestedBrands,monthlyPurchaseVolume\n" +
  "Rajan Gupta,Alpha Electronics,Director,rajan@alpha.com,9876543210,Delhi,Samsung;Vivo,4000000\n" +
  "Meena Iyer,TechHub,Manager,meena@techhub.com,9000011111,Mumbai,Apple,1500000";

export default function ImportLeadsPage() {
  const router = useRouter();
  const [csv, setCsv] = useState("");
  const [eventId, setEventId] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const events = useQuery({
    queryKey: ["events-min"],
    queryFn: () => apiGet<{ items: { id: string; name: string }[] }>("/api/events?pageSize=100"),
  });

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsv(reader.result as string);
    reader.readAsText(file);
  }

  async function runImport() {
    if (!csv.trim()) {
      setError("Paste or upload CSV data first");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await apiSend<ImportResult>("/api/leads/import", "POST", {
        csv,
        eventId: eventId || undefined,
      });
      setResult(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const field = "bg-surface border border-border rounded-lg px-3 py-2 text-sm";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold">⬆ Import Leads (CSV)</h1>
        <button className="btn btn-ghost" onClick={() => router.push("/leads")}>← Back to Leads</button>
      </div>

      <div className="card max-w-3xl">
        <div className="flex items-center gap-2 mb-3">
          <label className="btn btn-ghost cursor-pointer">
            📁 Upload CSV
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
          </label>
          <select className={`${field} flex-1`} value={eventId} onChange={(e) => setEventId(e.target.value)}>
            <option value="">Attach to event (optional)…</option>
            {events.data?.items.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
        </div>

        <textarea
          className={`${field} w-full font-mono text-xs`}
          rows={10}
          placeholder={SAMPLE}
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
        />
        <p className="text-muted text-[11px] mt-1">
          Headers (case-insensitive): name*, company, designation, email, phone, city, country,
          interestedBrands (use ; or | to separate), monthlyPurchaseVolume. Each row is AI-scored on import.
        </p>

        {error && <p className="text-danger text-sm mt-2">{error}</p>}

        <div className="flex gap-2 mt-3">
          <button className="btn btn-primary" disabled={busy} onClick={runImport}>
            {busy ? "Importing…" : "Import & Score"}
          </button>
          <button className="btn btn-ghost" onClick={() => setCsv(SAMPLE)}>Load sample</button>
        </div>

        {result && (
          <div className="mt-4 rounded-lg border border-border p-3 text-sm">
            <p className="text-green font-bold">✓ Imported {result.created} leads</p>
            {result.skipped > 0 && <p className="text-gold">⚠ Skipped {result.skipped} rows</p>}
            {result.errors.length > 0 && (
              <ul className="text-muted text-xs mt-2 list-disc pl-5">
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
            <button className="btn btn-ghost mt-3" onClick={() => router.push("/leads")}>View leads →</button>
          </div>
        )}
      </div>
    </div>
  );
}
