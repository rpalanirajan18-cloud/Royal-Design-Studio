# Royal Design Studio — Billing & Business Management Software

A complete, self-hosted billing and business management web application for Royal Design Studio.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- PostgreSQL 15+ running locally
- Git

### 1. Install dependencies

```bash
cd d:/Royal/app
npm install --legacy-peer-deps
```

### 2. Set up environment

```bash
cp .env.example .env.local
# Edit .env.local with your local database credentials
```

### 3. Start a local PostgreSQL (Docker shortcut)

```bash
docker run -d \
  --name rds-db \
  -e POSTGRES_USER=rds_user \
  -e POSTGRES_PASSWORD=localpass123 \
  -e POSTGRES_DB=rds_billing \
  -p 5432:5432 \
  postgres:15-alpine
```

### 4. Run database migrations

```bash
npx prisma migrate dev --name init
```

### 5. Seed demo data

```bash
npm run db:seed
```

This creates:
- **Admin user**: `royaldesignstudioofficial@gmail.com` / `Admin@RDS2026`
- Company settings pre-filled with Royal Design Studio details
- 10 sample products/services

> ⚠️ **Change the admin password immediately after first login!**

### 6. Start the dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) — you'll be redirected to login.

---

## 🐳 Production Deployment (Docker)

### 1. Configure environment

```bash
cp .env.example .env.production
# Set DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, POSTGRES_PASSWORD
```

Generate a secret:
```bash
openssl rand -base64 32
```

### 2. Update Caddyfile

Replace `yourdomain.com` with your actual domain.

### 3. Build and start

```bash
docker compose up -d --build
docker compose exec app npx prisma migrate deploy
docker compose exec app npx tsx prisma/seed.ts
```

---

## 🗄️ Database Management

```bash
npm run db:studio      # Visual DB browser
npm run db:migrate     # Create new migration (dev)
npx prisma migrate deploy   # Apply migrations (production)
bash scripts/backup.sh       # Backup DB + uploads
bash scripts/restore.sh /path/to/backup.tar.gz   # Restore
```

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (dashboard)/         # Protected dashboard routes
│   │   ├── dashboard/       # Main dashboard
│   │   ├── customers/       # Customer management
│   │   ├── invoices/        # Sales invoices
│   │   ├── quotations/      # Quotations
│   │   ├── proforma/        # Proforma invoices
│   │   ├── orders/          # Gifting & printing orders
│   │   ├── payments/        # Payments & receipts
│   │   ├── expenses/        # Expenses & suppliers
│   │   ├── deliveries/      # Delivery management
│   │   ├── recurring/       # Recurring billing
│   │   ├── reports/         # Business reports
│   │   └── settings/        # App settings
│   ├── api/                 # API routes
│   └── login/               # Login page
├── components/              # UI components
├── lib/
│   ├── auth.ts              # NextAuth
│   ├── prisma.ts            # DB client
│   ├── permissions.ts       # RBAC
│   ├── numbering.ts         # Document numbering
│   ├── pdf.ts               # PDF generation
│   └── audit.ts             # Audit logging
prisma/
├── schema.prisma            # Full DB schema
└── seed.ts                  # Demo data
scripts/
├── backup.sh
└── restore.sh
```

---

## 👤 Roles

| Role | Access |
|------|--------|
| Owner/Admin | Full access |
| Billing Staff | Customers, Quotations, Invoices, Payments |
| Order Manager | Orders, Delivery |
| Designer | Assigned orders, artwork |
| Accountant | Read-only financial reports |

---

## 📄 Document Numbering

| Type | Format | Example |
|------|--------|---------|
| Invoice | RDS/INV/2026-27/0001 | Configurable in Settings |
| Quotation | RDS/QTN/2026-27/0001 | Configurable in Settings |
| Proforma | RDS/PI/2026-27/0001 | Configurable in Settings |
| Receipt | RDS/REC/2026-27/0001 | Configurable in Settings |

---

## ⚠️ Important Notes

- **GST**: Not-registered mode active by default. Enable in Settings when registered.
- **WhatsApp**: PDF is generated then user manually attaches and shares.
- **Backups**: Always test restoration. Copy backups off-server.
- **Passwords**: Change the seed admin password immediately.

---

## 🛠️ Tech Stack

Next.js 16 · TypeScript · PostgreSQL 15 · Prisma ORM · NextAuth.js v5 · Puppeteer · Docker · Caddy
