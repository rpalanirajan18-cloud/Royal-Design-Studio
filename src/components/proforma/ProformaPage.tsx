"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Receipt,
  Plus,
  Search,
  Loader2,
  Share2,
  Clock,
  CheckCircle,
  X,
  Trash2,
  ArrowRight,
  Eye,
} from "lucide-react";
import { ProformaStatus } from "@prisma/client";

interface ProformaItem {
  productId?: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  lineTotal: number;
}

interface Proforma {
  id: string;
  number: string;
  customer: { id: string; name: string; phone: string };
  issueDate: string;
  status: ProformaStatus;
  advanceRequested?: number;
  subtotal: number;
  discountAmount: number;
  deliveryCharge: number;
  total: number;
  items: ProformaItem[];
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

export default function ProformaPage() {
  const [proformas, setProformas] = useState<Proforma[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [customerId, setCustomerId] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [advanceRequested, setAdvanceRequested] = useState<number>(0);
  const [items, setItems] = useState<ProformaItem[]>([
    { description: "", unit: "pcs", quantity: 1, unitPrice: 0, discount: 0, taxRate: 0, lineTotal: 0 },
  ]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [notes, setNotes] = useState("");

  const [selectedProforma, setSelectedProforma] = useState<Proforma | null>(null);
  const [converting, setConverting] = useState(false);

  const fetchProformas = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(search ? { search } : {});
      const res = await fetch(`/api/proforma?${params}`);
      const data = await res.json();
      setProformas(data.proformas ?? []);
      setTotal(data.total ?? 0);
    } catch {
      /* handle */
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => fetchProformas(), 250);
    return () => clearTimeout(t);
  }, [fetchProformas]);

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

  const updateItem = (index: number, field: keyof ProformaItem, value: unknown) => {
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

  const handleCreateProforma = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setFormError("Please select a customer");
      return;
    }
    setSaving(true);
    setFormError("");

    try {
      const res = await fetch("/api/proforma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          issueDate: new Date(issueDate).toISOString(),
          advanceRequested: Number(advanceRequested || 0),
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
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error?.message || data.error || "Failed to create proforma");
        return;
      }

      setShowCreateModal(false);
      fetchProformas();
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const convertToInvoice = async (id: string) => {
    setConverting(true);
    try {
      const res = await fetch(`/api/proforma/${id}/convert`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Converted to Sales Invoice!");
        setSelectedProforma(null);
        fetchProformas();
      } else {
        alert(data.error || "Conversion failed");
      }
    } catch {
      alert("Network error");
    } finally {
      setConverting(false);
    }
  };

  const shareWhatsApp = (p: Proforma) => {
    const text = encodeURIComponent(
      `Hello ${p.customer.name},\n\n` +
      `Here is your Proforma Invoice *${p.number}* from *Royal Design Studio*.\n` +
      `Total: ₹${Number(p.total).toLocaleString("en-IN")}\n` +
      (p.advanceRequested ? `Advance Requested: ₹${Number(p.advanceRequested).toLocaleString("en-IN")}\n\n` : "\n") +
      `UPI ID: royaldesignstudioofficial@okaxis\n` +
      `Please let us know once transferred so production can begin.`
    );
    window.open(`https://wa.me/${p.customer.phone.replace(/[^0-9]/g, "")}?text=${text}`, "_blank");
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold">Proforma Invoices</h1>
          <p className="text-sm mt-0.5" style={{ color: "hsl(215 20% 55%)" }}>
            Advance billing documents for printing orders & pre-payment requests
          </p>
        </div>
        <button onClick={openCreateModal} className="btn btn-primary btn-sm flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Proforma
        </button>
      </div>

      {/* Search */}
      <div className="glass-card p-4 animate-fade-in-up">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="search"
            placeholder="Search by proforma # or client name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: "38px" }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden animate-fade-in-up">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="text-slate-400">Loading proformas…</span>
          </div>
        ) : proformas.length === 0 ? (
          <div className="text-center py-16">
            <Receipt className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium mb-1">No proforma invoices found</p>
            <p className="text-sm mb-4 text-slate-400">
              Create a proforma invoice to collect advance before production
            </p>
            <button onClick={openCreateModal} className="btn btn-primary btn-sm">
              <Plus className="w-4 h-4" /> Create Proforma
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Proforma #</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Total Amount</th>
                  <th>Advance Requested</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {proformas.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className="font-mono text-xs font-bold text-blue-400">{p.number}</span>
                    </td>
                    <td>
                      <p className="font-semibold text-white">{p.customer.name}</p>
                      <p className="text-xs text-slate-400">{p.customer.phone}</p>
                    </td>
                    <td>
                      <span className="text-xs text-slate-300">
                        {new Date(p.issueDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </td>
                    <td>
                      <span className="font-bold text-white text-base">
                        ₹{Number(p.total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td>
                      <span className="font-semibold text-amber-400 text-sm">
                        ₹{Number(p.advanceRequested ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${p.status === ProformaStatus.CONVERTED ? "badge-success" : "badge-neutral"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedProforma(p)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
                          title="View Proforma"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => shareWhatsApp(p)}
                          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                          title="Share on WhatsApp"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        {p.status !== ProformaStatus.CONVERTED && (
                          <button
                            onClick={() => convertToInvoice(p.id)}
                            className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1"
                            title="Convert to Final Sales Invoice"
                          >
                            <span>Convert</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedProforma && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-2xl overflow-hidden border border-white/10 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <Receipt className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-lg font-bold font-mono">{selectedProforma.number}</h3>
                  <p className="text-xs text-slate-400">{selectedProforma.customer.name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProforma(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                <div>
                  <p className="text-xs text-slate-400">Status</p>
                  <p className="font-bold text-sm text-white mt-0.5">{selectedProforma.status}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Total Amount</p>
                  <p className="font-bold text-base text-blue-400 mt-0.5">
                    ₹{Number(selectedProforma.total).toLocaleString("en-IN")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Advance Requested</p>
                  <p className="font-bold text-base text-amber-400 mt-0.5">
                    ₹{Number(selectedProforma.advanceRequested ?? 0).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Line Items
                </h4>
                <div className="space-y-2">
                  {selectedProforma.items?.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5"
                    >
                      <div>
                        <p className="font-semibold text-sm text-white">{item.description}</p>
                        <p className="text-xs text-slate-400">
                          {item.quantity} {item.unit} × ₹{Number(item.unitPrice).toLocaleString("en-IN")}
                        </p>
                      </div>
                      <p className="font-bold text-sm text-white">
                        ₹{Number(item.lineTotal).toLocaleString("en-IN")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <button
                  onClick={() => shareWhatsApp(selectedProforma)}
                  className="btn btn-secondary btn-sm flex items-center gap-2 text-emerald-400"
                >
                  <Share2 className="w-4 h-4" />
                  WhatsApp
                </button>

                {selectedProforma.status !== ProformaStatus.CONVERTED && (
                  <button
                    onClick={() => convertToInvoice(selectedProforma.id)}
                    disabled={converting}
                    className="btn btn-primary btn-sm flex items-center gap-1.5"
                  >
                    {converting && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Convert to Invoice</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-4xl overflow-hidden border border-white/10 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold">New Proforma Invoice</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProforma} className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">
              {formError && (
                <div className="p-3 text-sm bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-lg">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-slate-300">
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
                  <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-slate-300">
                    Proforma Date
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
                  <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-slate-300">
                    Advance Requested (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 50% advance"
                    value={advanceRequested}
                    onChange={(e) => setAdvanceRequested(Number(e.target.value))}
                    className="form-input text-amber-400 font-semibold"
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Items & Services
                  </label>
                  <button
                    type="button"
                    onClick={addEmptyItem}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Row
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-12 gap-2 items-center p-3 rounded-xl bg-white/5 border border-white/5"
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
                          placeholder="Description"
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
                        <p className="font-bold text-white text-sm">
                          ₹{item.lineTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </p>
                      </div>

                      <div className="col-span-2 sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          disabled={items.length <= 1}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/10">
                <span className="text-slate-300 font-semibold">Total Proforma Amount</span>
                <span className="text-xl font-bold text-blue-400">₹{grandTotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
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
                  Save Proforma
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
