import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "hsl(222 47% 7%)" }}>
      {/* Sidebar */}
      <Sidebar user={session.user} />

      {/* Main area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar user={session.user} />
        <main
          className="flex-1 overflow-y-auto p-6"
          style={{ background: "hsl(222 47% 8%)" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
