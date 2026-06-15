"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiGet, apiSend } from "@/lib/client";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const ICON: Record<string, string> = {
  budget: "💰",
  report: "📄",
  zoho: "🔗",
  lead: "👥",
  system: "🔔",
};

// Topbar notification bell: shows unread count, opens a dropdown of recent
// notifications, supports mark-one / mark-all read. Polls every 30s.
export function NotificationBell() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiGet<{ items: Notification[]; unread: number }>("/api/notifications"),
    refetchInterval: 30000,
  });

  const markRead = useMutation({
    mutationFn: (body: { id?: string; all?: boolean }) => apiSend("/api/notifications", "PATCH", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unread = data?.unread ?? 0;

  return (
    <div className="relative">
      <button className="relative text-xl" onClick={() => setOpen((o) => !o)} aria-label="Notifications">
        🔔
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-danger text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-card border border-border rounded-xl shadow-xl z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-sm font-bold">Notifications</span>
            {unread > 0 && (
              <button className="text-accent text-xs" onClick={() => markRead.mutate({ all: true })}>
                Mark all read
              </button>
            )}
          </div>
          {!data?.items.length && <p className="text-muted text-xs p-4">No notifications.</p>}
          {data?.items.map((n) => {
            const inner = (
              <div className="flex gap-2">
                <span>{ICON[n.type] ?? "🔔"}</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{n.title}</div>
                  {n.body && <div className="text-xs text-muted">{n.body}</div>}
                  <div className="text-[10px] text-slate-600">{new Date(n.createdAt).toLocaleString()}</div>
                </div>
                {!n.read && <span className="w-2 h-2 rounded-full bg-accent mt-1" />}
              </div>
            );
            const cls = `block px-3 py-2 border-b border-border/40 ${n.read ? "" : "bg-accent/5"}`;
            return n.link ? (
              <a key={n.id} href={n.link} className={cls} onClick={() => markRead.mutate({ id: n.id })}>
                {inner}
              </a>
            ) : (
              <div key={n.id} className={`${cls} cursor-pointer`} onClick={() => markRead.mutate({ id: n.id })}>
                {inner}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
