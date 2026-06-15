"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import { apiGet, apiSend } from "@/lib/client";
import { FileUpload } from "@/components/FileUpload";

interface EventDetail {
  id: string;
  name: string;
  type: string;
  status: string;
  city: string | null;
  startDate: string;
  endDate: string;
  objectives: string | null;
  expectedRevenue: string;
  budgetTotal: string;
  _count: { leads: number };
}

const STATUSES = ["DRAFT", "SUBMITTED", "APPROVED", "ACTIVE", "COMPLETED", "ARCHIVED"];

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: () => apiGet<EventDetail>(`/api/events/${id}`),
  });

  const setStatus = useMutation({
    mutationFn: (status: string) => apiSend(`/api/events/${id}`, "PUT", { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["event", id] }),
  });

  if (isLoading || !event) return <p className="text-muted">Loading…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold">{event.name}</h1>
          <p className="text-muted text-xs">
            {event.type.replace("_", " ")} · {event.city ?? "—"} ·{" "}
            {new Date(event.startDate).toLocaleDateString()} – {new Date(event.endDate).toLocaleDateString()}
          </p>
        </div>
        <select
          className="bg-card border border-border rounded-lg px-3 py-2 text-sm"
          value={event.status}
          onChange={(e) => setStatus.mutate(e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Workflow progress */}
      <div className="flex gap-1 mb-5">
        {STATUSES.map((s) => {
          const active = STATUSES.indexOf(s) <= STATUSES.indexOf(event.status);
          return (
            <div key={s} className={`flex-1 h-1.5 rounded ${active ? "bg-accent" : "bg-border"}`} title={s} />
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Checklist eventId={id} />
        <Tasks eventId={id} />
        <Team eventId={id} />
        <Documents eventId={id} />
        <CaptureQr eventId={id} />
      </div>
    </div>
  );
}

// ---- Checklist ----
function Checklist({ eventId }: { eventId: string }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const { data } = useQuery({
    queryKey: ["checklist", eventId],
    queryFn: () => apiGet<{ items: { id: string; title: string; done: boolean }[] }>(`/api/events/${eventId}/checklist`),
  });
  const add = useMutation({
    mutationFn: () => apiSend(`/api/events/${eventId}/checklist`, "POST", { title }),
    onSuccess: () => {
      setTitle("");
      qc.invalidateQueries({ queryKey: ["checklist", eventId] });
    },
  });
  const toggle = useMutation({
    mutationFn: (v: { id: string; done: boolean }) => apiSend(`/api/events/${eventId}/checklist`, "PATCH", v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["checklist", eventId] }),
  });

  return (
    <div className="card">
      <h2 className="text-sm font-bold mb-3">✅ Checklist</h2>
      <div className="flex flex-col gap-2 mb-3">
        {data?.items.map((i) => (
          <label key={i.id} className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={i.done} onChange={() => toggle.mutate({ id: i.id, done: !i.done })} />
            <span className={i.done ? "line-through text-muted" : ""}>{i.title}</span>
          </label>
        ))}
        {!data?.items.length && <p className="text-muted text-xs">No items yet.</p>}
      </div>
      <div className="flex gap-2">
        <input
          className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm flex-1"
          placeholder="Add item…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && title && add.mutate()}
        />
        <button className="btn btn-ghost !py-1" onClick={() => title && add.mutate()}>Add</button>
      </div>
    </div>
  );
}

// ---- Tasks ----
function Tasks({ eventId }: { eventId: string }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const { data } = useQuery({
    queryKey: ["tasks", eventId],
    queryFn: () =>
      apiGet<{ items: { id: string; title: string; status: string; assignee?: { name: string } | null }[] }>(
        `/api/events/${eventId}/tasks`,
      ),
  });
  const add = useMutation({
    mutationFn: () => apiSend(`/api/events/${eventId}/tasks`, "POST", { title }),
    onSuccess: () => {
      setTitle("");
      qc.invalidateQueries({ queryKey: ["tasks", eventId] });
    },
  });
  const update = useMutation({
    mutationFn: (v: { id: string; status: string }) => apiSend(`/api/tasks/${v.id}`, "PUT", { status: v.status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", eventId] }),
  });

  const STATUS = ["TODO", "IN_PROGRESS", "DONE", "BLOCKED"];
  return (
    <div className="card">
      <h2 className="text-sm font-bold mb-3">📋 Tasks</h2>
      <div className="flex flex-col gap-2 mb-3">
        {data?.items.map((t) => (
          <div key={t.id} className="flex items-center justify-between text-sm">
            <span>{t.title}{t.assignee ? ` · ${t.assignee.name}` : ""}</span>
            <select
              className="bg-surface border border-border rounded px-2 py-1 text-xs"
              value={t.status}
              onChange={(e) => update.mutate({ id: t.id, status: e.target.value })}
            >
              {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        ))}
        {!data?.items.length && <p className="text-muted text-xs">No tasks yet.</p>}
      </div>
      <div className="flex gap-2">
        <input
          className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm flex-1"
          placeholder="Add task…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && title && add.mutate()}
        />
        <button className="btn btn-ghost !py-1" onClick={() => title && add.mutate()}>Add</button>
      </div>
    </div>
  );
}

// ---- Team ----
function Team({ eventId }: { eventId: string }) {
  const qc = useQueryClient();
  const [userId, setUserId] = useState("");
  const { data } = useQuery({
    queryKey: ["team", eventId],
    queryFn: () =>
      apiGet<{ items: { id: string; roleTag: string | null; user: { id: string; name: string; role: string } }[] }>(
        `/api/events/${eventId}/team`,
      ),
  });
  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiGet<{ items: { id: string; name: string; role: string }[] }>("/api/users"),
  });
  const add = useMutation({
    mutationFn: () => apiSend(`/api/events/${eventId}/team`, "POST", { userId }),
    onSuccess: () => {
      setUserId("");
      qc.invalidateQueries({ queryKey: ["team", eventId] });
    },
  });
  const remove = useMutation({
    mutationFn: (uid: string) => apiSend(`/api/events/${eventId}/team?userId=${uid}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team", eventId] }),
  });

  return (
    <div className="card">
      <h2 className="text-sm font-bold mb-3">👥 Team</h2>
      <div className="flex flex-col gap-2 mb-3">
        {data?.items.map((m) => (
          <div key={m.id} className="flex items-center justify-between text-sm">
            <span>{m.user.name} <span className="text-muted text-xs">· {m.user.role}</span></span>
            <button className="text-danger text-xs" onClick={() => remove.mutate(m.user.id)}>Remove</button>
          </div>
        ))}
        {!data?.items.length && <p className="text-muted text-xs">No members assigned.</p>}
      </div>
      <div className="flex gap-2">
        <select className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm flex-1" value={userId} onChange={(e) => setUserId(e.target.value)}>
          <option value="">Select user…</option>
          {users?.items.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
        </select>
        <button className="btn btn-ghost !py-1" onClick={() => userId && add.mutate()}>Assign</button>
      </div>
    </div>
  );
}

// ---- Lead-capture QR ----
function CaptureQr({ eventId }: { eventId: string }) {
  const src = `/api/events/${eventId}/qr`;
  return (
    <div className="card">
      <h2 className="text-sm font-bold mb-3">📱 Lead-Capture QR</h2>
      <p className="text-muted text-xs mb-3">
        Display at your booth — visitors scan to self-capture into this event.
      </p>
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="Event capture QR" className="w-32 h-32 rounded bg-white p-1" />
        <a href={src} download className="btn btn-ghost">⬇ Download PNG</a>
      </div>
    </div>
  );
}

// ---- Documents ----
function Documents({ eventId }: { eventId: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["documents", eventId],
    queryFn: () => apiGet<{ items: { id: string; fileUrl: string; fileName: string | null }[] }>(`/api/events/${eventId}/documents`),
  });
  const record = useMutation({
    mutationFn: (v: { fileUrl: string; fileName: string; fileType: string }) =>
      apiSend(`/api/events/${eventId}/documents`, "POST", v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents", eventId] }),
  });

  return (
    <div className="card">
      <h2 className="text-sm font-bold mb-3">📎 Documents</h2>
      <div className="flex flex-col gap-2 mb-3">
        {data?.items.map((d) => (
          <a key={d.id} href={d.fileUrl} target="_blank" rel="noreferrer" className="text-accent text-sm truncate">
            {d.fileName ?? d.fileUrl}
          </a>
        ))}
        {!data?.items.length && <p className="text-muted text-xs">No files attached.</p>}
      </div>
      <FileUpload
        scope="documents"
        label="Attach file"
        onUploaded={(url, file) => record.mutate({ fileUrl: url, fileName: file.name, fileType: file.type })}
      />
    </div>
  );
}
