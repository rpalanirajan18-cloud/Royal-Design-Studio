/**
 * API: GET /api/reports — Comprehensive business reports and analytics
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { InvoiceStatus } from "@prisma/client";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "reports:financial")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 1. Invoices stats
  const invoices = await prisma.salesInvoice.findMany({
    where: { status: { notIn: [InvoiceStatus.CANCELLED, InvoiceStatus.VOID] } },
    include: { customer: { select: { name: true } } },
  });

  let totalBilled = 0;
  let totalReceived = 0;
  let totalOutstanding = 0;

  for (const inv of invoices) {
    totalBilled += Number(inv.total);
    totalReceived += Number(inv.amountPaid) + Number(inv.advancePaid);
    totalOutstanding += Number(inv.balanceDue);
  }

  // 2. Expenses total & breakdown
  const expenses = await prisma.expense.findMany();
  let totalExpenses = 0;
  const expenseByCategory: Record<string, number> = {};

  for (const exp of expenses) {
    const amt = Number(exp.amount);
    totalExpenses += amt;
    expenseByCategory[exp.category] = (expenseByCategory[exp.category] ?? 0) + amt;
  }

  // 3. Outstanding Receivables by customer
  const customerReceivables: Record<string, { customerName: string; amount: number; count: number }> = {};
  for (const inv of invoices) {
    const due = Number(inv.balanceDue);
    if (due > 0) {
      if (!customerReceivables[inv.customerId]) {
        customerReceivables[inv.customerId] = {
          customerName: inv.customer.name,
          amount: 0,
          count: 0,
        };
      }
      customerReceivables[inv.customerId].amount += due;
      customerReceivables[inv.customerId].count += 1;
    }
  }

  const topDebtors = Object.values(customerReceivables)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  // 4. Counts
  const [totalCustomers, totalOrders, totalQuotations] = await Promise.all([
    prisma.customer.count(),
    prisma.order.count(),
    prisma.quotation.count(),
  ]);

  return NextResponse.json({
    summary: {
      totalBilled: Math.round(totalBilled * 100) / 100,
      totalReceived: Math.round(totalReceived * 100) / 100,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netProfit: Math.round((totalReceived - totalExpenses) * 100) / 100,
      totalCustomers,
      totalOrders,
      totalQuotations,
    },
    expenseBreakdown: Object.entries(expenseByCategory).map(([category, amount]) => ({
      category,
      amount: Math.round(amount * 100) / 100,
    })),
    topDebtors,
  });
}
