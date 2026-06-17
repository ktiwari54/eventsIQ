"use client";

import { useEffect, useState } from "react";

type FormItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  _count: { submissions: number };
};

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg text-sm font-semibold shadow-lg z-50 ${type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
      {msg}
    </div>
  );
}

export default function FormsPage() {
  const [forms, setForms] = useState<FormItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", description: "" });
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function loadForms() {
    const res = await fetch("/api/forms");
    const data = await res.json();
    setForms(data);
    setLoading(false);
  }

  useEffect(() => { loadForms(); }, []);

  async function createForm(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newForm),
      });
      if (!res.ok) { showToast("Failed to create form.", "error"); return; }
      setShowModal(false);
      setNewForm({ name: "", description: "" });
      showToast("Form created.", "success");
      await loadForms();
    } finally { setCreating(false); }
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/forms/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    setForms((fs) => fs.map((f) => f.id === id ? { ...f, active: !active } : f));
  }

  async function deleteForm(id: string) {
    if (!confirm("Delete this form? This cannot be undone.")) return;
    await fetch(`/api/forms/${id}`, { method: "DELETE" });
    setForms((fs) => fs.filter((f) => f.id !== id));
    showToast("Form deleted.", "success");
  }

  function copyEmbed(slug: string) {
    const snippet = `<script src="${typeof window !== "undefined" ? window.location.origin : ""}/embed.js" data-form="${slug}"></script>`;
    navigator.clipboard.writeText(snippet);
    showToast("Embed code copied!", "success");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-white">Forms</h1>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">+ New Form</button>
      </div>

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : forms.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">📋</div>
          <h2 className="font-bold text-white mb-2">No forms yet</h2>
          <p className="text-muted text-sm mb-4">Create your first embeddable lead capture form.</p>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">+ New Form</button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-muted font-semibold">Name</th>
                <th className="text-left px-4 py-3 text-muted font-semibold">Slug</th>
                <th className="text-center px-4 py-3 text-muted font-semibold">Submissions</th>
                <th className="text-center px-4 py-3 text-muted font-semibold">Active</th>
                <th className="text-right px-4 py-3 text-muted font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {forms.map((form) => (
                <tr key={form.id} className="border-b border-border hover:bg-surface/50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white">{form.name}</div>
                    {form.description && <div className="text-muted text-xs mt-0.5">{form.description}</div>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{form.slug}</td>
                  <td className="px-4 py-3 text-center text-white">{form._count.submissions}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(form.id, form.active)}
                      className={`text-xs px-2 py-1 rounded-full font-semibold ${form.active ? "bg-green-500/20 text-green-400" : "bg-slate-700 text-muted"}`}
                    >
                      {form.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                    <button onClick={() => copyEmbed(form.slug)} className="btn btn-ghost text-xs">Embed</button>
                    <a href={`/forms/${form.id}`} className="btn btn-ghost text-xs">Edit</a>
                    <button onClick={() => deleteForm(form.id)} className="btn btn-ghost text-xs text-red-400 hover:text-red-300">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4">
          <div className="card w-full max-w-md">
            <h2 className="font-bold text-white text-lg mb-4">New Form</h2>
            <form onSubmit={createForm} className="space-y-4">
              <div>
                <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">Form Name</label>
                <input
                  className="input w-full"
                  value={newForm.name}
                  onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  placeholder="e.g. Lead Capture Form"
                />
              </div>
              <div>
                <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">Description (optional)</label>
                <textarea
                  className="input w-full"
                  rows={3}
                  value={newForm.description}
                  onChange={(e) => setNewForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description of this form"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={creating} className="btn btn-primary disabled:opacity-50">
                  {creating ? "Creating…" : "Create Form"}
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
