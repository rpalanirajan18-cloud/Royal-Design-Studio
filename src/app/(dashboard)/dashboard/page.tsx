import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DashboardClient from "@/components/dashboard/DashboardClient";

export const metadata = {
  title: "Dashboard",
};

async function getDashboardData() {
  const fallbackData = {
    todaySales: 0,
    monthSales: 0,
    paymentsThisMonth: 0,
    outstanding: 0,
    overdueCount: 0,
    expensesThisMonth: 0,
    estimatedProfit: 0,
    activeOrdersCount: 0,
    awaitingApprovalCount: 0,
    readyDispatchCount: 0,
    recentInvoices: [],
    upcomingRecurring: [],
  };

  try {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

    const [
      todaySalesResult,
      monthSalesResult,
      paymentsThisMonthResult,
      outstandingResult,
      overdueCount,
      expensesThisMonthResult,
      activeOrdersCount,
      awaitingApprovalCount,
      readyDispatchCount,
      recentInvoices,
      upcomingRecurring,
    ] = await Promise.all([
      // Today's invoiced sales (issued invoices)
      prisma.salesInvoice.aggregate({
        where: { issueDate: { gte: startOfToday, lt: endOfToday }, status: { not: "CANCELLED" } },
        _sum: { total: true },
      }),
      // Month's invoiced sales
      prisma.salesInvoice.aggregate({
        where: { issueDate: { gte: startOfMonth }, status: { not: "CANCELLED" } },
        _sum: { total: true },
      }),
      // Payments collected this month
      prisma.payment.aggregate({
        where: { paymentDate: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      // Total outstanding balance
      prisma.salesInvoice.aggregate({
        where: { status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] } },
        _sum: { balanceDue: true },
      }),
      // Overdue invoices count
      prisma.salesInvoice.count({
        where: { status: "OVERDUE" },
      }),
      // Expenses this month
      prisma.expense.aggregate({
        where: { date: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      // Active orders
      prisma.order.count({
        where: {
          status: {
            in: ["NEW", "AWAITING_ARTWORK", "AWAITING_APPROVAL", "APPROVED", "IN_PRODUCTION", "QUALITY_CHECK"],
          },
        },
      }),
      // Awaiting approval
      prisma.order.count({ where: { status: "AWAITING_APPROVAL" } }),
      // Ready for dispatch
      prisma.order.count({ where: { status: "READY_FOR_DISPATCH" } }),
      // Recent invoices
      prisma.salesInvoice.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { customer: { select: { name: true } } },
      }),
      // Upcoming recurring billing (next 7 days)
      prisma.recurringPlan.findMany({
        where: {
          status: "ACTIVE",
          nextBillingDate: { lte: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) },
        },
        include: { customer: { select: { name: true } } },
        take: 5,
        orderBy: { nextBillingDate: "asc" },
      }),
    ]);

    return {
      todaySales: Number(todaySalesResult._sum.total ?? 0),
      monthSales: Number(monthSalesResult._sum.total ?? 0),
      paymentsThisMonth: Number(paymentsThisMonthResult._sum.amount ?? 0),
      outstanding: Number(outstandingResult._sum.balanceDue ?? 0),
      overdueCount,
      expensesThisMonth: Number(expensesThisMonthResult._sum.amount ?? 0),
      estimatedProfit:
        Number(paymentsThisMonthResult._sum.amount ?? 0) -
        Number(expensesThisMonthResult._sum.amount ?? 0),
      activeOrdersCount,
      awaitingApprovalCount,
      readyDispatchCount,
      recentInvoices: recentInvoices.map((inv) => ({
        id: inv.id,
        number: inv.number,
        customerName: inv.customer.name,
        total: Number(inv.total),
        status: inv.status,
        issueDate: inv.issueDate.toISOString(),
      })),
      upcomingRecurring: upcomingRecurring.map((plan) => ({
        id: plan.id,
        customerName: plan.customer.name,
        description: plan.description,
        monthlyFee: Number(plan.monthlyFee),
        nextBillingDate: plan.nextBillingDate.toISOString(),
      })),
    };
  } catch (err) {
    console.warn("Prisma query failed during getDashboardData, serving clean dashboard fallback:", err);
    return fallbackData;
  }
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const data = await getDashboardData();

  return <DashboardClient data={data} />;
}
