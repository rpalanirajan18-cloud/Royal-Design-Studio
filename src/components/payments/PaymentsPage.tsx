"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  Plus,
  Search,
  Loader2,
  CheckCircle2,
  X,
  Share2,
  Receipt,
  Calendar,
  Building,
} from "lucide-react";
import { PaymentMethod } from "@prisma/client";

interface Payment {
  id: string;
  receiptNumber: string;
  paymentDate: string;
  method: PaymentMethod;
  amount: number;
  transactionRef?: string;
  notes?: string;
  isAdvance: boolean;
  customer: { id: string; name: string; phone: string };
  allocations: {
    id: string;
    amount: number;
    invoice: { id: string; number: string; total: number };
  }[];
}

interface CustomerOption {
  id: string;
  name: string;
  phone: string;
}

interface UnpaidInvoice {
  id: string;
  number: string;
  total: number;
  balanceDue: number;
}

const METHOD_LABELS: Record<PaymentMethod, { label: string; badge: string }> = {
  UPI: { label: "UPI / GPay / PhonePe", badge: "badge-blue" },
  BANK_TRANSFER: { label: "Bank NEFT / IMPS", badge: "badge-purple" },
  CASH: { label: "Cash", badge: "badge-success" },
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState<UnpaidInvoice[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [customerId, setCustomerId] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.UPI);
  const [amount, setAmount] = useState("");
  const [transactionRef, setTransactionRef] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [notes, setNotes] = useState("");

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(search ? { search } : {});
      const res = await fetch(`/api/payments?${params}`);
      const data = await res.json();
      setPayments(data.payments ?? []);
    } catch {
      /* handle */
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => fetchPayments(), 250);
    return () => clearTimeout(t);
  }, [fetchPayments]);

  const openModal = async () => {
    setShowModal(true);
    try {
      const res = await fetch("/api/customers?limit=100");
      const data = await res.json();
      setCustomers(data.customers ?? []);
      if (data.customers?.length > 0 && !customerId) {
        setCustomerId(data.customers[0].id);
        fetchCustomerInvoices(data.customers[0].id);
      }
    } catch {
      /* handle */
    }
  };

  const fetchCustomerInvoices = async (cId: string) => {
    try {
      const res = await fetch(`/api/invoices?customerId=${cId}&limit=50`);
      const data = await res.json();
      const unpaid = (data.invoices ?? []).filter(
        (inv: { balanceDue: number }) => Number(inv.balanceDue) > 0
      );
      setUnpaidInvoices(unpaid);
      if (unpaid.length > 0) {
        setSelectedInvoiceId(unpaid[0].id);
        setAmount(String(unpaid[0].balanceDue));
      } else {
        setSelectedInvoiceId("");
      }
    } catch {
      /* handle */
    }
  };

  const handleCustomerChange = (cId: string) => {
    setCustomerId(cId);
    fetchCustomerInvoices(cId);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !amount || Number(amount) <= 0) {
      setFormError("Please enter a valid customer and amount");
      return;
    }
    setSaving(true);
    setFormError("");

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          paymentDate: new Date(paymentDate).toISOString(),
          method,
          amount: Number(amount),
          transactionRef,
          notes,
          allocations: selectedInvoiceId
            ? [{ invoiceId: selectedInvoiceId, amount: Number(amount) }]
            : [],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error?.message || data.error || "Failed to record payment");
        return;
      }

      setShowModal(false);
      setAmount("");
      setTransactionRef("");
      setNotes("");
      fetchPayments();
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const shareReceiptWhatsApp = (p: Payment) => {
    const text = encodeURIComponent(
      `Hello ${p.customer.name},\n\n` +
      `We have received your payment of *₹${Number(p.amount).toLocaleString("en-IN")}*.\n` +
      `Receipt No: *${p.receiptNumber}*\n` +
      `Payment Method: ${p.method}\n` +
      (p.transactionRef ? `Ref: ${p.transactionRef}\n` : "") +
      `Date: ${new Date(p.paymentDate).toLocaleDateString("en-IN")}\n\n` +
      `Thank you for your business! — Royal Design Studio`
    );
    window.open(`https://wa.me/${p.customer.phone.replace(/[^0-9]/g, "")}?text=${text}`, "_blank");
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Payments & Receipts</h1>
          <p className="text-sm mt-0.5 text-slate-600 dark:text-slate-400">
            Payment transactions, invoice settlements, and official receipt vouchers
          </p>
        </div>
        <button onClick={openModal} className="btn btn-primary btn-sm flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Record Payment
        </button>
      </div>

      {/* Search */}
      <div className="glass-card p-4 animate-fade-in-up">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="search"
            placeholder="Search receipt #, client, transaction ref…"
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
            <span className="text-slate-400">Loading payment receipts…</span>
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-16">
            <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium mb-1">No payment receipts recorded</p>
            <p className="text-sm mb-4 text-slate-400">
              Record a UPI, Cash, or Bank transfer payment to update invoice balances
            </p>
            <button onClick={openModal} className="btn btn-primary btn-sm">
              <Plus className="w-4 h-4" /> Record Payment
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Amount Received</th>
                  <th>Method</th>
                  <th>Transaction Ref</th>
                  <th>Allocated Invoice</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const methodConf = METHOD_LABELS[p.method] ?? METHOD_LABELS.UPI;
                  const allocated = p.allocations?.[0];
                  return (
                    <tr key={p.id}>
                      <td>
                        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                          {p.receiptNumber}
                        </span>
                      </td>
                      <td>
                        <p className="font-semibold text-slate-900 dark:text-white">{p.customer.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{p.customer.phone}</p>
                      </td>
                      <td>
                        <span className="text-xs text-slate-600 dark:text-slate-300">
                          {new Date(p.paymentDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </td>
                      <td>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base">
                          ₹{Number(p.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${methodConf.badge}`}>{p.method}</span>
                      </td>
                      <td>
                        {p.transactionRef ? (
                          <span className="font-mono text-xs text-slate-600 dark:text-slate-300">{p.transactionRef}</span>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </td>
                      <td>
                        {allocated ? (
                          <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                            {allocated.invoice.number}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 dark:text-slate-400">Advance / Unallocated</span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => shareReceiptWhatsApp(p)}
                          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          title="WhatsApp Receipt Voucher"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
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
                <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Record Payment Receipt</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 text-sm bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-lg">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-slate-700 dark:text-slate-300">
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
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              {unpaidInvoices.length > 0 && (
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Apply to Invoice
                  </label>
                  <select
                    value={selectedInvoiceId}
                    onChange={(e) => {
                      setSelectedInvoiceId(e.target.value);
                      const inv = unpaidInvoices.find((i) => i.id === e.target.value);
                      if (inv) setAmount(String(inv.balanceDue));
                    }}
                    className="form-input"
                  >
                    <option value="">Record as unallocated advance</option>
                    {unpaidInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.number} — Balance Due: ₹{Number(inv.balanceDue).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Amount Received (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="form-input font-bold text-emerald-600 dark:text-emerald-400 text-base"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Payment Method
                  </label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                    className="form-input"
                  >
                    <option value={PaymentMethod.UPI}>UPI (GPay / PhonePe / Paytm)</option>
                    <option value={PaymentMethod.BANK_TRANSFER}>Bank Transfer (NEFT / IMPS)</option>
                    <option value={PaymentMethod.CASH}>Cash Payment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Transaction Ref / UPI UTR
                  </label>
                  <input
                    type="text"
                    placeholder="UTR / Cheque # / Ref"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    className="form-input font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional payment notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="form-input resize-none"
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
                  Save Payment Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
