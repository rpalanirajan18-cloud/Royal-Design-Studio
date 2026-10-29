/**
 * API: GET /api/products — list products/services
 *      POST /api/products — create new product/service
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";
import { ProductCategory } from "@prisma/client";
import { readStore, addItemToStore } from "@/lib/store";

const createProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().optional(),
  description: z.string().optional(),
  category: z.nativeEnum(ProductCategory).default(ProductCategory.GRAPHIC_DESIGN_BRANDING),
  customCategory: z.string().optional(),
  subCategory: z.string().optional(),
  imageUrl: z.string().optional(),
  pdfUrl: z.string().optional(),
  unit: z.string().default("pcs"),
  sellingPrice: z.number().min(0, "Price must be positive"),
  wholesalePrice: z.number().min(0).optional(),
  costPrice: z.number().min(0).optional(),
  taxRate: z.number().min(0).default(0),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "products:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category");
  const activeOnly = searchParams.get("active") === "true";

  try {
    const products = await prisma.productService.findMany({
      where: {
        ...(activeOnly ? { isActive: true } : {}),
        ...(category && Object.values(ProductCategory).includes(category as ProductCategory)
          ? { category: category as ProductCategory }
          : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { sku: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ products });
  } catch (err) {
    console.warn("Could not query products from database, using local store:", err);
    interface StoredProduct {
      name: string;
      sku?: string;
      description?: string;
      category?: string;
      isActive?: boolean;
    }
    let all = readStore<StoredProduct>("products");
    if (activeOnly) all = all.filter(p => p.isActive);
    if (category) all = all.filter(p => p.category === category);
    if (search) {
      const q = search.toLowerCase();
      all = all.filter(p => p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
    }
    return NextResponse.json({ products: all });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "products:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  // Auto generate a SKU if not provided
  let sku = data.sku?.trim().toUpperCase();
  if (!sku) {
    const count = Math.floor(Math.random() * 9000) + 1000;
    const prefix =
      data.category === ProductCategory.GRAPHIC_DESIGN_BRANDING
        ? "DSG"
        : data.category === ProductCategory.PRINTING
        ? "PRN"
        : data.category === ProductCategory.GIFTING_CUSTOMIZED
        ? "GFT"
        : "SRV";
    sku = `${prefix}-${count}`;
  }

  try {
    const product = await prisma.productService.create({
      data: {
        name: data.name.trim(),
        sku,
        description: data.description?.trim(),
        category: data.category,
        unit: data.unit.trim() || "pcs",
        sellingPrice: data.sellingPrice,
        wholesalePrice: data.wholesalePrice,
        costPrice: data.costPrice,
        taxRate: data.taxRate,
        isActive: true,
      } as any,
    });

    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      entityType: "ProductService",
      entityId: product.id,
      description: `Created item ${product.name} (${product.sku})`,
    }).catch(() => {});

    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    console.warn("Prisma product create failed, using local store:", err);
    const product = addItemToStore("products", {
      name: data.name.trim(),
      sku,
      description: data.description?.trim(),
      category: data.category,
      unit: data.unit.trim() || "pcs",
      sellingPrice: data.sellingPrice,
      wholesalePrice: data.wholesalePrice,
      costPrice: data.costPrice,
      taxRate: data.taxRate,
      isActive: true,
    });
    return NextResponse.json({ product }, { status: 201 });
  }
}
