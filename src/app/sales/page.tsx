'use client';

import React, { useState, useEffect } from 'react';
import { api, getApiUrl } from '@/lib/api';
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
  Download,
  Loader2,
} from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { TaxInvoiceModal, downloadInvoicePdf } from '@/components/sales/TaxInvoiceModal';

export default function SalesPage() {
  const { canMakeSales } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Sale POS state
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [dispatchThrough, setDispatchThrough] = useState('XP India');
  const [destination, setDestination] = useState('PUNE');
  const [eWayBillNo, setEWayBillNo] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'CASH' | 'BANK_TRANSFER'>('UPI');
  const [notes, setNotes] = useState('');
  const [remarks, setRemarks] = useState('');

  const [cartItems, setCartItems] = useState<
    Array<{
      product: Product;
      quantity: number;
      unitPrice: number;
      discount: number;
      hsnCode: string;
    }>
  >([]);

  const [saleError, setSaleError] = useState('');
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);

  // Printable Invoice Modal
  const [activeInvoice, setActiveInvoice] = useState<Sale | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleQuickDownloadPdf = async (sale: Sale) => {
    setDownloadingId(sale._id);
    try {
      await downloadInvoicePdf(sale._id, sale.invoiceNumber);
    } catch (err: any) {
      console.error('Quick PDF download failed:', err);
      window.open(getApiUrl(`/sales/${sale._id}/pdf`), '_blank');
    } finally {
      setDownloadingId(null);
    }
  };

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
      const [prodRes, locRes] = await Promise.all([
        api.get<{ items: Product[] }>('/products?limit=250'),
        api.get<{ locations: StockLocation[] }>('/meta/locations'),
      ]);

      setProducts(prodRes.items || []);
      setLocations(locRes.locations || []);
      if (locRes.locations && locRes.locations.length > 0) {
        setSelectedLocation(locRes.locations[0]._id);
      }
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
          hsnCode: (product as any).hsnCode || '9202',
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

  const subtotal = cartItems.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
  const discountTotal = cartItems.reduce((acc, i) => acc + (i.discount || 0) * i.quantity, 0);
  const taxableAmount = Math.max(0, subtotal - discountTotal);
  const cgstAmount = Math.round(taxableAmount * 0.09 * 100) / 100;
  const sgstAmount = Math.round(taxableAmount * 0.09 * 100) / 100;
  const totalGst = Math.round((cgstAmount + sgstAmount) * 100) / 100;
  const grandTotal = Math.round((taxableAmount + totalGst) * 100) / 100;

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaleError('');

    if (cartItems.length === 0) {
      setSaleError('Cart is empty. Please add at least one product.');
      return;
    }

    setIsSubmittingSale(true);

    try {
      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        customerGstin: customerGstin.trim().toUpperCase() || undefined,
        customerAddress: customerAddress.trim() || undefined,
        dispatchThrough: dispatchThrough.trim() || undefined,
        destination: destination.trim() || undefined,
        eWayBillNo: eWayBillNo.trim() || undefined,
        location: selectedLocation,
        paymentMethod,
        notes: notes.trim() || undefined,
        remarks: remarks.trim() || undefined,
        idempotencyKey: `sale-${Date.now()}`,
        lineItems: cartItems.map((i) => ({
          product: i.product._id,
          hsnCode: i.hsnCode || (i.product as any).hsnCode || '9202',
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount || 0,
        })),
      };

      const res = await api.post<{ sale: Sale }>('/sales', payload);
      setIsNewSaleOpen(false);
      setCartItems([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setCustomerGstin('');
      setCustomerAddress('');
      setEWayBillNo('');
      setNotes('');
      setRemarks('');
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
        <div className="flex items-center gap-3">
          <BrandLogo size="md" variant="badge" className="shadow-xs shrink-0" />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Sales & Point of Sale (POS)
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Stereobliss Retail — Live stock lookup, retail sales transactions, customer invoices, and returns.
            </p>
          </div>
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
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => setActiveInvoice(sale)}
                            className="h-7 text-[11px] gap-1 font-bold shadow-xs"
                          >
                            <Receipt className="h-3 w-3" />
                            <span>Tax Invoice</span>
                          </Button>
                          <button
                            type="button"
                            disabled={downloadingId === sale._id}
                            onClick={() => handleQuickDownloadPdf(sale)}
                            title="Download / Save PDF directly"
                            className="inline-flex items-center justify-center h-7 px-2 text-[11px] font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-amber-600 transition-colors disabled:opacity-50"
                          >
                            {downloadingId === sale._id ? (
                              <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
                            ) : (
                              <Download className="h-3 w-3" />
                            )}
                            <span className="ml-1">Save PDF</span>
                          </button>
                        </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
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
                <option value="UPI">UPI (GPay/PhonePe)</option>
                <option value="CARD">Credit / Debit Card</option>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank IMPS / NEFT</option>
              </select>
            </div>

            <Input
              label="Remarks / Bill Notes"
              placeholder="e.g. 1-Yr Warranty, Packaged"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>

          {/* Dealer GST & Dispatch Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40">
            <Input
              label="Dealer / Buyer GSTIN"
              placeholder="e.g. 27ADDFS8650Q1Z6"
              value={customerGstin}
              onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
            />

            <Input
              label="Delivery / Billing Address"
              placeholder="e.g. Pimple Saudagar, Pune 411027"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
            />

            <Input
              label="Dispatched Through"
              placeholder="XP India / Hand Delivery"
              value={dispatchThrough}
              onChange={(e) => setDispatchThrough(e.target.value)}
            />

            <Input
              label="Destination City"
              placeholder="PUNE"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
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
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{p.name}</span>
                          {p.color && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                              {p.color}
                            </span>
                          )}
                        </div>
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
                            {item.product.color && (
                              <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                                {item.product.color}
                              </span>
                            )}
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

                        {/* Pricing & Quantity controls */}
                        <div className="grid grid-cols-3 gap-2">
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
                            <label className="text-[10px] text-slate-500">Discount (₹)</label>
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
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Total & Checkout GST summary */}
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 space-y-1.5 text-xs border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between text-slate-500">
                  <span>Gross Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-500 font-semibold">
                    <span>Discount:</span>
                    <span>-{formatCurrency(discountTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium">
                  <span>Taxable Value:</span>
                  <span>{formatCurrency(taxableAmount)}</span>
                </div>
                <div className="flex justify-between text-amber-600 dark:text-amber-400">
                  <span>Central GST (CGST 9%):</span>
                  <span>+{formatCurrency(cgstAmount)}</span>
                </div>
                <div className="flex justify-between text-amber-600 dark:text-amber-400">
                  <span>State GST (SGST 9%):</span>
                  <span>+{formatCurrency(sgstAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px] border-t border-slate-200 dark:border-slate-800 pt-1">
                  <span>Total Tax (18% GST):</span>
                  <span>+{formatCurrency(totalGst)}</span>
                </div>
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

      {/* Authentic Indian GST Tax Invoice Modal */}
      <TaxInvoiceModal
        isOpen={!!activeInvoice}
        onClose={() => setActiveInvoice(null)}
        sale={activeInvoice}
      />
    </div>
  );
}
