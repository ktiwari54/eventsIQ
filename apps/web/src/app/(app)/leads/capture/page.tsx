"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiSend } from "@/lib/client";
import type { ParsedCard } from "@/server/ocr";

interface LeadForm {
  name: string;
  company: string;
  designation: string;
  email: string;
  phone: string;
  city: string;
  interestedBrands: string;
}

const EMPTY: LeadForm = {
  name: "",
  company: "",
  designation: "",
  email: "",
  phone: "",
  city: "",
  interestedBrands: "",
};

export default function CaptureLeadPage() {
  const router = useRouter();
  const [form, setForm] = useState<LeadForm>(EMPTY);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof LeadForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      setScanning(true);
      try {
        const { card } = await apiSend<{ card: ParsedCard }>("/api/leads/ocr", "POST", {
          image: dataUrl,
        });
        setConfidence(card.confidence);
        setForm((f) => ({
          ...f,
          name: card.name ?? f.name,
          company: card.company ?? f.company,
          designation: card.designation ?? f.designation,
          email: card.email ?? f.email,
          phone: card.phone ?? f.phone,
          city: card.city ?? f.city,
        }));
        if (card.confidence === 0)
          setError("OCR unavailable (set OPENAI_API_KEY). Enter details manually.");
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setScanning(false);
      }
    };
    reader.readAsDataURL(file);
  }

  async function save() {
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiSend("/api/leads", "POST", {
        name: form.name,
        company: form.company || undefined,
        designation: form.designation || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        city: form.city || undefined,
        interestedBrands: form.interestedBrands
          ? form.interestedBrands.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        source: preview ? "BUSINESS_CARD_OCR" : "MANUAL",
      });
      router.push("/leads");
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">＋ Capture Lead</h1>
      <div className="grid md:grid-cols-2 gap-4 max-w-4xl">
        {/* Business card scanner */}
        <div className="card">
          <h2 className="text-sm font-bold mb-3">📇 Business Card Scan</h2>
          <label className="block border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-accent transition-colors">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="card" className="max-h-40 mx-auto rounded" />
            ) : (
              <span className="text-muted text-sm">
                📷 Tap to upload or photograph a business card
              </span>
            )}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
          </label>
          {scanning && <p className="text-accent text-sm mt-3">🔍 Scanning card…</p>}
          {confidence !== null && !scanning && confidence > 0 && (
            <p className="text-green text-sm mt-3">
              ✓ Extracted with {Math.round(confidence * 100)}% confidence — review & edit below.
            </p>
          )}
        </div>

        {/* Editable form */}
        <div className="card">
          <h2 className="text-sm font-bold mb-3">Lead Details</h2>
          <div className="flex flex-col gap-2">
            {(
              [
                ["name", "Name *"],
                ["company", "Company"],
                ["designation", "Designation"],
                ["email", "Email"],
                ["phone", "Phone"],
                ["city", "City"],
                ["interestedBrands", "Interested Brands (comma-separated)"],
              ] as [keyof LeadForm, string][]
            ).map(([k, label]) => (
              <input
                key={k}
                className="bg-surface border border-border rounded-lg px-3 py-2 text-sm"
                placeholder={label}
                value={form[k]}
                onChange={(e) => set(k, e.target.value)}
              />
            ))}
          </div>
          {error && <p className="text-danger text-sm mt-3">{error}</p>}
          <button className="btn btn-primary w-full mt-4" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save & Score Lead"}
          </button>
        </div>
      </div>
    </div>
  );
}
