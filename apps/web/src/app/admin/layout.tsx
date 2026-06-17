import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

const navItems = [
  { href: "/admin", label: "Overview", icon: "📊" },
  { href: "/admin/orgs", label: "Organizations", icon: "🏢" },
  { href: "/admin/users", label: "Users", icon: "👥" },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: "💳" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Admin Sidebar */}
      <aside className="w-52 bg-card border-r border-border flex flex-col fixed inset-y-0">
        <div className="px-4 py-5 border-b border-border">
          <Link href="/" className="text-accent font-extrabold text-sm">⚡ EVENT IQ</Link>
          <div className="text-[10px] text-muted mt-0.5 uppercase tracking-wider">Admin Panel</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted hover:text-white hover:bg-surface transition-colors"
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-border">
          <Link href="/dashboard" className="text-xs text-muted hover:text-white transition-colors">
            ← Back to App
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-52 flex-1 p-6">{children}</main>
    </div>
  );
}
