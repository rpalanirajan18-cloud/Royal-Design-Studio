import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { readStore, writeStore } from "@/lib/store";

export interface RateCardDocument {
  id: string;
  name: string;
  url: string;
  size: number;
  uploadedAt: string;
  isOfficial?: boolean;
}

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const docs = readStore<RateCardDocument>("rate-card-documents");
  return NextResponse.json({ documents: docs });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, url, size } = body;

    if (!url) {
      return NextResponse.json({ error: "PDF URL is required" }, { status: 400 });
    }

    const docs = readStore<RateCardDocument>("rate-card-documents");
    const newDoc: RateCardDocument = {
      id: `doc_${Date.now()}`,
      name: name || "Studio Rate Sheet.pdf",
      url,
      size: size || 0,
      uploadedAt: new Date().toISOString(),
    };

    docs.unshift(newDoc);
    writeStore("rate-card-documents", docs);

    return NextResponse.json({ document: newDoc });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to save document" },
      { status: 500 }
    );
  }
}
