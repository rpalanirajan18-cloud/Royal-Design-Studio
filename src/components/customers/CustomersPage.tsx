"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  UserCheck,
  Phone,
  Mail,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  Building,
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  contactPerson?: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  billingCity?: string;
  billingState?: string;
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

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    name: "",
    contactPerson: "",
    phone: "",
    whatsapp: "",
    email: "",
    gstin: "",
    billingAddress: "",
    billingCity: "",
    billingState: "Tamil Nadu",
    billingPincode: "",
  });

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
        setFormError(data.error?.name?._errors?.[0] || data.error?.phone?._errors?.[0] || data.error || "Failed to create customer");
        return;
      }
      setShowModal(false);
      setForm({
        name: "",
        contactPerson: "",
        phone: "",
        whatsapp: "",
        email: "",
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-sm mt-0.5" style={{ color: "hsl(215 20% 55%)" }}>
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
      <div
        className="glass-card p-4 animate-fade-in-up"
        style={{ animationDelay: "50ms" }}
      >
        <div className="relative max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "hsl(215 15% 45%)" }}
          />
          <input
            type="search"
            placeholder="Search by name, phone, email, GSTIN…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: "38px" }}
          />
        </div>
      </div>

      {/* Table */}
      <div
        className="glass-card overflow-hidden animate-fade-in-up"
        style={{ animationDelay: "100ms" }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "hsl(217 91% 60%)" }} />
            <span style={{ color: "hsl(215 20% 55%)" }}>Loading customers…</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-16">
            <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium mb-1">No customers found</p>
            <p className="text-sm mb-4" style={{ color: "hsl(215 15% 45%)" }}>
              {search ? "Try a different search term" : "Add your first client to start creating invoices"}
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="btn btn-primary btn-sm"
            >
              <Plus className="w-4 h-4" /> Add Customer
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Contact Info</th>
                    <th>Location</th>
                    <th>GSTIN</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                            style={{
                              background:
                                "linear-gradient(135deg, hsl(217 91% 55% / 0.3), hsl(258 89% 61% / 0.3))",
                              border: "1px solid hsl(217 91% 60% / 0.2)",
                              color: "hsl(217 91% 70%)",
                            }}
                          >
                            {c.name[0]?.toUpperCase() ?? "C"}
                          </div>
                          <div>
                            <p className="font-semibold">{c.name}</p>
                            {c.contactPerson && (
                              <p className="text-xs" style={{ color: "hsl(215 15% 45%)" }}>
                                {c.contactPerson}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="space-y-0.5">
                          <p className="flex items-center gap-1.5 text-sm">
                            <Phone className="w-3 h-3 flex-shrink-0" style={{ color: "hsl(215 15% 45%)" }} />
                            {c.phone}
                          </p>
                          {c.email && (
                            <p className="flex items-center gap-1.5 text-xs" style={{ color: "hsl(215 15% 45%)" }}>
                              <Mail className="w-3 h-3 flex-shrink-0" />
                              {c.email}
                            </p>
                          )}
                        </div>
                      </td>
                      <td>
                        {c.billingCity ? (
                          <p className="flex items-center gap-1.5 text-sm">
                            <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: "hsl(215 15% 45%)" }} />
                            {c.billingCity}{c.billingState ? `, ${c.billingState}` : ""}
                          </p>
                        ) : (
                          <span style={{ color: "hsl(215 15% 40%)" }}>—</span>
                        )}
                      </td>
                      <td>
                        {c.gstin ? (
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {c.gstin}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: "hsl(215 15% 40%)" }}>Unregistered</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${c.isActive ? "badge-success" : "badge-neutral"}`}>
                          {c.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                className="flex items-center justify-between px-5 py-3"
                style={{ borderTop: "1px solid hsl(215 25% 17%)" }}
              >
                <p className="text-xs" style={{ color: "hsl(215 15% 45%)" }}>
                  Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn btn-secondary btn-sm btn-icon"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-lg overflow-hidden border border-white/10 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold">New Customer</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 text-sm bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-lg">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-slate-300">
                  Customer / Business Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Corporation or John Doe"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-slate-300">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Kumar"
                    value={form.contactPerson}
                    onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-slate-300">
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-slate-300">
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={form.whatsapp}
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-slate-300">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="contact@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-slate-300">
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
                <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-slate-300">
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
                  <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-slate-300">
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
                  <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-slate-300">
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
                  <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-slate-300">
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

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
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
    </div>
  );
}
