/**
 * API: GET /api/recurring — List recurring billing plans
 *      POST /api/recurring — Create recurring billing plan
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";
import { RecurringFrequency, RecurringPlanStatus } from "@prisma/client";

const createPlanSchema = z.object({
  customerId: z.string().min(1),
  description: z.string().min(1),
  monthlyFee: z.number().positive(),
  frequency: z.nativeEnum(RecurringFrequency).default(RecurringFrequency.MONTHLY),
  billingDayOfMonth: z.number().int().min(1).max(28).default(1),
  startDate: z.string().datetime({ offset: true }).or(z.string()),
  endDate: z.string().datetime({ offset: true }).or(z.string()).optional(),
  notes: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "recurring:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const plans = await prisma.recurringPlan.findMany({
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        runs: {
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ plans });
  } catch (err) {
    console.warn("Could not query recurring plans from database:", err);
    return NextResponse.json({ plans: [] });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "recurring:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createPlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const startDate = new Date(data.startDate);
  const endDate = data.endDate ? new Date(data.endDate) : undefined;
  const nextBillingDate = new Date(startDate);

  const plan = await prisma.recurringPlan.create({
    data: {
      customerId: data.customerId,
      description: data.description,
      monthlyFee: data.monthlyFee,
      frequency: data.frequency,
      billingDayOfMonth: data.billingDayOfMonth,
      startDate,
      endDate,
      nextBillingDate,
      status: RecurringPlanStatus.ACTIVE,
      notes: data.notes,
    },
    include: {
      customer: true,
    },
  });

  await createAuditLog({
    userId: session.user.id,
    action: "CREATE",
    entityType: "RecurringPlan",
    entityId: plan.id,
    description: `Created recurring retainer plan for ${plan.customer.name} (₹${plan.monthlyFee}/${plan.frequency})`,
  });

  return NextResponse.json({ plan }, { status: 201 });
}
