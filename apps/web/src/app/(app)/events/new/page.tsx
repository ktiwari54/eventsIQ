"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiSend } from "@/lib/client";

const EVENT_TYPES = [
  "TRADE_SHOW",
  "EXHIBITION",
  "CONFERENCE",
  "BRAND_LAUNCH",
  "ROADSHOW",
  "WEBINAR",
];

export default function NewEventPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    type: "TRADE_SHOW",
    city: "",
    country: "",
    venue: "",
    startDate: "",
    endDate: "",
    expectedLeads: "",
    expectedRevenue: "",
    budgetTotal: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    if (!form.name.trim() || !form.startDate || !form.endDate) {
      setError("Name, start date and end date are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiSend("/api/events", "POST", {
        name: form.name,
        type: form.type,
        city: form.city || undefined,
        country: form.country || undefined,
        venue: form.venue || undefined,
        startDate: form.startDate,
        endDate: form.endDate,
        expectedLeads: form.expectedLeads ? Number(form.expectedLeads) : 0,
        expectedRevenue: form.expectedRevenue ? Number(form.expectedRevenue) : 0,
        budgetTotal: form.budgetTotal ? Number(form.budgetTotal) : 0,
      });
      router.push("/events");
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">＋ New Event</h1>
      <div className="card max-w-lg flex flex-col gap-3">
        <input
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm"
          placeholder="Event Name *"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
        />
        <select
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm"
          value={form.type}
          onChange={(e) => set("type", e.target.value)}
        >
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace("_", " ")}
            </option>
          ))}
        </select>
        <input
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm"
          placeholder="City"
          value={form.city}
          onChange={(e) => set("city", e.target.value)}
        />
        <input
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm"
          placeholder="Country"
          value={form.country}
          onChange={(e) => set("country", e.target.value)}
        />
        <input
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm"
          placeholder="Venue"
          value={form.venue}
          onChange={(e) => set("venue", e.target.value)}
        />
        <div className="flex gap-3">
          <input
            type="date"
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm flex-1"
            value={form.startDate}
            onChange={(e) => set("startDate", e.target.value)}
          />
          <input
            type="date"
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm flex-1"
            value={form.endDate}
            onChange={(e) => set("endDate", e.target.value)}
          />
        </div>
        <input
          type="number"
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm"
          placeholder="Expected Leads"
          value={form.expectedLeads}
          onChange={(e) => set("expectedLeads", e.target.value)}
        />
        <input
          type="number"
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm"
          placeholder="Expected Revenue (₹)"
          value={form.expectedRevenue}
          onChange={(e) => set("expectedRevenue", e.target.value)}
        />
        <input
          type="number"
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm"
          placeholder="Budget Total (₹)"
          value={form.budgetTotal}
          onChange={(e) => set("budgetTotal", e.target.value)}
        />
        {error && <p className="text-danger text-sm">{error}</p>}
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Create Event"}
        </button>
      </div>
    </div>
  );
}