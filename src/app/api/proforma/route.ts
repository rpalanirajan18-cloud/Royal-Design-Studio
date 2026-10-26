/**
 * API: GET /api/proforma — List proforma invoices
 *      POST /api/proforma — Create new proforma invoice
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { allocateDocumentNumber } from "@/lib/numbering";
import { z } from "zod";
import { DocumentType, ProformaStatus } from "@prisma/client";

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

const createProformaSchema = z.object({
  customerId: z.string().min(1),
  quotationId: z.string().optional(),
  issueDate: z.string().datetime({ offset: true }).or(z.string()),
  validUntil: z.string().datetime({ offset: true }).or(z.string()).optional(),
  advanceRequested: z.number().nonnegative().optional(),
  paymentTerms: z.string().optional(),
  items: z.array(lineItemSchema).min(1),
  discountAmount: z.number().nonnegative().default(0),
  deliveryCharge: z.number().nonnegative().default(0),
  notes: z.string().optional(),
  terms: z.string().optional(),
});

import { readStore, addItemToStore } from "@/lib/store";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "proforma:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const skip = (page - 1) * limit;

  const where = {
    ...(status ? { status: status as ProformaStatus } : {}),
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
    const [proformas, total] = await Promise.all([
      prisma.proformaInvoice.findMany({
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
      prisma.proformaInvoice.count({ where }),
    ]);

    return NextResponse.json({ proformas, total, page, limit });
  } catch (err) {
    console.warn("Could not query proformas from database, using fallback store:", err);
    let all = readStore<any>("proforma");
    if (search) {
      all = all.filter(p => p.number?.toLowerCase().includes(search.toLowerCase()) || p.customer?.name?.toLowerCase().includes(search.toLowerCase()));
    }
    return NextResponse.json({ proformas: all.slice(skip, skip + limit), total: all.length, page, limit });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "proforma:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createProformaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const issueDate = new Date(data.issueDate);
  const validUntil = data.validUntil ? new Date(data.validUntil) : undefined;

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
  let number = `PI-2627-${Date.now().toString().slice(-4)}`;
  try {
    number = await allocateDocumentNumber(DocumentType.PROFORMA, issueDate);
  } catch (err) {
    console.warn("Number allocation fallback:", err);
  }

  try {
    const proforma = await prisma.proformaInvoice.create({
      data: {
        number,
        customerId: data.customerId,
        createdById: session.user.id,
        quotationId: data.quotationId,
        issueDate,
        validUntil,
        advanceRequested: data.advanceRequested,
        paymentTerms: data.paymentTerms,
        status: ProformaStatus.DRAFT,
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
      entityType: "ProformaInvoice",
      entityId: proforma.id,
      description: `Created proforma invoice ${proforma.number} for ${proforma.customer.name}`,
    }).catch(() => {});

    return NextResponse.json({ proforma }, { status: 201 });
  } catch (err) {
    console.warn("Prisma proforma create failed, writing to fallback store:", err);
    const customers = readStore<any>("customers");
    const customer = customers.find(c => c.id === data.customerId) || { id: data.customerId, name: "Customer", phone: "" };
    const proforma = addItemToStore("proforma", {
      number,
      customerId: data.customerId,
      customer,
      issueDate,
      validUntil,
      status: "DRAFT",
      subtotal,
      discountAmount: data.discountAmount,
      deliveryCharge: data.deliveryCharge,
      taxAmount,
      total,
      notes: data.notes,
      items: preparedItems,
      createdAt: new Date(),
    });
    return NextResponse.json({ proforma }, { status: 201 });
  }
}
