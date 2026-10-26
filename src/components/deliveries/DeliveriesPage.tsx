"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Truck,
  Plus,
  Search,
  Loader2,
  CheckCircle2,
  Clock,
  X,
  MapPin,
  Phone,
  Building,
} from "lucide-react";
import { DeliveryStatus } from "@prisma/client";

interface Delivery {
  id: string;
  recipientName: string;
  recipientPhone: string;
  address: string;
  city?: string;
  pincode?: string;
  deliveryFee: number;
  courier?: string;
  trackingNumber?: string;
  status: DeliveryStatus;
  expectedDate?: string;
  dispatchDate?: string;
  deliveredDate?: string;
  order?: { id: string; number: string };
}

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    recipientName: "",
    recipientPhone: "",
    address: "",
    city: "",
    pincode: "",
    deliveryFee: "0",
    courier: "Local Courier",
    trackingNumber: "",
    notes: "",
  });

  const fetchDeliveries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(search ? { search } : {}),
        ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
      });
      const res = await fetch(`/api/deliveries?${params}`);
      const data = await res.json();
      setDeliveries(data.deliveries ?? []);
    } catch {
      /* handle */
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(() => fetchDeliveries(), 250);
    return () => clearTimeout(t);
  }, [fetchDeliveries]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.recipientName || !form.recipientPhone || !form.address) {
      setFormError("Recipient name, phone, and address are required");
      return;
    }
    setSaving(true);
    setFormError("");

    try {
      const res = await fetch("/api/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          deliveryFee: Number(form.deliveryFee || 0),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error?.message || "Failed to create delivery");
        return;
      }
      setShowModal(false);
      fetchDeliveries();
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: DeliveryStatus) => {
    try {
      await fetch(`/api/deliveries/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchDeliveries();
    } catch {
      /* handle */
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Delivery & Dispatch Management</h1>
          <p className="text-sm mt-0.5 text-slate-600 dark:text-slate-400">
            Dispatch tracking, courier tracking numbers, and delivery confirmation
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Challan / Dispatch
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between glass-card p-4 animate-fade-in-up">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="search"
            placeholder="Search recipient, tracking #, courier…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: "38px" }}
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "ALL", label: "All" },
            { id: "PENDING", label: "Pending" },
            { id: "DISPATCHED", label: "Dispatched" },
            { id: "DELIVERED", label: "Delivered" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
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
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="text-slate-400">Loading delivery records…</span>
          </div>
        ) : deliveries.length === 0 ? (
          <div className="text-center py-16">
            <Truck className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium mb-1">No deliveries recorded</p>
            <p className="text-sm mb-4 text-slate-400">
              Create a dispatch entry when an order is ready for courier delivery
            </p>
            <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm">
              <Plus className="w-4 h-4" /> New Challan
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Delivery Address</th>
                  <th>Courier / Transporter</th>
                  <th>Tracking #</th>
                  <th>Delivery Fee</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <p className="font-semibold text-slate-900 dark:text-white">{d.recipientName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        {d.recipientPhone}
                      </p>
                    </td>
                    <td>
                      <p className="text-xs text-slate-700 dark:text-slate-300 max-w-xs truncate">{d.address}</p>
                      {d.city && <p className="text-xs text-slate-500">{d.city}{d.pincode ? ` - ${d.pincode}` : ""}</p>}
                    </td>
                    <td>
                      <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">{d.courier || "Direct Delivery"}</span>
                    </td>
                    <td>
                      {d.trackingNumber ? (
                        <span className="font-mono text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-500/20 font-bold">
                          {d.trackingNumber}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                      )}
                    </td>
                    <td>
                      <span className="text-xs text-slate-900 dark:text-white font-semibold">₹{Number(d.deliveryFee).toFixed(2)}</span>
                    </td>
                    <td>
                      <span className={`badge ${
                        d.status === DeliveryStatus.DELIVERED
                          ? "badge-success"
                          : d.status === DeliveryStatus.DISPATCHED
                          ? "badge-blue"
                          : "badge-neutral"
                      }`}>
                        {d.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        {d.status === DeliveryStatus.PENDING && (
                          <button
                            onClick={() => updateStatus(d.id, DeliveryStatus.DISPATCHED)}
                            className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                          >
                            Dispatch
                          </button>
                        )}
                        {d.status === DeliveryStatus.DISPATCHED && (
                          <button
                            onClick={() => updateStatus(d.id, DeliveryStatus.DELIVERED)}
                            className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                          >
                            Mark Delivered
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">New Delivery Challan</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 text-sm bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-lg">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Recipient Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Recipient / Company"
                    value={form.recipientName}
                    onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Recipient Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={form.recipientPhone}
                    onChange={(e) => setForm({ ...form, recipientPhone: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Delivery Address *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Door/building, street address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="form-input resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    City / Town
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Avudayanoor, Tenkasi"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Pincode
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 627808"
                    value={form.pincode}
                    onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Courier / Transporter
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ST Courier, Speed Post"
                    value={form.courier}
                    onChange={(e) => setForm({ ...form, courier: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Tracking # / LR No.
                  </label>
                  <input
                    type="text"
                    placeholder="AWB / Docket Number"
                    value={form.trackingNumber}
                    onChange={(e) => setForm({ ...form, trackingNumber: e.target.value })}
                    className="form-input font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Delivery Fee (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0.00"
                  value={form.deliveryFee}
                  onChange={(e) => setForm({ ...form, deliveryFee: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 -mx-6 -mb-6 p-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
                  Save Delivery
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
