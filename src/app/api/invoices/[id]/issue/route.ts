/**
 * API: POST /api/invoices/[id]/issue — Issue a draft invoice (lock it)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";

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

  const invoice = await prisma.salesInvoice.findUnique({ where: { id } });
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
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
    description: `Issued invoice ${updated.number} to ${updated.customer.name}`,
    metadata: { previousStatus: "DRAFT", newStatus: "ISSUED" },
  });

  return NextResponse.json({ invoice: updated });
}
