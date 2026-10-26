"use client";

import Link from "next/link";
import {
  TrendingUp,
  CreditCard,
  AlertCircle,
  Package,
  Clock,
  CheckCircle2,
  ArrowRight,
  IndianRupee,
  TrendingDown,
  ShoppingBag,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { InvoiceStatus } from "@prisma/client";

// ── Formatters ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Status badge ───────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  DRAFT: "badge-neutral",
  ISSUED: "badge-info",
  PARTIALLY_PAID: "badge-warning",
  PAID: "badge-success",
  OVERDUE: "badge-danger",
  CANCELLED: "badge-neutral",
  VOID: "badge-neutral",
};

// ── Interfaces ─────────────────────────────────────────────────────────────────

interface DashboardData {
  todaySales: number;
  monthSales: number;
  paymentsThisMonth: number;
  outstanding: number;
  overdueCount: number;
  expensesThisMonth: number;
  estimatedProfit: number;
  activeOrdersCount: number;
  awaitingApprovalCount: number;
  readyDispatchCount: number;
  recentInvoices: {
    id: string;
    number: string;
    customerName: string;
    total: number;
    status: InvoiceStatus;
    issueDate: string;
  }[];
  upcomingRecurring: {
    id: string;
    customerName: string;
    description: string;
    monthlyFee: number;
    nextBillingDate: string;
  }[];
}

// ── Stat card ──────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  href?: string;
  trend?: "up" | "down" | "neutral";
  animDelay?: number;
}

function StatCard({
  label,
  value,
  sub,
  icon,
  color,
  href,
  animDelay = 0,
}: StatCardProps) {
  const content = (
    <div
      className="glass-card p-5 animate-fade-in-up hover:scale-[1.02] transition-transform cursor-pointer"
      style={{ animationDelay: `${animDelay}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: `${color}20`, border: `1px solid ${color}30` }}
        >
          <span style={{ color }}>{icon}</span>
        </div>
        {href && (
          <ArrowRight className="w-4 h-4 opacity-40" style={{ color }} />
        )}
      </div>
      <p className="text-2xl font-bold mb-1">{value}</p>
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "hsl(215 20% 55%)" }}>
        {label}
      </p>
      {sub && (
        <p className="text-xs mt-1" style={{ color: "hsl(215 15% 45%)" }}>
          {sub}
        </p>
      )}
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

// ── Placeholder chart data ─────────────────────────────────────────────────────

const MOCK_CHART_DATA = [
  { month: "May", sales: 42000, payments: 38000 },
  { month: "Jun", sales: 56000, payments: 50000 },
  { month: "Jul", sales: 48000, payments: 52000 },
  { month: "Aug", sales: 71000, payments: 65000 },
  { month: "Sep", sales: 63000, payments: 60000 },
  { month: "Oct", sales: 88000, payments: 75000 },
];

// ── Main component ─────────────────────────────────────────────────────────────

export default function DashboardClient({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: "hsl(215 20% 55%)" }}>
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/invoices/new" className="btn btn-primary btn-sm">
            + New Invoice
          </Link>
          <Link href="/quotations/new" className="btn btn-secondary btn-sm">
            + Quotation
          </Link>
        </div>
      </div>

      {/* Stat cards row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's Sales"
          value={formatCurrency(data.todaySales)}
          sub="Invoiced today"
          icon={<IndianRupee className="w-5 h-5" />}
          color="hsl(142 76% 45%)"
          animDelay={0}
        />
        <StatCard
          label="Month Sales"
          value={formatCurrency(data.monthSales)}
          sub="Invoiced this month"
          icon={<TrendingUp className="w-5 h-5" />}
          color="hsl(217 91% 60%)"
          href="/invoices"
          animDelay={50}
        />
        <StatCard
          label="Payments Collected"
          value={formatCurrency(data.paymentsThisMonth)}
          sub="Received this month"
          icon={<CreditCard className="w-5 h-5" />}
          color="hsl(258 89% 66%)"
          href="/payments"
          animDelay={100}
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(data.outstanding)}
          sub={`${data.overdueCount} overdue`}
          icon={<AlertCircle className="w-5 h-5" />}
          color="hsl(0 84% 60%)"
          href="/invoices?status=OVERDUE"
          animDelay={150}
        />
      </div>

      {/* Stat cards row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Expenses"
          value={formatCurrency(data.expensesThisMonth)}
          sub="This month"
          icon={<TrendingDown className="w-5 h-5" />}
          color="hsl(38 92% 50%)"
          href="/expenses"
          animDelay={200}
        />
        <StatCard
          label="Est. Profit"
          value={formatCurrency(Math.max(0, data.estimatedProfit))}
          sub="Payments minus expenses"
          icon={<TrendingUp className="w-5 h-5" />}
          color={data.estimatedProfit >= 0 ? "hsl(142 76% 45%)" : "hsl(0 84% 60%)"}
          animDelay={250}
        />
        <StatCard
          label="Active Orders"
          value={String(data.activeOrdersCount)}
          sub={`${data.awaitingApprovalCount} awaiting approval`}
          icon={<ShoppingBag className="w-5 h-5" />}
          color="hsl(199 89% 48%)"
          href="/orders"
          animDelay={300}
        />
        <StatCard
          label="Ready to Dispatch"
          value={String(data.readyDispatchCount)}
          sub="Orders packed"
          icon={<Package className="w-5 h-5" />}
          color="hsl(142 76% 45%)"
          href="/orders?status=READY_FOR_DISPATCH"
          animDelay={350}
        />
      </div>

      {/* Chart + Recent invoices */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Chart */}
        <div
          className="glass-card p-5 xl:col-span-3 animate-fade-in-up"
          style={{ animationDelay: "400ms" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Sales vs Payments (6 months)</h2>
            <span className="badge badge-neutral text-xs">Estimated</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={MOCK_CHART_DATA}>
              <defs>
                <linearGradient id="sales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(217 91% 60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="payments" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142 76% 45%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(142 76% 45%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(215 25% 20%)" strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fill: "hsl(215 20% 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fill: "hsl(215 20% 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "hsl(222 47% 11%)",
                  border: "1px solid hsl(215 25% 23%)",
                  borderRadius: "8px",
                  color: "white",
                }}
                formatter={(v) => formatCurrency(Number(v))}
              />
              <Area type="monotone" dataKey="sales" stroke="hsl(217 91% 60%)" fill="url(#sales)" strokeWidth={2} name="Invoiced" />
              <Area type="monotone" dataKey="payments" stroke="hsl(142 76% 45%)" fill="url(#payments)" strokeWidth={2} name="Collected" />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-xs mt-2" style={{ color: "hsl(215 15% 40%)" }}>
            ⚠️ Chart shows sample data. Live data will populate as transactions are recorded.
          </p>
        </div>

        {/* Upcoming Recurring */}
        <div
          className="glass-card p-5 xl:col-span-2 animate-fade-in-up"
          style={{ animationDelay: "450ms" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Upcoming Billing</h2>
            <Link href="/recurring" className="text-xs text-blue-400 hover:text-blue-300">
              View all
            </Link>
          </div>
          {data.upcomingRecurring.length === 0 ? (
            <div className="text-center py-8" style={{ color: "hsl(215 15% 40%)" }}>
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No upcoming billing in next 7 days</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.upcomingRecurring.map((plan) => (
                <div
                  key={plan.id}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: "hsl(215 32% 17% / 0.5)" }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{plan.customerName}</p>
                    <p className="text-xs truncate" style={{ color: "hsl(215 15% 45%)" }}>
                      {plan.description}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "hsl(38 92% 60%)" }}>
                      Due: {formatDate(plan.nextBillingDate)}
                    </p>
                  </div>
                  <span className="text-sm font-bold ml-3 flex-shrink-0" style={{ color: "hsl(142 76% 55%)" }}>
                    {formatCurrency(plan.monthlyFee)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Invoices */}
      <div
        className="glass-card animate-fade-in-up"
        style={{ animationDelay: "500ms" }}
      >
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "hsl(215 25% 17%)" }}>
          <h2 className="font-semibold">Recent Invoices</h2>
          <Link href="/invoices" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {data.recentInvoices.length === 0 ? (
          <div className="text-center py-12" style={{ color: "hsl(215 15% 40%)" }}>
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No invoices yet. Create your first invoice!</p>
            <Link href="/invoices/new" className="btn btn-primary btn-sm mt-4">
              + Create Invoice
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.recentInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="font-mono text-sm font-semibold" style={{ color: "hsl(217 91% 70%)" }}>
                      {inv.number}
                    </td>
                    <td>{inv.customerName}</td>
                    <td>{formatDate(inv.issueDate)}</td>
                    <td className="font-semibold">{formatCurrency(inv.total)}</td>
                    <td>
                      <span className={`badge ${STATUS_STYLES[inv.status]}`}>
                        {inv.status.replace("_", " ")}
                      </span>
                    </td>
                    <td>
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
