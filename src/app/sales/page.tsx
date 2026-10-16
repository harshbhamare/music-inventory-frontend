'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Sale, Product, SerializedItem, StockLocation } from '@/lib/types';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import {
  ShoppingCart,
  Plus,
  Printer,
  Search,
  CheckCircle2,
  Trash2,
  Receipt,
  RotateCcw,
  Tag,
  CreditCard,
  UserCheck,
} from 'lucide-react';

export default function SalesPage() {
  const { canMakeSales } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [availableSerials, setAvailableSerials] = useState<Record<string, SerializedItem[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  // New Sale POS state
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'CASH' | 'BANK_TRANSFER'>('UPI');
  const [notes, setNotes] = useState('');

  const [cartItems, setCartItems] = useState<
    Array<{
      product: Product;
      quantity: number;
      unitPrice: number;
      discount: number;
      selectedSerialIds: string[];
    }>
  >([]);

  const [saleError, setSaleError] = useState('');
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);

  // Printable Invoice Modal
  const [activeInvoice, setActiveInvoice] = useState<Sale | null>(null);

  useEffect(() => {
    fetchSales();
    fetchInventoryForSale();
  }, []);

  const fetchSales = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{ sales: Sale[] }>('/sales');
      setSales(res.sales || []);
    } catch (err) {
      console.error('Failed to load sales:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInventoryForSale = async () => {
    try {
      const [prodRes, locRes, serialsRes] = await Promise.all([
        api.get<{ items: Product[] }>('/products?limit=100'),
        api.get<{ locations: StockLocation[] }>('/meta/locations'),
        api.get<{ items: SerializedItem[] }>('/products/serialized-items?status=AVAILABLE&limit=200'),
      ]);

      setProducts(prodRes.items || []);
      setLocations(locRes.locations || []);
      if (locRes.locations && locRes.locations.length > 0) {
        setSelectedLocation(locRes.locations[0]._id);
      }

      // Group available serials by product ID
      const grouped: Record<string, SerializedItem[]> = {};
      (serialsRes.items || []).forEach((item) => {
        const pId = item.product?._id || (item.product as any);
        if (!grouped[pId]) grouped[pId] = [];
        grouped[pId].push(item);
      });
      setAvailableSerials(grouped);
    } catch (err) {
      console.error('Failed to load inventory for sales:', err);
    }
  };

  const handleAddToCart = (product: Product) => {
    const existing = cartItems.find((ci) => ci.product._id === product._id);
    if (existing) {
      if (existing.quantity >= product.availableForSale) {
        alert(`Cannot add more. Only ${product.availableForSale} units available.`);
        return;
      }
      setCartItems(
        cartItems.map((ci) =>
          ci.product._id === product._id ? { ...ci, quantity: ci.quantity + 1 } : ci
        )
      );
    } else {
      if (product.availableForSale < 1) {
        alert('This item has 0 units available for sale.');
        return;
      }
      setCartItems([
        ...cartItems,
        {
          product,
          quantity: 1,
          unitPrice: product.defaultSellingPrice,
          discount: 0,
          selectedSerialIds: [],
        },
      ]);
    }
  };

  const handleRemoveFromCart = (productId: string) => {
    setCartItems(cartItems.filter((ci) => ci.product._id !== productId));
  };

  const handleCartItemChange = (index: number, field: string, value: any) => {
    const updated = [...cartItems];
    (updated[index] as any)[field] = value;
    setCartItems(updated);
  };

  const handleSerialToggle = (cartIndex: number, serialId: string) => {
    const updated = [...cartItems];
    const item = updated[cartIndex];
    if (item.selectedSerialIds.includes(serialId)) {
      item.selectedSerialIds = item.selectedSerialIds.filter((id) => id !== serialId);
    } else {
      if (item.selectedSerialIds.length >= item.quantity) {
        alert(`You have already selected ${item.quantity} serial units for this line.`);
        return;
      }
      item.selectedSerialIds.push(serialId);
    }
    setCartItems(updated);
  };

  const subtotal = cartItems.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
  const discountTotal = cartItems.reduce((acc, i) => acc + (i.discount || 0) * i.quantity, 0);
  const grandTotal = Math.max(0, subtotal - discountTotal);

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaleError('');

    if (cartItems.length === 0) {
      setSaleError('Cart is empty. Please add at least one product.');
      return;
    }

    // Verify serialized selections
    for (const item of cartItems) {
      if (item.product.trackingMode === 'SERIALIZED') {
        if (item.selectedSerialIds.length !== item.quantity) {
          setSaleError(
            `Please select exactly ${item.quantity} serialized instrument unit(s) for ${item.product.name}.`
          );
          return;
        }
      }
    }

    setIsSubmittingSale(true);

    try {
      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        location: selectedLocation,
        paymentMethod,
        notes: notes.trim() || undefined,
        idempotencyKey: `sale-${Date.now()}`,
        lineItems: cartItems.map((i) => ({
          product: i.product._id,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount || 0,
          serializedItemIds:
            i.product.trackingMode === 'SERIALIZED' ? i.selectedSerialIds : undefined,
        })),
      };

      const res = await api.post<{ sale: Sale }>('/sales', payload);
      setIsNewSaleOpen(false);
      setCartItems([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setNotes('');
      fetchSales();
      fetchInventoryForSale();
      setActiveInvoice(res.sale);
    } catch (err: any) {
      setSaleError(err.message || 'Failed to record customer sale.');
    } finally {
      setIsSubmittingSale(false);
    }
  };

  const printInvoice = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Sales & Point of Sale (POS)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Live stock lookup, retail sales transactions, customer invoices, and returns.
          </p>
        </div>

        {canMakeSales() && (
          <Button
            size="sm"
            variant="default"
            onClick={() => setIsNewSaleOpen(true)}
            className="gap-1.5 text-xs font-bold shadow-md"
          >
            <Plus className="h-4 w-4" />
            <span>New Customer Sale</span>
          </Button>
        )}
      </div>

      {/* Sales Transactions List */}
      <Card>
        <CardContent className="p-0">
          <div className="responsive-table-wrapper">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Invoice No</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Items Sold</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                  <th className="py-3 px-4">Sold By</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Loading sales transactions...
                    </td>
                  </tr>
                ) : sales.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      No sales recorded yet.
                    </td>
                  </tr>
                ) : (
                  sales.map((sale) => (
                    <tr key={sale._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-amber-500">
                        {sale.invoiceNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {sale.customerName}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {sale.customerPhone || 'No Phone'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {sale.paymentMethod}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={sale.saleStatus === 'CONFIRMED' ? 'success' : 'secondary'}
                          className="text-[10px]"
                        >
                          {sale.saleStatus}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          {sale.lineItems?.map((li, idx) => (
                            <div key={idx} className="text-slate-800 dark:text-slate-200">
                              • {li.product?.name} (x{li.quantity})
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-slate-900 dark:text-white">
                        {formatCurrency(sale.grandTotal)}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{sale.soldBy?.name || 'Staff'}</td>
                      <td className="py-3 px-4 text-slate-500">{formatDate(sale.createdAt)}</td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setActiveInvoice(sale)}
                          className="h-7 text-[11px] gap-1"
                        >
                          <Receipt className="h-3 w-3" />
                          <span>Invoice</span>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* POS New Customer Sale Modal */}
      <Modal
        isOpen={isNewSaleOpen}
        onClose={() => setIsNewSaleOpen(false)}
        title="Record Customer Sale (POS)"
        description="Select available products and serialized instruments, configure pricing, and confirm."
        maxWidth="4xl"
      >
        <form onSubmit={handleCreateSale} className="space-y-6">
          {saleError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs font-semibold text-red-500">
              {saleError}
            </div>
          )}

          {/* Customer Details & Payment */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <Input
              label="Customer Name *"
              required
              placeholder="e.g. Rahul Sharma"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />

            <Input
              label="Phone Number"
              placeholder="+91 98765 43210"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="rahul@example.com"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-semibold text-amber-500"
              >
                <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                <option value="CARD">Credit / Debit Card</option>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank IMPS / NEFT</option>
              </select>
            </div>
          </div>

          {/* Item Selector & Cart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Available Products Picker */}
            <div className="lg:col-span-1 space-y-3 border-r border-slate-200 dark:border-slate-800 pr-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Available Products Catalogue
              </h3>
              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                {products
                  .filter((p) => p.availableForSale > 0)
                  .map((p) => (
                    <div
                      key={p._id}
                      onClick={() => handleAddToCart(p)}
                      className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-amber-500 bg-white dark:bg-slate-950 cursor-pointer transition-colors flex justify-between items-center text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">{p.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {p.brand} | Available: <strong>{p.availableForSale}</strong>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-amber-500">
                          {formatCurrency(p.defaultSellingPrice)}
                        </div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">
                          + Add
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Right: Cart & Serialized Selection */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Sale Items ({cartItems.length})
              </h3>

              {cartItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl">
                  Click on an available product on the left to add it to this sale.
                </div>
              ) : (
                <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                  {cartItems.map((item, idx) => {
                    const isSerialized = item.product.trackingMode === 'SERIALIZED';
                    const serialsList = availableSerials[item.product._id] || [];

                    return (
                      <div
                        key={item.product._id}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3 text-xs"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {item.product.name}
                            </span>
                            <span className="ml-2 text-[10px] font-mono text-amber-500">
                              {item.product.sku}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFromCart(item.product._id)}
                            className="text-slate-400 hover:text-red-500 p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Pricing and Quantity controls */}
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-[10px] text-slate-500">Quantity</label>
                            <input
                              type="number"
                              min="1"
                              max={item.product.availableForSale}
                              value={item.quantity}
                              onChange={(e) =>
                                handleCartItemChange(
                                  idx,
                                  'quantity',
                                  parseInt(e.target.value, 10) || 1
                                )
                              }
                              className="w-full h-8 px-2 rounded border border-slate-300 dark:border-slate-800 bg-transparent text-center font-bold"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-500">Unit Price (₹)</label>
                            <input
                              type="number"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) =>
                                handleCartItemChange(
                                  idx,
                                  'unitPrice',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full h-8 px-2 rounded border border-slate-300 dark:border-slate-800 bg-transparent text-right font-semibold"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-500">Per-Unit Discount (₹)</label>
                            <input
                              type="number"
                              min="0"
                              value={item.discount}
                              onChange={(e) =>
                                handleCartItemChange(
                                  idx,
                                  'discount',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full h-8 px-2 rounded border border-slate-300 dark:border-slate-800 bg-transparent text-right text-emerald-500 font-semibold"
                            />
                          </div>
                        </div>

                        {/* Serialized Item Selector if serialized product */}
                        {isSerialized && (
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="font-semibold text-amber-500">
                                Select Physical Serialized Units ({item.selectedSerialIds.length} / {item.quantity}):
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {serialsList.length === 0 ? (
                                <span className="text-red-400 text-[11px]">
                                  No available serialized units found in stock.
                                </span>
                              ) : (
                                serialsList.map((su) => {
                                  const isSelected = item.selectedSerialIds.includes(su._id);
                                  return (
                                    <button
                                      type="button"
                                      key={su._id}
                                      onClick={() => handleSerialToggle(idx, su._id)}
                                      className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold border transition-colors ${
                                        isSelected
                                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                                          : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-400'
                                      }`}
                                    >
                                      {su.assetId} ({su.condition})
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Total & Checkout summary */}
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-500 font-semibold">
                    <span>Discount:</span>
                    <span>-{formatCurrency(discountTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-extrabold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span>Grand Total Payable:</span>
                  <span className="text-amber-500">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsNewSaleOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="default" isLoading={isSubmittingSale} className="font-bold">
              Confirm & Complete Sale
            </Button>
          </div>
        </form>
      </Modal>

      {/* Printable Invoice Modal */}
      <Modal
        isOpen={!!activeInvoice}
        onClose={() => setActiveInvoice(null)}
        title={`Retail Tax Invoice — ${activeInvoice?.invoiceNumber}`}
        description="StereoBliss - Retail Inventory Official Receipt"
        maxWidth="2xl"
      >
        {activeInvoice && (
          <div className="space-y-6 text-slate-900 dark:text-white">
            <div id="printable-invoice" className="p-6 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 space-y-4 shadow-sm">
              {/* Invoice Header */}
              <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-amber-500">STEREOBLISS</h2>
                  <p className="text-xs text-slate-500">Retail Inventory Store & Pro Audio</p>
                  <p className="text-xs text-slate-500">Main Retail Showroom & Academy</p>
                  <p className="text-xs text-slate-500">Email: sales@stereobliss.com</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    INVOICE #{activeInvoice.invoiceNumber}
                  </div>
                  <div className="text-xs text-slate-500">Date: {formatDateTime(activeInvoice.createdAt)}</div>
                  <div className="text-xs text-slate-500">Payment: {activeInvoice.paymentMethod}</div>
                  <div className="text-xs text-emerald-500 font-bold">Status: {activeInvoice.paymentStatus}</div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="text-xs">
                <span className="font-bold text-slate-500">Billed To:</span>
                <div className="font-semibold text-slate-900 dark:text-white">{activeInvoice.customerName}</div>
                {activeInvoice.customerPhone && <div className="text-slate-500">{activeInvoice.customerPhone}</div>}
                {activeInvoice.customerEmail && <div className="text-slate-500">{activeInvoice.customerEmail}</div>}
              </div>

              {/* Invoice Line Items */}
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-2">Item</th>
                    <th className="py-2 text-center">Qty</th>
                    <th className="py-2 text-right">Unit Price</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {activeInvoice.lineItems?.map((li, i) => (
                    <tr key={i}>
                      <td className="py-2 font-medium">
                        {li.product?.name}
                        {li.serializedItemIds && li.serializedItemIds.length > 0 && (
                          <div className="text-[10px] font-mono text-amber-500">
                            Asset IDs: {li.serializedItemIds.map((u: any) => u.assetId || u).join(', ')}
                          </div>
                        )}
                      </td>
                      <td className="py-2 text-center">{li.quantity}</td>
                      <td className="py-2 text-right">{formatCurrency(li.unitPrice)}</td>
                      <td className="py-2 text-right font-bold">{formatCurrency(li.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(activeInvoice.subtotal)}</span>
                </div>
                {activeInvoice.discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-500 font-semibold">
                    <span>Discount:</span>
                    <span>-{formatCurrency(activeInvoice.discountTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-extrabold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span>Total Amount Paid:</span>
                  <span className="text-amber-500">{formatCurrency(activeInvoice.grandTotal)}</span>
                </div>
              </div>

              <div className="text-[11px] text-center text-slate-400 pt-4 border-t border-slate-100 dark:border-slate-800">
                Thank you for choosing StereoBliss! Premium Instruments & Pro Audio Gear.
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setActiveInvoice(null)}>
                Close
              </Button>
              <Button variant="default" onClick={printInvoice} className="gap-1.5 font-bold">
                <Printer className="h-4 w-4" />
                <span>Print Invoice</span>
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
