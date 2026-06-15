"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiGet, apiSend } from "@/lib/client";
import { FileUpload } from "@/components/FileUpload";

interface BudgetRow {
  id: string;
  category: string;
  event: { name: string };
}

// Record an expense with S3-hosted invoice + receipt, rolling the amount into
// the selected budget line's actual spend.
export default function ExpensePage() {
  const router = useRouter();
  const [budgetId, setBudgetId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["budgets-for-expense"],
    queryFn: () => apiGet<{ items: BudgetRow[] }>("/api/budgets"),
  });

  async function save() {
    if (!budgetId || !amount) {
      setError("Select a budget line and enter an amount");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiSend("/api/expenses", "POST", {
        budgetId,
        amount: Number(amount),
        description: description || undefined,
        invoiceUrl: invoiceUrl || undefined,
        receiptUrl: receiptUrl || undefined,
      });
      router.push("/budgets");
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">＋ Add Expense</h1>
      <div className="card max-w-lg flex flex-col gap-3">
        <select
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm"
          value={budgetId}
          onChange={(e) => setBudgetId(e.target.value)}
        >
          <option value="">Select budget line…</option>
          {data?.items.map((b) => (
            <option key={b.id} value={b.id}>
              {b.event.name} — {b.category}
            </option>
          ))}
        </select>

        <input
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm"
          placeholder="Amount (₹)"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <input
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="flex items-center gap-3">
          <FileUpload
            scope="invoices"
            label={invoiceUrl ? "Invoice ✓" : "Invoice"}
            accept="image/*,application/pdf"
            onUploaded={(url) => setInvoiceUrl(url)}
          />
          <FileUpload
            scope="receipts"
            label={receiptUrl ? "Receipt ✓" : "Receipt"}
            accept="image/*,application/pdf"
            onUploaded={(url) => setReceiptUrl(url)}
          />
        </div>

        {error && <p className="text-danger text-sm">{error}</p>}
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save Expense"}
        </button>
      </div>
    </div>
  );
}
