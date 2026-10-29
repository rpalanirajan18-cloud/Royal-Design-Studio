"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Package,
  Plus,
  Search,
  Loader2,
  X,
  Sparkles,
  Layers,
  Gift,
  Printer,
  Globe,
  TrendingUp,
  Pencil,
  Tag,
  Percent,
} from "lucide-react";
import { ProductCategory } from "@prisma/client";

interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  category: ProductCategory;
  unit: string;
  sellingPrice: number;
  wholesalePrice?: number;
  costPrice?: number;
  taxRate: number;
  isActive: boolean;
}

const CATEGORY_CONFIG: Record<
  ProductCategory,
  { label: string; icon: React.ComponentType<{ className?: string }>; badge: string }
> = {
  GRAPHIC_DESIGN_BRANDING: { label: "Design & Branding", icon: Sparkles, badge: "badge-blue" },
  PRINTING: { label: "Physical Printing", icon: Printer, badge: "badge-purple" },
  GIFTING_CUSTOMIZED: { label: "Custom Gifting", icon: Gift, badge: "badge-amber" },
  DIGITAL_MARKETING: { label: "Digital Marketing", icon: TrendingUp, badge: "badge-blue" },
  WEBSITE_DEVELOPMENT: { label: "Web Dev & IT", icon: Globe, badge: "badge-purple" },
  OTHER: { label: "Other", icon: Layers, badge: "badge-neutral" },
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("ALL");

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<{
    name: string;
    sku: string;
    description: string;
    category: ProductCategory;
    unit: string;
    sellingPrice: string;
    wholesalePrice: string;
    costPrice: string;
    taxRate: string;
  }>({
    name: "",
    sku: "",
    description: "",
    category: ProductCategory.GRAPHIC_DESIGN_BRANDING,
    unit: "pcs",
    sellingPrice: "",
    wholesalePrice: "",
    costPrice: "",
    taxRate: "0",
  });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(search ? { search } : {}),
        ...(activeCategory !== "ALL" ? { category: activeCategory } : {}),
      });
      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      setProducts(data.products ?? []);
    } catch {
      /* handle */
    } finally {
      setLoading(false);
    }
  }, [search, activeCategory]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchProducts();
    }, 250);
    return () => clearTimeout(t);
  }, [fetchProducts]);

  const openAddModal = () => {
    setEditingProduct(null);
    setForm({
      name: "",
      sku: "",
      description: "",
      category: ProductCategory.GRAPHIC_DESIGN_BRANDING,
      unit: "pcs",
      sellingPrice: "",
      wholesalePrice: "",
      costPrice: "",
      taxRate: "0",
    });
    setFormError("");
    setShowModal(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setForm({
      name: p.name,
      sku: p.sku || "",
      description: p.description || "",
      category: p.category,
      unit: p.unit || "pcs",
      sellingPrice: String(p.sellingPrice ?? ""),
      wholesalePrice: p.wholesalePrice != null ? String(p.wholesalePrice) : "",
      costPrice: p.costPrice != null ? String(p.costPrice) : "",
      taxRate: String(p.taxRate ?? "0"),
    });
    setFormError("");
    setShowModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.sellingPrice) {
      setFormError("Name and Retail Selling Price are required");
      return;
    }
    setSaving(true);
    setFormError("");

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : "/api/products";
      const method = editingProduct ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          sellingPrice: Number(form.sellingPrice),
          wholesalePrice: form.wholesalePrice ? Number(form.wholesalePrice) : undefined,
          costPrice: form.costPrice ? Number(form.costPrice) : undefined,
          taxRate: Number(form.taxRate || 0),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error?.name?._errors?.[0] || data.error || "Failed to save product");
        return;
      }
      setShowModal(false);
      setEditingProduct(null);
      fetchProducts();
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Profit Margin calculation helpers for modal
  const retailPriceNum = parseFloat(form.sellingPrice) || 0;
  const wholesalePriceNum = parseFloat(form.wholesalePrice) || 0;
  const costPriceNum = parseFloat(form.costPrice) || 0;
  const retailMargin = costPriceNum > 0 && retailPriceNum > costPriceNum
    ? Math.round(((retailPriceNum - costPriceNum) / retailPriceNum) * 100)
    : null;
  const wholesaleMargin = costPriceNum > 0 && wholesalePriceNum > costPriceNum
    ? Math.round(((wholesalePriceNum - costPriceNum) / wholesalePriceNum) * 100)
    : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Products & Services Catalog</h1>
          <p className="text-sm mt-0.5 text-slate-500 dark:text-slate-400">
            Design services, printing products, Xerox, walk-in services, with Retail & Wholesale pricing
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="btn btn-primary btn-sm flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between glass-card p-4 animate-fade-in-up">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="search"
            placeholder="Search items by name, SKU, description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input !pl-9"
          />
        </div>

        {/* Category tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "ALL", label: "All Items" },
            { id: ProductCategory.PRINTING, label: "Printing & Xerox" },
            { id: ProductCategory.GRAPHIC_DESIGN_BRANDING, label: "Design" },
            { id: ProductCategory.GIFTING_CUSTOMIZED, label: "Gifting" },
            { id: ProductCategory.DIGITAL_MARKETING, label: "Marketing" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === tab.id
                  ? "bg-[#27348B] text-white shadow-sm"
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
            <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-cyan-400" />
            <span className="text-slate-500 dark:text-slate-400 text-sm">Loading catalog…</span>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="font-bold text-slate-900 dark:text-white mb-1">No catalog items found</p>
            <p className="text-sm mb-4 text-slate-500 dark:text-slate-400">
              Add graphic design packages, printing items, Xerox, or gifting products
            </p>
            <button onClick={openAddModal} className="btn btn-primary btn-sm">
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU Code</th>
                  <th>Name & Details</th>
                  <th>Category</th>
                  <th>Retail Selling Price</th>
                  <th>Wholesale Price</th>
                  <th>Cost Price</th>
                  <th>Unit</th>
                  <th>GST Rate</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const catConf = CATEGORY_CONFIG[p.category] ?? CATEGORY_CONFIG.OTHER;
                  const Icon = catConf.icon;
                  return (
                    <tr key={p.id}>
                      <td>
                        <span className="font-mono text-xs px-2 py-1 rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-semibold">
                          {p.sku}
                        </span>
                      </td>
                      <td>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{p.name}</p>
                          {p.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm truncate mt-0.5">
                              {p.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                          <Icon className="w-3.5 h-3.5 text-[#27348B] dark:text-cyan-400" />
                          <span>{catConf.label}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-slate-900 dark:text-white text-base">
                            ₹{Number(p.sellingPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300">
                            Retail
                          </span>
                        </div>
                      </td>
                      <td>
                        {p.wholesalePrice != null && Number(p.wholesalePrice) > 0 ? (
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base">
                              ₹{Number(p.wholesalePrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                              Wholesale
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Not set</span>
                        )}
                      </td>
                      <td>
                        {p.costPrice != null && Number(p.costPrice) > 0 ? (
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            ₹{Number(p.costPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td>
                        <span className="text-xs text-slate-600 dark:text-slate-400 uppercase font-medium">{p.unit}</span>
                      </td>
                      <td>
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{Number(p.taxRate)}%</span>
                      </td>
                      <td>
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                          title="Edit Pricing & Item"
                        >
                          <Pencil className="w-4 h-4" />
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

      {/* Add / Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#0d1527] w-full max-w-lg overflow-hidden border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[#27348B] dark:text-blue-400" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingProduct ? "Edit Catalog Item & Pricing" : "New Catalog Item"}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 text-sm bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 rounded-lg">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. B&W Xerox, Color Printout, Logo Design"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Category *
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as ProductCategory })}
                    className="form-input"
                  >
                    <option value={ProductCategory.PRINTING}>Physical Printing & Xerox</option>
                    <option value={ProductCategory.GRAPHIC_DESIGN_BRANDING}>Graphic Design & Branding</option>
                    <option value={ProductCategory.GIFTING_CUSTOMIZED}>Custom Gifting Products</option>
                    <option value={ProductCategory.DIGITAL_MARKETING}>Digital Marketing & Retainers</option>
                    <option value={ProductCategory.WEBSITE_DEVELOPMENT}>Website Development</option>
                    <option value={ProductCategory.OTHER}>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    SKU Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Auto-generated if empty"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
                    className="form-input font-mono uppercase"
                  />
                </div>
              </div>

              {/* Pricing Grid: Retail Selling Price, Wholesale Price, Cost Price, Unit */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 space-y-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#27348B] dark:text-blue-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Dual Pricing Setup (Retail & Wholesale)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                      Retail Selling Price (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                      value={form.sellingPrice}
                      onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                      className="form-input font-bold text-blue-700 dark:text-blue-400"
                    />
                    <p className="text-[11px] text-slate-500 mt-0.5">Charged to walk-in & retail customers</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                      Wholesale Price (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={form.wholesalePrice}
                      onChange={(e) => setForm({ ...form, wholesalePrice: e.target.value })}
                      className="form-input font-bold text-emerald-700 dark:text-emerald-400"
                    />
                    <p className="text-[11px] text-slate-500 mt-0.5">For bulk orders, resellers & agencies</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 dark:border-white/5">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-400">
                      Purchase / Cost Price (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={form.costPrice}
                      onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                      className="form-input text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-400">
                      Unit of Measure
                    </label>
                    <input
                      type="text"
                      placeholder="pcs, page, sqft, job"
                      value={form.unit}
                      onChange={(e) => setForm({ ...form, unit: e.target.value })}
                      className="form-input text-sm"
                    />
                  </div>
                </div>

                {/* Profit Margin Info Box */}
                {(retailMargin !== null || wholesaleMargin !== null) && (
                  <div className="flex items-center gap-4 text-xs font-medium pt-2 text-slate-600 dark:text-slate-300 border-t border-slate-200/60 dark:border-white/5">
                    <div className="flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-blue-600" />
                      <span>Retail Margin: <strong className="text-blue-600 dark:text-blue-400">{retailMargin}%</strong></span>
                    </div>
                    {wholesaleMargin !== null && (
                      <div className="flex items-center gap-1.5">
                        <Percent className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Wholesale Margin: <strong className="text-emerald-600 dark:text-emerald-400">{wholesaleMargin}%</strong></span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Description / Deliverables
                </label>
                <textarea
                  rows={2}
                  placeholder="Specify details, dimensions, revision limits, or specifications"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="form-input resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
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
                  {editingProduct ? "Update Item" : "Save Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
