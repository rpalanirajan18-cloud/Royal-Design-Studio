"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShoppingBag,
  Plus,
  Search,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  Layers,
  X,
  Share2,
  Calendar,
  User,
  ArrowRight,
  Eye,
} from "lucide-react";
import { OrderStatus } from "@prisma/client";

interface OrderItem {
  id?: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  size?: string;
  material?: string;
  color?: string;
  specifications?: string;
  lineTotal: number;
}

interface Order {
  id: string;
  number: string;
  customer: { id: string; name: string; phone: string };
  orderDate: string;
  requiredByDate?: string;
  status: OrderStatus;
  customizationNotes?: string;
  designNotes?: string;
  productionNotes?: string;
  proofSentAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  advanceAmount: number;
  balanceDue: number;
  deliveryAddress?: string;
  deliveryCity?: string;
  items: OrderItem[];
  statusHistory?: {
    id: string;
    toStatus: OrderStatus;
    notes?: string;
    createdAt: string;
    updatedBy: { name: string };
  }[];
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

const STATUS_PIPELINE: { id: OrderStatus; label: string; badge: string }[] = [
  { id: OrderStatus.NEW, label: "New", badge: "badge-blue" },
  { id: OrderStatus.AWAITING_ARTWORK, label: "Artwork Pending", badge: "badge-amber" },
  { id: OrderStatus.AWAITING_APPROVAL, label: "Proof Approval", badge: "badge-purple" },
  { id: OrderStatus.APPROVED, label: "Approved", badge: "badge-blue" },
  { id: OrderStatus.IN_PRODUCTION, label: "In Production", badge: "badge-amber" },
  { id: OrderStatus.QUALITY_CHECK, label: "QC Check", badge: "badge-purple" },
  { id: OrderStatus.READY_FOR_DISPATCH, label: "Ready", badge: "badge-success" },
  { id: OrderStatus.DISPATCHED, label: "Dispatched", badge: "badge-blue" },
  { id: OrderStatus.DELIVERED, label: "Delivered", badge: "badge-success" },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeStage, setActiveStage] = useState<string>("ALL");

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [customerId, setCustomerId] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
  const [requiredByDate, setRequiredByDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]
  );
  const [customizationNotes, setCustomizationNotes] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [items, setItems] = useState<OrderItem[]>([
    { description: "", unit: "pcs", quantity: 1, unitPrice: 0, size: "", material: "", specifications: "", lineTotal: 0 },
  ]);

  // Selected Order Detail
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(search ? { search } : {}),
        ...(activeStage !== "ALL" ? { status: activeStage } : {}),
      });
      const res = await fetch(`/api/orders?${params}`);
      const data = await res.json();
      setOrders(data.orders ?? []);
      setTotal(data.total ?? 0);
    } catch {
      /* handle */
    } finally {
      setLoading(false);
    }
  }, [search, activeStage]);

  useEffect(() => {
    const t = setTimeout(() => fetchOrders(), 250);
    return () => clearTimeout(t);
  }, [fetchOrders]);

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

  const updateItem = (index: number, field: keyof OrderItem, value: unknown) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    item.lineTotal = Number(item.quantity || 0) * Number(item.unitPrice || 0);
    newItems[index] = item;
    setItems(newItems);
  };

  const addEmptyItem = () => {
    setItems([
      ...items,
      { description: "", unit: "pcs", quantity: 1, unitPrice: 0, size: "", material: "", specifications: "", lineTotal: 0 },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
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
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          orderDate: new Date(orderDate).toISOString(),
          requiredByDate: requiredByDate ? new Date(requiredByDate).toISOString() : undefined,
          customizationNotes,
          advanceAmount: Number(advanceAmount || 0),
          deliveryAddress,
          deliveryCity,
          items: items.map((it, idx) => ({
            description: it.description,
            unit: it.unit || "pcs",
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
            size: it.size,
            material: it.material,
            specifications: it.specifications,
            sortOrder: idx,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error?.message || data.error || "Failed to create order");
        return;
      }

      setShowCreateModal(false);
      fetchOrders();
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, toStatus: OrderStatus) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: toStatus }),
      });
      if (res.ok) {
        fetchOrders();
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: toStatus });
        }
      }
    } catch {
      /* handle */
    } finally {
      setUpdatingStatus(false);
    }
  };

  const shareStatusWhatsApp = (ord: Order) => {
    const text = encodeURIComponent(
      `Hello ${ord.customer.name},\n\n` +
      `Update regarding your order *${ord.number}* at *Royal Design Studio*:\n` +
      `Current Status: *${ord.status.replace(/_/g, " ")}*\n` +
      (ord.requiredByDate ? `Target Delivery: ${new Date(ord.requiredByDate).toLocaleDateString("en-IN")}\n` : "") +
      `Balance Due: ₹${Number(ord.balanceDue).toLocaleString("en-IN")}\n\n` +
      `Thank you for trusting Royal Design Studio for your printing and design requirements!`
    );
    window.open(`https://wa.me/${ord.customer.phone.replace(/[^0-9]/g, "")}?text=${text}`, "_blank");
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold">Custom Orders</h1>
          <p className="text-sm mt-0.5" style={{ color: "hsl(215 20% 55%)" }}>
            Production pipeline for customized gifting, physical printing, and flex orders
          </p>
        </div>
        <button onClick={openCreateModal} className="btn btn-primary btn-sm flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Order
        </button>
      </div>

      {/* Pipeline tabs */}
      <div className="glass-card p-4 animate-fade-in-up space-y-3">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="search"
            placeholder="Search order #, customer, specifications…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: "38px" }}
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveStage("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeStage === "ALL"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            All Stages
          </button>
          {STATUS_PIPELINE.map((st) => (
            <button
              key={st.id}
              onClick={() => setActiveStage(st.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeStage === st.id
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="glass-card overflow-hidden animate-fade-in-up">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="text-slate-400">Loading orders pipeline…</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium mb-1">No orders in this stage</p>
            <p className="text-sm mb-4 text-slate-400">
              Create an order to track customized production from artwork to delivery
            </p>
            <button onClick={openCreateModal} className="btn btn-primary btn-sm">
              <Plus className="w-4 h-4" /> New Order
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Order Date</th>
                  <th>Required By</th>
                  <th>Stage / Status</th>
                  <th>Balance Due</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((ord) => {
                  const conf = STATUS_PIPELINE.find((s) => s.id === ord.status) ?? STATUS_PIPELINE[0];
                  return (
                    <tr key={ord.id}>
                      <td>
                        <span className="font-mono text-xs font-bold text-blue-400">{ord.number}</span>
                      </td>
                      <td>
                        <p className="font-semibold text-white">{ord.customer.name}</p>
                        <p className="text-xs text-slate-400">{ord.customer.phone}</p>
                      </td>
                      <td>
                        <span className="text-xs text-slate-300">
                          {new Date(ord.orderDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </td>
                      <td>
                        {ord.requiredByDate ? (
                          <span className="text-xs font-medium text-amber-300">
                            {new Date(ord.requiredByDate).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${conf.badge}`}>{conf.label}</span>
                      </td>
                      <td>
                        <span className={`font-semibold text-sm ${Number(ord.balanceDue) > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                          ₹{Number(ord.balanceDue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedOrder(ord)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
                            title="View Order"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => shareStatusWhatsApp(ord)}
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                            title="WhatsApp Client Update"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
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
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-2xl overflow-hidden border border-white/10 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-lg font-bold font-mono">{selectedOrder.number}</h3>
                  <p className="text-xs text-slate-400">{selectedOrder.customer.name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Quick stage transition buttons */}
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider text-slate-400">
                  Update Production Stage
                </label>
                <div className="flex flex-wrap gap-2">
                  {STATUS_PIPELINE.map((st) => (
                    <button
                      key={st.id}
                      onClick={() => handleUpdateStatus(selectedOrder.id, st.id)}
                      disabled={updatingStatus || selectedOrder.status === st.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        selectedOrder.status === st.id
                          ? "bg-blue-600 text-white ring-2 ring-blue-400"
                          : "bg-white/5 hover:bg-white/10 text-slate-300"
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Specs & Customization Notes */}
              {selectedOrder.customizationNotes && (
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Customization & Artwork Instructions
                  </p>
                  <p className="text-sm text-slate-200 whitespace-pre-wrap">
                    {selectedOrder.customizationNotes}
                  </p>
                </div>
              )}

              {/* Items */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Ordered Products & Specs
                </h4>
                <div className="space-y-2">
                  {selectedOrder.items?.map((it, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-white/5 border border-white/5 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-semibold text-sm text-white">{it.description}</p>
                        <p className="text-xs text-slate-400">
                          Qty: {it.quantity} {it.unit}
                          {it.size ? ` | Size: ${it.size}` : ""}
                          {it.material ? ` | Mat: ${it.material}` : ""}
                        </p>
                      </div>
                      <p className="font-bold text-sm text-white">
                        ₹{Number(it.lineTotal).toLocaleString("en-IN")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <button
                  onClick={() => shareStatusWhatsApp(selectedOrder)}
                  className="btn btn-secondary btn-sm flex items-center gap-2 text-emerald-400"
                >
                  <Share2 className="w-4 h-4" />
                  WhatsApp Client
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="btn btn-primary btn-sm"
                >
                  Close
                </button>
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
                <ShoppingBag className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold">New Custom Printing / Gifting Order</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">
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
                    Order Date
                  </label>
                  <input
                    type="date"
                    required
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-slate-300">
                    Target Completion Date
                  </label>
                  <input
                    type="date"
                    required
                    value={requiredByDate}
                    onChange={(e) => setRequiredByDate(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Items & Custom Specifications */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Item Specifications
                  </label>
                  <button
                    type="button"
                    onClick={addEmptyItem}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2"
                    >
                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-12 sm:col-span-6">
                          <input
                            type="text"
                            required
                            placeholder="Product Name (e.g. Customized Wooden Engraved Plaque)"
                            value={item.description}
                            onChange={(e) => updateItem(index, "description", e.target.value)}
                            className="form-input"
                          />
                        </div>
                        <div className="col-span-4 sm:col-span-2">
                          <input
                            type="number"
                            step="1"
                            min="1"
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
                            placeholder="Price (₹)"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, "unitPrice", Number(e.target.value))}
                            className="form-input"
                          />
                        </div>
                        <div className="col-span-4 sm:col-span-2 flex items-center justify-between">
                          <span className="font-bold text-white text-sm">
                            ₹{item.lineTotal.toLocaleString("en-IN")}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            disabled={items.length <= 1}
                            className="p-1 text-slate-400 hover:text-rose-400"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="Size (e.g. 10x8 inches, A4)"
                          value={item.size}
                          onChange={(e) => updateItem(index, "size", e.target.value)}
                          className="form-input text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Material (e.g. Acrylic, Flex 340gsm, Ceramic)"
                          value={item.material}
                          onChange={(e) => updateItem(index, "material", e.target.value)}
                          className="form-input text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Color / Finishing details"
                          value={item.color}
                          onChange={(e) => updateItem(index, "color", e.target.value)}
                          className="form-input text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes & Advance Received */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-slate-300">
                    Artwork & Customization Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Names to engrave, photo references, font style, logo placement"
                    value={customizationNotes}
                    onChange={(e) => setCustomizationNotes(e.target.value)}
                    className="form-input resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-slate-300">
                    Advance Received Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                    className="form-input text-emerald-400 font-semibold mb-3"
                  />

                  <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-slate-300">
                    Delivery Address (if shipping)
                  </label>
                  <input
                    type="text"
                    placeholder="Recipient address, town"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="form-input"
                  />
                </div>
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
                  Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
