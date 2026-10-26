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
import { readStore, writeStore } from "@/lib/store";

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
  try {
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

    if (quotation) return NextResponse.json({ quotation });
  } catch (err) {
    console.warn("Prisma get quotation failed, falling back to local store:", err);
  }

  const allQuotations = readStore<any>("quotations");
  const quotation = allQuotations.find((q: any) => q.id === id || q.number === id);
  if (!quotation) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });

  const customers = readStore<any>("customers");
  const cust = customers.find((c: any) => c.id === quotation.customerId);
  const result = {
    ...quotation,
    customer: cust
      ? { id: cust.id, name: cust.name, phone: cust.phone, email: cust.email }
      : (quotation.customer || { name: "Valued Customer", phone: "" }),
  };

  return NextResponse.json({ quotation: result });
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

  try {
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
    }).catch(() => {});

    return NextResponse.json({ quotation });
  } catch (err) {
    console.warn("Prisma update quotation failed, updating local store:", err);
  }

  const allQuotations = readStore<any>("quotations");
  const idx = allQuotations.findIndex((q: any) => q.id === id || q.number === id);
  if (idx === -1) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });

  allQuotations[idx] = {
    ...allQuotations[idx],
    status: body.status || allQuotations[idx].status,
    notes: body.notes !== undefined ? body.notes : allQuotations[idx].notes,
    terms: body.terms !== undefined ? body.terms : allQuotations[idx].terms,
    validUntil: body.validUntil || allQuotations[idx].validUntil,
    updatedAt: new Date().toISOString(),
  };
  writeStore("quotations", allQuotations);

  return NextResponse.json({ quotation: allQuotations[idx] });
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

  try {
    const quotation = await prisma.quotation.findUnique({ where: { id } });
    if (quotation) {
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
      }).catch(() => {});

      return NextResponse.json({ message: "Quotation removed" });
    }
  } catch (err) {
    console.warn("Prisma delete quotation failed, updating local store:", err);
  }

  const allQuotations = readStore<any>("quotations");
  const idx = allQuotations.findIndex((q: any) => q.id === id || q.number === id);
  if (idx === -1) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });

  if (allQuotations[idx].status === "DRAFT") {
    allQuotations.splice(idx, 1);
  } else {
    allQuotations[idx].status = "CANCELLED";
  }
  writeStore("quotations", allQuotations);

  return NextResponse.json({ message: "Quotation removed" });
}
