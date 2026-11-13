'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { api, getApiUrl } from '@/lib/api';
import { Sale, Product, StockLocation, EmiMonthlyPayment } from '@/lib/types';
import { formatCurrency, formatDate, formatDateTime, addMonthsPreservingDay } from '@/lib/utils';
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
  Package,
  User,
  Truck,
  Sliders,
  Edit2,
  Zap,
  ArrowRight,
  X,
} from 'lucide-react';
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
  // POS modal tab state
  const [posTab, setPosTab] = useState<'items' | 'payment' | 'dispatch'>('items');
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
  const [sendSaleReceiptEmail, setSendSaleReceiptEmail] = useState(true);

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
  const [emiCustomerEmail, setEmiCustomerEmail] = useState('');
  const [sendEmiPaymentReceiptEmail, setSendEmiPaymentReceiptEmail] = useState(true);

  // Early payoff / bulk settlement state
  const [settleAllRemaining, setSettleAllRemaining] = useState(false);
  const [earlySettlementDiscount, setEarlySettlementDiscount] = useState<number>(0);

  // Adjust EMI Installment Due Modal
  const [adjustingEmiMonth, setAdjustingEmiMonth] = useState<EmiMonthlyPayment | null>(null);
  const [adjustAmountDue, setAdjustAmountDue] = useState<number>(0);
  const [adjustDueDate, setAdjustDueDate] = useState<string>('');
  const [adjustCarryForward, setAdjustCarryForward] = useState<boolean>(true);
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [isAdjustingEmiDue, setIsAdjustingEmiDue] = useState<boolean>(false);
  const [adjustModalError, setAdjustModalError] = useState<string>('');

  // Edit Recorded EMI Payment Modal
  const [editingEmiPayment, setEditingEmiPayment] = useState<EmiMonthlyPayment | null>(null);
  const [editEmiAmountPaid, setEditEmiAmountPaid] = useState<number>(0);
  const [editEmiAmountDue, setEditEmiAmountDue] = useState<number>(0);
  const [editEmiPaymentMethod, setEditEmiPaymentMethod] = useState<'UPI' | 'CARD' | 'CASH' | 'BANK_TRANSFER'>('UPI');
  const [editEmiTransactionRef, setEditEmiTransactionRef] = useState<string>('');
  const [editEmiNotes, setEditEmiNotes] = useState<string>('');
  const [isUpdatingEmiPayment, setIsUpdatingEmiPayment] = useState<boolean>(false);
  const [editEmiModalError, setEditEmiModalError] = useState<string>('');

  // Add Extra EMI Month Modal
  const [isAddingEmiMonthModalOpen, setIsAddingEmiMonthModalOpen] = useState(false);
  const [newEmiMonthAmount, setNewEmiMonthAmount] = useState<number>(0);
  const [newEmiMonthDueDate, setNewEmiMonthDueDate] = useState<string>('');
  const [newEmiMonthReason, setNewEmiMonthReason] = useState<string>('');
  const [isSubmittingAddMonth, setIsSubmittingAddMonth] = useState(false);

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
  const [editEmiTenureMonths, setEditEmiTenureMonths] = useState<number>(0);
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

  // Filter + pagination state for the sales list
  type SaleFilterType = 'ALL' | 'EMI_DUE' | 'EMI_PAID' | 'DIRECT';
  const [saleFilter, setSaleFilter] = useState<SaleFilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 50;
  const [pagination, setPagination] = useState<{ total: number; totalPages: number } | null>(null);
  const searchDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

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
    fetchSales(1);
    fetchInventoryForSale();
  }, []);

  // Re-fetch when filter tab changes (always reset to page 1)
  useEffect(() => {
    fetchSales(1);
  }, [saleFilter]);

  const fetchSales = async (page = currentPage, search = searchQuery) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(PAGE_SIZE));
      if (search.trim()) params.set('search', search.trim());
      // Server-side filter tab translation
      if (saleFilter === 'DIRECT') params.set('saleType', 'DIRECT');
      else if (saleFilter === 'EMI_DUE') { params.set('saleType', 'EMI'); params.set('emiStatus', 'DUE'); }
      else if (saleFilter === 'EMI_PAID') { params.set('saleType', 'EMI'); params.set('emiStatus', 'PAID'); }

      const res = await api.get<{ sales: Sale[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(`/sales?${params.toString()}`);
      setSales(res.sales || []);
      setPagination(res.pagination ?? null);
      setCurrentPage(page);
    } catch (err) {
      console.error('Failed to load sales:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search — fires 400 ms after the user stops typing
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      fetchSales(1, value);
    }, 400);
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

  // Cart calculations — prices are GST-inclusive (18% already inside the entered price)
  // grandTotal = what the customer pays = sum of (unitPrice × qty − discount) exactly as entered
  // taxableAmount = grandTotal ÷ 1.18  (base extracted from inclusive price)
  // cgstAmount = taxableAmount × 9%
  // sgstAmount = taxableAmount × 9%
  const grandTotal = Math.round(
    Math.max(0, cartItems.reduce((acc, i) => acc + i.unitPrice * i.quantity - (i.discount || 0) * i.quantity, 0))
  );
  const subtotal = cartItems.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
  const discountTotal = cartItems.reduce((acc, i) => acc + (i.discount || 0) * i.quantity, 0);
  const taxableAmount = Math.round((grandTotal / 1.18) * 100) / 100;
  const cgstAmount = Math.round(taxableAmount * 0.09 * 100) / 100;
  const sgstAmount = Math.round(taxableAmount * 0.09 * 100) / 100;
  const totalGst = Math.round((cgstAmount + sgstAmount) * 100) / 100;

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
      const d = addMonthsPreservingDay(baseDate, i);
      let amount = monthlyEmi;
      if (i === emiTenureMonths) {
        amount = Math.max(0, financedPrincipal - runningAllocated);
      } else {
        runningAllocated += amount;
      }
      const monthName = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      schedule.push({
        monthIndex: i,
        billingMonth: `Month ${i} (${monthName})`,
        dueDate: d.toISOString().slice(0, 10),
        amountDue: amount,
      });
    }
    return schedule;
  }, [saleType, emiTenureMonths, financedPrincipal, monthlyEmi]);

  // Dynamic step tabs based on Sale Type (EMI vs DIRECT)
  // For Direct Selling, the EMI tab is skipped and user moves directly from Items to Dispatch & Delivery!
  const availablePosTabs = useMemo(() => {
    if (saleType === 'DIRECT') {
      return [
        { key: 'items' as const, label: '1. Items & Customer', icon: <Package className="h-3.5 w-3.5" /> },
        { key: 'dispatch' as const, label: '2. Dispatch & Delivery', icon: <Truck className="h-3.5 w-3.5" /> },
      ];
    }
    return [
      { key: 'items' as const, label: '1. Items & Customer', icon: <Package className="h-3.5 w-3.5" /> },
      { key: 'payment' as const, label: '2. EMI Financing Plan', icon: <CreditCard className="h-3.5 w-3.5" /> },
      { key: 'dispatch' as const, label: '3. Dispatch & Delivery', icon: <Truck className="h-3.5 w-3.5" /> },
    ];
  }, [saleType]);

  // If sale type is switched to DIRECT while currently on payment tab, jump directly to dispatch
  useEffect(() => {
    if (saleType === 'DIRECT' && posTab === 'payment') {
      setPosTab('dispatch');
    }
  }, [saleType, posTab]);

  // Step-by-step tab validation before advancing
  const validateTab = (tab: 'items' | 'payment' | 'dispatch'): boolean => {
    setSaleError('');

    if (tab === 'items') {
      if (cartItems.length === 0) {
        setSaleError('Cart is empty. Please add at least one product before proceeding.');
        return false;
      }

      const trimmedName = customerName.trim();
      const trimmedPhone = customerPhone.trim();
      const trimmedEmail = customerEmail.trim();

      if (!trimmedName) {
        setSaleError('Customer Name is required.');
        return false;
      }

      if (!trimmedPhone) {
        setSaleError('Customer Phone Number is mandatory for billing, warranty & EMI alerts.');
        return false;
      }

      if (!/^[6-9]\d{9}$/.test(trimmedPhone)) {
        setSaleError('Customer Phone Number must be a valid 10-digit Indian mobile number (e.g. 9876543210).');
        return false;
      }

      if (!trimmedEmail) {
        setSaleError('Customer Email Address is mandatory for tax invoice & EMI payment reminders.');
        return false;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        setSaleError('Please provide a valid Customer Email Address.');
        return false;
      }

      return true;
    }

    if (tab === 'payment') {
      if (saleType === 'EMI') {
        if (effectiveDownPayment >= grandTotal) {
          setSaleError('Down Payment is equal to or greater than Grand Total. Please choose "Direct Sale (Full Payment)" instead.');
          return false;
        }
        if (emiTenureMonths < 1 || emiTenureMonths > 36) {
          setSaleError('Please select a valid EMI tenure between 1 and 36 months.');
          return false;
        }
      }
      return true;
    }

    return true;
  };

  const handleNextTab = () => {
    if (!validateTab(posTab)) return;

    if (posTab === 'items') {
      // Direct selling skips EMI tab and moves straight to dispatch & delivery!
      if (saleType === 'DIRECT') {
        setPosTab('dispatch');
      } else {
        setPosTab('payment');
      }
    } else if (posTab === 'payment') {
      setPosTab('dispatch');
    }
  };

  const handleBackTab = () => {
    setSaleError('');
    if (posTab === 'dispatch') {
      // Direct selling goes back straight to items
      if (saleType === 'DIRECT') {
        setPosTab('items');
      } else {
        setPosTab('payment');
      }
    } else if (posTab === 'payment') {
      setPosTab('items');
    }
  };

  const handleTabClick = (targetTab: 'items' | 'payment' | 'dispatch') => {
    if (targetTab === posTab) return;
    if (posTab === 'items' && !validateTab('items')) return;
    if (posTab === 'payment' && !validateTab('payment')) return;
    setPosTab(targetTab);
  };

  const handleCreateSale = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaleError('');

    // CRITICAL GUARD: Only allow sale completion and invoice generation when on the final step (Dispatch & Delivery)
    if (posTab !== 'dispatch') {
      return;
    }

    if (isSubmittingSale) {
      return;
    }

    if (!validateTab('items')) {
      setPosTab('items');
      return;
    }

    if (saleType === 'EMI' && !validateTab('payment')) {
      setPosTab('payment');
      return;
    }

    // Required Customer Name, Phone and Email validation
    const trimmedName = customerName.trim();
    const trimmedPhone = customerPhone.trim();
    const trimmedEmail = customerEmail.trim();

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
        sendReceiptEmail: sendSaleReceiptEmail,
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
      setPosTab('items');
      fetchSales();
      const created = (res as any)?.sale || (res as any)?.data?.sale || (res as any);
      if (created && created._id) {
        setActiveInvoice(created);
      }
    } catch (err: any) {
      setSaleError(err.message || 'Failed to record customer sale.');
    } finally {
      setIsSubmittingSale(false);
    }
  };

  // Open EMI Ledger
  const openEmiLedger = (sale: Sale) => {
    // Look up freshest record in case sale state was updated via Edit
    const freshSale = sales.find((s) => s._id === sale._id) || sale;
    setSelectedSaleForLedger(freshSale);
    setEmiCustomerEmail(freshSale.customerEmail || '');
    setSendEmiPaymentReceiptEmail(true);
    setEmiLedgerError('');
    setEmiReminderFeedback('');
    setEmiTransactionRef('');
    setEmiPaymentNotes('');
    setSettleAllRemaining(false);
    setEarlySettlementDiscount(0);
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

  // Automatically open EMI ledger modal if redirected from Notification Bell with ?emi=INVOICE
  useEffect(() => {
    if (typeof window !== 'undefined' && sales.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const emiRef = urlParams.get('emi') || urlParams.get('invoice');
      if (emiRef) {
        const found = sales.find(
          (s) =>
            s.invoiceNumber?.toLowerCase() === emiRef.toLowerCase() ||
            s._id === emiRef
        );
        if (found) {
          openEmiLedger(found);
        }
      }
    }
  }, [sales]);

  // Record EMI installment payment (supports single month, multi-month, or early lump-sum payoff)
  const handleRecordEmiPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSaleForLedger) return;
    setEmiLedgerError('');

    if (emiPaymentAmount <= 0 && !settleAllRemaining) {
      setEmiLedgerError('Please enter a valid installment payment amount.');
      return;
    }

    if (!emiTransactionRef.trim()) {
      setEmiLedgerError('Transaction No. / UPI Reference is compulsory.');
      return;
    }

    setIsRecordingEmiPayment(true);

    try {
      const res = await api.post<{ success: boolean; data?: { sale: Sale; emailSent?: boolean; recipient?: string }; sale?: Sale; emailSent?: boolean; recipient?: string }>(
        `/sales/${selectedSaleForLedger._id}/emi-payments`,
        {
          amount: Math.round(emiPaymentAmount),
          billingMonth: settleAllRemaining ? undefined : (selectedEmiBillingMonth || undefined),
          paymentMethod: emiPaymentMethod,
          transactionRef: emiTransactionRef.trim(),
          notes: emiPaymentNotes.trim() || undefined,
          earlySettlementDiscount: earlySettlementDiscount > 0 ? Math.round(earlySettlementDiscount) : undefined,
          settleAllRemaining: settleAllRemaining || undefined,
          customerEmail: emiCustomerEmail.trim() || undefined,
          sendReceiptEmail: sendEmiPaymentReceiptEmail,
        }
      );

      const updated = res.data?.sale || res.sale || selectedSaleForLedger;
      const emailSent = (res as any)?.emailSent || (res as any)?.data?.emailSent;
      const recipient = (res as any)?.recipient || (res as any)?.data?.recipient || emiCustomerEmail || selectedSaleForLedger.customerEmail;

      setSelectedSaleForLedger(updated);
      setSales((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
      setEmiTransactionRef('');
      setEmiPaymentNotes('');
      setSettleAllRemaining(false);
      setEarlySettlementDiscount(0);
      if (emailSent && recipient) {
        setEmiReminderFeedback(
          `✅ EMI payment of ${formatCurrency(emiPaymentAmount)} recorded & official receipt email dispatched to ${recipient}!`
        );
      } else if (!sendEmiPaymentReceiptEmail) {
        setEmiReminderFeedback(
          `EMI payment of ${formatCurrency(emiPaymentAmount)} recorded successfully (receipt email skipped as unchecked).`
        );
      } else {
        setEmiReminderFeedback(`EMI payment of ${formatCurrency(emiPaymentAmount)} recorded successfully.`);
      }
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

  // Adjust EMI Installment Due
  const handleOpenAdjustEmiDue = (payment: EmiMonthlyPayment) => {
    setAdjustingEmiMonth(payment);
    setAdjustAmountDue(payment.amountDue);
    setAdjustDueDate(payment.dueDate ? new Date(payment.dueDate).toISOString().slice(0, 10) : '');
    setAdjustCarryForward(true);
    setAdjustReason('');
    setAdjustModalError('');
  };

  const handleSaveAdjustEmiDue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSaleForLedger || !adjustingEmiMonth) return;
    setIsAdjustingEmiDue(true);
    setAdjustModalError('');
    try {
      const res = await api.post<{ success: boolean; data?: { sale: Sale }; sale?: Sale }>(
        `/sales/${selectedSaleForLedger._id}/adjust-emi-due`,
        {
          monthIndex: adjustingEmiMonth.monthIndex,
          newAmountDue: Math.round(adjustAmountDue),
          newDueDate: adjustDueDate || undefined,
          carryForwardDifference: adjustCarryForward,
          reason: adjustReason.trim() || undefined,
        }
      );
      const updated = res.data?.sale || res.sale || selectedSaleForLedger;
      setSelectedSaleForLedger(updated);
      setSales((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
      setAdjustingEmiMonth(null);
      fetchSales();
    } catch (err: any) {
      setAdjustModalError(err.message || 'Failed to adjust EMI installment.');
    } finally {
      setIsAdjustingEmiDue(false);
    }
  };

  // Edit Recorded EMI Payment
  const handleOpenEditEmiPayment = (payment: EmiMonthlyPayment) => {
    setEditingEmiPayment(payment);
    setEditEmiAmountPaid(payment.amountPaid || 0);
    setEditEmiAmountDue(payment.amountDue || 0);
    setEditEmiPaymentMethod((payment.paymentMethod as any) || 'UPI');
    setEditEmiTransactionRef(payment.transactionRef || '');
    setEditEmiNotes(payment.notes || '');
    setEditEmiModalError('');
  };

  const handleSaveEditEmiPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSaleForLedger || !editingEmiPayment) return;
    setIsUpdatingEmiPayment(true);
    setEditEmiModalError('');
    try {
      const res = await api.put<{ success: boolean; data?: { sale: Sale }; sale?: Sale }>(
        `/sales/${selectedSaleForLedger._id}/emi-payments/${editingEmiPayment.monthIndex}`,
        {
          amountPaid: Math.round(editEmiAmountPaid),
          amountDue: Math.round(editEmiAmountDue),
          paymentMethod: editEmiPaymentMethod,
          transactionRef: editEmiTransactionRef.trim() || undefined,
          notes: editEmiNotes.trim() || undefined,
        }
      );
      const updated = res.data?.sale || res.sale || selectedSaleForLedger;
      setSelectedSaleForLedger(updated);
      setSales((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
      setEditingEmiPayment(null);
      fetchSales();
    } catch (err: any) {
      setEditEmiModalError(err.message || 'Failed to update EMI payment.');
    } finally {
      setIsUpdatingEmiPayment(false);
    }
  };

  // Add Extra EMI Month
  const handleOpenAddEmiMonth = () => {
    setIsAddingEmiMonthModalOpen(true);
    setNewEmiMonthAmount(Math.round(selectedSaleForLedger?.monthlyEmiAmount || 0));
    const payments = selectedSaleForLedger?.emiPayments || [];
    const lastP = payments.length > 0 ? payments[payments.length - 1] : null;
    if (lastP?.dueDate) {
      const d = new Date(lastP.dueDate);
      d.setMonth(d.getMonth() + 1);
      setNewEmiMonthDueDate(d.toISOString().slice(0, 10));
    } else {
      setNewEmiMonthDueDate('');
    }
    setNewEmiMonthReason('');
  };

  const handleSaveAddEmiMonth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSaleForLedger) return;
    setIsSubmittingAddMonth(true);
    try {
      const res = await api.post<{ success: boolean; data?: { sale: Sale }; sale?: Sale }>(
        `/sales/${selectedSaleForLedger._id}/add-emi-month`,
        {
          amountDue: Math.round(newEmiMonthAmount),
          dueDate: newEmiMonthDueDate || undefined,
          reason: newEmiMonthReason.trim() || undefined,
        }
      );
      const updated = res.data?.sale || res.sale || selectedSaleForLedger;
      setSelectedSaleForLedger(updated);
      setSales((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
      setIsAddingEmiMonthModalOpen(false);
      fetchSales();
    } catch (err: any) {
      setEmiLedgerError(err.message || 'Failed to add EMI installment month.');
    } finally {
      setIsSubmittingAddMonth(false);
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
    setEditEmiTenureMonths(sale.emiTenureMonths || 0);

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

      // Update active sales state immediately so changes reflect everywhere (table, ledger, invoice)
      const updatedSale: Sale | undefined = (res as any)?.sale || (res as any)?.data?.sale || (res as any);
      if (updatedSale && updatedSale._id) {
        setSales((prev) => prev.map((s) => (s._id === updatedSale._id ? updatedSale : s)));
        if (selectedSaleForLedger && selectedSaleForLedger._id === updatedSale._id) {
          setSelectedSaleForLedger(updatedSale);
        }
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
      const updatedSale = (res as any)?.sale || (res as any)?.data?.sale;
      if (updatedSale && selectedSaleForLedger && selectedSaleForLedger._id === sale._id) {
        setSelectedSaleForLedger(updatedSale);
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
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Sales &amp; Point of Sale (POS)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Stereobliss Retail — Live stock lookup, retail sales transactions, EMI financing, invoices, and customer reminders.
          </p>
        </div>

        {canMakeSales() && (
          <Button
            size="sm"
            variant="default"
            onClick={() => {
              setIsNewSaleOpen(true);
              setPosTab('items');
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
              // Show total count for active tab (from pagination), dash for inactive
              const count = isActive && pagination ? pagination.total : null;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => { setSaleFilter(tab.key); }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${isActive ? tab.activeClass : tab.inactiveClass}`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {count !== null && (
                    <span
                      className={`min-w-[18px] text-center px-1 py-0 rounded-full text-[10px] font-bold ${
                        isActive
                          ? (tab as any).activeBadgeClass ?? 'bg-white/20 text-white'
                          : (tab as any).badgeClass ?? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  )}
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
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); fetchSales(1, ''); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                âœ•
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
                ) : sales.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      {searchQuery || saleFilter !== 'ALL' ? 'No sales match the current filter.' : 'No sales recorded yet.'}
                    </td>
                  </tr>
                ) : (
                  sales.map((sale) => {
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
                            {sale.lineItems?.map((li, idx) => {
                              const pName = (li.product as any)?.name || (li as any).productName || 'Musical Product';
                              const pColor = (li.product as any)?.color;
                              return (
                                <div key={idx} className="text-slate-800 dark:text-slate-200">
                                  • <span className="font-semibold">{pName}</span>
                                  {pColor && (
                                    <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                                      {pColor}
                                    </span>
                                  )}
                                  <span className="text-slate-500 font-normal ml-1">(x{li.quantity})</span>
                                  {li.discount ? (
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold ml-1">
                                      (−{formatCurrency(li.discount * li.quantity)})
                                    </span>
                                  ) : null}
                                </div>
                              );
                            })}
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

        {/* ── Pagination bar ── */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
            {/* Left: record count */}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, pagination.total)}
              </span>{' '}
              of{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-200">{pagination.total}</span>{' '}
              sales
            </p>

            {/* Right: page buttons */}
            <div className="flex items-center gap-1">
              {/* Prev */}
              <button
                type="button"
                disabled={currentPage === 1 || isLoading}
                onClick={() => fetchSales(currentPage - 1)}
                className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:border-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-bold"
                title="Previous page"
              >
                ‹
              </button>

              {/* Page number pills */}
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter(p => {
                  // Always show first, last, current, and neighbours
                  return (
                    p === 1 ||
                    p === pagination.totalPages ||
                    Math.abs(p - currentPage) <= 1
                  );
                })
                .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) {
                    acc.push('…');
                  }
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '…' ? (
                    <span key={`ellipsis-${i}`} className="h-7 w-7 flex items-center justify-center text-slate-400 text-xs">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      disabled={isLoading}
                      onClick={() => fetchSales(p as number)}
                      className={`h-7 min-w-[28px] px-1.5 flex items-center justify-center rounded-md border text-xs font-semibold transition-colors disabled:cursor-not-allowed ${
                        p === currentPage
                          ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}

              {/* Next */}
              <button
                type="button"
                disabled={currentPage === pagination.totalPages || isLoading}
                onClick={() => fetchSales(currentPage + 1)}
                className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:border-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-bold"
                title="Next page"
              >
                ›
              </button>
            </div>
          </div>
        )}

        {/* Single page record count (no pagination needed) */}
        {pagination && pagination.totalPages <= 1 && pagination.total > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {pagination.total} record{pagination.total !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </Card>

      {/* POS New Customer Sale Modal */}
      <Modal
        isOpen={isNewSaleOpen}
        onClose={() => setIsNewSaleOpen(false)}
        title="New Customer Sale — POS"
        description={
          saleType === 'DIRECT'
            ? 'Direct Sale (Full Payment): Select products, enter customer details, and configure delivery dispatch.'
            : 'EMI Plan Sale: Select products, customer details, zero-interest installment plan, and delivery dispatch.'
        }
        maxWidth="5xl"
        footer={
          <div className="flex items-center justify-between gap-3">
            {/* Step navigation / Back button */}
            <div className="flex items-center gap-2">
              {posTab !== 'items' && (
                <button
                  type="button"
                  onClick={handleBackTab}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-colors text-slate-700 dark:text-slate-300"
                >
                  ← Back
                </button>
              )}
              {/* Step indicator pills */}
              <div className="flex items-center gap-1.5 ml-1">
                {availablePosTabs.map((t) => (
                  <div
                    key={t.key}
                    title={t.label}
                    className={`h-1.5 rounded-full transition-all duration-200 ${
                      posTab === t.key
                        ? 'w-8 bg-amber-500'
                        : 'w-4 bg-slate-200 dark:bg-slate-700'
                    }`}
                  />
                ))}
                <span className="text-[11px] text-slate-400 font-medium ml-1">
                  Step {availablePosTabs.findIndex((t) => t.key === posTab) + 1} of {availablePosTabs.length}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsNewSaleOpen(false)}>
                Cancel
              </Button>
              {posTab !== 'dispatch' ? (
                <Button
                  key="pos-next-footer-btn"
                  type="button"
                  size="sm"
                  variant="default"
                  className="font-bold gap-1.5"
                  onClick={handleNextTab}
                >
                  <span>{posTab === 'items' && saleType === 'DIRECT' ? 'Next: Dispatch & Delivery →' : 'Next →'}</span>
                </Button>
              ) : (
                <Button
                  key="pos-generate-footer-btn"
                  type="button"
                  size="sm"
                  variant="default"
                  isLoading={isSubmittingSale}
                  onClick={handleCreateSale}
                  className="font-bold gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md px-4"
                >
                  <Receipt className="h-4 w-4" />
                  <span>{saleType === 'EMI' ? 'Generate Invoice & Setup EMI Plan' : 'Generate Invoice & Complete Sale'}</span>
                </Button>
              )}
            </div>
          </div>
        }
      >
        <form
          id="pos-sale-form"
          onSubmit={(e) => {
            e.preventDefault();
          }}
          onKeyDown={(e) => {
            // Prevent accidental early submission when pressing Enter anywhere in form
            if (e.key === 'Enter') {
              e.preventDefault();
              if (posTab !== 'dispatch') {
                handleNextTab();
              }
            }
          }}
        >
          {saleError && (
            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs font-semibold text-red-500 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{saleError}</span>
            </div>
          )}

          {/* ── Dynamic Tab Bar ── */}
          <div className="flex items-center gap-1 mb-5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
            {availablePosTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabClick(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                  posTab === tab.key
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-700 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* ••••••••••••••••••••••••••••••••••••••••••
              TAB 1 — Items & Customer
          •••••••••••••••••••••••••••••••••••••••••• */}
          <div className={posTab === 'items' ? 'space-y-4' : 'hidden'}>

            {/* Sale Type Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { type: 'DIRECT' as const, label: '1. Direct Sale (Full Payment)', badge: 'Standard POS', badgeColor: 'text-emerald-600 bg-emerald-500/10', desc: 'Full amount paid upfront via UPI, Card, Cash, or Bank Transfer.' },
                { type: 'EMI' as const,    label: '2. EMI Installment Financing', badge: 'Ledger Plan', badgeColor: 'text-amber-600 bg-amber-500/10', desc: 'Down payment + monthly installments with automated reminders.' },
              ].map(({ type, label, badge, badgeColor, desc }) => (
                <div
                  key={type}
                  onClick={() => {
                    setSaleType(type);
                    if (type === 'EMI' && downPayment === 0 && grandTotal > 0) setDownPayment(Math.round(grandTotal * 0.2));
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    saleType === type
                      ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-950/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${saleType === type ? 'border-amber-500 bg-amber-500' : 'border-slate-400'}`}>
                    {saleType === type && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5 flex-wrap">
                      <span className="text-slate-900 dark:text-white">{label}</span>
                      <span className={`text-[10px] font-semibold px-1.5 rounded ${badgeColor}`}>{badge}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Customer Details */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Customer Details</span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <Input label="Customer Name *" required placeholder="e.g. Rahul Sharma" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                <Input label="Phone Number *" required placeholder="9876543210" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                <Input label="Email Address *" type="email" required placeholder="rahul@example.com" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {saleType === 'DIRECT' ? 'Payment Method *' : 'Down Payment Via *'}
                  </label>
                  <select
                    value={saleType === 'DIRECT' ? paymentMethod : downPaymentMethod}
                    onChange={(e) => saleType === 'DIRECT' ? setPaymentMethod(e.target.value as any) : setDownPaymentMethod(e.target.value as any)}
                    className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-semibold text-amber-500"
                  >
                    <option value="UPI">UPI (GPay / PhonePe)</option>
                    <option value="CARD">Credit / Debit Card</option>
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank IMPS / NEFT</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Product Picker + Cart — two columns */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

              {/* Left: catalogue */}
              <div className="lg:col-span-2 space-y-2">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Available Products</h3>
                <div className="max-h-[320px] overflow-y-auto space-y-1.5 pr-0.5">
                  {products.filter((p) => p.availableForSale > 0).map((p) => (
                    <div
                      key={p._id}
                      onClick={() => handleAddToCart(p)}
                      className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-amber-500 bg-white dark:bg-slate-950 cursor-pointer transition-colors flex justify-between items-center text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-semibold text-slate-900 dark:text-white break-words leading-tight">{p.name}
                          {p.color && <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">{p.color}</span>}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{p.brand} · Avail: <strong>{p.availableForSale}</strong></div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <div className="font-bold text-amber-500">{formatCurrency(p.defaultSellingPrice)}</div>
                        <div className="text-[10px] text-slate-400 font-semibold">+ Add</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: cart + totals */}
              <div className="lg:col-span-3 space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Cart ({cartItems.length} item{cartItems.length !== 1 ? 's' : ''})
                </h3>

                {cartItems.length === 0 ? (
                  <div className="h-28 flex items-center justify-center text-xs text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                    Click a product on the left to add it to the cart
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[240px] overflow-y-auto pr-0.5">
                    {cartItems.map((item, idx) => (
                      <div key={item.product._id} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-slate-900 dark:text-white break-words leading-tight pr-2">{item.product.name}
                            {item.product.color && <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">{item.product.color}</span>}
                          </span>
                          <button type="button" onClick={() => handleRemoveFromCart(item.product._id)} className="text-slate-400 hover:text-red-500 shrink-0">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-500">Qty</label>
                            <input type="number" min="1" max={item.product.availableForSale} placeholder="Qty" value={item.quantity || ''}
                              onChange={(e) => handleCartItemChange(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                              className="w-full h-7 px-2 rounded border border-slate-300 dark:border-slate-800 bg-transparent text-center font-bold" />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500">Unit Price (₹)</label>
                            <input type="number" min="0" placeholder="Price" value={item.unitPrice || ''}
                              onChange={(e) => handleCartItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="w-full h-7 px-2 rounded border border-slate-300 dark:border-slate-800 bg-transparent text-right font-semibold" />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500">Discount (₹)</label>
                            <input type="number" min="0" placeholder="0" value={item.discount || ''}
                              onChange={(e) => handleCartItemChange(idx, 'discount', parseFloat(e.target.value) || 0)}
                              className="w-full h-7 px-2 rounded border border-slate-300 dark:border-slate-800 bg-transparent text-right text-emerald-500 font-semibold" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* GST Summary */}
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-500"><span>Incl. Price Total:</span><span>{formatCurrency(subtotal)}</span></div>
                  {discountTotal > 0 && <div className="flex justify-between text-emerald-500 font-semibold"><span>Discount:</span><span>−{formatCurrency(discountTotal)}</span></div>}
                  <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px] border-t border-slate-200 dark:border-slate-700 pt-1"><span>Base (excl. GST):</span><span>{formatCurrency(taxableAmount)}</span></div>
                  <div className="flex justify-between text-amber-600 dark:text-amber-400 text-[11px]"><span>CGST 9% (incl.):</span><span>{formatCurrency(cgstAmount)}</span></div>
                  <div className="flex justify-between text-amber-600 dark:text-amber-400 text-[11px]"><span>SGST 9% (incl.):</span><span>{formatCurrency(sgstAmount)}</span></div>
                  <div className="flex justify-between font-extrabold text-slate-900 dark:text-white text-sm pt-1.5 border-t border-slate-200 dark:border-slate-700">
                    <span>Grand Total (GST Incl.):</span><span className="text-amber-500">{formatCurrency(grandTotal)}</span>
                  </div>
                  {saleType === 'EMI' && (
                    <div className="flex justify-between font-bold text-amber-600 dark:text-amber-400 pt-0.5">
                      <span>Due at POS (down payment):</span><span>{formatCurrency(effectiveDownPayment)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* In-tab step progression button */}
            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="default"
                className="font-bold gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs text-xs"
                onClick={handleNextTab}
              >
                <span>{saleType === 'DIRECT' ? 'Proceed to Step 2: Dispatch & Delivery →' : 'Proceed to Step 2: EMI Financing Plan →'}</span>
              </Button>
            </div>
          </div>

          {/* ••••••••••••••••••••••••••••••••••••••••••
              TAB 2 — Payment Plan (EMI Calculator)
          •••••••••••••••••••••••••••••••••••••••••• */}
          <div className={posTab === 'payment' ? 'space-y-4' : 'hidden'}>
            {saleType === 'DIRECT' ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 space-y-3">
                <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Direct Sale selected — no EMI plan needed.</p>
                <p className="text-xs">Switch to EMI on Tab 1 if you want to set up an installment plan.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Calculator */}
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-amber-500" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">EMI Financing Terms</span>
                    </div>
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">Zero Interest In-Store Plan</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">Down Payment (₹) *</label>
                      <input type="number" min="0" max={grandTotal} value={downPayment || ''}
                        placeholder="e.g. 5000"
                        onChange={(e) => setDownPayment(parseFloat(e.target.value) || 0)}
                        className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-amber-500 text-right" />
                      <span className="text-[10px] text-slate-400 block mt-1">Paid at POS checkout</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">EMI Tenure *</label>
                      <div className="grid grid-cols-5 gap-1 pt-1">
                        {[3, 6, 9, 12, 18].map((m) => (
                          <button key={m} type="button" onClick={() => setEmiTenureMonths(m)}
                            className={`h-9 rounded text-xs font-bold transition-all ${emiTenureMonths === m ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 hover:border-amber-400'}`}>
                            {m}M
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border border-amber-500/20 bg-white dark:bg-slate-900 space-y-1.5">
                      <div className="flex justify-between text-[11px] text-slate-500"><span>Grand Total:</span><span className="font-bold text-slate-900 dark:text-white">{formatCurrency(grandTotal)}</span></div>
                      <div className="flex justify-between text-[11px] text-slate-500"><span>Financed:</span><span className="font-bold text-slate-900 dark:text-white">{formatCurrency(financedPrincipal)}</span></div>
                      <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-800"><span>Monthly EMI:</span><span className="font-extrabold text-amber-500 text-sm">{formatCurrency(monthlyEmi)} / mo</span></div>
                    </div>
                  </div>
                </div>

                {/* Schedule preview */}
                {emiSchedulePreview.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      Installment Schedule — {emiSchedulePreview.length} Months
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                      {emiSchedulePreview.map((item) => (
                        <div key={item.monthIndex} className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-center text-[11px]">
                          <div className="font-bold text-slate-700 dark:text-slate-300 truncate">{item.billingMonth}</div>
                          <div className="text-[10px] text-slate-400">Due: {formatDate(item.dueDate)}</div>
                          <div className="font-mono font-extrabold text-amber-500 mt-1">{formatCurrency(item.amountDue)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* In-tab step navigation */}
                <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleBackTab}
                  >
                    ← Back to Items &amp; Customer
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="font-bold gap-1.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs"
                    onClick={handleNextTab}
                  >
                    <span>Proceed to Step 3: Dispatch &amp; Delivery →</span>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ••••••••••••••••••••••••••••••••••••••••••
              TAB 3 — Dispatch & GST Details
          •••••••••••••••••••••••••••••••••••••••••• */}
          <div className={posTab === 'dispatch' ? 'space-y-4' : 'hidden'}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Dealer / Buyer GSTIN" placeholder="e.g. 27ADDFS8650Q1Z6" value={customerGstin} onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())} />
              <Input label="Delivery / Billing Address" placeholder="e.g. Pimple Saudagar, Pune 411027" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
              <Input label="Dispatched Through" placeholder="XP India / Hand Delivery" value={dispatchThrough} onChange={(e) => setDispatchThrough(e.target.value)} />
              <Input label="Destination City" placeholder="PUNE" value={destination} onChange={(e) => setDestination(e.target.value)} />
              <Input label="e-Way Bill No." placeholder="e.g. 331000000001" value={eWayBillNo} onChange={(e) => setEWayBillNo(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">Notes (printed on invoice)</label>
                <input type="text" placeholder="e.g. Thank you for your purchase." value={notes} onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">Internal Remarks</label>
                <input type="text" placeholder="Internal audit note" value={remarks} onChange={(e) => setRemarks(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950" />
              </div>
            </div>

            {/* Final order summary before invoice generation */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px] tracking-wider">
                  Order &amp; Billing Summary Review
                </span>
                <span className="text-[10px] font-semibold text-slate-500">
                  Ready for Invoice Generation
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Customer</span>
                  <span className="font-bold text-slate-900 dark:text-white block">{customerName || '—'}</span>
                  <span className="text-[11px] text-slate-400 block">{customerPhone}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Sale Mode</span>
                  <span className="font-bold text-amber-500 block">{saleType === 'DIRECT' ? 'Direct Sale' : 'EMI Financing Plan'}</span>
                  <span className="text-[11px] text-slate-400 block">{saleType === 'DIRECT' ? paymentMethod : `${emiTenureMonths} Mo. Plan`}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Dispatch To</span>
                  <span className="font-bold text-slate-900 dark:text-white block truncate">{destination || 'PUNE'}</span>
                  <span className="text-[11px] text-slate-400 block truncate">{dispatchThrough || 'XP India'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Cart Items</span>
                  <span className="font-bold text-slate-900 dark:text-white block">{cartItems.length} Product{cartItems.length !== 1 ? 's' : ''}</span>
                  <span className="text-[11px] text-slate-400 block">{cartItems.reduce((acc, i) => acc + i.quantity, 0)} Units Total</span>
                </div>
              </div>

              {/* Financial Totals Row */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Incl. Price Total:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(subtotal)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Discount Offered:</span>
                  <span className={`font-bold ${discountTotal > 0 ? 'text-emerald-500 font-extrabold' : 'text-slate-400'}`}>
                    {discountTotal > 0 ? `−${formatCurrency(discountTotal)}` : '₹0'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Base (excl. GST):</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(taxableAmount)}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">Grand Total (GST Incl.):</span>
                  <span className="font-extrabold text-amber-500 text-sm">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Automatic Invoice Email Dispatch Toggle */}
            <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-gradient-to-r from-indigo-50/60 to-purple-50/40 dark:from-indigo-950/20 dark:to-purple-950/10 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Tax Invoice &amp; Receipt Email (Automatic)</span>
                </span>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Resend + Nodemailer Active
                </span>
              </div>
              <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={sendSaleReceiptEmail}
                  onChange={(e) => setSendSaleReceiptEmail(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300 select-none">
                  <strong className="text-slate-900 dark:text-white font-semibold">
                    Automatically dispatch official Tax Invoice PDF &amp; payment receipt to customer
                  </strong>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                    Will be emailed immediately to <strong>{customerEmail || 'the entered customer email address'}</strong> upon checkout.
                  </span>
                </span>
              </label>
            </div>

            {/* In-tab final submission action bar */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleBackTab}
              >
                ← Back to {saleType === 'DIRECT' ? 'Items & Customer' : 'EMI Financing Plan'}
              </Button>
              <Button
                type="button"
                variant="default"
                isLoading={isSubmittingSale}
                onClick={handleCreateSale}
                className="font-bold gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md text-xs sm:text-sm"
              >
                <Receipt className="h-4 w-4" />
                <span>{saleType === 'EMI' ? 'Generate Invoice & Setup EMI Plan' : 'Generate Invoice & Complete Sale'}</span>
              </Button>
            </div>
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
              <div className="flex items-center justify-between">
                <h4 className="font-bold uppercase tracking-wider text-slate-500 text-[11px]">
                  Month-by-Month EMI Installment Schedule ({selectedSaleForLedger.emiPayments?.length || 0} Months)
                </h4>
                <button
                  type="button"
                  onClick={handleOpenAddEmiMonth}
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>Extend EMI (+1 Month)</span>
                </button>
              </div>

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
                      <th className="py-2.5 px-3 text-right">Actions</th>
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
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {p.status !== 'PAID' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedEmiBillingMonth(p.billingMonth);
                                  setEmiPaymentAmount(Math.round(Math.max(0, p.amountDue - (p.amountPaid || 0))));
                                  setSettleAllRemaining(false);
                                  setEarlySettlementDiscount(0);
                                }}
                                className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 transition-colors"
                                title="Pay this installment"
                              >
                                Pay
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenAdjustEmiDue(p)}
                              className="p-1 rounded text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors"
                              title="Adjust Installment Due Amount, Due Date, or Carry Forward"
                            >
                              <Sliders className="h-3.5 w-3.5" />
                            </button>
                            {p.status === 'PAID' && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditEmiPayment(p)}
                                className="p-1 rounded text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                                title="Edit Paid Transaction Record (Typos / Ref)"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Flexible Payoff & Early Settlement Banner */}
            {(() => {
              const unpaidInstallments = (selectedSaleForLedger.emiPayments || []).filter((p) => p.status !== 'PAID');
              const totalRemainingDue = unpaidInstallments.reduce(
                (acc, p) => acc + Math.max(0, p.amountDue - (p.amountPaid || 0)),
                0
              );

              if (unpaidInstallments.length === 0) return null;

              return (
                <div className="p-4 rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-emerald-500/10 dark:from-amber-950/20 dark:via-slate-900/40 dark:to-emerald-950/20 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                        <Zap className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
                          <span>Flexible Payoff &amp; Early Settlement</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono font-bold">
                            {unpaidInstallments.length} Unpaid {unpaidInstallments.length === 1 ? 'EMI' : 'EMIs'}
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Pay multiple installments together or settle all remaining EMIs at once with early payoff adjustment.
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Total Remaining Balance</span>
                      <span className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400">
                        {formatCurrency(totalRemainingDue)}
                      </span>
                    </div>
                  </div>

                  {/* Quick 1-Click Payoff Pills */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                    <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Quick Select:</span>

                    {/* 1 EMI */}
                    <button
                      type="button"
                      onClick={() => {
                        const firstDue = unpaidInstallments[0];
                        const dueAmt = Math.round(Math.max(0, firstDue.amountDue - (firstDue.amountPaid || 0)));
                        setEmiPaymentAmount(dueAmt);
                        setSelectedEmiBillingMonth(firstDue.billingMonth);
                        setSettleAllRemaining(false);
                        setEarlySettlementDiscount(0);
                        setEmiPaymentNotes(`Monthly installment for ${firstDue.billingMonth}`);
                      }}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all ${
                        !settleAllRemaining && selectedEmiBillingMonth === unpaidInstallments[0]?.billingMonth
                          ? 'border-amber-500 bg-amber-500/20 text-amber-700 dark:text-amber-300 shadow-xs'
                          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-amber-400'
                      }`}
                    >
                      Pay Next 1 EMI ({formatCurrency(Math.max(0, unpaidInstallments[0]?.amountDue - (unpaidInstallments[0]?.amountPaid || 0)))})
                    </button>

                    {/* 2 EMIs if available */}
                    {unpaidInstallments.length >= 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          const sum2 = Math.round(
                            unpaidInstallments.slice(0, 2).reduce((acc, p) => acc + Math.max(0, p.amountDue - (p.amountPaid || 0)), 0)
                          );
                          setEmiPaymentAmount(sum2);
                          setSelectedEmiBillingMonth('');
                          setSettleAllRemaining(false);
                          setEarlySettlementDiscount(0);
                          setEmiPaymentNotes(`Lump-sum payment for next 2 EMIs (${unpaidInstallments[0]?.billingMonth}, ${unpaidInstallments[1]?.billingMonth})`);
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-amber-400 transition-all"
                      >
                        Pay Next 2 EMIs ({formatCurrency(unpaidInstallments.slice(0, 2).reduce((acc, p) => acc + Math.max(0, p.amountDue - (p.amountPaid || 0)), 0))})
                      </button>
                    )}

                    {/* 3 EMIs if available */}
                    {unpaidInstallments.length >= 3 && (
                      <button
                        type="button"
                        onClick={() => {
                          const sum3 = Math.round(
                            unpaidInstallments.slice(0, 3).reduce((acc, p) => acc + Math.max(0, p.amountDue - (p.amountPaid || 0)), 0)
                          );
                          setEmiPaymentAmount(sum3);
                          setSelectedEmiBillingMonth('');
                          setSettleAllRemaining(false);
                          setEarlySettlementDiscount(0);
                          setEmiPaymentNotes(`Lump-sum payment for next 3 EMIs`);
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-amber-400 transition-all"
                      >
                        Pay Next 3 EMIs ({formatCurrency(unpaidInstallments.slice(0, 3).reduce((acc, p) => acc + Math.max(0, p.amountDue - (p.amountPaid || 0)), 0))})
                      </button>
                    )}

                    {/* Settle All Remaining EMIs at Once */}
                    <button
                      type="button"
                      onClick={() => {
                        setSettleAllRemaining(true);
                        setSelectedEmiBillingMonth('');
                        setEmiPaymentAmount(Math.max(0, totalRemainingDue - earlySettlementDiscount));
                        setEmiPaymentNotes(`Early payoff & full settlement of remaining ${unpaidInstallments.length} EMIs`);
                      }}
                      className={`px-3 py-1 text-[11px] font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                        settleAllRemaining
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                          : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Settle All Remaining {unpaidInstallments.length} EMIs at Once ({formatCurrency(totalRemainingDue)})</span>
                    </button>
                  </div>

                  {/* Early Payoff / Settlement Waiver Section when Settle All is Active */}
                  {settleAllRemaining && (
                    <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/30 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">
                            Early Payoff / Foreclosure Mode Active
                          </span>
                          <span className="text-[11px] text-slate-600 dark:text-slate-400">
                            All {unpaidInstallments.length} remaining installments will be closed and marked PAID. Outstanding balance will become ₹0.
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            Early Settlement Discount / Waiver (₹):
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={totalRemainingDue}
                            value={earlySettlementDiscount || ''}
                            placeholder="0"
                            onChange={(e) => {
                              const disc = Math.max(0, Math.min(totalRemainingDue, Math.round(parseFloat(e.target.value) || 0)));
                              setEarlySettlementDiscount(disc);
                              setEmiPaymentAmount(Math.max(0, totalRemainingDue - disc));
                            }}
                            className="w-24 h-8 px-2 rounded border border-emerald-400 dark:border-emerald-800 bg-white dark:bg-slate-900 font-mono font-bold text-right text-emerald-600 dark:text-emerald-400 text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs font-semibold pt-1 border-t border-emerald-500/20 text-emerald-800 dark:text-emerald-200">
                        <span>
                          Original Due: <span className="font-mono">{formatCurrency(totalRemainingDue)}</span>
                          {earlySettlementDiscount > 0 && (
                            <> &minus; Waiver: <span className="font-mono text-rose-500">₹{earlySettlementDiscount}</span></>
                          )}
                        </span>
                        <span className="font-bold">
                          Net Amount to Collect: <span className="font-mono font-extrabold text-amber-500 text-sm">₹{emiPaymentAmount}</span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Record Installment Payment Form */}
            {(selectedSaleForLedger.totalEmiDue ?? 0) > 0 && (
              <form
                onSubmit={handleRecordEmiPayment}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                    {settleAllRemaining ? 'Confirm Early Payoff & Full Settlement' : 'Record Monthly EMI Payment'}
                  </span>
                  <span className="text-[11px] text-slate-500">Instant ledger &amp; invoice update</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-semibold uppercase text-slate-500">
                        Amount to Pay (₹) *
                      </label>
                      {(selectedSaleForLedger.totalEmiDue ?? 0) > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setEmiPaymentAmount(selectedSaleForLedger.totalEmiDue ?? 0);
                            setSelectedEmiBillingMonth('');
                            setSettleAllRemaining(false);
                            setEarlySettlementDiscount(0);
                          }}
                          className="text-[10px] font-bold text-amber-500 hover:underline"
                        >
                          Pay Full Balance (₹{selectedSaleForLedger.totalEmiDue ?? 0})
                        </button>
                      )}
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={emiPaymentAmount || ''}
                      placeholder="Enter amount"
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
                      onChange={(e) => {
                        setSelectedEmiBillingMonth(e.target.value);
                        setSettleAllRemaining(false);
                      }}
                      className="w-full h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-semibold"
                    >
                      <option value="">{settleAllRemaining ? 'All Remaining Months' : 'Next Due Month'}</option>
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

                {/* Customer Email & Receipt Dispatch Toggle */}
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-950/60 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Mail className="h-3 w-3 text-amber-500" />
                      <span>Customer Email for Receipt</span>
                    </label>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Auto-dispatch ready</span>
                  </div>
                  <input
                    type="email"
                    value={emiCustomerEmail}
                    onChange={(e) => setEmiCustomerEmail(e.target.value)}
                    placeholder="customer@example.com (Required for sending payment receipt)"
                    className="w-full h-8 px-3 rounded-md border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs"
                  />
                  <label className="flex items-center gap-2 cursor-pointer pt-0.5">
                    <input
                      type="checkbox"
                      checked={sendEmiPaymentReceiptEmail}
                      onChange={(e) => setSendEmiPaymentReceiptEmail(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-amber-500 focus:ring-amber-400 cursor-pointer"
                    />
                    <span className="text-[11px] text-slate-700 dark:text-slate-300 select-none">
                      Automatically dispatch official EMI installment payment receipt email to customer upon recording
                    </span>
                  </label>
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
                    className={`gap-1.5 font-bold ${
                      settleAllRemaining ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>
                      {settleAllRemaining
                        ? `Confirm & Settle All Remaining EMIs (₹${emiPaymentAmount})`
                        : `Confirm EMI Payment (₹${emiPaymentAmount})`}
                    </span>
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
                              {formatCurrency(Math.round(p.amount))}
                            </span>
                            <span>&bull;</span>
                            <span>{p.paymentMethod}</span>
                            <span className="font-mono text-[11px] text-amber-600 dark:text-amber-400 font-bold ml-1">
                              (Ref: {p.transactionRef})
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {p.billingMonth || p.paymentType} {p.notes ? `â€¢ ${p.notes}` : ''}
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
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400"
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
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400"
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
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white placeholder:text-slate-400"
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
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-mono uppercase text-slate-900 dark:text-white placeholder:text-slate-400"
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
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white placeholder:text-slate-400"
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
                    className="w-full h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white"
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
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white placeholder:text-slate-400"
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
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white placeholder:text-slate-400"
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
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400"
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
                        <span className="font-bold text-slate-950 dark:text-white block break-words">
                          {(li as any).productName || (li.product as any)?.name || 'Musical Product'}
                        </span>
                        <span className="inline-block mt-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          Qty: {li.quantity}
                        </span>
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                          Unit Price (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0"
                          value={li.unitPrice || ''}
                          onChange={(e) => {
                            const updated = [...editLineItems];
                            updated[idx].unitPrice = parseFloat(e.target.value) || 0;
                            setEditLineItems(updated);
                          }}
                          className="w-full h-8 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-950 dark:text-white font-bold font-mono text-right placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                          Discount/Unit (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0"
                          value={li.discount || ''}
                          onChange={(e) => {
                            const updated = [...editLineItems];
                            updated[idx].discount = parseFloat(e.target.value) || 0;
                            setEditLineItems(updated);
                          }}
                          className="w-full h-8 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-bold font-mono text-right placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                          HSN/SAC
                        </label>
                        <input
                          type="text"
                          placeholder="9202"
                          value={li.hsnCode}
                          onChange={(e) => {
                            const updated = [...editLineItems];
                            updated[idx].hsnCode = e.target.value;
                            setEditLineItems(updated);
                          }}
                          className="w-full h-8 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-950 dark:text-white font-bold font-mono text-center placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
                        />
                      </div>
                      <div className="text-right">
                        <span className="block text-[9px] uppercase font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                          Net Total
                        </span>
                        <span className="font-extrabold text-slate-950 dark:text-white font-mono text-xs">
                          {formatCurrency(Math.round(lineTotal))}
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
                const grand = Math.round(Math.max(0, sub - disc));
                const taxBase = Math.round((grand / 1.18) * 100) / 100;
                const cgst = Math.round(taxBase * 0.09 * 100) / 100;
                const sgst = Math.round(taxBase * 0.09 * 100) / 100;
                return (
                  <div className="flex justify-end gap-6 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-500">Base (excl. GST): </span>
                      <strong className="font-mono">{formatCurrency(taxBase)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">GST 18% (incl.): </span>
                      <strong className="font-mono">{formatCurrency(cgst + sgst)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Grand Total (GST Incl.): </span>
                      <strong className="text-amber-500 text-sm font-extrabold font-mono">
                        {formatCurrency(grand)}
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
                      value={editDownPayment || ''}
                      placeholder="e.g. 5000"
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
                      placeholder="e.g. 12"
                      value={editEmiTenureMonths === 0 ? '' : editEmiTenureMonths}
                      onChange={(e) => setEditEmiTenureMonths(parseInt(e.target.value) || 0)}
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
                          {formatCurrency(monthly)} / mo
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
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white placeholder:text-slate-400"
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
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white placeholder:text-slate-400"
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

      {/* Adjust EMI Installment Due Modal */}
      <Modal
        isOpen={!!adjustingEmiMonth}
        onClose={() => setAdjustingEmiMonth(null)}
        title={`Adjust EMI Installment Due — ${adjustingEmiMonth?.billingMonth || ''}`}
        maxWidth="md"
      >
        {adjustingEmiMonth && (
          <form onSubmit={handleSaveAdjustEmiDue} className="space-y-4">
            {adjustModalError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                {adjustModalError}
              </div>
            )}

            <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Current Due Amount:</span>
                <span className="font-bold font-mono text-amber-500">{formatCurrency(adjustingEmiMonth.amountDue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Already Paid:</span>
                <span className="font-bold font-mono text-emerald-500">{formatCurrency(adjustingEmiMonth.amountPaid || 0)}</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                New Amount Due (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={adjustAmountDue || ''}
                placeholder="Enter amount due"
                onChange={(e) => setAdjustAmountDue(Math.max(0, Math.round(parseFloat(e.target.value) || 0)))}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-mono font-bold text-slate-900 dark:text-white"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Difference from previous due: {adjustAmountDue - adjustingEmiMonth.amountDue >= 0 ? '+' : ''}{adjustAmountDue - adjustingEmiMonth.amountDue}
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                New Due Date (Optional)
              </label>
              <input
                type="date"
                value={adjustDueDate}
                onChange={(e) => setAdjustDueDate(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="carryForwardDiff"
                checked={adjustCarryForward}
                onChange={(e) => setAdjustCarryForward(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-amber-500 focus:ring-amber-500"
              />
              <label htmlFor="carryForwardDiff" className="text-xs text-slate-700 dark:text-slate-300 select-none cursor-pointer">
                Automatically carry forward difference to subsequent months
              </label>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                Reason / Notes for Adjustment
              </label>
              <input
                type="text"
                placeholder="e.g. Partial waiver, rescheduled, customer requested adjustment"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setAdjustingEmiMonth(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="default" size="sm" isLoading={isAdjustingEmiDue} disabled={isAdjustingEmiDue}>
                Save Adjustment
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Edit Recorded EMI Payment Modal */}
      <Modal
        isOpen={!!editingEmiPayment}
        onClose={() => setEditingEmiPayment(null)}
        title={`Edit Recorded EMI Payment — ${editingEmiPayment?.billingMonth || ''}`}
        maxWidth="md"
      >
        {editingEmiPayment && (
          <form onSubmit={handleSaveEditEmiPayment} className="space-y-4">
            {editEmiModalError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                {editEmiModalError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                  Amount Paid (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={editEmiAmountPaid || ''}
                  placeholder="Enter paid amount"
                  onChange={(e) => setEditEmiAmountPaid(Math.max(0, Math.round(parseFloat(e.target.value) || 0)))}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-mono font-bold text-emerald-500 text-right"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                  Amount Due (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={editEmiAmountDue || ''}
                  placeholder="Enter amount due"
                  onChange={(e) => setEditEmiAmountDue(Math.max(0, Math.round(parseFloat(e.target.value) || 0)))}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-mono font-bold text-amber-500 text-right"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                  Payment Method
                </label>
                <select
                  value={editEmiPaymentMethod}
                  onChange={(e) => setEditEmiPaymentMethod(e.target.value as any)}
                  className="w-full h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold"
                >
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                  Transaction Reference
                </label>
                <input
                  type="text"
                  value={editEmiTransactionRef}
                  onChange={(e) => setEditEmiTransactionRef(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                Notes / Remarks
              </label>
              <input
                type="text"
                value={editEmiNotes}
                onChange={(e) => setEditEmiNotes(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingEmiPayment(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="default" size="sm" isLoading={isUpdatingEmiPayment} disabled={isUpdatingEmiPayment}>
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Add Extra EMI Month Modal */}
      <Modal
        isOpen={isAddingEmiMonthModalOpen}
        onClose={() => setIsAddingEmiMonthModalOpen(false)}
        title="Extend EMI Plan (+1 Installment Month)"
        maxWidth="md"
      >
        <form onSubmit={handleSaveAddEmiMonth} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
              Installment Amount Due (₹) *
            </label>
            <input
              type="number"
              min="0"
              step="any"
              required
              value={newEmiMonthAmount || ''}
              placeholder="e.g. 1500"
              onChange={(e) => setNewEmiMonthAmount(Math.max(0, Math.round(parseFloat(e.target.value) || 0)))}
              className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-mono font-bold text-amber-500 text-right"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={newEmiMonthDueDate}
              onChange={(e) => setNewEmiMonthDueDate(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
              Reason for Tenure Extension
            </label>
            <input
              type="text"
              placeholder="e.g. Customer requested tenure elongation / split installment"
              value={newEmiMonthReason}
              onChange={(e) => setNewEmiMonthReason(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddingEmiMonthModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="default" size="sm" isLoading={isSubmittingAddMonth} disabled={isSubmittingAddMonth}>
              Add Installment Month
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
