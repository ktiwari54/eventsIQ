"use client";

import { useEffect, useState } from "react";

type OrderItem = { id: string; description: string; quantity: number; unitPrice: string; total: string };
type SalesOrder = {
  id: string;
  orderNumber: string;
  status: string;
  currency: string;
  total: string;
  subtotal: string;
  tax: string;
  discount: string;
  leadId: string | null;
  eventId: string | null;
  notes: string | null;
  createdAt: string;
  items: OrderItem[];
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-700 text-muted",
  CONFIRMED: "bg-blue-500/20 text-blue-400",
  PROCESSING: "bg-yellow-500/20 text-yellow-400",
  DELIVERED: "bg-green-500/20 text-green-400",
  CANCELLED: "bg-red-500/20 text-red-400",
};

type NewItem = { description: string; quantity: number; unitPrice: number };

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg text-sm font-semibold shadow-lg z-50 ${type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
      {msg}
    </div>
  );
}

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [creating, setCreating] = useState(false);

  const [newOrder, setNewOrder] = useState({ currency: "USD", tax: 0, discount: 0, notes: "" });
  const [items, setItems] = useState<NewItem[]>([{ description: "", quantity: 1, unitPrice: 0 }]);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function loadOrders() {
    const res = await fetch("/api/sales-orders");
    const data = await res.json();
    setOrders(data);
    setLoading(false);
  }

  useEffect(() => { loadOrders(); }, []);

  async function createOrder(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/sales-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newOrder, items }),
      });
      if (!res.ok) { showToast("Failed to create order.", "error"); return; }
      setShowModal(false);
      setNewOrder({ currency: "USD", tax: 0, discount: 0, notes: "" });
      setItems([{ description: "", quantity: 1, unitPrice: 0 }]);
      showToast("Order created.", "success");
      await loadOrders();
    } finally { setCreating(false); }
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/sales-orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setOrders((os) => os.map((o) => o.id === id ? { ...o, status } : o));
  }

  async function deleteOrder(id: string) {
    if (!confirm("Delete this order?")) return;
    await fetch(`/api/sales-orders/${id}`, { method: "DELETE" });
    setOrders((os) => os.filter((o) => o.id !== id));
    showToast("Order deleted.", "success");
  }

  const totalOrders = orders.length;
  const confirmed = orders.filter((o) => o.status === "CONFIRMED" || o.status === "DELIVERED").length;
  const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  function addItem() { setItems((is) => [...is, { description: "", quantity: 1, unitPrice: 0 }]); }
  function removeItem(idx: number) { setItems((is) => is.filter((_, i) => i !== idx)); }
  function updateItem(idx: number, key: keyof NewItem, value: string | number) {
    setItems((is) => is.map((item, i) => i === idx ? { ...item, [key]: value } : item));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-white">Sales Orders</h1>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">+ New Order</button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Orders", value: totalOrders },
          { label: "Confirmed", value: confirmed },
          { label: "Total Revenue", value: `$${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}` },
          { label: "Avg Order Value", value: `$${avgOrderValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}` },
        ].map((kpi) => (
          <div key={kpi.label} className="card">
            <div className="text-muted text-xs uppercase tracking-wide font-semibold mb-1">{kpi.label}</div>
            <div className="text-2xl font-extrabold text-white">{kpi.value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : orders.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">📦</div>
          <h2 className="font-bold text-white mb-2">No sales orders yet</h2>
          <button onClick={() => setShowModal(true)} className="btn btn-primary mt-2">+ New Order</button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-muted font-semibold">Order #</th>
                <th className="text-left px-4 py-3 text-muted font-semibold">Status</th>
                <th className="text-right px-4 py-3 text-muted font-semibold">Total</th>
                <th className="text-left px-4 py-3 text-muted font-semibold">Created</th>
                <th className="text-right px-4 py-3 text-muted font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-border hover:bg-surface/50">
                  <td className="px-4 py-3 font-mono text-accent text-xs">{order.orderNumber}</td>
                  <td className="px-4 py-3">
                    <select
                      value={order.status}
                      onChange={(e) => updateStatus(order.id, e.target.value)}
                      className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer ${STATUS_COLORS[order.status] ?? "bg-slate-700 text-muted"}`}
                    >
                      {["DRAFT","CONFIRMED","PROCESSING","DELIVERED","CANCELLED"].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-white">{order.currency} {Number(order.total).toFixed(2)}</td>
                  <td className="px-4 py-3 text-muted">{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => deleteOrder(order.id)} className="btn btn-ghost text-xs text-red-400 hover:text-red-300">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Order Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4 overflow-y-auto">
          <div className="card w-full max-w-lg my-8">
            <h2 className="font-bold text-white text-lg mb-4">New Sales Order</h2>
            <form onSubmit={createOrder} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">Currency</label>
                  <input className="input w-full" value={newOrder.currency} onChange={(e) => setNewOrder((o) => ({ ...o, currency: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">Tax</label>
                  <input type="number" min="0" step="0.01" className="input w-full" value={newOrder.tax} onChange={(e) => setNewOrder((o) => ({ ...o, tax: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">Discount</label>
                  <input type="number" min="0" step="0.01" className="input w-full" value={newOrder.discount} onChange={(e) => setNewOrder((o) => ({ ...o, discount: Number(e.target.value) }))} />
                </div>
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
                <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">Notes</label>
                <textarea className="input w-full" rows={2} value={newOrder.notes} onChange={(e) => setNewOrder((o) => ({ ...o, notes: e.target.value }))} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={creating} className="btn btn-primary disabled:opacity-50">
                  {creating ? "Creating…" : "Create Order"}
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
