/**
 * API: POST /api/invoices — Create a new draft invoice
 *      GET  /api/invoices — List invoices with filters
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { allocateDocumentNumber } from "@/lib/numbering";
import { addItemToStore, readStore } from "@/lib/store";
import { z } from "zod";

const lineItemSchema = z.object({
  productId: z.string().optional(),
  description: z.string().min(1),
  unit: z.string().default("pcs"),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  discount: z.number().nonnegative().default(0),
  taxRate: z.number().nonnegative().default(0),
  sortOrder: z.number().default(0),
});

const createInvoiceSchema = z.object({
  customerId: z.string().optional(),
  isWalkIn: z.boolean().default(false),
  walkInName: z.string().optional(),
  paymentMethod: z.string().optional(),
  status: z.enum(["DRAFT", "ISSUED", "PAID"]).optional(),
  quotationId: z.string().optional(),
  proformaId: z.string().optional(),
  orderId: z.string().optional(),
  issueDate: z.string().datetime({ offset: true }).or(z.string()),
  dueDate: z.string().datetime({ offset: true }).or(z.string()),
  items: z.array(lineItemSchema).min(1),
  discountAmount: z.number().nonnegative().default(0),
  deliveryCharge: z.number().nonnegative().default(0),
  notes: z.string().optional(),
  terms: z.string().optional(),
  advancePaid: z.number().nonnegative().default(0),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "invoices:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const skip = (page - 1) * limit;

  const where = {
    ...(status ? { status: status as never } : {}),
    ...(search
      ? {
          OR: [
            { number: { contains: search, mode: "insensitive" as const } },
            { customer: { name: { contains: search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  try {
    const [invoices, total] = await Promise.all([
      prisma.salesInvoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { customer: { select: { name: true, phone: true } }, items: true },
      }),
      prisma.salesInvoice.count({ where }),
    ]);

    return NextResponse.json({ invoices, total, page, limit });
  } catch (err) {
    console.warn("Could not query invoices from database, reading local store:", err);
    let allInvoices = readStore<any>("invoices");
    const allCustomers = readStore<any>("customers");
    const custMap = new Map(allCustomers.map((c: any) => [c.id, c]));

    allInvoices = allInvoices.map((inv: any) => {
      const cust = custMap.get(inv.customerId);
      return {
        ...inv,
        customer: cust
          ? { id: cust.id, name: cust.name, phone: cust.phone, email: cust.email }
          : (inv.customer || { name: "Valued Customer", phone: "" }),
      };
    });

    if (status && status !== "ALL") {
      allInvoices = allInvoices.filter((inv: any) => inv.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      allInvoices = allInvoices.filter(
        (inv: any) =>
          inv.number?.toLowerCase().includes(q) ||
          inv.customer?.name?.toLowerCase().includes(q) ||
          inv.customer?.phone?.includes(q)
      );
    }

    const total = allInvoices.length;
    const paginated = allInvoices.slice(skip, skip + limit);

    return NextResponse.json({ invoices: paginated, total, page, limit });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "invoices:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  // Calculate totals
  const subtotal = data.items.reduce((sum, item) => {
    const lineTotal = item.quantity * item.unitPrice - item.discount;
    return sum + lineTotal;
  }, 0);

  const taxAmount = data.items.reduce((sum, item) => {
    const lineBase = item.quantity * item.unitPrice - item.discount;
    return sum + (lineBase * item.taxRate) / 100;
  }, 0);

  const total = subtotal + taxAmount + data.deliveryCharge - data.discountAmount;

  const isWalkIn = Boolean(data.isWalkIn || !data.customerId || data.customerId === "walk-in");
  const WALK_IN_ID = "walk-in-customer";
  const customerId = isWalkIn ? WALK_IN_ID : (data.customerId || WALK_IN_ID);

  const isPaidOnCreation = data.status === "PAID" || (isWalkIn && data.advancePaid >= total) || (isWalkIn && !data.dueDate);
  const status = data.status || (isPaidOnCreation ? "PAID" : "DRAFT");
  const advancePaid = isPaidOnCreation ? total : data.advancePaid;
  const amountPaid = isPaidOnCreation ? total : data.advancePaid;
  const balanceDue = Math.max(0, total - amountPaid);

  // Allocate invoice number
  const number = await allocateDocumentNumber("INVOICE");

  try {
    if (isWalkIn) {
      await prisma.customer.upsert({
        where: { id: WALK_IN_ID },
        update: {},
        create: {
          id: WALK_IN_ID,
          name: "Walk-in Customer",
          phone: "—",
          isActive: true,
        },
      }).catch(() => {});
    }

    const invoice = await prisma.salesInvoice.create({
      data: {
        number,
        customerId,
        createdById: session.user.id,
        quotationId: data.quotationId,
        proformaId: data.proformaId,
        orderId: data.orderId,
        issueDate: new Date(data.issueDate),
        dueDate: new Date(data.dueDate),
        status: status as any,
        subtotal,
        discountAmount: data.discountAmount,
        deliveryCharge: data.deliveryCharge,
        taxAmount,
        total,
        advancePaid,
        amountPaid,
        balanceDue,
        notes: data.notes,
        terms: data.terms,
        isWalkIn,
        walkInName: data.walkInName || (isWalkIn ? "Walk-in Customer" : undefined),
        issuedAt: status === "PAID" ? new Date() : undefined,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            taxRate: item.taxRate,
            lineTotal:
              item.quantity * item.unitPrice -
              item.discount +
              ((item.quantity * item.unitPrice - item.discount) * item.taxRate) /
                100,
            sortOrder: item.sortOrder,
          })),
        },
      } as any,
      include: { customer: true, items: true },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      entityType: "Invoice",
      entityId: invoice.id,
      description: `Created ${status === "PAID" ? "counter bill" : "draft invoice"} ${invoice.number} for ${isWalkIn ? (data.walkInName || "Walk-in Customer") : ((invoice as any).customer?.name ?? "Customer")}`,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    }).catch(() => {});

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (err) {
    console.warn("Prisma invoice creation failed, using local store:", err);
    let allCustomers = readStore<any>("customers");
    let cust = allCustomers.find((c: any) => c.id === customerId);
    if (isWalkIn && !cust) {
      cust = addItemToStore("customers", {
        id: WALK_IN_ID,
        name: "Walk-in Customer",
        phone: "—",
        isActive: true,
      });
    }

    const storedItems = data.items.map((item, idx) => ({
      ...item,
      lineTotal:
        item.quantity * item.unitPrice -
        item.discount +
        ((item.quantity * item.unitPrice - item.discount) * item.taxRate) / 100,
      sortOrder: idx,
    }));

    const invoice = addItemToStore("invoices", {
      number,
      customerId,
      createdById: session.user.id,
      issueDate: new Date(data.issueDate),
      dueDate: new Date(data.dueDate),
      status,
      subtotal,
      discountAmount: data.discountAmount,
      deliveryCharge: data.deliveryCharge,
      taxAmount,
      total,
      advancePaid,
      amountPaid,
      balanceDue,
      notes: data.notes,
      terms: data.terms,
      isWalkIn,
      walkInName: data.walkInName || (isWalkIn ? "Walk-in Customer" : undefined),
      issuedAt: status === "PAID" ? new Date().toISOString() : undefined,
      items: storedItems,
      customer: isWalkIn
        ? {
            id: WALK_IN_ID,
            name: data.walkInName || "Walk-in Customer",
            phone: "—",
            email: "",
          }
        : (cust
            ? { id: cust.id, name: cust.name, phone: cust.phone, email: cust.email }
            : { name: "Valued Customer", phone: "" }),
    });
    return NextResponse.json({ invoice }, { status: 201 });
  }
}
