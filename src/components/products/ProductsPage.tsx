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
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<{
    name: string;
    sku: string;
    description: string;
    category: ProductCategory;
    unit: string;
    sellingPrice: string;
    costPrice: string;
    taxRate: string;
  }>({
    name: "",
    sku: "",
    description: "",
    category: ProductCategory.GRAPHIC_DESIGN_BRANDING,
    unit: "pcs",
    sellingPrice: "",
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

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.sellingPrice) {
      setFormError("Name and Selling Price are required");
      return;
    }
    setSaving(true);
    setFormError("");

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          sellingPrice: Number(form.sellingPrice),
          costPrice: form.costPrice ? Number(form.costPrice) : undefined,
          taxRate: Number(form.taxRate || 0),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error?.name?._errors?.[0] || data.error || "Failed to create product");
        return;
      }
      setShowModal(false);
      setForm({
        name: "",
        sku: "",
        description: "",
        category: ProductCategory.GRAPHIC_DESIGN_BRANDING,
        unit: "pcs",
        sellingPrice: "",
        costPrice: "",
        taxRate: "0",
      });
      fetchProducts();
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
          <h1 className="text-2xl font-bold">Products & Services Catalog</h1>
          <p className="text-sm mt-0.5" style={{ color: "hsl(215 20% 55%)" }}>
            Design services, printing products, customized gifting, and digital packages
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary btn-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between glass-card p-4 animate-fade-in-up">
        <div className="relative max-w-md w-full">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "hsl(215 15% 45%)" }}
          />
          <input
            type="search"
            placeholder="Search items by name, SKU, description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: "38px" }}
          />
        </div>

        {/* Category tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "ALL", label: "All Items" },
            { id: ProductCategory.GRAPHIC_DESIGN_BRANDING, label: "Design" },
            { id: ProductCategory.PRINTING, label: "Printing" },
            { id: ProductCategory.GIFTING_CUSTOMIZED, label: "Gifting" },
            { id: ProductCategory.DIGITAL_MARKETING, label: "Marketing" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === tab.id
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
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
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "hsl(217 91% 60%)" }} />
            <span style={{ color: "hsl(215 20% 55%)" }}>Loading catalog…</span>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium mb-1">No catalog items found</p>
            <p className="text-sm mb-4" style={{ color: "hsl(215 15% 45%)" }}>
              Add graphic design packages, printing items, or gifting products
            </p>
            <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm">
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
                  <th>Selling Price</th>
                  <th>Unit</th>
                  <th>Tax</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const catConf = CATEGORY_CONFIG[p.category] ?? CATEGORY_CONFIG.OTHER;
                  const Icon = catConf.icon;
                  return (
                    <tr key={p.id}>
                      <td>
                        <span className="font-mono text-xs px-2 py-1 rounded bg-white/5 border border-white/10 text-slate-300">
                          {p.sku}
                        </span>
                      </td>
                      <td>
                        <div>
                          <p className="font-semibold text-white">{p.name}</p>
                          {p.description && (
                            <p className="text-xs text-slate-400 max-w-sm truncate mt-0.5">
                              {p.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 text-xs text-slate-300">
                          <Icon className="w-3.5 h-3.5 text-blue-400" />
                          <span>{catConf.label}</span>
                        </div>
                      </td>
                      <td>
                        <span className="font-bold text-white text-base">
                          ₹{Number(p.sellingPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs text-slate-400 uppercase">{p.unit}</span>
                      </td>
                      <td>
                        <span className="text-xs text-slate-400">{Number(p.taxRate)}%</span>
                      </td>
                      <td>
                        <span className={`badge ${p.isActive ? "badge-success" : "badge-neutral"}`}>
                          {p.isActive ? "Active" : "Archived"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-lg overflow-hidden border border-white/10 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold">New Catalog Item</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 text-sm bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-lg">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-slate-300">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Logo Design & Brand Identity Package"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-slate-300">
                    Category *
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as ProductCategory })}
                    className="form-input"
                  >
                    <option value={ProductCategory.GRAPHIC_DESIGN_BRANDING}>Graphic Design & Branding</option>
                    <option value={ProductCategory.PRINTING}>Physical Printing (Flex, Cards, etc.)</option>
                    <option value={ProductCategory.GIFTING_CUSTOMIZED}>Custom Gifting Products</option>
                    <option value={ProductCategory.DIGITAL_MARKETING}>Digital Marketing & Retainers</option>
                    <option value={ProductCategory.WEBSITE_DEVELOPMENT}>Website Development</option>
                    <option value={ProductCategory.OTHER}>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-slate-300">
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

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-slate-300">
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={form.sellingPrice}
                    onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                    className="form-input font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-slate-300">
                    Cost Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={form.costPrice}
                    onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-slate-300">
                    Unit
                  </label>
                  <input
                    type="text"
                    placeholder="pcs, sqft, hr"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-slate-300">
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
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
