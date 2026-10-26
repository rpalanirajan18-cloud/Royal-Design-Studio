/**
 * API: GET /api/expenses — List expenses
 *      POST /api/expenses — Record new business expense
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { allocateDocumentNumber } from "@/lib/numbering";
import { z } from "zod";
import { DocumentType, ExpenseCategory, PaymentMethod } from "@prisma/client";

const createExpenseSchema = z.object({
  date: z.string().datetime({ offset: true }).or(z.string()),
  category: z.nativeEnum(ExpenseCategory),
  supplierId: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  amount: z.number().positive("Amount must be greater than 0"),
  method: z.nativeEnum(PaymentMethod).optional(),
  transactionRef: z.string().optional(),
  relatedOrderId: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "expenses:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category");

  try {
    const expenses = await prisma.expense.findMany({
      where: {
        ...(category ? { category: category as ExpenseCategory } : {}),
        ...(search
          ? {
              OR: [
                { description: { contains: search, mode: "insensitive" } },
                { expenseNumber: { contains: search, mode: "insensitive" } },
                { transactionRef: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        supplier: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ expenses });
  } catch (err) {
    console.warn("Could not query expenses from database:", err);
    return NextResponse.json({ expenses: [] });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "expenses:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createExpenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const expenseDate = new Date(data.date);
  const expenseNumber = await allocateDocumentNumber(DocumentType.EXPENSE, expenseDate);

  const expense = await prisma.expense.create({
    data: {
      expenseNumber,
      date: expenseDate,
      category: data.category,
      supplierId: data.supplierId,
      description: data.description.trim(),
      amount: data.amount,
      method: data.method,
      transactionRef: data.transactionRef,
      relatedOrderId: data.relatedOrderId,
      notes: data.notes,
      createdById: session.user.id,
    },
    include: {
      supplier: true,
    },
  });

  await createAuditLog({
    userId: session.user.id,
    action: "CREATE",
    entityType: "Expense",
    entityId: expense.id,
    description: `Recorded expense ${expense.expenseNumber} for ₹${expense.amount} (${expense.category})`,
  });

  return NextResponse.json({ expense }, { status: 201 });
}
