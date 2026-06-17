"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const NAV = [
  {
    section: "Main",
    items: [
      { href: "/dashboard", label: "📊 Dashboard" },
      { href: "/events", label: "📅 Events" },
      { href: "/leads", label: "👥 Leads" },
    ],
  },
  {
    section: "Finance",
    items: [
      { href: "/budgets", label: "💰 Budgets" },
      { href: "/vendors", label: "📦 Vendors" },
    ],
  },
  {
    section: "Revenue",
    items: [
      { href: "/forms", label: "📋 Forms" },
      { href: "/sales-orders", label: "🛒 Sales Orders" },
      { href: "/invoices", label: "📄 Invoices" },
    ],
  },
  {
    section: "Intelligence",
    items: [
      { href: "/scoring", label: "🎯 AI Scoring" },
      { href: "/roi", label: "📈 ROI Engine" },
      { href: "/copilot", label: "🤖 AI Copilot" },
    ],
  },
  {
    section: "Integration",
    items: [
      { href: "/crm", label: "🌐 CRM Hub" },
      { href: "/zoho", label: "🔗 Zoho CRM" },
      { href: "/reports", label: "📄 Reports" },
    ],
  },
  {
    section: "Account",
    items: [
      { href: "/settings", label: "⚙️ Settings" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  return (
    <aside className="w-[210px] h-screen bg-card border-r border-border fixed top-0 left-0 flex flex-col">
      <div className="px-4 py-4 text-[17px] font-extrabold text-accent border-b border-border shrink-0">
        ⚡ EVENT IQ
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
      {NAV.map((group) => (
        <div key={group.section}>
          <div className="px-4 pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
            {group.section}
          </div>
          {group.items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2.5 text-[13px] border-l-2 transition-colors ${
                  active
                    ? "text-accent border-accent bg-accent/10 font-semibold"
                    : "text-muted border-transparent hover:text-white hover:bg-accent/5"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
      </div>
      <div className="shrink-0 border-t border-border p-3">
        <div className="text-[11px] text-muted truncate mb-2 px-1">{session?.user?.email}</div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full text-left flex items-center gap-2 px-3 py-2 text-[13px] text-muted hover:text-white hover:bg-accent/5 rounded-lg transition-colors"
        >
          🚪 Logout
        </button>
      </div>
    </aside>
  );
}
