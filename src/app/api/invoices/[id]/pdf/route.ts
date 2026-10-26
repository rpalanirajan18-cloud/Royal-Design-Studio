import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { generateInvoicePDF } from "@/lib/pdf";
import { prisma } from "@/lib/prisma";
import { readStore } from "@/lib/store";

function sanitizeFilename(str: string): string {
  return str
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  // If an active session exists, enforce permissions
  if (session && !hasPermission(session.user.role, "invoices:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Resolve invoice metadata for clean filename
  let customerName = "Client";
  let invoiceNumber = id;

  try {
    const inv = await prisma.salesInvoice.findUnique({
      where: { id },
      select: { number: true, customer: { select: { name: true } } },
    });
    if (inv) {
      invoiceNumber = inv.number;
      customerName = inv.customer?.name || "Client";
    }
  } catch {
    // Database offline, check local store
  }

  if (customerName === "Client") {
    const allInvoices = readStore<any>("invoices");
    const inv = allInvoices.find((i: any) => i.id === id || i.number === id);
    if (inv) {
      invoiceNumber = inv.number;
      if (inv.customer?.name) {
        customerName = inv.customer.name;
      } else if (inv.customerId) {
        const customers = readStore<any>("customers");
        const cust = customers.find((c: any) => c.id === inv.customerId);
        if (cust?.name) customerName = cust.name;
      }
    }
  }

  const filename = `${sanitizeFilename(customerName)} - ${sanitizeFilename(invoiceNumber)}.pdf`;
  const encodedFilename = encodeURIComponent(filename).replace(/['()]/g, escape);

  try {
    const pdfBuffer = await generateInvoicePDF(id);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PDF generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
