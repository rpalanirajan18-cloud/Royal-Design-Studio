/**
 * API: PUT /api/recurring/[id] — Toggle plan status (ACTIVE, PAUSED, CANCELLED)
 *      DELETE /api/recurring/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { RecurringPlanStatus } from "@prisma/client";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "recurring:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const plan = await prisma.recurringPlan.update({
    where: { id },
    data: {
      status: body.status as RecurringPlanStatus,
      notes: body.notes,
      monthlyFee: body.monthlyFee !== undefined ? Number(body.monthlyFee) : undefined,
    },
  });

  await createAuditLog({
    userId: session.user.id,
    action: "STATUS_CHANGE",
    entityType: "RecurringPlan",
    entityId: id,
    description: `Updated recurring plan status to ${plan.status}`,
  });

  return NextResponse.json({ plan });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "recurring:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.recurringPlan.delete({ where: { id } });

  await createAuditLog({
    userId: session.user.id,
    action: "DELETE",
    entityType: "RecurringPlan",
    entityId: id,
    description: `Deleted recurring plan ${id}`,
  });

  return NextResponse.json({ message: "Plan removed" });
}
