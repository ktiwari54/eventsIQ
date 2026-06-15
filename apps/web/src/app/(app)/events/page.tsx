"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/client";

interface EventRow {
  id: string;
  name: string;
  type: string;
  status: string;
  city: string | null;
  expectedRevenue: string;
  _count: { leads: number };
  roiMetric: { roi: number } | null;
}

export default function EventsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: () => apiGet<{ items: EventRow[]; total: number }>("/api/events"),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold">📅 Events {data ? `(${data.total})` : ""}</h1>
        <button className="btn btn-primary">＋ New Event</button>
      </div>
      <div className="card overflow-x-auto">
        {isLoading ? (
          <p className="text-muted">Loading…</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted uppercase text-[10px]">
                <th className="py-2">Event</th>
                <th>Type</th>
                <th>City</th>
                <th>Status</th>
                <th>Leads</th>
                <th>Revenue</th>
                <th>ROI</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((e) => (
                <tr key={e.id} className="border-t border-border/40">
                  <td className="py-2 font-semibold">{e.name}</td>
                  <td>{e.type}</td>
                  <td>{e.city ?? "—"}</td>
                  <td><span className="pill bg-green/20 text-green">{e.status}</span></td>
                  <td>{e._count.leads}</td>
                  <td>₹{(Number(e.expectedRevenue) / 100000).toFixed(1)}L</td>
                  <td>{e.roiMetric ? `${e.roiMetric.roi}x` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
