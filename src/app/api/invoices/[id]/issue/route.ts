/**
 * API: POST /api/invoices/[id]/issue — Issue a draft invoice (lock it)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { readStore, writeStore } from "@/lib/store";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "invoices:issue")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const invoice = await prisma.salesInvoice.findUnique({ where: { id } });
    if (invoice) {
      if (invoice.status !== "DRAFT") {
        return NextResponse.json(
          { error: "Only DRAFT invoices can be issued" },
          { status: 400 }
        );
      }

      const updated = await prisma.salesInvoice.update({
        where: { id },
        data: {
          status: "ISSUED",
          issuedAt: new Date(),
        },
        include: { customer: true },
      });

      await createAuditLog({
        userId: session.user.id,
        action: "INVOICE_ISSUE",
        entityType: "Invoice",
        entityId: id,
        description: `Issued invoice ${updated.number} to ${updated.customer?.name ?? "Customer"}`,
        metadata: { previousStatus: "DRAFT", newStatus: "ISSUED" },
      }).catch(() => {});

      return NextResponse.json({ invoice: updated });
    }
  } catch (err) {
    console.warn("Prisma issue invoice failed, updating local store:", err);
  }

  // Local store fallback
  const allInvoices = readStore<any>("invoices");
  const idx = allInvoices.findIndex((i: any) => i.id === id || i.number === id);
  if (idx === -1) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  if (allInvoices[idx].status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only DRAFT invoices can be issued" },
      { status: 400 }
    );
  }

  allInvoices[idx].status = "ISSUED";
  allInvoices[idx].issuedAt = new Date().toISOString();
  writeStore("invoices", allInvoices);

  return NextResponse.json({ invoice: allInvoices[idx] });
}
