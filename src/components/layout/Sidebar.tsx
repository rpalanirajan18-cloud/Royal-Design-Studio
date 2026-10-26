"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Receipt,
  ShoppingBag,
  RefreshCw,
  CreditCard,
  TrendingDown,
  Truck,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { UserRole } from "@prisma/client";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",            href: "/dashboard",           icon: LayoutDashboard },
  { label: "Customers",            href: "/customers",           icon: Users },
  { label: "Catalog & Pricing",    href: "/products",            icon: Package },
  { label: "Quotations",           href: "/quotations",          icon: FileText },
  { label: "Proforma Invoices",    href: "/proforma",            icon: Receipt },
  { label: "Sales Invoices",       href: "/invoices",            icon: Receipt },
  { label: "Custom Orders",        href: "/orders",              icon: ShoppingBag },
  { label: "Recurring Retainers",  href: "/recurring",           icon: RefreshCw },
  { label: "Payments & Receipts",  href: "/payments",            icon: CreditCard },
  { label: "Business Expenses",    href: "/expenses",            icon: TrendingDown },
  { label: "Dispatch & Delivery",  href: "/deliveries",          icon: Truck },
  { label: "Financial Reports",    href: "/reports",             icon: BarChart3 },
  { label: "Studio Settings",      href: "/settings",            icon: Settings },
];

const ROLE_LABELS: Record<UserRole, string> = {
  OWNER: "Studio Owner / Admin",
  BILLING_STAFF: "Billing Operations",
  ORDER_MANAGER: "Production Manager",
  DESIGNER: "Senior Designer",
  ACCOUNTANT: "Finance Accountant",
};

interface SidebarProps {
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
    role: UserRole;
  };
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className="flex flex-col h-full transition-all duration-300 relative z-20 select-none bg-white dark:bg-[#0a0f1d] border-r border-slate-200 dark:border-white/[0.08] flex-shrink-0"
      style={{
        width: collapsed ? "74px" : "250px",
      }}
    >
      {/* Studio Header Brand with compact, clean logo */}
      <div className="flex items-center gap-2.5 px-3.5 py-3.5 border-b border-slate-200 dark:border-white/[0.08]">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center p-0.5 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-cyan-400/25">
          {/* Logo for light mode */}
          <img
            src="/logo.png"
            alt="Royal Design Studio"
            className="brand-logo-img brand-logo-light h-6 w-auto object-contain dark:hidden"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
          {/* Logo for dark mode */}
          <img
            src="/logo-white.png"
            alt="Royal Design Studio"
            className="brand-logo-img brand-logo-dark h-6 w-auto object-contain hidden dark:block"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
        </div>
        {!collapsed && (
          <div className="overflow-hidden min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
                Royal Design
              </p>
              <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-blue-100 dark:bg-cyan-500/20 text-[#27348B] dark:text-cyan-300 border border-blue-200 dark:border-cyan-400/30">
                STUDIO
              </span>
            </div>
            <p className="text-[9px] text-[#27348B] dark:text-cyan-400 font-bold tracking-wider uppercase truncate">
              Ideas Into Impact
            </p>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-2.5 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 group relative ${
                isActive
                  ? "bg-blue-50 dark:bg-blue-600/20 text-[#27348B] dark:text-white border border-blue-200 dark:border-blue-500/30 font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/[0.04]"
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[#27348B] dark:bg-cyan-400" />
              )}
              <Icon
                className={`flex-shrink-0 transition-colors w-[17px] h-[17px] ${
                  isActive ? "text-[#27348B] dark:text-cyan-400" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                }`}
              />
              {!collapsed && (
                <span className="truncate tracking-wide">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User profile & Collapse toggler */}
      <div className="p-2.5 border-t border-slate-200 dark:border-white/[0.08] space-y-1.5">
        {!collapsed && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06]">
            <div className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold bg-[#27348B] text-white">
              {user.name?.[0]?.toUpperCase() ?? "A"}
            </div>
            <div className="flex-1 overflow-hidden min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.name ?? "Studio Admin"}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {ROLE_LABELS[user.role] ?? user.role}
              </p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Sign out of portal"
              className="flex-shrink-0 p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full py-1 flex items-center justify-center rounded-md text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-xs"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>
    </aside>
  );
}
