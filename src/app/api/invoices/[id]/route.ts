/**
 * API: GET /api/invoices/[id] — Get single invoice with customer, items, allocations
 *      PUT /api/invoices/[id] — Update draft invoice
 *      DELETE /api/invoices/[id] — Void or cancel invoice
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { InvoiceStatus } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "invoices:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const invoice = await prisma.salesInvoice.findUnique({
    where: { id },
    include: {
      customer: true,
      createdBy: { select: { id: true, name: true, email: true, role: true } },
      items: {
        include: { product: true },
        orderBy: { sortOrder: "asc" },
      },
      paymentAllocations: {
        include: { payment: true },
        orderBy: { allocatedAt: "desc" },
      },
      quotation: { select: { id: true, number: true } },
      proforma: { select: { id: true, number: true } },
    },
  });

  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  return NextResponse.json({ invoice });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "invoices:cancel")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const invoice = await prisma.salesInvoice.findUnique({ where: { id } });
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  if (invoice.status === InvoiceStatus.DRAFT) {
    // Draft can be deleted
    await prisma.salesInvoice.delete({ where: { id } });
    await createAuditLog({
      userId: session.user.id,
      action: "DELETE",
      entityType: "SalesInvoice",
      entityId: id,
      description: `Deleted draft invoice ${invoice.number}`,
    });
    return NextResponse.json({ message: "Draft invoice deleted" });
  } else {
    // Issued invoices cannot be deleted — they must be CANCELLED or VOIDED
    const updated = await prisma.salesInvoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: "Cancelled by administrator",
      },
    });
    await createAuditLog({
      userId: session.user.id,
      action: "INVOICE_CANCEL",
      entityType: "SalesInvoice",
      entityId: id,
      description: `Cancelled invoice ${invoice.number}`,
    });
    return NextResponse.json({ invoice: updated, message: "Invoice cancelled" });
  }
}
