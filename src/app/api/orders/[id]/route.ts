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

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  return NextResponse.json({ order });
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

  const currentOrder = await prisma.order.findUnique({ where: { id } });
  if (!currentOrder) return NextResponse.json({ error: "Order not found" }, { status: 404 });

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

  // Record history if status changed
  if (statusChanged) {
    await prisma.orderStatusHistory.create({
      data: {
        orderId: id,
        updatedById: session.user.id,
        fromStatus: currentOrder.status,
        toStatus: body.status as OrderStatus,
        notes: body.statusNotes ?? `Status updated to ${body.status}`,
      },
    });
  }

  await createAuditLog({
    userId: session.user.id,
    action: "STATUS_CHANGE",
    entityType: "Order",
    entityId: id,
    description: `Updated order ${order.number}${statusChanged ? ` status to ${body.status}` : ""}`,
  });

  return NextResponse.json({ order });
}
