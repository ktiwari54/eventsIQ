"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/client";

interface Lead {
  id: string;
  name: string;
  company: string | null;
  score: number;
  grade: string;
  heat: string;
  aiSuggestion: string | null;
  event: { name: string } | null;
}

const GRADE_PILL: Record<string, string> = {
  A_PLUS: "bg-green/20 text-green",
  A: "bg-green/20 text-green",
  B: "bg-gold/20 text-gold",
  C: "bg-purple/20 text-purple",
  D: "bg-danger/20 text-danger",
};

export default function LeadsPage() {
  const [grade, setGrade] = useState("");
  const [heat, setHeat] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["leads", grade, heat],
    queryFn: () =>
      apiGet<{ items: Lead[]; total: number }>(
        `/api/leads?${new URLSearchParams({ ...(grade && { grade }), ...(heat && { heat }) })}`,
      ),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold">👥 Leads {data ? `(${data.total})` : ""}</h1>
        <div className="flex gap-2">
          <Link href="/leads/capture" className="btn btn-primary">＋ Capture Lead</Link>
          <select className="bg-card border border-border rounded-lg px-3 py-2 text-sm" value={grade} onChange={(e) => setGrade(e.target.value)}>
            <option value="">All grades</option>
            {["A_PLUS", "A", "B", "C", "D"].map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <select className="bg-card border border-border rounded-lg px-3 py-2 text-sm" value={heat} onChange={(e) => setHeat(e.target.value)}>
            <option value="">All heat</option>
            {["HOT", "WARM", "COLD"].map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
      </div>

      <div className="card overflow-x-auto">
        {isLoading ? (
          <p className="text-muted">Loading…</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted uppercase text-[10px]">
                <th className="py-2">Name</th>
                <th>Company</th>
                <th>Score</th>
                <th>Grade</th>
                <th>Heat</th>
                <th>AI Suggestion</th>
                <th>Event</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((l) => (
                <tr key={l.id} className="border-t border-border/40">
                  <td className="py-2 font-semibold">{l.name}</td>
                  <td>{l.company}</td>
                  <td className="font-bold">{l.score}</td>
                  <td><span className={`pill ${GRADE_PILL[l.grade]}`}>{l.grade}</span></td>
                  <td>{l.heat}</td>
                  <td className="text-accent">{l.aiSuggestion}</td>
                  <td>{l.event?.name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
