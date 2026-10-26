"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Plus,
  Loader2,
  Calendar,
  Building,
  CheckCircle2,
  PauseCircle,
  XCircle,
  X,
} from "lucide-react";
import { RecurringFrequency, RecurringPlanStatus } from "@prisma/client";

interface RecurringPlan {
  id: string;
  description: string;
  monthlyFee: number;
  frequency: RecurringFrequency;
  billingDayOfMonth: number;
  startDate: string;
  nextBillingDate: string;
  status: RecurringPlanStatus;
  customer: { id: string; name: string; phone: string; email?: string };
}

interface CustomerOption {
  id: string;
  name: string;
  phone: string;
}

export default function RecurringPage() {
  const [plans, setPlans] = useState<RecurringPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [customerId, setCustomerId] = useState("");
  const [description, setDescription] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [frequency, setFrequency] = useState<RecurringFrequency>(RecurringFrequency.MONTHLY);
  const [billingDayOfMonth, setBillingDayOfMonth] = useState(1);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/recurring");
      const data = await res.json();
      setPlans(data.plans ?? []);
    } catch {
      /* handle */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const openModal = async () => {
    setShowModal(true);
    try {
      const res = await fetch("/api/customers?limit=100");
      const data = await res.json();
      setCustomers(data.customers ?? []);
      if (data.customers?.length > 0 && !customerId) {
        setCustomerId(data.customers[0].id);
      }
    } catch {
      /* handle */
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !description || !monthlyFee || Number(monthlyFee) <= 0) {
      setFormError("Please fill all required fields with a valid fee");
      return;
    }
    setSaving(true);
    setFormError("");

    try {
      const res = await fetch("/api/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          description,
          monthlyFee: Number(monthlyFee),
          frequency,
          billingDayOfMonth: Number(billingDayOfMonth),
          startDate: new Date(startDate).toISOString(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error?.message || "Failed to create plan");
        return;
      }

      setShowModal(false);
      setDescription("");
      setMonthlyFee("");
      fetchPlans();
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const updatePlanStatus = async (id: string, status: RecurringPlanStatus) => {
    try {
      await fetch(`/api/recurring/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchPlans();
    } catch {
      /* handle */
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold">Recurring Retainers & Subscriptions</h1>
          <p className="text-sm mt-0.5 text-slate-400">
            Monthly graphic design retainers, website maintenance contracts, and digital marketing retainers
          </p>
        </div>
        <button onClick={openModal} className="btn btn-primary btn-sm flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Retainer Plan
        </button>
      </div>

      {/* Plans List */}
      <div className="glass-card overflow-hidden animate-fade-in-up">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="text-slate-400">Loading retainers…</span>
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-16">
            <RefreshCw className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium mb-1">No active recurring retainers</p>
            <p className="text-sm mb-4 text-slate-400">
              Set up monthly retainers for digital marketing clients and recurring website maintenance
            </p>
            <button onClick={openModal} className="btn btn-primary btn-sm">
              <Plus className="w-4 h-4" /> New Retainer Plan
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Service Description</th>
                  <th>Frequency</th>
                  <th>Billing Day</th>
                  <th>Fee</th>
                  <th>Next Billing</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <p className="font-semibold text-white">{p.customer.name}</p>
                      <p className="text-xs text-slate-400">{p.customer.phone}</p>
                    </td>
                    <td>
                      <p className="text-sm text-slate-200 font-medium">{p.description}</p>
                    </td>
                    <td>
                      <span className="badge badge-purple text-xs">{p.frequency}</span>
                    </td>
                    <td>
                      <span className="text-xs text-slate-300 font-mono">Day {p.billingDayOfMonth}</span>
                    </td>
                    <td>
                      <span className="font-bold text-emerald-400 text-base">
                        ₹{Number(p.monthlyFee).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs text-slate-300">
                        {new Date(p.nextBillingDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${
                        p.status === RecurringPlanStatus.ACTIVE
                          ? "badge-success"
                          : p.status === RecurringPlanStatus.PAUSED
                          ? "badge-amber"
                          : "badge-neutral"
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        {p.status === RecurringPlanStatus.ACTIVE ? (
                          <button
                            onClick={() => updatePlanStatus(p.id, RecurringPlanStatus.PAUSED)}
                            className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold"
                          >
                            Pause
                          </button>
                        ) : (
                          <button
                            onClick={() => updatePlanStatus(p.id, RecurringPlanStatus.ACTIVE)}
                            className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold"
                          >
                            Activate
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-lg overflow-hidden border border-white/10 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold">New Recurring Retainer Plan</h3>
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

              <div>
                <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-slate-300">
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
                <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-slate-300">
                  Service Package Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Social Media Design (20 Creatives + Reels)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-slate-300">
                    Retainer Fee (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="e.g. 15000"
                    value={monthlyFee}
                    onChange={(e) => setMonthlyFee(e.target.value)}
                    className="form-input font-bold text-emerald-400 text-base"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-slate-300">
                    Billing Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
                    className="form-input"
                  >
                    <option value={RecurringFrequency.MONTHLY}>Monthly</option>
                    <option value={RecurringFrequency.QUARTERLY}>Quarterly (Every 3 months)</option>
                    <option value={RecurringFrequency.HALF_YEARLY}>Half-Yearly (Every 6 months)</option>
                    <option value={RecurringFrequency.YEARLY}>Yearly Contract</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-slate-300">
                    Billing Day (1–28)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={billingDayOfMonth}
                    onChange={(e) => setBillingDayOfMonth(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-slate-300">
                    Contract Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
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
                  Save Retainer Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
