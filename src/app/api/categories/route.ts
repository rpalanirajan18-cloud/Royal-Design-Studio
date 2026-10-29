import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { readStore, writeStore } from "@/lib/store";

export interface CustomCategory {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  createdAt: string;
}

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const categories = readStore<CustomCategory>("categories");
  return NextResponse.json({ categories });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, icon, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const categories = readStore<CustomCategory>("categories");

    // Slug / id
    const slug = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, "_");
    const existing = categories.find((c) => c.id === slug || c.name.toLowerCase() === name.trim().toLowerCase());
    if (existing) {
      return NextResponse.json({ category: existing });
    }

    const newCategory: CustomCategory = {
      id: slug,
      name: name.trim(),
      icon: icon || "Tag",
      description: description?.trim() || "",
      createdAt: new Date().toISOString(),
    };

    categories.push(newCategory);
    writeStore("categories", categories);

    return NextResponse.json({ category: newCategory });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to create category" },
      { status: 500 }
    );
  }
}
