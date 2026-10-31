'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { InternalUsage, Product, SerializedItem, StockLocation, RentalMonthlyPayment } from '@/lib/types';
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import {
  Music2,
  Plus,
  RotateCcw,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  CalendarPlus,
  Search,
  Wrench,
  Mail,
  IndianRupee,
  CreditCard,
  Send,
  Layers,
  Tag,
  Check,
  Shield,
  Phone,
  User,
  CheckSquare,
  Square,
  Bell,
  RefreshCw,
  Pencil,
  SlidersHorizontal,
  PlusCircle,
  ClipboardList,
  Wallet,
} from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';

const COMMON_ACCESSORIES = [
  'Heavy-Duty Stand',
  'Power Adapter & Cable',
  'Padded Gig Bag / Hardcase',
  'Sustain Pedal',
  'Studio Monitor Headphones',
  'Instrument Cable (6.35mm TS)',
];

export default function UsagePage() {
  const { canIssueUsage } = useAuth();
  const [usages, setUsages] = useState<InternalUsage[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [availableSerials, setAvailableSerials] = useState<SerializedItem[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'OVERDUE' | 'RETURNED'>('ALL');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Issue / Rent Equipment Modal State
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  // Issue modal tab state
  const [issueTab, setIssueTab] = useState<'customer' | 'terms' | 'instrument'>('customer');
  // Ledger modal tab state
  const [ledgerTab, setLedgerTab] = useState<'schedule' | 'payment'>('schedule');
  const [purpose, setPurpose] = useState<
    'CLASS' | 'PRACTICE' | 'REHEARSAL' | 'DEMONSTRATION' | 'EVENT' | 'REPAIR' | 'OTHER'
  >('CLASS');
  const [isRental, setIsRental] = useState(true);
  const [assignedPerson, setAssignedPerson] = useState('');
  const [assignedPersonContact, setAssignedPersonContact] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [lockInPeriodMonths, setLockInPeriodMonths] = useState(3);
  const [securityDeposit, setSecurityDeposit] = useState<number>(5000);
  const [depositTransactionRef, setDepositTransactionRef] = useState('');
  const [depositMode, setDepositMode] = useState(false);
  const [depositPaymentMethod, setDepositPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER'>('CASH');
  const [monthlyRent, setMonthlyRent] = useState<number>(1500);
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [includedAccessories, setIncludedAccessories] = useState<string[]>([
    'Heavy-Duty Stand',
    'Power Adapter & Cable',
  ]);
  const [customAccessoryInput, setCustomAccessoryInput] = useState('');

  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedSerialId, setSelectedSerialId] = useState('');
  const [issueQuantity, setIssueQuantity] = useState(1);
  const [issueCondition, setIssueCondition] = useState('GOOD');
  const [notes, setNotes] = useState('');
  const [issueError, setIssueError] = useState('');
  const [isIssuing, setIsIssuing] = useState(false);

  // Monthly Rental Ledger & Payment Tracking Modal
  const [selectedRentalForLedger, setSelectedRentalForLedger] = useState<InternalUsage | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [selectedBillingMonth, setSelectedBillingMonth] = useState('');
  const [rentalPaymentMethod, setRentalPaymentMethod] = useState<'UPI' | 'CARD' | 'CASH' | 'BANK_TRANSFER'>('UPI');
  const [rentalTransactionRef, setRentalTransactionRef] = useState('');
  const [rentalPaymentNotes, setRentalPaymentNotes] = useState('');
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [reminderFeedback, setReminderFeedback] = useState('');

  // Deposit deduction state (deposit-mode rentals)
  const [isRecordingDeduction, setIsRecordingDeduction] = useState(false);
  const [deductionMonthIndex, setDeductionMonthIndex] = useState<number>(0);
  const [deductionBillingMonth, setDeductionBillingMonth] = useState('');
  const [deductionNotes, setDeductionNotes] = useState('');
  const [deductionError, setDeductionError] = useState('');
  const [deductionFeedback, setDeductionFeedback] = useState('');

  // Edit Payment & Price / Trn No. Modal
  const [editingPayment, setEditingPayment] = useState<RentalMonthlyPayment | null>(null);
  const [editAmountPaid, setEditAmountPaid] = useState<number>(0);
  const [editAmountDue, setEditAmountDue] = useState<number>(0);
  const [editTransactionRef, setEditTransactionRef] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<'UPI' | 'CARD' | 'CASH' | 'BANK_TRANSFER'>('UPI');
  const [editNotes, setEditNotes] = useState('');
  const [editAdjustNextMonth, setEditAdjustNextMonth] = useState(false);
  const [isSavingEditPayment, setIsSavingEditPayment] = useState(false);
  const [editPaymentError, setEditPaymentError] = useState('');

  // Direct Adjust Scheduled Rent Due Modal
  const [adjustingMonth, setAdjustingMonth] = useState<RentalMonthlyPayment | null>(null);
  const [adjustAmountDue, setAdjustAmountDue] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [isSavingAdjustDue, setIsSavingAdjustDue] = useState(false);
  const [adjustDueError, setAdjustDueError] = useState('');

  // Add Next Rental Month state
  const [isAddingMonth, setIsAddingMonth] = useState(false);

  // Submitting ref lock to strictly prevent multi-clicks
  const isSubmittingPaymentRef = React.useRef(false);

  // Return & Inspection Modal
  const [returnModalUsage, setReturnModalUsage] = useState<InternalUsage | null>(null);
  const [inspectionOutcomes, setInspectionOutcomes] = useState<
    Record<string, { condition: string; outcome: 'OK_TO_STOCK' | 'NEEDS_MAINTENANCE' | 'QUARANTINE_DAMAGED'; notes: string }>
  >({});
  const [returnError, setReturnError] = useState('');
  const [isReturning, setIsReturning] = useState(false);

  // Extend Date Modal
  const [extendModalUsage, setExtendModalUsage] = useState<InternalUsage | null>(null);
  const [newExtendedDate, setNewExtendedDate] = useState('');
  const [extensionReason, setExtensionReason] = useState('');
  const [extendError, setExtendError] = useState('');
  const [isExtending, setIsExtending] = useState(false);

  useEffect(() => {
    fetchUsages();
    fetchInventory();
  }, [statusFilter, search]);

  // Pre-calculate expected return date whenever lockInPeriodMonths changes
  const applyLockInMonths = (months: number) => {
    setLockInPeriodMonths(months);
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    setExpectedReturnDate(date.toISOString().slice(0, 16));
  };

  const fetchUsages = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (search) params.set('search', search);

      const res = await api.get<{ usages: InternalUsage[] }>(`/usage?${params.toString()}`);
      setUsages(res.usages || []);
    } catch (err) {
      console.error('Failed to load internal usages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const [prodRes, serialsRes, locRes] = await Promise.all([
        api.get<{ items: Product[] }>('/products?limit=100'),
        api.get<{ items: SerializedItem[] }>('/products/serialized-items?status=AVAILABLE&limit=100'),
        api.get<{ locations: StockLocation[] }>('/meta/locations'),
      ]);
      setProducts(prodRes.items || []);
      setAvailableSerials(serialsRes.items || []);
      setLocations(locRes.locations || []);
    } catch (err) {
      console.error('Failed to load inventory for usage:', err);
    }
  };

  const toggleAccessory = (acc: string) => {
    if (includedAccessories.includes(acc)) {
      setIncludedAccessories(includedAccessories.filter((a) => a !== acc));
    } else {
      setIncludedAccessories([...includedAccessories, acc]);
    }
  };

  const addCustomAccessory = () => {
    const trimmed = customAccessoryInput.trim();
    if (trimmed && !includedAccessories.includes(trimmed)) {
      setIncludedAccessories((prev) => [...prev, trimmed]);
      setCustomAccessoryInput('');
    }
  };

  const handleAddCustomAccessory = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      e.stopPropagation();
    }
    addCustomAccessory();
  };

  const openIssueModal = () => {
    setIsIssueModalOpen(true);
    setIssueTab('customer');
    setIsRental(true);
    applyLockInMonths(3);
    setSecurityDeposit(5000);
    setDepositTransactionRef('');
    setDepositMode(false);
    setDepositPaymentMethod('CASH');
    setMonthlyRent(1500);
    setIncludedAccessories(['Heavy-Duty Stand', 'Power Adapter & Cable']);
    setIssueError('');
  };

  const selectedProduct = products.find((p) => p._id === selectedProductId);

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIssueError('');
    setIsIssuing(true);

    try {
      if (!selectedProduct) throw new Error('Please select an instrument or product.');

      await api.post('/usage', {
        purpose,
        assignedPerson: assignedPerson.trim(),
        assignedPersonContact: assignedPersonContact.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        location: locations[0]?._id,
        expectedReturnDate,
        isRental,
        lockInPeriodMonths,
        securityDeposit,
        depositTransactionRef: depositTransactionRef.trim() || undefined,
        depositMode,
        depositPaymentMethod,
        monthlyRent,
        includedAccessories,
        notes: notes.trim() || undefined,
        items: [
          {
            product: selectedProduct._id,
            quantityIssued: issueQuantity,
            issueCondition,
          },
        ],
      });

      setIsIssueModalOpen(false);
      setAssignedPerson('');
      setAssignedPersonContact('');
      setCustomerEmail('');
      setSelectedProductId('');
      setSelectedSerialId('');
      setNotes('');
      fetchUsages();
      fetchInventory();
    } catch (err: any) {
      setIssueError(err.message || 'Failed to create instrument rental agreement.');
    } finally {
      setIsIssuing(false);
    }
  };

  // Open Monthly Payment Tracker & Ledger Modal
  const openLedgerModal = (usage: InternalUsage) => {
    setSelectedRentalForLedger(usage);
    setLedgerTab('schedule');
    const firstDue = usage.monthlyPayments?.find((p) => p.status !== 'PAID');
    setPaymentAmount(firstDue?.amountDue || usage.monthlyRent || 1500);
    setSelectedBillingMonth(firstDue?.billingMonth || '');
    setRentalTransactionRef('');
    setRentalPaymentNotes('');
    setPaymentError('');
    setReminderFeedback('');
    setDeductionError('');
    setDeductionFeedback('');
    setEditingPayment(null);
    setAdjustingMonth(null);
    // Pre-fill next undeducted month for deposit mode
    if (usage.depositMode) {
      const nextUndeducted = (usage.monthlyPayments || []).find((p) => p.status !== 'PAID');
      if (nextUndeducted) {
        setDeductionMonthIndex(nextUndeducted.monthIndex);
        setDeductionBillingMonth(nextUndeducted.billingMonth);
      }
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRentalForLedger || isRecordingPayment || isSubmittingPaymentRef.current) return;
    isSubmittingPaymentRef.current = true;
    setIsRecordingPayment(true);
    setPaymentError('');

    try {
      if (paymentAmount <= 0) {
        throw new Error('Payment amount must be greater than 0.');
      }

      const res = await api.post<{ usage: InternalUsage }>(
        `/usage/${selectedRentalForLedger._id}/payments`,
        {
          amount: paymentAmount,
          billingMonth: selectedBillingMonth || undefined,
          paymentMethod: rentalPaymentMethod,
          transactionRef: rentalTransactionRef.trim() || undefined,
          notes: rentalPaymentNotes.trim() || undefined,
        }
      );

      setSelectedRentalForLedger(res.usage);
      setRentalTransactionRef('');
      setRentalPaymentNotes('');
      setReminderFeedback(
        `Payment of ${formatCurrency(paymentAmount)} recorded successfully! An official payment receipt email has been dispatched to ${selectedRentalForLedger.customerEmail || selectedRentalForLedger.assignedPerson} for accountability.`
      );
      // Pre-fill next unpaid month if available
      const nextDue = res.usage.monthlyPayments?.find((p) => p.status !== 'PAID');
      if (nextDue) {
        setSelectedBillingMonth(nextDue.billingMonth);
        setPaymentAmount(nextDue.amountDue);
      } else {
        setSelectedBillingMonth('');
        setPaymentAmount(0);
      }
      fetchUsages();
    } catch (err: any) {
      setPaymentError(err.message || 'Failed to record rent payment.');
    } finally {
      setIsRecordingPayment(false);
      isSubmittingPaymentRef.current = false;
    }
  };

  // Record a deposit deduction for a month (deposit-mode rentals)
  const handleRecordDeduction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRentalForLedger) return;
    setDeductionError('');
    setDeductionFeedback('');
    if (!deductionMonthIndex || !deductionBillingMonth) {
      setDeductionError('Please select the billing month to deduct.');
      return;
    }
    setIsRecordingDeduction(true);
    try {
      const res = await api.post<{ data: { usage: InternalUsage } }>(
        `/usage/${selectedRentalForLedger._id}/deposit-deductions`,
        { monthIndex: deductionMonthIndex, billingMonth: deductionBillingMonth, notes: deductionNotes.trim() || undefined }
      );
      const updated = res.data?.usage || selectedRentalForLedger;
      setSelectedRentalForLedger(updated);
      setDeductionNotes('');
      // auto-advance to next unpaid month
      const nextDue = (updated.monthlyPayments || []).find((p) => p.status !== 'PAID');
      if (nextDue) {
        setDeductionMonthIndex(nextDue.monthIndex);
        setDeductionBillingMonth(nextDue.billingMonth);
      } else {
        setDeductionMonthIndex(0);
        setDeductionBillingMonth('');
      }
      setDeductionFeedback(
        `â‚¹${selectedRentalForLedger.monthlyRent?.toLocaleString()} deducted from deposit for ${deductionBillingMonth}. Remaining balance: â‚¹${updated.depositBalance?.toLocaleString() ?? 0}. Manager will receive a bell notification to send the customer notice email.`
      );
      fetchUsages();
    } catch (err: any) {
      setDeductionError(err.message || 'Failed to record deposit deduction.');
    } finally {
      setIsRecordingDeduction(false);
    }
  };

  // Open Edit Payment & Trn No. Modal
  const handleOpenEditPayment = (payment: RentalMonthlyPayment) => {
    setEditingPayment(payment);
    setEditAmountPaid(payment.amountPaid || payment.amountDue || 0);
    setEditAmountDue(payment.amountDue || 0);
    setEditTransactionRef(payment.transactionRef || '');
    setEditPaymentMethod((payment.paymentMethod as any) || 'UPI');
    setEditNotes(payment.notes || '');
    setEditAdjustNextMonth(false);
    setEditPaymentError('');
  };

  const handleSaveEditPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRentalForLedger || !editingPayment) return;
    setIsSavingEditPayment(true);
    setEditPaymentError('');

    try {
      const paymentIdentifier = editingPayment._id || editingPayment.monthIndex;
      const res = await api.put<{ usage: InternalUsage }>(
        `/usage/${selectedRentalForLedger._id}/payments/${paymentIdentifier}`,
        {
          amountPaid: editAmountPaid,
          amountDue: editAmountDue,
          transactionRef: editTransactionRef.trim() || undefined,
          paymentMethod: editPaymentMethod,
          notes: editNotes.trim() || undefined,
          adjustNextMonth: editAdjustNextMonth,
        }
      );

      setSelectedRentalForLedger(res.usage);
      setEditingPayment(null);
      fetchUsages();
    } catch (err: any) {
      setEditPaymentError(err.message || 'Failed to update payment details.');
    } finally {
      setIsSavingEditPayment(false);
    }
  };

  // Open Direct Adjust Month Rent Due Modal
  const handleOpenAdjustMonthDue = (payment: RentalMonthlyPayment) => {
    setAdjustingMonth(payment);
    setAdjustAmountDue(payment.amountDue || 0);
    setAdjustReason('');
    setAdjustDueError('');
  };

  const handleSaveAdjustMonthDue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRentalForLedger || !adjustingMonth) return;
    setIsSavingAdjustDue(true);
    setAdjustDueError('');

    try {
      const res = await api.put<{ usage: InternalUsage }>(
        `/usage/${selectedRentalForLedger._id}/adjust-month-due`,
        {
          monthIndex: adjustingMonth.monthIndex,
          newAmountDue: adjustAmountDue,
          reason: adjustReason.trim() || undefined,
        }
      );

      setSelectedRentalForLedger(res.usage);
      setAdjustingMonth(null);
      fetchUsages();
    } catch (err: any) {
      setAdjustDueError(err.message || 'Failed to adjust month rent due.');
    } finally {
      setIsSavingAdjustDue(false);
    }
  };

  // Add an extra rental month to agreement
  const handleAddRentalMonth = async () => {
    if (!selectedRentalForLedger || isAddingMonth) return;
    setIsAddingMonth(true);

    try {
      const res = await api.post<{ usage: InternalUsage }>(
        `/usage/${selectedRentalForLedger._id}/add-month`,
        {
          amountDue: selectedRentalForLedger.monthlyRent || 1500,
        }
      );

      setSelectedRentalForLedger(res.usage);
      fetchUsages();
    } catch (err: any) {
      alert(err.message || 'Failed to add next rental month.');
    } finally {
      setIsAddingMonth(false);
    }
  };

  const handleSendReminder = async (usage: InternalUsage) => {
    setIsSendingReminder(true);
    setReminderFeedback('');

    try {
      const res = await api.post<{
        success: boolean;
        message: string;
        sentTo: string;
        channel: string;
        usage: InternalUsage;
      }>(`/usage/${usage._id}/send-reminder`, {});

      setReminderFeedback(`Payment reminder dispatched to ${res.sentTo} (${res.channel})!`);
      fetchUsages();
      if (selectedRentalForLedger && selectedRentalForLedger._id === usage._id) {
        setSelectedRentalForLedger(res.usage);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to send reminder.');
    } finally {
      setIsSendingReminder(false);
    }
  };

  const openReturnModal = (usage: InternalUsage) => {
    setReturnModalUsage(usage);
    const initialOutcomes: any = {};
    usage.items.forEach((item, idx) => {
      initialOutcomes[idx] = {
        condition: item.issueCondition || 'GOOD',
        outcome: 'OK_TO_STOCK',
        notes: '',
      };
    });
    setInspectionOutcomes(initialOutcomes);
    setReturnError('');
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnModalUsage) return;
    setReturnError('');
    setIsReturning(true);

    try {
      const itemsPayload = returnModalUsage.items.map((item, idx) => {
        const insp = inspectionOutcomes[idx] || {
          condition: 'GOOD',
          outcome: 'OK_TO_STOCK',
          notes: '',
        };
        const remaining = item.quantityIssued - item.quantityReturned;

        return {
          product: (item.product as any)._id || item.product,
          quantityReturned: remaining,
          serializedItemId: (item.serializedItemId as any)?._id || item.serializedItemId,
          returnCondition: insp.condition,
          inspectionOutcome: insp.outcome,
          inspectionNotes: insp.notes || undefined,
        };
      });

      await api.post(`/usage/${returnModalUsage._id}/return`, {
        items: itemsPayload,
        notes: 'Rental inspection processed & equipment returned',
      });

      setReturnModalUsage(null);
      fetchUsages();
      fetchInventory();
    } catch (err: any) {
      setReturnError(err.message || 'Failed to process return inspection.');
    } finally {
      setIsReturning(false);
    }
  };

  const openExtendModal = (usage: InternalUsage) => {
    setExtendModalUsage(usage);
    setNewExtendedDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16));
    setExtensionReason('');
    setExtendError('');
  };

  const handleExtendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendModalUsage) return;
    setExtendError('');
    setIsExtending(true);

    try {
      await api.post(`/usage/${extendModalUsage._id}/extend`, {
        extendedDate: newExtendedDate,
        reason: extensionReason.trim(),
      });

      setExtendModalUsage(null);
      fetchUsages();
    } catch (err: any) {
      setExtendError(err.message || 'Failed to extend rental schedule.');
    } finally {
      setIsExtending(false);
    }
  };

  // Financial KPIs for Rentals
  const activeRentals = usages.filter((u) => u.status !== 'RETURNED');
  const totalDepositsHeld = activeRentals.reduce((sum, u) => sum + (u.securityDeposit || 0), 0);
  const totalRentCollected = usages.reduce((sum, u) => sum + (u.totalRentPaid || 0), 0);
  const totalRentPending = activeRentals.reduce((sum, u) => sum + (u.totalRentDue || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo size="md" variant="badge" className="shadow-xs shrink-0" />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Music2 className="h-6 w-6 text-amber-500" />
              <span>Rent Instrument & Instrument Loans</span>
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Stereobliss Retail â€” Customer rental plans, 3-month lock-in agreements, bundled accessories (stands, adapters, bags), and monthly payment tracking.
            </p>
          </div>
        </div>

        {canIssueUsage() && (
          <Button
            size="sm"
            variant="default"
            onClick={openIssueModal}
            className="gap-1.5 text-xs font-bold shadow-md"
          >
            <Plus className="h-4 w-4" />
            <span>Rent Instrument / Issue Loan</span>
          </Button>
        )}
      </div>

      {/* Rental Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex justify-between items-center text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Active Rentals & Loans</span>
              <Music2 className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {activeRentals.length}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Instruments currently on rent/loan</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex justify-between items-center text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Security Deposits Held</span>
              <Shield className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {formatCurrency(totalDepositsHeld)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Refundable customer safety deposits</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex justify-between items-center text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Total Rent Collected</span>
              <IndianRupee className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {formatCurrency(totalRentCollected)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Monthly rental income processed</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex justify-between items-center text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Pending Rent Due</span>
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
              {formatCurrency(totalRentPending)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Outstanding rental installments</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
          {(['ALL', 'ACTIVE', 'OVERDUE', 'RETURNED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 font-bold rounded-lg transition-colors ${
                statusFilter === s
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {s === 'ALL'
                ? 'All Rentals'
                : s === 'ACTIVE'
                ? 'Active Rentals'
                : s === 'OVERDUE'
                ? 'âš ï¸ Due / Overdue'
                : 'Returned / Closed'}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search Reference, Renter, Phone, Email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      {/* Rentals Table */}
      <Card>
        <CardContent className="p-0">
          <div className="responsive-table-wrapper">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Agreement Ref</th>
                  <th className="py-3 px-4">Renter / Customer</th>
                  <th className="py-3 px-4">Rented Instrument & Accessories</th>
                  <th className="py-3 px-4">Rental Plan & Terms</th>
                  <th className="py-3 px-4">Rent Paid / Remaining</th>
                  <th className="py-3 px-4">Return / Renewal</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Tracking & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Loading rental agreements...
                    </td>
                  </tr>
                ) : usages.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      No customer rentals or instrument loans matching this filter.
                    </td>
                  </tr>
                ) : (
                  usages.map((u) => {
                    const isReturned = u.status === 'RETURNED';
                    const isOverdue =
                      u.isOverdue || (!isReturned && new Date(u.expectedReturnDate) < new Date());

                    const accessories = u.includedAccessories || [];
                    const paid = u.totalRentPaid || 0;
                    const due = u.totalRentDue || 0;

                    return (
                      <tr
                        key={u._id}
                        className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                          isOverdue ? 'bg-rose-500/5' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-amber-500 block">
                            {u.issueReference}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {u.isRental ? 'Rental Plan' : u.purpose}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {u.assignedPerson}
                          </div>
                          {u.assignedPersonContact && (
                            <div className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span>{u.assignedPersonContact}</span>
                            </div>
                          )}
                          {u.customerEmail && (
                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Mail className="h-3 w-3 text-indigo-400" />
                              <span>{u.customerEmail}</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            {u.items.map((it, idx) => (
                              <div key={idx} className="text-slate-800 dark:text-slate-200">
                                <span className="font-semibold">{it.product?.name}</span>
                                {it.product?.color && (
                                  <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                                    {it.product.color}
                                  </span>
                                )}
                                {it.serializedItemId && (
                                  <span className="ml-1.5 font-mono text-amber-500 font-bold text-[10px]">
                                    [{(it.serializedItemId as any).assetId || 'Unit'}]
                                  </span>
                                )}
                              </div>
                            ))}

                            {/* Detailing: Bundled accessories tags */}
                            {accessories.length > 0 ? (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {accessories.map((acc, aidx) => (
                                  <span
                                    key={aidx}
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                  >
                                    <Tag className="h-2.5 w-2.5" />
                                    <span>{acc}</span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">No bundled accessories</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <div className="text-xs font-bold text-amber-500">
                              {formatCurrency(u.monthlyRent || 0)} / mo
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Lock-in: <strong>{u.lockInPeriodMonths || 3} Months</strong>
                            </div>
                            <div className="text-[11px] text-indigo-500 font-medium">
                              Deposit: {formatCurrency(u.securityDeposit || 0)}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-bold">
                              <span className="text-emerald-500">{formatCurrency(paid)}</span>
                              <span className="text-slate-400">/</span>
                              <span className="text-slate-700 dark:text-slate-300">
                                {formatCurrency(paid + due)}
                              </span>
                            </div>
                            {due > 0 ? (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                â‚¹{due.toLocaleString()} Due
                              </span>
                            ) : (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                                All Paid
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={
                              isOverdue
                                ? 'font-bold text-rose-500 flex items-center gap-1'
                                : 'text-slate-700 dark:text-slate-300'
                            }
                          >
                            {isOverdue && <AlertTriangle className="h-3 w-3 shrink-0" />}
                            {formatDate(u.expectedReturnDate)}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <Badge
                            variant={isReturned ? 'success' : isOverdue ? 'danger' : 'info'}
                            className="text-[10px]"
                          >
                            {isReturned ? 'RETURNED' : isOverdue ? 'DUE / OVERDUE' : 'ACTIVE RENTAL'}
                          </Badge>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Track Rent & Monthly Ledger button */}
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => openLedgerModal(u)}
                              className="h-7 text-[11px] font-bold gap-1 bg-amber-500 hover:bg-amber-600 text-slate-950"
                              title="Track Monthly Rent Payments & Ledger"
                            >
                              <CreditCard className="h-3 w-3" />
                              <span>Track Rent</span>
                            </Button>

                            {/* Email Payment Reminder button */}
                            {!isReturned && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSendReminder(u)}
                                className="h-7 text-[11px] text-indigo-400 hover:text-indigo-300 border-indigo-500/30 gap-1"
                                title="Send Email Reminder"
                              >
                                <Mail className="h-3 w-3" />
                                <span className="hidden sm:inline">Reminder</span>
                              </Button>
                            )}

                            {!isReturned && canIssueUsage() && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openReturnModal(u)}
                                  className="h-7 text-[11px] gap-1"
                                  title="Inspect & Return Instrument"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  <span className="hidden sm:inline">Return</span>
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openExtendModal(u)}
                                  className="h-7 text-[11px]"
                                  title="Extend Duration / Renewal"
                                >
                                  <CalendarPlus className="h-3.5 w-3.5" />
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

      {/* Rent Instrument / Loan Agreement Modal */}
      <Modal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        title="Rent Instrument & Create Agreement"
        description="Customer details, rental terms, deposit, instrument selection and accessories."
        maxWidth="4xl"
        footer={
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {issueTab !== 'customer' && (
                <button type="button" onClick={() => setIssueTab(issueTab === 'instrument' ? 'terms' : 'customer')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  â† Back
                </button>
              )}
              <div className="flex items-center gap-1 ml-1">
                {(['customer','terms','instrument'] as const).map((t) => (
                  <div key={t} className={`h-1.5 w-6 rounded-full transition-colors ${issueTab === t ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsIssueModalOpen(false)}>Cancel</Button>
              {issueTab !== 'instrument' ? (
                <Button type="button" size="sm" variant="default" className="font-bold gap-1.5"
                  onClick={() => setIssueTab(issueTab === 'customer' ? 'terms' : 'instrument')}>
                  Next â†’
                </Button>
              ) : (
                <Button type="submit" form="issue-rental-form" size="sm" variant="default" isLoading={isIssuing} className="font-bold">
                  Confirm & Issue Agreement
                </Button>
              )}
            </div>
          </div>
        }
      >
        <form id="issue-rental-form" onSubmit={handleIssueSubmit}>
          {issueError && (
            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs font-semibold text-red-500">
              {issueError}
            </div>
          )}

          {/* â”€â”€ Tab Bar â”€â”€ */}
          <div className="flex items-center gap-1 mb-5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
            {([
              { key: 'customer',   label: 'Customer',            icon: <User className="h-3.5 w-3.5" /> },
              { key: 'terms',      label: 'Rental Terms',        icon: <Shield className="h-3.5 w-3.5" /> },
              { key: 'instrument', label: 'Instrument & Accessories', icon: <Music2 className="h-3.5 w-3.5" /> },
            ] as const).map((tab) => (
              <button key={tab.key} type="button" onClick={() => setIssueTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                  issueTab === tab.key ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}>
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>

          {/* â•â• TAB 1 â€” Customer â•â• */}
          <div className={issueTab === 'customer' ? 'space-y-4' : 'hidden'}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label="Renter / Customer Name *" required placeholder="e.g. Rohan Deshmukh"
                value={assignedPerson} onChange={(e) => setAssignedPerson(e.target.value)} />
              <Input label="Phone Number" placeholder="+91 98765 43210"
                value={assignedPersonContact} onChange={(e) => setAssignedPersonContact(e.target.value)} />
              <Input label="Email (for reminders) *" type="email" required placeholder="rohan@example.com"
                value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
            </div>
            <Input label="Agreement Remarks / Special Terms"
              placeholder="e.g. Security deposit refundable upon inspection. Maintenance covered by Stereobliss."
              value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {/* â•â• TAB 2 â€” Rental Terms & Deposit â•â• */}
          <div className={issueTab === 'terms' ? 'space-y-4' : 'hidden'}>
            {/* Lock-in + rent + deposit */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-500">Rental Plan & Lock-In Period</span>
                <span className="text-[11px] text-slate-500">Standard: 3 months</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">Lock-In Duration</label>
                  <div className="flex gap-1">
                    {[1, 3, 6, 12].map((m) => (
                      <button type="button" key={m} onClick={() => applyLockInMonths(m)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${lockInPeriodMonths === m ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm' : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-700 hover:border-amber-400'}`}>
                        {m}M
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">Monthly Rent (â‚¹) *</label>
                  <input type="number" min="0" required value={monthlyRent}
                    onChange={(e) => setMonthlyRent(parseFloat(e.target.value) || 0)}
                    className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-amber-500 text-right" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">Security Deposit (â‚¹)</label>
                  <input type="number" min="0" value={securityDeposit}
                    onChange={(e) => setSecurityDeposit(parseFloat(e.target.value) || 0)}
                    className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-indigo-400 text-right" />
                </div>
              </div>
              <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
                <span>Agreement end date:</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {expectedReturnDate ? new Date(expectedReturnDate).toLocaleDateString('en-IN') : 'N/A'} ({lockInPeriodMonths}M tenure)
                </strong>
              </div>
            </div>

            {/* Deposit details (only when deposit > 0) */}
            {securityDeposit > 0 && (
              <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/60 dark:bg-indigo-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" />Security Deposit Details (Mandatory)
                  </span>
                  <span className="text-[11px] text-indigo-500">Transaction ref required</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">Deposit Collected Via *</label>
                    <select value={depositPaymentMethod} onChange={(e) => setDepositPaymentMethod(e.target.value as any)}
                      className="w-full h-9 px-2 text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-indigo-500">
                      <option value="CASH">Cash</option>
                      <option value="UPI">UPI (GPay / PhonePe)</option>
                      <option value="CARD">Card</option>
                      <option value="BANK_TRANSFER">Bank Transfer / IMPS</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">Transaction / Receipt No. *</label>
                    <input type="text" required={securityDeposit > 0} placeholder="e.g. CASH-RCPT-001 / UPI-8837261"
                      value={depositTransactionRef} onChange={(e) => setDepositTransactionRef(e.target.value)}
                      className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-mono" />
                  </div>
                </div>
                {/* Deposit-as-Rent toggle */}
                <div onClick={() => setDepositMode(!depositMode)}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${depositMode ? 'border-indigo-500 bg-indigo-100/70 dark:bg-indigo-950/40' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-300'}`}>
                  <div className={`mt-0.5 h-4 w-4 rounded border-2 shrink-0 flex items-center justify-center ${depositMode ? 'border-indigo-500 bg-indigo-500' : 'border-slate-400 bg-white dark:bg-slate-800'}`}>
                    {depositMode && <Check className="h-2.5 w-2.5 text-white" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Deposit-as-Rent Mode</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Monthly rent is auto-deducted from this deposit. No separate monthly payment needed during lock-in. When exhausted, continuation rent tracking begins.
                    </div>
                    {depositMode && monthlyRent > 0 && (
                      <div className="mt-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                        â‚¹{securityDeposit.toLocaleString()} Ã· â‚¹{monthlyRent.toLocaleString()}/mo = {Math.floor(securityDeposit / monthlyRent)} months covered
                        {securityDeposit % monthlyRent > 0 && ` (â‚¹${(securityDeposit % monthlyRent).toLocaleString()} remaining)`}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* â•â• TAB 3 â€” Instrument & Accessories â•â• */}
          <div className={issueTab === 'instrument' ? 'space-y-4' : 'hidden'}>
            {/* Instrument select */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">Select Instrument *</label>
              <select required value={selectedProductId}
                onChange={(e) => { setSelectedProductId(e.target.value); setSelectedSerialId(''); }}
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-medium">
                <option value="">Choose an instrumentâ€¦</option>
                {products.filter((p) => p.availableForSale > 0).map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} {p.color ? `[${p.color}] ` : ''}({p.sku}) â€” {p.availableForSale} available
                  </option>
                ))}
              </select>
            </div>

            {/* Accessories checklist */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Bundled Accessories & Checklist</span>
                <span className="text-[11px] text-slate-500">{includedAccessories.length} selected</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {COMMON_ACCESSORIES.map((acc) => {
                  const isChecked = includedAccessories.includes(acc);
                  return (
                    <div key={acc} onClick={() => toggleAccessory(acc)}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs font-semibold transition-colors ${isChecked ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 hover:border-slate-400'}`}>
                      {isChecked ? <CheckSquare className="h-4 w-4 shrink-0 text-amber-500" /> : <Square className="h-4 w-4 shrink-0 text-slate-400" />}
                      <span>{acc}</span>
                    </div>
                  );
                })}
              </div>
              {/* Custom item add */}
              <div className="flex gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                <input type="text" placeholder="Add custom item (e.g. Sheet Music Stand)â€¦"
                  value={customAccessoryInput} onChange={(e) => setCustomAccessoryInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); addCustomAccessory(); } }}
                  className="flex-1 h-8 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950" />
                <Button type="button" variant="outline" size="sm" onClick={addCustomAccessory} className="h-8 text-xs font-bold">+ Add</Button>
              </div>
              {/* Show custom items */}
              {includedAccessories.filter(a => !COMMON_ACCESSORIES.includes(a)).length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {includedAccessories.filter(a => !COMMON_ACCESSORIES.includes(a)).map((acc, i) => (
                    <span key={i} onClick={() => toggleAccessory(acc)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 cursor-pointer hover:bg-red-50 hover:text-red-500 hover:border-red-300 transition-colors" title="Click to remove">
                      {acc} Ã—
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </form>
      </Modal>

      {/* Monthly Rent Payment Tracker & Ledger Modal */}
      <Modal
        isOpen={!!selectedRentalForLedger}
        onClose={() => setSelectedRentalForLedger(null)}
        title={`Monthly Rental Ledger â€” ${selectedRentalForLedger?.issueReference}`}
        description="Track month-by-month rent payments, pending balances, bundled accessories, and send email reminders."
        maxWidth="2xl"
      >
        {selectedRentalForLedger && (
          <div className="space-y-6 text-xs text-slate-900 dark:text-white">
            {paymentError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 font-semibold text-red-500">
                {paymentError}
              </div>
            )}

            {reminderFeedback && (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 font-semibold text-emerald-500 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{reminderFeedback}</span>
              </div>
            )}

            {/* Renter & Financial Summary Header */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Renter</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {selectedRentalForLedger.assignedPerson}
                </span>
                <span className="text-[11px] text-slate-400 block">{selectedRentalForLedger.customerEmail}</span>
              </div>

              {selectedRentalForLedger.depositMode ? (
                <>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Deposit Collected</span>
                    <span className="font-bold text-indigo-400 text-sm">
                      {formatCurrency(selectedRentalForLedger.securityDeposit || 0)}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Txn: {selectedRentalForLedger.depositTransactionRef || 'â€”'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Deposit Balance</span>
                    <span className={`font-bold text-sm ${(selectedRentalForLedger.depositBalance || 0) <= 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {formatCurrency(selectedRentalForLedger.depositBalance || 0)}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {selectedRentalForLedger.depositExhausted ? 'âš  Exhausted â€” continuation mode' : 'Remaining'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Months Deducted</span>
                    <span className="font-bold text-amber-500 text-sm">
                      {(selectedRentalForLedger.depositDeductions || []).length}
                      {' / '}
                      {selectedRentalForLedger.lockInPeriodMonths || 'â€”'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {(selectedRentalForLedger.depositDeductions || []).filter((d) => !d.noticeSent).length > 0
                        ? `âš¡ ${(selectedRentalForLedger.depositDeductions || []).filter((d) => !d.noticeSent).length} notice(s) pending`
                        : 'All notices sent'}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Security Deposit</span>
                    <span className="font-bold text-indigo-400 text-sm">
                      {formatCurrency(selectedRentalForLedger.securityDeposit || 0)}
                    </span>
                    <span className="text-[10px] text-slate-500 block">Refundable</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Rent Paid</span>
                    <span className="font-bold text-emerald-500 text-sm">
                      {formatCurrency(selectedRentalForLedger.totalRentPaid || 0)}
                    </span>
                    <span className="text-[10px] text-slate-500 block">Received to date</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Remaining Due</span>
                    <span className="font-bold text-rose-500 text-sm">
                      {formatCurrency(selectedRentalForLedger.totalRentDue || 0)}
                    </span>
                    <span className="text-[10px] text-slate-500 block">Outstanding rent</span>
                  </div>
                </>
              )}
            </div>

            {/* Bundled Accessories Detailing Banner */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-1">
              <span className="font-bold text-slate-600 dark:text-slate-400 text-[11px] block">
                Bundled Items & Accessories with Instrument:
              </span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(selectedRentalForLedger.includedAccessories || []).map((acc, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                  >
                    <Check className="h-3 w-3" />
                    <span>{acc}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Month-by-Month Schedule Table */}
            <div className="space-y-2">
              <h4 className="font-bold uppercase tracking-wider text-slate-500 text-[11px]">
                Month-by-Month Rental Payment Schedule ({selectedRentalForLedger.monthlyPayments?.length || 0} Months)
              </h4>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Billing Month</th>
                      <th className="py-2.5 px-3">Due Date</th>
                      <th className="py-2.5 px-3 text-right">Rent Due</th>
                      <th className="py-2.5 px-3 text-right">Paid Amount</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3">Payment Info</th>
                      <th className="py-2.5 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {(selectedRentalForLedger.monthlyPayments || []).map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                          {p.billingMonth}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {formatDate(p.dueDate)}
                        </td>
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
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenEditPayment(p)}
                              className="h-6 px-2 text-[10px] font-bold gap-1 text-amber-500 hover:text-amber-400 border-amber-500/30"
                              title="Edit Price, Trn No. & Adjust Next Month Rent"
                            >
                              <Pencil className="h-2.5 w-2.5" />
                              <span>Edit</span>
                            </Button>
                            {p.status !== 'PAID' && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenAdjustMonthDue(p)}
                                className="h-6 px-2 text-[10px] font-bold gap-1 text-indigo-400 hover:text-indigo-300 border-indigo-500/30"
                                title="Adjust Rent Due for this Month"
                              >
                                <SlidersHorizontal className="h-2.5 w-2.5" />
                                <span>Adjust Rent</span>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add Extra Rental Month Button */}
              <div className="flex justify-between items-center pt-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddRentalMonth}
                  isLoading={isAddingMonth}
                  disabled={isAddingMonth}
                  className="h-7 text-xs font-bold gap-1 text-indigo-400 hover:text-indigo-300 border-indigo-500/30"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>+ Add Next Rental Month</span>
                </Button>
                <span className="text-[11px] text-slate-400">
                  Click &quot;Edit&quot; on any month to update price &amp; trn no. or adjust next month&apos;s rent.
                </span>
              </div>
            </div>

            {/* Deposit Deduction Form (deposit-mode rentals) */}
            {selectedRentalForLedger.depositMode && !selectedRentalForLedger.depositExhausted && (
              <form
                onSubmit={handleRecordDeduction}
                className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/60 dark:bg-indigo-950/20 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" />
                    Deduct This Month's Rent from Deposit
                  </span>
                  <span className="text-[11px] text-indigo-500">
                    Balance: {formatCurrency(selectedRentalForLedger.depositBalance || 0)}
                  </span>
                </div>

                {deductionError && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 text-xs font-semibold text-red-500">
                    {deductionError}
                  </div>
                )}
                {deductionFeedback && (
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs font-semibold text-emerald-600 flex gap-2 items-start">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>{deductionFeedback}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                      Billing Month *
                    </label>
                    <select
                      required
                      value={deductionBillingMonth}
                      onChange={(e) => {
                        const p = (selectedRentalForLedger.monthlyPayments || []).find(
                          (x) => x.billingMonth === e.target.value
                        );
                        setDeductionBillingMonth(e.target.value);
                        setDeductionMonthIndex(p?.monthIndex || 0);
                      }}
                      className="w-full h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-semibold text-xs"
                    >
                      <option value="">Select monthâ€¦</option>
                      {(selectedRentalForLedger.monthlyPayments || [])
                        .filter((p) => p.status !== 'PAID')
                        .map((p) => (
                          <option key={p.monthIndex} value={p.billingMonth}>
                            {p.billingMonth} â€” â‚¹{p.amountDue.toLocaleString()}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                      Amount to Deduct
                    </label>
                    <div className="h-9 px-3 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-950 flex items-center font-bold text-indigo-500 text-sm">
                      {deductionMonthIndex
                        ? formatCurrency(
                            (selectedRentalForLedger.monthlyPayments || []).find(
                              (p) => p.monthIndex === deductionMonthIndex
                            )?.amountDue || 0
                          )
                        : 'â€”'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                      Internal Note (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Deducted on 1st of month"
                      value={deductionNotes}
                      onChange={(e) => setDeductionNotes(e.target.value)}
                      className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-indigo-200 dark:border-indigo-800/40">
                  <p className="text-[11px] text-indigo-600 dark:text-indigo-400">
                    After deduction, the bell icon will show a pending notice. Manager must click "Send Notice Email" to inform the customer.
                  </p>
                  <Button
                    type="submit"
                    size="sm"
                    variant="default"
                    isLoading={isRecordingDeduction}
                    disabled={!deductionBillingMonth || isRecordingDeduction}
                    className="shrink-0 gap-1.5 font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Shield className="h-3.5 w-3.5" />
                    <span>Deduct from Deposit</span>
                  </Button>
                </div>
              </form>
            )}

            {/* Deposit exhausted â€” continuation mode notice */}
            {selectedRentalForLedger.depositMode && selectedRentalForLedger.depositExhausted && (
              <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-800/50 bg-rose-50/60 dark:bg-rose-950/20 space-y-2">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-xs">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Deposit Fully Utilised â€” Continuation Rent Mode Active</span>
                </div>
                <p className="text-[11px] text-rose-600 dark:text-rose-400/80">
                  The security deposit has been fully exhausted. The customer must now pay monthly rent directly.
                  Use the "Record Rent Payment" form below to collect and log payments for ongoing months.
                </p>
                {selectedRentalForLedger.continuationStartedAt && (
                  <p className="text-[11px] text-slate-500">
                    Continuation started: {formatDate(selectedRentalForLedger.continuationStartedAt)}
                  </p>
                )}
              </div>
            )}

            {/* Deposit Deduction History */}
            {selectedRentalForLedger.depositMode && (selectedRentalForLedger.depositDeductions || []).length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold uppercase tracking-wider text-slate-500 text-[11px]">
                  Deposit Deduction History ({(selectedRentalForLedger.depositDeductions || []).length} entries)
                </h4>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase text-[10px]">
                        <th className="py-2 px-3">Billing Month</th>
                        <th className="py-2 px-3 text-right">Deducted</th>
                        <th className="py-2 px-3 text-right">Balance After</th>
                        <th className="py-2 px-3 text-center">Notice Sent</th>
                        <th className="py-2 px-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {(selectedRentalForLedger.depositDeductions || []).map((d, i) => (
                        <tr key={i} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 ${!d.noticeSent ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''}`}>
                          <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">{d.billingMonth}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-indigo-500">
                            âˆ’ {formatCurrency(d.deductedAmount)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(d.depositBalanceAfter)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {d.noticeSent ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                                <CheckCircle2 className="h-3 w-3" />
                                Sent
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-600 font-bold text-[10px] animate-pulse">
                                <Bell className="h-3 w-3" />
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-500">{formatDate(d.deductedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Record Monthly Payment Form â€” shown always (required for continuation mode; hidden-ish for pure deposit mode) */}
            {(!selectedRentalForLedger.depositMode || selectedRentalForLedger.depositExhausted) && (
            <form
              onSubmit={handleRecordPayment}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3"
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                  {selectedRentalForLedger.depositExhausted ? 'Record Continuation Rent Payment' : 'Record Monthly Rent Payment'}
                </span>
                <span className="text-[11px] text-slate-500">Instant ledger update + receipt email</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                    Amount to Pay (â‚¹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-amber-500 text-right"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                    Billing Month
                  </label>
                  <select
                    value={selectedBillingMonth}
                    onChange={(e) => setSelectedBillingMonth(e.target.value)}
                    className="w-full h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-semibold"
                  >
                    <option value="">Next Due Month</option>
                    {(selectedRentalForLedger.monthlyPayments || []).map((p, i) => (
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
                    value={rentalPaymentMethod}
                    onChange={(e) => setRentalPaymentMethod(e.target.value as any)}
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
                    UPI / Txn Reference *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. UPI-998822"
                    value={rentalTransactionRef}
                    onChange={(e) => setRentalTransactionRef(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSendReminder(selectedRentalForLedger)}
                  isLoading={isSendingReminder}
                  className="gap-1.5 text-indigo-400 border-indigo-500/30"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Send Email Reminder</span>
                </Button>

                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  isLoading={isRecordingPayment}
                  disabled={isRecordingPayment}
                  className="gap-1.5 font-bold"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Confirm Rent Payment</span>
                </Button>
              </div>
            </form>
            )}

            {/* Reminder History Log */}
            {selectedRentalForLedger.remindersSent && selectedRentalForLedger.remindersSent.length > 0 && (
              <div className="space-y-1.5">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">
                  Reminder Dispatch Log
                </span>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {selectedRentalForLedger.remindersSent.map((r, i) => (
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

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setSelectedRentalForLedger(null)}>
                Close Ledger
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Payment & Rent Details Modal */}
      <Modal
        isOpen={!!editingPayment}
        onClose={() => setEditingPayment(null)}
        title={`Edit Payment & Rent â€” ${editingPayment?.billingMonth}`}
        description="Update paid amount, transaction reference (trn no.), payment method, and adjust next month's rent."
        maxWidth="md"
      >
        {editingPayment && (
          <form onSubmit={handleSaveEditPayment} className="space-y-4 text-xs">
            {editPaymentError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 font-semibold text-red-500">
                {editPaymentError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                  Monthly Rent Due (â‚¹) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={editAmountDue}
                  onChange={(e) => setEditAmountDue(parseFloat(e.target.value) || 0)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-amber-500 text-right"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                  Price / Paid Amount (â‚¹) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={editAmountPaid}
                  onChange={(e) => setEditAmountPaid(parseFloat(e.target.value) || 0)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-emerald-500 text-right"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                  Payment Method
                </label>
                <select
                  value={editPaymentMethod}
                  onChange={(e) => setEditPaymentMethod(e.target.value as any)}
                  className="w-full h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-semibold"
                >
                  <option value="UPI">UPI (GPay / PhonePe)</option>
                  <option value="CARD">Debit / Credit Card</option>
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank IMPS</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                  Transaction No. / Trn Ref
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI-998822"
                  value={editTransactionRef}
                  onChange={(e) => setEditTransactionRef(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                Payment Notes / Remarks
              </label>
              <input
                type="text"
                placeholder="e.g. Paid in cash to store manager, balance settled"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950"
              />
            </div>

            {/* Dynamic Next Month Rent Adjustment Section */}
            {editAmountDue !== editAmountPaid && (
              <div className="p-3 rounded-xl border border-indigo-500/30 bg-indigo-500/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-400 uppercase tracking-wider text-[10px]">
                    Next Month Rent Adjustment
                  </span>
                  <span className="font-mono font-bold text-xs">
                    {editAmountPaid < editAmountDue ? (
                      <span className="text-rose-400">
                        Shortfall: -â‚¹{editAmountDue - editAmountPaid}
                      </span>
                    ) : (
                      <span className="text-emerald-400">
                        Surplus: +â‚¹{editAmountPaid - editAmountDue}
                      </span>
                    )}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400">
                  {editAmountPaid < editAmountDue
                    ? `Customer underpaid by â‚¹${editAmountDue - editAmountPaid}. You can automatically carry over and add this balance to next month's rent.`
                    : `Customer overpaid by â‚¹${editAmountPaid - editAmountDue}. You can credit and deduct this amount from next month's rent.`}
                </p>

                <label className="flex items-center gap-2 cursor-pointer pt-1 text-slate-200">
                  <input
                    type="checkbox"
                    checked={editAdjustNextMonth}
                    onChange={(e) => setEditAdjustNextMonth(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="font-semibold text-xs">
                    {editAmountPaid < editAmountDue
                      ? `Adjust Next Month: Add â‚¹${editAmountDue - editAmountPaid} to next month's rent`
                      : `Adjust Next Month: Deduct â‚¹${editAmountPaid - editAmountDue} from next month's rent`}
                  </span>
                </label>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingPayment(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                size="sm"
                isLoading={isSavingEditPayment}
                className="font-bold"
              >
                Save &amp; Update Payment
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Adjust Rent Due for Specific Month Modal */}
      <Modal
        isOpen={!!adjustingMonth}
        onClose={() => setAdjustingMonth(null)}
        title={`Adjust Rent Due â€” ${adjustingMonth?.billingMonth}`}
        description="Modify the agreed monthly rent due for this billing cycle."
        maxWidth="sm"
      >
        {adjustingMonth && (
          <form onSubmit={handleSaveAdjustMonthDue} className="space-y-4 text-xs">
            {adjustDueError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 font-semibold text-red-500">
                {adjustDueError}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                New Rent Due Amount (â‚¹) *
              </label>
              <input
                type="number"
                min="0"
                required
                value={adjustAmountDue}
                onChange={(e) => setAdjustAmountDue(parseFloat(e.target.value) || 0)}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-amber-500 text-right"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                Reason / Adjustment Note
              </label>
              <input
                type="text"
                placeholder="e.g. â‚¹500 discount given or carryover adjustment"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setAdjustingMonth(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                size="sm"
                isLoading={isSavingAdjustDue}
                className="font-bold"
              >
                Save Rent Adjustment
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Return & Inspection Modal */}
      <Modal
        isOpen={!!returnModalUsage}
        onClose={() => setReturnModalUsage(null)}
        title={`Return Inspection â€” ${returnModalUsage?.issueReference}`}
        description="Inspect physical condition of returned equipment, bundled accessories, and process deposit release."
        maxWidth="2xl"
      >
        {returnModalUsage && (
          <form onSubmit={handleReturnSubmit} className="space-y-5">
            {returnError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs font-semibold text-red-500">
                {returnError}
              </div>
            )}

            <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-xs">
              <span className="text-slate-500">Rented to:</span>{' '}
              <strong className="text-slate-900 dark:text-white">
                {returnModalUsage.assignedPerson}
              </strong>{' '}
              | Deposit to reconcile:{' '}
              <strong className="text-indigo-400">
                {formatCurrency(returnModalUsage.securityDeposit || 0)}
              </strong>
            </div>

            <div className="space-y-4">
              {returnModalUsage.items.map((item, idx) => {
                const insp = inspectionOutcomes[idx] || {
                  condition: 'GOOD',
                  outcome: 'OK_TO_STOCK',
                  notes: '',
                };

                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3"
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {item.product?.name}
                      </span>
                      {item.serializedItemId && (
                        <span className="font-mono font-bold text-amber-500">
                          Asset ID: {(item.serializedItemId as any).assetId || 'Serialized'}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-500">Return Condition *</label>
                        <select
                          value={insp.condition}
                          onChange={(e) => {
                            setInspectionOutcomes({
                              ...inspectionOutcomes,
                              [idx]: { ...insp, condition: e.target.value },
                            });
                          }}
                          className="w-full h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-800 bg-transparent"
                        >
                          <option value="MINT">MINT (Like New)</option>
                          <option value="GOOD">GOOD (Normal Wear)</option>
                          <option value="FAIR">FAIR (Needs Setup / Strings)</option>
                          <option value="POOR">POOR (Requires Luthier Repair)</option>
                          <option value="DAMAGED">DAMAGED (Cracked / Broken)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-slate-500">Inspection Outcome *</label>
                        <select
                          value={insp.outcome}
                          onChange={(e) => {
                            setInspectionOutcomes({
                              ...inspectionOutcomes,
                              [idx]: { ...insp, outcome: e.target.value as any },
                            });
                          }}
                          className="w-full h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-800 bg-transparent font-bold text-amber-500"
                        >
                          <option value="OK_TO_STOCK">
                            âœ… OK to Stock (Return to Available Pool)
                          </option>
                          <option value="NEEDS_MAINTENANCE">
                            ðŸ”§ Needs Maintenance (Send for Repair)
                          </option>
                          <option value="QUARANTINE_DAMAGED">
                            ðŸš« Quarantine / Damaged (Block from Sale)
                          </option>
                        </select>
                      </div>
                    </div>

                    <Input
                      placeholder="Inspection notes (e.g. Stand & adapter returned in great condition)"
                      value={insp.notes}
                      onChange={(e) => {
                        setInspectionOutcomes({
                          ...inspectionOutcomes,
                          [idx]: { ...insp, notes: e.target.value },
                        });
                      }}
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setReturnModalUsage(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="default" isLoading={isReturning} className="font-bold">
                Confirm Return & Reconcile Deposit
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Extend Rental Modal */}
      <Modal
        isOpen={!!extendModalUsage}
        onClose={() => setExtendModalUsage(null)}
        title="Extend Rental Return Deadline"
        description={`Extend schedule for rental ${extendModalUsage?.issueReference}`}
        maxWidth="md"
      >
        {extendModalUsage && (
          <form onSubmit={handleExtendSubmit} className="space-y-4">
            {extendError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs font-semibold text-red-500">
                {extendError}
              </div>
            )}

            <Input
              label="New Expected Return Date & Time *"
              type="datetime-local"
              required
              value={newExtendedDate}
              onChange={(e) => setNewExtendedDate(e.target.value)}
            />

            <Input
              label="Reason for Extension *"
              required
              placeholder="e.g. Customer renewed rental agreement for another 3 months"
              value={extensionReason}
              onChange={(e) => setExtensionReason(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setExtendModalUsage(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="default" isLoading={isExtending} className="font-bold">
                Confirm Renewal Extension
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
