/**
 * API: POST /api/payments — Record a payment and optionally allocate to invoices
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { allocateDocumentNumber } from "@/lib/numbering";
import { addItemToStore, readStore, writeStore } from "@/lib/store";
import { z } from "zod";

const allocationSchema = z.object({
  invoiceId: z.string(),
  amount: z.number().positive(),
});

const createPaymentSchema = z.object({
  customerId: z.string().min(1),
  paymentDate: z.string(),
  method: z.enum(["CASH", "UPI", "BANK_TRANSFER"]),
  amount: z.number().positive(),
  transactionRef: z.string().optional(),
  notes: z.string().optional(),
  isAdvance: z.boolean().default(false),
  allocations: z.array(allocationSchema).optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "payments:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId");
  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const skip = (page - 1) * limit;

  const where = {
    ...(customerId ? { customerId } : {}),
    ...(search
      ? {
          OR: [
            { receiptNumber: { contains: search, mode: "insensitive" as const } },
            { customer: { name: { contains: search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  try {
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paymentDate: "desc" },
        include: {
          customer: { select: { name: true } },
          allocations: { include: { invoice: { select: { number: true } } } },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return NextResponse.json({ payments, total });
  } catch (err) {
    console.warn("Could not query payments from database, reading local store:", err);
    let all = readStore<any>("payments");
    const allCustomers = readStore<any>("customers");
    const allInvoices = readStore<any>("invoices");
    const custMap = new Map(allCustomers.map((c: any) => [c.id, c]));
    const invMap = new Map(allInvoices.map((i: any) => [i.id, i]));

    all = all.map((p: any) => {
      const cust = custMap.get(p.customerId);
      const allocations = (p.allocations || []).map((alloc: any) => {
        const inv = invMap.get(alloc.invoiceId);
        return {
          ...alloc,
          invoice: alloc.invoice || (inv ? { id: inv.id, number: inv.number, total: inv.total } : null),
        };
      });

      return {
        ...p,
        allocations,
        customer: cust
          ? { id: cust.id, name: cust.name, phone: cust.phone, email: cust.email }
          : (p.customer || { name: "Valued Customer", phone: "" }),
      };
    });

    if (customerId) {
      all = all.filter((p: any) => p.customerId === customerId);
    }
    if (search) {
      const s = search.toLowerCase();
      all = all.filter((p: any) => p.receiptNumber?.toLowerCase().includes(s) || p.customer?.name?.toLowerCase().includes(s));
    }
    return NextResponse.json({ payments: all.slice(skip, skip + limit), total: all.length });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "payments:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  // Validate allocations don't exceed payment amount
  if (data.allocations && data.allocations.length > 0) {
    const totalAllocated = data.allocations.reduce((s, a) => s + a.amount, 0);
    if (totalAllocated > data.amount + 0.001) {
      return NextResponse.json(
        { error: "Total allocated amount exceeds payment amount" },
        { status: 400 }
      );
    }
  }

  const receiptNumber = await allocateDocumentNumber("RECEIPT");

  // Use transaction to record payment + update invoice balances atomically
  try {
    const payment = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          receiptNumber,
          customerId: data.customerId,
          createdById: session.user.id,
          paymentDate: new Date(data.paymentDate),
          method: data.method,
          amount: data.amount,
          transactionRef: data.transactionRef,
          notes: data.notes,
          isAdvance: data.isAdvance,
        },
      });

      if (data.allocations && data.allocations.length > 0) {
        for (const alloc of data.allocations) {
          await tx.paymentAllocation.create({
            data: {
              paymentId: payment.id,
              invoiceId: alloc.invoiceId,
              amount: alloc.amount,
            },
          });

          const invoice = await tx.salesInvoice.findUnique({
            where: { id: alloc.invoiceId },
          });
          if (invoice) {
            const newAmountPaid = Number(invoice.amountPaid) + alloc.amount;
            const newBalanceDue = Number(invoice.total) - newAmountPaid;
            const newStatus =
              newBalanceDue <= 0
                ? "PAID"
                : newAmountPaid > 0
                ? "PARTIALLY_PAID"
                : invoice.status;

            await tx.salesInvoice.update({
              where: { id: alloc.invoiceId },
              data: {
                amountPaid: newAmountPaid,
                balanceDue: Math.max(0, newBalanceDue),
                status: newStatus,
              },
            });
          }
        }
      }

      return payment;
    });

    await createAuditLog({
      userId: session.user.id,
      action: "PAYMENT_RECORD",
      entityType: "Payment",
      entityId: payment.id,
      description: `Recorded payment ${receiptNumber} of ₹${data.amount} (${data.method})`,
    }).catch(() => {});

    return NextResponse.json({ payment, receiptNumber }, { status: 201 });
  } catch (err) {
    console.warn("Prisma payment create failed, using local store:", err);
    const allCustomers = readStore<any>("customers");
    const cust = allCustomers.find((c: any) => c.id === data.customerId);

    // If allocated to invoices, update invoice balances in store
    if (data.allocations && data.allocations.length > 0) {
      const allInvoices = readStore<any>("invoices");
      for (const alloc of data.allocations) {
        const inv = allInvoices.find((i: any) => i.id === alloc.invoiceId);
        if (inv) {
          inv.amountPaid = Number(inv.amountPaid || 0) + alloc.amount;
          inv.balanceDue = Math.max(0, Number(inv.total || 0) - inv.amountPaid);
          if (inv.balanceDue <= 0) {
            inv.status = "PAID";
          } else if (inv.amountPaid > 0) {
            inv.status = "PARTIALLY_PAID";
          }
        }
      }
      writeStore("invoices", allInvoices);
    }

    const allInvoices = readStore<any>("invoices");
    const storedAllocations = (data.allocations || []).map((alloc) => {
      const inv = allInvoices.find((i: any) => i.id === alloc.invoiceId);
      return {
        ...alloc,
        invoice: inv ? { id: inv.id, number: inv.number, total: inv.total } : null,
      };
    });

    const payment = addItemToStore("payments", {
      receiptNumber,
      customerId: data.customerId,
      createdById: session.user.id,
      paymentDate: new Date(data.paymentDate),
      method: data.method,
      amount: data.amount,
      transactionRef: data.transactionRef,
      notes: data.notes,
      isAdvance: data.isAdvance,
      allocations: storedAllocations,
      customer: cust
        ? { id: cust.id, name: cust.name, phone: cust.phone, email: cust.email }
        : { name: "Valued Customer", phone: "" },
    });
    return NextResponse.json({ payment, receiptNumber }, { status: 201 });
  }
}
