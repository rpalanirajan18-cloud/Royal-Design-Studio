/**
 * API: POST /api/proforma/[id]/convert — Convert Proforma to Sales Invoice
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { allocateDocumentNumber } from "@/lib/numbering";
import { DocumentType, InvoiceStatus, ProformaStatus } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "invoices:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const proforma = await prisma.proformaInvoice.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!proforma) return NextResponse.json({ error: "Proforma not found" }, { status: 404 });

  const now = new Date();
  const number = await allocateDocumentNumber(DocumentType.INVOICE, now);
  const dueDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

  const invoice = await prisma.salesInvoice.create({
    data: {
      number,
      customerId: proforma.customerId,
      createdById: session.user.id,
      proformaId: proforma.id,
      quotationId: proforma.quotationId,
      issueDate: now,
      dueDate,
      status: InvoiceStatus.DRAFT,
      subtotal: proforma.subtotal,
      discountAmount: proforma.discountAmount,
      deliveryCharge: proforma.deliveryCharge,
      taxAmount: proforma.taxAmount,
      total: proforma.total,
      advancePaid: proforma.advanceRequested ?? 0,
      amountPaid: 0,
      balanceDue: Math.max(0, Number(proforma.total) - Number(proforma.advanceRequested ?? 0)),
      notes: proforma.notes,
      terms: proforma.terms,
      items: {
        create: proforma.items.map((item) => ({
          productId: item.productId,
          description: item.description,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          taxRate: item.taxRate,
          lineTotal: item.lineTotal,
          sortOrder: item.sortOrder,
        })),
      },
    },
  });

  await prisma.proformaInvoice.update({
    where: { id },
    data: { status: ProformaStatus.CONVERTED },
  });

  await createAuditLog({
    userId: session.user.id,
    action: "STATUS_CHANGE",
    entityType: "ProformaInvoice",
    entityId: id,
    description: `Converted proforma ${proforma.number} to draft invoice ${invoice.number}`,
  });

  return NextResponse.json({ invoice, message: `Created invoice ${invoice.number}` });
}
