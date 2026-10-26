/**
 * API: GET /api/expenses/[id]
 *      DELETE /api/expenses/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "expenses:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const expense = await prisma.expense.findUnique({
    where: { id },
    include: { supplier: true, createdBy: true },
  });

  if (!expense) return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  return NextResponse.json({ expense });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "expenses:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

  await prisma.expense.delete({ where: { id } });

  await createAuditLog({
    userId: session.user.id,
    action: "DELETE",
    entityType: "Expense",
    entityId: id,
    description: `Deleted expense ${expense.expenseNumber} (₹${expense.amount})`,
  });

  return NextResponse.json({ message: "Expense deleted" });
}
