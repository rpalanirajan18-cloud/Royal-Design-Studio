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
      className="flex flex-col h-full transition-all duration-300 relative z-20 select-none bg-[#0a0f1d] border-r border-white/[0.08] flex-shrink-0"
      style={{
        width: collapsed ? "74px" : "260px",
      }}
    >
      {/* Studio Header Brand */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-cyan-500/15">
        <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center p-1 bg-white/[0.04] border border-cyan-400/25 shadow-lg shadow-cyan-500/15">
          <img
            src="/logo-white.png"
            alt="Royal Design Studio"
            className="w-9 h-9 object-contain"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-extrabold text-white tracking-tight truncate">
                Royal Design
              </p>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-cyan-400 font-bold tracking-wider uppercase truncate">
              Ideas Into Impact
            </p>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1">
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group relative ${
                isActive
                  ? "bg-gradient-to-r from-blue-600/20 to-purple-600/10 text-white border border-blue-500/30 shadow-md shadow-blue-500/5"
                  : "text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]"
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
              )}
              <Icon
                className={`flex-shrink-0 transition-colors w-[18px] h-[18px] ${
                  isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"
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
      <div className="p-3 border-t border-white/[0.08] space-y-2">
        {!collapsed && (
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20">
              {user.name?.[0]?.toUpperCase() ?? "A"}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{user.name ?? "Studio Admin"}</p>
              <p className="text-[10px] text-slate-400 truncate">
                {ROLE_LABELS[user.role] ?? user.role}
              </p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Sign out of portal"
              className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full py-1.5 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors text-xs"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
