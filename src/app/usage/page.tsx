'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { InternalUsage, RentalMonthlyPayment } from '@/lib/types';
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
  Zap,
  ArrowUpRight,
  ExternalLink,
  Eye,
} from 'lucide-react';

export default function UsagePage() {
  const { canIssueUsage } = useAuth();
  const [usages, setUsages] = useState<InternalUsage[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'OVERDUE' | 'RETURNED'>('ALL');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Ledger modal tab state
  const [ledgerTab, setLedgerTab] = useState<'schedule' | 'payment'>('schedule');

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
  const [extendFeedback, setExtendFeedback] = useState('');
  const [addRentalMonthsOnExtend, setAddRentalMonthsOnExtend] = useState(true);
  const [isExtending, setIsExtending] = useState(false);

  // Outward Money / Deposit Refunds Due Modal State
  const [isOutwardModalOpen, setIsOutwardModalOpen] = useState(false);
  const [outwardSearch, setOutwardSearch] = useState('');
  const [outwardModeFilter, setOutwardModeFilter] = useState<'ALL' | 'DEPOSIT_MODE' | 'STANDARD'>('ALL');

  useEffect(() => {
    fetchUsages();
  }, [statusFilter, search]);

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

      const updatedUsage: InternalUsage | undefined = (res as any)?.usage || (res as any)?.data?.usage || (res as any);
      if (updatedUsage && updatedUsage._id) {
        setSelectedRentalForLedger(updatedUsage);
        setRentalTransactionRef('');
        setRentalPaymentNotes('');
        setReminderFeedback(
          `Payment of ${formatCurrency(paymentAmount)} recorded successfully! An official payment receipt email has been dispatched to ${selectedRentalForLedger.customerEmail || selectedRentalForLedger.assignedPerson} for accountability.`
        );
        // Pre-fill next unpaid month if available
        const nextDue = updatedUsage.monthlyPayments?.find((p) => p.status !== 'PAID');
        if (nextDue) {
          setSelectedBillingMonth(nextDue.billingMonth);
          setPaymentAmount(nextDue.amountDue);
        } else {
          setSelectedBillingMonth('');
          setPaymentAmount(0);
        }
        fetchUsages();
      }
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
      const updated: InternalUsage = (res as any)?.usage || (res as any)?.data?.usage || selectedRentalForLedger;
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
        `${formatCurrency(selectedRentalForLedger.monthlyRent ?? 0)} deducted from deposit for ${deductionBillingMonth}. Remaining balance: ${formatCurrency(updated.depositBalance ?? 0)}. Manager will receive a bell notification to send the customer notice email.`
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

      const updatedUsage: InternalUsage | undefined = (res as any)?.usage || (res as any)?.data?.usage || (res as any);
      if (updatedUsage && updatedUsage._id) {
        setSelectedRentalForLedger(updatedUsage);
      }
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

      const updatedUsage: InternalUsage | undefined = (res as any)?.usage || (res as any)?.data?.usage || (res as any);
      if (updatedUsage && updatedUsage._id) {
        setSelectedRentalForLedger(updatedUsage);
      }
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
      const res = await api.post<{ usage?: InternalUsage; data?: { usage: InternalUsage } }>(
        `/usage/${selectedRentalForLedger._id}/add-month`,
        {
          amountDue: selectedRentalForLedger.monthlyRent || 1500,
        }
      );

      const updated: InternalUsage | undefined = (res as any)?.usage || (res as any)?.data?.usage || (res as any);
      if (updated && updated._id) {
        setSelectedRentalForLedger(updated);
        setUsages((prev) => prev.map((u) => (u._id === updated._id ? { ...u, ...updated } : u)));
      }
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
    } catch (err: any) {
      setReturnError(err.message || 'Failed to process return inspection.');
    } finally {
      setIsReturning(false);
    }
  };

  const formatLocalDateForInput = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  const openExtendModal = (usage: InternalUsage) => {
    setExtendModalUsage(usage);
    const currentExpected = usage.expectedReturnDate ? new Date(usage.expectedReturnDate) : new Date();
    const effectiveBase = currentExpected.getTime() > Date.now() ? currentExpected : new Date();
    // Default to +30 days (1 month) from whichever is later: current deadline or today!
    const defaultDate = new Date(effectiveBase.getTime() + 30 * 24 * 60 * 60 * 1000);
    setNewExtendedDate(formatLocalDateForInput(defaultDate));
    setExtensionReason('Customer requested rental return deadline extension');
    setAddRentalMonthsOnExtend(true);
    setExtendError('');
    setExtendFeedback('');
  };

  const setQuickExtensionDays = (days: number) => {
    if (!extendModalUsage) return;
    const currentExpected = extendModalUsage.expectedReturnDate
      ? new Date(extendModalUsage.expectedReturnDate)
      : new Date();
    const effectiveBase = currentExpected.getTime() > Date.now() ? currentExpected : new Date();
    const target = new Date(effectiveBase.getTime() + days * 24 * 60 * 60 * 1000);
    setNewExtendedDate(formatLocalDateForInput(target));
  };

  const handleExtendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendModalUsage) return;
    setExtendError('');
    setExtendFeedback('');
    setIsExtending(true);

    try {
      if (!newExtendedDate) {
        throw new Error('Please select a new expected return date.');
      }

      const chosenDate = new Date(newExtendedDate);
      const currentReturn = new Date(extendModalUsage.expectedReturnDate);
      if (isNaN(chosenDate.getTime())) {
        throw new Error('Please enter a valid date and time.');
      }
      if (chosenDate <= currentReturn) {
        throw new Error(
          `The new return date must be strictly later than current deadline (${formatDate(extendModalUsage.expectedReturnDate)}).`
        );
      }

      const res = await api.post<{ success?: boolean; data?: { usage: InternalUsage }; usage?: InternalUsage }>(
        `/usage/${extendModalUsage._id}/extend`,
        {
          extendedDate: chosenDate.toISOString(),
          reason: extensionReason.trim() || 'Customer requested return extension',
          addRentalMonths: addRentalMonthsOnExtend,
        }
      );

      const updated: InternalUsage | undefined = (res as any)?.usage || (res as any)?.data?.usage || (res as any);
      if (updated && updated._id) {
        setUsages((prev) => prev.map((u) => (u._id === updated._id ? updated : u)));
        if (selectedRentalForLedger && selectedRentalForLedger._id === updated._id) {
          setSelectedRentalForLedger(updated);
        }
      }

      setExtendFeedback(`Return deadline successfully extended to ${formatDateTime(chosenDate)}!`);
      fetchUsages();
      setTimeout(() => {
        setExtendModalUsage(null);
        setExtendFeedback('');
      }, 1400);
    } catch (err: any) {
      setExtendError(err.message || 'Failed to extend rental schedule.');
    } finally {
      setIsExtending(false);
    }
  };

  // ── Edit Rental Agreement Modal State & Handlers ──
  const [editingAgreement, setEditingAgreement] = useState<InternalUsage | null>(null);
  const [editAssignedPerson, setEditAssignedPerson] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editCustomerEmail, setEditCustomerEmail] = useState('');
  const [editLockInPeriodMonths, setEditLockInPeriodMonths] = useState<number>(3);
  const [editMonthlyRent, setEditMonthlyRent] = useState<number>(1500);
  const [editSecurityDeposit, setEditSecurityDeposit] = useState<number>(0);
  const [editAgreementNotes, setEditAgreementNotes] = useState('');
  const [editPayAllNow, setEditPayAllNow] = useState(false);
  const [editAgreementPaymentMethod, setEditAgreementPaymentMethod] = useState<'UPI' | 'CASH' | 'CARD' | 'BANK_TRANSFER'>('UPI');
  const [editAgreementTransactionRef, setEditAgreementTransactionRef] = useState('');
  const [isUpdatingAgreement, setIsUpdatingAgreement] = useState(false);
  const [updateAgreementError, setUpdateAgreementError] = useState('');
  const [updateAgreementFeedback, setUpdateAgreementFeedback] = useState('');

  const openEditAgreementModal = (usage: InternalUsage) => {
    setEditingAgreement(usage);
    setEditAssignedPerson(usage.assignedPerson || '');
    setEditCustomerPhone(usage.assignedPersonContact || '');
    setEditCustomerEmail(usage.customerEmail || '');
    // Ensure lock-in tenure is at least the current length of scheduled monthly payments
    const currentScheduleLength = (usage.monthlyPayments || []).length;
    setEditLockInPeriodMonths(Math.max(usage.lockInPeriodMonths || 3, currentScheduleLength));
    setEditMonthlyRent(usage.monthlyRent || 1500);
    setEditSecurityDeposit(usage.securityDeposit || 0);
    setEditAgreementNotes(usage.notes || '');
    setEditPayAllNow(false);
    setEditAgreementPaymentMethod('UPI');
    setEditAgreementTransactionRef('');
    setUpdateAgreementError('');
    setUpdateAgreementFeedback('');
  };

  // Computed values for editing agreement buyout calculation
  const editingExistingPayments = editingAgreement?.monthlyPayments || [];
  const editingPaidMonths = editingExistingPayments.filter((p) => p.status === 'PAID');
  const editingPaidCount = editingPaidMonths.length;
  const editingAlreadyPaidTotal = editingPaidMonths.reduce((sum, p) => sum + (p.amountPaid || 0), 0);

  // Unpaid months in the existing schedule (including manually added months like Month 4, adjusted months, etc.)
  const editingUnpaidMonths = editingExistingPayments.filter((p) => p.status !== 'PAID');
  const editingUnpaidScheduledTotal = editingUnpaidMonths.reduce(
    (sum, p) => sum + Math.max(0, p.amountDue - (p.amountPaid || 0)),
    0
  );

  // If user sets a higher tenure than current schedule length, calculate extra future months
  const editingTargetTenure = Math.max(1, editLockInPeriodMonths || 1);
  const editingExtraFutureMonths = Math.max(0, editingTargetTenure - editingExistingPayments.length);
  const editingExtraFutureTotal = editingExtraFutureMonths * (editMonthlyRent || 0);

  // Total settlement buyout amount across all remaining unpaid months + any extended future months
  const editingTotalSettlementAmount = editingUnpaidScheduledTotal + editingExtraFutureTotal;
  const editingRemainingMonthsToSettle = editingUnpaidMonths.length + editingExtraFutureMonths;

  const handleUpdateAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgreement) return;
    setUpdateAgreementError('');
    setIsUpdatingAgreement(true);

    try {
      if (editPayAllNow && editingTotalSettlementAmount > 0 && !editAgreementTransactionRef.trim()) {
        throw new Error('Transaction / UPI reference number is compulsory when settling remaining rent.');
      }

      const res = await api.put<{ success: boolean; data: { usage: InternalUsage } }>(
        `/usage/${editingAgreement._id}`,
        {
          assignedPerson: editAssignedPerson.trim(),
          assignedPersonContact: editCustomerPhone.trim(),
          customerEmail: editCustomerEmail.trim().toLowerCase() || undefined,
          lockInPeriodMonths: editLockInPeriodMonths,
          monthlyRent: editMonthlyRent,
          securityDeposit: editSecurityDeposit,
          notes: editAgreementNotes.trim() || undefined,
          payAllRemainingNow: editPayAllNow,
          paymentMethod: editAgreementPaymentMethod,
          transactionRef: editAgreementTransactionRef.trim() || (editPayAllNow ? `SETTLE-${editingAgreement.issueReference}` : undefined),
        }
      );

      const updated: InternalUsage | undefined = (res as any)?.usage || (res as any)?.data?.usage || (res as any);
      if (updated && updated._id) {
        setUsages((prev) => prev.map((u) => (u._id === updated._id ? updated : u)));
        if (selectedRentalForLedger && selectedRentalForLedger._id === updated._id) {
          setSelectedRentalForLedger(updated);
        }
      }

      setUpdateAgreementFeedback(
        editPayAllNow
          ? editingTotalSettlementAmount > 0
            ? `Rental buyout settled successfully for ${formatCurrency(editingTotalSettlementAmount)}! All remaining dues cleared.`
            : 'Rental agreement updated and marked fully satisfied!'
          : 'Rental agreement updated & recalculated successfully!'
      );
      fetchUsages();
      setTimeout(() => {
        setEditingAgreement(null);
        setUpdateAgreementFeedback('');
      }, 1500);
    } catch (err: any) {
      setUpdateAgreementError(err.message || 'Failed to update rental agreement.');
    } finally {
      setIsUpdatingAgreement(false);
    }
  };

  // Financial KPIs for Rentals
  const activeRentals = usages.filter((u) => u.status !== 'RETURNED');
  const totalDepositsHeld = activeRentals.reduce((sum, u) => sum + (u.securityDeposit || 0), 0);
  const totalRentCollected = usages.reduce((sum, u) => sum + (u.totalRentPaid || 0), 0);
  const totalRentPending = activeRentals.reduce((sum, u) => sum + (u.totalRentDue || 0), 0);

  // ── Outward Money / Deposit Refunds Calculation ──
  // Example scenario: Customer deposited ₹5,000; total rent paid/deducted is ₹3,000; remaining deposit balance is ₹2,000 outward refund!
  const outwardRefundList = React.useMemo(() => {
    return usages
      .filter((u) => (u.securityDeposit || 0) > 0 && u.status !== 'RETURNED')
      .map((u) => {
        const deposit = u.securityDeposit || 0;
        let rentPaidOrDeducted = 0;
        let outwardRefundDue = 0;

        if (u.depositMode) {
          // Deposit deduction mode: rent is deducted from the deposit
          const balance =
            typeof u.depositBalance === 'number'
              ? u.depositBalance
              : Math.max(0, deposit - (u.totalRentPaid || 0));
          rentPaidOrDeducted = Math.max(0, deposit - balance);
          outwardRefundDue = Math.max(0, balance);
        } else {
          // Standard rental mode: deposit is held; rent is paid directly.
          // If any rent installments are unpaid (totalRentDue), that is offset against deposit upon return.
          rentPaidOrDeducted = u.totalRentPaid || 0;
          const rentDue = u.totalRentDue || 0;
          outwardRefundDue = Math.max(0, deposit - rentDue);
        }

        const firstItem = u.items && u.items[0];
        const prod = firstItem?.product as any;
        const instrumentName = prod?.name || (firstItem as any)?.productName || 'Musical Instrument';
        const instrumentBrand = prod?.brand || '';
        const assetId = (firstItem?.serializedItemId as any)?.assetId || (firstItem as any)?.assetId;
        const serialNo = (firstItem?.serializedItemId as any)?.manufacturerSerial;

        return {
          usage: u,
          customerName: u.assignedPerson || 'Unnamed Renter',
          customerPhone: u.assignedPersonContact || '',
          customerEmail: u.customerEmail || '',
          instrumentName,
          instrumentBrand,
          assetId,
          serialNo,
          depositMode: !!u.depositMode,
          depositCollected: deposit,
          rentPaidOrDeducted,
          outwardRefundDue,
          status: u.status,
          issueDate: u.issueDate || u.createdAt,
          expectedReturnDate: u.expectedReturnDate,
        };
      })
      .filter((r) => r.outwardRefundDue > 0);
  }, [usages]);

  const totalOutwardRefund = React.useMemo(() => {
    return outwardRefundList.reduce((sum, r) => sum + r.outwardRefundDue, 0);
  }, [outwardRefundList]);

  // Filtered outward refund list by search query and mode filter
  const filteredOutwardRefundList = React.useMemo(() => {
    return outwardRefundList.filter((r) => {
      if (outwardModeFilter === 'DEPOSIT_MODE' && !r.depositMode) return false;
      if (outwardModeFilter === 'STANDARD' && r.depositMode) return false;

      if (!outwardSearch.trim()) return true;
      const q = outwardSearch.toLowerCase().trim();
      return (
        r.customerName.toLowerCase().includes(q) ||
        r.customerPhone.toLowerCase().includes(q) ||
        r.customerEmail.toLowerCase().includes(q) ||
        r.instrumentName.toLowerCase().includes(q) ||
        (r.assetId && r.assetId.toLowerCase().includes(q)) ||
        r.usage.issueReference.toLowerCase().includes(q)
      );
    });
  }, [outwardRefundList, outwardSearch, outwardModeFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Music2 className="h-6 w-6 text-amber-500" />
            <span>Rent Instrument &amp; Instrument Loans</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Stereobliss Retail — Customer rental plans, 3-month lock-in agreements, bundled accessories (stands, adapters, bags), and monthly payment tracking.
          </p>
        </div>

        {canIssueUsage() && (
          <Link href="/usage/new">
            <Button
              size="sm"
              variant="default"
              className="gap-1.5 text-xs font-bold shadow-md cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Rent Instrument / Issue Loan</span>
            </Button>
          </Link>
        )}
      </div>

      {/* Rental Financial Overview Cards (5 Columns with Outward Deposit Refunds) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex justify-between items-center text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Active Rentals</span>
              <Music2 className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {activeRentals.length}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Instruments on active rent</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex justify-between items-center text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Deposits Held</span>
              <Shield className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {formatCurrency(totalDepositsHeld)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Customer safety deposits</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex justify-between items-center text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Rent Collected</span>
              <IndianRupee className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {formatCurrency(totalRentCollected)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Rental income processed</p>
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
            <p className="text-[11px] text-slate-400 mt-1">Outstanding installments</p>
          </CardContent>
        </Card>

        {/* 5. Outward Money / Deposit Refunds Due Card (Clickable to inspect users and instruments) */}
        <Card
          onClick={() => {
            setOutwardSearch('');
            setOutwardModeFilter('ALL');
            setIsOutwardModalOpen(true);
          }}
          className="border-l-4 border-l-teal-500 hover:border-teal-400 bg-teal-500/5 dark:bg-teal-950/20 shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-[0.99] group"
        >
          <CardContent className="p-4">
            <div className="flex justify-between items-center text-teal-700 dark:text-teal-300 text-xs font-bold uppercase tracking-wider">
              <span>Outward Refunds Due</span>
              <Wallet className="h-4 w-4 text-teal-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1">
              {formatCurrency(totalOutwardRefund)}
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">
                {outwardRefundList.length} customer{outwardRefundList.length === 1 ? '' : 's'} refundable
              </span>
              <span className="font-bold text-teal-600 dark:text-teal-400 group-hover:underline flex items-center gap-0.5">
                <span>Inspect</span>
                <ArrowUpRight className="h-3 w-3" />
              </span>
            </div>
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
                ? '⚠ Due / Overdue'
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
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3 whitespace-nowrap">Agreement</th>
                  <th className="py-2.5 px-3">Renter / Customer</th>
                  <th className="py-2.5 px-3">Instrument &amp; Accessories</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Plan &amp; Terms</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Rent &amp; Outward Refund</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Return Deadline</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Actions</th>
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

                    const deposit = u.securityDeposit || 0;
                    let outwardRefund = 0;
                    if (u.depositMode) {
                      const balance =
                        typeof u.depositBalance === 'number'
                          ? u.depositBalance
                          : Math.max(0, deposit - paid);
                      outwardRefund = Math.max(0, balance);
                    } else {
                      outwardRefund = Math.max(0, deposit - due);
                    }

                    const daysRemaining = Math.ceil(
                      (new Date(u.expectedReturnDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                    );

                    return (
                      <tr
                        key={u._id}
                        className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                          isOverdue ? 'bg-rose-500/5' : ''
                        }`}
                      >
                        {/* 1. Agreement Reference */}
                        <td className="py-2 px-3 whitespace-nowrap align-middle">
                          <span className="font-mono font-bold text-amber-500 block text-xs">
                            {u.issueReference}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {u.isRental ? 'Rental Plan' : u.purpose}
                          </span>
                        </td>

                        {/* 2. Customer Information (Compact) */}
                        <td className="py-2 px-3 align-middle">
                          <div className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[150px]" title={u.assignedPerson}>
                            {u.assignedPerson}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                            {u.assignedPersonContact && (
                              <span className="flex items-center gap-0.5 whitespace-nowrap">
                                <Phone className="h-2.5 w-2.5 text-slate-500" />
                                <span>{u.assignedPersonContact}</span>
                              </span>
                            )}
                            {u.customerEmail && (
                              <span className="flex items-center gap-0.5 text-slate-400 truncate max-w-[130px]" title={u.customerEmail}>
                                <Mail className="h-2.5 w-2.5 text-indigo-400 shrink-0" />
                                <span className="truncate">{u.customerEmail}</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 3. Instrument & Single-Line Compact Accessories */}
                        <td className="py-2 px-3 align-middle">
                          <div className="space-y-0.5">
                            {u.items.map((it, idx) => {
                              const pName = (it.product as any)?.name || (it as any).productName || 'Musical Instrument';
                              const pColor = (it.product as any)?.color;
                              return (
                                <div key={idx} className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">{pName}</span>
                                  {pColor && (
                                    <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-300 dark:border-slate-700">
                                      {pColor}
                                    </span>
                                  )}
                                  {it.serializedItemId && (
                                    <span className="font-mono text-amber-500 font-bold text-[10px]">
                                      [{(it.serializedItemId as any).assetId || 'Unit'}]
                                    </span>
                                  )}
                                </div>
                              );
                            })}

                            {/* Sleek single-line accessories */}
                            {accessories.length > 0 ? (
                              <div
                                className="text-[11px] text-slate-400 flex items-center gap-1 max-w-[220px] truncate"
                                title={accessories.join(', ')}
                              >
                                <Tag className="h-2.5 w-2.5 text-indigo-400 shrink-0" />
                                <span className="truncate">{accessories.join(' • ')}</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500 italic">No bundled items</span>
                            )}
                          </div>
                        </td>

                        {/* 4. Plan & Terms (Compact 2 lines) */}
                        <td className="py-2 px-3 whitespace-nowrap align-middle">
                          <div className="space-y-0.5">
                            <div className="text-xs font-bold text-amber-500">
                              {formatCurrency(u.monthlyRent || 0)} <span className="text-[10px] font-normal text-slate-400">/ mo</span>
                              <span className="ml-1 text-[10px] font-semibold text-slate-400">• {u.lockInPeriodMonths || 3}M</span>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Deposit: <strong className="text-indigo-400 font-mono">{formatCurrency(deposit)}</strong>
                              {u.depositMode && <span className="ml-1 text-[9px] font-semibold text-indigo-400">(Auto-deduct)</span>}
                            </div>
                          </div>
                        </td>

                        {/* 5. Rent Collection & Outward Money Outcome */}
                        <td className="py-2 px-3 whitespace-nowrap align-middle">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-xs">
                              <span className="font-mono font-bold text-emerald-500">{formatCurrency(paid)}</span>
                              <span className="text-slate-500">/</span>
                              <span className="font-mono text-slate-400 text-[11px]">{formatCurrency(paid + due)}</span>
                              {due > 0 ? (
                                <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                  {formatCurrency(due)} Due
                                </span>
                              ) : (
                                <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                                  All Paid
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] flex items-center justify-between gap-1 text-teal-600 dark:text-teal-400 font-medium">
                              <span>Refund: <strong className="font-mono font-bold text-teal-500">{formatCurrency(outwardRefund)}</strong></span>
                            </div>
                          </div>
                        </td>

                        {/* 6. Return Deadline & Progress */}
                        <td className="py-2 px-3 whitespace-nowrap align-middle">
                          <div className="space-y-0.5">
                            <span
                              className={
                                isOverdue
                                  ? 'font-bold text-rose-500 flex items-center gap-1 text-xs'
                                  : 'text-slate-800 dark:text-slate-200 text-xs font-semibold'
                              }
                            >
                              {isOverdue && <AlertTriangle className="h-3 w-3 shrink-0" />}
                              {formatDate(u.expectedReturnDate)}
                            </span>
                            <div className="text-[10px] text-slate-400">
                              {isReturned ? (
                                <span className="text-emerald-500 font-medium">Closed</span>
                              ) : isOverdue ? (
                                <span className="text-rose-400 font-bold">Overdue by {Math.abs(daysRemaining)}d</span>
                              ) : (
                                <span>{daysRemaining === 0 ? 'Due Today' : `Due in ${daysRemaining}d`}</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 7. Status */}
                        <td className="py-2 px-3 whitespace-nowrap align-middle">
                          <Badge
                            variant={isReturned ? 'success' : isOverdue ? 'danger' : 'info'}
                            className="text-[10px] px-2 py-0.5"
                          >
                            {isReturned ? 'RETURNED' : isOverdue ? 'DUE / OVERDUE' : 'ACTIVE RENTAL'}
                          </Badge>
                          {u.depositMode && u.depositExhausted && (
                            <div className="mt-0.5">
                              <span
                                className="inline-flex items-center gap-1 px-1 rounded text-[9px] font-bold uppercase bg-rose-500/10 text-rose-500"
                                title={`Deposit exhausted${u.continuationStartedAt ? ` • Started ${formatDate(u.continuationStartedAt)}` : ''}`}
                              >
                                <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                                <span>Deposit Exhausted</span>
                              </span>
                            </div>
                          )}
                        </td>

                        {/* 8. Compact Actions Bar */}
                        <td className="py-2 px-3 text-right whitespace-nowrap align-middle">
                          <div className="flex items-center justify-end gap-1">
                            {/* Track Rent & Monthly Ledger button */}
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => openLedgerModal(u)}
                              className="h-7 px-2.5 text-[11px] font-bold gap-1 bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-sm"
                              title="Track Monthly Rent Payments & Ledger"
                            >
                              <CreditCard className="h-3 w-3" />
                              <span>Track Rent</span>
                            </Button>

                            {/* Secondary Actions as sleek, compact icon buttons with clear tooltips */}
                            {!isReturned && canIssueUsage() && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditAgreementModal(u)}
                                className="h-7 w-7 p-0 text-blue-400 hover:text-blue-300 border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                                title="Edit Rental Agreement Terms & Tenure"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}

                            {!isReturned && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSendReminder(u)}
                                className="h-7 w-7 p-0 text-indigo-400 hover:text-indigo-300 border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                                title="Send Email Due Reminder"
                              >
                                <Mail className="h-3.5 w-3.5" />
                              </Button>
                            )}

                            {!isReturned && canIssueUsage() && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openReturnModal(u)}
                                  className="h-7 w-7 p-0 text-teal-400 hover:text-teal-300 border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                                  title="Inspect & Process Instrument Return"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openExtendModal(u)}
                                  className="h-7 w-7 p-0 text-slate-400 hover:text-white border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                                  title="Extend Duration / Renewal Deadline"
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



      {/* Monthly Rent Payment Tracker & Ledger Modal */}
      <Modal
        isOpen={!!selectedRentalForLedger}
        onClose={() => setSelectedRentalForLedger(null)}
        title={`Monthly Rental Ledger — ${selectedRentalForLedger?.issueReference}`}
        description="Month-by-month rental ledger, deposit reconciliation, and payment settlement."
        maxWidth="4xl"
      >
        {selectedRentalForLedger && (
          <div className="space-y-5 text-xs text-slate-900 dark:text-white">
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

            {/* 1. Renter & Instrument Agreement Header */}
            {(() => {
              const primaryIt = selectedRentalForLedger.items?.[0];
              const prod = primaryIt?.product as any;
              const serialUnit = primaryIt?.serializedItemId as any;
              const pName = prod?.name || (primaryIt as any)?.productName || 'Musical Instrument';

              return (
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 shrink-0">
                      <Music2 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {pName}
                        </span>
                        {prod?.color && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700">
                            {prod.color}
                          </span>
                        )}
                        {serialUnit?.assetId && (
                          <span className="font-mono text-amber-500 font-bold text-xs bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            [{serialUnit.assetId}]
                          </span>
                        )}
                        <Badge
                          variant={selectedRentalForLedger.status === 'ACTIVE' ? 'success' : 'default'}
                          className="text-[10px]"
                        >
                          {selectedRentalForLedger.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Renter: <strong className="text-slate-800 dark:text-slate-200">{selectedRentalForLedger.assignedPerson}</strong>
                        {selectedRentalForLedger.assignedPersonContact && ` (${selectedRentalForLedger.assignedPersonContact})`}
                        {selectedRentalForLedger.customerEmail && ` • ${selectedRentalForLedger.customerEmail}`}
                        {' '}• Agreement: <strong className="font-mono text-slate-800 dark:text-slate-200">{selectedRentalForLedger.issueReference}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const agreement = selectedRentalForLedger;
                        setSelectedRentalForLedger(null);
                        openEditAgreementModal(agreement);
                      }}
                      className="h-8 text-xs font-semibold gap-1.5 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Pencil className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Edit Agreement</span>
                    </Button>
                  </div>
                </div>
              );
            })()}

            {/* 2. Renter Terms & Deposit Status Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              {selectedRentalForLedger.depositMode ? (
                <>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Initial Security Deposit</span>
                    <span className="font-bold text-indigo-400 text-sm">
                      {formatCurrency(selectedRentalForLedger.securityDeposit || 0)}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Txn: {selectedRentalForLedger.depositTransactionRef || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Deposit Custody Balance</span>
                    <span className={`font-bold text-sm ${(selectedRentalForLedger.depositBalance || 0) <= 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {formatCurrency(selectedRentalForLedger.depositBalance || 0)}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {selectedRentalForLedger.depositExhausted ? '⚠️ Exhausted — continuation mode' : 'Available for deductions'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Monthly Deduction Rate</span>
                    <span className="font-bold text-amber-500 text-sm">
                      {formatCurrency(selectedRentalForLedger.monthlyRent || 0)} / mo
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Tenure: {selectedRentalForLedger.lockInPeriodMonths || '—'} Months
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Deposit Deductions</span>
                    <span className="font-bold text-indigo-400 text-sm">
                      {(selectedRentalForLedger.depositDeductions || []).length} Recorded
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {(selectedRentalForLedger.depositDeductions || []).filter((d) => !d.noticeSent).length > 0
                        ? `⚡ ${(selectedRentalForLedger.depositDeductions || []).filter((d) => !d.noticeSent).length} notice(s) pending`
                        : 'All notices dispatched'}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Security Deposit (Refundable)</span>
                    <span className="font-bold text-indigo-400 text-sm">
                      {formatCurrency(selectedRentalForLedger.securityDeposit || 0)}
                    </span>
                    <span className="text-[10px] text-slate-500 block">Disbursed upon return</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Agreed Monthly Rent</span>
                    <span className="font-bold text-amber-500 text-sm">
                      {formatCurrency(selectedRentalForLedger.monthlyRent || 0)} / mo
                    </span>
                    <span className="text-[10px] text-slate-500 block">Tenure: {selectedRentalForLedger.lockInPeriodMonths || 3} Months</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Rent Paid to Date</span>
                    <span className="font-bold text-emerald-500 text-sm">
                      {formatCurrency(selectedRentalForLedger.totalRentPaid || 0)}
                    </span>
                    <span className="text-[10px] text-slate-500 block">Logged via UPI/Cash/Card</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Remaining Rent Due</span>
                    <span className={`font-bold text-sm ${(selectedRentalForLedger.totalRentDue || 0) > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {formatCurrency(selectedRentalForLedger.totalRentDue || 0)}
                    </span>
                    <span className="text-[10px] text-slate-500 block">Outstanding balance</span>
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
                {(selectedRentalForLedger.includedAccessories || []).length > 0 ? (
                  (selectedRentalForLedger.includedAccessories || []).map((acc, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                    >
                      <Check className="h-3 w-3" />
                      <span>{acc}</span>
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400 italic text-[11px]">No extra accessories bundled</span>
                )}
              </div>
            </div>

            {/* 3. Month-by-Month Schedule Table with Quick Actions */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="font-bold uppercase tracking-wider text-slate-500 text-[11px]">
                  Month-by-Month Rental Payment Schedule ({selectedRentalForLedger.monthlyPayments?.length || 0} Months)
                </h4>
                <span className="text-[11px] text-slate-400">
                  Editing rent auto-carries difference to next month
                </span>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
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
                    {(selectedRentalForLedger.monthlyPayments || []).map((p, idx) => {
                      const isOverdueMonth = p.status !== 'PAID' && new Date(p.dueDate) < new Date();
                      const hasAdjustment = p.notes && (p.notes.includes('Auto-adjusted') || p.notes.includes('Auto-generated') || p.notes.includes('carry'));

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{p.billingMonth}</span>
                              {hasAdjustment && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 border border-indigo-200 dark:border-indigo-800" title={p.notes}>
                                  Adjusted
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className={isOverdueMonth ? 'font-bold text-rose-500 flex items-center gap-1' : 'text-slate-500'}>
                              {isOverdueMonth && <AlertTriangle className="h-3 w-3 shrink-0" />}
                              {formatDate(p.dueDate)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-500 whitespace-nowrap">
                            {formatCurrency(p.amountDue)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-500 whitespace-nowrap">
                            {formatCurrency(p.amountPaid || 0)}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <Badge
                              variant={p.status === 'PAID' ? 'success' : isOverdueMonth ? 'danger' : 'warning'}
                              className="text-[10px]"
                            >
                              {p.status === 'PAID' ? 'PAID' : isOverdueMonth ? 'OVERDUE' : 'DUE'}
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
                                  <div className="text-[10px] text-slate-400 italic line-clamp-1" title={p.notes}>{p.notes}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Pending payment</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {p.status !== 'PAID' && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenAdjustMonthDue(p)}
                                  className="h-6 px-2 text-[10px] font-bold gap-1 text-indigo-400 hover:text-indigo-300 border-indigo-500/30"
                                  title="Adjust Rent Due for this Month (Auto-carries difference)"
                                >
                                  <SlidersHorizontal className="h-2.5 w-2.5" />
                                  <span>Adjust</span>
                                </Button>
                              )}

                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenEditPayment(p)}
                                className="h-6 px-2 text-[10px] font-bold gap-1 text-amber-500 hover:text-amber-400 border-amber-500/30"
                                title="Edit Paid Amount, Trn No. & Payment Method"
                              >
                                <Pencil className="h-2.5 w-2.5" />
                                <span>Edit</span>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
                  className="h-7 text-xs font-bold gap-1.5 text-indigo-400 hover:text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/10"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>+ Add Next Rental Month</span>
                </Button>
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
                      <option value="">Select month…</option>
                      {(selectedRentalForLedger.monthlyPayments || [])
                        .filter((p) => p.status !== 'PAID')
                        .map((p) => (
                          <option key={p.monthIndex} value={p.billingMonth}>
                            {p.billingMonth} — {formatCurrency(p.amountDue)}
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
                        : '—'}
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

            {/* Deposit exhausted indicator */}
            {selectedRentalForLedger.depositMode && selectedRentalForLedger.depositExhausted && (
              <div className="flex items-center justify-between px-3.5 py-2 rounded-lg border border-rose-300 dark:border-rose-900/40 bg-rose-50/70 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
                  <span>Deposit Exhausted</span>
                  <span className="font-normal text-slate-500 dark:text-slate-400 hidden sm:inline">
                    — Continuation Mode Active
                  </span>
                </div>
                {selectedRentalForLedger.continuationStartedAt && (
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Started: {formatDate(selectedRentalForLedger.continuationStartedAt)}
                  </span>
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
                            − {formatCurrency(d.deductedAmount)}
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

            {/* Record Monthly Payment Form — shown always (required for continuation mode; hidden-ish for pure deposit mode) */}
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

              {/* Settle All Remaining Rent Directly at Once (Buyout) Quick Banner */}
              {(selectedRentalForLedger.totalRentDue ?? 0) > 0 && (
                <div className="p-3 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-500/10 dark:bg-amber-950/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                      <Zap className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-slate-900 dark:text-white block">
                        Pay &amp; Settle All Remaining Rent Directly at Once (Buyout)
                      </span>
                      <span className="text-[11px] text-slate-600 dark:text-slate-400">
                        Remaining balance across all upcoming months: <strong className="text-amber-600 dark:text-amber-400 font-bold">{formatCurrency(selectedRentalForLedger.totalRentDue ?? 0)}</strong>
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentAmount(selectedRentalForLedger.totalRentDue ?? 0);
                      setSelectedBillingMonth('');
                      setRentalPaymentNotes('Full rental buyout/settlement in one payment');
                      if (!rentalTransactionRef) {
                        setRentalTransactionRef(`SETTLE-${selectedRentalForLedger.issueReference}`);
                      }
                    }}
                    className="shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Fill Buyout ({formatCurrency(selectedRentalForLedger.totalRentDue ?? 0)})</span>
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-semibold uppercase text-slate-500">
                      Amount to Pay (₹) *
                    </label>
                    {(selectedRentalForLedger.totalRentDue ?? 0) > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentAmount(selectedRentalForLedger.totalRentDue ?? 0);
                          setSelectedBillingMonth('');
                        }}
                        className="text-[10px] font-bold text-amber-500 hover:underline"
                      >
                        Pay All Due (₹{selectedRentalForLedger.totalRentDue ?? 0})
                      </button>
                    )}
                  </div>
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

            <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  openExtendModal(selectedRentalForLedger);
                }}
                className="gap-1.5 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold"
              >
                <CalendarPlus className="h-3.5 w-3.5" />
                <span>Extend Return Deadline</span>
              </Button>
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
        title={`Edit Payment & Rent — ${editingPayment?.billingMonth}`}
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
                  Monthly Rent Due (₹) *
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
                  Price / Paid Amount (₹) *
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
                        Shortfall: -₹{editAmountDue - editAmountPaid}
                      </span>
                    ) : (
                      <span className="text-emerald-400">
                        Surplus: +₹{editAmountPaid - editAmountDue}
                      </span>
                    )}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400">
                  {editAmountPaid < editAmountDue
                    ? `Customer underpaid by ₹${editAmountDue - editAmountPaid}. You can automatically carry over and add this balance to next month's rent.`
                    : `Customer overpaid by ₹${editAmountPaid - editAmountDue}. You can credit and deduct this amount from next month's rent.`}
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
                      ? `Adjust Next Month: Add ₹${editAmountDue - editAmountPaid} to next month's rent`
                      : `Adjust Next Month: Deduct ₹${editAmountPaid - editAmountDue} from next month's rent`}
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
        title={`Adjust Rent Due — ${adjustingMonth?.billingMonth}`}
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
                New Rent Due Amount (₹) *
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

            {adjustingMonth && adjustAmountDue !== adjustingMonth.amountDue && (
              <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-400 font-medium">
                ⚡ Difference of{' '}
                <strong>
                  {adjustAmountDue < adjustingMonth.amountDue
                    ? `+₹${adjustingMonth.amountDue - adjustAmountDue} shortfall`
                    : `-₹${adjustAmountDue - adjustingMonth.amountDue} credit`}
                </strong>{' '}
                will automatically be carried forward to next month&apos;s schedule!
              </div>
            )}

            <div>
              <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                Reason / Adjustment Note
              </label>
              <input
                type="text"
                placeholder="e.g. ₹500 discount given or carryover adjustment"
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
        title={`Return Inspection — ${returnModalUsage?.issueReference}`}
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
                            ✅ OK to Stock (Return to Available Pool)
                          </option>
                          <option value="NEEDS_MAINTENANCE">
                            🔧 Needs Maintenance (Send for Repair)
                          </option>
                          <option value="QUARANTINE_DAMAGED">
                            🚫 Quarantine / Damaged (Block from Sale)
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
        description={`Extend return date & schedule for ${extendModalUsage?.issueReference || ''}`}
        maxWidth="lg"
      >
        {extendModalUsage && (
          <form onSubmit={handleExtendSubmit} className="space-y-4 text-xs">
            {extendError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs font-semibold text-red-500 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{extendError}</span>
              </div>
            )}
            {extendFeedback && (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs font-semibold text-emerald-600 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{extendFeedback}</span>
              </div>
            )}

            {/* Current Status Overview */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold uppercase text-[10px]">Agreement Ref</span>
                <span className="font-mono font-bold text-amber-500">{extendModalUsage.issueReference}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold uppercase text-[10px]">Renter</span>
                <span className="font-bold text-slate-900 dark:text-white">{extendModalUsage.assignedPerson}</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-1.5 border-t border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500 font-semibold uppercase text-[10px]">Current Return Deadline</span>
                <span className="font-bold font-mono text-rose-600 dark:text-rose-400">
                  {formatDateTime(extendModalUsage.expectedReturnDate)}
                </span>
              </div>
            </div>

            {/* Quick Extension Presets */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold uppercase text-slate-500">
                Quick Extension Presets (From Current Deadline)
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: '+7 Days', days: 7 },
                  { label: '+15 Days', days: 15 },
                  { label: '+1 Month', days: 30, recommended: true },
                  { label: '+3 Months', days: 90 },
                ].map((preset) => (
                  <button
                    type="button"
                    key={preset.days}
                    onClick={() => setQuickExtensionDays(preset.days)}
                    className={`py-2 px-2 rounded-lg text-xs font-bold border transition-all text-center ${
                      preset.recommended
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm hover:bg-amber-600'
                        : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-400'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Input */}
            <div className="space-y-1">
              <label className="block text-[10px] font-semibold uppercase text-slate-500">
                New Expected Return Date &amp; Time *
              </label>
              <input
                type="datetime-local"
                required
                min={formatLocalDateForInput(new Date(extendModalUsage.expectedReturnDate))}
                value={newExtendedDate}
                onChange={(e) => setNewExtendedDate(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-mono font-bold text-slate-900 dark:text-white"
              />
              {newExtendedDate && (
                <div className="mt-1 text-[11px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-medium">
                  <Calendar className="h-3 w-3 shrink-0" />
                  <span>
                    New return deadline will be: <strong>{formatDateTime(newExtendedDate)}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Sync Rental Schedule Checkbox */}
            {extendModalUsage.isRental && (extendModalUsage.monthlyRent || 0) > 0 && (
              <div className="p-3 rounded-lg border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/20">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addRentalMonthsOnExtend}
                    onChange={(e) => setAddRentalMonthsOnExtend(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-xs text-indigo-900 dark:text-indigo-300 block">
                      Sync rental schedule (add monthly rent for extended tenure)
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      Adds upcoming month(s) at {formatCurrency(extendModalUsage.monthlyRent || 0)}/mo to the ledger tracker so the customer can be billed accurately.
                    </span>
                  </div>
                </label>
              </div>
            )}

            {/* Reason with Quick Chips */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-semibold uppercase text-slate-500">
                  Reason for Extension *
                </label>
                <div className="flex gap-1.5 text-[10px]">
                  {['Customer Renewal', 'Grace Extension', 'Event Delay'].map((tag) => (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => setExtensionReason(tag)}
                      className="font-bold text-amber-600 dark:text-amber-400 hover:underline"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                required
                value={extensionReason}
                onChange={(e) => setExtensionReason(e.target.value)}
                placeholder="e.g. Customer renewed rental agreement for another month"
                className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-medium text-slate-900 dark:text-white"
              />
            </div>

            {/* Previous Extensions */}
            {(extendModalUsage.extensions || []).length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Extension History ({(extendModalUsage.extensions || []).length})
                </span>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {(extendModalUsage.extensions || []).map((ext, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between text-[11px] p-1.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
                    >
                      <span className="text-slate-600 dark:text-slate-400 truncate max-w-[220px]">
                        {ext.reason}
                      </span>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                        {formatDate(ext.extendedDate)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setExtendModalUsage(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                isLoading={isExtending}
                disabled={isExtending || !!extendFeedback}
                className="font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 gap-1.5"
              >
                <CalendarPlus className="h-4 w-4" />
                <span>Confirm Return Extension</span>
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Edit Rental Agreement Modal */}
      <Modal
        isOpen={!!editingAgreement}
        onClose={() => setEditingAgreement(null)}
        title={`Edit Rental Agreement #${editingAgreement?.issueReference || ''}`}
        description="Update tenure months, monthly rent amount, or settle all remaining dues directly."
        maxWidth="xl"
      >
        {editingAgreement && (
          <form onSubmit={handleUpdateAgreement} className="space-y-4">
            {updateAgreementError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{updateAgreementError}</span>
              </div>
            )}

            {updateAgreementFeedback && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{updateAgreementFeedback}</span>
              </div>
            )}

            {/* Customer Details */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                1. Customer Information
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Customer Name *"
                  required
                  value={editAssignedPerson}
                  onChange={(e) => setEditAssignedPerson(e.target.value)}
                />
                <Input
                  label="Phone Number"
                  value={editCustomerPhone}
                  onChange={(e) => setEditCustomerPhone(e.target.value)}
                />
                <Input
                  label="Email (for receipts)"
                  type="email"
                  value={editCustomerEmail}
                  onChange={(e) => setEditCustomerEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Agreement Terms & Tenure */}
            <div className="rounded-xl border border-amber-500/30 p-3.5 bg-amber-500/5 dark:bg-amber-950/20 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="font-bold text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                  2. Rental Tenure &amp; Pricing Parameters
                </span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Paid so far: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{editingPaidCount} of {editingAgreement.lockInPeriodMonths || 3} Mo</strong> ({formatCurrency(editingAlreadyPaidTotal)})
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[10px] font-semibold uppercase text-slate-600 dark:text-slate-400">
                      Lock-In Duration
                    </label>
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      {editLockInPeriodMonths} Months
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {[1, 3, 6, 12].map((m) => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => setEditLockInPeriodMonths(m)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                          editLockInPeriodMonths === m
                            ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                            : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-700 hover:border-amber-400'
                        }`}
                      >
                        {m}M
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1.5">
                    Monthly Rent (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editMonthlyRent}
                    onChange={(e) => setEditMonthlyRent(parseFloat(e.target.value) || 0)}
                    className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-amber-500 text-right"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1.5">
                    Security Deposit (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editSecurityDeposit}
                    onChange={(e) => setEditSecurityDeposit(parseFloat(e.target.value) || 0)}
                    className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-indigo-400 text-right"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs space-y-1">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Tenure Plan:</span>
                  <strong className="text-slate-900 dark:text-white font-bold">{editLockInPeriodMonths} Month(s) Agreement</strong>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Deduction / Due Schedule:</span>
                  <strong className="text-amber-500 font-bold">1st date of each upcoming month</strong>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  <span>Remaining Unpaid under this Plan:</span>
                  <strong className={editingRemainingMonthsToSettle > 0 ? "text-rose-500 font-bold" : "text-emerald-500 font-bold"}>
                    {editingRemainingMonthsToSettle > 0
                      ? `${editingRemainingMonthsToSettle} Month(s) (${formatCurrency(editingTotalSettlementAmount)})`
                      : 'All Planned Months Satisfied (₹0 Due)'}
                  </strong>
                </div>
              </div>
            </div>

            {/* 3. Pay & Settle All Remaining Rent Directly at Once (Buyout) */}
            <div className={`rounded-xl border transition-all ${
              editPayAllNow
                ? 'border-indigo-400 dark:border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 p-4 space-y-3.5 shadow-sm'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-3.5'
            }`}>
              <div className="flex items-start sm:items-center justify-between gap-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editPayAllNow}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setEditPayAllNow(checked);
                      if (checked && !editAgreementTransactionRef && editingTotalSettlementAmount > 0) {
                        setEditAgreementTransactionRef(`BUYOUT-${editingAgreement.issueReference}`);
                      }
                    }}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span>Pay &amp; Settle All Remaining Rent Directly at Once (Buyout)</span>
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      Collect remaining rent and close out all future dues immediately in a single transaction
                    </span>
                  </div>
                </label>

                <div className="text-right shrink-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Settlement</span>
                  <span className="text-sm font-black font-mono text-indigo-600 dark:text-indigo-400">
                    {formatCurrency(editingTotalSettlementAmount)}
                  </span>
                </div>
              </div>

              {editPayAllNow && (
                <div className="pt-3 border-t border-indigo-200 dark:border-indigo-800/60 space-y-3">
                  {/* Financial Settlement Breakdown Alert */}
                  {editingTotalSettlementAmount > 0 ? (
                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/80 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                            Exact Amount Manager / Admin Must Collect:
                          </span>
                          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-tight mt-0.5">
                            {formatCurrency(editingTotalSettlementAmount)}
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                            {editingRemainingMonthsToSettle} Unpaid {editingRemainingMonthsToSettle === 1 ? 'Month' : 'Months'} to Clear
                          </span>
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            ✓ Clears all remaining scheduled &amp; added dues in 1 payment
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                          Agreed Tenure: <strong>{editingTargetTenure} Months</strong>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium border border-emerald-200 dark:border-emerald-800/40">
                          Already Paid: <strong>{editingPaidCount} Mo ({formatCurrency(editingAlreadyPaidTotal)})</strong>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-medium border border-amber-200 dark:border-amber-800/40">
                          Months to Clear: <strong>{editingRemainingMonthsToSettle} Mo</strong>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      <span>
                        All {editingPaidCount} month(s) under this {editingTargetTenure}-month agreement are already paid ({formatCurrency(editingAlreadyPaidTotal)} collected). No additional payment required!
                      </span>
                    </div>
                  )}

                  {/* Payment Details Inputs */}
                  {editingTotalSettlementAmount > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[10px] font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                          Payment Method *
                        </label>
                        <select
                          value={editAgreementPaymentMethod}
                          onChange={(e) => setEditAgreementPaymentMethod(e.target.value as any)}
                          className="w-full h-9 px-2 text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-slate-900 dark:text-white"
                        >
                          <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                          <option value="CASH">Cash at Store Counter</option>
                          <option value="CARD">Debit / Credit Card</option>
                          <option value="BANK_TRANSFER">Bank IMPS / NEFT</option>
                        </select>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-semibold uppercase text-slate-600 dark:text-slate-400">
                            Transaction / Receipt Ref *
                          </label>
                          <div className="flex gap-1.5 text-[10px]">
                            <button
                              type="button"
                              onClick={() => setEditAgreementTransactionRef(`CASH-${Date.now().toString().slice(-6)}`)}
                              className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              Cash Receipt
                            </button>
                            <span className="text-slate-300 dark:text-slate-700">|</span>
                            <button
                              type="button"
                              onClick={() => setEditAgreementTransactionRef(`UPI-${Date.now().toString().slice(-6)}`)}
                              className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              UPI Ref
                            </button>
                          </div>
                        </div>
                        <input
                          type="text"
                          required={editPayAllNow && editingTotalSettlementAmount > 0}
                          placeholder="e.g. UPI-998822 or CASH-RCPT"
                          value={editAgreementTransactionRef}
                          onChange={(e) => setEditAgreementTransactionRef(e.target.value)}
                          className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-mono font-bold text-slate-900 dark:text-white placeholder:text-slate-400"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setEditingAgreement(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                isLoading={isUpdatingAgreement}
                className="font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 gap-1.5"
              >
                {editPayAllNow ? (
                  editingTotalSettlementAmount > 0 ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Confirm &amp; Settle {formatCurrency(editingTotalSettlementAmount)} (Buyout)</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Save Agreement (Fully Satisfied)</span>
                    </>
                  )
                ) : (
                  <span>Save Changes &amp; Recalculate</span>
                )}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Outward Money / Deposit Refunds Due Modal ── */}
      <Modal
        isOpen={isOutwardModalOpen}
        onClose={() => setIsOutwardModalOpen(false)}
        title="Outward Deposit Refunds — Customer & Instrument Breakdown"
        description="Comprehensive summary of security deposit balances held in custody that will be disbursed outward to customers upon instrument return or contract settlement."
        maxWidth="4xl"
      >
        <div className="space-y-4 pt-1">
          {/* Outward Liability Summary Banner */}
          <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
                <Wallet className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <span>Total Outward Money Due for Refund</span>
              </span>
              <div className="text-3xl font-black font-mono text-teal-600 dark:text-teal-400">
                {formatCurrency(totalOutwardRefund)}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Formula: <strong>Security Deposit Collected − Rent Paid / Rent Deducted</strong> = Outward Refundable Balance
              </p>
            </div>

            <div className="flex gap-2">
              <div className="px-3.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-teal-500/30 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Eligible Customers</span>
                <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                  {outwardRefundList.length}
                </span>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between pt-1">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search customer, phone, instrument, asset ID..."
                value={outwardSearch}
                onChange={(e) => setOutwardSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex gap-1 self-start sm:self-auto p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
              {(['ALL', 'DEPOSIT_MODE', 'STANDARD'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setOutwardModeFilter(mode)}
                  className={`px-2.5 py-1 font-bold rounded-md transition-colors text-[11px] ${
                    outwardModeFilter === mode
                      ? 'bg-teal-500 text-slate-950 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {mode === 'ALL'
                    ? `All (${outwardRefundList.length})`
                    : mode === 'DEPOSIT_MODE'
                    ? 'Deposit Auto-Deduct'
                    : 'Standard Deposit'}
                </button>
              ))}
            </div>
          </div>

          {/* Customer & Instrument Cards List */}
          <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
            {filteredOutwardRefundList.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-800 text-slate-500 text-xs">
                No outward deposit refund records found matching your query.
              </div>
            ) : (
              filteredOutwardRefundList.map((item) => (
                <div
                  key={item.usage._id}
                  className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-500/40 transition-colors space-y-3 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    {/* Customer & Instrument Details */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                          <User className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                          <span>{item.customerName}</span>
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          #{item.usage.issueReference}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.depositMode
                              ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {item.depositMode ? 'Deposit Auto-Deduct' : 'Standard Deposit'}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        {item.customerPhone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            <span>{item.customerPhone}</span>
                          </span>
                        )}
                        {item.customerEmail && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                            <span>{item.customerEmail}</span>
                          </span>
                        )}
                      </div>

                      {/* Instrument Information */}
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <Music2 className="h-3.5 w-3.5 text-amber-500" />
                            <span>{item.instrumentName}</span>
                            {item.instrumentBrand && (
                              <span className="text-[10px] text-slate-400 font-normal">
                                ({item.instrumentBrand})
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Return Deadline: <strong className="text-slate-700 dark:text-slate-300">{formatDate(item.expectedReturnDate)}</strong>
                          </div>
                        </div>

                        <div className="text-right">
                          {item.assetId ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              Asset: {item.assetId}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">Standard Stock</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Financial Snapshot & Outward Money */}
                    <div className="sm:text-right flex sm:flex-col justify-between items-end gap-2 bg-teal-500/5 dark:bg-teal-950/30 p-3 rounded-xl border border-teal-500/20 shrink-0 min-w-[200px]">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-teal-700 dark:text-teal-400 block tracking-wider">
                          Outward Money (Refund Due)
                        </span>
                        <div className="text-2xl font-black font-mono text-teal-600 dark:text-teal-400">
                          {formatCurrency(item.outwardRefundDue)}
                        </div>
                      </div>

                      <div className="text-xs space-y-0.5 text-slate-500 dark:text-slate-400 text-left sm:text-right">
                        <div>
                          Deposit Collected:{' '}
                          <strong className="text-slate-900 dark:text-white font-mono">
                            {formatCurrency(item.depositCollected)}
                          </strong>
                        </div>
                        <div>
                          Rent Deducted/Paid:{' '}
                          <strong className="text-slate-900 dark:text-white font-mono">
                            {formatCurrency(item.rentPaidOrDeducted)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions for this Customer & Instrument */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="text-[11px] text-slate-400">
                      Rented on {formatDate(item.issueDate)}
                    </span>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsOutwardModalOpen(false);
                          openLedgerModal(item.usage);
                        }}
                        className="h-7 text-xs font-semibold gap-1"
                      >
                        <ClipboardList className="h-3.5 w-3.5 text-indigo-500" />
                        <span>View Ledger</span>
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        onClick={() => {
                          setIsOutwardModalOpen(false);
                          openReturnModal(item.usage);
                        }}
                        className="h-7 text-xs font-bold gap-1 bg-teal-600 hover:bg-teal-700 text-white"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Process Return &amp; Refund</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-500">
              Showing {filteredOutwardRefundList.length} of {outwardRefundList.length} refundable agreement(s)
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOutwardModalOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
