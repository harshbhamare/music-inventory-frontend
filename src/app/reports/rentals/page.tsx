'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { api, getApiUrl } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  ArrowLeft, Music2, RefreshCw, Download, IndianRupee,
  AlertTriangle, CheckCircle2, Clock, Search, TrendingUp,
  Shield, Activity, ChevronRight, Send,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';

// ── types matching getRentalProfitabilityReport() ─────────────────────────────
interface RentalItem {
  id: string;
  issueReference: string;
  customerName: string;
  customerContact?: string;
  customerEmail?: string;
  productName: string;
  sku: string;
  brand?: string;
  category: string;
  issueDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
  status: string;
  lockInPeriodMonths: number;
  monthlyRent: number;
  securityDeposit: number;
  totalRentPaid: number;
  totalRentDue: number;
  totalScheduledRent: number;
  netProfit: number;
  roiPercent: number;
  isCapexRecovered: boolean;
  recoveryPercent: number;
  paidMonthsCount: number;
  overdueMonthsCount: number;
  nextPaymentDue?: { billingMonth: string; dueDate: string; amountDue: number };
}
interface RentalResult {
  kpis: {
    totalRentals: number;
    activeRentals: number;
    overdueRentals: number;
    returnedRentals: number;
    totalRentalRevenueCollected: number;
    totalRentalDue: number;
    collectionRatePercent: number;
    totalSecurityDepositsHeld: number;
    activeMRR: number;
    projectedARR: number;
    netRentalProfit: number;
    portfolioRoiPercent: number;
    capitalRecoveredCount: number;
  };
  monthlyCashflow: Array<{ monthKey: string; label: string; collected: number; due: number; netProfit: number }>;
  categoryPerformance: Array<{ category: string; rentalsCount: number; totalCollected: number; netProfit: number; roiPercent: number }>;
  items: RentalItem[];
}

function KpiCard({ icon, label, value, sub, color = 'slate' }: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
  color?: 'green' | 'amber' | 'red' | 'indigo' | 'slate';
}) {
  const bg: Record<string, string> = { green: 'bg-emerald-500/10 text-emerald-600', amber: 'bg-amber-500/10 text-amber-600', red: 'bg-rose-500/10 text-rose-600', indigo: 'bg-indigo-500/10 text-indigo-600', slate: 'bg-slate-100 dark:bg-slate-800 text-slate-500' };
  const val: Record<string, string> = { green: 'text-emerald-600 dark:text-emerald-400', amber: 'text-amber-600 dark:text-amber-400', red: 'text-rose-600 dark:text-rose-400', indigo: 'text-indigo-600 dark:text-indigo-400', slate: 'text-slate-900 dark:text-white' };
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl mb-3 ${bg[color]}`}>{icon}</div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-extrabold leading-none ${val[color]}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1.5">{sub}</p>}
    </div>
  );
}

export default function RentalsReportPage() {
  const [data, setData] = useState<RentalResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'OVERDUE' | 'RETURNED'>('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<any>('/reports/rentals-profitability');
      setData(res?.data ?? res);
    } catch (err) {
      console.error('Rentals report fetch failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const k = data?.kpis;

  const filtered = useMemo(() => {
    if (!data?.items) return [];
    const q = search.toLowerCase();
    return data.items.filter(item => {
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      const matchesSearch = !q || item.customerName.toLowerCase().includes(q) || item.productName.toLowerCase().includes(q) || item.issueReference.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [data, statusFilter, search]);

  const overdueItems = useMemo(() => (data?.items ?? []).filter(i => i.status === 'ACTIVE' && i.totalRentDue > 0 && i.overdueMonthsCount > 0), [data]);

  const statusCounts = useMemo(() => {
    const items = data?.items ?? [];
    return {
      ALL: items.length,
      ACTIVE: items.filter(i => i.status === 'ACTIVE').length,
      OVERDUE: items.filter(i => i.status === 'ACTIVE' && i.overdueMonthsCount > 0).length,
      RETURNED: items.filter(i => i.status === 'RETURNED').length,
    };
  }, [data]);

  return (
    <div className="space-y-7 pb-10">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Rental Instruments Report</h1>
            <p className="text-sm text-slate-500 mt-0.5">Who has what, what they owe, and how profitable each instrument is</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-amber-500' : ''}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open(getApiUrl('/reports/export/rentals'), '_blank')} className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      {isLoading && !data ? (
        <div className="flex h-64 items-center justify-center gap-3 text-slate-400">
          <RefreshCw className="h-5 w-5 animate-spin text-amber-500" />
          <span className="text-sm">Loading rental data…</span>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={<Music2 className="h-5 w-5" />} label="Instruments Out Now" value={String(k?.activeRentals ?? 0)} sub={`${k?.overdueRentals ?? 0} have overdue payments`} color="indigo" />
            <KpiCard icon={<IndianRupee className="h-5 w-5" />} label="Monthly Rent Income" value={formatCurrency(k?.activeMRR ?? 0)} sub={`Projected yearly: ${formatCurrency(k?.projectedARR ?? 0)}`} color="green" />
            <KpiCard icon={<Shield className="h-5 w-5" />} label="Deposits We're Holding" value={formatCurrency(k?.totalSecurityDepositsHeld ?? 0)} sub="Refundable when instruments returned" color="amber" />
            <KpiCard icon={<TrendingUp className="h-5 w-5" />} label="Collection Rate" value={`${k?.collectionRatePercent ?? 0}%`} sub={`${formatCurrency(k?.totalRentalDue ?? 0)} still uncollected`} color={(k?.collectionRatePercent ?? 0) >= 80 ? 'green' : 'red'} />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={<Activity className="h-5 w-5" />} label="Total Rent Collected" value={formatCurrency(k?.totalRentalRevenueCollected ?? 0)} sub={`Net profit: ${formatCurrency(k?.netRentalProfit ?? 0)}`} color="green" />
            <KpiCard icon={<TrendingUp className="h-5 w-5" />} label="Portfolio ROI" value={`${k?.portfolioRoiPercent ?? 0}%`} sub="Return on instrument investment" color={(k?.portfolioRoiPercent ?? 0) >= 20 ? 'green' : 'amber'} />
            <KpiCard icon={<CheckCircle2 className="h-5 w-5" />} label="Instruments Paid Off" value={String(k?.capitalRecoveredCount ?? 0)} sub="Cost fully recovered through rent" color="green" />
            <KpiCard icon={<Clock className="h-5 w-5" />} label="Total Rentals Ever" value={String(k?.totalRentals ?? 0)} sub={`${k?.returnedRentals ?? 0} returned`} color="slate" />
          </div>

          {/* Overdue alerts */}
          {overdueItems.length > 0 && (
            <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/10 p-4 space-y-3">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-sm">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                {overdueItems.length} customer{overdueItems.length > 1 ? 's' : ''} with overdue rent — {formatCurrency(overdueItems.reduce((a, i) => a + i.totalRentDue, 0))} owed
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {overdueItems.map(item => (
                  <div key={item.id} className="rounded-xl border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 p-3">
                    <div className="font-bold text-xs text-slate-900 dark:text-white">{item.customerName}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 truncate">{item.productName} · {item.issueReference}</div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="font-extrabold text-xs text-rose-600 dark:text-rose-400">{formatCurrency(item.totalRentDue)} owed</span>
                      {item.customerEmail && (
                        <Link href={`/usage`} className="text-[10px] font-bold text-rose-600 hover:underline flex items-center gap-0.5">
                          <Send className="h-3 w-3" />Open Ledger
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cashflow Chart */}
          {(data?.monthlyCashflow ?? []).length > 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <div className="mb-4">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Monthly Rent Cashflow</h2>
                <p className="text-xs text-slate-500 mt-0.5">Rent collected vs outstanding each month</p>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data!.monthlyCashflow} barCategoryGap="25%" barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.08} />
                    <XAxis dataKey="monthKey" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} width={52} />
                    <Tooltip formatter={(val: any, name: string) => [formatCurrency(Number(val)), name === 'collected' ? 'Collected' : 'Outstanding']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend formatter={(v) => v === 'collected' ? 'Collected' : 'Outstanding'} />
                    <Bar dataKey="collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="due" fill="#f87171" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Category Performance */}
          {(data?.categoryPerformance ?? []).length > 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Instrument Category Performance</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-right">Rentals</th>
                      <th className="py-2.5 px-3 text-right">Rent Collected</th>
                      <th className="py-2.5 px-3 text-right">Net Profit</th>
                      <th className="py-2.5 px-3 text-right">ROI %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {data!.categoryPerformance.map(c => (
                      <tr key={c.category} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{c.category}</td>
                        <td className="py-2.5 px-3 text-right">{c.rentalsCount}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(c.totalCollected)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(c.netProfit)}</td>
                        <td className="py-2.5 px-3 text-right"><span className={`font-extrabold ${c.roiPercent >= 20 ? 'text-emerald-600' : c.roiPercent >= 10 ? 'text-amber-600' : 'text-rose-500'}`}>{c.roiPercent}%</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* All Rentals Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">All Rental Agreements</h2>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Status filter tabs */}
                <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-50 dark:bg-slate-800/60 gap-0.5">
                  {(['ALL', 'ACTIVE', 'OVERDUE', 'RETURNED'] as const).map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${statusFilter === s ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                      {s === 'ALL' ? `All (${statusCounts.ALL})` : s === 'ACTIVE' ? `Active (${statusCounts.ACTIVE})` : s === 'OVERDUE' ? `Overdue (${statusCounts.OVERDUE})` : `Returned (${statusCounts.RETURNED})`}
                    </button>
                  ))}
                </div>
                <div className="relative w-52">
                  <input type="text" placeholder="Search customer, product…" value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Ref</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Instrument</th>
                    <th className="py-2.5 px-3 text-right">Monthly Rent</th>
                    <th className="py-2.5 px-3 text-right">Collected</th>
                    <th className="py-2.5 px-3 text-right">Outstanding</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3">Next Due</th>
                    <th className="py-2.5 px-3 text-right">ROI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {filtered.map(item => {
                    const isOverdue = item.overdueMonthsCount > 0 && item.status === 'ACTIVE';
                    return (
                      <tr key={item.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 ${isOverdue ? 'bg-rose-500/5' : ''}`}>
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-500">{item.issueReference}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900 dark:text-white">{item.customerName}</div>
                          {item.customerContact && <div className="text-[10px] text-slate-400">{item.customerContact}</div>}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{item.productName}</div>
                          <div className="text-[10px] text-slate-400">{item.brand}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-amber-500">{formatCurrency(item.monthlyRent)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(item.totalRentPaid)}</td>
                        <td className="py-2.5 px-3 text-right">
                          {item.totalRentDue > 0
                            ? <span className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(item.totalRentDue)}</span>
                            : <span className="text-emerald-500 font-bold">All clear</span>}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge variant={item.status === 'RETURNED' ? 'success' : isOverdue ? 'danger' : 'secondary'} className="text-[10px]">
                            {item.status === 'RETURNED' ? 'Returned' : isOverdue ? `${item.overdueMonthsCount}mo overdue` : 'Active'}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                          {item.nextPaymentDue ? `${item.nextPaymentDue.billingMonth}` : item.status === 'RETURNED' ? '—' : 'All paid'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`font-bold ${item.roiPercent >= 20 ? 'text-emerald-600' : item.roiPercent >= 5 ? 'text-amber-600' : 'text-slate-500'}`}>
                            {item.roiPercent}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={9} className="py-10 text-center text-slate-400">No rental agreements match this filter</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
