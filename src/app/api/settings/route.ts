/**
 * API: GET/PUT /api/settings — Company settings
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const updateSettingsSchema = z.object({
  name: z.string().min(1).optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional().or(z.literal("")),
  isGstRegistered: z.boolean().optional(),
  gstin: z.string().optional(),
  invoicePrefix: z.string().optional(),
  invoiceTypeCode: z.string().optional(),
  quotationTypeCode: z.string().optional(),
  proformaTypeCode: z.string().optional(),
  receiptTypeCode: z.string().optional(),
  sequenceSeparator: z.string().optional(),
  sequencePadLength: z.number().int().min(3).max(8).optional(),
  defaultInvoiceTerms: z.string().optional(),
  defaultQuotationTerms: z.string().optional(),
  paymentInstructions: z.string().optional(),
  brandColorPrimary: z.string().optional(),
  brandColorSecondary: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.companySettings.findFirst();
  return NextResponse.json({ settings });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "settings:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let settings = await prisma.companySettings.findFirst();
  if (settings) {
    settings = await prisma.companySettings.update({
      where: { id: settings.id },
      data: parsed.data,
    });
  } else {
    settings = await prisma.companySettings.create({
      data: { id: "default", ...parsed.data },
    });
  }

  await createAuditLog({
    userId: session.user.id,
    action: "UPDATE",
    entityType: "CompanySettings",
    description: "Updated company settings",
  });

  return NextResponse.json({ settings });
}
