'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { DashboardMetrics, RentalDuesSummary, RentalDueItem } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  TrendingUp,
  Music2,
  CreditCard,
  Package,
  AlertTriangle,
  RefreshCw,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  ShoppingCart,
  Truck,
  Wrench,
  Send,
  ChevronRight,
  IndianRupee,
  Shield,
  BarChart2,
  Users,
} from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Button } from '@/components/ui/Button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

// ─── tiny helper ────────────────────────────────────────────────────────────
function StatPill({
  label,
  value,
  color = 'slate',
}: {
  label: string;
  value: string | number;
  color?: 'green' | 'red' | 'amber' | 'indigo' | 'slate';
}) {
  const map = {
    green: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    red: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
    amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    indigo: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
    slate: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${map[color]}`}>
      {label}: <span className="font-extrabold">{value}</span>
    </span>
  );
}

// ─── main component ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [duesSummary, setDuesSummary] = useState<RentalDuesSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sentFeedback, setSentFeedback] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | '30days' | 'all'>('month');

  useEffect(() => {
    fetchAll();
  }, [dateRange]);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      let startDate: string | undefined;
      const now = new Date();
      if (dateRange === 'today') {
        const d = new Date(now); d.setHours(0, 0, 0, 0); startDate = d.toISOString();
      } else if (dateRange === 'week') {
        const d = new Date(now); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); d.setHours(0, 0, 0, 0); startDate = d.toISOString();
      } else if (dateRange === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      } else if (dateRange === '30days') {
        const d = new Date(now); d.setDate(d.getDate() - 30); startDate = d.toISOString();
      }

      const [metricsRes, duesRes] = await Promise.all([
        api.get<DashboardMetrics>(startDate ? `/reports/dashboard?startDate=${startDate}` : '/reports/dashboard'),
        api.get<{ data: RentalDuesSummary }>('/usage/dues-summary').catch(() => null),
      ]);

      setMetrics(metricsRes);
      if (duesRes?.data) setDuesSummary(duesRes.data);
    } catch (err) {
      console.error('Dashboard fetch failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const sendReminder = async (item: RentalDueItem) => {
    if (!item.customerEmail) { alert(`No email on file for ${item.assignedPerson}.`); return; }
    setSendingId(item.id);
    try {
      const res = await api.post<{ sentTo: string }>(`/usage/${item.id}/send-reminder`, { recipientEmail: item.customerEmail });
      setSentFeedback(`Reminder sent to ${res.sentTo}`);
      setTimeout(() => setSentFeedback(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to send reminder.');
    } finally {
      setSendingId(null);
    }
  };

  const k = metrics?.kpis;

  // derived helpers
  const stockHealthPct = k
    ? Math.round(((k.totalAvailableForSale ?? 0) / Math.max(1, k.totalUnitsOnHand ?? 1)) * 100)
    : 0;

  const collectionCoverage = duesSummary
    ? duesSummary.summary.totalPendingAmount > 0
      ? Math.round(
          ((duesSummary.summary.totalPendingAmount - duesSummary.summary.totalOverdueAmount) /
            Math.max(1, duesSummary.summary.totalPendingAmount)) *
            100
        )
      : 100
    : null;

  const now = new Date();
  const dateLabel = {
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    '30days': 'Last 30 Days',
    all: 'All Time',
  }[dateRange];

  if (isLoading && !metrics) {
    return (
      <div className="flex h-96 items-center justify-center gap-3 text-slate-500">
        <RefreshCw className="h-6 w-6 animate-spin text-amber-500" />
        <span className="text-sm font-medium">Loading your business overview…</span>
      </div>
    );
  }

  return (
    <div className="space-y-7">

      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo size="md" variant="badge" className="shadow-xs shrink-0" />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Business Overview
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Stereobliss · {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Date range pills */}
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 gap-0.5">
            {(['today', 'week', 'month', '30days', 'all'] as const).map((r) => (
              <button key={r} onClick={() => setDateRange(r)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  dateRange === r ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}>
                {r === 'today' ? 'Today' : r === 'week' ? 'Week' : r === 'month' ? 'Month' : r === '30days' ? '30d' : 'All'}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={fetchAll} title="Refresh data">
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-amber-500' : ''}`} />
          </Button>
        </div>
      </div>

      {/* ── Attention banner ── */}
      {((k?.pendingApprovalsCount ?? 0) > 0 || (k?.overdueUsageCount ?? 0) > 0 || (duesSummary?.summary.overdueCount ?? 0) > 0) && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />
          <div className="flex-1 min-w-0 text-sm text-rose-800 dark:text-rose-300 font-medium">
            <strong>Action needed — </strong>
            {(k?.pendingApprovalsCount ?? 0) > 0 && <span>{k!.pendingApprovalsCount} stock adjustment{k!.pendingApprovalsCount > 1 ? 's' : ''} waiting your approval. </span>}
            {(k?.overdueUsageCount ?? 0) > 0 && <span>{k!.overdueUsageCount} rental instrument{k!.overdueUsageCount > 1 ? 's' : ''} overdue for return. </span>}
            {(duesSummary?.summary.overdueCount ?? 0) > 0 && <span>{duesSummary!.summary.overdueCount} customer payment{duesSummary!.summary.overdueCount > 1 ? 's' : ''} are overdue ({formatCurrency(duesSummary!.summary.totalOverdueAmount)}). </span>}
          </div>
          <div className="flex gap-2 shrink-0">
            {(k?.overdueUsageCount ?? 0) > 0 && <Link href="/usage?status=OVERDUE"><Button size="sm" variant="default" className="text-xs gap-1 bg-rose-600 hover:bg-rose-700 text-white"><span>View Overdue</span></Button></Link>}
            {(k?.pendingApprovalsCount ?? 0) > 0 && <Link href="/returns-maintenance"><Button size="sm" variant="outline" className="text-xs border-rose-300 text-rose-700"><span>Review Approvals</span></Button></Link>}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ROW 1 — The 4 Big Numbers
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* 1. Money Made */}
        <Link href="/reports/sales" className="group">
          <div className="relative h-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:shadow-md hover:border-emerald-400 dark:hover:border-emerald-600 transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <IndianRupee className="h-5 w-5" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-300 dark:text-slate-700 group-hover:text-emerald-500 transition-colors" />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Revenue — {dateLabel}
            </p>
            <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 leading-none">
              {formatCurrency(k?.periodSalesRevenue ?? 0)}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              From <strong className="text-slate-700 dark:text-slate-300">{k?.periodSalesCount ?? 0}</strong> sale{(k?.periodSalesCount ?? 0) !== 1 ? 's' : ''}
              {(k?.periodSalesCount ?? 0) > 0 && k?.periodSalesRevenue ? (
                <span className="ml-1">· avg {formatCurrency(Math.round((k.periodSalesRevenue) / k.periodSalesCount))}/sale</span>
              ) : null}
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-500 group-hover:text-emerald-500">
              <span>See full sales report</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </Link>

        {/* 2. Money Still Coming In (EMI) */}
        <Link href="/reports/emi" className="group">
          <div className="relative h-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:shadow-md hover:border-amber-400 dark:hover:border-amber-600 transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <CreditCard className="h-5 w-5" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-300 dark:text-slate-700 group-hover:text-amber-500 transition-colors" />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              EMI Still Owed to Us
            </p>
            <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 leading-none">
              {formatCurrency(k?.totalEmiReceivables ?? 0)}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Across <strong className="text-slate-700 dark:text-slate-300">{k?.activeEmiSalesCount ?? 0}</strong> customer instalment plan{(k?.activeEmiSalesCount ?? 0) !== 1 ? 's' : ''}
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-500 group-hover:text-amber-500">
              <span>View all EMI accounts</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </Link>

        {/* 3. Rental Instruments */}
        <Link href="/reports/rentals" className="group">
          <div className="relative h-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-600 transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Music2 className="h-5 w-5" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-300 dark:text-slate-700 group-hover:text-indigo-500 transition-colors" />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Instruments Out on Rent
            </p>
            <p className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 leading-none">
              {k?.serializedInUseCount ?? 0}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {(k?.overdueUsageCount ?? 0) > 0
                ? <span className="text-rose-500 font-bold">{k!.overdueUsageCount} overdue return{k!.overdueUsageCount > 1 ? 's' : ''}</span>
                : <span className="text-emerald-600 font-semibold">All returns on schedule ✓</span>}
              {duesSummary && duesSummary.summary.totalPendingAmount > 0 && (
                <span className="block mt-0.5">Rent outstanding: <strong>{formatCurrency(duesSummary.summary.totalPendingAmount)}</strong></span>
              )}
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-500 group-hover:text-indigo-500">
              <span>See rental details</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </Link>

        {/* 4. Stock Health */}
        <Link href="/reports/inventory" className="group">
          <div className="relative h-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:shadow-md hover:border-slate-400 dark:hover:border-slate-500 transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <Package className="h-5 w-5" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-300 dark:text-slate-700 group-hover:text-slate-500 transition-colors" />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Stock Available to Sell
            </p>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-white leading-none">
              {k?.totalAvailableForSale ?? 0}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              of {k?.totalUnitsOnHand ?? 0} total units &nbsp;·&nbsp; {stockHealthPct}% ready
              {(k?.lowStockCount ?? 0) > 0 && (
                <span className="block mt-0.5 text-rose-500 font-bold">{k!.lowStockCount} product{k!.lowStockCount > 1 ? 's' : ''} running low</span>
              )}
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300">
              <span>View stock report</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </Link>
      </div>

      {/* ══════════════════════════════════════════════════
          ROW 2 — Money owed to us + Dues list
      ══════════════════════════════════════════════════ */}
      {duesSummary && duesSummary.items.length > 0 && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/10 p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Customers Who Owe Us Money
                {duesSummary.summary.overdueCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white animate-pulse">
                    {duesSummary.summary.overdueCount} overdue
                  </span>
                )}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                Total outstanding: <strong className="text-slate-900 dark:text-white">{formatCurrency(duesSummary.summary.totalPendingAmount)}</strong>
                {duesSummary.summary.totalOverdueAmount > 0 && (
                  <span> · Overdue: <strong className="text-rose-600">{formatCurrency(duesSummary.summary.totalOverdueAmount)}</strong></span>
                )}
                {sentFeedback && <span className="ml-3 text-emerald-600 font-semibold">✓ {sentFeedback}</span>}
              </p>
            </div>
            <Link href="/reports/emi">
              <Button size="sm" variant="outline" className="text-xs gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50">
                <BarChart2 className="h-3.5 w-3.5" />
                Full Dues Report
              </Button>
            </Link>
          </div>

          {/* Top 5 overdue/due items */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {duesSummary.items.slice(0, 6).map((item) => {
              const isOverdue = item.status === 'OVERDUE';
              const sending = sendingId === item.id;
              return (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xs">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">{item.assignedPerson}</span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${isOverdue ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'}`}>
                        {isOverdue ? `${item.daysOverdue}d late` : 'due soon'}
                      </span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${item.loanType === 'EMI' ? 'bg-amber-500/15 text-amber-600' : 'bg-indigo-500/15 text-indigo-600'}`}>
                        {item.loanType === 'EMI' ? 'EMI' : 'Rental'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">{item.productName}</p>
                    <p className="font-extrabold text-xs text-amber-600 dark:text-amber-400 mt-0.5">{formatCurrency(item.totalRentDue)}</p>
                  </div>
                  <Button size="sm" variant={isOverdue ? 'default' : 'outline'} disabled={sending} onClick={() => sendReminder(item)}
                    className={`h-7 text-[10px] font-bold shrink-0 gap-1 px-2.5 ${isOverdue ? 'bg-rose-600 hover:bg-rose-700 text-white' : ''}`}>
                    <Send className={`h-3 w-3 ${sending ? 'animate-spin' : ''}`} />
                    {sending ? '…' : 'Remind'}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ROW 3 — Chart + Secondary Stats
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Sales chart */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Daily Sales — Last 7 Days</h2>
              <p className="text-xs text-slate-500 mt-0.5">Revenue earned each day</p>
            </div>
            <Link href="/reports/sales" className="text-xs font-semibold text-amber-500 hover:underline flex items-center gap-1">
              Full report <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="h-56">
            {metrics?.salesTrend && metrics.salesTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.salesTrend} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="_id" tick={{ fontSize: 11 }} tickFormatter={(v) => {
                    const d = new Date(v);
                    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                  }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} width={52} />
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val)), 'Revenue']}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="revenue" fill="#f59e0b" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                No sales in the last 7 days
              </div>
            )}
          </div>
        </div>

        {/* Secondary stats column */}
        <div className="space-y-4">

          {/* Inventory value */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Stock Value</span>
              <Shield className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white">{formatCurrency(k?.totalInventoryValuationAtCost ?? 0)}</p>
            <p className="text-xs text-slate-500 mt-1">What we paid for it (cost price)</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
              Worth {formatCurrency(k?.totalPotentialRetailValuation ?? 0)} at retail
            </p>
            <div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-1.5 rounded-full bg-emerald-400" style={{ width: `${Math.min(100, stockHealthPct)}%` }} />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">{stockHealthPct}% of stock is ready to sell</p>
          </div>

          {/* Repairs / Maintenance */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Being Repaired</span>
              <Wrench className="h-4 w-4 text-amber-400" />
            </div>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white">{k?.instrumentsUnderMaintenanceCount ?? 0} <span className="text-sm font-semibold text-slate-500">instruments</span></p>
            <p className="text-xs text-slate-500 mt-1">In the workshop right now — not available for sale or rent</p>
            <Link href="/returns-maintenance" className="mt-2 text-xs font-semibold text-amber-500 hover:underline flex items-center gap-1">
              View maintenance list <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Stock received this period */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Stock Received</span>
              <Truck className="h-4 w-4 text-indigo-400" />
            </div>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white">{k?.todayReceiptsCount ?? 0} <span className="text-sm font-semibold text-slate-500">deliveries</span></p>
            <p className="text-xs text-slate-500 mt-1">Stock intake received in selected period</p>
            <Link href="/intake" className="mt-2 text-xs font-semibold text-indigo-500 hover:underline flex items-center gap-1">
              Go to stock intake <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          ROW 4 — Quick Actions
      ══════════════════════════════════════════════════ */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: '/sales', icon: <ShoppingCart className="h-5 w-5" />, label: 'Record a Sale', color: 'text-emerald-500 bg-emerald-500/10' },
            { href: '/usage', icon: <Music2 className="h-5 w-5" />, label: 'Rent an Instrument', color: 'text-indigo-500 bg-indigo-500/10' },
            { href: '/intake', icon: <Truck className="h-5 w-5" />, label: 'Receive Stock', color: 'text-amber-500 bg-amber-500/10' },
            { href: '/inventory', icon: <Package className="h-5 w-5" />, label: 'View Inventory', color: 'text-slate-500 bg-slate-100 dark:bg-slate-800' },
          ].map(({ href, icon, label, color }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 transition-all group">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color}`}>{icon}</div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white">{label}</span>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
