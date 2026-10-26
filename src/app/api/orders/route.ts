/**
 * API: GET /api/orders — List custom orders
 *      POST /api/orders — Create custom gifting/printing order
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { allocateDocumentNumber } from "@/lib/numbering";
import { z } from "zod";
import { DocumentType, OrderStatus } from "@prisma/client";

const orderItemSchema = z.object({
  productId: z.string().optional(),
  description: z.string().min(1),
  unit: z.string().default("pcs"),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  size: z.string().optional(),
  material: z.string().optional(),
  color: z.string().optional(),
  specifications: z.string().optional(),
  estimatedCost: z.number().nonnegative().optional(),
  sortOrder: z.number().default(0),
});

const createOrderSchema = z.object({
  customerId: z.string().min(1),
  quotationId: z.string().optional(),
  orderDate: z.string().datetime({ offset: true }).or(z.string()),
  requiredByDate: z.string().datetime({ offset: true }).or(z.string()).optional(),
  customizationNotes: z.string().optional(),
  designNotes: z.string().optional(),
  productionNotes: z.string().optional(),
  deliveryAddress: z.string().optional(),
  deliveryCity: z.string().optional(),
  deliveryPincode: z.string().optional(),
  deliveryCharge: z.number().nonnegative().default(0),
  advanceAmount: z.number().nonnegative().default(0),
  notes: z.string().optional(),
  items: z.array(orderItemSchema).min(1),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "orders:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const skip = (page - 1) * limit;

  const where = {
    ...(status ? { status: status as OrderStatus } : {}),
    ...(search
      ? {
          OR: [
            { number: { contains: search, mode: "insensitive" as const } },
            { customer: { name: { contains: search, mode: "insensitive" as const } } },
            { customizationNotes: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  try {
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          createdBy: { select: { id: true, name: true } },
          items: true,
          statusHistory: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { updatedBy: { select: { name: true } } },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({ orders, total, page, limit });
  } catch (err) {
    console.warn("Could not query orders from database:", err);
    return NextResponse.json({ orders: [], total: 0, page: 1, limit });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "orders:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const orderDate = new Date(data.orderDate);
  const requiredByDate = data.requiredByDate ? new Date(data.requiredByDate) : undefined;

  let totalAmount = 0;
  const preparedItems = data.items.map((item, index) => {
    const lineTotal = item.quantity * item.unitPrice;
    totalAmount += lineTotal;
    return {
      productId: item.productId,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      size: item.size,
      material: item.material,
      color: item.color,
      specifications: item.specifications,
      estimatedCost: item.estimatedCost,
      lineTotal,
      sortOrder: index,
    };
  });

  totalAmount += data.deliveryCharge;
  const balanceDue = Math.max(0, totalAmount - data.advanceAmount);
  const number = await allocateDocumentNumber(DocumentType.ORDER, orderDate);

  const order = await prisma.order.create({
    data: {
      number,
      customerId: data.customerId,
      createdById: session.user.id,
      quotationId: data.quotationId,
      orderDate,
      requiredByDate,
      status: OrderStatus.NEW,
      customizationNotes: data.customizationNotes,
      designNotes: data.designNotes,
      productionNotes: data.productionNotes,
      deliveryAddress: data.deliveryAddress,
      deliveryCity: data.deliveryCity,
      deliveryPincode: data.deliveryPincode,
      deliveryCharge: data.deliveryCharge,
      advanceAmount: data.advanceAmount,
      balanceDue,
      notes: data.notes,
      items: {
        create: preparedItems,
      },
      statusHistory: {
        create: {
          updatedById: session.user.id,
          toStatus: OrderStatus.NEW,
          notes: "Order placed",
        },
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
    entityType: "Order",
    entityId: order.id,
    description: `Created order ${order.number} for ${order.customer.name}`,
  });

  return NextResponse.json({ order }, { status: 201 });
}
