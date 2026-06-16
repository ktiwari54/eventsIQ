import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { NotificationBell } from "@/components/NotificationBell";

// Authenticated app shell. Server-side session guard: unauthenticated users are
// redirected to /login before any protected page renders (defence in depth
// alongside middleware + per-API RBAC).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-[210px] flex-1 flex flex-col">
        <div className="flex items-center justify-end gap-4 px-6 py-3 border-b border-border sticky top-0 bg-bg/90 backdrop-blur z-20">
          <NotificationBell />
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </main>
    </div>
  );
}
