/**
 * API: GET /api/deliveries/[id]
 *      PUT /api/deliveries/[id] — Update delivery status & details
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { DeliveryStatus } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "delivery:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const delivery = await prisma.delivery.findUnique({
    where: { id },
    include: {
      order: true,
      customer: true,
    },
  });

  if (!delivery) return NextResponse.json({ error: "Delivery not found" }, { status: 404 });

  return NextResponse.json({ delivery });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "delivery:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const updateData: Record<string, unknown> = {
    notes: body.notes,
    courier: body.courier,
    trackingNumber: body.trackingNumber,
    driverContact: body.driverContact,
  };

  if (body.status) {
    updateData.status = body.status as DeliveryStatus;
    if (body.status === DeliveryStatus.DISPATCHED && !body.dispatchDate) {
      updateData.dispatchDate = new Date();
    } else if (body.status === DeliveryStatus.DELIVERED && !body.deliveredDate) {
      updateData.deliveredDate = new Date();
    }
  }

  const delivery = await prisma.delivery.update({
    where: { id },
    data: updateData,
  });

  await createAuditLog({
    userId: session.user.id,
    action: "STATUS_CHANGE",
    entityType: "Delivery",
    entityId: id,
    description: `Updated delivery status to ${delivery.status}`,
  });

  return NextResponse.json({ delivery });
}
