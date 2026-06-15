import { Sidebar } from "@/components/Sidebar";

// Authenticated app shell. In production, wrap with a server-side session
// guard (getServerSession) and redirect unauthenticated users to /login.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-[210px] flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </main>
    </div>
  );
}
