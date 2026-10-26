"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingDown,
  Plus,
  Search,
  Loader2,
  Trash2,
  X,
  Tag,
  Calendar,
} from "lucide-react";
import { ExpenseCategory, PaymentMethod } from "@prisma/client";

interface Expense {
  id: string;
  expenseNumber: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  method?: PaymentMethod;
  transactionRef?: string;
  notes?: string;
}

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  PRINTING_MATERIALS: "Printing Materials (Flex, Vinyl, Inks)",
  GIFT_PROCUREMENT: "Gift Procurement (Trophies, Mugs, Plaque blanks)",
  PACKAGING: "Boxes & Packaging Materials",
  DELIVERY_COURIER: "Courier & Delivery Fees",
  FREELANCERS: "Freelancers & Subcontractors",
  SOFTWARE_SUBSCRIPTIONS: "Software (Adobe, Canva, Cloud)",
  ADVERTISING_MARKETING: "Advertising & Marketing",
  OFFICE_EXPENSES: "Office Supplies & Studio Maintenance",
  EQUIPMENT: "Hardware & Equipment Repair",
  OTHER: "Other Miscellaneous",
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<{
    date: string;
    category: ExpenseCategory;
    description: string;
    amount: string;
    method: PaymentMethod;
    transactionRef: string;
    notes: string;
  }>({
    date: new Date().toISOString().split("T")[0],
    category: ExpenseCategory.PRINTING_MATERIALS,
    description: "",
    amount: "",
    method: PaymentMethod.UPI,
    transactionRef: "",
    notes: "",
  });

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(search ? { search } : {}),
        ...(categoryFilter !== "ALL" ? { category: categoryFilter } : {}),
      });
      const res = await fetch(`/api/expenses?${params}`);
      const data = await res.json();
      setExpenses(data.expenses ?? []);
    } catch {
      /* handle */
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  useEffect(() => {
    const t = setTimeout(() => fetchExpenses(), 250);
    return () => clearTimeout(t);
  }, [fetchExpenses]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description || !form.amount || Number(form.amount) <= 0) {
      setFormError("Description and a positive amount are required");
      return;
    }
    setSaving(true);
    setFormError("");

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          date: new Date(form.date).toISOString(),
          amount: Number(form.amount),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error?.message || "Failed to record expense");
        return;
      }
      setShowModal(false);
      setForm({
        date: new Date().toISOString().split("T")[0],
        category: ExpenseCategory.PRINTING_MATERIALS,
        description: "",
        amount: "",
        method: PaymentMethod.UPI,
        transactionRef: "",
        notes: "",
      });
      fetchExpenses();
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense record?")) return;
    try {
      await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      fetchExpenses();
    } catch {
      /* handle */
    }
  };

  const totalExpenseAmount = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold">Business Expenses</h1>
          <p className="text-sm mt-0.5 text-slate-400">
            Printing raw materials, gifting items, software tools, courier, and office expenses
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Record Expense
        </button>
      </div>

      {/* Summary Card */}
      <div className="glass-card p-5 animate-fade-in-up flex items-center justify-between">
        <div>
          <p className="text-xs uppercase font-bold tracking-wider text-slate-400">
            Total Filtered Expenses
          </p>
          <p className="text-2xl font-bold text-rose-400 mt-1">
            ₹{totalExpenseAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
          <TrendingDown className="w-6 h-6" />
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between glass-card p-4 animate-fade-in-up">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="search"
            placeholder="Search description, voucher #, UTR…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: "38px" }}
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="form-input text-xs max-w-xs"
        >
          <option value="ALL">All Expense Categories</option>
          {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
            <option key={cat} value={cat}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden animate-fade-in-up">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="text-slate-400">Loading expenses…</span>
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-16">
            <TrendingDown className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium mb-1">No expenses found</p>
            <p className="text-sm mb-4 text-slate-400">
              Record business operating expenses to accurately track profitability
            </p>
            <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm">
              <Plus className="w-4 h-4" /> Record Expense
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Voucher #</th>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Method</th>
                  <th>Ref #</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <span className="font-mono text-xs font-bold text-blue-400">
                        {e.expenseNumber}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs text-slate-300">
                        {new Date(e.date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs text-slate-300">
                        {CATEGORY_LABELS[e.category] ?? e.category}
                      </span>
                    </td>
                    <td>
                      <p className="text-sm font-semibold text-white">{e.description}</p>
                    </td>
                    <td>
                      <span className="badge badge-neutral text-xs">{e.method ?? "Direct"}</span>
                    </td>
                    <td>
                      {e.transactionRef ? (
                        <span className="font-mono text-xs text-slate-400">{e.transactionRef}</span>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>
                    <td>
                      <span className="font-bold text-rose-400 text-base">
                        ₹{Number(e.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="p-1 text-slate-400 hover:text-rose-400"
                        title="Delete expense"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-lg overflow-hidden border border-white/10 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-rose-400" />
                <h3 className="text-lg font-bold">Record Expense</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 text-sm bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-lg">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-slate-300">
                    Expense Date
                  </label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-slate-300">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="form-input font-bold text-rose-400 text-base"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-slate-300">
                  Category *
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}
                  className="form-input"
                >
                  {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
                    <option key={cat} value={cat}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-slate-300">
                  Description / Item Purchased *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 50 Acrylic Sheets 3mm for Trophy Making"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-slate-300">
                    Payment Method
                  </label>
                  <select
                    value={form.method}
                    onChange={(e) => setForm({ ...form, method: e.target.value as PaymentMethod })}
                    className="form-input"
                  >
                    <option value={PaymentMethod.UPI}>UPI (GPay / PhonePe)</option>
                    <option value={PaymentMethod.BANK_TRANSFER}>Bank Transfer</option>
                    <option value={PaymentMethod.CASH}>Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-slate-300">
                    Transaction Ref (UTR)
                  </label>
                  <input
                    type="text"
                    placeholder="UTR / Receipt Ref"
                    value={form.transactionRef}
                    onChange={(e) => setForm({ ...form, transactionRef: e.target.value })}
                    className="form-input font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-slate-300">
                  Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Vendor name, bill number, order association"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="form-input resize-none"
                />
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
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
