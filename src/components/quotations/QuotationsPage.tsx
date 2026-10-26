"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Plus,
  Search,
  Loader2,
  Share2,
  CheckCircle,
  Clock,
  X,
  Trash2,
  ArrowRight,
  Eye,
} from "lucide-react";
import { QuotationStatus } from "@prisma/client";

interface QuotationItem {
  productId?: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  lineTotal: number;
}

interface Quotation {
  id: string;
  number: string;
  customer: { id: string; name: string; phone: string };
  issueDate: string;
  validUntil: string;
  status: QuotationStatus;
  subtotal: number;
  discountAmount: number;
  deliveryCharge: number;
  total: number;
  items: QuotationItem[];
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

const STATUS_CONFIG: Record<QuotationStatus, { label: string; badge: string }> = {
  DRAFT: { label: "Draft", badge: "badge-neutral" },
  SENT: { label: "Sent", badge: "badge-blue" },
  ACCEPTED: { label: "Accepted", badge: "badge-success" },
  REJECTED: { label: "Rejected", badge: "badge-danger" },
  EXPIRED: { label: "Expired", badge: "badge-neutral" },
  CANCELLED: { label: "Cancelled", badge: "badge-neutral" },
};

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Form State
  const [customerId, setCustomerId] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]
  );
  const [items, setItems] = useState<QuotationItem[]>([
    { description: "", unit: "pcs", quantity: 1, unitPrice: 0, discount: 0, taxRate: 0, lineTotal: 0 },
  ]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("Quotation valid for 30 days. 50% advance for customized printing / gifting.");

  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [converting, setConverting] = useState(false);

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(search ? { search } : {}),
        ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
      });
      const res = await fetch(`/api/quotations?${params}`);
      const data = await res.json();
      setQuotations(data.quotations ?? []);
      setTotal(data.total ?? 0);
    } catch {
      /* handle */
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(() => fetchQuotations(), 250);
    return () => clearTimeout(t);
  }, [fetchQuotations]);

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

  const updateItem = (index: number, field: keyof QuotationItem, value: unknown) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    const sub = Number(item.quantity || 0) * Number(item.unitPrice || 0);
    const disc = Number(item.discount || 0);
    item.lineTotal = Math.max(0, sub - disc);
    newItems[index] = item;
    setItems(newItems);
  };

  const addItemFromProduct = (index: number, prodId: string) => {
    const p = products.find((prod) => prod.id === prodId);
    if (!p) return;
    const newItems = [...items];
    newItems[index] = {
      productId: p.id,
      description: p.name,
      unit: p.unit || "pcs",
      quantity: 1,
      unitPrice: Number(p.sellingPrice),
      discount: 0,
      taxRate: 0,
      lineTotal: Number(p.sellingPrice),
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

  const subtotal = items.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
  const grandTotal = Math.max(0, subtotal - Number(discountAmount || 0) + Number(deliveryCharge || 0));

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setFormError("Please select a customer");
      return;
    }
    if (items.some((it) => !it.description.trim() || it.unitPrice <= 0)) {
      setFormError("Each item must have a description and price");
      return;
    }
    setSaving(true);
    setFormError("");

    try {
      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          issueDate: new Date(issueDate).toISOString(),
          validUntil: new Date(validUntil).toISOString(),
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
          notes,
          terms,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error?.message || data.error || "Failed to create quotation");
        return;
      }

      setShowCreateModal(false);
      setItems([{ description: "", unit: "pcs", quantity: 1, unitPrice: 0, discount: 0, taxRate: 0, lineTotal: 0 }]);
      fetchQuotations();
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const convertQuotation = async (id: string, targetType: "INVOICE" | "PROFORMA") => {
    setConverting(true);
    try {
      const res = await fetch(`/api/quotations/${id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || `Quotation converted successfully`);
        setSelectedQuotation(null);
        fetchQuotations();
      } else {
        alert(data.error || "Conversion failed");
      }
    } catch {
      alert("Network error");
    } finally {
      setConverting(false);
    }
  };

  const shareWhatsApp = (q: Quotation) => {
    const text = encodeURIComponent(
      `Hello ${q.customer.name},\n\n` +
      `Here is the official price quotation *${q.number}* from *Royal Design Studio*.\n` +
      `Estimated Total: ₹${Number(q.total).toLocaleString("en-IN")}\n` +
      `Valid Until: ${new Date(q.validUntil).toLocaleDateString("en-IN")}\n\n` +
      `Please let us know if you approve this quotation so we can begin your project.`
    );
    window.open(`https://wa.me/${q.customer.phone.replace(/[^0-9]/g, "")}?text=${text}`, "_blank");
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Quotations / Estimates</h1>
          <p className="text-sm mt-0.5 text-slate-500 dark:text-slate-400">
            {total} price proposals for design, printing, and branding projects
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="btn btn-primary btn-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Quotation
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between glass-card p-4 animate-fade-in-up">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="search"
            placeholder="Search quotation # or client name…"
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
            { id: "ACCEPTED", label: "Accepted" },
            { id: "SENT", label: "Sent" },
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

      {/* Table */}
      <div className="glass-card overflow-hidden animate-fade-in-up">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-cyan-400" />
            <span className="text-slate-500 dark:text-slate-400 text-sm">Loading quotations…</span>
          </div>
        ) : quotations.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="font-bold text-slate-900 dark:text-white mb-1">No quotations found</p>
            <p className="text-sm mb-4 text-slate-500 dark:text-slate-400">
              Create an estimate to send to prospective clients
            </p>
            <button onClick={openCreateModal} className="btn btn-primary btn-sm">
              <Plus className="w-4 h-4" /> Create Quotation
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Quotation #</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Valid Until</th>
                  <th>Estimate Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((q) => {
                  const conf = STATUS_CONFIG[q.status] ?? STATUS_CONFIG.DRAFT;
                  return (
                    <tr key={q.id}>
                      <td>
                        <span className="font-mono text-xs font-bold text-[#27348B] dark:text-cyan-400">
                          {q.number}
                        </span>
                      </td>
                      <td>
                        <p className="font-bold text-slate-900 dark:text-white">{q.customer.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{q.customer.phone}</p>
                      </td>
                      <td>
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                          {new Date(q.issueDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {new Date(q.validUntil).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </td>
                      <td>
                        <span className="font-bold text-slate-900 dark:text-white text-base">
                          ₹{Number(q.total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${conf.badge}`}>{conf.label}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedQuotation(q)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                            title="View Quotation"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => shareWhatsApp(q)}
                            className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 transition-colors"
                            title="Send on WhatsApp"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          {q.status !== QuotationStatus.ACCEPTED && (
                            <button
                              onClick={() => convertQuotation(q.id, "INVOICE")}
                              className="px-2 py-1 rounded bg-[#27348B] hover:bg-[#1e2870] text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                              title="Convert to Sales Invoice"
                            >
                              <span>Convert</span>
                              <ArrowRight className="w-3 h-3" />
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

      {/* Detail Modal */}
      {selectedQuotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#0d1527] w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-[#27348B] dark:text-cyan-400" />
                <div>
                  <h3 className="text-lg font-bold font-mono text-slate-900 dark:text-white">{selectedQuotation.number}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{selectedQuotation.customer.name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedQuotation(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Status</p>
                  <p className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">{selectedQuotation.status}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Valid Until</p>
                  <p className="font-semibold text-sm text-slate-900 dark:text-white mt-0.5">
                    {new Date(selectedQuotation.validUntil).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Total Estimate</p>
                  <p className="font-bold text-base text-[#27348B] dark:text-cyan-400 mt-0.5">
                    ₹{Number(selectedQuotation.total).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  Items Quoted
                </h4>
                <div className="space-y-2">
                  {selectedQuotation.items?.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5"
                    >
                      <div>
                        <p className="font-semibold text-sm text-slate-900 dark:text-white">{item.description}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {item.quantity} {item.unit} × ₹{Number(item.unitPrice).toLocaleString("en-IN")}
                        </p>
                      </div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">
                        ₹{Number(item.lineTotal).toLocaleString("en-IN")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-white/10">
                <button
                  onClick={() => shareWhatsApp(selectedQuotation)}
                  className="btn btn-secondary btn-sm flex items-center gap-2 text-emerald-600 dark:text-emerald-400"
                >
                  <Share2 className="w-4 h-4" />
                  WhatsApp
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => convertQuotation(selectedQuotation.id, "PROFORMA")}
                    disabled={converting}
                    className="btn btn-secondary btn-sm"
                  >
                    Convert to Proforma
                  </button>
                  <button
                    onClick={() => convertQuotation(selectedQuotation.id, "INVOICE")}
                    disabled={converting}
                    className="btn btn-primary btn-sm flex items-center gap-1.5"
                  >
                    {converting && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Convert to Invoice</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#0d1527] w-full max-w-4xl overflow-hidden border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#27348B] dark:text-blue-400" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">New Quotation / Proposal</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuotation} className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">
              {formError && (
                <div className="p-3 text-sm bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 rounded-lg">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Client *
                  </label>
                  <select
                    required
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="form-input"
                  >
                    <option value="">Select client…</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Quotation Date
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
                    Valid Until
                  </label>
                  <input
                    type="date"
                    required
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Proposed Items / Deliverables
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
                      <div className="col-span-12 sm:col-span-5 space-y-1">
                        {products.length > 0 && (
                          <select
                            onChange={(e) => {
                              if (e.target.value) addItemFromProduct(index, e.target.value);
                            }}
                            className="form-input text-xs py-1"
                          >
                            <option value="">Pick from catalog…</option>
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
                          placeholder="Description / Specifications"
                          value={item.description}
                          onChange={(e) => updateItem(index, "description", e.target.value)}
                          className="form-input"
                        />
                      </div>

                      <div className="col-span-3 sm:col-span-2">
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

                      <div className="col-span-4 sm:col-span-2">
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

                      <div className="col-span-3 sm:col-span-2 text-right">
                        <p className="font-bold text-slate-900 dark:text-white text-sm">
                          ₹{item.lineTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </p>
                      </div>

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

              {/* Totals */}
              <div className="flex justify-between items-center p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                <span className="text-slate-700 dark:text-slate-300 font-bold">Total Estimated Amount</span>
                <span className="text-xl font-bold text-[#27348B] dark:text-cyan-400">₹{grandTotal.toFixed(2)}</span>
              </div>

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
                  Save Quotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
