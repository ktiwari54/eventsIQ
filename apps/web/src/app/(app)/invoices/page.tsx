"use client";

import { useEffect, useState } from "react";

type InvoiceItem = { id: string; description: string; quantity: number; unitPrice: string; total: string };
type Invoice = {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string | null;
  status: string;
  currency: string;
  total: string;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
  notes: string | null;
  salesOrderId: string | null;
  items: InvoiceItem[];
};

type Summary = { totalPaid: number | string; totalOutstanding: number | string };

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-700 text-muted",
  SENT: "bg-blue-500/20 text-blue-400",
  PAID: "bg-green-500/20 text-green-400",
  OVERDUE: "bg-red-500/20 text-red-400",
  CANCELLED: "bg-slate-600 text-muted",
};

type NewItem = { description: string; quantity: number; unitPrice: number };
type TabFilter = "ALL" | "DRAFT" | "SENT" | "PAID" | "OVERDUE";

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg text-sm font-semibold shadow-lg z-50 ${type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
      {msg}
    </div>
  );
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalPaid: 0, totalOutstanding: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabFilter>("ALL");
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const [newInv, setNewInv] = useState({ clientName: "", clientEmail: "", currency: "USD", tax: 0, discount: 0, dueDate: "", notes: "", salesOrderId: "" });
  const [items, setItems] = useState<NewItem[]>([{ description: "", quantity: 1, unitPrice: 0 }]);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function loadInvoices() {
    const res = await fetch("/api/invoices");
    const data = await res.json();
    setInvoices(data.invoices);
    setSummary(data.summary);
    setLoading(false);
  }

  useEffect(() => { loadInvoices(); }, []);

  async function createInvoice(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newInv,
          dueDate: newInv.dueDate ? new Date(newInv.dueDate).toISOString() : undefined,
          salesOrderId: newInv.salesOrderId || undefined,
          clientEmail: newInv.clientEmail || undefined,
          items,
        }),
      });
      if (!res.ok) { showToast("Failed to create invoice.", "error"); return; }
      setShowModal(false);
      setNewInv({ clientName: "", clientEmail: "", currency: "USD", tax: 0, discount: 0, dueDate: "", notes: "", salesOrderId: "" });
      setItems([{ description: "", quantity: 1, unitPrice: 0 }]);
      showToast("Invoice created.", "success");
      await loadInvoices();
    } finally { setCreating(false); }
  }

  async function markPaid(id: string) {
    await fetch(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAID" }),
    });
    setInvoices((is) => is.map((inv) => inv.id === id ? { ...inv, status: "PAID", paidAt: new Date().toISOString() } : inv));
    showToast("Invoice marked as paid.", "success");
  }

  async function deleteInvoice(id: string) {
    if (!confirm("Delete this invoice?")) return;
    await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    setInvoices((is) => is.filter((inv) => inv.id !== id));
    showToast("Invoice deleted.", "success");
  }

  function addItem() { setItems((is) => [...is, { description: "", quantity: 1, unitPrice: 0 }]); }
  function removeItem(idx: number) { setItems((is) => is.filter((_, i) => i !== idx)); }
  function updateItem(idx: number, key: keyof NewItem, value: string | number) {
    setItems((is) => is.map((item, i) => i === idx ? { ...item, [key]: value } : item));
  }

  const totalInvoiced = invoices.reduce((s, inv) => s + Number(inv.total), 0);
  const filtered = tab === "ALL" ? invoices : invoices.filter((inv) => inv.status === tab);
  const tabs: TabFilter[] = ["ALL", "DRAFT", "SENT", "PAID", "OVERDUE"];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-white">Invoices</h1>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">+ New Invoice</button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Invoiced", value: `$${Number(totalInvoiced).toLocaleString("en-US", { minimumFractionDigits: 2 })}` },
          { label: "Paid", value: `$${Number(summary.totalPaid).toLocaleString("en-US", { minimumFractionDigits: 2 })}` },
          { label: "Outstanding", value: `$${Number(summary.totalOutstanding).toLocaleString("en-US", { minimumFractionDigits: 2 })}` },
        ].map((kpi) => (
          <div key={kpi.label} className="card">
            <div className="text-muted text-xs uppercase tracking-wide font-semibold mb-1">{kpi.label}</div>
            <div className="text-2xl font-extrabold text-white">{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-card border border-border rounded-xl p-1 mb-4 w-fit">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${tab === t ? "bg-accent text-white" : "text-muted hover:text-white"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">🧾</div>
          <h2 className="font-bold text-white mb-2">No invoices{tab !== "ALL" ? ` with status ${tab}` : ""}</h2>
          {tab === "ALL" && <button onClick={() => setShowModal(true)} className="btn btn-primary mt-2">+ New Invoice</button>}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-muted font-semibold">Invoice #</th>
                <th className="text-left px-4 py-3 text-muted font-semibold">Client</th>
                <th className="text-left px-4 py-3 text-muted font-semibold">Status</th>
                <th className="text-right px-4 py-3 text-muted font-semibold">Total</th>
                <th className="text-left px-4 py-3 text-muted font-semibold">Due Date</th>
                <th className="text-right px-4 py-3 text-muted font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id} className="border-b border-border hover:bg-surface/50">
                  <td className="px-4 py-3 font-mono text-accent text-xs">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3">
                    <div className="text-white font-semibold">{inv.clientName}</div>
                    {inv.clientEmail && <div className="text-muted text-xs">{inv.clientEmail}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLORS[inv.status] ?? "bg-slate-700 text-muted"}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-white">{inv.currency} {Number(inv.total).toFixed(2)}</td>
                  <td className="px-4 py-3 text-muted">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                    {inv.status !== "PAID" && inv.status !== "CANCELLED" && (
                      <button onClick={() => markPaid(inv.id)} className="btn btn-ghost text-xs text-green-400 hover:text-green-300">Mark Paid</button>
                    )}
                    <button onClick={() => deleteInvoice(inv.id)} className="btn btn-ghost text-xs text-red-400 hover:text-red-300">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Invoice Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4 overflow-y-auto">
          <div className="card w-full max-w-lg my-8">
            <h2 className="font-bold text-white text-lg mb-4">New Invoice</h2>
            <form onSubmit={createInvoice} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">Client Name</label>
                  <input className="input w-full" value={newInv.clientName} onChange={(e) => setNewInv((i) => ({ ...i, clientName: e.target.value }))} required />
                </div>
                <div>
                  <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">Client Email</label>
                  <input type="email" className="input w-full" value={newInv.clientEmail} onChange={(e) => setNewInv((i) => ({ ...i, clientEmail: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">Currency</label>
                  <input className="input w-full" value={newInv.currency} onChange={(e) => setNewInv((i) => ({ ...i, currency: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">Tax</label>
                  <input type="number" min="0" step="0.01" className="input w-full" value={newInv.tax} onChange={(e) => setNewInv((i) => ({ ...i, tax: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">Discount</label>
                  <input type="number" min="0" step="0.01" className="input w-full" value={newInv.discount} onChange={(e) => setNewInv((i) => ({ ...i, discount: Number(e.target.value) }))} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">Due Date</label>
                <input type="date" className="input w-full" value={newInv.dueDate} onChange={(e) => setNewInv((i) => ({ ...i, dueDate: e.target.value }))} />
              </div>

              <div>
                <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-2 block">Line Items</label>
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input className="input flex-1" placeholder="Description" value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} required />
                      <input type="number" min="1" className="input w-16" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} />
                      <input type="number" min="0" step="0.01" className="input w-24" placeholder="Price" value={item.unitPrice} onChange={(e) => updateItem(idx, "unitPrice", Number(e.target.value))} />
                      {items.length > 1 && (
                        <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-300 text-sm px-2">✕</button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addItem} className="btn btn-ghost text-xs mt-2">+ Add Item</button>
              </div>

              <div>
                <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">Link to Sales Order (optional)</label>
                <input className="input w-full font-mono text-xs" value={newInv.salesOrderId} onChange={(e) => setNewInv((i) => ({ ...i, salesOrderId: e.target.value }))} placeholder="Sales Order ID" />
              </div>

              <div>
                <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">Notes</label>
                <textarea className="input w-full" rows={2} value={newInv.notes} onChange={(e) => setNewInv((i) => ({ ...i, notes: e.target.value }))} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={creating} className="btn btn-primary disabled:opacity-50">
                  {creating ? "Creating…" : "Create Invoice"}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <Toast {...toast} />}
    </div>
  );
}
