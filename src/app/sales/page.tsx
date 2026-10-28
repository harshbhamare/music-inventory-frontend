'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { api, getApiUrl } from '@/lib/api';
import { Sale, Product, StockLocation, EmiMonthlyPayment } from '@/lib/types';
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
  Calendar,
  Mail,
  Check,
  AlertCircle,
  Clock,
  Sparkles,
  Info,
  CalendarCheck,
  Edit,
  Save,
  Send,
  FileEdit,
} from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { TaxInvoiceModal, downloadInvoicePdf } from '@/components/sales/TaxInvoiceModal';

export default function SalesPage() {
  const { canMakeSales, isSuperAdmin, isManager } = useAuth();
  const canEditBills = isSuperAdmin() || isManager();
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

  // 2 Selling Types: DIRECT vs EMI
  const [saleType, setSaleType] = useState<'DIRECT' | 'EMI'>('DIRECT');
  const [downPayment, setDownPayment] = useState<number>(0);
  const [downPaymentMethod, setDownPaymentMethod] = useState<'UPI' | 'CARD' | 'CASH' | 'BANK_TRANSFER'>('UPI');
  const [emiTenureMonths, setEmiTenureMonths] = useState<number>(6);

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

  // EMI Ledger Modal State (same workflow as rental)
  const [selectedSaleForLedger, setSelectedSaleForLedger] = useState<Sale | null>(null);
  const [emiPaymentAmount, setEmiPaymentAmount] = useState<number>(0);
  const [selectedEmiBillingMonth, setSelectedEmiBillingMonth] = useState('');
  const [emiPaymentMethod, setEmiPaymentMethod] = useState<'UPI' | 'CARD' | 'CASH' | 'BANK_TRANSFER'>('UPI');
  const [emiTransactionRef, setEmiTransactionRef] = useState('');
  const [emiPaymentNotes, setEmiPaymentNotes] = useState('');
  const [isRecordingEmiPayment, setIsRecordingEmiPayment] = useState(false);
  const [emiLedgerError, setEmiLedgerError] = useState('');
  const [isSendingEmiReminder, setIsSendingEmiReminder] = useState(false);
  const [emiReminderFeedback, setEmiReminderFeedback] = useState('');

  // Edit Sale / Bill Modal State (Manager & Super Admin)
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [isUpdatingSale, setIsUpdatingSale] = useState(false);
  const [isSavingAndSendingEmail, setIsSavingAndSendingEmail] = useState(false);
  const [updateSaleError, setUpdateSaleError] = useState('');
  const [editSaleFeedback, setEditSaleFeedback] = useState('');
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerEmail, setEditCustomerEmail] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editCustomerAddress, setEditCustomerAddress] = useState('');
  const [editCustomerGstin, setEditCustomerGstin] = useState('');
  const [editDispatchThrough, setEditDispatchThrough] = useState('');
  const [editDestination, setEditDestination] = useState('');
  const [editEWayBillNo, setEditEWayBillNo] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'OTHER'>('UPI');
  const [editNotes, setEditNotes] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [editDownPayment, setEditDownPayment] = useState<number>(0);
  const [editEmiTenureMonths, setEditEmiTenureMonths] = useState<number>(6);
  const [editLineItems, setEditLineItems] = useState<
    Array<{
      product: string;
      productName: string;
      unitPrice: number;
      discount: number;
      quantity: number;
      hsnCode: string;
    }>
  >([]);

  // Filter state for the sales list
  type SaleFilterType = 'ALL' | 'EMI_DUE' | 'EMI_PAID' | 'DIRECT';
  const [saleFilter, setSaleFilter] = useState<SaleFilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSales = useMemo(() => {
    let result = sales;

    // Apply tab filter
    if (saleFilter === 'EMI_DUE') {
      result = result.filter((s) => (s.isEmi || s.saleType === 'EMI') && (s.totalEmiDue ?? 0) > 0);
    } else if (saleFilter === 'EMI_PAID') {
      result = result.filter((s) => (s.isEmi || s.saleType === 'EMI') && (s.totalEmiDue ?? 0) <= 0);
    } else if (saleFilter === 'DIRECT') {
      result = result.filter((s) => !s.isEmi && s.saleType !== 'EMI');
    }

    // Apply search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.invoiceNumber?.toLowerCase().includes(q) ||
          s.customerName?.toLowerCase().includes(q) ||
          s.customerPhone?.includes(q) ||
          s.customerEmail?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [sales, saleFilter, searchQuery]);

  // Counts for filter tab badges
  const filterCounts = useMemo(() => ({
    ALL: sales.length,
    EMI_DUE: sales.filter((s) => (s.isEmi || s.saleType === 'EMI') && (s.totalEmiDue ?? 0) > 0).length,
    EMI_PAID: sales.filter((s) => (s.isEmi || s.saleType === 'EMI') && (s.totalEmiDue ?? 0) <= 0).length,
    DIRECT: sales.filter((s) => !s.isEmi && s.saleType !== 'EMI').length,
  }), [sales]);

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

  // Cart calculations
  const subtotal = cartItems.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
  const discountTotal = cartItems.reduce((acc, i) => acc + (i.discount || 0) * i.quantity, 0);
  const taxableAmount = Math.max(0, subtotal - discountTotal);
  const cgstAmount = Math.round(taxableAmount * 0.09 * 100) / 100;
  const sgstAmount = Math.round(taxableAmount * 0.09 * 100) / 100;
  const totalGst = Math.round((cgstAmount + sgstAmount) * 100) / 100;
  const grandTotal = Math.round(taxableAmount + totalGst);

  // EMI computations
  const effectiveDownPayment = Math.round(Math.min(grandTotal, Math.max(0, downPayment)));
  const financedPrincipal = Math.max(0, grandTotal - effectiveDownPayment);
  const monthlyEmi = emiTenureMonths > 0 ? Math.round(financedPrincipal / emiTenureMonths) : 0;

  // Projected EMI installments preview
  const emiSchedulePreview = useMemo(() => {
    if (saleType !== 'EMI' || emiTenureMonths <= 0 || financedPrincipal <= 0) return [];
    const schedule = [];
    const baseDate = new Date();
    let runningAllocated = 0;

    for (let i = 1; i <= emiTenureMonths; i++) {
      const d = new Date(baseDate);
      d.setMonth(d.getMonth() + i);
      let amount = monthlyEmi;
      if (i === emiTenureMonths) {
        amount = Math.max(0, financedPrincipal - runningAllocated);
      } else {
        runningAllocated += amount;
      }
      const monthName = d.toLocaleString('default', { month: 'short', year: 'numeric' });
      schedule.push({
        monthIndex: i,
        billingMonth: `Month ${i} (${monthName})`,
        dueDate: d.toISOString().slice(0, 10),
        amountDue: amount,
      });
    }
    return schedule;
  }, [saleType, emiTenureMonths, financedPrincipal, monthlyEmi]);

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaleError('');

    if (cartItems.length === 0) {
      setSaleError('Cart is empty. Please add at least one product.');
      return;
    }

    // Required Customer Name, Phone and Email validation
    const trimmedName = customerName.trim();
    const trimmedPhone = customerPhone.trim();
    const trimmedEmail = customerEmail.trim();

    if (!trimmedName) {
      setSaleError('Customer Name is required.');
      return;
    }

    if (!trimmedPhone) {
      setSaleError('Customer Phone Number is mandatory for billing, warranty & EMI alerts.');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(trimmedPhone)) {
      setSaleError('Customer Phone Number must be a valid 10-digit Indian mobile number (e.g. 9876543210).');
      return;
    }

    if (!trimmedEmail) {
      setSaleError('Customer Email Address is mandatory for tax invoice & EMI payment reminders.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setSaleError('Please provide a valid Customer Email Address.');
      return;
    }

    if (saleType === 'EMI') {
      if (effectiveDownPayment >= grandTotal) {
        setSaleError('Down Payment is equal to or greater than Grand Total. Please choose "Direct Sale (Full Payment)" instead.');
        return;
      }
      if (emiTenureMonths < 1 || emiTenureMonths > 36) {
        setSaleError('Please select a valid EMI tenure between 1 and 36 months.');
        return;
      }
    }

    setIsSubmittingSale(true);

    try {
      const payload: any = {
        customerName: trimmedName,
        customerPhone: trimmedPhone,
        customerEmail: trimmedEmail,
        customerGstin: customerGstin.trim().toUpperCase() || undefined,
        customerAddress: customerAddress.trim() || undefined,
        dispatchThrough: dispatchThrough.trim() || undefined,
        destination: destination.trim() || undefined,
        eWayBillNo: eWayBillNo.trim() || undefined,
        location: selectedLocation,
        paymentMethod: saleType === 'EMI' ? downPaymentMethod : paymentMethod,
        saleType,
        isEmi: saleType === 'EMI',
        downPayment: saleType === 'EMI' ? effectiveDownPayment : grandTotal,
        emiTenureMonths: saleType === 'EMI' ? emiTenureMonths : undefined,
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
      setSaleType('DIRECT');
      setDownPayment(0);
      setEmiTenureMonths(6);
      fetchSales();
      fetchInventoryForSale();
      setActiveInvoice(res.sale);
    } catch (err: any) {
      setSaleError(err.message || 'Failed to record customer sale.');
    } finally {
      setIsSubmittingSale(false);
    }
  };

  // Open EMI Ledger
  const openEmiLedger = (sale: Sale) => {
    setSelectedSaleForLedger(sale);
    setEmiLedgerError('');
    setEmiReminderFeedback('');
    setEmiTransactionRef('');
    setEmiPaymentNotes('');
    // Auto populate next due EMI rounded to whole rupee
    const nextDue = (sale.emiPayments || []).find((p) => p.status !== 'PAID');
    if (nextDue) {
      setEmiPaymentAmount(Math.round(Math.max(0, nextDue.amountDue - (nextDue.amountPaid || 0))));
      setSelectedEmiBillingMonth(nextDue.billingMonth);
    } else {
      setEmiPaymentAmount(Math.round(sale.monthlyEmiAmount || 0));
      setSelectedEmiBillingMonth('');
    }
  };

  // Record EMI installment payment
  const handleRecordEmiPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSaleForLedger) return;
    setEmiLedgerError('');

    if (emiPaymentAmount <= 0) {
      setEmiLedgerError('Please enter a valid installment payment amount.');
      return;
    }

    if (!emiTransactionRef.trim()) {
      setEmiLedgerError('Transaction No. / UPI Reference is compulsory.');
      return;
    }

    setIsRecordingEmiPayment(true);

    try {
      const res = await api.post<{ success: boolean; data?: { sale: Sale }; sale?: Sale }>(
        `/sales/${selectedSaleForLedger._id}/emi-payments`,
        {
          amount: Math.round(emiPaymentAmount),
          billingMonth: selectedEmiBillingMonth || undefined,
          paymentMethod: emiPaymentMethod,
          transactionRef: emiTransactionRef.trim(),
          notes: emiPaymentNotes.trim() || undefined,
        }
      );

      const updated = res.data?.sale || res.sale || selectedSaleForLedger;
      setSelectedSaleForLedger(updated);
      setEmiTransactionRef('');
      setEmiPaymentNotes('');
      fetchSales();

      // Recalculate next due installment
      const nextDue = (updated.emiPayments || []).find((p) => p.status !== 'PAID');
      if (nextDue) {
        setEmiPaymentAmount(Math.round(Math.max(0, nextDue.amountDue - (nextDue.amountPaid || 0))));
        setSelectedEmiBillingMonth(nextDue.billingMonth);
      } else {
        setEmiPaymentAmount(0);
        setSelectedEmiBillingMonth('');
      }
    } catch (err: any) {
      setEmiLedgerError(err.message || 'Failed to record EMI payment.');
    } finally {
      setIsRecordingEmiPayment(false);
    }
  };

  // Open Edit Sale / Bill Modal
  const openEditSaleModal = (sale: Sale) => {
    setEditingSale(sale);
    setUpdateSaleError('');
    setEditSaleFeedback('');
    setEditCustomerName(sale.customerName || '');
    setEditCustomerEmail(sale.customerEmail || '');
    setEditCustomerPhone(sale.customerPhone || '');
    setEditCustomerAddress(sale.customerAddress || '');
    setEditCustomerGstin(sale.customerGstin || '');
    setEditDispatchThrough(sale.dispatchThrough || '');
    setEditDestination(sale.destination || '');
    setEditEWayBillNo(sale.eWayBillNo || '');
    setEditPaymentMethod((sale.paymentMethod as any) || 'UPI');
    setEditNotes(sale.notes || '');
    setEditRemarks(sale.remarks || '');
    setEditDownPayment(Math.round(sale.downPayment || 0));
    setEditEmiTenureMonths(sale.emiTenureMonths || 6);

    const items = (sale.lineItems || []).map((li: any) => ({
      product: (li.product as any)?._id || li.product,
      productName: (li.product as any)?.name || 'Product',
      unitPrice: li.unitPrice || 0,
      discount: li.discount || 0,
      quantity: li.quantity || 1,
      hsnCode: li.hsnCode || '9202',
    }));
    setEditLineItems(items);
  };

  // Submit Edit Sale / Bill
  const handleUpdateSale = async (andSendEmail: boolean = false) => {
    if (!editingSale) return;
    setUpdateSaleError('');
    setEditSaleFeedback('');

    if (!editCustomerName.trim()) {
      setUpdateSaleError('Customer Name is required.');
      return;
    }
    if (editCustomerPhone.trim().length < 10) {
      setUpdateSaleError('Please enter a valid 10-digit customer phone number.');
      return;
    }
    if (!editCustomerEmail.trim() || !editCustomerEmail.includes('@')) {
      setUpdateSaleError('A valid customer email address is mandatory for invoice dispatch.');
      return;
    }

    if (andSendEmail) {
      setIsSavingAndSendingEmail(true);
    } else {
      setIsUpdatingSale(true);
    }

    try {
      const payload: any = {
        customerName: editCustomerName.trim(),
        customerEmail: editCustomerEmail.trim().toLowerCase(),
        customerPhone: editCustomerPhone.trim(),
        customerAddress: editCustomerAddress.trim() || undefined,
        customerGstin: editCustomerGstin.trim().toUpperCase() || undefined,
        dispatchThrough: editDispatchThrough.trim() || undefined,
        destination: editDestination.trim() || undefined,
        eWayBillNo: editEWayBillNo.trim() || undefined,
        paymentMethod: editPaymentMethod,
        notes: editNotes.trim() || undefined,
        remarks: editRemarks.trim() || undefined,
        lineItems: editLineItems.map((li) => ({
          product: li.product,
          unitPrice: Math.max(0, li.unitPrice),
          discount: Math.max(0, li.discount),
          quantity: li.quantity,
          hsnCode: li.hsnCode,
        })),
        reason: 'Manager/SuperAdmin updated sale bill details',
      };

      if (editingSale.isEmi) {
        payload.downPayment = Math.round(editDownPayment);
        payload.emiTenureMonths = editEmiTenureMonths;
      }

      const res = await api.put<{ success: boolean; data: { sale: Sale } }>(
        `/sales/${editingSale._id}`,
        payload
      );

      if (andSendEmail) {
        await api.post(`/sales/${editingSale._id}/send-email`, {
          recipientEmail: editCustomerEmail.trim(),
          customNotes: 'Updated tax invoice bill reflecting corrected details.',
        });
        setEditSaleFeedback(`Bill updated & corrected Tax Invoice sent to ${editCustomerEmail.trim()}!`);
      } else {
        setEditSaleFeedback('Sale bill successfully updated!');
      }

      fetchSales();
      setTimeout(() => {
        setEditingSale(null);
        setEditSaleFeedback('');
      }, 1600);
    } catch (err: any) {
      setUpdateSaleError(err.message || 'Failed to update sale bill.');
    } finally {
      setIsUpdatingSale(false);
      setIsSavingAndSendingEmail(false);
    }
  };

  // Send EMI Payment Reminder Email
  const handleSendEmiReminder = async (sale: Sale) => {
    setIsSendingEmiReminder(true);
    setEmiReminderFeedback('');

    try {
      const res = await api.post<{
        success: boolean;
        message: string;
        sentTo: string;
        sale: Sale;
      }>(`/sales/${sale._id}/emi-reminders`, {});

      setEmiReminderFeedback(`EMI reminder dispatched to ${res.sentTo}!`);
      fetchSales();
      if (selectedSaleForLedger && selectedSaleForLedger._id === sale._id) {
        setSelectedSaleForLedger(res.sale);
      }
      setTimeout(() => setEmiReminderFeedback(''), 5000);
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch EMI payment reminder email.');
    } finally {
      setIsSendingEmiReminder(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo size="md" variant="badge" className="shadow-xs shrink-0" />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Sales &amp; Point of Sale (POS)
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Stereobliss Retail — Live stock lookup, retail sales transactions, EMI financing, invoices, and customer reminders.
            </p>
          </div>
        </div>

        {canMakeSales() && (
          <Button
            size="sm"
            variant="default"
            onClick={() => {
              setIsNewSaleOpen(true);
              setSaleError('');
            }}
            className="gap-1.5 text-xs font-bold shadow-md"
          >
            <Plus className="h-4 w-4" />
            <span>New Customer Sale</span>
          </Button>
        )}
      </div>

      {/* Sales Transactions List */}
      <Card>
        {/* Filter Tab Bar + Search */}
        <div className="flex flex-col gap-3 px-4 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1 flex-wrap">
            {(
              [
                {
                  key: 'ALL',
                  label: 'All Sales',
                  icon: <ShoppingCart className="h-3.5 w-3.5" />,
                  activeClass: 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-sm',
                  inactiveClass: 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-white',
                },
                {
                  key: 'EMI_DUE',
                  label: 'EMI Due',
                  icon: <Clock className="h-3.5 w-3.5" />,
                  activeClass: 'bg-rose-600 text-white border-transparent shadow-sm',
                  inactiveClass: 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-rose-300 hover:text-rose-600',
                  badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400',
                  activeBadgeClass: 'bg-white/20 text-white',
                },
                {
                  key: 'EMI_PAID',
                  label: 'EMI Paid',
                  icon: <CheckCircle2 className="h-3.5 w-3.5" />,
                  activeClass: 'bg-emerald-600 text-white border-transparent shadow-sm',
                  inactiveClass: 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-emerald-300 hover:text-emerald-600',
                  badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
                  activeBadgeClass: 'bg-white/20 text-white',
                },
                {
                  key: 'DIRECT',
                  label: 'Direct Sales',
                  icon: <Tag className="h-3.5 w-3.5" />,
                  activeClass: 'bg-blue-600 text-white border-transparent shadow-sm',
                  inactiveClass: 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:text-blue-600',
                  badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400',
                  activeBadgeClass: 'bg-white/20 text-white',
                },
              ] as const
            ).map((tab) => {
              const isActive = saleFilter === tab.key;
              const count = filterCounts[tab.key];
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSaleFilter(tab.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${isActive ? tab.activeClass : tab.inactiveClass}`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  <span
                    className={`min-w-[18px] text-center px-1 py-0 rounded-full text-[10px] font-bold ${
                      isActive
                        ? (tab as any).activeBadgeClass ?? 'bg-white/20 text-white'
                        : (tab as any).badgeClass ?? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search invoice, customer, phone…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <CardContent className="p-0">
          <div className="responsive-table-wrapper">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Invoice No</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Sale Type</th>
                  <th className="py-3 px-4">Status &amp; Dues</th>
                  <th className="py-3 px-4">Items Sold</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                  <th className="py-3 px-4">Sold By</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Loading sales transactions...
                    </td>
                  </tr>
                ) : filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      {sales.length === 0 ? 'No sales recorded yet.' : 'No sales match the current filter.'}
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => {
                    const isEmi = sale.isEmi || sale.saleType === 'EMI';
                    const emiDue = sale.totalEmiDue ?? 0;
                    const isEmiFullySettled = isEmi && emiDue <= 0;

                    return (
                      <tr key={sale._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono font-bold text-amber-500">
                          {sale.invoiceNumber}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {sale.customerName}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <span>{sale.customerPhone || 'No Phone'}</span>
                            {sale.customerEmail && (
                              <>
                                <span>&bull;</span>
                                <span className="truncate max-w-[120px]">{sale.customerEmail}</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {isEmi ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                <CreditCard className="h-3 w-3" />
                                <span>EMI Plan ({sale.emiTenureMonths || 6} Mo)</span>
                              </span>
                              <div className="text-[10px] text-slate-400">
                                Down: {formatCurrency(sale.downPayment || 0)}
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              <span>Direct Sale</span>
                              <span className="text-slate-400">({sale.paymentMethod})</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <Badge
                              variant={sale.saleStatus === 'CONFIRMED' ? 'success' : 'secondary'}
                              className="text-[10px]"
                            >
                              {sale.saleStatus}
                            </Badge>
                            {isEmi && (
                              <div className="text-[10px]">
                                {isEmiFullySettled ? (
                                  <span className="text-emerald-500 font-bold">EMI Fully Paid</span>
                                ) : (
                                  <span className="text-rose-500 font-bold">
                                    Due: {formatCurrency(emiDue)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
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
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">

                            {/* ── Primary actions: Invoice + PDF ── */}
                            <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs divide-x divide-slate-200 dark:divide-slate-700">
                              {/* Tax Invoice */}
                              <button
                                type="button"
                                onClick={() => setActiveInvoice(sale)}
                                title="View Tax Invoice"
                                className="group relative flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1a6eb7] hover:bg-[#155a96] text-white text-[11px] font-bold transition-colors"
                              >
                                <Receipt className="h-3.5 w-3.5 shrink-0" />
                                <span>Invoice</span>
                              </button>

                              {/* Save PDF */}
                              <button
                                type="button"
                                disabled={downloadingId === sale._id}
                                onClick={() => handleQuickDownloadPdf(sale)}
                                title="Download PDF"
                                className="flex items-center justify-center w-8 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors disabled:opacity-40"
                              >
                                {downloadingId === sale._id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
                                ) : (
                                  <Download className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>

                            {/* ── EMI Ledger (only for EMI sales) ── */}
                            {isEmi && (
                              <button
                                type="button"
                                onClick={() => openEmiLedger(sale)}
                                title="EMI Ledger — month-by-month installment tracker"
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-colors shadow-xs ${
                                  isEmiFullySettled
                                    ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/50'
                                    : 'border-amber-400/50 dark:border-amber-600/40 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/40'
                                }`}
                              >
                                <CalendarCheck className="h-3.5 w-3.5 shrink-0" />
                                <span>EMI</span>
                                {isEmiFullySettled ? (
                                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                ) : (
                                  <span className="inline-flex items-center justify-center rounded-full bg-rose-500 text-white text-[9px] font-extrabold min-w-[14px] h-[14px] px-1 leading-none">
                                    !
                                  </span>
                                )}
                              </button>
                            )}

                            {/* ── Edit (manager/admin only) ── */}
                            {canEditBills && (
                              <button
                                type="button"
                                onClick={() => openEditSaleModal(sale)}
                                title="Edit bill details"
                                className="flex items-center justify-center w-7 h-7 rounded-lg border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/40 transition-colors shadow-xs"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
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

      {/* POS New Customer Sale Modal */}
      <Modal
        isOpen={isNewSaleOpen}
        onClose={() => setIsNewSaleOpen(false)}
        title="Record Customer Sale (POS)"
        description="Select available products, customer contact details, choose Direct Sale or EMI installment plan, and confirm."
        maxWidth="4xl"
      >
        <form onSubmit={handleCreateSale} className="space-y-6">
          {saleError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs font-semibold text-red-500 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{saleError}</span>
            </div>
          )}

          {/* Type of Selling Selector: Direct vs EMI */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Select Selling Type *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setSaleType('DIRECT')}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  saleType === 'DIRECT'
                    ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-950/20 text-slate-900 dark:text-white'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <div
                  className={`mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                    saleType === 'DIRECT'
                      ? 'border-amber-500 bg-amber-500 text-white'
                      : 'border-slate-400'
                  }`}
                >
                  {saleType === 'DIRECT' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <span>1. Direct Sale (Full Payment)</span>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                      Standard POS
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Customer pays full amount upfront via UPI, Card, Cash, or Bank Transfer.
                  </p>
                </div>
              </div>

              <div
                onClick={() => {
                  setSaleType('EMI');
                  if (downPayment === 0 && grandTotal > 0) {
                    setDownPayment(Math.round(grandTotal * 0.2));
                  }
                }}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  saleType === 'EMI'
                    ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-950/20 text-slate-900 dark:text-white'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <div
                  className={`mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                    saleType === 'EMI'
                      ? 'border-amber-500 bg-amber-500 text-white'
                      : 'border-slate-400'
                  }`}
                >
                  {saleType === 'EMI' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <span>2. EMI Installment Financing</span>
                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded">
                      Rental Style Ledger
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Down payment + scheduled monthly installments with automated email reminders.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Details — Phone and Email strictly required */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <Input
              label="Customer Name *"
              required
              placeholder="e.g. Rahul Sharma"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />

            <Input
              label="Customer Phone Number *"
              required
              placeholder="e.g. 9876543210 (10 digits)"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />

            <Input
              label="Customer Email Address *"
              type="email"
              required
              placeholder="rahul@example.com"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
            />

            {saleType === 'DIRECT' ? (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Payment Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-semibold text-amber-500"
                >
                  <option value="UPI">UPI (GPay / PhonePe)</option>
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank IMPS / NEFT</option>
                </select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Down Payment Method *
                </label>
                <select
                  value={downPaymentMethod}
                  onChange={(e) => setDownPaymentMethod(e.target.value as any)}
                  className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-semibold text-amber-500"
                >
                  <option value="UPI">UPI (GPay / PhonePe)</option>
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank IMPS / NEFT</option>
                </select>
              </div>
            )}
          </div>

          {/* If EMI: EMI Configuration & Schedule Live Calculator */}
          {saleType === 'EMI' && (
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    EMI Financing Terms &amp; Calculation
                  </span>
                </div>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                  Zero Interest In-Store Plan
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Down Payment (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={grandTotal}
                    value={downPayment}
                    onChange={(e) => setDownPayment(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 5000"
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-amber-500 text-right"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Paid at POS checkout
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    EMI Tenure (Months) *
                  </label>
                  <div className="grid grid-cols-5 gap-1 pt-1">
                    {[3, 6, 9, 12, 18].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setEmiTenureMonths(m)}
                        className={`h-8 rounded text-xs font-bold transition-all ${
                          emiTenureMonths === m
                            ? 'bg-amber-500 text-slate-950 shadow-xs'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-amber-400'
                        }`}
                      >
                        {m}M
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-amber-500/20 bg-white dark:bg-slate-900 space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Financed Principal:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatCurrency(financedPrincipal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Monthly Installment:</span>
                    <span className="font-extrabold text-amber-500 text-sm">
                      {formatCurrency(monthlyEmi)} / mo
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 text-right">
                    Over {emiTenureMonths} equal monthly installments
                  </div>
                </div>
              </div>

              {/* Installment Schedule Preview */}
              {emiSchedulePreview.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-amber-500/20">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                    Scheduled Installments Preview ({emiSchedulePreview.length} Months)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {emiSchedulePreview.map((item) => (
                      <div
                        key={item.monthIndex}
                        className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-center text-[11px]"
                      >
                        <div className="font-bold text-slate-700 dark:text-slate-300">
                          {item.billingMonth}
                        </div>
                        <div className="text-[10px] text-slate-400">Due: {formatDate(item.dueDate)}</div>
                        <div className="font-mono font-extrabold text-amber-500 mt-1">
                          {formatCurrency(item.amountDue)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

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
                {saleType === 'EMI' && (
                  <div className="flex justify-between text-xs font-bold text-amber-600 dark:text-amber-400 pt-1">
                    <span>Down Payment due at POS:</span>
                    <span>{formatCurrency(effectiveDownPayment)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsNewSaleOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="default" isLoading={isSubmittingSale} className="font-bold">
              {saleType === 'EMI' ? 'Confirm & Setup EMI Plan' : 'Confirm & Complete Sale'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* EMI Ledger & Payment Tracking Modal — Exact same workflow as Rental Ledger */}
      <Modal
        isOpen={!!selectedSaleForLedger}
        onClose={() => setSelectedSaleForLedger(null)}
        title={`Customer EMI Ledger — ${selectedSaleForLedger?.invoiceNumber}`}
        description="Month-by-month EMI installment schedule, payment tracking, balance calculations, and email reminder dispatch."
        maxWidth="2xl"
      >
        {selectedSaleForLedger && (
          <div className="space-y-6 text-xs text-slate-900 dark:text-white">
            {emiLedgerError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 font-semibold text-red-500 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{emiLedgerError}</span>
              </div>
            )}

            {emiReminderFeedback && (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 font-semibold text-emerald-500 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{emiReminderFeedback}</span>
              </div>
            )}

            {/* Financial Summary Header */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Customer</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {selectedSaleForLedger.customerName}
                </span>
                <span className="text-[11px] text-slate-400 block truncate">
                  {selectedSaleForLedger.customerEmail}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {selectedSaleForLedger.customerPhone}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Grand Total</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {formatCurrency(selectedSaleForLedger.grandTotal)}
                </span>
                <span className="text-[10px] text-slate-500 block">Invoice total</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Down Payment</span>
                <span className="font-bold text-indigo-400 text-sm">
                  {formatCurrency(selectedSaleForLedger.downPayment || 0)}
                </span>
                <span className="text-[10px] text-slate-500 block">Received at POS</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Total EMI Paid</span>
                <span className="font-bold text-emerald-500 text-sm">
                  {formatCurrency(selectedSaleForLedger.totalEmiPaid || 0)}
                </span>
                <span className="text-[10px] text-slate-500 block">Installments collected</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Remaining EMI Due</span>
                <span className="font-bold text-rose-500 text-sm">
                  {formatCurrency(selectedSaleForLedger.totalEmiDue || 0)}
                </span>
                <span className="text-[10px] text-slate-500 block">Outstanding balance</span>
              </div>
            </div>

            {/* Month-by-Month Installment Schedule Table */}
            <div className="space-y-2">
              <h4 className="font-bold uppercase tracking-wider text-slate-500 text-[11px]">
                Month-by-Month EMI Installment Schedule ({selectedSaleForLedger.emiPayments?.length || 0} Months)
              </h4>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Billing Month</th>
                      <th className="py-2.5 px-3">Due Date</th>
                      <th className="py-2.5 px-3 text-right">EMI Due</th>
                      <th className="py-2.5 px-3 text-right">Amount Paid</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3">Payment Info</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {(selectedSaleForLedger.emiPayments || []).map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                          {p.billingMonth}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{formatDate(p.dueDate)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-500">
                          {formatCurrency(p.amountDue)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-500">
                          {formatCurrency(p.amountPaid || 0)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge
                            variant={p.status === 'PAID' ? 'success' : 'danger'}
                            className="text-[10px]"
                          >
                            {p.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {p.paymentMethod ? (
                            <div>
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {p.paymentMethod}
                              </span>
                              {p.transactionRef && (
                                <span className="ml-1 text-[11px] font-mono text-amber-500">
                                  ({p.transactionRef})
                                </span>
                              )}
                              {p.notes && (
                                <div className="text-[10px] text-slate-400 italic">{p.notes}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Pending payment</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Record Installment Payment Form */}
            {(selectedSaleForLedger.totalEmiDue ?? 0) > 0 && (
              <form
                onSubmit={handleRecordEmiPayment}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                    Record Monthly EMI Payment
                  </span>
                  <span className="text-[11px] text-slate-500">Instant ledger &amp; invoice update</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                      Amount to Pay (₹) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      required
                      value={emiPaymentAmount}
                      onChange={(e) => setEmiPaymentAmount(Math.round(parseFloat(e.target.value) || 0))}
                      className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-amber-500 text-right"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                      Billing Month
                    </label>
                    <select
                      value={selectedEmiBillingMonth}
                      onChange={(e) => setSelectedEmiBillingMonth(e.target.value)}
                      className="w-full h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-semibold"
                    >
                      <option value="">Next Due Month</option>
                      {(selectedSaleForLedger.emiPayments || []).map((p, i) => (
                        <option key={i} value={p.billingMonth}>
                          {p.billingMonth} ({p.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                      Payment Method *
                    </label>
                    <select
                      value={emiPaymentMethod}
                      onChange={(e) => setEmiPaymentMethod(e.target.value as any)}
                      className="w-full h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-amber-500"
                    >
                      <option value="UPI">UPI (GPay / PhonePe)</option>
                      <option value="CARD">Debit / Credit Card</option>
                      <option value="CASH">Cash</option>
                      <option value="BANK_TRANSFER">Bank IMPS</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                      UPI / Txn Reference * <span className="text-rose-500 font-bold">(Compulsory)</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. UPI-998822 or Trx-12345"
                      value={emiTransactionRef}
                      onChange={(e) => setEmiTransactionRef(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendEmiReminder(selectedSaleForLedger)}
                    isLoading={isSendingEmiReminder}
                    className="gap-1.5 text-amber-600 dark:text-amber-400 border-amber-500/30"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>Send EMI Reminder Email Now</span>
                  </Button>

                  <Button
                    type="submit"
                    variant="default"
                    size="sm"
                    isLoading={isRecordingEmiPayment}
                    disabled={isRecordingEmiPayment}
                    className="gap-1.5 font-bold"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Confirm EMI Payment</span>
                  </Button>
                </div>
              </form>
            )}

            {/* Payment Logs History */}
            {(() => {
              const logs =
                selectedSaleForLedger.paymentLogs && selectedSaleForLedger.paymentLogs.length > 0
                  ? selectedSaleForLedger.paymentLogs
                  : (selectedSaleForLedger.emiPayments || [])
                      .filter((p) => (p.amountPaid || 0) > 0)
                      .map((p) => ({
                        paymentType: 'EMI_INSTALLMENT' as const,
                        amount: p.amountPaid,
                        paymentMethod: p.paymentMethod || 'UPI',
                        transactionRef: p.transactionRef || 'Counter',
                        billingMonth: p.billingMonth,
                        notes: p.notes,
                        paidAt: p.paidAt || selectedSaleForLedger.createdAt,
                      }));

              return logs.length > 0 ? (
                <div className="space-y-1.5">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">
                    Payment Transaction Logs ({logs.length})
                  </span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {logs.map((p: any, i: number) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs flex justify-between items-center"
                      >
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                              ₹{Math.round(p.amount).toLocaleString('en-IN')}
                            </span>
                            <span>&bull;</span>
                            <span>{p.paymentMethod}</span>
                            <span className="font-mono text-[11px] text-amber-600 dark:text-amber-400 font-bold ml-1">
                              (Ref: {p.transactionRef})
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {p.billingMonth || p.paymentType} {p.notes ? `• ${p.notes}` : ''}
                          </div>
                        </div>
                        <span className="text-slate-400 text-[10px] font-medium whitespace-nowrap">
                          {formatDateTime(p.paidAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Reminder History Log */}
            {selectedSaleForLedger.remindersSent && selectedSaleForLedger.remindersSent.length > 0 && (
              <div className="space-y-1.5">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">
                  Reminder Dispatch Log
                </span>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {selectedSaleForLedger.remindersSent.map((r, i) => (
                    <div
                      key={i}
                      className="p-2 rounded bg-slate-100 dark:bg-slate-900 text-[11px] flex justify-between items-center"
                    >
                      <span>
                        Sent to <strong>{r.sentTo}</strong> ({r.channel})
                      </span>
                      <span className="text-slate-400">{formatDateTime(r.sentAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSendEmiReminder(selectedSaleForLedger)}
                isLoading={isSendingEmiReminder}
                className="gap-1.5 text-amber-600 dark:text-amber-400 border-amber-500/30"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>Send EMI Reminder Email</span>
              </Button>

              <Button variant="outline" onClick={() => setSelectedSaleForLedger(null)}>
                Close Ledger
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Sale / Bill Modal (Manager & Super Admin) */}
      <Modal
        isOpen={!!editingSale}
        onClose={() => setEditingSale(null)}
        title={`Edit Sale Bill #${editingSale?.invoiceNumber || ''}`}
        maxWidth="xl"
      >
        {editingSale && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdateSale(false);
            }}
            className="space-y-4"
          >
            {updateSaleError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{updateSaleError}</span>
              </div>
            )}

            {editSaleFeedback && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{editSaleFeedback}</span>
              </div>
            )}

            {/* Customer Details Section */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                1. Customer &amp; Billing Information
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={editCustomerPhone}
                    onChange={(e) => setEditCustomerPhone(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={editCustomerEmail}
                    onChange={(e) => setEditCustomerEmail(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                    Customer GSTIN
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 27AAAAA0000A1Z5"
                    value={editCustomerGstin}
                    onChange={(e) => setEditCustomerGstin(e.target.value.toUpperCase())}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-mono uppercase"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                    Billing Address
                  </label>
                  <input
                    type="text"
                    placeholder="Full street address, City, Pincode"
                    value={editCustomerAddress}
                    onChange={(e) => setEditCustomerAddress(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Dispatch & Payment Meta */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                2. Dispatch &amp; Payment Details
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={editPaymentMethod}
                    onChange={(e) => setEditPaymentMethod(e.target.value as any)}
                    className="w-full h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold"
                  >
                    <option value="UPI">UPI (GPay / PhonePe)</option>
                    <option value="CARD">Debit / Credit Card</option>
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer / IMPS</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                    Dispatch Through
                  </label>
                  <input
                    type="text"
                    value={editDispatchThrough}
                    onChange={(e) => setEditDispatchThrough(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                    Destination
                  </label>
                  <input
                    type="text"
                    value={editDestination}
                    onChange={(e) => setEditDestination(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                    e-Way Bill No.
                  </label>
                  <input
                    type="text"
                    value={editEWayBillNo}
                    onChange={(e) => setEditEWayBillNo(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Line Items Pricing & Correction */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                3. Products, Unit Pricing &amp; Discounts
              </span>
              <div className="space-y-2">
                {editLineItems.map((li, idx) => {
                  const lineTotal = Math.max(0, (li.unitPrice - li.discount) * li.quantity);
                  return (
                    <div
                      key={idx}
                      className="grid grid-cols-1 sm:grid-cols-6 gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 items-center text-xs"
                    >
                      <div className="sm:col-span-2">
                        <span className="font-bold text-slate-900 dark:text-white block truncate">
                          {li.productName}
                        </span>
                        <span className="text-[10px] text-slate-400">Qty: {li.quantity}</span>
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-slate-400">Unit Price (₹)</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={li.unitPrice}
                          onChange={(e) => {
                            const updated = [...editLineItems];
                            updated[idx].unitPrice = parseFloat(e.target.value) || 0;
                            setEditLineItems(updated);
                          }}
                          className="w-full h-8 px-2 rounded border border-slate-300 dark:border-slate-800 font-mono text-right"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-slate-400">Discount/Unit (₹)</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={li.discount}
                          onChange={(e) => {
                            const updated = [...editLineItems];
                            updated[idx].discount = parseFloat(e.target.value) || 0;
                            setEditLineItems(updated);
                          }}
                          className="w-full h-8 px-2 rounded border border-slate-300 dark:border-slate-800 font-mono text-right"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-slate-400">HSN/SAC</label>
                        <input
                          type="text"
                          value={li.hsnCode}
                          onChange={(e) => {
                            const updated = [...editLineItems];
                            updated[idx].hsnCode = e.target.value;
                            setEditLineItems(updated);
                          }}
                          className="w-full h-8 px-2 rounded border border-slate-300 dark:border-slate-800 font-mono text-center"
                        />
                      </div>
                      <div className="text-right">
                        <span className="block text-[9px] uppercase font-bold text-slate-400">Net Total</span>
                        <span className="font-bold text-slate-900 dark:text-white font-mono">
                          ₹{Math.round(lineTotal).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Recalculated Summary */}
              {(() => {
                const sub = editLineItems.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
                const disc = editLineItems.reduce((acc, i) => acc + i.discount * i.quantity, 0);
                const taxBase = Math.max(0, sub - disc);
                const cgst = Math.round(taxBase * 0.09 * 100) / 100;
                const sgst = Math.round(taxBase * 0.09 * 100) / 100;
                const grand = Math.round(taxBase + cgst + sgst);
                return (
                  <div className="flex justify-end gap-6 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-500">Taxable: </span>
                      <strong className="font-mono">₹{taxBase.toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">GST (18%): </span>
                      <strong className="font-mono">₹{(cgst + sgst).toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Recalculated Grand Total: </span>
                      <strong className="text-amber-500 text-sm font-extrabold font-mono">
                        ₹{grand.toLocaleString('en-IN')}
                      </strong>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* If EMI Sale: Edit Down payment & tenure */}
            {editingSale.isEmi && (
              <div className="rounded-xl border border-amber-500/20 p-3.5 bg-amber-50/30 dark:bg-amber-950/20 space-y-3">
                <span className="font-bold text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                  4. EMI Financing Parameters
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                      Initial Deposit / Down Payment (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={editDownPayment}
                      onChange={(e) => setEditDownPayment(Math.round(parseFloat(e.target.value) || 0))}
                      className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-right font-mono text-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                      EMI Tenure (Months)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="36"
                      value={editEmiTenureMonths}
                      onChange={(e) => setEditEmiTenureMonths(parseInt(e.target.value) || 6)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-center font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                      Monthly Installment Preview
                    </label>
                    {(() => {
                      const sub = editLineItems.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
                      const disc = editLineItems.reduce((acc, i) => acc + i.discount * i.quantity, 0);
                      const taxBase = Math.max(0, sub - disc);
                      const grand = Math.round(taxBase + Math.round(taxBase * 0.18 * 100) / 100);
                      const financed = Math.max(0, grand - editDownPayment);
                      const monthly = editEmiTenureMonths > 0 ? Math.round(financed / editEmiTenureMonths) : 0;
                      return (
                        <div className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 flex items-center justify-end font-bold text-amber-600 dark:text-amber-400 font-mono text-xs">
                          ₹{monthly.toLocaleString('en-IN')} / mo
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Notes / Remarks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                  Bill Notes
                </label>
                <input
                  type="text"
                  placeholder="Notes printed on invoice"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                  Internal Remarks
                </label>
                <input
                  type="text"
                  placeholder="Internal audit notes"
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingSale(null)}
              >
                Cancel
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  isLoading={isUpdatingSale}
                  disabled={isUpdatingSale || isSavingAndSendingEmail}
                  className="gap-1.5 font-bold"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Changes</span>
                </Button>

                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  isLoading={isSavingAndSendingEmail}
                  disabled={isUpdatingSale || isSavingAndSendingEmail}
                  onClick={() => handleUpdateSale(true)}
                  className="gap-1.5 font-bold shadow-xs bg-amber-500 text-slate-950 hover:bg-amber-400"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Save &amp; Email to Customer</span>
                </Button>
              </div>
            </div>
          </form>
        )}
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
