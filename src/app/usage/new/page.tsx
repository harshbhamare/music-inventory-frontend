'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Product, SerializedItem, StockLocation, InternalUsage } from '@/lib/types';
import { formatCurrency, formatDate, addMonthsPreservingDay } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Music2,
  ArrowLeft,
  Check,
  Shield,
  Tag,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  User,
  CreditCard,
  Layers,
  Sparkles,
} from 'lucide-react';

const COMMON_ACCESSORIES = [
  'Heavy-Duty Stand',
  'Power Adapter & Cable',
  'Padded Gig Bag / Hardcase',
  'Sustain Pedal',
  'Studio Monitor Headphones',
  'Instrument Cable (10ft)',
  'Microfiber Polish Cloth',
  'Guitar / Instrument Strap',
];

export default function NewRentalPage() {
  const router = useRouter();

  // Inventory sources
  const [products, setProducts] = useState<Product[]>([]);
  const [availableSerials, setAvailableSerials] = useState<SerializedItem[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // 1. Customer
  const [assignedPerson, setAssignedPerson] = useState('');
  const [assignedPersonContact, setAssignedPersonContact] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  // 2. Instrument & Condition
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedSerialId, setSelectedSerialId] = useState('');
  const [issueCondition, setIssueCondition] = useState<'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR'>('GOOD');

  // 3. Rental Plan & Dates
  // Default start date: today formatted as YYYY-MM-DD
  const [startDateInput, setStartDateInput] = useState<string>(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const [lockInPeriodMonths, setLockInPeriodMonths] = useState<number>(3);
  const [monthlyRent, setMonthlyRent] = useState<number>(1500);
  const [securityDeposit, setSecurityDeposit] = useState<number>(5000);
  const [depositMode, setDepositMode] = useState<boolean>(false);
  const [depositPaymentMethod, setDepositPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER'>('UPI');
  const [depositTransactionRef, setDepositTransactionRef] = useState<string>('');

  // 4. Accessories & Remarks
  const [includedAccessories, setIncludedAccessories] = useState<string[]>([
    'Heavy-Duty Stand',
    'Power Adapter & Cable',
    'Padded Gig Bag / Hardcase',
  ]);
  const [customAccessory, setCustomAccessory] = useState('');
  const [notes, setNotes] = useState('');

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Load Inventory
  useEffect(() => {
    const loadDependencies = async () => {
      setIsLoadingData(true);
      try {
        const [prodRes, serialsRes, locRes] = await Promise.all([
          api.get<{ items: Product[] }>('/products?limit=200'),
          api.get<{ items: SerializedItem[] }>('/products/serialized-items?status=AVAILABLE&limit=200'),
          api.get<{ locations: StockLocation[] }>('/meta/locations'),
        ]);
        setProducts(prodRes.items || []);
        setAvailableSerials(serialsRes.items || []);
        setLocations(locRes.locations || []);

        const firstAvailable = (prodRes.items || []).find((p) => p.availableForSale > 0);
        if (firstAvailable) {
          setSelectedProductId(firstAvailable._id);
        }
      } catch (err: any) {
        console.error('Failed to load inventory for rentals:', err);
        setFormError('Failed to load store inventory. Please refresh the page.');
      } finally {
        setIsLoadingData(false);
      }
    };

    loadDependencies();
  }, []);

  // Update serial selection when product changes
  const selectedProduct = products.find((p) => p._id === selectedProductId);
  const productSerials = useMemo(() => {
    return availableSerials.filter(
      (s) => (s.product as any)?._id === selectedProductId || (s.product as any) === selectedProductId
    );
  }, [availableSerials, selectedProductId]);

  useEffect(() => {
    if (productSerials.length > 0) {
      setSelectedSerialId(productSerials[0]._id);
    } else {
      setSelectedSerialId('');
    }
  }, [productSerials]);

  // Synchronized Due Dates & Deadlines Calculation
  const baseStartDate = useMemo(() => {
    if (!startDateInput) return new Date();
    const parsed = new Date(startDateInput + 'T10:00:00');
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [startDateInput]);

  const dueDayOfMonth = baseStartDate.getDate();

  // End deadline is exactly lockInPeriodMonths from baseStartDate preserving day
  const returnDeadlineDate = useMemo(() => {
    return addMonthsPreservingDay(baseStartDate, lockInPeriodMonths);
  }, [baseStartDate, lockInPeriodMonths]);

  // Projected upcoming installment schedule preview
  const upcomingSchedulePreview = useMemo(() => {
    const schedule = [];
    for (let m = 1; m <= lockInPeriodMonths; m++) {
      const d = addMonthsPreservingDay(baseStartDate, m);
      schedule.push({
        month: m,
        dueDate: d,
        monthName: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
      });
    }
    return schedule;
  }, [baseStartDate, lockInPeriodMonths]);

  // Quick accessory toggles
  const toggleAccessory = (acc: string) => {
    setIncludedAccessories((prev) =>
      prev.includes(acc) ? prev.filter((a) => a !== acc) : [...prev, acc]
    );
  };

  const addCustomAccessoryPill = () => {
    const trimmed = customAccessory.trim();
    if (trimmed && !includedAccessories.includes(trimmed)) {
      setIncludedAccessories((prev) => [...prev, trimmed]);
      setCustomAccessory('');
    }
  };

  // Submit Handler
  const handleCreateRental = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setIsSubmitting(true);

    try {
      if (!selectedProduct) {
        throw new Error('Please select an instrument to rent.');
      }
      if (selectedProduct.trackingMode === 'SERIALIZED' && !selectedSerialId) {
        throw new Error(`Instrument "${selectedProduct.name}" requires an available serial unit to be assigned.`);
      }
      if (!assignedPerson.trim()) {
        throw new Error('Customer full name is required.');
      }
      if (!customerEmail.trim()) {
        throw new Error('Customer email is required for monthly rental invoices and due reminders.');
      }
      if (securityDeposit > 0 && !depositTransactionRef.trim()) {
        throw new Error('Please enter or generate a receipt reference number for the security deposit.');
      }

      const res = await api.post<{ success: boolean; data: { usage: InternalUsage } }>('/usage', {
        purpose: 'CLASS',
        assignedPerson: assignedPerson.trim(),
        assignedPersonContact: assignedPersonContact.trim() || undefined,
        customerEmail: customerEmail.trim().toLowerCase(),
        location: locations[0]?._id,
        startDate: baseStartDate.toISOString(),
        expectedReturnDate: returnDeadlineDate.toISOString(),
        isRental: true,
        lockInPeriodMonths,
        securityDeposit: Number(securityDeposit) || 0,
        depositTransactionRef: depositTransactionRef.trim() || undefined,
        depositMode,
        depositPaymentMethod,
        monthlyRent: Number(monthlyRent) || 0,
        includedAccessories,
        notes: notes.trim() || undefined,
        items: [
          {
            product: selectedProduct._id,
            quantityIssued: 1,
            serializedItemId: selectedSerialId || undefined,
            issueCondition,
          },
        ],
      });

      const created: InternalUsage | undefined =
        (res as any)?.usage || (res as any)?.data?.usage || (res as any);

      setFormSuccess(
        `Rental agreement #${created?.issueReference || ''} created successfully! Redirecting...`
      );

      setTimeout(() => {
        router.push('/usage');
      }, 1000);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create instrument rental agreement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Financial summary & Instrument Retail Valuation
  const instrumentRetailPrice = useMemo(() => {
    if (!selectedProduct) return 0;
    return (
      selectedProduct.defaultSellingPrice ??
      (selectedProduct as any).sellingPrice ??
      selectedProduct.purchaseCost ??
      0
    );
  }, [selectedProduct]);

  const depositCoveragePercent = useMemo(() => {
    if (!instrumentRetailPrice || instrumentRetailPrice <= 0) return 0;
    return Math.round((securityDeposit / instrumentRetailPrice) * 100);
  }, [instrumentRetailPrice, securityDeposit]);

  const rentPercentageOfValue = useMemo(() => {
    if (!instrumentRetailPrice || instrumentRetailPrice <= 0) return '0.0';
    return ((monthlyRent / instrumentRetailPrice) * 100).toFixed(1);
  }, [instrumentRetailPrice, monthlyRent]);

  const totalCommitment = lockInPeriodMonths * monthlyRent;
  const initialPaymentDue = depositMode
    ? securityDeposit
    : securityDeposit + monthlyRent;

  const isSerializedMissing =
    selectedProduct && selectedProduct.trackingMode === 'SERIALIZED' && productSerials.length === 0;

  return (
    <div className="space-y-6 pb-16 max-w-6xl mx-auto">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <Link
          href="/usage"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Rentals &amp; Loans List</span>
        </Link>
        <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full">
          New Customer Rental
        </span>
      </div>

      {formError && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {formSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{formSuccess}</span>
        </div>
      )}

      {/* Main 2-Column Clean Checkout Layout */}
      <form onSubmit={handleCreateRental} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Focused, Linear Form */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. Customer Details */}
          <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <User className="h-4 w-4 text-amber-500" />
                <span>1. Customer &amp; Renter Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Input
                  label="Customer Full Name *"
                  required
                  placeholder="e.g. Rohan Deshmukh"
                  value={assignedPerson}
                  onChange={(e) => setAssignedPerson(e.target.value)}
                />
                <Input
                  label="Phone Number"
                  placeholder="+91 98765 43210"
                  value={assignedPersonContact}
                  onChange={(e) => setAssignedPersonContact(e.target.value)}
                />
              </div>
              <Input
                label="Customer Email (for monthly invoices & payment reminders) *"
                type="email"
                required
                placeholder="rohan@example.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* 2. Instrument Selection */}
          <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Music2 className="h-4 w-4 text-amber-500" />
                <span>2. Select Instrument</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Instrument Model *
                </label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    setSelectedSerialId('');
                  }}
                  className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="">-- Choose an Instrument from Stock --</option>
                  {products
                    .filter((p) => p.availableForSale > 0)
                    .map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} {p.color ? `[${p.color}] ` : ''}({p.brand || 'Stereobliss'}) — {p.availableForSale} in stock
                      </option>
                    ))}
                </select>
              </div>

              {selectedProduct && (
                <div className="p-3 rounded-xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{selectedProduct.name}</span>
                      {selectedProduct.brand && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold">
                          {selectedProduct.brand}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      SKU: <span className="font-mono">{selectedProduct.sku}</span> • Available In Stock:{' '}
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {selectedProduct.availableForSale} unit(s)
                      </span>
                    </div>
                  </div>
                  <div className="sm:text-right shrink-0 p-2 sm:p-0 rounded-lg bg-white/70 dark:bg-slate-900/70 sm:bg-transparent">
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
                      Instrument Cost / Retail Value
                    </span>
                    <span className="text-base font-black font-mono text-slate-900 dark:text-white">
                      {instrumentRetailPrice > 0 ? formatCurrency(instrumentRetailPrice) : 'Not specified'}
                    </span>
                  </div>
                </div>
              )}

              {isSerializedMissing && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                  <span>All units for this instrument are currently rented out. Please choose another instrument.</span>
                </div>
              )}

              {selectedProduct && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">
                      Assigned Serial Asset Unit
                    </label>
                    {productSerials.length > 0 ? (
                      <select
                        value={selectedSerialId}
                        onChange={(e) => setSelectedSerialId(e.target.value)}
                        className="w-full h-8 px-2 text-xs font-mono font-bold rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-amber-500"
                      >
                        {productSerials.map((s) => (
                          <option key={s._id} value={s._id}>
                            {s.assetId} {s.manufacturerSerial ? `(SN: ${s.manufacturerSerial})` : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">Standard batch stock</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">
                      Condition at Issue
                    </label>
                    <select
                      value={issueCondition}
                      onChange={(e) => setIssueCondition(e.target.value as any)}
                      className="w-full h-8 px-2 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    >
                      <option value="NEW">Brand New</option>
                      <option value="LIKE_NEW">Like New (Mint)</option>
                      <option value="GOOD">Good (Tested &amp; Calibrated)</option>
                      <option value="FAIR">Fair (Minor cosmetic wear)</option>
                    </select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. Rental Plan & Due Date Schedule */}
          <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-amber-500" />
                  <span>3. Plan, Dates &amp; Payment Due Dates</span>
                </div>
                <span className="text-[11px] font-bold text-amber-500">
                  Due on every {dueDayOfMonth}th
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Start Date & Tenure */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Agreement Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={startDateInput}
                    onChange={(e) => setStartDateInput(e.target.value)}
                    className="w-full h-10 px-3 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block mt-1">
                    ⚡ Future rent installments will be due on the <strong>{dueDayOfMonth}th</strong> of each month.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tenure Duration
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {[1, 3, 6, 12].map((m) => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => setLockInPeriodMonths(m)}
                        className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                          lockInPeriodMonths === m
                            ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                            : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-400'
                        }`}
                      >
                        {m}M
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Ends on: <strong className="text-slate-700 dark:text-slate-300">{formatDate(returnDeadlineDate)}</strong>
                  </span>
                </div>
              </div>

              {/* Instrument Pricing Valuation & Guidance Bar */}
              {selectedProduct && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Instrument Cost / Value
                    </span>
                    <strong className="text-sm font-black font-mono text-slate-900 dark:text-white">
                      {instrumentRetailPrice > 0 ? formatCurrency(instrumentRetailPrice) : '₹0'}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Deposit Taken
                    </span>
                    <strong className="text-sm font-black font-mono text-indigo-600 dark:text-indigo-400">
                      {formatCurrency(securityDeposit)}
                    </strong>
                    {depositCoveragePercent > 0 && (
                      <span className="text-[10px] text-indigo-500 block font-semibold">
                        ({depositCoveragePercent}% coverage)
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Monthly Rent
                    </span>
                    <strong className="text-sm font-black font-mono text-amber-600 dark:text-amber-400">
                      {formatCurrency(monthlyRent)} / mo
                    </strong>
                    {Number(rentPercentageOfValue) > 0 && (
                      <span className="text-[10px] text-amber-500 block font-semibold">
                        ({rentPercentageOfValue}% / mo)
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Monthly Rent & Deposit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Monthly Rent (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(parseFloat(e.target.value) || 0)}
                    className="w-full h-10 px-3 text-sm font-bold font-mono text-amber-500 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-right"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Security Deposit (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={securityDeposit}
                    onChange={(e) => setSecurityDeposit(parseFloat(e.target.value) || 0)}
                    className="w-full h-10 px-3 text-sm font-bold font-mono text-indigo-500 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-right"
                  />
                </div>
              </div>

              {/* Deposit Handling: Simple Toggle */}
              {securityDeposit > 0 && (
                <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                      <Shield className="h-4 w-4" />
                      <span>Deposit Deduction Mode</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setDepositMode(!depositMode)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        depositMode ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          depositMode ? 'translate-x-4' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    {depositMode ? (
                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                        Auto-Deduct Active: Monthly rent ({formatCurrency(monthlyRent)}/mo) will be automatically deducted from this deposit.
                      </span>
                    ) : (
                      <span>
                        Standard Mode: Deposit is held safely and refunded upon instrument return. Customer pays monthly rent directly.
                      </span>
                    )}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-indigo-100 dark:border-indigo-900/40">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">
                        Deposit Payment Method
                      </label>
                      <select
                        value={depositPaymentMethod}
                        onChange={(e) => setDepositPaymentMethod(e.target.value as any)}
                        className="w-full h-8 px-2 text-xs font-bold rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                      >
                        <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                        <option value="CASH">Cash at Store Counter</option>
                        <option value="CARD">Debit / Credit Card</option>
                        <option value="BANK_TRANSFER">Bank IMPS / NEFT</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          Receipt / Txn Ref *
                        </label>
                        <button
                          type="button"
                          onClick={() => setDepositTransactionRef(`DEP-${Date.now().toString().slice(-6)}`)}
                          className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          + Auto Gen
                        </button>
                      </div>
                      <input
                        type="text"
                        required={securityDeposit > 0}
                        placeholder="e.g. UPI-988371 or CASH-01"
                        value={depositTransactionRef}
                        onChange={(e) => setDepositTransactionRef(e.target.value)}
                        className="w-full h-8 px-2.5 text-xs font-mono font-bold rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 4. Bundled Accessories & Notes */}
          <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-indigo-500" />
                  <span>4. Bundled Accessories Checklist</span>
                </div>
                <span className="text-[11px] text-slate-400 font-normal">
                  {includedAccessories.length} included
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {COMMON_ACCESSORIES.map((acc) => {
                  const isChecked = includedAccessories.includes(acc);
                  return (
                    <div
                      key={acc}
                      onClick={() => toggleAccessory(acc)}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] ${
                          isChecked
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950'
                        }`}
                      >
                        {isChecked && '✓'}
                      </div>
                      <span className="truncate">{acc}</span>
                    </div>
                  );
                })}
              </div>

              {/* Custom accessory input */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Add custom accessory (e.g. Sheet Stand, Spare Strings)..."
                  value={customAccessory}
                  onChange={(e) => setCustomAccessory(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomAccessoryPill();
                    }
                  }}
                  className="flex-1 h-8 px-3 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomAccessoryPill}
                  className="h-8 text-xs font-bold"
                >
                  + Add
                </Button>
              </div>

              {/* Agreement Remarks */}
              <div className="pt-2">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Agreement Remarks / Special Instructions
                </label>
                <input
                  type="text"
                  placeholder="Optional notes or special conditions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-8 px-3 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-medium"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Sticky Summary & Primary Action */}
        <div className="lg:col-span-5 sticky top-6 space-y-4">
          <Card className="border-amber-500/40 dark:border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 shadow-md">
            <CardHeader className="pb-3 border-b border-amber-500/20">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center justify-between">
                <span>Agreement Summary</span>
                <Sparkles className="h-4 w-4 text-amber-500" />
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-4 space-y-4 text-xs">
              {/* Customer & Instrument Snapshot */}
              <div className="space-y-2 p-3.5 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500 text-[11px]">Renter:</span>
                  <strong className="text-slate-900 dark:text-white font-semibold">
                    {assignedPerson || '—'}
                  </strong>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500 text-[11px]">Instrument:</span>
                  <strong className="text-slate-900 dark:text-white font-semibold">
                    {selectedProduct ? selectedProduct.name : 'No instrument chosen'}
                  </strong>
                </div>
                {selectedProduct && (
                  <div className="flex justify-between items-baseline pt-1 border-t border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-500 text-[11px] font-semibold">Instrument Retail Value:</span>
                    <strong className="font-mono text-slate-900 dark:text-white font-bold text-xs">
                      {instrumentRetailPrice > 0 ? formatCurrency(instrumentRetailPrice) : 'Not specified'}
                    </strong>
                  </div>
                )}
                {selectedSerialId && (
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-500 text-[11px]">Asset ID:</span>
                    <span className="font-mono text-amber-500 font-bold">
                      {productSerials.find((s) => s._id === selectedSerialId)?.assetId || 'Linked'}
                    </span>
                  </div>
                )}
              </div>

              {/* Synchronized Due Date Schedule Preview */}
              <div className="space-y-1.5 p-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Start Date:</span>
                  <strong className="text-slate-900 dark:text-white">{formatDate(baseStartDate)}</strong>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Monthly Due Day:</span>
                  <strong className="text-amber-500 font-bold">Every {dueDayOfMonth}th of month</strong>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Return Deadline:</span>
                  <strong className="text-amber-500 font-mono font-bold">
                    {formatDate(returnDeadlineDate)} ({lockInPeriodMonths}M)
                  </strong>
                </div>

                {/* Upcoming Installments Preview */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Scheduled Due Dates:
                  </span>
                  <div className="space-y-0.5 font-mono text-[11px]">
                    {upcomingSchedulePreview.map((item) => (
                      <div key={item.month} className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Month {item.month}:</span>
                        <strong className="text-slate-900 dark:text-white">{formatDate(item.dueDate)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Financial Box: Instrument Cost vs Deposit vs Rent */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Pricing &amp; Deposit Breakdown
                </div>

                {/* 1. Instrument Cost */}
                <div className="flex justify-between items-center py-1.5 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                      1. Instrument Retail Cost
                    </span>
                    <span className="text-[10px] text-slate-400">Total equipment value</span>
                  </div>
                  <strong className="font-mono text-slate-900 dark:text-white font-bold text-xs">
                    {instrumentRetailPrice > 0 ? formatCurrency(instrumentRetailPrice) : '—'}
                  </strong>
                </div>

                {/* 2. Security Deposit */}
                <div className="flex justify-between items-center py-1.5 px-2.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
                  <div>
                    <span className="text-[11px] font-semibold text-indigo-900 dark:text-indigo-200 block">
                      2. Security Deposit Taken
                    </span>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400">
                      {depositMode ? 'Auto-deduct balance' : 'Refundable safety deposit'}
                      {depositCoveragePercent > 0 && ` • ${depositCoveragePercent}% of value`}
                    </span>
                  </div>
                  <strong className="font-mono text-indigo-600 dark:text-indigo-400 font-black text-sm">
                    {formatCurrency(securityDeposit)}
                  </strong>
                </div>

                {/* 3. Monthly Rent */}
                <div className="flex justify-between items-center py-1.5 px-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50">
                  <div>
                    <span className="text-[11px] font-semibold text-amber-900 dark:text-amber-200 block">
                      3. Monthly Rent
                    </span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400">
                      Recurring monthly installment
                    </span>
                  </div>
                  <strong className="font-mono text-amber-600 dark:text-amber-400 font-black text-sm">
                    {formatCurrency(monthlyRent)} / mo
                  </strong>
                </div>

                {/* 4. Total Commitment */}
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 px-1 pt-1">
                  <span className="text-[11px]">Contract Commitment ({lockInPeriodMonths}M):</span>
                  <strong className="font-mono text-slate-900 dark:text-white font-semibold">
                    {formatCurrency(totalCommitment)}
                  </strong>
                </div>

                {/* 5. Initial Payment Due Today */}
                <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 flex justify-between items-baseline px-1">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Initial Due Today
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {depositMode ? 'Security Deposit covers rent' : 'Security Deposit + 1st Month Rent'}
                    </span>
                  </div>
                  <div className="text-xl font-black font-mono text-amber-500">
                    {formatCurrency(initialPaymentDue)}
                  </div>
                </div>
              </div>

              {/* Primary Action Button */}
              <div className="space-y-2 pt-1">
                <Button
                  type="submit"
                  variant="default"
                  isLoading={isSubmitting}
                  disabled={Boolean(isSerializedMissing)}
                  className="w-full h-11 font-bold text-sm bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Confirm &amp; Issue Agreement</span>
                </Button>

                <Link href="/usage" className="block text-center">
                  <Button type="button" variant="outline" className="w-full text-xs">
                    Cancel &amp; Return to List
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
