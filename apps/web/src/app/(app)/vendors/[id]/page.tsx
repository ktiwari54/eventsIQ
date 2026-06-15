"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import { apiGet, apiSend } from "@/lib/client";

interface VendorDetail {
  vendor: {
    id: string;
    name: string;
    vendorType: string;
    city: string | null;
    gstNumber: string | null;
    rating: number;
    evaluations: { id: string; quality: number; timeline: number; cost: number; comment: string | null; createdAt: string }[];
    expenses: { id: string; amount: string; description: string | null; event: { name: string } }[];
  };
  scorecard: { quality: number; timeline: number; cost: number; overall: number; evaluationCount: number };
  history: { totalSpend: number; eventsServed: number };
}

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [form, setForm] = useState({ quality: 4, timeline: 4, cost: 4, comment: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["vendor", id],
    queryFn: () => apiGet<VendorDetail>(`/api/vendors/${id}`),
  });

  const addEval = useMutation({
    mutationFn: () => apiSend(`/api/vendors/${id}/evaluations`, "POST", form),
    onSuccess: () => {
      setForm({ quality: 4, timeline: 4, cost: 4, comment: "" });
      qc.invalidateQueries({ queryKey: ["vendor", id] });
    },
  });

  if (isLoading || !data) return <p className="text-muted">Loading…</p>;
  const { vendor, scorecard, history } = data;

  return (
    <div>
      <h1 className="text-lg font-bold mb-1">{vendor.name}</h1>
      <p className="text-muted text-xs mb-4">
        {vendor.vendorType} · {vendor.city ?? "—"} {vendor.gstNumber ? `· GST ${vendor.gstNumber}` : ""}
      </p>

      {/* Scorecard */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <ScoreTile label="Overall" value={scorecard.overall} color="text-gold" suffix="/5" />
        <ScoreTile label="Quality" value={scorecard.quality} suffix="/5" />
        <ScoreTile label="Timeline (SLA)" value={scorecard.timeline} suffix="/5" />
        <ScoreTile label="Cost" value={scorecard.cost} suffix="/5" />
        <ScoreTile label="Evaluations" value={scorecard.evaluationCount} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* New evaluation */}
        <div className="card">
          <h2 className="text-sm font-bold mb-3">➕ New Evaluation</h2>
          {(["quality", "timeline", "cost"] as const).map((k) => (
            <label key={k} className="block text-xs text-muted mb-2 capitalize">
              {k}: {form[k]}
              <input
                type="range"
                min={1}
                max={5}
                value={form[k]}
                onChange={(e) => setForm((f) => ({ ...f, [k]: Number(e.target.value) }))}
                className="w-full"
              />
            </label>
          ))}
          <textarea
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm w-full mb-3"
            placeholder="Comment (optional)"
            rows={2}
            value={form.comment}
            onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
          />
          <button className="btn btn-primary w-full" disabled={addEval.isPending} onClick={() => addEval.mutate()}>
            {addEval.isPending ? "Saving…" : "Submit Evaluation"}
          </button>
        </div>

        {/* History */}
        <div className="card">
          <h2 className="text-sm font-bold mb-3">📈 Performance History</h2>
          <p className="text-sm mb-1">Events served: <b>{history.eventsServed}</b></p>
          <p className="text-sm mb-3">Total spend: <b>₹{(history.totalSpend / 100000).toFixed(1)}L</b></p>
          <div className="text-xs text-muted mb-1">Recent evaluations</div>
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
            {vendor.evaluations.map((e) => (
              <div key={e.id} className="text-xs border-t border-border/40 py-1">
                Q{e.quality} · T{e.timeline} · C{e.cost}
                {e.comment ? <span className="text-muted"> — {e.comment}</span> : ""}
              </div>
            ))}
            {!vendor.evaluations.length && <p className="text-muted text-xs">No evaluations yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreTile({ label, value, color = "text-accent", suffix = "" }: { label: string; value: number; color?: string; suffix?: string }) {
  return (
    <div className="card">
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${color}`}>{value}{suffix}</div>
    </div>
  );
}
