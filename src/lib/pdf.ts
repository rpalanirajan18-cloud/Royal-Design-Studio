/**
 * PDF Generation Service — Royal Design Studio
 *
 * Uses Puppeteer to render HTML to PDF server-side.
 * All templates are server-rendered, not accessible from the browser.
 */

import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import { prisma } from "@/lib/prisma";
import { readStore } from "@/lib/store";

type CompanySettings = {
  name: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  currencySymbol: string;
  paymentInstructions?: string | null;
  defaultInvoiceTerms?: string | null;
  isGstRegistered: boolean;
  gstin?: string | null;
  logoPath?: string | null;
};

function getLogoBase64(customPath?: string | null): string {
  try {
    if (customPath) {
      const fullCustom = path.isAbsolute(customPath)
        ? customPath
        : path.join(process.cwd(), "public", customPath.replace(/^\//, ""));
      if (fs.existsSync(fullCustom)) {
        const data = fs.readFileSync(fullCustom);
        const ext = path.extname(fullCustom).toLowerCase().replace(".", "") || "png";
        return `data:image/${ext === "svg" ? "svg+xml" : ext};base64,${data.toString("base64")}`;
      }
    }
  } catch (e) {
    console.warn("Could not load custom logo:", e);
  }

  try {
    const defaultLogoPath = path.join(process.cwd(), "public", "logo.png");
    if (fs.existsSync(defaultLogoPath)) {
      const data = fs.readFileSync(defaultLogoPath);
      return `data:image/png;base64,${data.toString("base64")}`;
    }
  } catch (e) {
    console.warn("Could not load default logo:", e);
  }
  return "";
}

function formatCurrency(amount: number, symbol = "₹"): string {
  return `${symbol}${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function invoiceStatusColor(status: string): string {
  const map: Record<string, string> = {
    DRAFT: "#6b7280",
    ISSUED: "#3b82f6",
    PARTIALLY_PAID: "#f59e0b",
    PAID: "#22c55e",
    OVERDUE: "#ef4444",
    CANCELLED: "#6b7280",
    VOID: "#6b7280",
  };
  return map[status] ?? "#6b7280";
}

function generateInvoiceHTML(invoice: InvoicePDFData, company: CompanySettings): string {
  const logoBase64 = getLogoBase64(company.logoPath);
  const itemRows = invoice.items
    .map((item, i) => {
      const lineTotal =
        Number(item.lineTotal || 0) ||
        Number(item.quantity || 1) * Number(item.unitPrice || 0) -
          Number(item.discount || 0);

      return `
      <tr class="${i % 2 === 0 ? "even" : "odd"}">
        <td class="desc">
          <strong>${item.description}</strong>
        </td>
        <td class="center">${item.unit}</td>
        <td class="right">${item.quantity}</td>
        <td class="right">${formatCurrency(item.unitPrice, company.currencySymbol)}</td>
        ${item.discount > 0 ? `<td class="right">${formatCurrency(item.discount, company.currencySymbol)}</td>` : `<td class="right">—</td>`}
        <td class="right bold">${formatCurrency(lineTotal, company.currencySymbol)}</td>
      </tr>
    `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 13px;
      color: #1e293b;
      background: #fff;
      padding: 0;
    }
    .page { padding: 40px 48px; max-width: 794px; margin: 0 auto; }

    /* Header */
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .brand-block { display: flex; flex-direction: column; align-items: flex-start; }
    .brand-logo-img { height: 54px; width: auto; max-width: 220px; object-fit: contain; margin-bottom: 8px; }
    .brand-name { font-size: 20px; font-weight: 800; color: #1e293b; margin-bottom: 2px; }
    .brand-sub { font-size: 11px; color: #64748b; line-height: 1.5; }
    .doc-info { text-align: right; }
    .doc-type {
      font-size: 28px; font-weight: 900;
      color: #27348b;
      letter-spacing: -0.5px;
    }
    .doc-number { font-size: 14px; font-weight: 700; color: #334155; margin-top: 4px; }
    .doc-status {
      display: inline-block; margin-top: 6px; padding: 3px 12px; border-radius: 20px;
      font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
      background: ${invoiceStatusColor(invoice.status)}20;
      color: ${invoiceStatusColor(invoice.status)};
      border: 1px solid ${invoiceStatusColor(invoice.status)}40;
    }

    /* Divider */
    .divider { height: 2px; background: linear-gradient(135deg, #27348b, #00aeef); border-radius: 1px; margin: 20px 0; }

    /* Parties */
    .parties { display: flex; gap: 40px; margin-bottom: 28px; }
    .party { flex: 1; }
    .party-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 8px; }
    .party-name { font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
    .party-detail { font-size: 12px; color: #475569; line-height: 1.6; }

    /* Dates */
    .meta-row { display: flex; gap: 24px; margin-bottom: 28px; }
    .meta-item { }
    .meta-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 3px; }
    .meta-value { font-size: 13px; font-weight: 600; color: #1e293b; }
    .meta-value.overdue { color: #ef4444; }

    /* Items table */
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    thead tr { background: #27348b; }
    thead th {
      padding: 10px 12px; text-align: right;
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.08em; color: white;
    }
    thead th:first-child { text-align: left; border-radius: 6px 0 0 6px; }
    thead th:last-child { border-radius: 0 6px 6px 0; }
    tbody tr.even { background: #f8fafc; }
    tbody tr.odd { background: #fff; }
    tbody td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
    td.center { text-align: center; }
    td.right { text-align: right; }
    td.bold { font-weight: 700; }
    td.desc { font-size: 12px; }

    /* Totals */
    .totals-section { display: flex; justify-content: flex-end; margin-bottom: 24px; }
    .totals-table { min-width: 280px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
    .totals-row.divider-row { border-top: 1px solid #e2e8f0; margin-top: 4px; padding-top: 8px; }
    .totals-row.total { font-size: 16px; font-weight: 800; color: #1e293b; border-top: 2px solid #27348b; padding-top: 10px; margin-top: 4px; }
    .totals-row.balance { color: #ef4444; font-size: 15px; font-weight: 700; }
    .totals-row.paid { color: #22c55e; }
    .totals-label { color: #64748b; }
    .totals-value { font-weight: 600; }

    /* Notes */
    .notes-section { margin-bottom: 20px; }
    .notes-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 6px; }
    .notes-content { font-size: 12px; color: #475569; line-height: 1.6; padding: 12px; background: #f8fafc; border-radius: 6px; border-left: 3px solid #27348b; }

    /* Footer */
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; }
    .signature-area { text-align: center; }
    .signature-line { width: 140px; border-top: 1px solid #334155; margin: 40px auto 6px; }
    .signature-label { font-size: 10px; color: #64748b; }
    .footer-note { font-size: 10px; color: #94a3b8; text-align: right; max-width: 300px; line-height: 1.6; }
    .not-gst-note { font-size: 10px; color: #64748b; margin-top: 4px; }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="brand-block">
      ${logoBase64 ? `
        <img src="${logoBase64}" class="brand-logo-img" alt="${company.name}" />
      ` : `
        <div class="brand-name">${company.name}</div>
      `}
      <div class="brand-sub">${company.addressLine1}${company.addressLine2 ? `, ${company.addressLine2}` : ""}, ${company.city} — ${company.pincode}</div>
      <div class="brand-sub">${company.phone} | ${company.email}</div>
    </div>
    <div class="doc-info">
      <div class="doc-type">INVOICE</div>
      <div class="doc-number">${invoice.number}</div>
      <div class="doc-status">${invoice.status.replace("_", " ")}</div>
      ${company.isGstRegistered && company.gstin ? `<div style="font-size:10px;color:#64748b;margin-top:4px">GSTIN: ${company.gstin}</div>` : ""}
    </div>
  </div>

  <div class="divider"></div>

  <!-- Parties -->
  <div class="parties">
    <div class="party">
      <div class="party-label">Bill To</div>
      <div class="party-name">${invoice.walkInName || invoice.customer?.name || "Walk-in Customer"}</div>
      <div class="party-detail">
        ${(invoice.isWalkIn || invoice.customer?.name === "Walk-in Customer") && (!invoice.customer?.phone || invoice.customer?.phone === "—") ? `
          <span style="display:inline-block;padding:3px 8px;border-radius:4px;background:#f1f5f9;color:#475569;font-size:11px;font-weight:600">Quick Counter Sale (Walk-in)</span>
        ` : `
          ${invoice.customer?.contactPerson ? `${invoice.customer.contactPerson}<br/>` : ""}
          ${invoice.customer?.phone && invoice.customer.phone !== "—" ? `${invoice.customer.phone}<br/>` : ""}
          ${invoice.customer?.email ? `${invoice.customer.email}<br/>` : ""}
          ${invoice.customer?.billingAddress ?? ""}
          ${invoice.customer?.billingCity ? `, ${invoice.customer.billingCity}` : ""}
          ${invoice.customer?.billingPincode ? ` - ${invoice.customer.billingPincode}` : ""}
        `}
      </div>
    </div>
    <div class="party">
      <div class="party-label">Payment Details</div>
      <div class="party-detail">${company.paymentInstructions ?? "Contact us for payment details."}</div>
    </div>
  </div>

  <!-- Dates -->
  <div class="meta-row">
    <div class="meta-item">
      <div class="meta-label">Invoice Date</div>
      <div class="meta-value">${formatDate(invoice.issueDate)}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Due Date</div>
      <div class="meta-value ${invoice.status === "OVERDUE" ? "overdue" : ""}">${formatDate(invoice.dueDate)}</div>
    </div>
    ${invoice.quotationNumber ? `<div class="meta-item"><div class="meta-label">Quotation Ref</div><div class="meta-value">${invoice.quotationNumber}</div></div>` : ""}
  </div>

  <!-- Items -->
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="center">Unit</th>
        <th class="right">Qty</th>
        <th class="right">Rate</th>
        <th class="right">Discount</th>
        <th class="right">Amount</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <!-- Totals -->
  <div class="totals-section">
    <div class="totals-table">
      <div class="totals-row">
        <span class="totals-label">Subtotal</span>
        <span class="totals-value">${formatCurrency(invoice.subtotal, company.currencySymbol)}</span>
      </div>
      ${invoice.discountAmount > 0 ? `<div class="totals-row"><span class="totals-label">Discount</span><span class="totals-value">- ${formatCurrency(invoice.discountAmount, company.currencySymbol)}</span></div>` : ""}
      ${invoice.deliveryCharge > 0 ? `<div class="totals-row"><span class="totals-label">Delivery</span><span class="totals-value">${formatCurrency(invoice.deliveryCharge, company.currencySymbol)}</span></div>` : ""}
      ${invoice.taxAmount > 0 ? `<div class="totals-row"><span class="totals-label">Tax</span><span class="totals-value">${formatCurrency(invoice.taxAmount, company.currencySymbol)}</span></div>` : ""}
      <div class="totals-row total">
        <span>Total</span>
        <span>${formatCurrency(invoice.total, company.currencySymbol)}</span>
      </div>
      ${invoice.amountPaid > 0 ? `<div class="totals-row paid"><span class="totals-label">Paid</span><span>- ${formatCurrency(invoice.amountPaid, company.currencySymbol)}</span></div>` : ""}
      ${Number(invoice.balanceDue) > 0 ? `<div class="totals-row balance"><span>Balance Due</span><span>${formatCurrency(invoice.balanceDue, company.currencySymbol)}</span></div>` : `<div class="totals-row paid"><span>✓ Fully Paid</span></div>`}
    </div>
  </div>

  ${invoice.notes ? `<div class="notes-section"><div class="notes-label">Notes</div><div class="notes-content">${invoice.notes}</div></div>` : ""}
  ${invoice.terms ? `<div class="notes-section"><div class="notes-label">Terms & Conditions</div><div class="notes-content">${invoice.terms}</div></div>` : ""}

  <!-- Footer -->
  <div class="footer">
    <div>
      ${!company.isGstRegistered ? '<div class="not-gst-note">⚠ This is a commercial invoice. The business is not registered for GST. No GST is charged or collected.</div>' : ""}
    </div>
    <div style="display:flex;gap:40px;align-items:flex-end;">
      <div class="footer-note">
        Thank you for your business!<br/>
        For queries: ${company.phone}
      </div>
      <div class="signature-area">
        <div class="signature-line"></div>
        <div class="signature-label">Authorized Signature</div>
      </div>
    </div>
  </div>

</div>
</body>
</html>`;
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface InvoicePDFData {
  id: string;
  number: string;
  status: string;
  issueDate: Date;
  dueDate: Date;
  subtotal: number;
  discountAmount: number;
  deliveryCharge: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  notes?: string | null;
  terms?: string | null;
  quotationNumber?: string | null;
  isWalkIn?: boolean;
  walkInName?: string | null;
  customer: {
    name: string;
    contactPerson?: string | null;
    phone: string;
    email?: string | null;
    billingAddress?: string | null;
    billingCity?: string | null;
    billingPincode?: string | null;
  };
  items: {
    description: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    lineTotal: number;
  }[];
}

// ── PDF Generator ──────────────────────────────────────────────────────────────

export async function generateInvoicePDF(invoiceId: string): Promise<Buffer> {
  let invoice: any = null;
  try {
    invoice = await prisma.salesInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        items: { orderBy: { sortOrder: "asc" } },
        quotation: { select: { number: true } },
      },
    });
  } catch (err) {
    console.warn("Prisma invoice fetch failed for PDF, reading store:", err);
  }

  if (!invoice) {
    const allInvoices = readStore<any>("invoices");
    invoice = allInvoices.find((i: any) => i.id === invoiceId || i.number === invoiceId);
    if (invoice && !invoice.customer?.phone) {
      const customers = readStore<any>("customers");
      const cust = customers.find((c: any) => c.id === invoice.customerId);
      if (cust) {
        invoice.customer = cust;
      }
    }
  }

  if (!invoice) throw new Error("Invoice not found");

  let company: any = null;
  try {
    company = await prisma.companySettings.findFirst();
  } catch {
    // Ignore and use default
  }

  if (!company) {
    company = {
      name: "Royal Design Studio",
      addressLine1: "2/21, Santhanakumarpatti",
      addressLine2: "Avudayanoor, Tenkasi",
      city: "Tenkasi",
      state: "Tamil Nadu",
      pincode: "627808",
      phone: "+91 82481 49825",
      email: "royaldesignstudioofficial@gmail.com",
      currencySymbol: "₹",
      paymentInstructions: "GPay / PhonePe / Paytm / UPI: 8248149825@icici",
      defaultInvoiceTerms: "Payment due within 15 days.",
      isGstRegistered: false,
    };
  }

  const pdfData: InvoicePDFData = {
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    issueDate: new Date(invoice.issueDate),
    dueDate: new Date(invoice.dueDate),
    subtotal: Number(invoice.subtotal || 0),
    discountAmount: Number(invoice.discountAmount || 0),
    deliveryCharge: Number(invoice.deliveryCharge || 0),
    taxAmount: Number(invoice.taxAmount || 0),
    total: Number(invoice.total || 0),
    amountPaid: Number(invoice.amountPaid || 0),
    balanceDue: Number(invoice.balanceDue || 0),
    notes: invoice.notes,
    terms: invoice.terms,
    quotationNumber: invoice.quotation?.number,
    customer: {
      name: invoice.customer?.name ?? "Valued Client",
      contactPerson: invoice.customer?.contactPerson,
      phone: invoice.customer?.phone ?? "",
      email: invoice.customer?.email,
      billingAddress: invoice.customer?.billingAddress,
      billingCity: invoice.customer?.billingCity,
      billingPincode: invoice.customer?.billingPincode,
    },
    items: (invoice.items || []).map((item: any) => ({
      description: item.description,
      unit: item.unit || "pcs",
      quantity: Number(item.quantity || 1),
      unitPrice: Number(item.unitPrice || 0),
      discount: Number(item.discount || 0),
      lineTotal:
        Number(item.lineTotal || 0) ||
        Number(item.quantity || 1) * Number(item.unitPrice || 0) -
          Number(item.discount || 0),
    })),
  };

  const html = generateInvoiceHTML(pdfData, company as CompanySettings);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "A4",
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      printBackground: true,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
