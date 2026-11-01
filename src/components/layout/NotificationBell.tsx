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
  RefreshCw,
  X,
  ChevronRight,
  Send,
  SendHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [duesData, setDuesData] = useState<RentalDuesSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'OVERDUE' | 'UPCOMING'>('ALL');
  const [sendingIds, setSendingIds] = useState<Record<string, boolean>>({});
  const [sentFeedback, setSentFeedback] = useState<Record<string, string>>({});
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [bulkFeedback, setBulkFeedback] = useState('');

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
      const res = await api.get<any>('/usage/dues-summary');
      const data = res?.data || res;
      if (data && (data.items || data.summary)) {
        setDuesData(data);
      }
    } catch (err) {
      console.error('Failed to load rental dues summary:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendReminder = async (item: RentalDueItem) => {
    if (!item.customerEmail) {
      alert('No customer email address on file for this record.');
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
        recipientEmail: item.customerEmail,
      });

      const note = res.emailDispatched
        ? `Reminder sent to ${res.sentTo}!`
        : `Reminder logged for ${res.sentTo}!`;

      setSentFeedback((prev) => ({ ...prev, [item.id]: note }));

      setTimeout(() => {
        setSentFeedback((prev) => {
          const next = { ...prev };
          delete next[item.id];
          return next;
        });
      }, 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch reminder email.');
    } finally {
      setSendingIds((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const handleSendBulkOverdue = async () => {
    const overdueWithEmail = (duesData?.items || []).filter(
      (i) => i.status === 'OVERDUE' && i.customerEmail
    );
    if (overdueWithEmail.length === 0) {
      alert('No overdue accounts with email addresses to send.');
      return;
    }

    if (
      !confirm(
        `Are you sure you want to dispatch reminder emails to ${overdueWithEmail.length} overdue customer(s)?`
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

      const sentCount = (res as any)?.data?.sentCount ?? (res as any)?.sentCount ?? 0;
      setBulkFeedback(`Dispatched ${sentCount} reminder email(s)!`);
      fetchDuesSummary();
      setTimeout(() => setBulkFeedback(''), 5000);
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch bulk reminders.');
    } finally {
      setIsSendingBulk(false);
    }
  };

  const summary = duesData?.summary;
  const allItems = duesData?.items || [];
  const totalCount = allItems.length;
  const overdueCount = allItems.filter((i) => i.status === 'OVERDUE').length;
  const dueSoonCount = allItems.filter((i) => i.status !== 'OVERDUE').length;

  const filteredItems = allItems.filter((i) => {
    if (activeFilter === 'OVERDUE') return i.status === 'OVERDUE';
    if (activeFilter === 'UPCOMING') return i.status !== 'OVERDUE';
    return true;
  });

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-xs transition-all hover:bg-slate-50 hover:text-amber-600 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/80 dark:hover:text-amber-400"
        title="Dues & Reminder Notifications"
        aria-label="Dues & Reminder Notifications"
      >
        <Bell className="h-4 w-4" />

        {/* Badge Indicator — only shown if actual overdue or upcoming dues exist */}
        {totalCount > 0 && (
          <span
            className={`absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-extrabold text-white shadow-xs ${
              overdueCount > 0
                ? 'bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse'
                : 'bg-amber-500 ring-2 ring-white dark:ring-slate-900'
            }`}
          >
            {totalCount > 99 ? '99+' : totalCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[360px] sm:w-[420px] origin-top-right rounded-2xl border border-slate-200/90 bg-white shadow-2xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 transition-all z-50 overflow-hidden">
          {/* Header */}
          <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Payment Dues &amp; Reminders
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {totalCount === 0
                      ? 'All accounts are up to date'
                      : `${overdueCount} overdue • ${dueSoonCount} due soon`}
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
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-rose-200/60 bg-rose-50/70 p-2 dark:border-rose-950 dark:bg-rose-950/30">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-rose-700 dark:text-rose-400">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Overdue</span>
                  </div>
                  <div className="mt-0.5 flex items-baseline justify-between">
                    <span className="text-xs font-black text-rose-900 dark:text-rose-200">
                      {formatCurrency(summary.totalOverdueAmount)}
                    </span>
                    <span className="text-[10px] font-bold text-rose-800 dark:text-rose-300">
                      {overdueCount} account(s)
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200/60 bg-amber-50/70 p-2 dark:border-amber-950 dark:bg-amber-950/30">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                    <Clock className="h-3 w-3" />
                    <span>Total Due</span>
                  </div>
                  <div className="mt-0.5 flex items-baseline justify-between">
                    <span className="text-xs font-black text-amber-900 dark:text-amber-200">
                      {formatCurrency(summary.totalPendingAmount)}
                    </span>
                    <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300">
                      {totalCount} total
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Bulk Dispatch Feedback */}
            {bulkFeedback && (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>{bulkFeedback}</span>
              </div>
            )}

            {/* Filter Tabs & Bulk Action */}
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 rounded-lg bg-slate-200/60 p-0.5 dark:bg-slate-800 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveFilter('ALL')}
                  className={`rounded-md px-2 py-0.5 transition-all ${
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
                  className={`rounded-md px-2 py-0.5 transition-all ${
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
                  className={`rounded-md px-2 py-0.5 transition-all ${
                    activeFilter === 'UPCOMING'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400'
                  }`}
                >
                  Due Soon ({dueSoonCount})
                </button>
              </div>

              {overdueCount > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSendBulkOverdue}
                  disabled={isSendingBulk}
                  className="h-6 text-[10px] font-bold text-rose-700 border-rose-300 hover:bg-rose-50 dark:text-rose-400 dark:border-rose-800 dark:hover:bg-rose-950/40 gap-1 px-2"
                  title="Send reminder email to all overdue customers"
                >
                  <Send className={`h-2.5 w-2.5 ${isSendingBulk ? 'animate-spin' : ''}`} />
                  <span>Remind Overdue</span>
                </Button>
              )}
            </div>
          </div>

          {/* List of Notification Items — Precise & Outcome Oriented */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {isLoading && allItems.length === 0 ? (
              <div className="flex h-32 items-center justify-center gap-2 text-xs text-slate-500">
                <RefreshCw className="h-4 w-4 animate-spin text-amber-500" />
                <span>Checking payment dues...</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-7 text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  All Payments Clear!
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {activeFilter === 'OVERDUE'
                    ? 'No accounts are currently overdue.'
                    : 'No payments are overdue or due in the next 7 days. Accounts are in good standing.'}
                </p>
              </div>
            ) : (
              filteredItems.map((item) => {
                const isOverdue = item.status === 'OVERDUE';
                const isSending = !!sendingIds[item.id];
                const feedback = sentFeedback[item.id];

                return (
                  <div
                    key={`${item.loanType}-${item.id}`}
                    className="p-3.5 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 space-y-2"
                  >
                    {/* Top Row: Module Badge, Status Badge & Exact Due Amount */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            item.loanType === 'EMI'
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                              : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
                          }`}
                        >
                          {item.loanType === 'EMI' ? 'EMI Sale' : 'Rental'}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isOverdue
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {isOverdue
                            ? `🚨 ${item.daysOverdue}d Overdue`
                            : `⏳ Due Soon (${formatDate(item.nextDueDate)})`}
                        </span>
                      </div>

                      <span
                        className={`font-mono font-black text-sm ${
                          isOverdue
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {formatCurrency(item.totalRentDue)}
                      </span>
                    </div>

                    {/* Middle Row: Customer Name, Product Name & Reference */}
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                          {item.assignedPerson}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                          <span className="truncate">{item.productName}</span>
                          <span className="text-slate-400">&bull;</span>
                          <span className="font-mono text-[10px] text-slate-500">{item.issueReference}</span>
                        </div>
                      </div>
                      <div className="text-[10px] font-semibold text-slate-400 shrink-0 text-right">
                        {item.billingMonth}
                      </div>
                    </div>

                    {/* Bottom Row: Customer Contact + Primary Redirect Button */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/40">
                      <div className="text-[10px] text-slate-400 truncate">
                        {item.customerEmail ? (
                          <span className="truncate">{item.customerEmail}</span>
                        ) : item.assignedPersonContact ? (
                          <span>Ph: {item.assignedPersonContact}</span>
                        ) : (
                          <span className="italic">No email</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.customerEmail && (
                          <button
                            type="button"
                            onClick={() => handleSendReminder(item)}
                            disabled={isSending}
                            title={`Dispatch reminder email to ${item.customerEmail}`}
                            className="p-1 rounded-md border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            {isSending ? (
                              <RefreshCw className="h-3 w-3 animate-spin text-amber-500" />
                            ) : (
                              <Mail className="h-3 w-3" />
                            )}
                          </button>
                        )}

                        {/* One clear button that redirects directly to that section and opens the ledger */}
                        <Link
                          href={
                            item.loanType === 'EMI'
                              ? `/sales?emi=${encodeURIComponent(item.issueReference)}`
                              : `/usage?ledger=${encodeURIComponent(item.issueReference)}`
                          }
                          onClick={() => setIsOpen(false)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shadow-xs ${
                            isOverdue
                              ? 'bg-rose-600 hover:bg-rose-700 text-white'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          }`}
                        >
                          <span>{item.loanType === 'EMI' ? 'Open EMI Ledger' : 'Open Rental Ledger'}</span>
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>

                    {/* Inline Sent Feedback */}
                    {feedback && (
                      <div className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                        <span>{feedback}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with direct links to full registers */}
          <div className="border-t border-slate-100 bg-slate-50/60 p-2.5 flex items-center justify-between dark:border-slate-800 dark:bg-slate-800/40 text-xs">
            <Link
              href="/usage"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              <span>Rental Register</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
            <Link
              href="/sales"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-1 font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400"
            >
              <span>Sales &amp; EMI Ledger</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
