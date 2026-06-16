import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";

// Authenticated app shell. Server-side session guard: unauthenticated users are
// redirected to /login before any protected page renders (defence in depth
// alongside middleware + per-API RBAC).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="md:ml-[210px] flex-1 flex flex-col min-w-0">
        <Topbar />
        <div className="flex-1 overflow-y-auto p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
