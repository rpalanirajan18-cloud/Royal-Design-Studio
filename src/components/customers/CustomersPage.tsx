"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  UserCheck,
  Phone,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  Building,
  Edit2,
  Trash2,
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  phone: string;
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingPincode?: string;
  gstin?: string;
  isActive: boolean;
  createdAt: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Create Modal state
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    gstin: "",
    billingAddress: "",
    billingCity: "",
    billingState: "Tamil Nadu",
    billingPincode: "",
  });

  // Edit Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    gstin: "",
    billingAddress: "",
    billingCity: "",
    billingState: "Tamil Nadu",
    billingPincode: "",
    isActive: true,
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const limit = 20;
  const totalPages = Math.ceil(total / limit);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });
      const res = await fetch(`/api/customers?${params}`);
      const data = await res.json();
      setCustomers(data.customers ?? []);
      setTotal(data.total ?? 0);
    } catch {
      /* handle error */
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) {
      setFormError("Name and Phone are required");
      return;
    }
    setSaving(true);
    setFormError("");

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(
          data.error?.name?._errors?.[0] ||
            data.error?.phone?._errors?.[0] ||
            data.error ||
            "Failed to create customer"
        );
        return;
      }
      setShowModal(false);
      setForm({
        name: "",
        phone: "",
        gstin: "",
        billingAddress: "",
        billingCity: "",
        billingState: "Tamil Nadu",
        billingPincode: "",
      });
      fetchCustomers();
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setEditForm({
      name: c.name || "",
      phone: c.phone || "",
      gstin: c.gstin || "",
      billingAddress: c.billingAddress || "",
      billingCity: c.billingCity || "",
      billingState: c.billingState || "Tamil Nadu",
      billingPincode: c.billingPincode || "",
      isActive: c.isActive ?? true,
    });
    setEditError("");
    setShowEditModal(true);
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    if (!editForm.name || !editForm.phone) {
      setEditError("Name and Phone are required");
      return;
    }
    setEditSaving(true);
    setEditError("");

    try {
      const res = await fetch(`/api/customers/${editingCustomer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error?.message || data.error || "Failed to update customer");
        return;
      }
      setShowEditModal(false);
      setEditingCustomer(null);
      fetchCustomers();
    } catch {
      setEditError("Network error. Please try again.");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete customer "${name}"?`)) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.deactivated) {
        alert(
          `Customer has associated invoices or orders and was set to Inactive instead of deleting.`
        );
      }
      fetchCustomers();
    } catch {
      alert("Failed to delete customer. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Customers</h1>
          <p className="text-sm mt-0.5 text-slate-600 dark:text-slate-400">
            {total} registered clients & organizations
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary btn-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="glass-card p-4 animate-fade-in-up">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="search"
            placeholder="Search by name, phone, city, GSTIN…"
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
            <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
            <span className="text-slate-600 dark:text-slate-400">Loading customers…</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-16">
            <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-20 text-slate-400" />
            <p className="font-semibold text-slate-900 dark:text-white mb-1">No customers found</p>
            <p className="text-sm mb-4 text-slate-600 dark:text-slate-400">
              {search
                ? "Try a different search term"
                : "Add your first client to start creating invoices"}
            </p>
            <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm">
              <Plus className="w-4 h-4" /> Add Customer
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Customer / Business Name</th>
                    <th>Phone Number</th>
                    <th>Location</th>
                    <th>GSTIN</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {c.name[0]?.toUpperCase() ?? "C"}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{c.name}</p>
                            {c.billingAddress && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">
                                {c.billingAddress}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className="flex items-center gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-200">
                          <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          {c.phone}
                        </p>
                      </td>
                      <td>
                        {c.billingCity ? (
                          <p className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                            {c.billingCity}
                            {c.billingState ? `, ${c.billingState}` : ""}
                            {c.billingPincode ? ` - ${c.billingPincode}` : ""}
                          </p>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </td>
                      <td>
                        {c.gstin ? (
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 font-bold">
                            {c.gstin}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Unregistered
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${c.isActive ? "badge-success" : "badge-neutral"}`}>
                          {c.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(c)}
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                            title="Edit customer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(c.id, c.name)}
                            disabled={deletingId === c.id}
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                            title="Delete customer"
                          >
                            {deletingId === c.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 dark:border-white/10">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn btn-secondary btn-sm btn-icon"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn btn-secondary btn-sm btn-icon"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#0d1527] w-full max-w-lg overflow-hidden border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">New Customer</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 text-sm bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 rounded-lg">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Customer / Business Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ponmalar or Apex Corporation"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="form-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="form-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  GSTIN (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 33AAAAA0000A1Z5"
                  value={form.gstin}
                  onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                  className="form-input font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Billing Address
                </label>
                <textarea
                  rows={2}
                  placeholder="Street address, building, suite"
                  value={form.billingAddress}
                  onChange={(e) => setForm({ ...form, billingAddress: e.target.value })}
                  className="form-input resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="City"
                    value={form.billingCity}
                    onChange={(e) => setForm({ ...form, billingCity: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    State
                  </label>
                  <input
                    type="text"
                    placeholder="State"
                    value={form.billingState}
                    onChange={(e) => setForm({ ...form, billingState: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Pincode
                  </label>
                  <input
                    type="text"
                    placeholder="Pincode"
                    value={form.billingPincode}
                    onChange={(e) => setForm({ ...form, billingPincode: e.target.value })}
                    className="form-input"
                  />
                </div>
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
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {showEditModal && editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#0d1527] w-full max-w-lg overflow-hidden border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Customer</h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCustomer} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {editError && (
                <div className="p-3 text-sm bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 rounded-lg">
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Customer / Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="form-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="form-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  GSTIN (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 33AAAAA0000A1Z5"
                  value={editForm.gstin}
                  onChange={(e) => setEditForm({ ...editForm, gstin: e.target.value.toUpperCase() })}
                  className="form-input font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Billing Address
                </label>
                <textarea
                  rows={2}
                  placeholder="Street address, building, suite"
                  value={editForm.billingAddress}
                  onChange={(e) => setEditForm({ ...editForm, billingAddress: e.target.value })}
                  className="form-input resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="City"
                    value={editForm.billingCity}
                    onChange={(e) => setEditForm({ ...editForm, billingCity: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    State
                  </label>
                  <input
                    type="text"
                    placeholder="State"
                    value={editForm.billingState}
                    onChange={(e) => setEditForm({ ...editForm, billingState: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Pincode
                  </label>
                  <input
                    type="text"
                    placeholder="Pincode"
                    value={editForm.billingPincode}
                    onChange={(e) => setEditForm({ ...editForm, billingPincode: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                />
                <label htmlFor="isActive" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Customer Status is Active
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 -mx-6 -mb-6 p-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="btn btn-primary btn-sm flex items-center gap-2"
                >
                  {editSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Update Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
