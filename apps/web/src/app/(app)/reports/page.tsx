"use client";

const TYPES = [
  { type: "events", label: "📅 Event Report" },
  { type: "leads", label: "👥 Lead Report" },
  { type: "roi", label: "📈 ROI Report" },
  { type: "vendors", label: "📦 Vendor Report" },
];

export default function ReportsPage() {
  return (
    <div>
      <h1 className="text-lg font-bold mb-4">📄 Reports</h1>
      <div className="grid md:grid-cols-2 gap-3">
        {TYPES.map((r) => (
          <div key={r.type} className="card">
            <div className="font-bold mb-3">{r.label}</div>
            <div className="flex gap-2">
              <a className="btn btn-ghost" href={`/api/reports/export/csv?type=${r.type}`}>📋 CSV</a>
              <a className="btn btn-ghost" href={`/api/reports/export/excel?type=${r.type}`}>📊 Excel</a>
              <a className="btn btn-ghost" href={`/api/reports/export/pdf?type=${r.type}`}>📄 PDF</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
