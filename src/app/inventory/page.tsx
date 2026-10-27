'use client';

import React, { useState, useEffect } from 'react';
import { api, getApiUrl } from '@/lib/api';
import { Product, Category, Supplier, StockLocation } from '@/lib/types';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import {
  Boxes,
  Search,
  Plus,
  FileSpreadsheet,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  PackagePlus,
  RefreshCw,
  Palette,
  Calculator,
  Info,
} from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';

const POPULAR_BRANDS = [
  'Stereobliss',
  'Yamaha',
  'Fender',
  'Roland',
  'Ibanez',
  'Casio',
  "D'Addario",
  'Shure',
  'Gibson',
  'Cort',
];

const COLOR_PRESETS = [
  { name: 'Black', hex: '#18181b', border: '#3f3f46' },
  { name: 'White', hex: '#ffffff', border: '#cbd5e1' },
  { name: 'Sunburst', hex: 'linear-gradient(135deg, #f59e0b, #78350f)', border: '#b45309' },
  { name: 'Natural Wood', hex: '#d97706', border: '#b45309' },
  { name: 'Vintage Red', hex: '#ef4444', border: '#b91c1c' },
  { name: 'Metallic Blue', hex: '#2563eb', border: '#1d4ed8' },
  { name: 'Silver / Chrome', hex: 'linear-gradient(135deg, #e2e8f0, #94a3b8)', border: '#64748b' },
  { name: 'Gold', hex: 'linear-gradient(135deg, #fde047, #ca8a04)', border: '#a16207' },
  { name: 'Emerald Green', hex: '#10b981', border: '#047857' },
  { name: 'Purple', hex: '#8b5cf6', border: '#6d28d9' },
];

function getColorStyle(colorName?: string): React.CSSProperties {
  if (!colorName) return { background: '#64748b' };
  const lower = colorName.toLowerCase().trim();
  const matched = COLOR_PRESETS.find((p) => p.name.toLowerCase() === lower);
  if (matched) {
    return { background: matched.hex, borderColor: matched.border };
  }
  if (lower.includes('sunburst')) return { background: 'linear-gradient(135deg, #f59e0b, #78350f)' };
  if (lower.includes('wood') || lower.includes('natural')) return { background: '#d97706' };
  if (lower.includes('black') || lower.includes('ebony')) return { background: '#18181b' };
  if (lower.includes('white') || lower.includes('arctic') || lower.includes('ivory')) {
    return { background: '#ffffff', borderColor: '#cbd5e1' };
  }
  if (lower.includes('red') || lower.includes('cherry') || lower.includes('crimson')) return { background: '#ef4444' };
  if (lower.includes('blue') || lower.includes('lake') || lower.includes('cyan')) return { background: '#2563eb' };
  if (lower.includes('silver') || lower.includes('grey') || lower.includes('gray')) return { background: '#94a3b8' };
  if (lower.includes('gold')) return { background: '#eab308' };
  if (lower.includes('green') || lower.includes('emerald')) return { background: '#10b981' };
  if (lower.includes('yellow') || lower.includes('butterscotch')) return { background: '#eab308' };
  if (lower.includes('pink')) return { background: '#ec4899' };
  if (lower.includes('purple')) return { background: '#8b5cf6' };
  if (lower.includes('orange')) return { background: '#f97316' };
  return { background: '#64748b' };
}

function renderColorBadge(color?: string) {
  if (!color) return null;
  const style = getColorStyle(color);
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm text-slate-800 dark:text-slate-100"
      title={`Product Colour: ${color}`}
    >
      <span
        className="h-3 w-3 rounded-full ring-1 ring-black/20 shrink-0 shadow-inner"
        style={style}
      />
      <span className="capitalize">{color}</span>
    </span>
  );
}

export default function InventoryPage() {
  const { canManageCatalogue } = useAuth();

  // Product states
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals & Details
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New product form (Pure catalogue specifications - stock is credited via Receive Stock)
  const [newProdName, setNewProdName] = useState('');
  const [newProdBrand, setNewProdBrand] = useState('Stereobliss');
  const [newProdModel, setNewProdModel] = useState('');
  const [newProdColor, setNewProdColor] = useState('');
  const [newProdSku, setNewProdSku] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('');
  const [newProdCost, setNewProdCost] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdSupplier, setNewProdSupplier] = useState('');
  const [newProdThreshold, setNewProdThreshold] = useState('5');
  const [newProdUnit, setNewProdUnit] = useState('pcs');
  const [newProdHsn, setNewProdHsn] = useState('9202');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingSku, setIsFetchingSku] = useState(false);

  // Quick Stock Adjustment Modal State (for audit recount corrections)
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState(0);
  const [adjustReason, setAdjustReason] = useState('Stock count verification / recount');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState('');

  // Edit Product Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editProdName, setEditProdName] = useState('');
  const [editProdColor, setEditProdColor] = useState('');
  const [editProdBrand, setEditProdBrand] = useState('');
  const [editProdModel, setEditProdModel] = useState('');
  const [editProdCategory, setEditProdCategory] = useState('');
  const [editProdSupplier, setEditProdSupplier] = useState('');
  const [editProdCost, setEditProdCost] = useState('');
  const [editProdPrice, setEditProdPrice] = useState('');
  const [editProdThreshold, setEditProdThreshold] = useState('5');
  const [editProdHsn, setEditProdHsn] = useState('9202');
  const [isEditingSaving, setIsEditingSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Inline Quick Add Supplier
  const [isQuickSupplierOpen, setIsQuickSupplierOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [isSavingQuickSupplier, setIsSavingQuickSupplier] = useState(false);

  useEffect(() => {
    fetchMetadata();
    fetchProducts();
  }, [search, selectedCategory]);

  const fetchMetadata = async () => {
    try {
      const [catsRes, supsRes, locsRes] = await Promise.all([
        api.get<{ categories: Category[] }>('/meta/categories'),
        api.get<{ suppliers: Supplier[] }>('/meta/suppliers'),
        api.get<{ locations: StockLocation[] }>('/meta/locations'),
      ]);
      setCategories(catsRes.categories || []);
      setSuppliers(supsRes.suppliers || []);
      setLocations(locsRes.locations || []);
      if (catsRes.categories && catsRes.categories.length > 0 && !newProdCategory) {
        setNewProdCategory(catsRes.categories[0]._id);
      }
    } catch (err) {
      console.error('Failed to load categories/suppliers/locations:', err);
    }
  };

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (selectedCategory) params.set('category', selectedCategory);

      const res = await api.get<{ items: Product[] }>(`/products?${params.toString()}`);
      setProducts(res.items || []);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Open Quick Stock Adjust Modal
  const handleOpenAdjust = (p: Product) => {
    setAdjustProduct(p);
    setAdjustQuantity(p.stockQuantity?.onHand ?? 0);
    setAdjustReason('Physical stock count update');
    setAdjustError('');
  };

  // Save Quick Stock Adjust
  const handleSaveAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProduct) return;
    setIsAdjusting(true);
    setAdjustError('');
    try {
      await api.post(`/products/${adjustProduct._id}/adjust-stock`, {
        newQuantity: adjustQuantity,
        reason: adjustReason.trim() || undefined,
      });
      setAdjustProduct(null);
      fetchProducts();
    } catch (err: any) {
      setAdjustError(err.message || 'Failed to update stock count.');
    } finally {
      setIsAdjusting(false);
    }
  };

  // Open Edit Product Modal
  const handleOpenEditProduct = (p: Product) => {
    setEditingProduct(p);
    setEditProdName(p.name);
    setEditProdColor(p.color || '');
    setEditProdBrand(p.brand);
    setEditProdModel(p.modelName || '');
    setEditProdCategory(
      typeof p.category === 'object' && p.category ? (p.category as any)._id : p.category || ''
    );
    setEditProdSupplier(
      p.supplier ? (typeof p.supplier === 'object' ? (p.supplier as any)._id : p.supplier) : ''
    );
    setEditProdCost(String(p.purchaseCost || ''));
    setEditProdPrice(String(p.defaultSellingPrice || ''));
    setEditProdThreshold(String(p.minStockThreshold || 5));
    setEditProdHsn(p.hsnCode || '9202');
    setEditError('');
  };

  // Save Edit Product
  const handleSaveEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setIsEditingSaving(true);
    setEditError('');
    try {
      await api.patch(`/products/${editingProduct._id}`, {
        name: editProdName.trim(),
        color: editProdColor.trim() || undefined,
        brand: editProdBrand.trim(),
        modelName: editProdModel.trim() || undefined,
        category: editProdCategory || undefined,
        supplier: editProdSupplier || undefined,
        purchaseCost: parseFloat(editProdCost) || 0,
        defaultSellingPrice: parseFloat(editProdPrice) || 0,
        minStockThreshold: parseInt(editProdThreshold, 10) || 5,
        hsnCode: editProdHsn.trim() || '9202',
      });
      setEditingProduct(null);
      fetchProducts();
    } catch (err: any) {
      setEditError(err.message || 'Failed to update product details.');
    } finally {
      setIsEditingSaving(false);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (p: Product) => {
    if (!confirm(`Are you sure you want to deactivate and remove "${p.name}"?`)) {
      return;
    }
    try {
      await api.delete(`/products/${p._id}`);
      fetchProducts();
    } catch (err: any) {
      alert(`Failed to delete product: ${err.message}`);
    }
  };

  // Sequential SKU Generation
  const fetchNextSku = async () => {
    setIsFetchingSku(true);
    try {
      const res = await api.get<{ nextSku: string }>('/products/next-sku');
      setNewProdSku(res.nextSku);
    } catch (err) {
      const fallbackSku = `SB-${Date.now().toString().slice(-4)}`;
      setNewProdSku(fallbackSku);
    } finally {
      setIsFetchingSku(false);
    }
  };

  // Open Add Product Modal with Fresh SKU
  const handleOpenAddProduct = async () => {
    setFormError('');
    setNewProdName('');
    setNewProdBrand('Stereobliss');
    setNewProdModel('');
    setNewProdColor('');
    setNewProdCost('');
    setNewProdPrice('');
    setNewProdThreshold('5');
    setNewProdUnit('pcs');
    setNewProdHsn('9202');
    setNewProdSupplier('');
    if (categories.length > 0 && !newProdCategory) {
      setNewProdCategory(categories[0]._id);
    }
    await fetchNextSku();
    setIsAddModalOpen(true);
  };

  // Create Product (Pure Catalogue Item - Stock is credited through Receive Stock with Challan)
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSaving(true);

    try {
      await api.post('/products', {
        name: newProdName.trim(),
        brand: newProdBrand.trim() || 'Stereobliss',
        modelName: newProdModel.trim() || undefined,
        color: newProdColor.trim() || undefined,
        sku: newProdSku.trim().toUpperCase() || undefined,
        category: newProdCategory || categories[0]?._id,
        trackingMode: 'QUANTITY',
        purchaseCost: parseFloat(newProdCost) || 0,
        defaultSellingPrice: parseFloat(newProdPrice) || 0,
        supplier: newProdSupplier || undefined,
        minStockThreshold: parseInt(newProdThreshold, 10) || 5,
        unitOfMeasure: newProdUnit.trim() || 'pcs',
        hsnCode: newProdHsn.trim() || '9202',
        initialStock: 0,
      });

      setIsAddModalOpen(false);
      setNewProdName('');
      setNewProdColor('');
      setNewProdSku('');
      setNewProdCost('');
      setNewProdPrice('');
      fetchProducts();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create product.');
    } finally {
      setIsSaving(false);
    }
  };

  // Save Quick Supplier from inside Product Modal
  const handleSaveQuickSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName.trim()) return;
    setIsSavingQuickSupplier(true);
    try {
      const res = await api.post<{ supplier: Supplier }>('/meta/suppliers', {
        name: newSupplierName.trim(),
        phone: newSupplierPhone.trim() || undefined,
      });
      setSuppliers((prev) => [...prev, res.supplier]);
      setNewProdSupplier(res.supplier._id);
      setEditProdSupplier(res.supplier._id);
      setIsQuickSupplierOpen(false);
      setNewSupplierName('');
      setNewSupplierPhone('');
    } catch (err: any) {
      alert(`Failed to add supplier: ${err.message}`);
    } finally {
      setIsSavingQuickSupplier(false);
    }
  };

  const exportCsv = () => {
    window.open(getApiUrl('/reports/export/products'), '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo size="md" variant="badge" className="shadow-xs shrink-0" />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Catalogue & Inventory
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Stereobliss Retail — Manage product specifications, bulk inventory counts, and retail pricing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5 text-xs">
            <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
            <span>Export CSV</span>
          </Button>

          {canManageCatalogue() && (
            <Button
              size="sm"
              variant="default"
              onClick={handleOpenAddProduct}
              className="gap-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Add Product</span>
            </Button>
          )}
        </div>
      </div>

      {/* Product Catalogue & Quantities Card */}
      <Card>
        <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, SKU, brand..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-slate-800 dark:text-slate-200"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="responsive-table-wrapper">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Item & SKU</th>
                  <th className="py-3 px-4">Colour</th>
                  <th className="py-3 px-4">Brand / Category</th>
                  <th className="py-3 px-4 text-center">Available Stock</th>
                  <th className="py-3 px-4 text-center">On Hand (Click to Edit)</th>
                  <th className="py-3 px-4 text-right">Cost (₹)</th>
                  <th className="py-3 px-4 text-right">Price (₹)</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Loading product catalogue...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <Boxes className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                      <p className="text-sm font-medium">No products in catalogue yet.</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Click <strong>&quot;Add Product&quot;</strong> above to create your first instrument or accessory item.
                      </p>
                    </td>
                  </tr>
                ) : (
                  products.map((p) => {
                    const sq = p.stockQuantity || {
                      onHand: 0,
                      reserved: 0,
                      issuedInternal: 0,
                      quarantined: 0,
                    };
                    return (
                      <tr key={p._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{p.name}</span>
                            {p.color && (
                              <span className="sm:hidden">
                                {renderColorBadge(p.color)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[11px] text-amber-500 font-bold">{p.sku}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono">
                              HSN: {p.hsnCode || '9202'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {p.color ? (
                            renderColorBadge(p.color)
                          ) : (
                            <span className="text-slate-400 text-xs italic">Default</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          <div className="font-semibold">{p.brand}</div>
                          <div className="text-[11px] text-slate-400">
                            {(p.category as any)?.name || 'General'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`text-sm font-extrabold px-2 py-0.5 rounded ${
                              p.isLowStock
                                ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                                : 'text-emerald-500 font-bold'
                            }`}
                          >
                            {p.availableForSale ?? 0} {p.unitOfMeasure || 'pcs'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {canManageCatalogue() ? (
                            <button
                              type="button"
                              onClick={() => handleOpenAdjust(p)}
                              title="Click to directly adjust counted on-hand stock"
                              className="font-mono font-bold text-xs px-2.5 py-1 rounded-md border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-amber-500 hover:text-amber-500 transition-colors"
                            >
                              {sq.onHand} {p.unitOfMeasure || 'pcs'}
                            </button>
                          ) : (
                            <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                              {sq.onHand} {p.unitOfMeasure || 'pcs'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-300">
                          {formatCurrency(p.purchaseCost || 0)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                          {formatCurrency(p.defaultSellingPrice || 0)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {canManageCatalogue() && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenEditProduct(p)}
                                  className="h-7 w-7 p-0 text-slate-500 hover:text-amber-500"
                                  title="Edit Product Details"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteProduct(p)}
                                  className="h-7 w-7 p-0 text-slate-500 hover:text-red-500"
                                  title="Deactivate / Delete"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* QUICK STOCK ADJUST MODAL */}
      <Modal
        isOpen={!!adjustProduct}
        onClose={() => setAdjustProduct(null)}
        title={`Adjust Stock — ${adjustProduct?.name || ''}`}
        description="Audit count verification. Updating here directly adjusts the available on-hand balance."
        maxWidth="md"
      >
        <form onSubmit={handleSaveAdjust} className="space-y-4">
          {adjustError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 text-xs font-semibold text-red-500">
              {adjustError}
            </div>
          )}

          <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-xs space-y-1">
            <div className="text-slate-500">
              SKU: <span className="font-mono font-bold text-amber-500">{adjustProduct?.sku}</span>
            </div>
            <div className="text-slate-500">
              Current Registered On-Hand:{' '}
              <span className="font-bold text-slate-900 dark:text-white">
                {adjustProduct?.stockQuantity?.onHand ?? 0} {adjustProduct?.unitOfMeasure || 'pcs'}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Correct Counted Stock On Hand *
            </label>
            <input
              type="number"
              min="0"
              required
              value={adjustQuantity}
              onChange={(e) => setAdjustQuantity(parseInt(e.target.value, 10) || 0)}
              className="w-full h-11 px-3 text-lg font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-center"
            />
          </div>

          <Input
            label="Adjustment Reason / Note"
            placeholder="e.g. Physical inventory audit, count discrepancy correction"
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setAdjustProduct(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              isLoading={isAdjusting}
              className="font-bold bg-amber-500 hover:bg-amber-600 text-slate-950"
            >
              Update Stock Count
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT PRODUCT MODAL */}
      <Modal
        isOpen={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        title={`Edit Product — ${editingProduct?.name || ''}`}
        description="Update specifications, cost, selling price, and HSN code."
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveEditProduct} className="space-y-5">
          {editError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 text-xs font-semibold text-red-500">
              {editError}
            </div>
          )}

          {/* Section 1: Identity */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Product Name *"
                required
                value={editProdName}
                onChange={(e) => setEditProdName(e.target.value)}
              />
              <Input
                label="Brand *"
                required
                value={editProdBrand}
                onChange={(e) => setEditProdBrand(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Model / Series"
                placeholder="e.g. F310, CT-X700"
                value={editProdModel}
                onChange={(e) => setEditProdModel(e.target.value)}
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Category *
                </label>
                <select
                  value={editProdCategory}
                  onChange={(e) => setEditProdCategory(e.target.value)}
                  className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium"
                >
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  SKU Code
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={editingProduct?.sku || 'N/A'}
                  className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 font-mono font-bold text-amber-600 dark:text-amber-400 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Pricing & Margins */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <Calculator className="h-4 w-4 text-emerald-500" />
              <span>Pricing & Profit Margins</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Input
                label="Purchase Cost (₹) *"
                type="number"
                min="0"
                required
                value={editProdCost}
                onChange={(e) => setEditProdCost(e.target.value)}
              />
              <Input
                label="Selling Price (₹) *"
                type="number"
                min="0"
                required
                value={editProdPrice}
                onChange={(e) => setEditProdPrice(e.target.value)}
              />
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  HSN / SAC Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9202"
                  value={editProdHsn}
                  onChange={(e) => setEditProdHsn(e.target.value)}
                  className="w-full h-10 px-3 text-sm font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-amber-600 dark:text-amber-400"
                />
              </div>
              <Input
                label="Low Stock Threshold"
                type="number"
                min="1"
                value={editProdThreshold}
                onChange={(e) => setEditProdThreshold(e.target.value)}
              />
            </div>
          </div>

          {/* Section 3: Attributes & Supplier */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <Palette className="h-4 w-4 text-amber-500" />
              <span>Attributes & Supplier</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Finish / Colour
                </label>
                {editProdColor && (
                  <button
                    type="button"
                    onClick={() => setEditProdColor('')}
                    className="text-[11px] text-slate-400 hover:text-red-500 cursor-pointer"
                  >
                    Clear Colour
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Gloss Black, Sunburst, Natural Wood"
                  value={editProdColor}
                  onChange={(e) => setEditProdColor(e.target.value)}
                  className="w-full h-10 px-3 pl-9 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium"
                />
                <span
                  className="absolute left-2.5 top-2.5 h-5 w-5 rounded-full ring-1 ring-black/20 shadow-sm"
                  style={getColorStyle(editProdColor)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Preferred Supplier
              </label>
              <select
                value={editProdSupplier}
                onChange={(e) => setEditProdSupplier(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium"
              >
                <option value="">No Supplier Assigned</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setEditingProduct(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              isLoading={isEditingSaving}
              className="font-bold bg-amber-500 hover:bg-amber-600 text-slate-950"
            >
              Update Product Details
            </Button>
          </div>
        </form>
      </Modal>

      {/* ADD NEW PRODUCT MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Product to Catalogue"
        description="Register a musical instrument, accessory, or consumable into your master catalogue."
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateProduct} className="space-y-6">
          {formError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs font-semibold text-red-500">
              {formError}
            </div>
          )}

          {/* SECTION 1: Core Product Identity */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-4 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              <Boxes className="h-4 w-4 text-amber-500" />
              <span>1. Core Product Specifications</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Brand / Manufacturer *
                </label>
                <span className="text-[11px] text-slate-400">Select or type custom brand</span>
              </div>
              <input
                type="text"
                required
                placeholder="e.g. Stereobliss, Yamaha, Fender, Roland"
                value={newProdBrand}
                onChange={(e) => setNewProdBrand(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium"
              />
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {POPULAR_BRANDS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setNewProdBrand(b)}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer',
                      newProdBrand.toLowerCase() === b.toLowerCase()
                        ? 'border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold ring-1 ring-amber-500'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:border-slate-400'
                    )}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Product Title / Name *"
              required
              placeholder="e.g. Stereobliss Acoustic Dreadnought Guitar"
              value={newProdName}
              onChange={(e) => setNewProdName(e.target.value)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Model / Series Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. F310, CT-X700, EXL110"
                  value={newProdModel}
                  onChange={(e) => setNewProdModel(e.target.value)}
                  className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Category *
                </label>
                <select
                  required
                  value={newProdCategory}
                  onChange={(e) => setNewProdCategory(e.target.value)}
                  className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium"
                >
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    SKU Code
                  </label>
                  <button
                    type="button"
                    onClick={fetchNextSku}
                    disabled={isFetchingSku}
                    title="Generate next sequential SKU"
                    className="text-[11px] font-bold text-amber-500 hover:text-amber-600 flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className={cn('h-3 w-3', isFetchingSku && 'animate-spin')} />
                    <span>Refresh</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    readOnly
                    value={newProdSku || 'Generating...'}
                    className="w-full h-10 px-3 pr-14 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 font-mono font-bold text-amber-600 dark:text-amber-400 cursor-default"
                  />
                  <span className="absolute right-2 top-2 text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    Auto
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: Pricing, Margins & GST Compliance */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-4 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              <Calculator className="h-4 w-4 text-emerald-500" />
              <span>2. Pricing & GST Compliance</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Purchase Cost per Unit (₹) *"
                type="number"
                min="0"
                required
                placeholder="e.g. 9200"
                value={newProdCost}
                onChange={(e) => setNewProdCost(e.target.value)}
              />

              <Input
                label="Default Selling Price (₹) *"
                type="number"
                min="0"
                required
                placeholder="e.g. 11500"
                value={newProdPrice}
                onChange={(e) => setNewProdPrice(e.target.value)}
              />

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  HSN / SAC Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9202"
                  value={newProdHsn}
                  onChange={(e) => setNewProdHsn(e.target.value)}
                  className="w-full h-10 px-3 text-sm font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-amber-600 dark:text-amber-400"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  GST Code for invoices (Default: 9202)
                </p>
              </div>
            </div>

            {/* Live Profit Margin Intelligence Card */}
            {(() => {
              const cost = parseFloat(newProdCost) || 0;
              const price = parseFloat(newProdPrice) || 0;
              const profit = price - cost;
              const margin = price > 0 ? ((profit / price) * 100).toFixed(1) : '0.0';
              const markup = cost > 0 ? ((profit / cost) * 100).toFixed(1) : '0.0';
              const isProfitable = profit > 0;
              const isNegative = price > 0 && cost > 0 && profit < 0;

              return (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Live Profitability Preview
                    </span>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-[11px] font-extrabold uppercase tracking-wider',
                        isNegative
                          ? 'bg-red-500/10 text-red-500'
                          : isProfitable
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      )}
                    >
                      {isNegative ? 'Loss Alert' : isProfitable ? `${margin}% Margin` : 'Break-Even'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80">
                      <span className="text-slate-500 block text-[11px]">Unit Gross Profit</span>
                      <span className={cn('text-base font-extrabold', profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500')}>
                        {profit >= 0 ? `+${formatCurrency(profit)}` : `-${formatCurrency(Math.abs(profit))}`}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80">
                      <span className="text-slate-500 block text-[11px]">Profit Margin</span>
                      <span className="text-base font-extrabold text-slate-900 dark:text-white">
                        {margin}%
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80">
                      <span className="text-slate-500 block text-[11px]">Cost Markup</span>
                      <span className="text-base font-extrabold text-amber-600 dark:text-amber-400">
                        {markup}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* SECTION 3: Attributes & Supplier */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-4 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              <Palette className="h-4 w-4 text-amber-500" />
              <span>3. Product Attributes & Supplier</span>
            </div>

            {/* Product Colour / Finish */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Colour / Finish
                </label>
                {newProdColor && (
                  <button
                    type="button"
                    onClick={() => setNewProdColor('')}
                    className="text-[11px] text-slate-400 hover:text-red-500 cursor-pointer"
                  >
                    Clear Colour
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Natural Gloss, Sunburst, Ebony Black, Arctic White"
                  value={newProdColor}
                  onChange={(e) => setNewProdColor(e.target.value)}
                  className="w-full h-10 px-3 pl-9 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium"
                />
                <span
                  className="absolute left-2.5 top-2.5 h-5 w-5 rounded-full ring-1 ring-black/20 shadow-sm"
                  style={getColorStyle(newProdColor)}
                />
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {COLOR_PRESETS.map((cp) => (
                  <button
                    key={cp.name}
                    type="button"
                    onClick={() => setNewProdColor(cp.name)}
                    className={cn(
                      'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer',
                      newProdColor.toLowerCase() === cp.name.toLowerCase()
                        ? 'border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold ring-1 ring-amber-500'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:border-slate-400'
                    )}
                  >
                    <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/15 shrink-0" style={{ background: cp.hex }} />
                    <span>{cp.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5 sm:col-span-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Preferred Supplier
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsQuickSupplierOpen(true)}
                    className="text-xs font-bold text-amber-500 hover:text-amber-600"
                  >
                    + Add New
                  </button>
                </div>
                <select
                  value={newProdSupplier}
                  onChange={(e) => setNewProdSupplier(e.target.value)}
                  className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium"
                >
                  <option value="">Select Supplier (Optional)</option>
                  {suppliers.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Low Stock Threshold
                </label>
                <input
                  type="number"
                  min="1"
                  value={newProdThreshold}
                  onChange={(e) => setNewProdThreshold(e.target.value)}
                  className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Unit of Measure
                </label>
                <select
                  value={newProdUnit}
                  onChange={(e) => setNewProdUnit(e.target.value)}
                  className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium"
                >
                  <option value="pcs">Pieces (pcs)</option>
                  <option value="pack">Pack</option>
                  <option value="set">Set</option>
                  <option value="box">Box</option>
                  <option value="pair">Pair</option>
                </select>
              </div>
            </div>
          </div>

          {/* Streamlined Inventory Explanation Notice */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs text-slate-600 dark:text-slate-400">
            <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Single Unified Stock Workflow:
              </span>{' '}
              Products are registered into the master catalogue with 0 initial units. Physical stock is credited directly by recording incoming shipments with Challan / Bill No. under <strong>Receive Stock</strong>.
            </div>
          </div>

          {/* Sticky Modal Action Footer */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              isLoading={isSaving}
              className="font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md gap-1.5"
            >
              <PackagePlus className="h-4 w-4" />
              <span>Save & Register Product</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* INLINE QUICK ADD SUPPLIER */}
      <Modal
        isOpen={isQuickSupplierOpen}
        onClose={() => setIsQuickSupplierOpen(false)}
        title="Add New Supplier"
        description="Register a new vendor/supplier to assign to this product."
        maxWidth="md"
        zIndex={60}
      >
        <form onSubmit={handleSaveQuickSupplier} className="space-y-4">
          <Input
            label="Supplier Company Name *"
            required
            placeholder="e.g. Furtados Music, Bajaao"
            value={newSupplierName}
            onChange={(e) => setNewSupplierName(e.target.value)}
          />
          <Input
            label="Phone Number"
            placeholder="+91 98200 12345"
            value={newSupplierPhone}
            onChange={(e) => setNewSupplierPhone(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsQuickSupplierOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="default" isLoading={isSavingQuickSupplier} className="font-bold">
              Save Supplier
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
