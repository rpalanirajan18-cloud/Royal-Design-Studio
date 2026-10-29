import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { readStore } from "@/lib/store";
import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const products = readStore<any>("products").filter((p: any) => p.isActive !== false);

    // Group by category
    const grouped: Record<string, any[]> = {};
    products.forEach((p: any) => {
      const cat = p.customCategory || p.category || "GENERAL";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    });

    // Logo base64
    let logoBase64 = "";
    try {
      const logoPath = path.join(process.cwd(), "public", "logo.png");
      if (fs.existsSync(logoPath)) {
        logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`;
      }
    } catch {}

    const today = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Royal Design Studio - Official Rate Card</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 25px; color: #1e293b; background: #fff; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 15px; margin-bottom: 20px; }
        .brand h1 { margin: 0; font-size: 22px; color: #0f172a; font-weight: 800; letter-spacing: -0.5px; }
        .brand p { margin: 3px 0 0; font-size: 11px; color: #64748b; }
        .meta { text-align: right; }
        .badge { background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; display: inline-block; }
        .date { font-size: 10px; color: #94a3b8; margin-top: 4px; }
        .cat-title { font-size: 13px; font-weight: 800; color: #0284c7; text-transform: uppercase; letter-spacing: 0.5px; margin: 18px 0 8px; padding-left: 6px; border-left: 3px solid #0284c7; }
        table { width: 100%; border-collapse: collapse; font-size: 10.5px; margin-bottom: 12px; }
        th { background: #f8fafc; color: #475569; text-transform: uppercase; font-size: 9px; font-weight: 700; padding: 7px 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; }
        tr:nth-child(even) { background: #fafafa; }
        .price { font-weight: 700; font-family: monospace; font-size: 11px; }
        .retail { color: #0f172a; }
        .wholesale { color: #d97706; }
        .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px; text-align: center; font-size: 9px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="brand">
          <h1>ROYAL DESIGN STUDIO</h1>
          <p>Digital Printing • Signage • Corporate Gifting • Graphic Design</p>
          <p>2/21 Santhanakumarpatti, Avudayanoor, Tenkasi • +91 82481 49825</p>
        </div>
        <div class="meta">
          <div class="badge">OFFICIAL RATE CARD 2026-27</div>
          <div class="date">Generated on ${today}</div>
        </div>
      </div>

      ${Object.entries(grouped)
        .map(
          ([category, items]) => `
        <div class="cat-title">${category.replace(/_/g, " ")} (${items.length} Items)</div>
        <table>
          <thead>
            <tr>
              <th style="width: 35%;">Item Name</th>
              <th style="width: 25%;">Material / Sub-Category</th>
              <th style="width: 10%;">Unit</th>
              <th style="width: 15%; text-align: right;">Retail Rate (₹)</th>
              <th style="width: 15%; text-align: right;">Wholesale Rate (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (p) => `
              <tr>
                <td><strong>${p.name}</strong><br><span style="font-size: 8.5px; color: #94a3b8;">${p.sku || ""}</span></td>
                <td><span style="color: #0284c7; font-weight: 500;">${p.subCategory || "Standard"}</span></td>
                <td>${p.unit || "pcs"}</td>
                <td style="text-align: right;" class="price retail">₹${Number(p.sellingPrice).toFixed(2)}</td>
                <td style="text-align: right;" class="price wholesale">₹${p.wholesalePrice != null ? Number(p.wholesalePrice).toFixed(2) : Number(p.sellingPrice).toFixed(2)}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `
        )
        .join("")}

      <div class="footer">
        Royal Design Studio — Prices subject to material market variation. Wholesale rates require active business account verification.
      </div>
    </body>
    </html>
    `;

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "load" });
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "15mm", right: "12mm", bottom: "15mm", left: "12mm" },
      });

      return new NextResponse(Buffer.from(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="Royal_Design_Studio_Rate_Card.pdf"`,
        },
      });
    } finally {
      await browser.close();
    }
  } catch (err: unknown) {
    console.error("Rate card PDF error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Failed to generate Rate Card PDF" },
      { status: 500 }
    );
  }
}
