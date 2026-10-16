'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Purchase, PurchaseReceipt, Supplier, Product, StockLocation } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
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
  Zap,
  Building2,
  Boxes,
} from 'lucide-react';

export default function IntakePage() {
  const { canReceiveStock } = useAuth();
  const [activeTab, setActiveTab] = useState<'orders' | 'receipts'>('orders');

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [receipts, setReceipts] = useState<PurchaseReceipt[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Quick Direct Stock Receive Modal
  const [isQuickReceiveOpen, setIsQuickReceiveOpen] = useState(false);
  const [quickSupplier, setQuickSupplier] = useState('');
  const [quickProduct, setQuickProduct] = useState('');
  const [quickQuantity, setQuickQuantity] = useState(1);
  const [quickUnitCost, setQuickUnitCost] = useState(0);
  const [quickInvoiceRef, setQuickInvoiceRef] = useState('');
  const [quickSerializedUnits, setQuickSerializedUnits] = useState<
    Array<{ assetId: string; manufacturerSerial: string; condition: string }>
  >([]);
  const [quickError, setQuickError] = useState('');
  const [isSubmittingQuickReceive, setIsSubmittingQuickReceive] = useState(false);

  // Inline Quick Add Supplier Modal
  const [isQuickSupplierOpen, setIsQuickSupplierOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierContact, setNewSupplierContact] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [newSupplierEmail, setNewSupplierEmail] = useState('');
  const [quickSupplierError, setQuickSupplierError] = useState('');
  const [isSavingQuickSupplier, setIsSavingQuickSupplier] = useState(false);

  // Purchase Order Modal
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [orderLines, setOrderLines] = useState<Array<{ product: string; quantityOrdered: number; unitCost: number }>>([
    { product: '', quantityOrdered: 1, unitCost: 0 },
  ]);
  const [orderError, setOrderError] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Receive against PO Modal
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [receiveLines, setReceiveLines] = useState<
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
  const [receiveError, setReceiveError] = useState('');
  const [isReceiving, setIsReceiving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [poRes, recRes, supRes, prodRes, locRes] = await Promise.all([
        api.get<{ purchases: Purchase[] }>('/intake'),
        api.get<{ receipts: PurchaseReceipt[] }>('/intake/receipts/all'),
        api.get<{ suppliers: Supplier[] }>('/meta/suppliers'),
        api.get<{ items: Product[] }>('/products?limit=100'),
        api.get<{ locations: StockLocation[] }>('/meta/locations'),
      ]);

      setPurchases(poRes.purchases || []);
      setReceipts(recRes.receipts || []);
      setSuppliers(supRes.suppliers || []);
      setProducts(prodRes.items || []);
      setLocations(locRes.locations || []);

      if (locRes.locations && locRes.locations.length > 0) {
        setSelectedLocation(locRes.locations[0]._id);
      }
    } catch (err) {
      console.error('Failed to load intake data:', err);
    } finally {
      setIsLoading(false);
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
      setQuickSupplier(created._id);
      setSelectedSupplier(created._id);

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

  // Quick Receive Product Select
  const handleQuickProductSelect = (productId: string) => {
    setQuickProduct(productId);
    const prod = products.find((p) => p._id === productId);
    if (prod) {
      setQuickUnitCost(prod.purchaseCost || 0);
      if (prod.supplier) {
        setQuickSupplier(typeof prod.supplier === 'string' ? prod.supplier : (prod.supplier as any)._id);
      }
      updateQuickSerializedSlots(quickQuantity, prod.trackingMode);
    }
  };

  // Quick Receive Quantity Change
  const handleQuickQuantityChange = (qty: number) => {
    const validQty = Math.max(1, qty);
    setQuickQuantity(validQty);
    const prod = products.find((p) => p._id === quickProduct);
    if (prod) {
      updateQuickSerializedSlots(validQty, prod.trackingMode);
    }
  };

  const updateQuickSerializedSlots = (qty: number, mode: string) => {
    if (mode === 'SERIALIZED') {
      setQuickSerializedUnits((prev) => {
        const slots = [...prev];
        while (slots.length < qty) {
          slots.push({ assetId: '', manufacturerSerial: '', condition: 'NEW' });
        }
        return slots.slice(0, qty);
      });
    } else {
      setQuickSerializedUnits([]);
    }
  };

  // Submit Quick Direct Receive
  const handleQuickReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickError('');
    setIsSubmittingQuickReceive(true);

    try {
      if (!quickSupplier) {
        throw new Error('Please select or add a supplier.');
      }
      if (!quickProduct) {
        throw new Error('Please select a product.');
      }
      if (quickQuantity < 1) {
        throw new Error('Quantity must be at least 1.');
      }

      const prod = products.find((p) => p._id === quickProduct);
      const isSerialized = prod?.trackingMode === 'SERIALIZED';

      await api.post('/intake/quick-receive', {
        supplier: quickSupplier,
        destinationLocation: locations[0]?._id,
        invoiceReference: quickInvoiceRef.trim() || undefined,
        items: [
          {
            product: quickProduct,
            quantity: quickQuantity,
            unitCost: quickUnitCost,
            serializedUnits: isSerialized
              ? quickSerializedUnits.map((u) => ({
                  assetId: u.assetId.trim() || undefined,
                  manufacturerSerial: u.manufacturerSerial.trim() || undefined,
                  condition: u.condition || 'NEW',
                }))
              : undefined,
          },
        ],
      });

      setIsQuickReceiveOpen(false);
      setQuickProduct('');
      setQuickQuantity(1);
      setQuickUnitCost(0);
      setQuickInvoiceRef('');
      setQuickSerializedUnits([]);
      fetchData();
    } catch (err: any) {
      setQuickError(err.message || 'Failed to process stock intake.');
    } finally {
      setIsSubmittingQuickReceive(false);
    }
  };

  // PO handlers
  const handleAddOrderLine = () => {
    setOrderLines([...orderLines, { product: '', quantityOrdered: 1, unitCost: 0 }]);
  };

  const handleRemoveOrderLine = (index: number) => {
    if (orderLines.length > 1) {
      setOrderLines(orderLines.filter((_, i) => i !== index));
    }
  };

  const handleProductSelect = (index: number, productId: string) => {
    const prod = products.find((p) => p._id === productId);
    const updated = [...orderLines];
    updated[index].product = productId;
    if (prod) {
      updated[index].unitCost = prod.purchaseCost;
    }
    setOrderLines(updated);
  };

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderError('');
    setIsSubmittingOrder(true);

    try {
      const validLines = orderLines.filter((l) => l.product && l.quantityOrdered > 0);
      if (validLines.length === 0) {
        throw new Error('Please select at least one valid product line.');
      }

      await api.post('/intake', {
        supplier: selectedSupplier,
        destinationLocation: selectedLocation,
        invoiceReference: invoiceRef.trim() || undefined,
        lineItems: validLines,
      });

      setIsOrderModalOpen(false);
      setInvoiceRef('');
      setOrderLines([{ product: '', quantityOrdered: 1, unitCost: 0 }]);
      fetchData();
    } catch (err: any) {
      setOrderError(err.message || 'Failed to create purchase order.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const openReceiveModal = (purchase: Purchase) => {
    setSelectedPurchase(purchase);

    const lines = purchase.lineItems
      .filter((l) => l.quantityReceived < l.quantityOrdered)
      .map((l) => {
        const prodId = typeof l.product === 'string' ? l.product : (l.product as any)?._id;
        const prod = products.find((p) => p._id === prodId);
        const prodName = prod?.name || (typeof l.product === 'object' && (l.product as any)?.name) || 'Unknown Product';
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

    setReceiveLines(lines);
    setReceiveError('');
    setIsReceiveModalOpen(true);
  };

  // Editable count without restrictive clamp!
  const handleQuantityReceivedChange = (index: number, qty: number) => {
    const updated = [...receiveLines];
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

    setReceiveLines(updated);
  };

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPurchase) return;
    setReceiveError('');
    setIsReceiving(true);

    try {
      const itemsToReceive = receiveLines.filter((l) => l.quantityReceived > 0);
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

      setIsReceiveModalOpen(false);
      fetchData();
    } catch (err: any) {
      setReceiveError(err.message || 'Failed to process receipt.');
    } finally {
      setIsReceiving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Stock Intake & Receiving
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Receive instrument shipments, add new vendor stock, or manage purchase orders.
          </p>
        </div>

        {canReceiveStock() && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={() => {
                setIsQuickReceiveOpen(true);
                setQuickError('');
              }}
              className="gap-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-sm"
            >
              <Zap className="h-4 w-4" />
              <span>Quick Receive Stock</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsOrderModalOpen(true)}
              className="gap-1.5 text-xs font-semibold"
            >
              <Plus className="h-4 w-4" />
              <span>New PO Document</span>
            </Button>
          </div>
        )}
      </div>

      {/* Primary Tab Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'orders'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Truck className="h-4 w-4" />
          <span>Purchase Orders</span>
          <span className="ml-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-bold text-slate-600 dark:text-slate-400">
            {purchases.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('receipts')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'receipts'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <PackageCheck className="h-4 w-4" />
          <span>Completed Goods Receipts</span>
          <span className="ml-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-bold text-slate-600 dark:text-slate-400">
            {receipts.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Orders */}
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
                          Use <strong>&quot;Quick Receive Stock&quot;</strong> to directly add items to inventory.
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
                                onClick={() => openReceiveModal(po)}
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

      {/* Tab 2: Completed Receipts */}
      {activeTab === 'receipts' && (
        <Card>
          <CardContent className="p-0">
            <div className="responsive-table-wrapper">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Receipt Number</th>
                    <th className="py-3 px-4">Received Date</th>
                    <th className="py-3 px-4">Destination Location</th>
                    <th className="py-3 px-4">Items Received</th>
                    <th className="py-3 px-4">Received By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        Loading receipts...
                      </td>
                    </tr>
                  ) : receipts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        No goods receipts logged yet.
                      </td>
                    </tr>
                  ) : (
                    receipts.map((rcp) => (
                      <tr key={rcp._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono font-bold text-amber-500">{rcp.receiptNumber}</td>
                        <td className="py-3 px-4 text-slate-500">{formatDate(rcp.receivedDate)}</td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          {rcp.destinationLocation?.name || 'Main Store'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            {rcp.lineItems.map((l, i) => (
                              <div key={i} className="text-slate-900 dark:text-slate-100 font-medium">
                                • {typeof l.product === 'object' ? (l.product as any).name : 'Product'}:{' '}
                                <span className="font-bold text-amber-500">{l.quantityReceived}</span> units
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-500">{rcp.receivedBy?.name || 'Staff'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* QUICK DIRECT RECEIVE MODAL */}
      <Modal
        isOpen={isQuickReceiveOpen}
        onClose={() => setIsQuickReceiveOpen(false)}
        title="Quick Receive Stock"
        description="Directly add supplier delivery or new stock to inventory without multi-stage paperwork."
        maxWidth="2xl"
      >
        <form onSubmit={handleQuickReceiveSubmit} className="space-y-4">
          {quickError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs font-semibold text-red-500">
              {quickError}
            </div>
          )}

          {/* Supplier Section with inline '+ New Supplier' */}
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
                className="text-xs font-bold text-amber-500 hover:text-amber-600 flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                <span>+ Add New Supplier</span>
              </button>
            </div>

            <select
              required
              value={quickSupplier}
              onChange={(e) => setQuickSupplier(e.target.value)}
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

          {/* Product Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Product *
              </label>
              <a
                href="/inventory"
                target="_blank"
                className="text-[11px] text-slate-400 hover:text-amber-500 flex items-center gap-1"
              >
                <span>Catalogue</span>
              </a>
            </div>

            <select
              required
              value={quickProduct}
              onChange={(e) => handleQuickProductSelect(e.target.value)}
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium"
            >
              <option value="">-- Select Product from Catalogue --</option>
              {products.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} {p.color ? `[${p.color}] ` : ''}({p.sku}) — {p.trackingMode} Mode
                </option>
              ))}
            </select>
          </div>

          {/* Editable Count & Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Quantity Received *
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleQuickQuantityChange(quickQuantity - 1)}
                  className="w-8 h-10 rounded border border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 font-bold text-slate-600 dark:text-slate-300"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  required
                  value={quickQuantity}
                  onChange={(e) => handleQuickQuantityChange(parseInt(e.target.value, 10) || 1)}
                  className="flex-1 h-10 px-2 text-center text-sm font-extrabold rounded border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-amber-500"
                />
                <button
                  type="button"
                  onClick={() => handleQuickQuantityChange(quickQuantity + 1)}
                  className="w-8 h-10 rounded border border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 font-bold text-slate-600 dark:text-slate-300"
                >
                  +
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Unit Cost (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={quickUnitCost}
                onChange={(e) => setQuickUnitCost(parseFloat(e.target.value) || 0)}
                className="w-full h-10 px-3 text-sm font-semibold text-right rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Challan / Bill Ref
              </label>
              <input
                type="text"
                placeholder="e.g. INV-9021"
                value={quickInvoiceRef}
                onChange={(e) => setQuickInvoiceRef(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950"
              />
            </div>
          </div>

          {/* Serialized units if applicable */}
          {quickSerializedUnits.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Serialized Units ({quickSerializedUnits.length})
                </span>
                <span className="text-[11px] text-slate-400">
                  Asset IDs auto-generate if left blank
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {quickSerializedUnits.map((unit, uIdx) => (
                  <div
                    key={uIdx}
                    className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 grid grid-cols-2 gap-2 text-xs"
                  >
                    <input
                      type="text"
                      placeholder={`Unit #${uIdx + 1} Asset ID (Auto)`}
                      value={unit.assetId}
                      onChange={(e) => {
                        const updated = [...quickSerializedUnits];
                        updated[uIdx].assetId = e.target.value;
                        setQuickSerializedUnits(updated);
                      }}
                      className="h-8 px-2 rounded border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 uppercase font-mono text-[11px]"
                    />
                    <input
                      type="text"
                      placeholder="Manufacturer Serial No."
                      value={unit.manufacturerSerial}
                      onChange={(e) => {
                        const updated = [...quickSerializedUnits];
                        updated[uIdx].manufacturerSerial = e.target.value;
                        setQuickSerializedUnits(updated);
                      }}
                      className="h-8 px-2 rounded border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-mono text-[11px]"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsQuickReceiveOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              isLoading={isSubmittingQuickReceive}
              className="font-bold bg-amber-500 hover:bg-amber-600 text-slate-950"
            >
              Confirm Receipt & Add to Inventory
            </Button>
          </div>
        </form>
      </Modal>

      {/* INLINE QUICK ADD SUPPLIER MODAL */}
      <Modal
        isOpen={isQuickSupplierOpen}
        onClose={() => setIsQuickSupplierOpen(false)}
        title="Add New Supplier"
        description="Register a new supplier or distributor. It will be immediately selected."
        maxWidth="md"
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

      {/* CREATE PURCHASE ORDER MODAL */}
      <Modal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        title="Create Purchase Order"
        description="Issue a formal purchase order to an instrument manufacturer or vendor."
        maxWidth="2xl"
      >
        <form onSubmit={handleCreatePurchase} className="space-y-4">
          {orderError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs font-semibold text-red-500">
              {orderError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Supplier *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setQuickSupplierError('');
                    setIsQuickSupplierOpen(true);
                  }}
                  className="text-xs font-bold text-amber-500 hover:text-amber-600"
                >
                  + Add New
                </button>
              </div>
              <select
                required
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
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

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Stock Location *
              </label>
              <select
                required
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                {locations.map((loc) => (
                  <option key={loc._id} value={loc._id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="Supplier Invoice / Quote Ref"
            placeholder="e.g. INV-YAM-9921"
            value={invoiceRef}
            onChange={(e) => setInvoiceRef(e.target.value)}
          />

          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Order Line Items
              </span>
              <Button type="button" size="sm" variant="outline" onClick={handleAddOrderLine} className="h-7 text-xs">
                + Add Item
              </Button>
            </div>

            {orderLines.map((line, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <select
                  required
                  value={line.product}
                  onChange={(e) => handleProductSelect(idx, e.target.value)}
                  className="flex-1 h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950"
                >
                  <option value="">Select Product</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} {p.color ? `[${p.color}] ` : ''}({p.sku}) — {p.trackingMode}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="1"
                  required
                  placeholder="Qty"
                  value={line.quantityOrdered}
                  onChange={(e) => {
                    const updated = [...orderLines];
                    updated[idx].quantityOrdered = parseInt(e.target.value, 10) || 1;
                    setOrderLines(updated);
                  }}
                  className="w-20 h-9 px-2 text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-center font-bold"
                />

                <input
                  type="number"
                  min="0"
                  required
                  placeholder="Unit Cost"
                  value={line.unitCost}
                  onChange={(e) => {
                    const updated = [...orderLines];
                    updated[idx].unitCost = parseFloat(e.target.value) || 0;
                    setOrderLines(updated);
                  }}
                  className="w-28 h-9 px-2 text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-right"
                />

                {orderLines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOrderLine(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-500"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsOrderModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="default" isLoading={isSubmittingOrder} className="font-bold">
              Confirm Purchase Order
            </Button>
          </div>
        </form>
      </Modal>

      {/* RECEIVE GOODS AGAINST PO MODAL (WITH EDITABLE COUNT) */}
      <Modal
        isOpen={isReceiveModalOpen}
        onClose={() => setIsReceiveModalOpen(false)}
        title={`Receive Goods — ${selectedPurchase?.purchaseOrderNumber}`}
        description="Verify or adjust quantities received. Count is fully editable."
        maxWidth="4xl"
      >
        <form onSubmit={handleReceiveSubmit} className="space-y-6">
          {receiveError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs font-semibold text-red-500">
              {receiveError}
            </div>
          )}

          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
            {receiveLines.map((line, idx) => (
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
                        handleQuantityReceivedChange(idx, parseInt(e.target.value, 10) || 0)
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
                                const updated = [...receiveLines];
                                updated[idx].serializedUnits[uIdx].assetId = e.target.value;
                                setReceiveLines(updated);
                              }}
                              className="h-8 px-2 rounded border border-slate-300 dark:border-slate-800 bg-transparent uppercase font-mono text-[11px]"
                            />

                            <input
                              type="text"
                              placeholder="Mfr Serial No."
                              value={unit.manufacturerSerial}
                              onChange={(e) => {
                                const updated = [...receiveLines];
                                updated[idx].serializedUnits[uIdx].manufacturerSerial = e.target.value;
                                setReceiveLines(updated);
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
            <Button type="button" variant="outline" onClick={() => setIsReceiveModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="default" isLoading={isReceiving} className="font-bold">
              Confirm Receipt & Update Inventory
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
