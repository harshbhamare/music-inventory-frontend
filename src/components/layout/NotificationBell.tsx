'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { RentalDuesSummary, RentalDueItem } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Bell,
  Mail,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  RefreshCw,
  X,
  ExternalLink,
  ChevronRight,
  SendHorizontal,
  Sparkles,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [duesData, setDuesData] = useState<RentalDuesSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'OVERDUE' | 'UPCOMING' | 'DEPOSIT'>('ALL');
  const [sendingIds, setSendingIds] = useState<Record<string, boolean>>({});
  const [sentFeedback, setSentFeedback] = useState<Record<string, string>>({});
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [bulkFeedback, setBulkFeedback] = useState('');

  // Per-deduction notice send state (deposit-mode items)
  const [sendingNoticeIds, setSendingNoticeIds] = useState<Record<string, boolean>>({});
  const [noticeFeedback, setNoticeFeedback] = useState<Record<string, string>>({});

  // Custom email modal state
  const [promptEmailModal, setPromptEmailModal] = useState<{
    isOpen: boolean;
    item: RentalDueItem | null;
    email: string;
    customNote: string;
  }>({
    isOpen: false,
    item: null,
    email: '',
    customNote: '',
  });

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDuesSummary();
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const fetchDuesSummary = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{ data: RentalDuesSummary }>('/usage/dues-summary');
      if (res && res.data) {
        setDuesData(res.data);
      }
    } catch (err) {
      console.error('Failed to load rental dues summary:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendReminder = async (item: RentalDueItem, overrideEmail?: string, customNote?: string) => {
    // If no email on record and no override provided, open the email prompt dialog
    if (!item.customerEmail && !overrideEmail) {
      setPromptEmailModal({
        isOpen: true,
        item,
        email: '',
        customNote: '',
      });
      return;
    }

    setSendingIds((prev) => ({ ...prev, [item.id]: true }));
    setSentFeedback((prev) => ({ ...prev, [item.id]: '' }));

    try {
      const res = await api.post<{
        success: boolean;
        message: string;
        sentTo: string;
        emailDispatched: boolean;
        emailStatus: string;
      }>(`/usage/${item.id}/send-reminder`, {
        recipientEmail: overrideEmail || item.customerEmail,
        customNote,
      });

      const channelNote = res.emailDispatched
        ? `Reminder sent to ${res.sentTo} via Email!`
        : `Reminder recorded for ${res.sentTo}!`;

      setSentFeedback((prev) => ({ ...prev, [item.id]: channelNote }));

      // Update local item
      setDuesData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          items: prev.items.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  remindersSentCount: (i.remindersSentCount || 0) + 1,
                  lastReminderSentAt: new Date().toISOString(),
                }
              : i
          ),
        };
      });

      // Clear feedback after 4s
      setTimeout(() => {
        setSentFeedback((prev) => {
          const next = { ...prev };
          delete next[item.id];
          return next;
        });
      }, 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch reminder.');
    } finally {
      setSendingIds((prev) => ({ ...prev, [item.id]: false }));
      if (promptEmailModal.isOpen) {
        setPromptEmailModal({ isOpen: false, item: null, email: '', customNote: '' });
      }
    }
  };

  const handleSendBulk = async () => {
    const overdueWithEmail = (duesData?.items || []).filter(
      (i) => i.status === 'OVERDUE' && i.customerEmail
    );
    if (overdueWithEmail.length === 0) {
      alert('No overdue rentals with customer email addresses were found to send.');
      return;
    }

    if (
      !confirm(
        `Are you sure you want to dispatch rent payment reminder emails to ${overdueWithEmail.length} overdue customer(s)?`
      )
    ) {
      return;
    }

    setIsSendingBulk(true);
    setBulkFeedback('');

    try {
      const res = await api.post<{
        success: boolean;
        data: { totalRequested: number; sentCount: number; skippedCount: number };
      }>('/usage/bulk-reminders', {
        usageIds: overdueWithEmail.map((i) => i.id),
      });

      setBulkFeedback(
        `Successfully dispatched ${res.data.sentCount} reminder emails!`
      );
      fetchDuesSummary();
      setTimeout(() => setBulkFeedback(''), 5000);
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch bulk reminders.');
    } finally {
      setIsSendingBulk(false);
    }
  };

  // Send deposit deduction notice email for a specific deduction entry
  const handleSendDepositNotice = async (
    item: RentalDueItem,
    deductionId: string,
    billingMonth: string
  ) => {
    const key = `${item.id}-${deductionId}`;
    setSendingNoticeIds((prev) => ({ ...prev, [key]: true }));
    setNoticeFeedback((prev) => ({ ...prev, [key]: '' }));
    try {
      await api.post(
        `/usage/${item.id}/deposit-deductions/${deductionId}/send-notice`,
        { recipientEmail: item.customerEmail || undefined }
      );
      setNoticeFeedback((prev) => ({
        ...prev,
        [key]: `Notice emailed to ${item.customerEmail || item.assignedPerson} for ${billingMonth}!`,
      }));
      // Mark the deduction as notice-sent locally so the badge updates instantly
      setDuesData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          items: prev.items.map((i) => {
            if (i.id !== item.id) return i;
            return {
              ...i,
              pendingNoticeDeductions: (i.pendingNoticeDeductions || []).filter(
                (d) => d._id !== deductionId
              ),
            };
          }).filter((i) => {
            // Remove item from list if it has no more pending notices
            if (i.loanType !== 'RENTAL_DEPOSIT') return true;
            return (i.pendingNoticeDeductions || []).length > 0;
          }),
        };
      });
      setTimeout(() => {
        setSendingNoticeIds((prev) => ({ ...prev, [key]: false }));
        setNoticeFeedback((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }, 4000);
    } catch (err: any) {
      setNoticeFeedback((prev) => ({
        ...prev,
        [key]: `Failed: ${err.message || 'Could not send notice email.'}`,
      }));
      setSendingNoticeIds((prev) => ({ ...prev, [key]: false }));
    }
  };

  const summary = duesData?.summary;
  const allItems = duesData?.items || [];
  const totalCount = summary?.totalRentalsWithDues || 0;
  const overdueCount = summary?.overdueCount || 0;

  const depositNoticePendingCount = allItems.filter(
    (i) => i.loanType === 'RENTAL_DEPOSIT' && i.status === 'DEPOSIT_NOTICE_PENDING'
  ).length;

  const filteredItems = allItems.filter((i) => {
    if (activeFilter === 'OVERDUE') return i.status === 'OVERDUE';
    if (activeFilter === 'UPCOMING') return i.status !== 'OVERDUE' && i.loanType !== 'RENTAL_DEPOSIT';
    if (activeFilter === 'DEPOSIT') return i.loanType === 'RENTAL_DEPOSIT';
    return true;
  });

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-xs transition-all hover:bg-slate-50 hover:text-amber-600 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/80 dark:hover:text-amber-400"
        title="Rental Dues & Reminder Notifications"
        aria-label="Rental Dues & Reminder Notifications"
      >
        <Bell className="h-4 w-4" />

        {/* Badge Indicator */}
        {(totalCount > 0 || depositNoticePendingCount > 0) && (
          <span
            className={`absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-extrabold text-white shadow-xs ${
              overdueCount > 0
                ? 'bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse'
                : depositNoticePendingCount > 0
                ? 'bg-indigo-500 ring-2 ring-white dark:ring-slate-900 animate-pulse'
                : 'bg-amber-500 ring-2 ring-white dark:ring-slate-900'
            }`}
          >
            {(totalCount + depositNoticePendingCount) > 99 ? '99+' : totalCount + depositNoticePendingCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[380px] sm:w-[440px] origin-top-right rounded-2xl border border-slate-200/90 bg-white shadow-2xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 transition-all z-50 overflow-hidden">
          {/* Header */}
          <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Rental &amp; EMI Dues Hub
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Active Rentals &amp; EMI Installment Notifications
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={fetchDuesSummary}
                  disabled={isLoading}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                  title="Refresh dues"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-amber-500' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                  title="Close"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            {summary && totalCount > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-rose-200/60 bg-rose-50/70 p-2.5 dark:border-rose-950 dark:bg-rose-950/30">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-700 dark:text-rose-400">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Overdue Dues</span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-sm font-black text-rose-900 dark:text-rose-200">
                      {formatCurrency(summary.totalOverdueAmount)}
                    </span>
                    <span className="rounded-md bg-rose-200/60 px-1.5 py-0.5 text-[10px] font-bold text-rose-800 dark:bg-rose-900 dark:text-rose-300">
                      {summary.overdueCount} rentals
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200/60 bg-amber-50/70 p-2.5 dark:border-amber-950 dark:bg-amber-950/30">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                    <Clock className="h-3 w-3" />
                    <span>Total Pending</span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-sm font-black text-amber-900 dark:text-amber-200">
                      {formatCurrency(summary.totalPendingAmount)}
                    </span>
                    <span className="rounded-md bg-amber-200/60 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                      {summary.totalRentalsWithDues} total
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Bulk Dispatch Feedback */}
            {bulkFeedback && (
              <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>{bulkFeedback}</span>
              </div>
            )}

            {/* Filter Tabs & Bulk Action */}
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-1 rounded-lg bg-slate-200/60 p-0.5 dark:bg-slate-800 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveFilter('ALL')}
                  className={`rounded-md px-2 py-1 transition-all ${
                    activeFilter === 'ALL'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  All ({totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('OVERDUE')}
                  className={`rounded-md px-2 py-1 transition-all ${
                    activeFilter === 'OVERDUE'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400'
                  }`}
                >
                  Overdue ({overdueCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('UPCOMING')}
                  className={`rounded-md px-2 py-1 transition-all ${
                    activeFilter === 'UPCOMING'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400'
                  }`}
                >
                  Due Soon ({summary?.dueSoonCount || 0})
                </button>
                {depositNoticePendingCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveFilter('DEPOSIT')}
                    className={`rounded-md px-2 py-1 transition-all flex items-center gap-1 ${
                      activeFilter === 'DEPOSIT'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400'
                    }`}
                  >
                    <Shield className="h-2.5 w-2.5" />
                    Deposit ({depositNoticePendingCount})
                  </button>
                )}
              </div>

              {overdueCount > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSendBulk}
                  disabled={isSendingBulk}
                  className="h-7 text-[11px] font-bold text-rose-700 border-rose-300 hover:bg-rose-50 dark:text-rose-400 dark:border-rose-800 dark:hover:bg-rose-950/40 gap-1 px-2.5"
                  title="Send reminder email to all overdue customers"
                >
                  <Send className={`h-3 w-3 ${isSendingBulk ? 'animate-spin' : ''}`} />
                  <span>Remind All Overdue</span>
                </Button>
              )}
            </div>
          </div>

          {/* List of Items */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {isLoading && allItems.length === 0 ? (
              <div className="flex h-36 items-center justify-center gap-2 text-xs text-slate-500">
                <RefreshCw className="h-4 w-4 animate-spin text-amber-500" />
                <span>Scanning rental ledgers...</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  All Rental Dues Clear!
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {activeFilter === 'OVERDUE'
                    ? 'No rentals are currently overdue.'
                    : 'All customer rent schedules are up to date with zero outstanding dues.'}
                </p>
              </div>
            ) : (
              filteredItems.map((item) => {
                // ── Deposit-mode rental: show per-deduction "Send Notice Email" buttons ──
                if (item.loanType === 'RENTAL_DEPOSIT') {
                  const pending = item.pendingNoticeDeductions || [];
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 border-l-2 border-indigo-400 dark:border-indigo-600 transition-colors hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20"
                    >
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                              {item.assignedPerson}
                            </span>
                            <span className="rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-400/30 flex items-center gap-1">
                              <Shield className="h-2.5 w-2.5" />
                              Deposit Rental
                            </span>
                            {item.depositExhausted && (
                              <span className="rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                                Deposit Exhausted
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                            <span className="truncate font-medium">{item.productName}</span>
                            <span className="text-slate-400">&bull;</span>
                            <span className="font-mono text-[11px] text-slate-500">{item.issueReference}</span>
                          </div>

                          <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                            {item.customerEmail ? (
                              <span className="flex items-center gap-1 text-indigo-700 dark:text-indigo-400 font-medium truncate">
                                <Mail className="h-3 w-3 shrink-0" />
                                <span className="truncate">{item.customerEmail}</span>
                              </span>
                            ) : (
                              <span className="text-rose-500 font-semibold text-[10px]">No email — add email to send notices</span>
                            )}
                          </div>
                        </div>

                        {/* Deposit balance chip */}
                        <div className="shrink-0 text-right">
                          <div className={`text-sm font-black ${(item.depositBalance || 0) <= 0 ? 'text-rose-500' : 'text-indigo-600 dark:text-indigo-400'}`}>
                            {formatCurrency(item.depositBalance || 0)}
                          </div>
                          <div className="text-[10px] text-slate-400">deposit left</div>
                        </div>
                      </div>

                      {/* Per-deduction rows with Send Notice button */}
                      {pending.length === 0 ? (
                        <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3 shrink-0" />
                          All deposit deduction notices sent for this rental.
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                            {pending.length} notice{pending.length > 1 ? 's' : ''} pending — click to email customer
                          </p>
                          {pending.map((d) => {
                            const key = `${item.id}-${d._id}`;
                            const isSendingNotice = !!sendingNoticeIds[key];
                            const nFeedback = noticeFeedback[key];
                            return (
                              <div key={d._id} className="rounded-lg border border-indigo-200 dark:border-indigo-800/60 bg-white dark:bg-slate-900 p-2.5">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="font-bold text-[11px] text-slate-900 dark:text-white">
                                      {d.billingMonth}
                                    </div>
                                    <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                                      <span>Deducted: <strong className="text-indigo-500">₹{d.deductedAmount.toLocaleString()}</strong></span>
                                      <span className="text-slate-300 dark:text-slate-700">|</span>
                                      <span>Bal after: <strong className={d.depositBalanceAfter <= 0 ? 'text-rose-500' : 'text-emerald-600'}>{formatCurrency(d.depositBalanceAfter)}</strong></span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">{formatDate(d.deductedAt)}</div>
                                  </div>

                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => handleSendDepositNotice(item, d._id, d.billingMonth)}
                                    disabled={isSendingNotice || !item.customerEmail}
                                    title={!item.customerEmail ? 'No customer email on file' : `Send deposit deduction notice for ${d.billingMonth}`}
                                    className="shrink-0 h-7 text-[10px] font-bold gap-1 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
                                  >
                                    {isSendingNotice ? (
                                      <RefreshCw className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Send className="h-3 w-3" />
                                    )}
                                    <span>Send Email</span>
                                  </Button>
                                </div>

                                {/* Per-deduction feedback */}
                                {nFeedback && (
                                  <div className={`mt-1.5 flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-semibold ${nFeedback.startsWith('Failed') ? 'bg-red-500/10 text-red-600' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'}`}>
                                    {nFeedback.startsWith('Failed') ? (
                                      <AlertTriangle className="h-3 w-3 shrink-0" />
                                    ) : (
                                      <CheckCircle2 className="h-3 w-3 shrink-0" />
                                    )}
                                    {nFeedback}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                // ── Standard rental / EMI dues card ──
                const isOverdue = item.status === 'OVERDUE';
                const isSending = !!sendingIds[item.id];
                const feedback = sentFeedback[item.id];

                return (
                  <div
                    key={item.id}
                    className="p-3.5 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {/* Customer & Status Header */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                            {item.assignedPerson}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase ${
                              item.loanType === 'EMI'
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
                            }`}
                          >
                            {item.loanType === 'EMI' ? 'EMI Sale' : 'Rental'}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                              isOverdue
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {isOverdue ? `${item.daysOverdue}d Overdue` : 'Due Soon'}
                          </span>
                        </div>

                        {/* Product & Ref */}
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                          <span className="truncate font-medium">{item.productName}</span>
                          <span className="text-slate-400">&bull;</span>
                          <span className="font-mono text-[11px] text-slate-500">{item.issueReference}</span>
                        </div>

                        {/* Contact details */}
                        <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                          {item.customerEmail ? (
                            <span className="flex items-center gap-1 truncate text-amber-700 dark:text-amber-400 font-medium">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{item.customerEmail}</span>
                            </span>
                          ) : (
                            <span className="text-rose-500 font-semibold text-[10px]">
                              No email registered
                            </span>
                          )}

                          {item.assignedPersonContact && (
                            <span className="text-slate-400 truncate">
                              Ph: {item.assignedPersonContact}
                            </span>
                          )}
                        </div>

                        {/* Last Reminder note */}
                        {item.remindersSentCount > 0 && (
                          <div className="mt-1 text-[10px] text-slate-400">
                            Reminded {item.remindersSentCount}x &bull;{' '}
                            {item.lastReminderSentAt ? `Last: ${formatDate(item.lastReminderSentAt)}` : ''}
                          </div>
                        )}
                      </div>

                      {/* Right column: Due Amount & Action */}
                      <div className="flex flex-col items-end shrink-0 gap-1.5">
                        <div className="text-right">
                          <div
                            className={`text-sm font-black ${
                              isOverdue
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {formatCurrency(item.totalRentDue)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {item.billingMonth}
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant={isOverdue ? 'default' : 'outline'}
                          onClick={() => handleSendReminder(item)}
                          disabled={isSending}
                          className={`h-7 text-[11px] font-bold gap-1 px-2.5 ${
                            isOverdue
                              ? 'bg-rose-600 hover:bg-rose-700 text-white'
                              : 'text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-300 dark:border-amber-700 dark:hover:bg-amber-950/40'
                          }`}
                        >
                          {isSending ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <SendHorizontal className="h-3 w-3" />
                          )}
                          <span>Send Reminder</span>
                        </Button>
                      </div>
                    </div>

                    {/* Inline Sent Feedback */}
                    {feedback && (
                      <div className="mt-2 flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 animate-fadeIn">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>{feedback}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with link to full rentals & sales management */}
          <div className="border-t border-slate-100 bg-slate-50/60 p-2.5 flex items-center justify-between dark:border-slate-800 dark:bg-slate-800/40">
            <Link
              href="/usage"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              <span>Rental Register</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
            <Link
              href="/sales"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400"
            >
              <span>Sales &amp; EMI Ledger</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Prompt Email Modal if Customer doesn't have an email on record */}
      {promptEmailModal.isOpen && promptEmailModal.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                  <Mail className="h-4 w-4" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Send Rent Reminder Email
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPromptEmailModal({ isOpen: false, item: null, email: '', customNote: '' })}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  {promptEmailModal.item.assignedPerson}
                </div>
                <div className="text-slate-500 dark:text-slate-400">
                  {promptEmailModal.item.productName} &bull; Ref: {promptEmailModal.item.issueReference}
                </div>
                <div className="mt-1 font-extrabold text-amber-600 dark:text-amber-400">
                  Pending Due: {formatCurrency(promptEmailModal.item.totalRentDue)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Recipient Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. customer@example.com"
                  value={promptEmailModal.email}
                  onChange={(e) =>
                    setPromptEmailModal((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Custom Manager Note (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Please clear dues before Saturday practice session."
                  value={promptEmailModal.customNote}
                  onChange={(e) =>
                    setPromptEmailModal((prev) => ({ ...prev, customNote: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setPromptEmailModal({ isOpen: false, item: null, email: '', customNote: '' })
                  }
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  disabled={!promptEmailModal.email.includes('@')}
                  onClick={() =>
                    handleSendReminder(
                      promptEmailModal.item!,
                      promptEmailModal.email.trim(),
                      promptEmailModal.customNote.trim()
                    )
                  }
                  className="gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send Reminder Email</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
