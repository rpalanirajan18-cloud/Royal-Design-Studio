/**
 * API: GET /api/proforma/[id]
 *      PUT /api/proforma/[id]
 *      DELETE /api/proforma/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { ProformaStatus } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "proforma:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const proforma = await prisma.proformaInvoice.findUnique({
    where: { id },
    include: {
      customer: true,
      createdBy: { select: { id: true, name: true, email: true } },
      items: {
        include: { product: true },
        orderBy: { sortOrder: "asc" },
      },
      invoices: { select: { id: true, number: true, status: true, total: true } },
    },
  });

  if (!proforma) return NextResponse.json({ error: "Proforma invoice not found" }, { status: 404 });

  return NextResponse.json({ proforma });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "proforma:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const proforma = await prisma.proformaInvoice.update({
    where: { id },
    data: {
      status: body.status,
      notes: body.notes,
      terms: body.terms,
      advanceRequested: body.advanceRequested,
    },
  });

  await createAuditLog({
    userId: session.user.id,
    action: "UPDATE",
    entityType: "ProformaInvoice",
    entityId: id,
    description: `Updated proforma invoice ${proforma.number}`,
  });

  return NextResponse.json({ proforma });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "proforma:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const proforma = await prisma.proformaInvoice.findUnique({ where: { id } });
  if (!proforma) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (proforma.status === ProformaStatus.DRAFT) {
    await prisma.proformaInvoice.delete({ where: { id } });
  } else {
    await prisma.proformaInvoice.update({
      where: { id },
      data: { status: ProformaStatus.CANCELLED },
    });
  }

  await createAuditLog({
    userId: session.user.id,
    action: "DELETE",
    entityType: "ProformaInvoice",
    entityId: id,
    description: `Cancelled proforma ${proforma.number}`,
  });

  return NextResponse.json({ message: "Proforma invoice removed" });
}
