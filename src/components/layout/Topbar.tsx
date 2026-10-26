"use client";

import { Search, Receipt, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { UserRole } from "@prisma/client";
import ThemeToggle from "./ThemeToggle";

const ROLE_LABELS: Record<UserRole, string> = {
  OWNER: "Studio Owner",
  BILLING_STAFF: "Billing Operations",
  ORDER_MANAGER: "Production Manager",
  DESIGNER: "Senior Designer",
  ACCOUNTANT: "Accountant",
};

interface TopbarProps {
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
    role: UserRole;
  };
}

export default function Topbar({ user }: TopbarProps) {
  return (
    <header className="flex items-center justify-between px-6 py-3 flex-shrink-0 bg-white dark:bg-[#0a0f1d] border-b border-slate-200 dark:border-white/[0.08] h-[64px] transition-colors">
      {/* Studio Status & Search */}
      <div className="flex items-center gap-4 max-w-md w-full">
        <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Studio Active</span>
        </div>

        <div className="relative w-full hidden sm:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="search"
            placeholder="Search invoices, clients, orders…"
            className="w-full pl-10 pr-4 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#27348B]/20 dark:focus:ring-cyan-500/30 transition-all"
          />
        </div>
      </div>

      {/* Quick Action Shortcuts, Theme Switcher & Profile */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Quick Create Short-links */}
        <div className="hidden md:flex items-center gap-2">
          <Link
            href="/invoices"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-600/15 hover:bg-blue-100 dark:hover:bg-blue-600/25 text-[#27348B] dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 transition-all"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>+ Invoice</span>
          </Link>
          <Link
            href="/orders"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 dark:bg-purple-600/15 hover:bg-purple-100 dark:hover:bg-purple-600/25 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30 transition-all"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>+ Order</span>
          </Link>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-white/10 hidden md:block" />

        {/* Theme Toggle Button (Light by default, switchable to Dark) */}
        <ThemeToggle />

        {/* User badge */}
        <div className="flex items-center gap-2.5 pl-1">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold bg-[#27348B] dark:bg-gradient-to-tr dark:from-blue-600 dark:to-indigo-600 text-white shadow-sm">
            {user.name?.[0]?.toUpperCase() ?? "A"}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-slate-800 dark:text-white leading-tight">
              {user.name ?? "Studio Admin"}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {ROLE_LABELS[user.role] ?? user.role}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
