import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/login");

  // First-time SSO user who hasn't created an org yet
  if (session.user.needsOnboarding || !session.user.orgId) {
    redirect("/sso-setup");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="md:ml-[210px] flex-1 flex flex-col pt-14 md:pt-0">
        <div className="flex-1 overflow-y-auto p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
