"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  Users,
  ShoppingBag,
  Share2,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface ReportsData {
  summary: {
    totalBilled: number;
    totalReceived: number;
    totalOutstanding: number;
    totalExpenses: number;
    netProfit: number;
    totalCustomers: number;
    totalOrders: number;
    totalQuotations: number;
  };
  expenseBreakdown: { category: string; amount: number }[];
  topDebtors: { customerName: string; amount: number; count: number }[];
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports");
      const d = await res.json();
      setData(d);
    } catch {
      /* handle */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const sendReminder = (customerName: string, amount: number) => {
    const text = encodeURIComponent(
      `Hello ${customerName},\n\n` +
      `Gentle reminder from *Royal Design Studio* regarding pending balance payment of *₹${amount.toLocaleString("en-IN")}*.\n` +
      `UPI ID: royaldesignstudioofficial@okaxis\n\n` +
      `Please let us know once transferred. Thank you!`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold">Financial & Business Reports</h1>
          <p className="text-sm mt-0.5 text-slate-400">
            Real-time revenue, outstanding receivables, expenses, and net profit analytics
          </p>
        </div>
        <button
          onClick={fetchReports}
          disabled={loading}
          className="btn btn-secondary btn-sm flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Stats
        </button>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-24 gap-3 glass-card">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-slate-400">Compiling financial analytics…</span>
        </div>
      ) : data ? (
        <>
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up">
            <div className="glass-card p-5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Total Billed
                </span>
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white mt-3">
                ₹{data.summary.totalBilled.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-400 mt-1">Across all issued sales invoices</p>
            </div>

            <div className="glass-card p-5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Total Received
                </span>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-emerald-400 mt-3">
                ₹{data.summary.totalReceived.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-400 mt-1">Collected cash, UPI & bank payments</p>
            </div>

            <div className="glass-card p-5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Outstanding Receivables
                </span>
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <AlertCircle className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-amber-400 mt-3">
                ₹{data.summary.totalOutstanding.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-400 mt-1">Pending client balances</p>
            </div>

            <div className="glass-card p-5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Net Studio Profit
                </span>
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <BarChart3 className="w-5 h-5" />
                </div>
              </div>
              <p className={`text-2xl font-bold mt-3 ${data.summary.netProfit >= 0 ? "text-purple-400" : "text-rose-400"}`}>
                ₹{data.summary.netProfit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-400 mt-1">Revenue minus studio expenses</p>
            </div>
          </div>

          {/* Secondary stats row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="glass-card p-4 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Registered Clients</p>
              <p className="text-xl font-bold text-white mt-1">{data.summary.totalCustomers}</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Orders Processed</p>
              <p className="text-xl font-bold text-white mt-1">{data.summary.totalOrders}</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Estimates Sent</p>
              <p className="text-xl font-bold text-white mt-1">{data.summary.totalQuotations}</p>
            </div>
          </div>

          {/* Two Columns: Outstanding Debtors & Expenses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Outstanding Receivables */}
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                  Top Outstanding Receivables
                </h3>
              </div>

              {data.topDebtors.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  🎉 Great job! No clients currently have overdue invoice balances.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.topDebtors.map((debtor, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
                    >
                      <div>
                        <p className="font-semibold text-sm text-white">{debtor.customerName}</p>
                        <p className="text-xs text-slate-400">{debtor.count} pending invoice(s)</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-amber-400 text-sm">
                          ₹{debtor.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                        <button
                          onClick={() => sendReminder(debtor.customerName, debtor.amount)}
                          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                          title="Send WhatsApp payment reminder"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Expense Breakdown */}
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-rose-400" />
                  Expense Distribution by Category
                </h3>
                <span className="text-xs text-rose-400 font-bold">
                  Total: ₹{data.summary.totalExpenses.toLocaleString("en-IN")}
                </span>
              </div>

              {data.expenseBreakdown.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  No business expenses recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.expenseBreakdown.map((exp, idx) => {
                    const percent =
                      data.summary.totalExpenses > 0
                        ? Math.round((exp.amount / data.summary.totalExpenses) * 100)
                        : 0;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300 font-medium">
                            {exp.category.replace(/_/g, " ")}
                          </span>
                          <span className="text-rose-400 font-semibold">
                            ₹{exp.amount.toLocaleString("en-IN")} ({percent}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
