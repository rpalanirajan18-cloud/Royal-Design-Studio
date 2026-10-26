/**
 * API: GET /api/quotations/[id] — Detail of quotation
 *      PUT /api/quotations/[id] — Update quotation
 *      DELETE /api/quotations/[id] — Delete or cancel quotation
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { QuotationStatus } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "quotations:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      customer: true,
      createdBy: { select: { id: true, name: true, email: true } },
      items: {
        include: { product: true },
        orderBy: { sortOrder: "asc" },
      },
      invoices: { select: { id: true, number: true, status: true, total: true } },
      proformas: { select: { id: true, number: true, status: true, total: true } },
    },
  });

  if (!quotation) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });

  return NextResponse.json({ quotation });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "quotations:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const quotation = await prisma.quotation.update({
    where: { id },
    data: {
      status: body.status,
      notes: body.notes,
      terms: body.terms,
      validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
    },
  });

  await createAuditLog({
    userId: session.user.id,
    action: "UPDATE",
    entityType: "Quotation",
    entityId: id,
    description: `Updated quotation ${quotation.number} status to ${quotation.status}`,
  });

  return NextResponse.json({ quotation });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "quotations:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const quotation = await prisma.quotation.findUnique({ where: { id } });
  if (!quotation) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });

  if (quotation.status === QuotationStatus.DRAFT) {
    await prisma.quotation.delete({ where: { id } });
  } else {
    await prisma.quotation.update({
      where: { id },
      data: { status: QuotationStatus.CANCELLED },
    });
  }

  await createAuditLog({
    userId: session.user.id,
    action: "DELETE",
    entityType: "Quotation",
    entityId: id,
    description: `Deleted or cancelled quotation ${quotation.number}`,
  });

  return NextResponse.json({ message: "Quotation removed" });
}
