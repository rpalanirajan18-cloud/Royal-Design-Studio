/**
 * API: POST /api/quotations/[id]/convert — Convert Quotation into Invoice or Proforma
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { allocateDocumentNumber } from "@/lib/numbering";
import { DocumentType, InvoiceStatus, QuotationStatus } from "@prisma/client";

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
  const body = await request.json();
  const targetType = body.targetType ?? "INVOICE"; // "INVOICE" or "PROFORMA"

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!quotation) {
    return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
  }

  const now = new Date();

  if (targetType === "INVOICE") {
    const number = await allocateDocumentNumber(DocumentType.INVOICE, now);
    const dueDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 days default

    const invoice = await prisma.salesInvoice.create({
      data: {
        number,
        customerId: quotation.customerId,
        createdById: session.user.id,
        quotationId: quotation.id,
        issueDate: now,
        dueDate,
        status: InvoiceStatus.DRAFT,
        subtotal: quotation.subtotal,
        discountAmount: quotation.discountAmount,
        deliveryCharge: quotation.deliveryCharge,
        taxAmount: quotation.taxAmount,
        total: quotation.total,
        advancePaid: 0,
        amountPaid: 0,
        balanceDue: quotation.total,
        notes: quotation.notes,
        terms: quotation.terms,
        items: {
          create: quotation.items.map((item) => ({
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

    // Mark quotation as ACCEPTED
    await prisma.quotation.update({
      where: { id },
      data: { status: QuotationStatus.ACCEPTED },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "STATUS_CHANGE",
      entityType: "Quotation",
      entityId: id,
      description: `Converted quotation ${quotation.number} into draft invoice ${invoice.number}`,
    });

    return NextResponse.json({ invoice, message: `Created invoice ${invoice.number}` });
  } else {
    // Convert to Proforma
    const number = await allocateDocumentNumber(DocumentType.PROFORMA, now);

    const proforma = await prisma.proformaInvoice.create({
      data: {
        number,
        customerId: quotation.customerId,
        createdById: session.user.id,
        quotationId: quotation.id,
        issueDate: now,
        subtotal: quotation.subtotal,
        discountAmount: quotation.discountAmount,
        deliveryCharge: quotation.deliveryCharge,
        taxAmount: quotation.taxAmount,
        total: quotation.total,
        advanceRequested: quotation.total,
        notes: quotation.notes,
        terms: quotation.terms,
        items: {
          create: quotation.items.map((item) => ({
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

    await createAuditLog({
      userId: session.user.id,
      action: "STATUS_CHANGE",
      entityType: "Quotation",
      entityId: id,
      description: `Converted quotation ${quotation.number} into proforma invoice ${proforma.number}`,
    });

    return NextResponse.json({ proforma, message: `Created proforma invoice ${proforma.number}` });
  }
}
