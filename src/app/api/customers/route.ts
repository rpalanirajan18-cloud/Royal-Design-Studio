/**
 * API: GET /api/customers — list with search + pagination
 *      POST /api/customers — create new customer
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const createCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  contactPerson: z.string().optional(),
  phone: z.string().min(7).max(20),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  billingAddress: z.string().optional(),
  billingCity: z.string().optional(),
  billingState: z.string().optional(),
  billingPincode: z.string().optional(),
  deliveryAddress: z.string().optional(),
  deliveryCity: z.string().optional(),
  deliveryState: z.string().optional(),
  deliveryPincode: z.string().optional(),
  gstin: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "customers:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const skip = (page - 1) * limit;
  const active = searchParams.get("active");

  const where = {
    ...(active !== null ? { isActive: active === "true" } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search } },
            { email: { contains: search, mode: "insensitive" as const } },
            { contactPerson: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({ where, skip, take: limit, orderBy: { name: "asc" } }),
    prisma.customer.count({ where }),
  ]);

  return NextResponse.json({ customers, total, page, limit });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "customers:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createCustomerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const customer = await prisma.customer.create({
    data: {
      ...parsed.data,
      email: parsed.data.email || undefined,
    },
  });

  await createAuditLog({
    userId: session.user.id,
    action: "CREATE",
    entityType: "Customer",
    entityId: customer.id,
    description: `Created customer: ${customer.name}`,
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ customer }, { status: 201 });
}
