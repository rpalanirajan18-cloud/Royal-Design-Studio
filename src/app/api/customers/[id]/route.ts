/**
 * API: GET /api/customers/[id]
 *      PUT /api/customers/[id] — update customer
 *      DELETE /api/customers/[id] — delete customer
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";
import { readStore, writeStore } from "@/lib/store";

export const dynamic = "force-dynamic";

const updateCustomerSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  contactPerson: z.string().optional(),
  phone: z.string().min(7).max(20).optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  billingAddress: z.string().optional(),
  billingCity: z.string().optional(),
  billingState: z.string().optional(),
  billingPincode: z.string().optional(),
  gstin: z.string().optional(),
  isActive: z.boolean().optional(),
  pricingTier: z.enum(["RETAIL", "WHOLESALE"]).optional(),
  notes: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "customers:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new Error("Not found");
    return NextResponse.json({ customer });
  } catch {
    const customers = readStore<any>("customers");
    const customer = customers.find((c: any) => c.id === id);
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    return NextResponse.json({ customer });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "customers:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateCustomerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...parsed.data,
        email: parsed.data.email || undefined,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entityType: "Customer",
      entityId: id,
      description: `Updated customer: ${customer.name}`,
    }).catch(() => {});

    return NextResponse.json({ customer });
  } catch (err) {
    console.warn("Prisma customer update failed, updating local store:", err);
    const customers = readStore<any>("customers");
    const index = customers.findIndex((c: any) => c.id === id);
    if (index === -1) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    customers[index] = {
      ...customers[index],
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    };
    writeStore("customers", customers);
    return NextResponse.json({ customer: customers[index] });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "customers:delete")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    // Check if customer has invoices or orders before hard deleting
    const [invoiceCount, orderCount] = await Promise.all([
      prisma.salesInvoice.count({ where: { customerId: id } }),
      prisma.order.count({ where: { customerId: id } }),
    ]);

    if (invoiceCount > 0 || orderCount > 0) {
      // Soft delete by deactivating to preserve financial integrity
      const customer = await prisma.customer.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({ 
        message: "Customer has associated invoices or orders and was deactivated", 
        customer,
        deactivated: true 
      });
    }

    await prisma.customer.delete({ where: { id } });

    await createAuditLog({
      userId: session.user.id,
      action: "DELETE",
      entityType: "Customer",
      entityId: id,
      description: `Deleted customer ID: ${id}`,
    }).catch(() => {});

    return NextResponse.json({ success: true, deleted: true });
  } catch (err) {
    console.warn("Prisma customer delete failed, removing from local store:", err);
    const customers = readStore<any>("customers");
    const remaining = customers.filter((c: any) => c.id !== id);
    writeStore("customers", remaining);
    return NextResponse.json({ success: true, deleted: true });
  }
}
