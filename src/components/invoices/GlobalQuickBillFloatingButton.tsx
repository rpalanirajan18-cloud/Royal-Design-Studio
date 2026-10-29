"use client";

import { useState, useEffect } from "react";
import {
  Zap,
  X,
  Check,
  FileDown,
  Plus,
  Printer,
  Sparkles,
  Layers,
  Loader2,
  Trash2,
} from "lucide-react";

interface PresetItem {
  id: string;
  name: string;
  price: number;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
}

const QUICK_PRESET_ITEMS: PresetItem[] = [
  { id: "xrx", name: "A4 Xerox B&W", price: 2, unit: "page", icon: Printer },
  { id: "xrx_clr", name: "A4 Color Xerox", price: 10, unit: "page", icon: Printer },
  { id: "prt_bw", name: "B&W Printout", price: 5, unit: "page", icon: Printer },
  { id: "prt_clr", name: "Color Printout", price: 15, unit: "page", icon: Printer },
  { id: "lam", name: "A4 Lamination", price: 20, unit: "sheet", icon: Layers },
  { id: "dsg_sml", name: "Small Design Edit", price: 50, unit: "job", icon: Sparkles },
];

export default function GlobalQuickBillFloatingButton() {
  const [enabled, setEnabled] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({ xrx: 1 });
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI">("CASH");
  const [walkInTag, setWalkInTag] = useState("");
  const [customItem, setCustomItem] = useState({ name: "", price: "", qty: "1" });
  const [customList, setCustomList] = useState<Array<{ name: string; price: number; qty: number }>>([]);
  const [createdInvoice, setCreatedInvoice] = useState<{ id: string; number: string; total: number } | null>(null);

  // Sync state with localStorage & custom window events
  useEffect(() => {
    const readStorage = () => {
      try {
        const val = localStorage.getItem("rds_quick_bill_enabled");
        if (val !== null) {
          setEnabled(val !== "false");
        }
      } catch {}
    };

    readStorage();

    const handleToggle = () => readStorage();
    window.addEventListener("rds_quick_bill_toggle", handleToggle);
    window.addEventListener("storage", handleToggle);

    return () => {
      window.removeEventListener("rds_quick_bill_toggle", handleToggle);
      window.removeEventListener("storage", handleToggle);
    };
  }, []);

  if (!enabled) return null;

  // Calculate totals
  const presetTotal = QUICK_PRESET_ITEMS.reduce((sum, item) => {
    const qty = cart[item.id] || 0;
    return sum + qty * item.price;
  }, 0);

  const customTotal = customList.reduce((sum, item) => {
    return sum + item.qty * item.price;
  }, 0);

  const grandTotal = presetTotal + customTotal;

  const handleAddCustom = () => {
    if (!customItem.name || !customItem.price) return;
    const priceNum = parseFloat(customItem.price) || 0;
    const qtyNum = parseInt(customItem.qty, 10) || 1;
    if (priceNum <= 0 || qtyNum <= 0) return;

    setCustomList([...customList, { name: customItem.name, price: priceNum, qty: qtyNum }]);
    setCustomItem({ name: "", price: "", qty: "1" });
  };

  const handleCreateQuickBill = async () => {
    if (grandTotal <= 0) return;
    setSaving(true);
    try {
      const lineItems: Array<{
        description: string;
        quantity: number;
        unit: string;
        unitPrice: number;
        lineTotal: number;
      }> = [];

      QUICK_PRESET_ITEMS.forEach((p) => {
        const q = cart[p.id] || 0;
        if (q > 0) {
          lineItems.push({
            description: `${p.name} (Counter Sale)`,
            quantity: q,
            unit: p.unit,
            unitPrice: p.price,
            lineTotal: q * p.price,
          });
        }
      });

      customList.forEach((c) => {
        lineItems.push({
          description: `${c.name} (Counter Sale)`,
          quantity: c.qty,
          unit: "item",
          unitPrice: c.price,
          lineTotal: c.qty * c.price,
        });
      });

      const today = new Date().toISOString().split("T")[0];

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isWalkIn: true,
          walkInName: walkInTag.trim() ? walkInTag.trim() : "Counter Walk-in Customer",
          issueDate: today,
          dueDate: today,
          items: lineItems,
          discountAmount: 0,
          deliveryCharge: 0,
          advancePaid: grandTotal,
          status: "PAID",
          paymentMethod: paymentMethod,
          notes: `Quick counter sale paid via ${paymentMethod}`,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save quick bill");
      }

      const data = await res.json();
      setCreatedInvoice({
        id: data.id,
        number: data.number,
        total: grandTotal,
      });
    } catch (err: unknown) {
      alert((err as Error).message || "Error generating quick bill");
    } finally {
      setSaving(false);
    }
  };

  const resetModal = () => {
    setCreatedInvoice(null);
    setCart({ xrx: 1 });
    setCustomList([]);
    setWalkInTag("");
    setPaymentMethod("CASH");
  };

  return (
    <>
      {/* Floating Action Motion Button (FAB) */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 animate-fade-in flex items-center">
        <button
          onClick={() => {
            resetModal();
            setShowModal(true);
          }}
          className="quick-motion-btn group flex items-center gap-2.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full text-white font-extrabold text-xs shadow-2xl cursor-pointer border border-white/25 hover:shadow-amber-500/50 transition-transform active:scale-95"
          title="Click to launch Quick Counter Bill (Xerox, Printout, Design)"
        >
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/20 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 fill-white" />
          </div>
          <span className="tracking-wide">⚡ Quick Bill</span>
          <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
        </button>
      </div>

      {/* Quick Counter Bill Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#0d1527] w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white shadow-sm">
                  <Zap className="w-5 h-5 fill-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Quick Counter Bill (Xerox & Small Bills)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No customer registration required • Instant cash / UPI billing
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createdInvoice ? (
              /* Success Screen */
              <div className="p-8 text-center space-y-4">
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white">Bill Completed Successfully!</h4>
                  <p className="text-sm text-slate-500 mt-1 font-mono font-bold">
                    Bill #{createdInvoice.number} • Paid ₹{Number(createdInvoice.total).toFixed(2)}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-4">
                  <a
                    href={`/api/invoices/${createdInvoice.id}/pdf`}
                    download={`Bill-${createdInvoice.number}.pdf`}
                    className="btn btn-primary btn-sm flex items-center gap-2"
                  >
                    <FileDown className="w-4 h-4" />
                    Download PDF Receipt
                  </a>
                  <button
                    onClick={() => resetModal()}
                    className="btn btn-secondary btn-sm flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Next Quick Bill
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="btn btn-secondary btn-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              /* Billing Form */
              <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                {/* Preset Item Cards */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2.5">
                    Select Quick Services (Xerox, Printout, Design)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {QUICK_PRESET_ITEMS.map((item) => {
                      const Icon = item.icon;
                      const currentQty = cart[item.id] || 0;
                      const price = item.price;

                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-xl border transition-all ${
                            currentQty > 0
                              ? "bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30 shadow-sm"
                              : "bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/10 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <Icon className={`w-4 h-4 ${currentQty > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`} />
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                              ₹{price}/{item.unit}
                            </span>
                          </div>
                          <p className="font-semibold text-xs text-slate-900 dark:text-white mt-1.5 line-clamp-1">
                            {item.name}
                          </p>

                          {/* Stepper buttons */}
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/50 dark:border-white/5">
                            <button
                              type="button"
                              onClick={() => {
                                const newQty = Math.max(0, currentQty - 1);
                                setCart({ ...cart, [item.id]: newQty });
                              }}
                              className="w-6 h-6 rounded flex items-center justify-center bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-600 dark:text-slate-300 font-bold text-xs cursor-pointer"
                            >
                              -
                            </button>
                            <span className="font-bold text-xs text-slate-900 dark:text-white font-mono">
                              {currentQty}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setCart({ ...cart, [item.id]: currentQty + 1 });
                              }}
                              className="w-6 h-6 rounded flex items-center justify-center bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Custom / Other Quick Counter Item */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Add Custom Quick Item (Binding, Sticker, Stamp, etc.)
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Item name (e.g. Spiral Binding)"
                      value={customItem.name}
                      onChange={(e) => setCustomItem({ ...customItem, name: e.target.value })}
                      className="form-input flex-1 text-xs py-1.5"
                    />
                    <input
                      type="number"
                      placeholder="₹ Price"
                      value={customItem.price}
                      onChange={(e) => setCustomItem({ ...customItem, price: e.target.value })}
                      className="form-input w-20 text-xs py-1.5 font-mono"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={customItem.qty}
                      onChange={(e) => setCustomItem({ ...customItem, qty: e.target.value })}
                      className="form-input w-16 text-xs py-1.5 font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustom}
                      className="btn btn-secondary btn-sm py-1.5 px-3 text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add
                    </button>
                  </div>

                  {customList.length > 0 && (
                    <div className="mt-2.5 space-y-1">
                      {customList.map((c, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs py-1 px-2 rounded bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5"
                        >
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {c.name} × {c.qty}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              ₹{(c.price * c.qty).toFixed(2)}
                            </span>
                            <button
                              type="button"
                              onClick={() => setCustomList(customList.filter((_, idx) => idx !== i))}
                              className="text-rose-500 hover:text-rose-600 p-0.5 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Optional Customer Note / Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Optional Walk-in Note / Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh College Project (optional)"
                      value={walkInTag}
                      onChange={(e) => setWalkInTag(e.target.value)}
                      className="form-input text-xs py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Instant Payment Mode
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("CASH")}
                        className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          paymentMethod === "CASH"
                            ? "bg-emerald-500 text-white border-emerald-600 shadow-sm"
                            : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        💵 Cash
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("UPI")}
                        className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          paymentMethod === "UPI"
                            ? "bg-blue-600 text-white border-blue-700 shadow-sm"
                            : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        📱 UPI (GPay/PhonePe)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bill Summary & Action */}
                <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Total Amount</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                      ₹{grandTotal.toFixed(2)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="btn btn-secondary btn-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={saving || grandTotal <= 0}
                      onClick={handleCreateQuickBill}
                      className="btn btn-primary btn-sm px-5 flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md disabled:opacity-50 cursor-pointer"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4 fill-white" />
                      )}
                      <span>Complete & Print Bill (₹{grandTotal})</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
