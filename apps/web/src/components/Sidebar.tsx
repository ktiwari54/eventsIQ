"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUi } from "@/store/ui";

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
      { href: "/zoho", label: "🔗 Zoho CRM" },
      { href: "/reports", label: "📄 Reports" },
    ],
  },
  {
    section: "Admin",
    items: [{ href: "/admin/users", label: "⚙ Users & Org" }],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useUi();
  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={toggleSidebar} aria-hidden />
      )}
      <aside
        className={`w-[210px] min-h-screen bg-card border-r border-border fixed top-0 left-0 overflow-y-auto z-40 transition-transform md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-4 py-4 text-[17px] font-extrabold text-accent border-b border-border">
          ⚡ EVENT IQ
        </div>
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
                onClick={() => sidebarOpen && toggleSidebar()}
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
      </aside>
    </>
  );
}
