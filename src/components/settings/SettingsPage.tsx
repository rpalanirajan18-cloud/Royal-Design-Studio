"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Building,
  Save,
  Loader2,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
} from "lucide-react";

interface CompanySettings {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  whatsapp?: string;
  email: string;
  website?: string;
  isGstRegistered: boolean;
  gstin?: string;
  invoicePrefix: string;
  invoiceTypeCode: string;
  quotationTypeCode: string;
  proformaTypeCode: string;
  receiptTypeCode: string;
  defaultInvoiceTerms?: string;
  defaultQuotationTerms?: string;
  paymentInstructions?: string;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<CompanySettings>({
    name: "Royal Design Studio",
    addressLine1: "2/33-20, Sandhanakumarpatti",
    addressLine2: "Mayalappapuram Road, Avudayanoor",
    city: "Avudayanoor",
    state: "Tamil Nadu",
    pincode: "627 808",
    phone: "+91 93859 31697",
    whatsapp: "+91 93859 31697",
    email: "royaldesignstudioofficial@gmail.com",
    website: "",
    isGstRegistered: false,
    gstin: "",
    invoicePrefix: "RDS",
    invoiceTypeCode: "INV",
    quotationTypeCode: "QTN",
    proformaTypeCode: "PI",
    receiptTypeCode: "REC",
    defaultInvoiceTerms: "Payment is due within 15 days. GST exempt under small-business threshold.",
    defaultQuotationTerms: "This quotation is valid for 30 days from the date of issue.",
    paymentInstructions: "Pay via UPI (+91 93859 31697 / royaldesignstudioofficial@okaxis), Cash, or Bank Transfer.",
  });

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings");
        const data = await res.json();
        if (data.settings) {
          setForm({
            ...data.settings,
            whatsapp: data.settings.whatsapp ?? data.settings.phone,
          });
        }
      } catch {
        /* fallback to defaults */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message || "Failed to update settings");
        return;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Studio Profile & Settings</h1>
          <p className="text-sm mt-0.5 text-slate-600 dark:text-slate-400">
            Configure business contact details, GST registration, numbering prefix, and invoice terms
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 glass-card">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          <span className="text-slate-500 dark:text-slate-400">Loading settings…</span>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6 animate-fade-in-up">
          {error && (
            <div className="p-3 text-sm bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 text-sm bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Settings updated successfully!
            </div>
          )}

          {/* Business Profile & Logo */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
              <Building className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Business Identification</h3>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <div className="w-12 h-12 rounded-xl bg-white dark:bg-white/10 p-1.5 flex items-center justify-center border border-slate-200 dark:border-white/10">
                <img src="/logo.png" alt="Royal Design Studio" className="brand-logo-img h-8 w-auto object-contain dark:hidden" />
                <img src="/logo-white.png" alt="Royal Design Studio" className="brand-logo-img h-8 w-auto object-contain hidden dark:block" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white text-base">Royal Design Studio</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Branding, Digital Marketing, Customized Gifting & Printing</p>
                <p className="text-xs text-[#27348B] dark:text-blue-400 font-semibold mt-0.5">Motto: Ideas Into Impact</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Official Email *
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="form-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Phone / WhatsApp *
                </label>
                <input
                  type="text"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value, whatsapp: e.target.value })}
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Website
                </label>
                <input
                  type="text"
                  placeholder="e.g. https://royaldesignstudio.in"
                  value={form.website ?? ""}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  className="form-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Address Line 1
                </label>
                <input
                  type="text"
                  value={form.addressLine1}
                  onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Address Line 2 (Road / Area)
                </label>
                <input
                  type="text"
                  value={form.addressLine2 ?? ""}
                  onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
                  className="form-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  City
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  State
                </label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Pincode
                </label>
                <input
                  type="text"
                  value={form.pincode}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                  className="form-input"
                />
              </div>
            </div>
          </div>

          {/* GST Configuration */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">GST Registration Status</h3>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Is Royal Design Studio GST Registered?</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {form.isGstRegistered
                    ? "Invoices will calculate standard GST components"
                    : "Currently unregistered small business. Invoices state: GST Exempt under threshold."}
                </p>
              </div>
              <input
                type="checkbox"
                checked={form.isGstRegistered}
                onChange={(e) => setForm({ ...form, isGstRegistered: e.target.checked })}
                className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
              />
            </div>

            {form.isGstRegistered && (
              <div>
                <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Studio GSTIN
                </label>
                <input
                  type="text"
                  placeholder="e.g. 33AAAAA0000A1Z5"
                  value={form.gstin ?? ""}
                  onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                  className="form-input font-mono"
                />
              </div>
            )}
          </div>

          {/* Numbering Prefix Configuration */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
              <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Document Numbering & Codes</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Prefix
                </label>
                <input
                  type="text"
                  value={form.invoicePrefix}
                  onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value.toUpperCase() })}
                  className="form-input font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Invoice Code
                </label>
                <input
                  type="text"
                  value={form.invoiceTypeCode}
                  onChange={(e) => setForm({ ...form, invoiceTypeCode: e.target.value.toUpperCase() })}
                  className="form-input font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Quotation Code
                </label>
                <input
                  type="text"
                  value={form.quotationTypeCode}
                  onChange={(e) => setForm({ ...form, quotationTypeCode: e.target.value.toUpperCase() })}
                  className="form-input font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Proforma Code
                </label>
                <input
                  type="text"
                  value={form.proformaTypeCode}
                  onChange={(e) => setForm({ ...form, proformaTypeCode: e.target.value.toUpperCase() })}
                  className="form-input font-mono"
                />
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Sample document format: <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{form.invoicePrefix}/{form.invoiceTypeCode}/2026-27/0001</span>
            </p>
          </div>

          {/* Instructions and Terms */}
          <div className="glass-card p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Payment Instructions (Included on Invoices & PDFs)
              </label>
              <textarea
                rows={2}
                value={form.paymentInstructions ?? ""}
                onChange={(e) => setForm({ ...form, paymentInstructions: e.target.value })}
                className="form-input resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Default Terms & Conditions
              </label>
              <textarea
                rows={2}
                value={form.defaultInvoiceTerms ?? ""}
                onChange={(e) => setForm({ ...form, defaultInvoiceTerms: e.target.value })}
                className="form-input resize-none"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary flex items-center gap-2 px-6"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save All Settings
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
