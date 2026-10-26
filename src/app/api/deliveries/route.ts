/**
 * API: GET /api/deliveries — List deliveries
 *      POST /api/deliveries — Create delivery challan / tracking
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";
import { DeliveryStatus } from "@prisma/client";

const createDeliverySchema = z.object({
  orderId: z.string().optional(),
  customerId: z.string().optional(),
  recipientName: z.string().min(1),
  recipientPhone: z.string().min(1),
  address: z.string().min(1),
  city: z.string().optional(),
  pincode: z.string().optional(),
  deliveryFee: z.number().nonnegative().default(0),
  expectedDate: z.string().datetime({ offset: true }).or(z.string()).optional(),
  courier: z.string().optional(),
  driverContact: z.string().optional(),
  trackingNumber: z.string().optional(),
  notes: z.string().optional(),
});

import { readStore, addItemToStore } from "@/lib/store";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "delivery:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status");

  try {
    const deliveries = await prisma.delivery.findMany({
      where: {
        ...(status ? { status: status as DeliveryStatus } : {}),
        ...(search
          ? {
              OR: [
                { recipientName: { contains: search, mode: "insensitive" } },
                { recipientPhone: { contains: search, mode: "insensitive" } },
                { trackingNumber: { contains: search, mode: "insensitive" } },
                { courier: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        order: { select: { id: true, number: true } },
        customer: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ deliveries });
  } catch (err) {
    console.warn("Could not query deliveries from database, reading local store:", err);
    let all = readStore<any>("deliveries");
    if (search) {
      all = all.filter(d => d.recipientName?.toLowerCase().includes(search.toLowerCase()) || d.recipientPhone?.includes(search) || d.trackingNumber?.toLowerCase().includes(search.toLowerCase()));
    }
    return NextResponse.json({ deliveries: all });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "delivery:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createDeliverySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  try {
    const delivery = await prisma.delivery.create({
      data: {
        orderId: data.orderId,
        customerId: data.customerId,
        recipientName: data.recipientName,
        recipientPhone: data.recipientPhone,
        address: data.address,
        city: data.city,
        pincode: data.pincode,
        deliveryFee: data.deliveryFee,
        expectedDate: data.expectedDate ? new Date(data.expectedDate) : undefined,
        courier: data.courier,
        driverContact: data.driverContact,
        trackingNumber: data.trackingNumber,
        notes: data.notes,
        status: DeliveryStatus.PENDING,
      },
      include: {
        order: true,
        customer: true,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      entityType: "Delivery",
      entityId: delivery.id,
      description: `Created delivery for ${delivery.recipientName} (${delivery.trackingNumber ?? "Local"})`,
    }).catch(() => {});

    return NextResponse.json({ delivery }, { status: 201 });
  } catch (err) {
    console.warn("Prisma delivery create failed, saving to local store:", err);
    const customers = readStore<any>("customers");
    const customer = customers.find(c => c.id === data.customerId) || { id: data.customerId, name: data.recipientName, phone: data.recipientPhone };
    const delivery = addItemToStore("deliveries", {
      ...data,
      customer,
      status: "PENDING",
      createdAt: new Date(),
    });
    return NextResponse.json({ delivery }, { status: 201 });
  }
}
