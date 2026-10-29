"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Receipt,
  Plus,
  Search,
  Loader2,
  FileDown,
  Share2,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  Trash2,
  Send,
  Calendar,
  Building,
  Zap,
  Tag,
  Wallet,
  Smartphone,
  Check,
  Printer,
  Copy,
} from "lucide-react";
import { InvoiceStatus } from "@prisma/client";

interface LineItem {
  productId?: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  lineTotal: number;
  priceType?: "retail" | "wholesale";
}

interface Invoice {
  id: string;
  number: string;
  isWalkIn?: boolean;
  walkInName?: string;
  customer: { id: string; name: string; phone: string; email?: string };
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  subtotal: number;
  discountAmount: number;
  deliveryCharge: number;
  taxAmount: number;
  total: number;
  advancePaid: number;
  amountPaid: number;
  balanceDue: number;
  items: LineItem[];
  notes?: string;
}

interface CustomerOption {
  id: string;
  name: string;
  phone: string;
  pricingTier?: "RETAIL" | "WHOLESALE";
}

interface ProductOption {
  id: string;
  name: string;
  sellingPrice: number;
  wholesalePrice?: number;
  unit: string;
}

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; badge: string; icon: React.ComponentType<{ className?: string }> }> = {
  DRAFT: { label: "Draft", badge: "badge-neutral", icon: Clock },
  ISSUED: { label: "Issued", badge: "badge-blue", icon: Send },
  PARTIALLY_PAID: { label: "Partial", badge: "badge-amber", icon: Clock },
  PAID: { label: "Paid", badge: "badge-success", icon: CheckCircle },
  OVERDUE: { label: "Overdue", badge: "badge-danger", icon: AlertCircle },
  CANCELLED: { label: "Cancelled", badge: "badge-neutral", icon: X },
  VOID: { label: "Void", badge: "badge-neutral", icon: X },
};

// Preset quick items for counter sales (Xerox, Printout, Design, Lamination)
const QUICK_PRESET_ITEMS = [
  { id: "xrx", name: "B&W Xerox / Copy", unit: "page", price: 2, icon: Copy },
  { id: "clr", name: "Color Printout", unit: "page", price: 10, icon: Printer },
  { id: "pho", name: "Glossy Photo Print", unit: "page", price: 30, icon: Receipt },
  { id: "lam", name: "Document Lamination", unit: "pcs", price: 20, icon: Tag },
  { id: "dsg", name: "Quick Design / Editing", unit: "job", price: 150, icon: Zap },
  { id: "vc", name: "Visiting Cards (100 pcs)", unit: "set", price: 350, icon: Building },
];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sharingId, setSharingId] = useState<string | null>(null);

  // Common customer & product options
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);

  // ── Standard Create Invoice Modal ──────────────────────────────────────────
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [isWalkIn, setIsWalkIn] = useState(false);
  const [walkInName, setWalkInName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0]
  );
  const [items, setItems] = useState<LineItem[]>([
    { description: "", unit: "pcs", quantity: 1, unitPrice: 0, discount: 0, taxRate: 0, lineTotal: 0, priceType: "retail" },
  ]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [deliveryCharge, setDeliveryCharge] = useState<number>(0);
  const [advancePaid, setAdvancePaid] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("Payment due within 15 days. GST exempt under small-business threshold.");

  // ── Quick Counter Bill Modal (Small walk-in bills without customer) ────────
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickPaymentMethod, setQuickPaymentMethod] = useState<"CASH" | "UPI">("CASH");
  const [quickWalkInTag, setQuickWalkInTag] = useState(""); // optional note like "Ramesh project"
  const [quickCart, setQuickCart] = useState<Record<string, number>>({ xrx: 1 });
  const [quickCustomItem, setQuickCustomItem] = useState<{ name: string; price: string; qty: string }>({
    name: "",
    price: "",
    qty: "1",
  });
  const [quickCreatedInvoice, setQuickCreatedInvoice] = useState<Invoice | null>(null);

  // Motion Button Enable / Disable Option (Persisted in localStorage)
  const [quickBillEnabled, setQuickBillEnabled] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("rds_quick_bill_enabled");
      if (saved !== null) {
        setQuickBillEnabled(saved !== "false");
      }
    } catch {}
  }, []);

  const toggleQuickBill = (enabled: boolean) => {
    setQuickBillEnabled(enabled);
    try {
      localStorage.setItem("rds_quick_bill_enabled", String(enabled));
      window.dispatchEvent(new Event("rds_quick_bill_toggle"));
    } catch {}
  };

  // Selected Detail Modal
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(search ? { search } : {}),
        ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
      });
      const res = await fetch(`/api/invoices?${params}`);
      const data = await res.json();
      setInvoices(data.invoices ?? []);
      setTotal(data.total ?? 0);
    } catch {
      /* handle */
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchInvoices();
    }, 250);
    return () => clearTimeout(t);
  }, [fetchInvoices]);

  const loadOptions = async () => {
    try {
      const [cRes, pRes] = await Promise.all([
        fetch("/api/customers?limit=100"),
        fetch("/api/products?active=true"),
      ]);
      const cData = await cRes.json();
      const pData = await pRes.json();
      setCustomers(cData.customers ?? []);
      setProducts(pData.products ?? []);
      return { customers: cData.customers ?? [], products: pData.products ?? [] };
    } catch {
      return { customers: [], products: [] };
    }
  };

  const openCreateModal = async () => {
    setShowCreateModal(true);
    setIsWalkIn(false);
    setWalkInName("");
    const opts = await loadOptions();
    if (opts.customers?.length > 0 && !customerId) {
      setCustomerId(opts.customers[0].id);
    }
  };

  const openQuickBillModal = async () => {
    setShowQuickModal(true);
    setQuickCreatedInvoice(null);
    setQuickCart({ xrx: 1 });
    setQuickWalkInTag("");
    setQuickPaymentMethod("CASH");
    await loadOptions();
  };

  const handleCustomerChange = (selectedId: string) => {
    setCustomerId(selectedId);
    const cust = customers.find((c) => c.id === selectedId);
    if (cust?.pricingTier === "WHOLESALE") {
      setItems((prev) =>
        prev.map((it) => {
          const p = products.find((prod) => prod.id === it.productId);
          const newPrice = p && p.wholesalePrice != null ? Number(p.wholesalePrice) : it.unitPrice;
          const sub = Number(it.quantity || 0) * Number(newPrice || 0);
          return {
            ...it,
            priceType: "wholesale",
            unitPrice: newPrice,
            lineTotal: Math.round(Math.max(0, sub - Number(it.discount || 0)) * 100) / 100,
          };
        })
      );
    }
  };

  // Line item manipulation
  const updateItem = (index: number, field: keyof LineItem, value: unknown) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };

    const sub = Number(item.quantity || 0) * Number(item.unitPrice || 0);
    const disc = Number(item.discount || 0);
    const net = Math.max(0, sub - disc);
    item.lineTotal = Math.round(net * 100) / 100;

    newItems[index] = item;
    setItems(newItems);
  };

  const addItemFromProduct = (index: number, prodId: string) => {
    const p = products.find((prod) => prod.id === prodId);
    if (!p) return;
    const newItems = [...items];
    const isWholesale = newItems[index]?.priceType === "wholesale";
    const chosenPrice = isWholesale && p.wholesalePrice != null ? Number(p.wholesalePrice) : Number(p.sellingPrice);

    newItems[index] = {
      productId: p.id,
      description: p.name,
      unit: p.unit || "pcs",
      quantity: 1,
      unitPrice: chosenPrice,
      discount: 0,
      taxRate: 0,
      lineTotal: chosenPrice,
      priceType: isWholesale ? "wholesale" : "retail",
    };
    setItems(newItems);
  };

  const toggleItemPriceType = (index: number, type: "retail" | "wholesale") => {
    const newItems = [...items];
    const item = newItems[index];
    const p = products.find((prod) => prod.id === item.productId);

    let newUnitPrice = item.unitPrice;
    if (p) {
      if (type === "wholesale" && p.wholesalePrice != null) {
        newUnitPrice = Number(p.wholesalePrice);
      } else {
        newUnitPrice = Number(p.sellingPrice);
      }
    }

    item.priceType = type;
    item.unitPrice = newUnitPrice;
    const sub = Number(item.quantity || 0) * Number(newUnitPrice || 0);
    const disc = Number(item.discount || 0);
    item.lineTotal = Math.round(Math.max(0, sub - disc) * 100) / 100;

    newItems[index] = item;
    setItems(newItems);
  };

  const addEmptyItem = () => {
    setItems([
      ...items,
      { description: "", unit: "pcs", quantity: 1, unitPrice: 0, discount: 0, taxRate: 0, lineTotal: 0, priceType: "retail" },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Standard invoice calculations
  const subtotal = items.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
  const grandTotal = Math.max(0, subtotal - Number(discountAmount || 0) + Number(deliveryCharge || 0));
  const balanceDue = Math.max(0, grandTotal - Number(advancePaid || 0));

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isWalkIn && !customerId) {
      setFormError("Please select a customer or toggle Walk-in Sale");
      return;
    }
    if (items.some((it) => !it.description.trim() || it.unitPrice <= 0)) {
      setFormError("Each item must have a valid description and price");
      return;
    }
    setSaving(true);
    setFormError("");

    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: isWalkIn ? undefined : customerId,
          isWalkIn,
          walkInName: isWalkIn && walkInName.trim() ? walkInName.trim() : undefined,
          issueDate: new Date(issueDate).toISOString(),
          dueDate: new Date(dueDate).toISOString(),
          items: items.map((it, idx) => ({
            productId: it.productId,
            description: it.description,
            unit: it.unit || "pcs",
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
            discount: Number(it.discount || 0),
            taxRate: 0,
            sortOrder: idx,
          })),
          discountAmount: Number(discountAmount || 0),
          deliveryCharge: Number(deliveryCharge || 0),
          advancePaid: Number(advancePaid || 0),
          notes,
          terms,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error?.name?._errors?.[0] || data.error || "Failed to create invoice");
        return;
      }
      setShowCreateModal(false);
      setItems([{ description: "", unit: "pcs", quantity: 1, unitPrice: 0, discount: 0, taxRate: 0, lineTotal: 0, priceType: "retail" }]);
      setDiscountAmount(0);
      setDeliveryCharge(0);
      setAdvancePaid(0);
      fetchInvoices();
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Quick Bill Calculation & Submission ─────────────────────────────────────
  const quickItemsList: { description: string; unit: string; quantity: number; unitPrice: number; lineTotal: number }[] = [];

  Object.entries(quickCart).forEach(([presetId, qty]) => {
    if (qty <= 0) return;
    const preset = QUICK_PRESET_ITEMS.find((p) => p.id === presetId);
    if (!preset) return;
    const unitPrice = preset.price;
    quickItemsList.push({
      description: preset.name,
      unit: preset.unit,
      quantity: qty,
      unitPrice,
      lineTotal: Math.round(qty * unitPrice * 100) / 100,
    });
  });

  if (quickCustomItem.name.trim() && parseFloat(quickCustomItem.price) > 0) {
    const qty = parseFloat(quickCustomItem.qty) || 1;
    const price = parseFloat(quickCustomItem.price);
    quickItemsList.push({
      description: quickCustomItem.name.trim(),
      unit: "pcs",
      quantity: qty,
      unitPrice: price,
      lineTotal: Math.round(qty * price * 100) / 100,
    });
  }

  const quickTotal = quickItemsList.reduce((sum, item) => sum + item.lineTotal, 0);

  const handleCreateQuickBill = async () => {
    if (quickItemsList.length === 0) return;
    setQuickSaving(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isWalkIn: true,
          walkInName: quickWalkInTag.trim() ? quickWalkInTag.trim() : undefined,
          status: "PAID",
          paymentMethod: quickPaymentMethod,
          issueDate: new Date().toISOString(),
          dueDate: new Date().toISOString(),
          items: quickItemsList.map((it, idx) => ({
            description: it.description,
            unit: it.unit,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discount: 0,
            taxRate: 0,
            sortOrder: idx,
          })),
          discountAmount: 0,
          deliveryCharge: 0,
          advancePaid: quickTotal,
          notes: `Paid via ${quickPaymentMethod} (Counter Walk-in Sale)`,
          terms: "Counter walk-in bill. Payment received in full.",
        }),
      });
      const data = await res.json();
      if (res.ok && data.invoice) {
        setQuickCreatedInvoice(data.invoice);
        fetchInvoices();
      }
    } catch {
      /* handle */
    } finally {
      setQuickSaving(false);
    }
  };

  const handleIssueInvoice = async (id: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}/issue`, { method: "POST" });
      if (res.ok) {
        fetchInvoices();
        if (selectedInvoice && selectedInvoice.id === id) {
          setSelectedInvoice({ ...selectedInvoice, status: InvoiceStatus.ISSUED });
        }
      }
    } catch {
      /* handle */
    }
  };

  const shareWhatsApp = async (inv: Invoice) => {
    setSharingId(inv.id);
    try {
      const custName = inv.walkInName || inv.customer?.name || "Customer";
      const custPhone = (inv.customer?.phone ?? "").replace(/[^0-9]/g, "");
      const safeCust = custName.replace(/[/\\?%*:|"<>]/g, "-").replace(/\s+/g, " ").trim();
      const safeNum = inv.number.replace(/[/\\?%*:|"<>]/g, "-").trim();
      const fileName = `${safeCust} - ${safeNum}.pdf`;

      const downloadUrl = `${window.location.origin}/api/invoices/${inv.id}/pdf`;
      const messageText =
        `Hello ${custName},\n\n` +
        `Here is your invoice *${inv.number}* from *Royal Design Studio*.\n` +
        `💰 *Total Amount:* ₹${Number(inv.total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n` +
        `💳 *Balance Due:* ₹${Number(inv.balanceDue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n\n` +
        `📄 *View / Download Invoice PDF:*\n${downloadUrl}\n\n` +
        `Thank you for choosing Royal Design Studio!`;

      const res = await fetch(`/api/invoices/${inv.id}/pdf`);
      if (!res.ok) throw new Error("Could not fetch PDF");
      const blob = await res.blob();
      const pdfFile = new File([blob], fileName, { type: "application/pdf" });

      if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        try {
          await navigator.share({
            title: `Invoice ${inv.number}`,
            text: messageText,
            files: [pdfFile],
          });
          setSharingId(null);
          return;
        } catch (shareErr: any) {
          if (shareErr?.name === "AbortError") {
            setSharingId(null);
            return;
          }
        }
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      const encoded = encodeURIComponent(messageText);
      const waUrl = custPhone
        ? `https://wa.me/${custPhone}?text=${encoded}`
        : `https://wa.me/?text=${encoded}`;
      window.open(waUrl, "_blank");
    } catch (err) {
      console.error("WhatsApp share failed:", err);
    } finally {
      setSharingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header with Quick Bill & Create Invoice Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sales Invoices & Billing</h1>
          <p className="text-sm mt-0.5 text-slate-600 dark:text-slate-400 font-medium">
            {total} invoices issued for printing, Xerox, designing, and walk-in counter sales
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Quick Bill Enable / Disable Toggle Switch */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs shadow-sm">
            <span className="text-slate-500 font-semibold text-[11px] hidden sm:inline">Quick Bill:</span>
            <button
              type="button"
              onClick={() => toggleQuickBill(!quickBillEnabled)}
              className={`px-2 py-0.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 cursor-pointer ${
                quickBillEnabled
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-700"
              }`}
              title={quickBillEnabled ? "Click to disable Quick Bill shortcut" : "Click to enable Quick Bill shortcut"}
            >
              <Zap className={`w-3 h-3 ${quickBillEnabled ? "fill-white" : ""}`} />
              <span>{quickBillEnabled ? "ON" : "OFF"}</span>
            </button>
          </div>

          {/* Quick Bill Motion Button (Animated shimmering gradient & ambient glow) */}
          {quickBillEnabled && (
            <button
              onClick={openQuickBillModal}
              className="quick-motion-btn text-white font-extrabold text-xs px-3.5 py-2 rounded-xl flex items-center gap-2 shadow-lg cursor-pointer border border-white/20 hover:shadow-amber-500/40"
              title="Instant Walk-in Small Bill / Xerox"
            >
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <Zap className="w-4 h-4 fill-white" />
              <span>⚡ Quick Bill (Xerox / Small Bill)</span>
            </button>
          )}

          <button
            onClick={openCreateModal}
            className="btn btn-primary btn-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Full Invoice
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between glass-card p-4 animate-fade-in-up">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="search"
            placeholder="Search by invoice # or customer name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input !pl-9"
          />
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "ALL", label: "All" },
            { id: "PAID", label: "Paid" },
            { id: "ISSUED", label: "Issued" },
            { id: "PARTIALLY_PAID", label: "Partial" },
            { id: "DRAFT", label: "Draft" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? "bg-[#27348B] text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="glass-card overflow-hidden animate-fade-in-up">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-cyan-400" />
            <span className="text-slate-500 dark:text-slate-400 text-sm">Loading invoices…</span>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-16">
            <Receipt className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="font-bold text-slate-900 dark:text-white mb-1">No invoices found</p>
            <p className="text-sm mb-4 text-slate-500 dark:text-slate-400">
              Create a full invoice or use Quick Bill for fast counter sales
            </p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={openQuickBillModal} className="btn btn-sm bg-amber-500 text-white font-bold hover:bg-amber-600">
                <Zap className="w-4 h-4" /> Quick Bill
              </button>
              <button onClick={openCreateModal} className="btn btn-primary btn-sm">
                <Plus className="w-4 h-4" /> Create Full Invoice
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer / Bill Type</th>
                  <th>Issue Date</th>
                  <th>Total Amount</th>
                  <th>Balance Due</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const statusConf = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.DRAFT;
                  const isWalkInBill = inv.isWalkIn || inv.customer?.name === "Walk-in Customer";
                  const displayName = inv.walkInName || inv.customer?.name || "Walk-in Customer";

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                      <td>
                        <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                          {inv.number}
                        </span>
                      </td>
                      <td>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-slate-900 dark:text-white">{displayName}</p>
                            {isWalkInBill && (
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">
                                Walk-in
                              </span>
                            )}
                          </div>
                          {inv.customer?.phone && inv.customer.phone !== "—" ? (
                            <p className="text-xs text-slate-500 dark:text-slate-400">{inv.customer.phone}</p>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">No customer registered</p>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                          {new Date(inv.issueDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </td>
                      <td>
                        <span className="font-bold text-slate-900 dark:text-white">
                          ₹{Number(inv.total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`font-semibold text-xs ${
                            Number(inv.balanceDue) > 0
                              ? "text-amber-600 dark:text-amber-400 font-bold"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          ₹{Number(inv.balanceDue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${statusConf.badge}`}>{statusConf.label}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                            title="View Details"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>
                          <a
                            href={`/api/invoices/${inv.id}/pdf`}
                            download={`${(displayName).replace(/[/\\?%*:|"<>]/g, "-").replace(/\s+/g, " ").trim()} - ${inv.number.replace(/[/\\?%*:|"<>]/g, "-").trim()}.pdf`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                            title="Download PDF"
                          >
                            <FileDown className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => shareWhatsApp(inv)}
                            disabled={sharingId === inv.id}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                            title="Share on WhatsApp"
                          >
                            {sharingId === inv.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Share2 className="w-4 h-4" />
                            )}
                          </button>
                          {inv.status === InvoiceStatus.DRAFT && (
                            <button
                              onClick={() => handleIssueInvoice(inv.id)}
                              className="px-2 py-1 rounded bg-[#27348B] hover:bg-[#1e2870] text-white text-xs font-semibold transition-colors"
                              title="Lock and Issue"
                            >
                              Issue
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── ⚡ QUICK COUNTER BILL MODAL ───────────────────────────────────────── */}
      {showQuickModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#0d1527] w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white shadow-sm">
                  <Zap className="w-5 h-5 fill-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Quick Counter Bill (Xerox & Small Bills)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No customer registration required • Instant cash / UPI billing
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowQuickModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {quickCreatedInvoice ? (
              /* Success Screen */
              <div className="p-8 text-center space-y-4">
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white">Bill Completed Successfully!</h4>
                  <p className="text-sm text-slate-500 mt-1 font-mono font-bold">
                    Bill #{quickCreatedInvoice.number} • Paid ₹{Number(quickCreatedInvoice.total).toFixed(2)}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-4">
                  <a
                    href={`/api/invoices/${quickCreatedInvoice.id}/pdf`}
                    download={`Bill-${quickCreatedInvoice.number}.pdf`}
                    className="btn btn-primary btn-sm flex items-center gap-2"
                  >
                    <FileDown className="w-4 h-4" />
                    Download PDF Receipt
                  </a>
                  <button
                    onClick={() => {
                      setQuickCreatedInvoice(null);
                      setQuickCart({ xrx: 1 });
                    }}
                    className="btn btn-secondary btn-sm flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Next Quick Bill
                  </button>
                </div>
              </div>
            ) : (
              /* Billing Form */
              <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                {/* Preset Item Cards */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2.5">
                    Select Quick Services (Xerox, Printout, Design)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {QUICK_PRESET_ITEMS.map((item) => {
                      const Icon = item.icon;
                      const currentQty = quickCart[item.id] || 0;
                      const price = item.price;

                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-xl border transition-all ${
                            currentQty > 0
                              ? "bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30"
                              : "bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/10 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <Icon className={`w-4 h-4 ${currentQty > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`} />
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                              ₹{price}/{item.unit}
                            </span>
                          </div>
                          <p className="font-semibold text-xs text-slate-900 dark:text-white mt-1.5 line-clamp-1">
                            {item.name}
                          </p>

                          {/* Stepper buttons */}
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/50 dark:border-white/5">
                            <button
                              type="button"
                              onClick={() => {
                                const newQty = Math.max(0, currentQty - 1);
                                setQuickCart({ ...quickCart, [item.id]: newQty });
                              }}
                              className="w-6 h-6 rounded bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center hover:bg-slate-200"
                            >
                              -
                            </button>
                            <span className="text-xs font-bold font-mono text-slate-900 dark:text-white">
                              {currentQty}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setQuickCart({ ...quickCart, [item.id]: currentQty + 1 });
                              }}
                              className="w-6 h-6 rounded bg-amber-500 text-white font-bold text-xs flex items-center justify-center hover:bg-amber-600"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Custom / Other Item Row */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    + Other / Custom Small Service
                  </span>
                  <div className="grid grid-cols-12 gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Urgent Photo Framing, Spiral Binding"
                      value={quickCustomItem.name}
                      onChange={(e) => setQuickCustomItem({ ...quickCustomItem, name: e.target.value })}
                      className="form-input col-span-7 text-xs"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="₹ Price"
                      value={quickCustomItem.price}
                      onChange={(e) => setQuickCustomItem({ ...quickCustomItem, price: e.target.value })}
                      className="form-input col-span-3 text-xs font-bold"
                    />
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={quickCustomItem.qty}
                      onChange={(e) => setQuickCustomItem({ ...quickCustomItem, qty: e.target.value })}
                      className="form-input col-span-2 text-xs"
                    />
                  </div>
                </div>

                {/* Optional Customer Note / Job Reference */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Customer / Job Reference (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh (Aadhar Xerox), Court Document, Urgent Flex"
                    value={quickWalkInTag}
                    onChange={(e) => setQuickWalkInTag(e.target.value)}
                    className="form-input text-xs"
                  />
                </div>

                {/* Payment Method & Total Bar */}
                <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Payment Mode</p>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => setQuickPaymentMethod("CASH")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                            quickPaymentMethod === "CASH"
                              ? "bg-emerald-500 text-white"
                              : "bg-white/10 text-slate-300 hover:bg-white/20"
                          }`}
                        >
                          <Wallet className="w-3.5 h-3.5" /> Cash Received
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuickPaymentMethod("UPI")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                            quickPaymentMethod === "UPI"
                              ? "bg-blue-500 text-white"
                              : "bg-white/10 text-slate-300 hover:bg-white/20"
                          }`}
                        >
                          <Smartphone className="w-3.5 h-3.5" /> UPI / GPay
                        </button>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-slate-400 uppercase font-semibold">Total Amount</p>
                      <p className="text-2xl font-black text-amber-400">
                        ₹{quickTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowQuickModal(false)}
                    className="btn btn-secondary btn-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={quickSaving || quickTotal <= 0}
                    onClick={handleCreateQuickBill}
                    className="btn btn-sm bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold flex items-center gap-2 border-0 shadow-lg shadow-amber-500/20 disabled:opacity-50"
                  >
                    {quickSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-white" />}
                    Complete & Print Bill (₹{quickTotal.toFixed(2)})
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Invoice Detail Modal ──────────────────────────────────────────────── */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#0d1527] w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-3">
                <Receipt className="w-5 h-5 text-[#27348B] dark:text-blue-400" />
                <div>
                  <h3 className="text-lg font-bold font-mono text-slate-900 dark:text-white">{selectedInvoice.number}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedInvoice.walkInName || selectedInvoice.customer?.name || "Walk-in Customer"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Status</p>
                  <p className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">{selectedInvoice.status}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Issue Date</p>
                  <p className="font-semibold text-sm text-slate-900 dark:text-white mt-0.5">
                    {new Date(selectedInvoice.issueDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Grand Total</p>
                  <p className="font-bold text-base text-[#27348B] dark:text-cyan-400 mt-0.5">
                    ₹{Number(selectedInvoice.total).toLocaleString("en-IN")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Balance Due</p>
                  <p className="font-bold text-base text-amber-600 dark:text-amber-400 mt-0.5">
                    ₹{Number(selectedInvoice.balanceDue).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
                  Line Items
                </h4>
                <div className="space-y-2">
                  {selectedInvoice.items?.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5"
                    >
                      <div>
                        <p className="font-semibold text-sm text-slate-900 dark:text-white">{item.description}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {item.quantity} {item.unit} × ₹{Number(item.unitPrice).toLocaleString("en-IN")}
                          {item.discount > 0 && ` (-₹${item.discount} discount)`}
                        </p>
                      </div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">
                        ₹{Number(item.lineTotal || (Number(item.quantity || 1) * Number(item.unitPrice || 0) - Number(item.discount || 0))).toLocaleString("en-IN")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <a
                    href={`/api/invoices/${selectedInvoice.id}/pdf`}
                    download={`${(selectedInvoice.walkInName || selectedInvoice.customer?.name || "Client").replace(/[/\\?%*:|"<>]/g, "-").replace(/\s+/g, " ").trim()} - ${selectedInvoice.number.replace(/[/\\?%*:|"<>]/g, "-").trim()}.pdf`}
                    className="btn btn-primary btn-sm flex items-center gap-2"
                  >
                    <FileDown className="w-4 h-4" />
                    Download PDF
                  </a>
                  <button
                    onClick={() => shareWhatsApp(selectedInvoice)}
                    disabled={sharingId === selectedInvoice.id}
                    className="btn btn-secondary btn-sm flex items-center gap-2 text-emerald-600 dark:text-emerald-400 disabled:opacity-50"
                  >
                    {sharingId === selectedInvoice.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                    ) : (
                      <Share2 className="w-4 h-4" />
                    )}
                    {sharingId === selectedInvoice.id ? "Preparing PDF…" : "Share on WhatsApp"}
                  </button>
                </div>

                {selectedInvoice.status === InvoiceStatus.DRAFT && (
                  <button
                    onClick={() => handleIssueInvoice(selectedInvoice.id)}
                    className="btn btn-primary btn-sm bg-[#27348B] hover:bg-[#1e2870]"
                  >
                    Issue Invoice (Lock)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Standard Create Invoice Modal ─────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#0d1527] w-full max-w-4xl overflow-hidden border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#27348B] dark:text-blue-400" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create Sales Invoice</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">
              {formError && (
                <div className="p-3 text-sm bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 rounded-lg">
                  {formError}
                </div>
              )}

              {/* Walk-in Customer Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-2.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Walk-in Customer / Small Bill (No Customer Details Needed)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Toggle on for quick counter customers, Xerox, or walk-ins without saving contact info
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isWalkIn}
                    onChange={(e) => setIsWalkIn(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {/* Customer and Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {isWalkIn ? (
                  <div>
                    <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Walk-in Reference (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Counter Xerox / Mr. Kumar"
                      value={walkInName}
                      onChange={(e) => setWalkInName(e.target.value)}
                      className="form-input"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Customer *
                    </label>
                    <select
                      required
                      value={customerId}
                      onChange={(e) => handleCustomerChange(e.target.value)}
                      className="form-input"
                    >
                      <option value="">Select customer…</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.phone}){c.pricingTier === "WHOLESALE" ? " • [Wholesale Tier]" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Invoice Date
                  </label>
                  <input
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Line Items with Retail vs Wholesale Toggle */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Itemized Services / Products (With Retail & Wholesale Pricing)
                  </label>
                  <button
                    type="button"
                    onClick={addEmptyItem}
                    className="text-xs text-[#27348B] dark:text-cyan-400 hover:underline font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Row
                  </button>
                </div>

                <div className="space-y-2.5">
                  {items.map((item, index) => {
                    const matchedProd = products.find((p) => p.id === item.productId);

                    return (
                      <div
                        key={index}
                        className="grid grid-cols-12 gap-2 items-center p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5"
                      >
                        {/* Pick product */}
                        <div className="col-span-12 sm:col-span-5 space-y-1">
                          {products.length > 0 && (
                            <select
                              onChange={(e) => {
                                if (e.target.value) addItemFromProduct(index, e.target.value);
                              }}
                              className="form-input text-xs py-1"
                            >
                              <option value="">Quick fill from catalog…</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} — Retail: ₹{p.sellingPrice} {p.wholesalePrice != null ? `| Wholesale: ₹${p.wholesalePrice}` : ""}
                                </option>
                              ))}
                            </select>
                          )}
                          <input
                            type="text"
                            required
                            placeholder="Description / Service details"
                            value={item.description}
                            onChange={(e) => updateItem(index, "description", e.target.value)}
                            className="form-input"
                          />
                        </div>

                        {/* Price Tier Toggle */}
                        <div className="col-span-4 sm:col-span-2">
                          <label className="block text-[10px] text-slate-500 dark:text-slate-400 sm:hidden">Rate</label>
                          <div className="flex items-center rounded-lg border border-slate-200 dark:border-white/10 p-0.5 bg-white dark:bg-slate-800">
                            <button
                              type="button"
                              onClick={() => toggleItemPriceType(index, "retail")}
                              className={`flex-1 text-[10px] py-1 font-bold rounded ${
                                item.priceType !== "wholesale"
                                  ? "bg-blue-600 text-white"
                                  : "text-slate-500 hover:text-slate-800"
                              }`}
                            >
                              Retail
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleItemPriceType(index, "wholesale")}
                              className={`flex-1 text-[10px] py-1 font-bold rounded ${
                                item.priceType === "wholesale"
                                  ? "bg-emerald-600 text-white"
                                  : "text-slate-500 hover:text-slate-800"
                              }`}
                            >
                              Wholesale
                            </button>
                          </div>
                        </div>

                        {/* Qty */}
                        <div className="col-span-3 sm:col-span-1">
                          <label className="block text-[10px] text-slate-500 dark:text-slate-400 sm:hidden">Qty</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.1"
                            required
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                            className="form-input text-center text-xs"
                          />
                        </div>

                        {/* Unit Price */}
                        <div className="col-span-3 sm:col-span-2">
                          <label className="block text-[10px] text-slate-500 dark:text-slate-400 sm:hidden">Price (₹)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            placeholder="Price"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, "unitPrice", Number(e.target.value))}
                            className="form-input font-bold text-xs"
                          />
                        </div>

                        {/* Line Total */}
                        <div className="col-span-2 sm:col-span-1 text-right">
                          <p className="text-[10px] text-slate-400">Total</p>
                          <p className="font-bold text-slate-900 dark:text-white text-xs">
                            ₹{item.lineTotal.toLocaleString("en-IN")}
                          </p>
                        </div>

                        {/* Remove */}
                        <div className="col-span-12 sm:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            disabled={items.length <= 1}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-30 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Adjustments & Totals Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-200 dark:border-white/10">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Payment Notes & Instructions
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Bank details, GPay number, project notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="form-input resize-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Terms & Conditions
                    </label>
                    <textarea
                      rows={2}
                      value={terms}
                      onChange={(e) => setTerms(e.target.value)}
                      className="form-input resize-none text-xs"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Items Subtotal</span>
                    <span className="font-bold text-slate-900 dark:text-white">₹{subtotal.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Discount (₹)</span>
                    <input
                      type="number"
                      min="0"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(Number(e.target.value))}
                      className="form-input w-28 text-right py-1 text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Delivery / Courier (₹)</span>
                    <input
                      type="number"
                      min="0"
                      value={deliveryCharge}
                      onChange={(e) => setDeliveryCharge(Number(e.target.value))}
                      className="form-input w-28 text-right py-1 text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Advance Received (₹)</span>
                    <input
                      type="number"
                      min="0"
                      value={advancePaid}
                      onChange={(e) => setAdvancePaid(Number(e.target.value))}
                      className="form-input w-28 text-right py-1 text-xs text-emerald-600 dark:text-emerald-400 font-bold"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-1.5">
                    <div className="flex justify-between text-base font-bold">
                      <span className="text-slate-900 dark:text-white">Grand Total</span>
                      <span className="text-[#27348B] dark:text-cyan-400">₹{grandTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-slate-700 dark:text-slate-300 font-bold">Balance Due</span>
                      <span className="text-amber-600 dark:text-amber-400 font-bold">₹{balanceDue.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary btn-sm flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
