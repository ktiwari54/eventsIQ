"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiSend } from "@/lib/client";

// Client form schema (mirrors server eventCreateSchema). All fields are strings
// here (HTML inputs) so the RHF field type matches 1:1; numbers are converted on
// submit. Server-side Zod re-validates the coerced numbers.
const formSchema = z
  .object({
    name: z.string().min(2, "Name is required"),
    type: z.enum(["TRADE_SHOW", "EXHIBITION", "CONFERENCE", "BRAND_LAUNCH", "ROADSHOW", "WEBINAR"]),
    category: z.string().optional(),
    startDate: z.string().min(1, "Start date required"),
    endDate: z.string().min(1, "End date required"),
    venue: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    organizer: z.string().optional(),
    objectives: z.string().optional(),
    expectedLeads: z.string().optional(),
    expectedRevenue: z.string().optional(),
    budgetTotal: z.string().optional(),
  })
  .refine((d) => d.endDate >= d.startDate, { message: "End date must be ≥ start date", path: ["endDate"] });

type FormValues = z.infer<typeof formSchema>;

const EVENT_TYPES = ["TRADE_SHOW", "EXHIBITION", "CONFERENCE", "BRAND_LAUNCH", "ROADSHOW", "WEBINAR"];

export default function NewEventPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: { type: "TRADE_SHOW" } });

  async function onSubmit(values: FormValues) {
    setError(null);
    try {
      const payload = {
        ...values,
        expectedLeads: Number(values.expectedLeads || 0),
        expectedRevenue: Number(values.expectedRevenue || 0),
        budgetTotal: Number(values.budgetTotal || 0),
      };
      const event = await apiSend<{ id: string }>("/api/events", "POST", payload);
      router.push(`/events/${event.id}`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const field = "bg-surface border border-border rounded-lg px-3 py-2 text-sm w-full";

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">＋ New Event</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="card max-w-2xl grid grid-cols-2 gap-3">
        <label className="col-span-2 text-xs text-muted">
          Event Name
          <input className={field} {...register("name")} />
          {errors.name && <span className="text-danger text-[11px]">{errors.name.message}</span>}
        </label>
        <label className="text-xs text-muted">
          Type
          <select className={field} {...register("type")}>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace("_", " ")}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted">
          Category
          <input className={field} {...register("category")} />
        </label>
        <label className="text-xs text-muted">
          Start Date
          <input type="date" className={field} {...register("startDate")} />
          {errors.startDate && <span className="text-danger text-[11px]">{errors.startDate.message}</span>}
        </label>
        <label className="text-xs text-muted">
          End Date
          <input type="date" className={field} {...register("endDate")} />
          {errors.endDate && <span className="text-danger text-[11px]">{errors.endDate.message}</span>}
        </label>
        <label className="text-xs text-muted">
          Venue
          <input className={field} {...register("venue")} />
        </label>
        <label className="text-xs text-muted">
          City
          <input className={field} {...register("city")} />
        </label>
        <label className="text-xs text-muted">
          Country
          <input className={field} {...register("country")} />
        </label>
        <label className="text-xs text-muted">
          Organizer
          <input className={field} {...register("organizer")} />
        </label>
        <label className="text-xs text-muted">
          Expected Leads
          <input type="number" className={field} {...register("expectedLeads")} />
        </label>
        <label className="text-xs text-muted">
          Expected Revenue (₹)
          <input type="number" className={field} {...register("expectedRevenue")} />
        </label>
        <label className="text-xs text-muted">
          Budget Total (₹)
          <input type="number" className={field} {...register("budgetTotal")} />
        </label>
        <label className="col-span-2 text-xs text-muted">
          Objectives
          <textarea className={field} rows={3} {...register("objectives")} />
        </label>

        {error && <p className="col-span-2 text-danger text-sm">{error}</p>}
        <div className="col-span-2 flex gap-2">
          <button className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Creating…" : "Create Event"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => router.back()}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
