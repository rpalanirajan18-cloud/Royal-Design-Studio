/**
 * API: GET /api/products/[id]
 *      PUT /api/products/[id]
 *      DELETE /api/products/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";
import { ProductCategory } from "@prisma/client";
import { readStore, writeStore } from "@/lib/store";

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  sku: z.string().optional(),
  description: z.string().optional(),
  category: z.nativeEnum(ProductCategory).optional(),
  customCategory: z.string().optional(),
  subCategory: z.string().optional(),
  imageUrl: z.string().optional(),
  pdfUrl: z.string().optional(),
  unit: z.string().optional(),
  sellingPrice: z.number().min(0).optional(),
  wholesalePrice: z.number().min(0).optional(),
  costPrice: z.number().min(0).optional(),
  taxRate: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "products:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const product = await prisma.productService.findUnique({ where: { id } });
    if (product) return NextResponse.json({ product });
  } catch {
    // database offline, fallback to store
  }

  const products = readStore<any>("products");
  const product = products.find((p: any) => p.id === id);
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  return NextResponse.json({ product });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "products:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const product = await prisma.productService.update({
      where: { id },
      data: parsed.data as any,
    });

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entityType: "ProductService",
      entityId: product.id,
      description: `Updated item ${product.name}`,
    }).catch(() => {});

    return NextResponse.json({ product });
  } catch (err) {
    console.warn("Prisma product update failed, updating local store:", err);
    const products = readStore<any>("products");
    const idx = products.findIndex((p: any) => p.id === id);
    if (idx === -1) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    const updated = {
      ...products[idx],
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    };
    products[idx] = updated;
    writeStore("products", products);
    return NextResponse.json({ product: updated });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "products:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const product = await prisma.productService.update({
      where: { id },
      data: { isActive: false },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entityType: "ProductService",
      entityId: product.id,
      description: `Deactivated item ${product.name}`,
    }).catch(() => {});

    return NextResponse.json({ message: "Product deactivated successfully" });
  } catch (err) {
    console.warn("Prisma product delete failed, updating local store:", err);
    const products = readStore<any>("products");
    const idx = products.findIndex((p: any) => p.id === id);
    if (idx !== -1) {
      products[idx].isActive = false;
      writeStore("products", products);
    }
    return NextResponse.json({ message: "Product deactivated successfully" });
  }
}
