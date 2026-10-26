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
  Eye,
  Calendar,
  Building,
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
}

interface Invoice {
  id: string;
  number: string;
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
}

interface ProductOption {
  id: string;
  name: string;
  sellingPrice: number;
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

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Invoice Form
  const [customerId, setCustomerId] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0]
  );
  const [items, setItems] = useState<LineItem[]>([
    { description: "", unit: "pcs", quantity: 1, unitPrice: 0, discount: 0, taxRate: 0, lineTotal: 0 },
  ]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [deliveryCharge, setDeliveryCharge] = useState<number>(0);
  const [advancePaid, setAdvancePaid] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("Payment due within 15 days. GST exempt under small-business threshold.");

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

  // Load customer and product options when opening create modal
  const openCreateModal = async () => {
    setShowCreateModal(true);
    try {
      const [cRes, pRes] = await Promise.all([
        fetch("/api/customers?limit=100"),
        fetch("/api/products?active=true"),
      ]);
      const cData = await cRes.json();
      const pData = await pRes.json();
      setCustomers(cData.customers ?? []);
      setProducts(pData.products ?? []);
      if (cData.customers?.length > 0 && !customerId) {
        setCustomerId(cData.customers[0].id);
      }
    } catch {
      /* handle */
    }
  };

  // Line item manipulation
  const updateItem = (index: number, field: keyof LineItem, value: unknown) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };

    // Auto-calculate line total
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
    const sub = Number(p.sellingPrice);
    newItems[index] = {
      productId: p.id,
      description: p.name,
      unit: p.unit || "pcs",
      quantity: 1,
      unitPrice: sub,
      discount: 0,
      taxRate: 0,
      lineTotal: sub,
    };
    setItems(newItems);
  };

  const addEmptyItem = () => {
    setItems([
      ...items,
      { description: "", unit: "pcs", quantity: 1, unitPrice: 0, discount: 0, taxRate: 0, lineTotal: 0 },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Computations
  const subtotal = items.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
  const grandTotal = Math.max(0, subtotal - Number(discountAmount || 0) + Number(deliveryCharge || 0));
  const balanceDue = Math.max(0, grandTotal - Number(advancePaid || 0));

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setFormError("Please select a customer");
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
          customerId,
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
        setFormError(data.error?.message || data.error || "Failed to create invoice");
        return;
      }

      setShowCreateModal(false);
      // Reset form
      setItems([{ description: "", unit: "pcs", quantity: 1, unitPrice: 0, discount: 0, taxRate: 0, lineTotal: 0 }]);
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

  const shareWhatsApp = (inv: Invoice) => {
    const text = encodeURIComponent(
      `Hello ${inv.customer.name},\n\n` +
      `Here is your invoice ${inv.number} from *Royal Design Studio*.\n` +
      `Total: ₹${Number(inv.total).toLocaleString("en-IN")}\n` +
      `Balance Due: ₹${Number(inv.balanceDue).toLocaleString("en-IN")}\n\n` +
      `For payments, UPI ID: royaldesignstudioofficial@okaxis or Bank Transfer.\n` +
      `Thank you for choosing Royal Design Studio!`
    );
    window.open(`https://wa.me/${inv.customer.phone.replace(/[^0-9]/g, "")}?text=${text}`, "_blank");
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sales Invoices</h1>
          <p className="text-sm mt-0.5 text-slate-500 dark:text-slate-400">
            {total} invoices issued for design, printing, and digital services
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="btn btn-primary btn-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Invoice
        </button>
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
            { id: "DRAFT", label: "Draft" },
            { id: "ISSUED", label: "Issued" },
            { id: "PARTIALLY_PAID", label: "Partial" },
            { id: "PAID", label: "Paid" },
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
              Create your first invoice for a design, print, or gifting order
            </p>
            <button onClick={openCreateModal} className="btn btn-primary btn-sm">
              <Plus className="w-4 h-4" /> Create Invoice
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Balance Due</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const conf = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.DRAFT;
                  return (
                    <tr key={inv.id}>
                      <td>
                        <span className="font-mono text-xs font-bold text-[#27348B] dark:text-cyan-400">
                          {inv.number}
                        </span>
                      </td>
                      <td>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{inv.customer.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{inv.customer.phone}</p>
                        </div>
                      </td>
                      <td>
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                          {new Date(inv.issueDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </td>
                      <td>
                        <span className="font-bold text-slate-900 dark:text-white text-base">
                          ₹{Number(inv.total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td>
                        <span className={`font-semibold text-sm ${Number(inv.balanceDue) > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                          ₹{Number(inv.balanceDue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${conf.badge}`}>{conf.label}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                            title="View Invoice"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <a
                            href={`/api/invoices/${inv.id}/pdf`}
                            download
                            className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-[#27348B] dark:text-blue-400 transition-colors"
                            title="Download PDF"
                          >
                            <FileDown className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => shareWhatsApp(inv)}
                            className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 transition-colors"
                            title="Share on WhatsApp"
                          >
                            <Share2 className="w-4 h-4" />
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

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#0d1527] w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-3">
                <Receipt className="w-5 h-5 text-[#27348B] dark:text-blue-400" />
                <div>
                  <h3 className="text-lg font-bold font-mono text-slate-900 dark:text-white">{selectedInvoice.number}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{selectedInvoice.customer.name}</p>
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
              {/* Status and Dates */}
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

              {/* Items */}
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
                        ₹{Number(item.lineTotal).toLocaleString("en-IN")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <a
                    href={`/api/invoices/${selectedInvoice.id}/pdf`}
                    download
                    className="btn btn-primary btn-sm flex items-center gap-2"
                  >
                    <FileDown className="w-4 h-4" />
                    Download PDF
                  </a>
                  <button
                    onClick={() => shareWhatsApp(selectedInvoice)}
                    className="btn btn-secondary btn-sm flex items-center gap-2 text-emerald-600 dark:text-emerald-400"
                  >
                    <Share2 className="w-4 h-4" />
                    WhatsApp
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

      {/* Create Invoice Modal */}
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

              {/* Customer and Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Customer *
                  </label>
                  <select
                    required
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="form-input"
                  >
                    <option value="">Select customer…</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>
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

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Itemized Services / Products
                  </label>
                  <button
                    type="button"
                    onClick={addEmptyItem}
                    className="text-xs text-[#27348B] dark:text-cyan-400 hover:underline font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Row
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((item, index) => (
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
                                {p.name} — ₹{p.sellingPrice}
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

                      {/* Qty & Unit */}
                      <div className="col-span-3 sm:col-span-2">
                        <label className="block text-[10px] text-slate-500 dark:text-slate-400 sm:hidden">Qty</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.1"
                          required
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                          className="form-input"
                        />
                      </div>

                      {/* Unit Price */}
                      <div className="col-span-4 sm:col-span-2">
                        <label className="block text-[10px] text-slate-500 dark:text-slate-400 sm:hidden">Price</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          placeholder="Price"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, "unitPrice", Number(e.target.value))}
                          className="form-input font-semibold"
                        />
                      </div>

                      {/* Line Total */}
                      <div className="col-span-3 sm:col-span-2 text-right">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Total</p>
                        <p className="font-bold text-slate-900 dark:text-white text-sm">
                          ₹{item.lineTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </p>
                      </div>

                      {/* Remove */}
                      <div className="col-span-2 sm:col-span-1 flex justify-end">
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
                  ))}
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
                      className="form-input resize-none"
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
                  Save Draft Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
