import { Sidebar } from "@/components/Sidebar";
import { NotificationBell } from "@/components/NotificationBell";

// Authenticated app shell. In production, wrap with a server-side session
// guard (getServerSession) and redirect unauthenticated users to /login.
export default function AppLayout({ children }: { children: React.ReactNode }) {
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
