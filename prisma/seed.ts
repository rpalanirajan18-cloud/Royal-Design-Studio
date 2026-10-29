/**
 * Database seed script for Royal Design Studio
 * Creates the admin user, company settings, and sample catalog items.
 *
 * Run: npx prisma db seed
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Royal Design Studio database...");

  // ── Company Settings ──────────────────────────────────────────────────────
  await prisma.companySettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      name: "Royal Design Studio",
      addressLine1: "2/33-20, Sandhanakumarpatti",
      addressLine2: "Mayalappapuram Road, Avudayanoor",
      city: "Avudayanoor",
      state: "Tamil Nadu",
      pincode: "627808",
      country: "India",
      phone: "+91 93859 31697",
      whatsapp: "+91 93859 31697",
      email: "royaldesignstudioofficial@gmail.com",
      isGstRegistered: false,
      invoicePrefix: "RDS",
      invoiceTypeCode: "INV",
      quotationTypeCode: "QTN",
      proformaTypeCode: "PI",
      receiptTypeCode: "REC",
      orderTypeCode: "ORD",
      sequenceSeparator: "/",
      sequencePadLength: 4,
      financialYearStart: 4,
      defaultInvoiceTerms:
        "Payment is due within the specified due date. Late payments may be subject to follow-up.",
      defaultQuotationTerms:
        "This quotation is valid for 30 days from the date of issue. Prices are subject to change after expiry.",
      paymentInstructions:
        "Pay via Cash, UPI (+91 93859 31697), or Bank Transfer. Please include the invoice number as reference.",
      currency: "INR",
      currencySymbol: "₹",
      timezone: "Asia/Kolkata",
    },
  });

  console.log("✅ Company settings created");

  // ── Admin Users ───────────────────────────────────────────────────────────
  const adminPasswordHash = await bcrypt.hash("royal@design2026", 12);

  const adminUsers = [
    {
      id: "admin-palanirajan",
      name: "Palanirajan",
      email: "palanirajan@royaldesignstudio.com",
    },
    {
      id: "admin-ramya",
      name: "Ramya",
      email: "ramya@royaldesignstudio.com",
    },
    {
      id: "admin-ranjith",
      name: "Ranjith",
      email: "ranjith@royaldesignstudio.com",
    },
  ];

  for (const adm of adminUsers) {
    const user = await prisma.user.upsert({
      where: { email: adm.email },
      update: {
        name: adm.name,
        passwordHash: adminPasswordHash,
        role: "OWNER",
        status: "ACTIVE",
      },
      create: {
        id: adm.id,
        name: adm.name,
        email: adm.email,
        passwordHash: adminPasswordHash,
        role: "OWNER",
        status: "ACTIVE",
      },
    });
    console.log(`✅ Admin user seeded: ${adm.name} (${adm.email})`);
  }

  // ── Sample Product/Service Catalog ────────────────────────────────────────
  const products = [
    {
      sku: "DM-SMM-001",
      name: "Social Media Management",
      category: "DIGITAL_MARKETING" as const,
      description: "Monthly social media management across 2 platforms (Facebook, Instagram)",
      unit: "month",
      sellingPrice: 5000,
      wholesalePrice: 4000,
    },
    {
      sku: "DM-SEO-001",
      name: "SEO Optimization",
      category: "DIGITAL_MARKETING" as const,
      description: "On-page and off-page SEO, monthly reporting",
      unit: "month",
      sellingPrice: 8000,
      wholesalePrice: 6500,
    },
    {
      sku: "GD-LOGO-001",
      name: "Logo Design",
      category: "GRAPHIC_DESIGN_BRANDING" as const,
      description: "Custom logo design with 3 concepts, 3 revisions, source files included",
      unit: "job",
      sellingPrice: 3500,
      wholesalePrice: 2500,
    },
    {
      sku: "GD-BC-001",
      name: "Business Card Design",
      category: "GRAPHIC_DESIGN_BRANDING" as const,
      description: "Double-sided business card design, ready-to-print files",
      unit: "job",
      sellingPrice: 800,
      wholesalePrice: 500,
    },
    {
      sku: "GD-QUICK-001",
      name: "Quick Design / Editing Work",
      category: "GRAPHIC_DESIGN_BRANDING" as const,
      description: "Quick document editing, banner resizing, or urgent layout design",
      unit: "job",
      sellingPrice: 150,
      wholesalePrice: 100,
    },
    {
      sku: "PR-XRX-001",
      name: "B&W Xerox / Photocopy",
      category: "PRINTING" as const,
      description: "Standard A4 single/double-sided black and white photocopy",
      unit: "page",
      sellingPrice: 2,
      wholesalePrice: 1.5,
    },
    {
      sku: "PR-CLR-001",
      name: "Color Printout (A4)",
      category: "PRINTING" as const,
      description: "High quality color print on 75 GSM paper",
      unit: "page",
      sellingPrice: 10,
      wholesalePrice: 7,
    },
    {
      sku: "PR-PHOTO-001",
      name: "Glossy Photo Printout",
      category: "PRINTING" as const,
      description: "High resolution glossy photo paper print",
      unit: "page",
      sellingPrice: 30,
      wholesalePrice: 20,
    },
    {
      sku: "PR-LAM-001",
      name: "Document Lamination (A4)",
      category: "PRINTING" as const,
      description: "Pouch lamination for certificates and ID cards",
      unit: "pcs",
      sellingPrice: 20,
      wholesalePrice: 15,
    },
    {
      sku: "PR-FLEX-001",
      name: "Flex Banner Printing",
      category: "PRINTING" as const,
      description: "Outdoor flex banner printing per square foot",
      unit: "sqft",
      sellingPrice: 25,
      wholesalePrice: 18,
    },
    {
      sku: "PR-VC-001",
      name: "Visiting Card Printing",
      category: "PRINTING" as const,
      description: "250 GSM matt lamination visiting cards (100 pcs)",
      unit: "100 pcs",
      sellingPrice: 350,
      wholesalePrice: 250,
    },
    {
      sku: "GF-MUG-001",
      name: "Customized Mug",
      category: "GIFTING_CUSTOMIZED" as const,
      description: "11oz white ceramic mug with custom full-color print",
      unit: "pcs",
      sellingPrice: 299,
      wholesalePrice: 220,
    },
    {
      sku: "GF-TSHIRT-001",
      name: "Customized T-Shirt",
      category: "GIFTING_CUSTOMIZED" as const,
      description: "Customized round-neck T-shirt with DTF print, all sizes",
      unit: "pcs",
      sellingPrice: 499,
      wholesalePrice: 350,
    },
    {
      sku: "WEB-BASIC-001",
      name: "Business Website (Basic)",
      category: "WEBSITE_DEVELOPMENT" as const,
      description: "5-page responsive business website with CMS, mobile optimized",
      unit: "project",
      sellingPrice: 15000,
      wholesalePrice: 12000,
    },
    {
      sku: "WEB-ECOM-001",
      name: "E-Commerce Website",
      category: "WEBSITE_DEVELOPMENT" as const,
      description: "Full e-commerce website with product catalog, cart, and payment gateway",
      unit: "project",
      sellingPrice: 45000,
      wholesalePrice: 38000,
    },
  ];

  for (const product of products) {
    await prisma.productService.upsert({
      where: { sku: product.sku },
      update: {},
      create: {
        ...product,
        sellingPrice: product.sellingPrice,
        isActive: true,
        taxRate: 0, // Not GST registered
      },
    });
  }

  console.log(`✅ ${products.length} sample products/services created`);
  console.log("\n🎉 Seeding complete!");
  console.log("\n⚠️  IMPORTANT: Change the admin password before going live!");
  console.log("   Navigate to Settings > Users after first login.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
