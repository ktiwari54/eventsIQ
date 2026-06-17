"use client";

import { use, useEffect, useState } from "react";
import { FormFieldType } from "@prisma/client";

type FormField = {
  id: string;
  label: string;
  fieldType: FormFieldType;
  placeholder: string | null;
  required: boolean;
  options: string[] | null;
  order: number;
};

type FormData = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  fields: FormField[];
  _count: { submissions: number };
};

const FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: "TEXT", label: "Text" },
  { value: "EMAIL", label: "Email" },
  { value: "PHONE", label: "Phone" },
  { value: "NUMBER", label: "Number" },
  { value: "TEXTAREA", label: "Text Area" },
  { value: "SELECT", label: "Select / Dropdown" },
  { value: "CHECKBOX", label: "Checkbox" },
];

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg text-sm font-semibold shadow-lg z-50 ${type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
      {msg}
    </div>
  );
}

export default function FormBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingField, setAddingField] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const [editMeta, setEditMeta] = useState({ name: "", description: "" });
  const [newField, setNewField] = useState({
    label: "",
    fieldType: "TEXT" as FormFieldType,
    placeholder: "",
    required: false,
    options: "",
  });

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    fetch(`/api/forms/${id}`)
      .then((r) => r.json())
      .then((d: FormData) => {
        setForm(d);
        setEditMeta({ name: d.name, description: d.description ?? "" });
        setLoading(false);
      });
  }, [id]);

  async function saveMeta(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/forms/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editMeta),
      });
      if (!res.ok) { showToast("Failed to save.", "error"); return; }
      setForm((f) => f ? { ...f, ...editMeta } : f);
      showToast("Form saved.", "success");
    } finally { setSaving(false); }
  }

  async function addField(e: React.FormEvent) {
    e.preventDefault();
    setAddingField(true);
    try {
      const options = newField.fieldType === "SELECT"
        ? newField.options.split("\n").map((o) => o.trim()).filter(Boolean)
        : undefined;
      const res = await fetch(`/api/forms/${id}/fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newField.label,
          fieldType: newField.fieldType,
          placeholder: newField.placeholder || undefined,
          required: newField.required,
          options,
          order: (form?.fields.length ?? 0),
        }),
      });
      if (!res.ok) { showToast("Failed to add field.", "error"); return; }
      const field: FormField = await res.json();
      setForm((f) => f ? { ...f, fields: [...f.fields, field] } : f);
      setNewField({ label: "", fieldType: "TEXT", placeholder: "", required: false, options: "" });
      showToast("Field added.", "success");
    } finally { setAddingField(false); }
  }

  async function moveField(fieldId: string, direction: "up" | "down") {
    if (!form) return;
    const idx = form.fields.findIndex((f) => f.id === fieldId);
    if (idx === -1) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === form.fields.length - 1) return;

    const newFields = [...form.fields];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    [newFields[idx], newFields[swapIdx]] = [newFields[swapIdx], newFields[idx]];
    const reordered = newFields.map((f, i) => ({ ...f, order: i }));
    setForm((fm) => fm ? { ...fm, fields: reordered } : fm);

    await fetch(`/api/forms/${id}/fields`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reordered.map((f) => ({ id: f.id, order: f.order }))),
    });
  }

  if (loading) return <div className="text-muted">Loading…</div>;
  if (!form) return <div className="text-muted">Form not found.</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white">{form.name}</h1>
          <p className="text-muted text-sm mt-1">Form Builder · <span className="font-mono">{form.slug}</span> · {form._count.submissions} submissions</p>
        </div>
        <a href="/forms" className="btn btn-ghost text-sm">← Back to Forms</a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: field list */}
        <div>
          <div className="card mb-4">
            <h2 className="font-bold text-white mb-4">Form Details</h2>
            <form onSubmit={saveMeta} className="space-y-3">
              <div>
                <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">Form Name</label>
                <input className="input w-full" value={editMeta.name} onChange={(e) => setEditMeta((m) => ({ ...m, name: e.target.value }))} required />
              </div>
              <div>
                <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">Description</label>
                <textarea className="input w-full" rows={2} value={editMeta.description} onChange={(e) => setEditMeta((m) => ({ ...m, description: e.target.value }))} />
              </div>
              <button type="submit" disabled={saving} className="btn btn-primary text-sm disabled:opacity-50">
                {saving ? "Saving…" : "Save Details"}
              </button>
            </form>
          </div>

          <div className="card">
            <h2 className="font-bold text-white mb-4">Fields ({form.fields.length})</h2>
            {form.fields.length === 0 ? (
              <p className="text-muted text-sm">No fields yet. Add fields on the right.</p>
            ) : (
              <div className="space-y-2">
                {form.fields.map((field, idx) => (
                  <div key={field.id} className="flex items-center gap-2 p-3 bg-surface rounded-lg border border-border">
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => moveField(field.id, "up")} disabled={idx === 0} className="text-muted hover:text-white disabled:opacity-30 text-xs leading-none">▲</button>
                      <button onClick={() => moveField(field.id, "down")} disabled={idx === form.fields.length - 1} className="text-muted hover:text-white disabled:opacity-30 text-xs leading-none">▼</button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-semibold">{field.label}</div>
                      <div className="text-muted text-xs">{field.fieldType}{field.required ? " · required" : ""}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: add field */}
        <div className="card">
          <h2 className="font-bold text-white mb-4">Add Field</h2>
          <form onSubmit={addField} className="space-y-4">
            <div>
              <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">Label</label>
              <input className="input w-full" value={newField.label} onChange={(e) => setNewField((f) => ({ ...f, label: e.target.value }))} required placeholder="e.g. Full Name" />
            </div>
            <div>
              <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">Field Type</label>
              <select className="input w-full" value={newField.fieldType} onChange={(e) => setNewField((f) => ({ ...f, fieldType: e.target.value as FormFieldType }))}>
                {FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">Placeholder</label>
              <input className="input w-full" value={newField.placeholder} onChange={(e) => setNewField((f) => ({ ...f, placeholder: e.target.value }))} placeholder="Optional placeholder text" />
            </div>
            {newField.fieldType === "SELECT" && (
              <div>
                <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">Options (one per line)</label>
                <textarea className="input w-full" rows={4} value={newField.options} onChange={(e) => setNewField((f) => ({ ...f, options: e.target.value }))} placeholder={"Option 1\nOption 2\nOption 3"} />
              </div>
            )}
            <div className="flex items-center gap-2">
              <input type="checkbox" id="required" checked={newField.required} onChange={(e) => setNewField((f) => ({ ...f, required: e.target.checked }))} className="w-4 h-4" />
              <label htmlFor="required" className="text-sm text-white">Required field</label>
            </div>
            <button type="submit" disabled={addingField} className="btn btn-primary disabled:opacity-50">
              {addingField ? "Adding…" : "Add Field"}
            </button>
          </form>
        </div>
      </div>

      {toast && <Toast {...toast} />}
    </div>
  );
}
