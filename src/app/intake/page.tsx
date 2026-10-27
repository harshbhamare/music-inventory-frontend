'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Purchase, PurchaseReceipt, Supplier, Product, StockLocation, Category } from '@/lib/types';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import {
  Truck,
  Plus,
  PackageCheck,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Building2,
  Boxes,
  Trash2,
  PackagePlus,
  Calculator,
  Tag,
  Palette,
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

interface ReceiveItemLine {
  product: string;
  quantity: number;
  unitCost: number;
  serializedUnits: Array<{
    assetId: string;
    manufacturerSerial: string;
    condition: string;
  }>;
}

export default function IntakePage() {
  const { canReceiveStock } = useAuth();
  const [activeTab, setActiveTab] = useState<'receipts' | 'orders'>('receipts');

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [receipts, setReceipts] = useState<PurchaseReceipt[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // UNIFIED SEAMLESS "RECEIVE STOCK" MODAL STATE
  const [isReceiveStockModalOpen, setIsReceiveStockModalOpen] = useState(false);
  const [receiveSupplier, setReceiveSupplier] = useState('');
  const [receiveLocation, setReceiveLocation] = useState('');
  const [receiveInvoiceRef, setReceiveInvoiceRef] = useState('');
  const [receiveNotes, setReceiveNotes] = useState('');
  const [receiveLines, setReceiveLines] = useState<ReceiveItemLine[]>([
    { product: '', quantity: 1, unitCost: 0, serializedUnits: [] },
  ]);
  const [receiveStockError, setReceiveStockError] = useState('');
  const [isSubmittingReceive, setIsSubmittingReceive] = useState(false);

  // INLINE QUICK ADD PRODUCT MODAL (inside Receive Stock)
  const [isQuickProductOpen, setIsQuickProductOpen] = useState(false);
  const [targetLineIndex, setTargetLineIndex] = useState<number>(0);
  const [newProdName, setNewProdName] = useState('');
  const [newProdBrand, setNewProdBrand] = useState('Stereobliss');
  const [newProdModel, setNewProdModel] = useState('');
  const [newProdColor, setNewProdColor] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('');
  const [newProdTrackingMode, setNewProdTrackingMode] = useState<'QUANTITY' | 'SERIALIZED'>('SERIALIZED');
  const [newProdCost, setNewProdCost] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdHsn, setNewProdHsn] = useState('9202');
  const [quickProdError, setQuickProdError] = useState('');
  const [isSavingQuickProd, setIsSavingQuickProd] = useState(false);

  // INLINE QUICK ADD SUPPLIER MODAL
  const [isQuickSupplierOpen, setIsQuickSupplierOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierContact, setNewSupplierContact] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [newSupplierEmail, setNewSupplierEmail] = useState('');
  const [quickSupplierError, setQuickSupplierError] = useState('');
  const [isSavingQuickSupplier, setIsSavingQuickSupplier] = useState(false);

  // RECEIVE AGAINST LEGACY PO MODAL
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [isLegacyReceiveModalOpen, setIsLegacyReceiveModalOpen] = useState(false);
  const [legacyReceiveLines, setLegacyReceiveLines] = useState<
    Array<{
      lineId?: string;
      product: string;
      productName: string;
      trackingMode: string;
      remaining: number;
      quantityReceived: number;
      unitCost: number;
      serializedUnits: Array<{
        assetId: string;
        manufacturerSerial: string;
        condition: string;
        warrantyExpiry: string;
      }>;
    }>
  >([]);
  const [legacyReceiveError, setLegacyReceiveError] = useState('');
  const [isReceivingLegacy, setIsReceivingLegacy] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [poRes, recRes, supRes, prodRes, locRes, catRes] = await Promise.all([
        api.get<{ purchases: Purchase[] }>('/intake'),
        api.get<{ receipts: PurchaseReceipt[] }>('/intake/receipts/all'),
        api.get<{ suppliers: Supplier[] }>('/meta/suppliers'),
        api.get<{ items: Product[] }>('/products?limit=250'),
        api.get<{ locations: StockLocation[] }>('/meta/locations'),
        api.get<{ categories: Category[] }>('/meta/categories'),
      ]);

      setPurchases(poRes.purchases || []);
      setReceipts(recRes.receipts || []);
      setSuppliers(supRes.suppliers || []);
      setProducts(prodRes.items || []);
      setLocations(locRes.locations || []);
      setCategories(catRes.categories || []);

      if (locRes.locations && locRes.locations.length > 0) {
        setReceiveLocation(locRes.locations[0]._id);
      }
      if (catRes.categories && catRes.categories.length > 0 && !newProdCategory) {
        setNewProdCategory(catRes.categories[0]._id);
      }
    } catch (err) {
      console.error('Failed to load intake data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Open Unified Receive Stock Modal
  const handleOpenReceiveStockModal = () => {
    setReceiveStockError('');
    if (locations.length > 0 && !receiveLocation) {
      setReceiveLocation(locations[0]._id);
    }
    setReceiveLines([{ product: '', quantity: 1, unitCost: 0, serializedUnits: [] }]);
    setIsReceiveStockModalOpen(true);
  };

  // Line Item Handlers
  const handleAddReceiveLine = () => {
    setReceiveLines((prev) => [
      ...prev,
      { product: '', quantity: 1, unitCost: 0, serializedUnits: [] },
    ]);
  };

  const handleRemoveReceiveLine = (index: number) => {
    if (receiveLines.length > 1) {
      setReceiveLines((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleProductSelect = (index: number, productId: string) => {
    const prod = products.find((p) => p._id === productId);
    setReceiveLines((prev) => {
      const updated = [...prev];
      const line = { ...updated[index] };
      line.product = productId;
      if (prod) {
        line.unitCost = prod.purchaseCost || 0;
        // Auto-select supplier if not selected yet and product has a preferred supplier
        if (prod.supplier && !receiveSupplier) {
          const supId = typeof prod.supplier === 'string' ? prod.supplier : (prod.supplier as any)._id;
          if (supId) setReceiveSupplier(supId);
        }
        // Sync serial slots if serialized
        if (prod.trackingMode === 'SERIALIZED') {
          const slots = [];
          for (let i = 0; i < line.quantity; i++) {
            slots.push({ assetId: '', manufacturerSerial: '', condition: 'NEW' });
          }
          line.serializedUnits = slots;
        } else {
          line.serializedUnits = [];
        }
      } else {
        line.serializedUnits = [];
      }
      updated[index] = line;
      return updated;
    });
  };

  const handleQuantityChange = (index: number, qty: number) => {
    const validQty = Math.max(1, qty);
    setReceiveLines((prev) => {
      const updated = [...prev];
      const line = { ...updated[index] };
      line.quantity = validQty;
      const prod = products.find((p) => p._id === line.product);
      if (prod && prod.trackingMode === 'SERIALIZED') {
        const slots = [...line.serializedUnits];
        while (slots.length < validQty) {
          slots.push({ assetId: '', manufacturerSerial: '', condition: 'NEW' });
        }
        line.serializedUnits = slots.slice(0, validQty);
      }
      updated[index] = line;
      return updated;
    });
  };

  const handleUnitCostChange = (index: number, cost: number) => {
    setReceiveLines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], unitCost: Math.max(0, cost) };
      return updated;
    });
  };

  const handleSerialChange = (
    lineIdx: number,
    slotIdx: number,
    field: 'assetId' | 'manufacturerSerial' | 'condition',
    val: string
  ) => {
    setReceiveLines((prev) => {
      const updated = [...prev];
      const line = { ...updated[lineIdx] };
      const slots = [...line.serializedUnits];
      slots[slotIdx] = { ...slots[slotIdx], [field]: val };
      line.serializedUnits = slots;
      updated[lineIdx] = line;
      return updated;
    });
  };

  // Submit Unified Receive Stock
  const handleReceiveStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReceiveStockError('');
    setIsSubmittingReceive(true);

    try {
      if (!receiveSupplier) {
        throw new Error('Please select or add a supplier/vendor.');
      }
      const validLines = receiveLines.filter((l) => l.product && l.quantity > 0);
      if (validLines.length === 0) {
        throw new Error('Please select at least one valid product line.');
      }

      // Check serialized items
      for (const line of validLines) {
        const prod = products.find((p) => p._id === line.product);
        if (prod?.trackingMode === 'SERIALIZED') {
          if (line.serializedUnits.length !== line.quantity) {
            throw new Error(`Product ${prod.name} requires ${line.quantity} serial entries.`);
          }
        }
      }

      await api.post('/intake/quick-receive', {
        supplier: receiveSupplier,
        destinationLocation: receiveLocation || locations[0]?._id,
        invoiceReference: receiveInvoiceRef.trim() || undefined,
        notes: receiveNotes.trim() || undefined,
        items: validLines.map((l) => {
          const prod = products.find((p) => p._id === l.product);
          const isSerialized = prod?.trackingMode === 'SERIALIZED';
          return {
            product: l.product,
            quantity: l.quantity,
            unitCost: l.unitCost,
            serializedUnits: isSerialized
              ? l.serializedUnits.map((u) => ({
                  assetId: u.assetId.trim() || undefined,
                  manufacturerSerial: u.manufacturerSerial.trim() || undefined,
                  condition: u.condition || 'NEW',
                }))
              : undefined,
          };
        }),
      });

      setIsReceiveStockModalOpen(false);
      setReceiveInvoiceRef('');
      setReceiveNotes('');
      setReceiveLines([{ product: '', quantity: 1, unitCost: 0, serializedUnits: [] }]);
      setActiveTab('receipts');
      fetchData();
    } catch (err: any) {
      setReceiveStockError(err.message || 'Failed to complete stock intake.');
    } finally {
      setIsSubmittingReceive(false);
    }
  };

  // Open Quick Add Product Sub-modal
  const handleOpenQuickProduct = (lineIndex: number) => {
    setTargetLineIndex(lineIndex);
    setNewProdName('');
    setNewProdBrand('Stereobliss');
    setNewProdModel('');
    setNewProdColor('');
    setNewProdCost('');
    setNewProdPrice('');
    setNewProdHsn('9202');
    setNewProdTrackingMode('SERIALIZED');
    if (categories.length > 0 && !newProdCategory) {
      setNewProdCategory(categories[0]._id);
    }
    setQuickProdError('');
    setIsQuickProductOpen(true);
  };

  // Save Quick Add Product
  const handleSaveQuickProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) return;
    setQuickProdError('');
    setIsSavingQuickProd(true);

    try {
      const res = await api.post<{ product: Product }>('/products', {
        name: newProdName.trim(),
        brand: newProdBrand.trim() || 'Stereobliss',
        modelName: newProdModel.trim() || undefined,
        color: newProdColor.trim() || undefined,
        category: newProdCategory || categories[0]?._id,
        trackingMode: newProdTrackingMode,
        purchaseCost: parseFloat(newProdCost) || 0,
        defaultSellingPrice: parseFloat(newProdPrice) || 0,
        hsnCode: newProdHsn.trim() || '9202',
        supplier: receiveSupplier || undefined,
        initialStock: 0, // Stock will be received via this intake!
      });

      const created = res.product;
      setProducts((prev) => [created, ...prev]);

      // Immediately select this product in the active line
      handleProductSelect(targetLineIndex, created._id);
      setIsQuickProductOpen(false);
    } catch (err: any) {
      setQuickProdError(err.message || 'Failed to create product.');
    } finally {
      setIsSavingQuickProd(false);
    }
  };

  // Quick Supplier Creation
  const handleSaveQuickSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickSupplierError('');
    setIsSavingQuickSupplier(true);

    try {
      const res = await api.post<{ supplier: Supplier }>('/meta/suppliers', {
        name: newSupplierName.trim(),
        contactPerson: newSupplierContact.trim() || undefined,
        phone: newSupplierPhone.trim() || undefined,
        email: newSupplierEmail.trim().toLowerCase() || undefined,
      });

      const created = res.supplier;
      setSuppliers((prev) => [...prev, created]);
      setReceiveSupplier(created._id);

      setIsQuickSupplierOpen(false);
      setNewSupplierName('');
      setNewSupplierContact('');
      setNewSupplierPhone('');
      setNewSupplierEmail('');
    } catch (err: any) {
      setQuickSupplierError(err.message || 'Failed to add supplier.');
    } finally {
      setIsSavingQuickSupplier(false);
    }
  };

  // Legacy Receive against PO handlers
  const openLegacyReceiveModal = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    const lines = purchase.lineItems
      .filter((l) => l.quantityReceived < l.quantityOrdered)
      .map((l) => {
        const prodId = typeof l.product === 'string' ? l.product : (l.product as any)?._id;
        const prod = products.find((p) => p._id === prodId);
        const prodName =
          prod?.name || (typeof l.product === 'object' && (l.product as any)?.name) || 'Unknown Product';
        const trackingMode = prod?.trackingMode || 'QUANTITY';
        const remaining = Math.max(1, l.quantityOrdered - l.quantityReceived);
        const initialQty = remaining;

        const serializedUnits =
          trackingMode === 'SERIALIZED'
            ? Array.from({ length: initialQty }, () => ({
                assetId: '',
                manufacturerSerial: '',
                condition: 'NEW',
                warrantyExpiry: '',
              }))
            : [];

        return {
          lineId: (l as any)._id,
          product: prodId,
          productName: prodName,
          trackingMode,
          remaining,
          quantityReceived: initialQty,
          unitCost: l.unitCost,
          serializedUnits,
        };
      });

    setLegacyReceiveLines(lines);
    setLegacyReceiveError('');
    setIsLegacyReceiveModalOpen(true);
  };

  const handleLegacyReceiveQuantityChange = (index: number, qty: number) => {
    const updated = [...legacyReceiveLines];
    const item = updated[index];
    const validQty = Math.max(0, qty);
    item.quantityReceived = validQty;

    if (item.trackingMode === 'SERIALIZED') {
      const currentCount = item.serializedUnits.length;
      if (validQty > currentCount) {
        for (let i = currentCount; i < validQty; i++) {
          item.serializedUnits.push({
            assetId: '',
            manufacturerSerial: '',
            condition: 'NEW',
            warrantyExpiry: '',
          });
        }
      } else {
        item.serializedUnits = item.serializedUnits.slice(0, validQty);
      }
    }
    setLegacyReceiveLines(updated);
  };

  const handleLegacyReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPurchase) return;
    setLegacyReceiveError('');
    setIsReceivingLegacy(true);

    try {
      const itemsToReceive = legacyReceiveLines.filter((l) => l.quantityReceived > 0);
      if (itemsToReceive.length === 0) {
        throw new Error('Please enter a quantity greater than zero to receive.');
      }

      await api.post(`/intake/${selectedPurchase._id}/receive`, {
        destinationLocation: selectedPurchase.destinationLocation?._id || locations[0]?._id,
        lineItems: itemsToReceive.map((l) => ({
          lineId: l.lineId,
          product: l.product,
          quantityReceived: l.quantityReceived,
          unitCost: l.unitCost,
          serializedUnits:
            l.trackingMode === 'SERIALIZED'
              ? l.serializedUnits.map((u) => ({
                  assetId: u.assetId.trim() || undefined,
                  manufacturerSerial: u.manufacturerSerial.trim() || undefined,
                  condition: u.condition,
                  warrantyExpiry: u.warrantyExpiry || undefined,
                }))
              : undefined,
        })),
        idempotencyKey: `rcp-${Date.now()}`,
      });

      setIsLegacyReceiveModalOpen(false);
      fetchData();
    } catch (err: any) {
      setLegacyReceiveError(err.message || 'Failed to process receipt.');
    } finally {
      setIsReceivingLegacy(false);
    }
  };

  // Total calculation for current Receive Stock modal
  const totalReceiveQty = receiveLines.reduce((acc, l) => acc + (l.quantity || 0), 0);
  const totalReceiveAmount = receiveLines.reduce((acc, l) => acc + (l.quantity || 0) * (l.unitCost || 0), 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo size="md" variant="badge" className="shadow-xs shrink-0" />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Stock Intake & Receiving
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Stereobliss Retail — Solo seamless stock intake, supplier shipments, and goods receipt register.
            </p>
          </div>
        </div>

        {/* Solo Seamless Button */}
        {canReceiveStock() && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={handleOpenReceiveStockModal}
              className="gap-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-sm px-4 h-9"
            >
              <PackageCheck className="h-4 w-4" />
              <span>Receive Stock</span>
            </Button>
          </div>
        )}
      </div>

      {/* Primary Tab Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('receipts')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'receipts'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <PackageCheck className="h-4 w-4" />
          <span>Stock Intake Receipts</span>
          <span className="ml-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-bold text-slate-600 dark:text-slate-400">
            {receipts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'orders'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Truck className="h-4 w-4" />
          <span>Purchase Orders Archive</span>
          <span className="ml-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-bold text-slate-600 dark:text-slate-400">
            {purchases.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Receipts (Primary View) */}
      {activeTab === 'receipts' && (
        <Card>
          <CardContent className="p-0">
            <div className="responsive-table-wrapper">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Receipt Number</th>
                    <th className="py-3 px-4">Received Date</th>
                    <th className="py-3 px-4">Destination Branch</th>
                    <th className="py-3 px-4">Items Received</th>
                    <th className="py-3 px-4 text-right">Intake Value</th>
                    <th className="py-3 px-4">Received By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Loading receipts...
                      </td>
                    </tr>
                  ) : receipts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        <PackageCheck className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                        <p className="text-sm font-medium">No stock receipts recorded yet.</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Click <strong>&quot;Receive Stock&quot;</strong> above to record your first supplier shipment.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    receipts.map((rcp) => {
                      const totalValue = rcp.lineItems.reduce(
                        (sum, li) => sum + (li.quantityReceived || 0) * (li.unitCost || 0),
                        0
                      );
                      return (
                        <tr key={rcp._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-mono font-bold text-amber-500">{rcp.receiptNumber}</td>
                          <td className="py-3 px-4 text-slate-500">{formatDate(rcp.receivedDate)}</td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                            {rcp.destinationLocation?.name || 'Main Branch'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              {rcp.lineItems.map((l, i) => (
                                <div key={i} className="text-slate-900 dark:text-slate-100 font-medium">
                                  • {typeof l.product === 'object' ? (l.product as any).name : 'Product'}:{' '}
                                  <span className="font-bold text-amber-500">{l.quantityReceived}</span> units
                                  {l.unitCost ? ` @ ${formatCurrency(l.unitCost)}` : ''}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                            {totalValue > 0 ? formatCurrency(totalValue) : '—'}
                          </td>
                          <td className="py-3 px-4 text-slate-500">{rcp.receivedBy?.name || 'Staff'}</td>
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

      {/* Tab 2: Orders (Archive & Receiving against PO) */}
      {activeTab === 'orders' && (
        <Card>
          <CardContent className="p-0">
            <div className="responsive-table-wrapper">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">PO Number</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4">Order Date</th>
                    <th className="py-3 px-4">Ordered Items</th>
                    <th className="py-3 px-4">Total Value</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Loading purchase orders...
                      </td>
                    </tr>
                  ) : purchases.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <Truck className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                        <p className="text-sm font-medium">No purchase orders found.</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Use <strong>&quot;Receive Stock&quot;</strong> to directly intake incoming shipments.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    purchases.map((po) => {
                      const totalOrdered = po.lineItems.reduce((acc, l) => acc + l.quantityOrdered, 0);
                      const totalReceived = po.lineItems.reduce((acc, l) => acc + l.quantityReceived, 0);
                      const isComplete = po.status === 'COMPLETED';

                      return (
                        <tr key={po._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                            {po.purchaseOrderNumber}
                            {po.invoiceReference && (
                              <div className="text-[10px] text-slate-400 font-normal">
                                Ref: {po.invoiceReference}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                            <div className="font-semibold">{po.supplier?.name || 'Unknown Supplier'}</div>
                            {po.supplier?.contactPerson && (
                              <div className="text-[10px] text-slate-400">{po.supplier.contactPerson}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-500">{formatDate(po.createdAt)}</td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {totalReceived} of {totalOrdered} received
                            </span>
                            <div className="w-24 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
                              <div
                                className={`h-full ${isComplete ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                style={{
                                  width: `${Math.min(100, (totalReceived / (totalOrdered || 1)) * 100)}%`,
                                }}
                              />
                            </div>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                            {formatCurrency(po.totalCost ?? (po as any).totalAmount ?? 0)}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={
                                isComplete
                                  ? 'success'
                                  : po.status === 'PARTIALLY_RECEIVED'
                                  ? 'warning'
                                  : 'secondary'
                              }
                            >
                              {po.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {!isComplete && canReceiveStock() && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => openLegacyReceiveModal(po)}
                                className="h-7 text-xs font-semibold gap-1"
                              >
                                <span>Receive</span>
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                            )}
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

      {/* ========================================================================= */}
      {/* UNIFIED SEAMLESS "RECEIVE STOCK" MODAL                                     */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isReceiveStockModalOpen}
        onClose={() => setIsReceiveStockModalOpen(false)}
        title="Receive Stock Intake"
        description="Record vendor delivery directly into inventory. Credit physical units, serials, and valuation seamlessly."
        maxWidth="4xl"
      >
        <form onSubmit={handleReceiveStockSubmit} className="space-y-5">
          {receiveStockError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs font-semibold text-red-500">
              {receiveStockError}
            </div>
          )}

          {/* Supplier, Location & Bill Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Supplier / Vendor *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setQuickSupplierError('');
                    setIsQuickSupplierOpen(true);
                  }}
                  className="text-xs font-bold text-amber-500 hover:text-amber-600 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>New</span>
                </button>
              </div>
              <select
                required
                value={receiveSupplier}
                onChange={(e) => setReceiveSupplier(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium"
              >
                <option value="">-- Select Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} {s.contactPerson ? `(${s.contactPerson})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Invoice / Challan Ref #
              </label>
              <input
                type="text"
                placeholder="e.g. INV-2026-9021"
                value={receiveInvoiceRef}
                onChange={(e) => setReceiveInvoiceRef(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Receiving Branch / Outlet
              </label>
              <select
                value={receiveLocation}
                onChange={(e) => setReceiveLocation(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium"
              >
                {locations.map((loc) => (
                  <option key={loc._id} value={loc._id}>
                    {loc.name} ({loc.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Received Product Lines */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Boxes className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Products Being Received ({receiveLines.length})
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddReceiveLine}
                className="h-8 text-xs font-bold gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Another Product</span>
              </Button>
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {receiveLines.map((line, idx) => {
                const prod = products.find((p) => p._id === line.product);
                const isSerialized = prod?.trackingMode === 'SERIALIZED';
                const lineTotal = (line.quantity || 0) * (line.unitCost || 0);

                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3 shadow-xs"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                      {/* Product Selector with inline "+ New Product" button */}
                      <div className="sm:col-span-6 space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                            Product #{idx + 1} *
                          </label>
                          <button
                            type="button"
                            onClick={() => handleOpenQuickProduct(idx)}
                            className="text-[11px] font-bold text-amber-500 hover:text-amber-600 flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                            <span>+ Create New Product</span>
                          </button>
                        </div>

                        <select
                          required
                          value={line.product}
                          onChange={(e) => handleProductSelect(idx, e.target.value)}
                          className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-medium"
                        >
                          <option value="">-- Choose Product from Catalogue --</option>
                          {products.map((p) => (
                            <option key={p._id} value={p._id}>
                              {p.name} {p.color ? `[${p.color}] ` : ''}({p.sku}) — {p.trackingMode}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                          Qty Received *
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={line.quantity}
                          onChange={(e) => handleQuantityChange(idx, parseInt(e.target.value, 10) || 1)}
                          className="w-full h-9 px-2 text-xs font-bold text-center rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-amber-500"
                        />
                      </div>

                      {/* Unit Cost */}
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                          Unit Cost (₹) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={line.unitCost}
                          onChange={(e) => handleUnitCostChange(idx, parseFloat(e.target.value) || 0)}
                          className="w-full h-9 px-2 text-xs font-semibold text-right rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950"
                        />
                      </div>

                      {/* Line Total & Remove */}
                      <div className="sm:col-span-2 flex items-center justify-between gap-2">
                        <div className="text-right flex-1">
                          <span className="text-[10px] text-slate-400 block">Total</span>
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                            {formatCurrency(lineTotal)}
                          </span>
                        </div>
                        {receiveLines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveReceiveLine(idx)}
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded cursor-pointer"
                            title="Remove this line"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Serialized Slots (if product is serialized) */}
                    {isSerialized && line.quantity > 0 && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-amber-600 dark:text-amber-400">
                            Physical Serialized Units ({line.quantity} units to register):
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            AST Asset IDs auto-generate if left blank
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                          {line.serializedUnits.map((u, uIdx) => (
                            <div
                              key={uIdx}
                              className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs"
                            >
                              <input
                                type="text"
                                placeholder={`Unit #${uIdx + 1} AST ID (Auto)`}
                                value={u.assetId}
                                onChange={(e) => handleSerialChange(idx, uIdx, 'assetId', e.target.value)}
                                className="h-7 px-2 rounded border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 uppercase font-mono text-[10px]"
                              />
                              <input
                                type="text"
                                placeholder="Mfr Serial Number"
                                value={u.manufacturerSerial}
                                onChange={(e) =>
                                  handleSerialChange(idx, uIdx, 'manufacturerSerial', e.target.value)
                                }
                                className="h-7 px-2 rounded border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-mono text-[10px]"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Intake Summary Card */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-amber-500/5 dark:bg-amber-500/10">
            <div className="flex items-center gap-6 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <div>
                Product Lines: <strong className="text-slate-900 dark:text-white">{receiveLines.length}</strong>
              </div>
              <div>
                Total Units: <strong className="text-amber-500 text-sm font-extrabold">{totalReceiveQty}</strong>
              </div>
              <div>
                Total Shipment Value:{' '}
                <strong className="text-slate-900 dark:text-white text-sm font-extrabold">
                  {formatCurrency(totalReceiveAmount)}
                </strong>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => setIsReceiveStockModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                isLoading={isSubmittingReceive}
                className="font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md gap-1.5 px-4"
              >
                <PackageCheck className="h-4 w-4" />
                <span>Confirm & Receive Stock</span>
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* INLINE QUICK ADD PRODUCT MODAL (WITH HSN CODE!)                           */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isQuickProductOpen}
        onClose={() => setIsQuickProductOpen(false)}
        title="Add New Product to Catalogue"
        description="Quickly define a new instrument or accessory that arrived from your supplier."
        maxWidth="lg"
        zIndex={70}
      >
        <form onSubmit={handleSaveQuickProduct} className="space-y-4">
          {quickProdError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 text-xs font-semibold text-red-500">
              {quickProdError}
            </div>
          )}

          <Input
            label="Product Title / Name *"
            required
            placeholder="e.g. Yamaha F310 Acoustic Guitar"
            value={newProdName}
            onChange={(e) => setNewProdName(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Brand *
              </label>
              <input
                type="text"
                required
                value={newProdBrand}
                onChange={(e) => setNewProdBrand(e.target.value)}
                placeholder="Stereobliss, Yamaha, Fender"
                className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-medium"
              />
              <div className="flex flex-wrap gap-1 pt-1">
                {POPULAR_BRANDS.slice(0, 5).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setNewProdBrand(b)}
                    className="text-[10px] px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-amber-500 cursor-pointer"
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Category *
              </label>
              <select
                required
                value={newProdCategory}
                onChange={(e) => setNewProdCategory(e.target.value)}
                className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-medium"
              >
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Model / Series"
              placeholder="e.g. F310"
              value={newProdModel}
              onChange={(e) => setNewProdModel(e.target.value)}
            />
            <Input
              label="Colour / Finish"
              placeholder="e.g. Sunburst, Black"
              value={newProdColor}
              onChange={(e) => setNewProdColor(e.target.value)}
            />
            {/* HSN CODE INPUT IN PRODUCT CREATION */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                HSN / SAC Code *
              </label>
              <input
                type="text"
                required
                placeholder="9202"
                value={newProdHsn}
                onChange={(e) => setNewProdHsn(e.target.value)}
                className="w-full h-10 px-3 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-amber-500"
              />
            </div>
          </div>

          {/* Tracking Mode Card Switch */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Inventory Tracking Mode
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setNewProdTrackingMode('SERIALIZED')}
                className={cn(
                  'p-2 rounded-lg border text-left cursor-pointer transition-all',
                  newProdTrackingMode === 'SERIALIZED'
                    ? 'border-amber-500 bg-amber-500/10 font-bold text-amber-600 dark:text-amber-400'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300'
                )}
              >
                🎸 Serialized Unit (AST Tags)
              </button>
              <button
                type="button"
                onClick={() => setNewProdTrackingMode('QUANTITY')}
                className={cn(
                  'p-2 rounded-lg border text-left cursor-pointer transition-all',
                  newProdTrackingMode === 'QUANTITY'
                    ? 'border-amber-500 bg-amber-500/10 font-bold text-amber-600 dark:text-amber-400'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300'
                )}
              >
                📦 Bulk Quantity (Packs/Pieces)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Purchase Cost (₹) *"
              type="number"
              min="0"
              required
              placeholder="e.g. 8500"
              value={newProdCost}
              onChange={(e) => setNewProdCost(e.target.value)}
            />
            <Input
              label="Selling Price (₹) *"
              type="number"
              min="0"
              required
              placeholder="e.g. 11000"
              value={newProdPrice}
              onChange={(e) => setNewProdPrice(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsQuickProductOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="default" isLoading={isSavingQuickProd} className="font-bold">
              Save & Select in Intake
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* INLINE QUICK ADD SUPPLIER MODAL                                           */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isQuickSupplierOpen}
        onClose={() => setIsQuickSupplierOpen(false)}
        title="Add New Supplier"
        description="Register a new supplier or distributor. It will be immediately selected."
        maxWidth="md"
        zIndex={70}
      >
        <form onSubmit={handleSaveQuickSupplier} className="space-y-4">
          {quickSupplierError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 text-xs font-semibold text-red-500">
              {quickSupplierError}
            </div>
          )}

          <Input
            label="Supplier Company Name *"
            required
            placeholder="e.g. Furtados, Yamaha, Local Distributor"
            value={newSupplierName}
            onChange={(e) => setNewSupplierName(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Contact Person"
              placeholder="e.g. David"
              value={newSupplierContact}
              onChange={(e) => setNewSupplierContact(e.target.value)}
            />
            <Input
              label="Phone Number"
              placeholder="+91 98200 12345"
              value={newSupplierPhone}
              onChange={(e) => setNewSupplierPhone(e.target.value)}
            />
          </div>

          <Input
            label="Email Address"
            type="email"
            placeholder="orders@supplier.com"
            value={newSupplierEmail}
            onChange={(e) => setNewSupplierEmail(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsQuickSupplierOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="default" isLoading={isSavingQuickSupplier} className="font-bold">
              Save & Select Supplier
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* LEGACY RECEIVE AGAINST PO MODAL                                           */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isLegacyReceiveModalOpen}
        onClose={() => setIsLegacyReceiveModalOpen(false)}
        title={`Receive Goods — ${selectedPurchase?.purchaseOrderNumber}`}
        description="Verify or adjust quantities received against purchase order."
        maxWidth="4xl"
      >
        <form onSubmit={handleLegacyReceiveSubmit} className="space-y-6">
          {legacyReceiveError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs font-semibold text-red-500">
              {legacyReceiveError}
            </div>
          )}

          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
            {legacyReceiveLines.map((line, idx) => (
              <div
                key={line.lineId || `${line.product}-${idx}`}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {line.productName}
                    </span>
                    <div className="text-xs text-slate-500">
                      Remaining Expected: <strong>{line.remaining}</strong> units | Mode:{' '}
                      <span className="font-semibold text-amber-500">{line.trackingMode}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      Receiving Count:
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={line.quantityReceived}
                      onChange={(e) =>
                        handleLegacyReceiveQuantityChange(idx, parseInt(e.target.value, 10) || 0)
                      }
                      className="w-24 h-9 px-2 text-sm font-extrabold text-center rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-amber-500"
                    />
                  </div>
                </div>

                {/* If Serialized, render per-unit fields */}
                {line.trackingMode === 'SERIALIZED' && line.quantityReceived > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Serialized Instrument Units ({line.quantityReceived})
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {line.serializedUnits.map((unit, uIdx) => (
                        <div
                          key={uIdx}
                          className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-2 text-xs"
                        >
                          <div className="flex justify-between items-center text-slate-500 font-semibold">
                            <span>Unit #{uIdx + 1}</span>
                            <span className="text-[10px]">Leave Asset ID empty for auto-generation</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="Asset ID (Auto if blank)"
                              value={unit.assetId}
                              onChange={(e) => {
                                const updated = [...legacyReceiveLines];
                                updated[idx].serializedUnits[uIdx].assetId = e.target.value;
                                setLegacyReceiveLines(updated);
                              }}
                              className="h-8 px-2 rounded border border-slate-300 dark:border-slate-800 bg-transparent uppercase font-mono text-[11px]"
                            />

                            <input
                              type="text"
                              placeholder="Mfr Serial No."
                              value={unit.manufacturerSerial}
                              onChange={(e) => {
                                const updated = [...legacyReceiveLines];
                                updated[idx].serializedUnits[uIdx].manufacturerSerial = e.target.value;
                                setLegacyReceiveLines(updated);
                              }}
                              className="h-8 px-2 rounded border border-slate-300 dark:border-slate-800 bg-transparent font-mono text-[11px]"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsLegacyReceiveModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="default" isLoading={isReceivingLegacy} className="font-bold">
              Confirm Receipt & Update Inventory
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
