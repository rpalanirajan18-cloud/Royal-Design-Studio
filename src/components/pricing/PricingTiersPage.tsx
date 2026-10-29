"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  SlidersHorizontal,
  Tag,
  Building,
  Users,
  Search,
  Check,
  Loader2,
  Package,
  Sparkles,
  Printer,
  Layers,
  Save,
  Plus,
  Shirt,
  Image as ImageIcon,
  CreditCard,
  Coffee,
  X,
  Percent,
  FileText,
  Upload,
  Download,
  Camera,
  ExternalLink,
  FolderPlus,
} from "lucide-react";
import { ProductCategory } from "@prisma/client";

interface Product {
  id: string;
  name: string;
  sku: string;
  category: ProductCategory;
  customCategory?: string;
  subCategory?: string;
  imageUrl?: string;
  pdfUrl?: string;
  unit: string;
  sellingPrice: number;
  wholesalePrice?: number;
  costPrice?: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  contactPerson?: string;
  pricingTier?: "RETAIL" | "WHOLESALE";
}

interface CustomCategoryItem {
  id: string;
  name: string;
  icon?: string;
  description?: string;
}

interface RateCardDoc {
  id: string;
  name: string;
  url: string;
  size: number;
  uploadedAt: string;
  isOfficial?: boolean;
}

// Icon helper mapping
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Shirt,
  ImageIcon,
  CreditCard,
  Coffee,
  Building,
  Printer,
  Sparkles,
  Tag,
  Layers,
  Package,
};

export default function PricingTiersPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<CustomCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"matrix" | "customers" | "rules">("matrix");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showImageUploadModal, setShowImageUploadModal] = useState<Product | null>(null);

  // Rate Card Docs
  const [rateCardDocs, setRateCardDocs] = useState<RateCardDoc[]>([]);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // New Category State
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("Tag");
  const [savingCategory, setSavingCategory] = useState(false);

  // Add Material Rate Form State
  const [addingSubmitting, setAddingSubmitting] = useState(false);
  const [newCat, setNewCat] = useState("TSHIRT");
  const [newSubCat, setNewSubCat] = useState("100% Cotton Bio-Wash 180 GSM");
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("pcs");
  const [newCost, setNewCost] = useState("");
  const [newRetail, setNewRetail] = useState("");
  const [newWholesale, setNewWholesale] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");

  // Editable prices map
  const [editPrices, setEditPrices] = useState<
    Record<string, { retail: string; wholesale: string; cost: string }>
  >({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, custRes, catRes, docRes] = await Promise.all([
        fetch("/api/products?active=true"),
        fetch("/api/customers?limit=100"),
        fetch("/api/categories"),
        fetch("/api/pricing-tiers/documents"),
      ]);
      const prodData = await prodRes.json();
      const custData = await custRes.json();
      const catData = await catRes.json();
      const docData = await docRes.json();

      const prods: Product[] = prodData.products ?? [];
      const custs: Customer[] = custData.customers ?? [];
      const cats: CustomCategoryItem[] = catData.categories ?? [];
      const docs: RateCardDoc[] = docData.documents ?? [];

      setProducts(prods);
      setCustomers(custs);
      setCategories(cats);
      setRateCardDocs(docs);

      const initialMap: Record<string, { retail: string; wholesale: string; cost: string }> = {};
      prods.forEach((p) => {
        initialMap[p.id] = {
          retail: String(p.sellingPrice ?? ""),
          wholesale: p.wholesalePrice != null ? String(p.wholesalePrice) : "",
          cost: p.costPrice != null ? String(p.costPrice) : "",
        };
      });
      setEditPrices(initialMap);
    } catch {
      /* handle */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3500);
  };

  // Helper to determine category id of a product
  const getProductCategory = useCallback((p: Product): string => {
    if (p.customCategory) return p.customCategory;
    const text = `${p.name} ${p.subCategory ?? ""} ${p.sku}`.toUpperCase();
    if (
      text.includes("TSHIRT") ||
      text.includes("T-SHIRT") ||
      text.includes("COTTON") ||
      text.includes("POLO") ||
      text.includes("DRI-FIT") ||
      text.includes("OVERSIZED") ||
      text.includes("HOODIE")
    ) {
      return "TSHIRT";
    }
    if (
      text.includes("FLEX") ||
      text.includes("BANNER") ||
      text.includes("FRONTLIT") ||
      text.includes("BACKLIT") ||
      text.includes("ONE-WAY") ||
      (text.includes("VINYL") && !text.includes("SUNBOARD"))
    ) {
      return "FLEX";
    }
    if (
      text.includes("VISITING") ||
      text.includes("CARD") ||
      text.includes("SPOT UV") ||
      text.includes("VELVET") ||
      text.includes("ART CARD")
    ) {
      return "VISITING_CARD";
    }
    if (
      text.includes("MUG") ||
      text.includes("CERAMIC") ||
      text.includes("SIPPER") ||
      text.includes("BOTTLE") ||
      text.includes("GLASS")
    ) {
      return "MUG_GIFT";
    }
    if (
      text.includes("SUNBOARD") ||
      text.includes("ACRYLIC") ||
      text.includes("ACP") ||
      text.includes("SIGN") ||
      text.includes("BOARD")
    ) {
      return "SIGNAGE";
    }
    if (
      text.includes("XRX") ||
      text.includes("XEROX") ||
      text.includes("PHOTOCOPY") ||
      text.includes("PRINTOUT") ||
      text.includes("LAMINATION") ||
      text.includes("PAPER")
    ) {
      return "PAPER_PRINT";
    }
    if (
      text.includes("LOGO") ||
      text.includes("DESIGN") ||
      text.includes("ARTWORK") ||
      text.includes("BRANDING")
    ) {
      return "DESIGN";
    }
    return "ALL";
  }, []);

  // Category item counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: products.length };
    products.forEach((p) => {
      const cat = getProductCategory(p);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [products, getProductCategory]);

  // Available sub-categories for currently selected category
  const availableSubCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      const cat = getProductCategory(p);
      if (selectedCategory === "ALL" || cat === selectedCategory) {
        if (p.subCategory) set.add(p.subCategory);
      }
    });
    return Array.from(set);
  }, [products, selectedCategory, getProductCategory]);

  // Filtered products based on search, selectedCategory, and selectedSubCategory
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const cat = getProductCategory(p);
      if (selectedCategory !== "ALL" && cat !== selectedCategory) {
        return false;
      }
      if (selectedSubCategory !== "ALL" && p.subCategory !== selectedSubCategory) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesSku = p.sku.toLowerCase().includes(q);
        const matchesSub = (p.subCategory || "").toLowerCase().includes(q);
        if (!matchesName && !matchesSku && !matchesSub) return false;
      }
      return true;
    });
  }, [products, selectedCategory, selectedSubCategory, search, getProductCategory]);

  // Save new category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setSavingCategory(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCatName.trim(),
          icon: newCatIcon,
        }),
      });
      if (!res.ok) throw new Error("Failed to create category");
      const data = await res.json();
      setCategories((prev) => [...prev, data.category]);
      setSelectedCategory(data.category.id);
      setShowAddCategoryModal(false);
      setNewCatName("");
      showNotification(`Category "${data.category.name}" created!`);
    } catch {
      alert("Error adding category");
    } finally {
      setSavingCategory(false);
    }
  };

  // Inline Price Update
  const handleSavePrice = async (productId: string) => {
    const current = editPrices[productId];
    if (!current) return;

    setSavingId(productId);
    try {
      const retailNum = parseFloat(current.retail);
      const wholesaleNum = current.wholesale ? parseFloat(current.wholesale) : undefined;
      const costNum = current.cost ? parseFloat(current.cost) : undefined;

      if (isNaN(retailNum) || retailNum < 0) {
        alert("Please enter a valid retail price.");
        setSavingId(null);
        return;
      }

      const res = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellingPrice: retailNum,
          wholesalePrice: wholesaleNum,
          costPrice: costNum,
        }),
      });

      if (!res.ok) throw new Error("Failed to update rate tier");

      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? {
                ...p,
                sellingPrice: retailNum,
                wholesalePrice: wholesaleNum,
                costPrice: costNum,
              }
            : p
        )
      );
      setSavedSuccessId(productId);
      setTimeout(() => setSavedSuccessId(null), 2500);
      showNotification("Rate updated successfully!");
    } catch {
      alert("Error saving rate tier");
    } finally {
      setSavingId(null);
    }
  };

  // Upload Product Image
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !showImageUploadModal) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Image upload failed");
      const uploadData = await uploadRes.json();

      const updateRes = await fetch(`/api/products/${showImageUploadModal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: uploadData.url }),
      });

      if (!updateRes.ok) throw new Error("Failed to link image to product");

      setProducts((prev) =>
        prev.map((p) => (p.id === showImageUploadModal.id ? { ...p, imageUrl: uploadData.url } : p))
      );
      setShowImageUploadModal(null);
      showNotification("Product image updated successfully!");
    } catch (err: unknown) {
      alert((err as Error).message || "Error uploading image");
    } finally {
      setUploadingImage(false);
    }
  };

  // Upload Rate Card PDF
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPdf(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("PDF upload failed");
      const uploadData = await uploadRes.json();

      const docRes = await fetch("/api/pricing-tiers/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          url: uploadData.url,
          size: file.size,
        }),
      });

      if (!docRes.ok) throw new Error("Failed to register document");
      const docData = await docRes.json();

      setRateCardDocs((prev) => [docData.document, ...prev]);
      showNotification("Rate Card PDF uploaded successfully!");
    } catch (err: unknown) {
      alert((err as Error).message || "Error uploading PDF");
    } finally {
      setUploadingPdf(false);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
    }
  };

  // Add new material rate
  const handleCreateMaterialRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newRetail) return;

    setAddingSubmitting(true);
    try {
      let prismaCat: ProductCategory = ProductCategory.OTHER;
      if (newCat === "TSHIRT" || newCat === "MUG_GIFT") prismaCat = ProductCategory.GIFTING_CUSTOMIZED;
      else if (
        newCat === "FLEX" ||
        newCat === "VISITING_CARD" ||
        newCat === "SIGNAGE" ||
        newCat === "PAPER_PRINT"
      )
        prismaCat = ProductCategory.PRINTING;
      else if (newCat === "DESIGN") prismaCat = ProductCategory.GRAPHIC_DESIGN_BRANDING;

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          category: prismaCat,
          customCategory: newCat,
          subCategory: newSubCat.trim(),
          unit: newUnit,
          imageUrl: newImageUrl.trim() ? newImageUrl.trim() : "/products/tshirt_cotton.svg",
          costPrice: newCost ? parseFloat(newCost) : 0,
          sellingPrice: parseFloat(newRetail),
          wholesalePrice: newWholesale ? parseFloat(newWholesale) : undefined,
          taxRate: 0,
        }),
      });

      if (!res.ok) throw new Error("Failed to add material rate");

      setShowAddModal(false);
      setNewName("");
      setNewCost("");
      setNewRetail("");
      setNewWholesale("");
      setNewImageUrl("");
      showNotification("New material rate added successfully!");
      fetchData();
    } catch (err: unknown) {
      alert((err as Error).message || "Error adding material rate");
    } finally {
      setAddingSubmitting(false);
    }
  };

  // Customer Tier Switch
  const handleUpdateCustomerTier = async (customerId: string, tier: "RETAIL" | "WHOLESALE") => {
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pricingTier: tier }),
      });
      if (!res.ok) throw new Error("Failed to update customer tier");

      setCustomers((prev) =>
        prev.map((c) => (c.id === customerId ? { ...c, pricingTier: tier } : c))
      );
      showNotification(`Customer mapped to ${tier} tier!`);
    } catch {
      alert("Error updating customer tier");
    }
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-7xl mx-auto pb-16">
      {/* ── Top Bar with Tabs, PDF Rate Card, Search, and Add Rate ────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        {/* Tab Buttons (Dual Light/Dark Mode) */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/80 dark:bg-black/40 border border-slate-300/80 dark:border-white/10 w-fit max-w-full overflow-x-auto scrollbar-none shadow-xs">
          <button
            onClick={() => setActiveTab("matrix")}
            className={`px-3.5 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "matrix"
                ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-white/5"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Product Rate Tier Matrix</span>
          </button>

          <button
            onClick={() => setActiveTab("customers")}
            className={`px-3.5 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "customers"
                ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-white/5"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Customer Tier Mapping</span>
          </button>

          <button
            onClick={() => setActiveTab("rules")}
            className={`px-3.5 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "rules"
                ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-white/5"
            }`}
          >
            <Percent className="w-4 h-4" />
            <span>Tier Rules & Guidelines</span>
          </button>
        </div>

        {/* Right Search, PDF Hub & Add Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {successMsg && (
            <div className="px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5 animate-fade-in shadow-xs">
              <Check className="w-3.5 h-3.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Rate Card PDF Hub Button */}
          <button
            onClick={() => setShowPdfModal(true)}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-200 dark:border-white/10 shadow-xs cursor-pointer transition-all"
            title="Download or upload official Studio Rate Card PDF"
          >
            <FileText className="w-3.5 h-3.5 text-rose-500" />
            <span>Rate Card PDF</span>
            {rateCardDocs.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search items or SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-44 sm:w-56 shadow-xs transition-all"
            />
          </div>

          {/* Add Rate Button */}
          <button
            onClick={() => {
              setNewCat(selectedCategory !== "ALL" ? selectedCategory : "TSHIRT");
              setNewUnit(
                selectedCategory === "FLEX" || selectedCategory === "SIGNAGE"
                  ? "sqft"
                  : selectedCategory === "VISITING_CARD"
                  ? "100 pcs"
                  : "pcs"
              );
              setShowAddModal(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Rate</span>
          </button>
        </div>
      </div>

      {/* ── CATEGORY & SUB-CATEGORY FILTER MENUS (LIGHT & DARK MODE) ─────────── */}
      {activeTab === "matrix" && (
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#091122]/90 border border-slate-200 dark:border-white/10 shadow-sm space-y-2.5 animate-fade-in">
          {/* Main Category Filter Menus Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1 whitespace-nowrap">
              <Tag className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
              Category:
            </span>

            {/* "All Categories" pill */}
            <button
              onClick={() => {
                setSelectedCategory("ALL");
                setSelectedSubCategory("ALL");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                selectedCategory === "ALL"
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-transparent shadow-sm shadow-blue-500/20 scale-[1.02]"
                  : "bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-white/5 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Categories</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  selectedCategory === "ALL"
                    ? "bg-white/25 text-white"
                    : "bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400"
                }`}
              >
                {products.length}
              </span>
            </button>

            {/* Dynamic Categories list */}
            {categories.map((cat) => {
              const Icon = ICON_MAP[cat.icon || "Tag"] || Tag;
              const count = categoryCounts[cat.id] || 0;
              const isSelected = selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSelectedSubCategory("ALL");
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                    isSelected
                      ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-transparent shadow-sm shadow-cyan-500/20 scale-[1.02]"
                      : "bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-white/5 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected
                        ? "bg-white/25 text-white"
                        : "bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}

            {/* "+ New Category" button */}
            <button
              onClick={() => setShowAddCategoryModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-cyan-700 dark:text-cyan-400 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/40 dark:hover:bg-cyan-900/60 border border-cyan-200 dark:border-cyan-800/40 transition-all whitespace-nowrap cursor-pointer ml-1"
              title="Add a custom product category"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>+ New Category</span>
            </button>
          </div>

          {/* Sub-Category / Material Filter Menus Row */}
          {availableSubCategories.length > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1 whitespace-nowrap flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                Material:
              </span>

              <button
                onClick={() => setSelectedSubCategory("ALL")}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedSubCategory === "ALL"
                    ? "bg-amber-500 text-slate-950 font-extrabold shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200/70 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                All Materials ({availableSubCategories.length})
              </button>

              {availableSubCategories.map((sub) => (
                <button
                  key={sub}
                  onClick={() => setSelectedSubCategory(sub)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer border ${
                    selectedSubCategory === sub
                      ? "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-400/40 font-bold"
                      : "bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.02] dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 border-slate-200/60 dark:border-white/5 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 1: PRODUCT RATE TIER MATRIX TABLE (LIGHT & DARK MODE) ────────── */}
      {activeTab === "matrix" && (
        <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-white dark:bg-[#091122]/90 shadow-sm animate-fade-in">
          {loading ? (
            <div className="p-16 text-center text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-cyan-400" />
              <span>Loading pricing rate tiers…</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-16 text-center text-slate-500 dark:text-slate-400 space-y-2">
              <Package className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-500" />
              <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                No items found for the selected category or material
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Click &quot;Add Rate&quot; above to create a new material pricing rate.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[760px]">
                {/* Clean, Contrast Header */}
                <thead className="bg-slate-50 dark:bg-[#0e172a] border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-extrabold text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4 font-bold">ITEM & PRODUCT IMAGE</th>
                    <th className="py-3.5 px-4 font-bold">UNIT</th>
                    <th className="py-3.5 px-4 font-bold w-28">COST PRICE (₹)</th>
                    <th className="py-3.5 px-4 font-bold w-36">RETAIL SELLING RATE (₹)</th>
                    <th className="py-3.5 px-4 font-bold w-36">WHOLESALE RATE (₹)</th>
                    <th className="py-3.5 px-4 font-bold">WHOLESALE DISCOUNT VS RETAIL</th>
                    <th className="py-3.5 px-4 text-right font-bold w-28">ACTION</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {filteredProducts.map((prod) => {
                    const prices = editPrices[prod.id] || {
                      retail: String(prod.sellingPrice ?? ""),
                      wholesale: String(prod.wholesalePrice ?? ""),
                      cost: String(prod.costPrice ?? ""),
                    };

                    const retailNum = parseFloat(prices.retail) || 0;
                    const wholesaleNum = parseFloat(prices.wholesale) || 0;
                    const costNum = parseFloat(prices.cost) || 0;

                    const retailMarginPct =
                      retailNum > 0 && costNum > 0 && retailNum > costNum
                        ? Math.round(((retailNum - costNum) / retailNum) * 100)
                        : retailNum > 0 && costNum === 0
                        ? 100
                        : null;

                    const wholesaleMarginPct =
                      wholesaleNum > 0 && costNum > 0 && wholesaleNum > costNum
                        ? Math.round(((wholesaleNum - costNum) / wholesaleNum) * 100)
                        : wholesaleNum > 0 && costNum === 0
                        ? 100
                        : null;

                    const wholesaleDiscount =
                      retailNum > 0 && wholesaleNum > 0 && retailNum > wholesaleNum
                        ? Math.round(((retailNum - wholesaleNum) / retailNum) * 100)
                        : 0;

                    const isSaving = savingId === prod.id;
                    const isJustSaved = savedSuccessId === prod.id;

                    const imageSrc = prod.imageUrl || "/products/tshirt_cotton.svg";

                    return (
                      <tr
                        key={prod.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors border-b border-slate-100 dark:border-white/[0.04]"
                      >
                        {/* ITEM & PRODUCT IMAGE */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {/* Product Thumbnail with Hover Camera Change Icon */}
                            <div
                              onClick={() => setShowImageUploadModal(prod)}
                              className="relative group w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 flex-shrink-0 cursor-pointer shadow-xs hover:border-blue-500 dark:hover:border-cyan-400 transition-all"
                              title="Click to view or upload product photo"
                            >
                              <img
                                src={imageSrc}
                                alt={prod.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "/products/tshirt_cotton.svg";
                                }}
                              />
                              <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Camera className="w-4 h-4 text-cyan-400" />
                              </div>
                            </div>

                            {/* Details */}
                            <div>
                              <p className="font-bold text-slate-900 dark:text-slate-100 text-[13px] leading-tight">
                                {prod.name}
                              </p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 uppercase">
                                  {prod.sku}
                                </span>
                                {prod.subCategory && (
                                  <span className="text-[10px] text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/40 px-1.5 py-0.2 rounded font-medium">
                                    {prod.subCategory}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* UNIT */}
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                          {prod.unit}
                        </td>

                        {/* COST PRICE */}
                        <td className="py-3.5 px-4">
                          <input
                            type="number"
                            step="0.1"
                            value={prices.cost}
                            onChange={(e) =>
                              setEditPrices({
                                ...editPrices,
                                [prod.id]: { ...prices, cost: e.target.value },
                              })
                            }
                            placeholder="0"
                            className="w-24 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-200 text-xs font-mono font-bold focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-black/60 shadow-xs"
                          />
                        </td>

                        {/* RETAIL SELLING RATE */}
                        <td className="py-3.5 px-4">
                          <input
                            type="number"
                            step="0.1"
                            value={prices.retail}
                            onChange={(e) =>
                              setEditPrices({
                                ...editPrices,
                                [prod.id]: { ...prices, retail: e.target.value },
                              })
                            }
                            className="w-28 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white text-xs font-mono font-extrabold focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-black/60 shadow-xs"
                          />
                          {retailMarginPct !== null && (
                            <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mt-1 font-mono">
                              Margin: {retailMarginPct}%
                            </p>
                          )}
                        </td>

                        {/* WHOLESALE RATE */}
                        <td className="py-3.5 px-4">
                          <input
                            type="number"
                            step="0.1"
                            value={prices.wholesale}
                            onChange={(e) =>
                              setEditPrices({
                                ...editPrices,
                                [prod.id]: { ...prices, wholesale: e.target.value },
                              })
                            }
                            placeholder="Same as retail"
                            className="w-28 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/15 text-slate-900 dark:text-slate-100 text-xs font-mono font-extrabold focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-black/60 shadow-xs"
                          />
                          {wholesaleMarginPct !== null && (
                            <p className="text-[10px] font-bold text-amber-600 dark:text-cyan-400 mt-1 font-mono">
                              Margin: {wholesaleMarginPct}%
                            </p>
                          )}
                        </td>

                        {/* WHOLESALE DISCOUNT VS RETAIL */}
                        <td className="py-3.5 px-4">
                          {wholesaleDiscount > 0 ? (
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-extrabold bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-mono shadow-xs">
                              {wholesaleDiscount}% OFF
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 text-[11px] font-medium">—</span>
                          )}
                        </td>

                        {/* ACTION */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleSavePrice(prod.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ml-auto cursor-pointer border ${
                              isJustSaved
                                ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/40"
                                : "bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-white/10 shadow-xs"
                            }`}
                          >
                            {isSaving ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" />
                            ) : isJustSaved ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Save className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                            )}
                            <span>{isJustSaved ? "Saved" : "Update"}</span>
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
      )}

      {/* ── TAB 2: CUSTOMER TIER MAPPING ───────────────────────────────────── */}
      {activeTab === "customers" && (
        <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-white dark:bg-[#091122]/90 p-6 space-y-4 animate-fade-in shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/10">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Customer Pricing Tier Assignments
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Customers assigned to &quot;Wholesale&quot; automatically receive Wholesale material rates when creating invoices.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold text-xs border border-blue-200 dark:border-blue-500/30">
                {customers.filter((c) => c.pricingTier !== "WHOLESALE").length} Retail
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-xs border border-amber-200 dark:border-amber-500/30">
                {customers.filter((c) => c.pricingTier === "WHOLESALE").length} Wholesale
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[500px]">
              <thead className="bg-slate-50 dark:bg-[#0e172a] border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-2.5 px-4">Customer Name</th>
                  <th className="py-2.5 px-4">Phone</th>
                  <th className="py-2.5 px-4">Current Assigned Tier</th>
                  <th className="py-2.5 px-4 text-right">Switch Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {customers.map((c) => {
                  const isWholesale = c.pricingTier === "WHOLESALE";
                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {c.name}
                        {c.contactPerson && (
                          <span className="block text-[11px] font-normal text-slate-400">
                            Attn: {c.contactPerson}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                        {c.phone}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                            isWholesale
                              ? "bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-300"
                              : "bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {isWholesale ? "🏢 Wholesale Partner" : "🛒 Retail Counter"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex rounded-lg border border-slate-200 dark:border-white/10 p-0.5 bg-slate-100 dark:bg-black/40">
                          <button
                            type="button"
                            onClick={() => handleUpdateCustomerTier(c.id, "RETAIL")}
                            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                              !isWholesale
                                ? "bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-xs"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            }`}
                          >
                            Retail
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateCustomerTier(c.id, "WHOLESALE")}
                            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                              isWholesale
                                ? "bg-amber-500 text-slate-950 shadow-xs"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            }`}
                          >
                            Wholesale
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: TIER RULES & GUIDELINES ─────────────────────────────────── */}
      {activeTab === "rules" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#091122]/90 p-6 space-y-3 border-t-4 border-t-blue-500 shadow-sm">
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Retail Tier (Standard Studio Rate)
              </h3>
            </div>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                <span>
                  <strong>Target Audience:</strong> Walk-in customers, single quantity buyers, and occasional retail clients.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                <span>
                  <strong>Applies on:</strong> Standard sales invoices and counter receipts when no wholesale customer account is attached.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                <span>
                  <strong>Margins:</strong> Full studio gross profit margin (typically 40% - 60% markup over material cost).
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#091122]/90 p-6 space-y-3 border-t-4 border-t-amber-500 shadow-sm">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Wholesale Tier (B2B Partner Rate)
              </h3>
            </div>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                <span>
                  <strong>Target Audience:</strong> Resellers, advertising agencies, corporate recurring accounts, and printing partners.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                <span>
                  <strong>Auto-Application:</strong> When an invoice is created and a Wholesale customer is selected, all items auto-populate with Wholesale rates.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                <span>
                  <strong>Material Protection:</strong> Designed to maintain a healthy baseline margin (15% - 30%) while remaining competitive for bulk re-orders.
                </span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* ── MODAL: RATE CARD PDF HUB (EXPORT & UPLOAD) ──────────────────────── */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#0d1527] w-full max-w-xl overflow-hidden border border-slate-200 dark:border-white/15 rounded-2xl shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-600/20 border border-rose-200 dark:border-rose-500/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Studio Rate Card PDF Hub
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Download official studio rate sheets or upload technical supplier brochures
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPdfModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Export Official Live PDF */}
              <div className="p-4 rounded-xl bg-blue-50/80 dark:bg-gradient-to-r dark:from-blue-900/40 dark:to-cyan-900/40 border border-blue-200 dark:border-blue-500/30 flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>Export Live Studio Rate Card</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 font-mono font-bold">
                      Auto-generated
                    </span>
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Generates a branded PDF of all live retail and wholesale rates grouped by category.
                  </p>
                </div>

                <a
                  href="/api/pricing-tiers/pdf"
                  download="Royal_Design_Studio_Rate_Card.pdf"
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 flex-shrink-0 shadow-md shadow-blue-500/20"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </a>
              </div>

              {/* Upload PDF File */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Upload Custom PDF Rate Sheet / Specs
                  </label>
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={uploadingPdf}
                    onClick={() => pdfInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-xs"
                  >
                    {uploadingPdf ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>Upload New PDF</span>
                  </button>
                </div>

                {/* Document List */}
                <div className="divide-y divide-slate-100 dark:divide-white/5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 overflow-hidden max-h-56 overflow-y-auto">
                  {rateCardDocs.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                      No uploaded PDF documents yet.
                    </div>
                  ) : (
                    rateCardDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3 flex items-center justify-between gap-3 hover:bg-white dark:hover:bg-white/[0.02]"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <FileText className="w-4 h-4 text-rose-500 flex-shrink-0" />
                          <div className="truncate">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                              {doc.name}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {new Date(doc.uploadedAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        </div>

                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1 flex-shrink-0"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>View</span>
                        </a>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD NEW CUSTOM CATEGORY ─────────────────────────────────── */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#0d1527] w-full max-w-md overflow-hidden border border-slate-200 dark:border-white/15 rounded-2xl shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-600 text-white flex items-center justify-center">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Create New Category</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Add custom studio product category (e.g. Gift Boxes, ID Cards)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddCategoryModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gift Boxes, ID Cards, Neon Signs…"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-slate-200 text-xs focus:outline-none focus:border-cyan-500 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Category Icon
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { id: "Shirt", label: "Apparel" },
                    { id: "ImageIcon", label: "Banner" },
                    { id: "CreditCard", label: "Card" },
                    { id: "Coffee", label: "Mug" },
                    { id: "Building", label: "Board" },
                    { id: "Printer", label: "Print" },
                    { id: "Sparkles", label: "Design" },
                    { id: "Tag", label: "General" },
                    { id: "Package", label: "Box" },
                    { id: "Layers", label: "Material" },
                  ].map((ic) => (
                    <button
                      key={ic.id}
                      type="button"
                      onClick={() => setNewCatIcon(ic.id)}
                      className={`p-2 rounded-xl border text-center flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        newCatIcon === ic.id
                          ? "bg-cyan-50 dark:bg-cyan-500/20 border-cyan-500 dark:border-cyan-400 text-cyan-700 dark:text-cyan-300 shadow-xs"
                          : "bg-slate-50 dark:bg-black/30 border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      {(() => {
                        const Icon = ICON_MAP[ic.id] || Tag;
                        return <Icon className="w-4 h-4" />;
                      })()}
                      <span className="text-[9px] font-bold">{ic.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCategory || !newCatName.trim()}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-cyan-500/20"
                >
                  {savingCategory && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CHANGE PRODUCT IMAGE ────────────────────────────────────── */}
      {showImageUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#0d1527] w-full max-w-sm overflow-hidden border border-slate-200 dark:border-white/15 rounded-2xl shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Product Photo</h3>
              </div>
              <button
                onClick={() => setShowImageUploadModal(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 text-center space-y-4">
              <div className="w-24 h-24 mx-auto rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/15 shadow-md">
                <img
                  src={showImageUploadModal.imageUrl || "/products/tshirt_cotton.svg"}
                  alt={showImageUploadModal.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <p className="font-bold text-slate-900 dark:text-white text-sm">{showImageUploadModal.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  {showImageUploadModal.sku}
                </p>
              </div>

              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              <button
                type="button"
                disabled={uploadingImage}
                onClick={() => imageInputRef.current?.click()}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50 transition-all"
              >
                {uploadingImage ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span>Upload New Photo (PNG / JPG)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD NEW MATERIAL RATE ───────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#0d1527] w-full max-w-lg overflow-hidden border border-slate-200 dark:border-white/15 rounded-2xl shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Add Material / Sub-Category Rate
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Define pricing tier for a specific material or specification
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMaterialRate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Category *
                </label>
                <select
                  value={newCat}
                  onChange={(e) => {
                    const cat = e.target.value;
                    setNewCat(cat);
                    if (cat === "FLEX" || cat === "SIGNAGE") setNewUnit("sqft");
                    else if (cat === "VISITING_CARD") setNewUnit("100 pcs");
                    else if (cat === "PAPER_PRINT") setNewUnit("page");
                    else setNewUnit("pcs");
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-slate-200 text-xs focus:outline-none focus:border-blue-500 shadow-xs"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Material Sub-Category *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 100% Cotton Bio-Wash 180 GSM or Star Backlit Flex"
                  value={newSubCat}
                  onChange={(e) => setNewSubCat(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-slate-200 text-xs focus:outline-none focus:border-blue-500 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Item Display Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Round Neck Bio-Wash T-Shirt (180 GSM)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-slate-200 text-xs focus:outline-none focus:border-blue-500 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Billing Unit
                </label>
                <input
                  type="text"
                  placeholder="e.g. pcs, sqft, 100 pcs, page"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-slate-200 text-xs font-mono focus:outline-none focus:border-blue-500 shadow-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Cost Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={newCost}
                    onChange={(e) => setNewCost(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-slate-200 text-xs font-mono focus:outline-none focus:border-blue-500 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase mb-1">
                    Retail Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder="0"
                    value={newRetail}
                    onChange={(e) => setNewRetail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/40 border border-blue-400/50 text-slate-900 dark:text-white text-xs font-mono font-bold focus:outline-none focus:border-blue-500 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase mb-1">
                    Wholesale (₹)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={newWholesale}
                    onChange={(e) => setNewWholesale(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/40 border border-amber-400/50 text-slate-900 dark:text-white text-xs font-mono font-bold focus:outline-none focus:border-amber-500 shadow-xs"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-500/20"
                >
                  {addingSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Material Rate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
