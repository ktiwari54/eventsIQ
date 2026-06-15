"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiGet, apiSend } from "@/lib/client";

const TYPES = ["EVENT", "LEAD", "ROI", "VENDOR", "BUDGET", "FINANCE"];
const FORMATS = ["PDF", "EXCEL", "CSV"];

interface Schedule {
  id: string;
  name: string;
  type: string;
  format: string;
  cron: string;
  enabled: boolean;
  lastUrl: string | null;
}
interface Run {
  id: string;
  type: string;
  format: string;
  status: string;
  url: string | null;
  rowCount: number;
  createdAt: string;
}

export default function ReportsPage() {
  const qc = useQueryClient();
  const [sched, setSched] = useState({ name: "", type: "ROI", format: "PDF", cron: "0 8 * * 1", recipients: "" });

  const schedules = useQuery({ queryKey: ["schedules"], queryFn: () => apiGet<{ items: Schedule[] }>("/api/reports/schedules") });
  const runs = useQuery({ queryKey: ["runs"], queryFn: () => apiGet<{ items: Run[] }>("/api/reports/runs") });

  const createSchedule = useMutation({
    mutationFn: () =>
      apiSend("/api/reports/schedules", "POST", {
        name: sched.name,
        type: sched.type,
        format: sched.format,
        cron: sched.cron,
        recipients: sched.recipients ? sched.recipients.split(",").map((s) => s.trim()).filter(Boolean) : [],
      }),
    onSuccess: () => {
      setSched({ name: "", type: "ROI", format: "PDF", cron: "0 8 * * 1", recipients: "" });
      qc.invalidateQueries({ queryKey: ["schedules"] });
    },
  });
  const deleteSchedule = useMutation({
    mutationFn: (id: string) => apiSend(`/api/reports/schedules/${id}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedules"] }),
  });
  const runNow = useMutation({
    mutationFn: (v: { type: string; format: string }) => apiSend("/api/reports/runs", "POST", v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["runs"] }),
  });

  const field = "bg-surface border border-border rounded-lg px-3 py-2 text-sm";

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">📄 Reports</h1>

      {/* Instant export */}
      <div className="card mb-4">
        <h2 className="text-sm font-bold mb-3">Instant Export</h2>
        <div className="grid md:grid-cols-3 gap-2">
          {TYPES.map((t) => (
            <div key={t} className="flex items-center gap-2">
              <span className="text-sm w-20">{t}</span>
              <a className="btn btn-ghost !py-1 !px-2" href={`/api/reports/export/pdf?type=${t}`}>PDF</a>
              <a className="btn btn-ghost !py-1 !px-2" href={`/api/reports/export/excel?type=${t}`}>Excel</a>
              <a className="btn btn-ghost !py-1 !px-2" href={`/api/reports/export/csv?type=${t}`}>CSV</a>
            </div>
          ))}
        </div>
      </div>

      {/* Scheduled reports */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="text-sm font-bold mb-3">⏰ Schedule a Report</h2>
          <div className="flex flex-col gap-2">
            <input className={field} placeholder="Schedule name" value={sched.name} onChange={(e) => setSched({ ...sched, name: e.target.value })} />
            <div className="flex gap-2">
              <select className={`${field} flex-1`} value={sched.type} onChange={(e) => setSched({ ...sched, type: e.target.value })}>
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
              <select className={`${field} flex-1`} value={sched.format} onChange={(e) => setSched({ ...sched, format: e.target.value })}>
                {FORMATS.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
            <input className={field} placeholder="Cron (e.g. 0 8 * * 1)" value={sched.cron} onChange={(e) => setSched({ ...sched, cron: e.target.value })} />
            <input className={field} placeholder="Recipient emails (comma-separated)" value={sched.recipients} onChange={(e) => setSched({ ...sched, recipients: e.target.value })} />
            <button className="btn btn-primary" disabled={!sched.name || createSchedule.isPending} onClick={() => createSchedule.mutate()}>
              {createSchedule.isPending ? "Saving…" : "Create Schedule"}
            </button>
          </div>
        </div>

        <div className="card">
          <h2 className="text-sm font-bold mb-3">Active Schedules</h2>
          <div className="flex flex-col gap-2">
            {schedules.data?.items.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm border-t border-border/40 py-1.5">
                <span>
                  <b>{s.name}</b> <span className="text-muted text-xs">· {s.type}/{s.format} · {s.cron}</span>
                </span>
                <div className="flex gap-2">
                  <button className="btn btn-ghost !py-0.5 !px-2 text-xs" onClick={() => runNow.mutate({ type: s.type, format: s.format })}>Run now</button>
                  <button className="text-danger text-xs" onClick={() => deleteSchedule.mutate(s.id)}>Delete</button>
                </div>
              </div>
            ))}
            {!schedules.data?.items.length && <p className="text-muted text-xs">No schedules yet.</p>}
          </div>
        </div>
      </div>

      {/* Run history */}
      <div className="card mt-4">
        <h2 className="text-sm font-bold mb-3">Recent Runs</h2>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted uppercase text-[10px]">
              <th className="py-1">When</th><th>Type</th><th>Format</th><th>Rows</th><th>Status</th><th>File</th>
            </tr>
          </thead>
          <tbody>
            {runs.data?.items.map((r) => (
              <tr key={r.id} className="border-t border-border/40">
                <td className="py-1">{new Date(r.createdAt).toLocaleString()}</td>
                <td>{r.type}</td>
                <td>{r.format}</td>
                <td>{r.rowCount}</td>
                <td><span className={`pill ${r.status === "SUCCESS" ? "bg-green/20 text-green" : r.status === "FAILED" ? "bg-danger/20 text-danger" : "bg-gold/20 text-gold"}`}>{r.status}</span></td>
                <td>{r.url ? <a className="text-accent" href={r.url} target="_blank" rel="noreferrer">Download</a> : "—"}</td>
              </tr>
            ))}
            {!runs.data?.items.length && <tr><td colSpan={6} className="text-muted py-2">No runs yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
