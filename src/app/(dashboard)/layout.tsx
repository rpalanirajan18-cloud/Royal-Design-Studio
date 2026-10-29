import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import GlobalQuickBillFloatingButton from "@/components/invoices/GlobalQuickBillFloatingButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-[#070c18] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Sidebar */}
      <Sidebar user={session.user} />

      {/* Main area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar user={session.user} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 dark:bg-[#091122] transition-colors relative">
          {children}
        </main>
      </div>

      {/* Global Quick Counter Bill Floating Button */}
      <GlobalQuickBillFloatingButton />
    </div>
  );
}
