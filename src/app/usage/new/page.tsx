'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Product, SerializedItem, StockLocation, InternalUsage } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  Music2,
  ArrowLeft,
  Check,
  Shield,
  Tag,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Info,
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

const PURPOSE_OPTIONS = [
  { value: 'CLASS', label: 'Music Class & Academy Course', desc: 'Stereobliss student training' },
  { value: 'PRACTICE', label: 'Solo Practice & Home Study', desc: 'Home learning & practice' },
  { value: 'REHEARSAL', label: 'Band / Studio Rehearsal', desc: 'Band or jam room rental' },
  { value: 'EVENT', label: 'Live Show & Event Gig', desc: 'Performance or stage event' },
  { value: 'OTHER', label: 'General Customer Rental', desc: 'Standard equipment rental' },
] as const;

export default function NewRentalPage() {
  const router = useRouter();

  // Data sources
  const [products, setProducts] = useState<Product[]>([]);
  const [availableSerials, setAvailableSerials] = useState<SerializedItem[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Step 1: Instrument & Accessories
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedSerialId, setSelectedSerialId] = useState('');
  const [issueCondition, setIssueCondition] = useState<'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR'>('GOOD');
  const [includedAccessories, setIncludedAccessories] = useState<string[]>([
    'Heavy-Duty Stand',
    'Power Adapter & Cable',
    'Padded Gig Bag / Hardcase',
  ]);
  const [customAccessory, setCustomAccessory] = useState('');

  // Step 2: Rental Plan & Financials
  const [purpose, setPurpose] = useState<
    'CLASS' | 'PRACTICE' | 'REHEARSAL' | 'DEMONSTRATION' | 'EVENT' | 'REPAIR' | 'OTHER'
  >('CLASS');
  const [lockInPeriodMonths, setLockInPeriodMonths] = useState<number>(3);
  const [monthlyRent, setMonthlyRent] = useState<number>(1500);
  const [securityDeposit, setSecurityDeposit] = useState<number>(5000);
  const [depositMode, setDepositMode] = useState<boolean>(false);
  const [depositPaymentMethod, setDepositPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER'>('UPI');
  const [depositTransactionRef, setDepositTransactionRef] = useState<string>('');

  // Auto-calculated return date helper
  const getDefaultReturnDate = (months: number) => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() + months, 1, 18, 0, 0);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  const [returnDateInput, setReturnDateInput] = useState<string>(() => getDefaultReturnDate(3));

  // Step 3: Customer Information
  const [assignedPerson, setAssignedPerson] = useState('');
  const [assignedPersonContact, setAssignedPersonContact] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [notes, setNotes] = useState('');

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Load Inventory & Available Serials
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

        // Pre-select first available product if present
        const firstAvailable = (prodRes.items || []).find((p) => p.availableForSale > 0);
        if (firstAvailable) {
          setSelectedProductId(firstAvailable._id);
        }
      } catch (err: any) {
        console.error('Failed to load rental dependencies:', err);
        setFormError('Failed to load inventory for rentals. Please refresh.');
      } finally {
        setIsLoadingData(false);
      }
    };

    loadDependencies();
  }, []);

  // Update serial selection when product changes
  const selectedProduct = products.find((p) => p._id === selectedProductId);
  const productSerials = availableSerials.filter(
    (s) => (s.product as any)?._id === selectedProductId || (s.product as any) === selectedProductId
  );

  useEffect(() => {
    if (productSerials.length > 0) {
      setSelectedSerialId(productSerials[0]._id);
    } else {
      setSelectedSerialId('');
    }
  }, [selectedProductId, availableSerials]);

  // Handle duration change with date sync
  const handleDurationSelect = (months: number) => {
    setLockInPeriodMonths(months);
    setReturnDateInput(getDefaultReturnDate(months));
  };

  // Accessories Toggle
  const toggleAccessory = (acc: string) => {
    if (includedAccessories.includes(acc)) {
      setIncludedAccessories(includedAccessories.filter((a) => a !== acc));
    } else {
      setIncludedAccessories([...includedAccessories, acc]);
    }
  };

  const addCustomAccessoryPill = () => {
    const trimmed = customAccessory.trim();
    if (trimmed && !includedAccessories.includes(trimmed)) {
      setIncludedAccessories([...includedAccessories, trimmed]);
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
        throw new Error('Customer / Renter full name is required.');
      }
      if (!customerEmail.trim()) {
        throw new Error('Customer email is required for monthly rental invoices and due reminders.');
      }
      if (securityDeposit > 0 && !depositTransactionRef.trim()) {
        throw new Error('Please provide or generate a transaction reference for the security deposit.');
      }

      const returnDateObj = new Date(returnDateInput);
      if (isNaN(returnDateObj.getTime()) || returnDateObj <= new Date()) {
        throw new Error('Please select a valid future return deadline date.');
      }

      const res = await api.post<{ success: boolean; data: { usage: InternalUsage } }>('/usage', {
        purpose,
        assignedPerson: assignedPerson.trim(),
        assignedPersonContact: assignedPersonContact.trim() || undefined,
        customerEmail: customerEmail.trim().toLowerCase(),
        location: locations[0]?._id,
        expectedReturnDate: returnDateObj.toISOString(),
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
        `Rental agreement #${created?.issueReference || ''} created successfully! Redirecting to rentals list...`
      );

      setTimeout(() => {
        router.push('/usage');
      }, 1200);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create instrument rental agreement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Financial Computations
  const totalCommitment = lockInPeriodMonths * monthlyRent;
  const initialPaymentDue = depositMode
    ? securityDeposit
    : securityDeposit + monthlyRent;

  const isSerializedMissing =
    selectedProduct && selectedProduct.trackingMode === 'SERIALIZED' && productSerials.length === 0;

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/usage"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Rentals &amp; Instrument Loans</span>
            </Link>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="text-xs font-bold text-amber-500">New Rental Agreement</span>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Music2 className="h-6 w-6" />
            </div>
            <span>Rent an Instrument</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Create an official customer rental contract with auto-scheduled monthly billing and bundled accessories.
          </p>
        </div>

        {/* Quick Help Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-amber-400/40 text-amber-600 dark:text-amber-400 gap-1 text-[11px] py-1">
            <Calendar className="h-3 w-3" />
            <span>Auto-Calculated Schedule</span>
          </Badge>
          <Badge variant="outline" className="border-indigo-400/40 text-indigo-600 dark:text-indigo-400 gap-1 text-[11px] py-1">
            <Shield className="h-3 w-3" />
            <span>Deposit Protection</span>
          </Badge>
        </div>
      </div>

      {formError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {formSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{formSuccess}</span>
        </div>
      )}

      {/* Main 2-Column Responsive Layout */}
      <form onSubmit={handleCreateRental} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Inputs: Steps 1, 2, 3) */}
        <div className="lg:col-span-8 space-y-6">
          {/* STEP 1: Instrument & Accessories */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-xs font-black">
                    1
                  </span>
                  <span>Choose Musical Instrument &amp; Bundled Accessories</span>
                </CardTitle>
                <span className="text-[11px] text-slate-400">Available Stock Filtered</span>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              {/* Product Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Instrument / Gear *
                </label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    setSelectedSerialId('');
                  }}
                  className="w-full h-11 px-3 text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Choose an Instrument from Inventory --</option>
                  {products
                    .filter((p) => p.availableForSale > 0)
                    .map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} {p.color ? `[${p.color}] ` : ''}({p.brand || 'Stereobliss'}) — {p.availableForSale} in stock
                      </option>
                    ))}
                </select>
              </div>

              {/* Serial Warning if out of stock */}
              {isSerializedMissing && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-semibold flex items-center gap-2.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                  <span>
                    <strong>Stock Notice:</strong> All individual units for &ldquo;{selectedProduct?.name}&rdquo; are currently out on loan or not available. Please choose another instrument.
                  </span>
                </div>
              )}

              {/* Serial item and condition */}
              {selectedProduct && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      Assigned Serial Unit (Asset ID)
                    </label>
                    {productSerials.length > 0 ? (
                      <select
                        value={selectedSerialId}
                        onChange={(e) => setSelectedSerialId(e.target.value)}
                        className="w-full h-9 px-2 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-amber-500"
                      >
                        {productSerials.map((s) => (
                          <option key={s._id} value={s._id}>
                            {s.assetId} {s.manufacturerSerial ? `(SN: ${s.manufacturerSerial})` : ''} [{s.condition}]
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/40 text-slate-400 text-xs flex items-center">
                        Non-serialized batch inventory
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      Condition at Issue
                    </label>
                    <select
                      value={issueCondition}
                      onChange={(e) => setIssueCondition(e.target.value as any)}
                      className="w-full h-9 px-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    >
                      <option value="NEW">Brand New (Sealed Pack)</option>
                      <option value="LIKE_NEW">Like New (Mint / Showroom Demo)</option>
                      <option value="GOOD">Good (Tested &amp; Calibrated)</option>
                      <option value="FAIR">Fair (Usable with minor cosmetic wear)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Bundled Accessories */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Bundled Accessories &amp; Essentials Checklist</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {includedAccessories.length} item(s) selected
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {COMMON_ACCESSORIES.map((acc) => {
                    const isSelected = includedAccessories.includes(acc);
                    return (
                      <button
                        type="button"
                        key={acc}
                        onClick={() => toggleAccessory(acc)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                        <span>{acc}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom accessory input */}
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Add other custom item (e.g. Sheet Music Stand, Spare Strings)..."
                    value={customAccessory}
                    onChange={(e) => setCustomAccessory(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomAccessoryPill();
                      }
                    }}
                    className="flex-1 h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCustomAccessoryPill}
                    className="h-9 px-3 text-xs font-bold"
                  >
                    + Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* STEP 2: Rental Plan & Pricing Parameters */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-xs font-black">
                    2
                  </span>
                  <span>Rental Plan, Duration &amp; Security Deposit</span>
                </CardTitle>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                  Monthly Billing on 1st
                </span>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              {/* Rental Purpose / Category */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Rental Category / Purpose
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PURPOSE_OPTIONS.map((opt) => (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => setPurpose(opt.value as any)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        purpose === opt.value
                          ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                      }`}
                    >
                      <div className="font-bold text-xs">{opt.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                {/* Lock In Duration */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Lock-In Duration
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {[1, 3, 6, 12].map((m) => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => handleDurationSelect(m)}
                        className={`py-2 rounded-lg text-xs font-black border transition-all text-center ${
                          lockInPeriodMonths === m
                            ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                            : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-400'
                        }`}
                      >
                        {m}M
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {lockInPeriodMonths} Month(s) Minimum Lock-In
                  </span>
                </div>

                {/* Monthly Rent */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Monthly Rent (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(parseFloat(e.target.value) || 0)}
                    className="w-full h-10 px-3 text-sm font-black font-mono text-amber-500 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-right"
                  />
                  <div className="flex gap-1 mt-1 justify-end">
                    {[1000, 1500, 2000, 3000].map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => setMonthlyRent(preset)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                          monthlyRent === preset
                            ? 'bg-amber-500 text-slate-950 border-amber-500'
                            : 'bg-slate-100 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        ₹{preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Security Deposit */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Security Deposit (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={securityDeposit}
                    onChange={(e) => setSecurityDeposit(parseFloat(e.target.value) || 0)}
                    className="w-full h-10 px-3 text-sm font-black font-mono text-indigo-500 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-right"
                  />
                  <div className="flex gap-1 mt-1 justify-end">
                    {[0, 3000, 5000, 10000].map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => setSecurityDeposit(preset)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                          securityDeposit === preset
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-100 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {preset === 0 ? 'Zero' : `₹${preset / 1000}k`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Editable Expected Return Deadline */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-amber-500" />
                    <span>Agreement End Date &amp; Return Deadline</span>
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Automatically scheduled for the 1st of the renewal month. You can adjust it if needed.
                  </span>
                </div>
                <input
                  type="datetime-local"
                  required
                  value={returnDateInput}
                  onChange={(e) => setReturnDateInput(e.target.value)}
                  className="h-9 px-3 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              {/* Deposit Handling Mode Selector */}
              {securityDeposit > 0 && (
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Deposit Handling Method
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Mode A: Standard Refundable Deposit */}
                    <div
                      onClick={() => setDepositMode(false)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        !depositMode
                          ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            !depositMode
                              ? 'border-indigo-600 bg-indigo-600'
                              : 'border-slate-400 bg-transparent'
                          }`}
                        >
                          {!depositMode && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          Standard Refundable Deposit
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6">
                        Deposit is held safely during the rental term and refunded upon return inspection. Customer pays monthly rent directly.
                      </p>
                    </div>

                    {/* Mode B: Deposit-as-Rent Mode */}
                    <div
                      onClick={() => setDepositMode(true)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        depositMode
                          ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            depositMode
                              ? 'border-indigo-600 bg-indigo-600'
                              : 'border-slate-400 bg-transparent'
                          }`}
                        >
                          {depositMode && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>Deposit-as-Rent Mode</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-indigo-200 dark:bg-indigo-800 text-indigo-900 dark:text-white">
                            Auto-Deduct
                          </span>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6">
                        Monthly rent is auto-deducted directly from this deposit each month. No separate monthly payments needed during the lock-in period.
                      </p>
                    </div>
                  </div>

                  {/* Payment Method & Reference for Deposit */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                        Deposit Collected Via *
                      </label>
                      <select
                        value={depositPaymentMethod}
                        onChange={(e) => setDepositPaymentMethod(e.target.value as any)}
                        className="w-full h-9 px-2 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                      >
                        <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                        <option value="CASH">Cash at Store Counter</option>
                        <option value="CARD">Debit / Credit Card</option>
                        <option value="BANK_TRANSFER">Bank IMPS / NEFT</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                          Transaction / Receipt Ref *
                        </label>
                        <div className="flex gap-1.5 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setDepositTransactionRef(`CASH-${Date.now().toString().slice(-6)}`)}
                            className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            + Cash Receipt
                          </button>
                          <span className="text-slate-300 dark:text-slate-700">|</span>
                          <button
                            type="button"
                            onClick={() => setDepositTransactionRef(`UPI-${Date.now().toString().slice(-6)}`)}
                            className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            + UPI Ref
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        required={securityDeposit > 0}
                        placeholder="e.g. UPI-988371 or CASH-RCPT-01"
                        value={depositTransactionRef}
                        onChange={(e) => setDepositTransactionRef(e.target.value)}
                        className="w-full h-9 px-3 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* STEP 3: Customer Information */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-xs font-black">
                    3
                  </span>
                  <span>Customer Details &amp; Agreement Terms</span>
                </CardTitle>
                <span className="text-[11px] text-slate-400">Official Renter Record</span>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Customer / Renter Full Name *"
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
                <Input
                  label="Email (for receipts & reminders) *"
                  type="email"
                  required
                  placeholder="rohan@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Agreement Remarks / Special Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Security deposit refundable upon inspection. Maintenance covered by Stereobliss."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-medium"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Sticky Live Agreement & Financial Summary */}
        <div className="lg:col-span-4 sticky top-6 space-y-4">
          <Card className="border-amber-500/40 dark:border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 shadow-md">
            <CardHeader className="pb-3 border-b border-amber-500/20">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center justify-between">
                <span>Rental Summary</span>
                <Sparkles className="h-4 w-4 text-amber-500" />
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-4 space-y-4 text-xs">
              {/* Chosen Instrument */}
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Instrument</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm block">
                  {selectedProduct ? selectedProduct.name : 'No instrument chosen yet'}
                </span>
                {selectedProduct && (
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                    <span>{selectedProduct.brand || 'Stereobliss'}</span>
                    {selectedProduct.color && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-[10px]">
                        {selectedProduct.color}
                      </span>
                    )}
                    {selectedSerialId && (
                      <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                        [Serial Linked]
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Accessories preview */}
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                  Bundled Accessories ({includedAccessories.length})
                </span>
                {includedAccessories.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {includedAccessories.map((acc, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20"
                      >
                        {acc}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400 italic">No bundled accessories</span>
                )}
              </div>

              {/* Schedule */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Duration:</span>
                  <strong className="text-slate-900 dark:text-white">{lockInPeriodMonths} Months Agreement</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Return Deadline:</span>
                  <strong className="text-amber-600 dark:text-amber-400 font-mono">
                    {formatDate(returnDateInput)}
                  </strong>
                </div>
              </div>

              {/* Financial Box */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Monthly Rent:</span>
                  <strong className="font-mono text-slate-900 dark:text-white">{formatCurrency(monthlyRent)} / mo</strong>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Security Deposit:</span>
                  <strong className="font-mono text-indigo-500">{formatCurrency(securityDeposit)}</strong>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Lock-in Commitment:</span>
                  <strong className="font-mono text-slate-900 dark:text-white">{formatCurrency(totalCommitment)}</strong>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-baseline">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Initial Deposit to Collect
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {depositMode ? 'Covers monthly rent' : 'Plus first month rent'}
                    </span>
                  </div>
                  <div className="text-xl font-black font-mono text-amber-500">
                    {formatCurrency(initialPaymentDue)}
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="space-y-2 pt-2">
                <Button
                  type="submit"
                  variant="default"
                  isLoading={isSubmitting}
                  disabled={Boolean(isSerializedMissing)}
                  className="w-full h-11 font-bold text-sm bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Confirm &amp; Create Agreement</span>
                </Button>

                <Link href="/usage" className="block text-center">
                  <Button type="button" variant="outline" className="w-full text-xs">
                    Cancel and Return
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
