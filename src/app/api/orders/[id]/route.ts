/**
 * API: GET /api/orders/[id] — Detail of order
 *      PUT /api/orders/[id] — Update order (status transitions, artwork approval, notes)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { OrderStatus } from "@prisma/client";
import { readStore, writeStore } from "@/lib/store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "orders:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: { select: { id: true, name: true, email: true } },
        items: {
          include: { product: true },
          orderBy: { sortOrder: "asc" },
        },
        statusHistory: {
          include: { updatedBy: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
        },
        deliveries: true,
        invoices: { select: { id: true, number: true, status: true, total: true } },
      },
    });

    if (order) return NextResponse.json({ order });
  } catch (err) {
    console.warn("Prisma get order failed, falling back to local store:", err);
  }

  const allOrders = readStore<any>("orders");
  const order = allOrders.find((o: any) => o.id === id || o.number === id);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const customers = readStore<any>("customers");
  const cust = customers.find((c: any) => c.id === order.customerId);
  const result = {
    ...order,
    customer: cust
      ? { id: cust.id, name: cust.name, phone: cust.phone, email: cust.email }
      : (order.customer || { name: "Valued Customer", phone: "" }),
  };

  return NextResponse.json({ order: result });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "orders:status_update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  try {
    const currentOrder = await prisma.order.findUnique({ where: { id } });
    if (currentOrder) {
      const statusChanged = body.status && body.status !== currentOrder.status;

      const updateData: Record<string, unknown> = {
        customizationNotes: body.customizationNotes,
        designNotes: body.designNotes,
        productionNotes: body.productionNotes,
        notes: body.notes,
        requiredByDate: body.requiredByDate ? new Date(body.requiredByDate) : undefined,
        actualCost: body.actualCost !== undefined ? Number(body.actualCost) : undefined,
      };

      if (body.proofSentAt) updateData.proofSentAt = new Date(body.proofSentAt);
      if (body.approvedAt) {
        updateData.approvedAt = new Date(body.approvedAt);
        updateData.approvedBy = body.approvedBy ?? session.user.name;
      }

      if (statusChanged) {
        updateData.status = body.status as OrderStatus;
      }

      const order = await prisma.order.update({
        where: { id },
        data: updateData,
      });

      if (statusChanged) {
        await prisma.orderStatusHistory.create({
          data: {
            orderId: id,
            updatedById: session.user.id,
            fromStatus: currentOrder.status,
            toStatus: body.status as OrderStatus,
            notes: body.statusNotes ?? `Status updated to ${body.status}`,
          },
        }).catch(() => {});
      }

      await createAuditLog({
        userId: session.user.id,
        action: "STATUS_CHANGE",
        entityType: "Order",
        entityId: id,
        description: `Updated order ${order.number}${statusChanged ? ` status to ${body.status}` : ""}`,
      }).catch(() => {});

      return NextResponse.json({ order });
    }
  } catch (err) {
    console.warn("Prisma update order failed, updating local store:", err);
  }

  const allOrders = readStore<any>("orders");
  const idx = allOrders.findIndex((o: any) => o.id === id || o.number === id);
  if (idx === -1) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  allOrders[idx] = {
    ...allOrders[idx],
    status: body.status || allOrders[idx].status,
    notes: body.notes !== undefined ? body.notes : allOrders[idx].notes,
    customizationNotes: body.customizationNotes !== undefined ? body.customizationNotes : allOrders[idx].customizationNotes,
    designNotes: body.designNotes !== undefined ? body.designNotes : allOrders[idx].designNotes,
    productionNotes: body.productionNotes !== undefined ? body.productionNotes : allOrders[idx].productionNotes,
    updatedAt: new Date().toISOString(),
  };
  writeStore("orders", allOrders);

  return NextResponse.json({ order: allOrders[idx] });
}
