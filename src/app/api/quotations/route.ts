/**
 * API: GET /api/quotations — List quotations
 *      POST /api/quotations — Create new quotation
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { allocateDocumentNumber } from "@/lib/numbering";
import { z } from "zod";
import { DocumentType, QuotationStatus } from "@prisma/client";

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

const createQuotationSchema = z.object({
  customerId: z.string().min(1),
  issueDate: z.string().datetime({ offset: true }).or(z.string()),
  validUntil: z.string().datetime({ offset: true }).or(z.string()),
  items: z.array(lineItemSchema).min(1),
  discountAmount: z.number().nonnegative().default(0),
  deliveryCharge: z.number().nonnegative().default(0),
  notes: z.string().optional(),
  terms: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "quotations:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const skip = (page - 1) * limit;

  const where = {
    ...(status ? { status: status as QuotationStatus } : {}),
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
    const [quotations, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { id: true, name: true, phone: true, email: true } },
          createdBy: { select: { id: true, name: true } },
          items: true,
        },
      }),
      prisma.quotation.count({ where }),
    ]);

    return NextResponse.json({ quotations, total, page, limit });
  } catch (err) {
    console.warn("Could not query quotations from database:", err);
    return NextResponse.json({ quotations: [], total: 0, page: 1, limit });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "quotations:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createQuotationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const issueDate = new Date(data.issueDate);
  const validUntil = new Date(data.validUntil);

  // Calculate items and totals
  let subtotal = 0;
  let taxAmount = 0;

  const preparedItems = data.items.map((item, index) => {
    const itemSubtotal = item.quantity * item.unitPrice;
    const itemNet = Math.max(0, itemSubtotal - item.discount);
    const itemTax = (itemNet * item.taxRate) / 100;
    const lineTotal = itemNet + itemTax;

    subtotal += itemNet;
    taxAmount += itemTax;

    return {
      productId: item.productId,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      taxRate: item.taxRate,
      lineTotal: Math.round(lineTotal * 100) / 100,
      sortOrder: index,
    };
  });

  const total = Math.max(0, subtotal - data.discountAmount + data.deliveryCharge + taxAmount);

  // Allocate document number
  const number = await allocateDocumentNumber(DocumentType.QUOTATION, issueDate);

  const quotation = await prisma.quotation.create({
    data: {
      number,
      customerId: data.customerId,
      createdById: session.user.id,
      issueDate,
      validUntil,
      status: QuotationStatus.DRAFT,
      subtotal: Math.round(subtotal * 100) / 100,
      discountAmount: data.discountAmount,
      deliveryCharge: data.deliveryCharge,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
      notes: data.notes,
      terms: data.terms,
      items: {
        create: preparedItems,
      },
    },
    include: {
      customer: true,
      items: true,
    },
  });

  await createAuditLog({
    userId: session.user.id,
    action: "CREATE",
    entityType: "Quotation",
    entityId: quotation.id,
    description: `Created quotation ${quotation.number} for ${quotation.customer.name}`,
  });

  return NextResponse.json({ quotation }, { status: 201 });
}
