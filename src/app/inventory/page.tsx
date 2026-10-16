'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Product, SerializedItem, Category, Supplier } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
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
  Tag,
  SlidersHorizontal,
  Edit2,
  Trash2,
  History,
  CheckCircle2,
  AlertCircle,
  PackagePlus,
} from 'lucide-react';

export default function InventoryPage() {
  const { canManageCatalogue } = useAuth();
  const [activeTab, setActiveTab] = useState<'products' | 'serialized'>('products');

  // Product states
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTrackingMode, setSelectedTrackingMode] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Serialized items states
  const [serializedItems, setSerializedItems] = useState<SerializedItem[]>([]);
  const [serialSearch, setSerialSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals & Details
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState<{ item: SerializedItem; movements: any[] } | null>(null);

  // New product form
  const [newProdName, setNewProdName] = useState('');
  const [newProdSku, setNewProdSku] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('');
  const [newProdBrand, setNewProdBrand] = useState('');
  const [newProdModel, setNewProdModel] = useState('');
  const [newProdTracking, setNewProdTracking] = useState<'QUANTITY' | 'SERIALIZED'>('QUANTITY');
  const [newProdCost, setNewProdCost] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdSupplier, setNewProdSupplier] = useState('');
  const [newProdThreshold, setNewProdThreshold] = useState('5');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Quick Stock Adjustment Modal State
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState(0);
  const [adjustReason, setAdjustReason] = useState('Stock count verification / recount');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState('');

  // Edit Product Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editProdName, setEditProdName] = useState('');
  const [editProdBrand, setEditProdBrand] = useState('');
  const [editProdModel, setEditProdModel] = useState('');
  const [editProdCategory, setEditProdCategory] = useState('');
  const [editProdSupplier, setEditProdSupplier] = useState('');
  const [editProdCost, setEditProdCost] = useState('');
  const [editProdPrice, setEditProdPrice] = useState('');
  const [editProdThreshold, setEditProdThreshold] = useState('5');
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
  }, [search, selectedCategory, selectedTrackingMode]);

  useEffect(() => {
    if (activeTab === 'serialized') {
      fetchSerializedItems();
    }
  }, [activeTab, serialSearch, selectedStatus]);

  const fetchMetadata = async () => {
    try {
      const [catsRes, supsRes] = await Promise.all([
        api.get<{ categories: Category[] }>('/meta/categories'),
        api.get<{ suppliers: Supplier[] }>('/meta/suppliers'),
      ]);
      setCategories(catsRes.categories || []);
      setSuppliers(supsRes.suppliers || []);
      if (catsRes.categories && catsRes.categories.length > 0 && !newProdCategory) {
        setNewProdCategory(catsRes.categories[0]._id);
      }
    } catch (err) {
      console.error('Failed to load categories/suppliers:', err);
    }
  };

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (selectedCategory) params.set('category', selectedCategory);
      if (selectedTrackingMode) params.set('trackingMode', selectedTrackingMode);

      const res = await api.get<{ items: Product[] }>(`/products?${params.toString()}`);
      setProducts(res.items || []);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSerializedItems = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (serialSearch) params.set('search', serialSearch);
      if (selectedStatus) params.set('status', selectedStatus);

      const res = await api.get<{ items: SerializedItem[] }>(
        `/products/serialized-items?${params.toString()}`
      );
      setSerializedItems(res.items || []);
    } catch (err) {
      console.error('Failed to load serialized assets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenHistory = async (assetId: string) => {
    try {
      const res = await api.get<{ item: SerializedItem; movements: any[] }>(
        `/products/serialized-items/${assetId}/history`
      );
      setHistoryItem(res);
    } catch (err) {
      console.error('Failed to load history:', err);
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
        brand: editProdBrand.trim(),
        modelName: editProdModel.trim() || undefined,
        category: editProdCategory || undefined,
        supplier: editProdSupplier || undefined,
        purchaseCost: parseFloat(editProdCost) || 0,
        defaultSellingPrice: parseFloat(editProdPrice) || 0,
        minStockThreshold: parseInt(editProdThreshold, 10) || 5,
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
    if (!window.confirm(`Are you sure you want to remove "${p.name}" (${p.sku}) from catalogue?`)) {
      return;
    }
    try {
      await api.delete(`/products/${p._id}`);
      fetchProducts();
    } catch (err: any) {
      alert(`Error deleting product: ${err.message}`);
    }
  };

  // Create Product
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSaving(true);

    try {
      await api.post('/products', {
        name: newProdName.trim(),
        sku: newProdSku.trim().toUpperCase(),
        category: newProdCategory,
        brand: newProdBrand.trim(),
        modelName: newProdModel.trim() || undefined,
        trackingMode: newProdTracking,
        purchaseCost: parseFloat(newProdCost) || 0,
        defaultSellingPrice: parseFloat(newProdPrice) || 0,
        supplier: newProdSupplier || undefined,
        minStockThreshold: parseInt(newProdThreshold, 10) || 5,
      });

      setIsAddModalOpen(false);
      setNewProdName('');
      setNewProdSku('');
      setNewProdBrand('');
      setNewProdModel('');
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
    window.open('/api/v1/reports/export/products', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Catalogue & Inventory
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage musical instruments, bulk accessories, stock counts, and serial numbers.
          </p>
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
              onClick={() => {
                setFormError('');
                setIsAddModalOpen(true);
              }}
              className="gap-1.5 text-xs font-bold"
            >
              <Plus className="h-4 w-4" />
              <span>Add Product</span>
            </Button>
          )}
        </div>
      </div>

      {/* Primary Tab Selector */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'products'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Boxes className="h-4 w-4" />
          <span>Product Catalogue & Counts</span>
          <span className="ml-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-bold text-slate-600 dark:text-slate-400">
            {products.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('serialized')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'serialized'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Tag className="h-4 w-4" />
          <span>Serialized Instruments</span>
          <span className="ml-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-bold text-slate-600 dark:text-slate-400">
            {serializedItems.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Product Catalogue & Quantities */}
      {activeTab === 'products' && (
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

                <select
                  value={selectedTrackingMode}
                  onChange={(e) => setSelectedTrackingMode(e.target.value)}
                  className="text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-slate-800 dark:text-slate-200"
                >
                  <option value="">All Tracking Modes</option>
                  <option value="QUANTITY">Quantity-Based</option>
                  <option value="SERIALIZED">Serialized Assets</option>
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
                    <th className="py-3 px-4">Brand / Category</th>
                    <th className="py-3 px-4">Mode</th>
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
                            <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                            <div className="font-mono text-[11px] text-amber-500">{p.sku}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                            <div className="font-semibold">{p.brand}</div>
                            <div className="text-[11px] text-slate-400">
                              {(p.category as any)?.name || 'General'}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={p.trackingMode === 'SERIALIZED' ? 'default' : 'secondary'}
                              className="text-[10px]"
                            >
                              {p.trackingMode}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`text-sm font-extrabold px-2 py-0.5 rounded ${
                                p.isLowStock
                                  ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                                  : 'text-emerald-500 font-bold'
                              }`}
                            >
                              {p.availableForSale} {p.unitOfMeasure}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {/* Editable Count Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenAdjust(p)}
                              title="Click to edit stock count directly"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-slate-900 dark:text-amber-400 font-extrabold text-xs transition-all cursor-pointer"
                            >
                              <span>{sq.onHand}</span>
                              <Edit2 className="h-3 w-3 text-amber-500" />
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-slate-600 dark:text-slate-400">
                            {formatCurrency(p.purchaseCost)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                            {formatCurrency(p.defaultSellingPrice)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenAdjust(p)}
                                title="Adjust Stock Count"
                                className="h-7 px-2 text-xs font-semibold gap-1 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                              >
                                <SlidersHorizontal className="h-3 w-3" />
                                <span>Adjust</span>
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenEditProduct(p)}
                                title="Edit Product Details"
                                className="h-7 px-2 text-xs"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteProduct(p)}
                                title="Remove Product"
                                className="h-7 px-2 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
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
      )}

      {/* Tab 2: Serialized Instruments */}
      {activeTab === 'serialized' && (
        <Card>
          <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Asset ID, Serial No, Assigned Person..."
                  value={serialSearch}
                  onChange={(e) => setSerialSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-slate-800 dark:text-slate-200"
              >
                <option value="">All Lifecycle Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="ISSUED_INTERNAL">Issued (Academy)</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="QUARANTINED">Quarantined</option>
                <option value="SOLD">Sold</option>
                <option value="RETIRED">Retired</option>
              </select>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="responsive-table-wrapper">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Asset ID</th>
                    <th className="py-3 px-4">Instrument / Product</th>
                    <th className="py-3 px-4">Manufacturer Serial</th>
                    <th className="py-3 px-4">Lifecycle Status</th>
                    <th className="py-3 px-4">Condition</th>
                    <th className="py-3 px-4">Assigned To</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        Loading serialized assets...
                      </td>
                    </tr>
                  ) : serializedItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        No serialized instruments found.
                      </td>
                    </tr>
                  ) : (
                    serializedItems.map((item) => {
                      const statusVariant =
                        item.status === 'AVAILABLE'
                          ? 'success'
                          : item.status === 'ISSUED_INTERNAL'
                          ? 'info'
                          : item.status === 'MAINTENANCE'
                          ? 'warning'
                          : item.status === 'SOLD'
                          ? 'secondary'
                          : 'danger';

                      return (
                        <tr key={item._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-mono font-bold text-amber-500">{item.assetId}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                            {(item.product as any)?.name || 'Instrument'}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500">
                            {item.manufacturerSerial || '—'}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={statusVariant as any}>{item.status}</Badge>
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                            {item.condition}
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            {item.assignedTo || 'Unassigned / In Storage'}
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            {(item.location as any)?.name || 'Central Store'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenHistory(item.assetId)}
                              className="h-7 text-xs gap-1"
                            >
                              <History className="h-3 w-3" />
                              <span>Ledger</span>
                            </Button>
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
      )}

      {/* QUICK STOCK ADJUST MODAL (DIRECT COUNT EDIT) */}
      <Modal
        isOpen={!!adjustProduct}
        onClose={() => setAdjustProduct(null)}
        title={`Adjust Stock Count — ${adjustProduct?.name}`}
        description={`Update physical on-hand quantity for SKU: ${adjustProduct?.sku}. Changes are audited.`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveAdjust} className="space-y-4">
          {adjustError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs font-semibold text-red-500">
              {adjustError}
            </div>
          )}

          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex justify-between items-center text-xs">
            <span className="text-slate-500">Current On Hand Count:</span>
            <span className="font-extrabold text-base text-slate-900 dark:text-white">
              {adjustProduct?.stockQuantity?.onHand ?? 0} {adjustProduct?.unitOfMeasure}
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              New Verified Stock Count *
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setAdjustQuantity(Math.max(0, adjustQuantity - 1))}
                className="w-10 h-10 rounded border border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 font-bold text-slate-700 dark:text-slate-300"
              >
                -
              </button>
              <input
                type="number"
                min="0"
                required
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="flex-1 h-10 px-3 text-center text-lg font-extrabold rounded border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-amber-500"
              />
              <button
                type="button"
                onClick={() => setAdjustQuantity(adjustQuantity + 1)}
                className="w-10 h-10 rounded border border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 font-bold text-slate-700 dark:text-slate-300"
              >
                +
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Adjustment Reason
            </label>
            <input
              type="text"
              required
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
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

      {/* EDIT PRODUCT DETAILS MODAL */}
      <Modal
        isOpen={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        title={`Edit Product — ${editingProduct?.name}`}
        description="Update pricing, supplier, or product catalogue details."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveEditProduct} className="space-y-4">
          {editError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs font-semibold text-red-500">
              {editError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Product Name *"
              required
              value={editProdName}
              onChange={(e) => setEditProdName(e.target.value)}
            />
            <Input
              label="Brand / Manufacturer *"
              required
              value={editProdBrand}
              onChange={(e) => setEditProdBrand(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Model Number / Detail"
              value={editProdModel}
              onChange={(e) => setEditProdModel(e.target.value)}
            />
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Category
              </label>
              <select
                value={editProdCategory}
                onChange={(e) => setEditProdCategory(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <Input
              label="Low Stock Alert Threshold"
              type="number"
              min="1"
              value={editProdThreshold}
              onChange={(e) => setEditProdThreshold(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Preferred Supplier
            </label>
            <select
              value={editProdSupplier}
              onChange={(e) => setEditProdSupplier(e.target.value)}
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            >
              <option value="">No Supplier Assigned</option>
              {suppliers.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setEditingProduct(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="default" isLoading={isEditingSaving} className="font-bold">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* ADD NEW PRODUCT MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Product to Catalogue"
        description="Register a musical instrument, studio accessory, or bulk consumable."
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs font-semibold text-red-500">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Product Name *"
              required
              placeholder="e.g. Yamaha F310 Acoustic Guitar"
              value={newProdName}
              onChange={(e) => setNewProdName(e.target.value)}
            />
            <Input
              label="SKU Code *"
              required
              placeholder="e.g. GTR-YAM-F310"
              value={newProdSku}
              onChange={(e) => setNewProdSku(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Brand *"
              required
              placeholder="e.g. Yamaha, Fender, Shure"
              value={newProdBrand}
              onChange={(e) => setNewProdBrand(e.target.value)}
            />
            <Input
              label="Model"
              placeholder="e.g. F310"
              value={newProdModel}
              onChange={(e) => setNewProdModel(e.target.value)}
            />
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Category *
              </label>
              <select
                required
                value={newProdCategory}
                onChange={(e) => setNewProdCategory(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Tracking Mode *
              </label>
              <select
                value={newProdTracking}
                onChange={(e) => setNewProdTracking(e.target.value as any)}
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-semibold text-amber-500"
              >
                <option value="QUANTITY">Quantity-Based (Bulk/Accessories)</option>
                <option value="SERIALIZED">Serialized (Distinct Instruments)</option>
              </select>
            </div>

            <Input
              label="Purchase Cost (₹) *"
              type="number"
              min="0"
              required
              placeholder="e.g. 7200"
              value={newProdCost}
              onChange={(e) => setNewProdCost(e.target.value)}
            />

            <Input
              label="Selling Price (₹) *"
              type="number"
              min="0"
              required
              placeholder="e.g. 10490"
              value={newProdPrice}
              onChange={(e) => setNewProdPrice(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
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
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                <option value="">Select Supplier</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Low Stock Alert Threshold"
              type="number"
              min="1"
              value={newProdThreshold}
              onChange={(e) => setNewProdThreshold(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="default" isLoading={isSaving} className="font-bold">
              Save Product
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

      {/* Serialized Item Transaction History Modal */}
      <Modal
        isOpen={!!historyItem}
        onClose={() => setHistoryItem(null)}
        title={`Audit History — Asset ${historyItem?.item?.assetId}`}
        description={`${historyItem?.item?.product?.name || ''} (Serial: ${historyItem?.item?.manufacturerSerial || 'N/A'})`}
        maxWidth="2xl"
      >
        {historyItem && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-xs">
              <div>
                <span className="text-slate-500">Current Status:</span>{' '}
                <span className="font-bold text-amber-500">{historyItem.item.status}</span>
              </div>
              <div>
                <span className="text-slate-500">Condition:</span>{' '}
                <span className="font-bold text-slate-900 dark:text-white">
                  {historyItem.item.condition}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Cost:</span>{' '}
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatCurrency(historyItem.item.unitCost)}
                </span>
              </div>
            </div>

            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Movement History Ledger ({historyItem.movements?.length || 0})
            </h4>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {historyItem.movements && historyItem.movements.length > 0 ? (
                historyItem.movements.map((m: any) => (
                  <div
                    key={m._id}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs space-y-1 bg-white dark:bg-slate-950"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-amber-500">{m.transactionRef}</span>
                      <span className="text-slate-400">{formatDate(m.createdAt)}</span>
                    </div>
                    <div className="text-slate-700 dark:text-slate-300 font-medium">{m.reason}</div>
                    <div className="flex gap-4 text-[11px] text-slate-500">
                      <span>Type: {m.movementType}</span>
                      {m.sourceStatus && m.destinationStatus && (
                        <span>
                          Status: {m.sourceStatus} → {m.destinationStatus}
                        </span>
                      )}
                      <span>By: {m.performedBy?.name || 'System'}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">No historical movements on record.</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
