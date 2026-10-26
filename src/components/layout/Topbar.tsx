"use client";

import { Bell, Search, Plus, Sparkles, Receipt, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { UserRole } from "@prisma/client";

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
    <header className="flex items-center justify-between px-6 py-3 flex-shrink-0 bg-[#0a0f1d] border-b border-white/[0.08] h-[64px]">
      {/* Studio Status & Search */}
      <div className="flex items-center gap-4 max-w-md w-full">
        <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-semibold text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Studio Active</span>
        </div>

        <div className="relative w-full hidden sm:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="search"
            placeholder="Search invoices, clients, orders (Press / to focus)…"
            className="form-input text-xs pl-10 h-[38px] bg-slate-900/60 border-white/10"
          />
        </div>
      </div>

      {/* Quick Action Shortcuts & Profile */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Quick Create Short-links */}
        <div className="hidden md:flex items-center gap-2">
          <Link
            href="/invoices"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 border border-blue-500/30 transition-all"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>+ Invoice</span>
          </Link>
          <Link
            href="/orders"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600/15 hover:bg-purple-600/25 text-purple-400 border border-purple-500/30 transition-all"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>+ Order</span>
          </Link>
        </div>

        <div className="h-4 w-px bg-white/10 hidden md:block" />

        {/* User badge */}
        <div className="flex items-center gap-2.5 pl-1">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
            {user.name?.[0]?.toUpperCase() ?? "A"}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-white leading-tight">{user.name ?? "Studio Admin"}</p>
            <p className="text-[10px] text-slate-400">
              {ROLE_LABELS[user.role] ?? user.role}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
