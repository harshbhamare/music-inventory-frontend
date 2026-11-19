'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { DashboardMetrics, RentalDuesSummary } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ShoppingCart,
  TrendingUp,
  Layers,
  Package,
  Calendar,
  ChevronDown,
  RefreshCw,
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  Box,
  Music2,
  BarChart2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// ─── Period helpers ──────────────────────────────────────────────────────────
export type PeriodKey = 'today' | 'this_week' | 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'custom';

function computeDateRange(period: PeriodKey, customFrom: string, customTo: string): { startDate?: string; endDate?: string } {
  const now = new Date();
  if (period === 'today') {
    const d = new Date(now); d.setHours(0, 0, 0, 0);
    return { startDate: d.toISOString(), endDate: now.toISOString() };
  }
  if (period === 'this_week') {
    const d = new Date(now);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    d.setHours(0, 0, 0, 0);
    return { startDate: d.toISOString(), endDate: now.toISOString() };
  }
  if (period === 'this_month') {
    const d = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return { startDate: d.toISOString(), endDate: now.toISOString() };
  }
  if (period === 'last_month') {
    const s = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const e = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { startDate: s.toISOString(), endDate: e.toISOString() };
  }
  if (period === 'this_quarter') {
    const q = Math.floor(now.getMonth() / 3);
    const s = new Date(now.getFullYear(), q * 3, 1, 0, 0, 0, 0);
    return { startDate: s.toISOString(), endDate: now.toISOString() };
  }
  if (period === 'this_year') {
    const s = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    return { startDate: s.toISOString(), endDate: now.toISOString() };
  }
  if (period === 'custom' && customFrom) {
    const s = new Date(customFrom); s.setHours(0, 0, 0, 0);
    const e = customTo ? new Date(customTo) : new Date(); e.setHours(23, 59, 59, 999);
    return { startDate: s.toISOString(), endDate: e.toISOString() };
  }
  return {};
}

function periodLabel(period: PeriodKey, customFrom: string, customTo: string, repPeriod?: { current?: { label: string } }): string {
  if (repPeriod?.current?.label) return repPeriod.current.label;
  const map: Record<PeriodKey, string> = {
    today: 'Today', this_week: 'This Week', this_month: 'This Month',
    last_month: 'Last Month', this_quarter: 'This Quarter', this_year: 'This Year', custom: `${customFrom} – ${customTo}`,
  };
  return map[period] || 'This Month';
}

// ─── Tiny donut built purely with SVG (no recharts needed, avoids SSR issues) ─
function DonutChart({ pct }: { pct: number }) {
  const r = 54; const cx = 64; const cy = 64;
  const circum = 2 * Math.PI * r;
  const filled = Math.min(100, Math.max(0, pct));
  const dash = (filled / 100) * circum;
  return (
    <svg width={128} height={128} viewBox="0 0 128 128">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth={14} />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke="#22c55e" strokeWidth={14}
        strokeDasharray={`${dash} ${circum - dash}`}
        strokeLinecap="round"
        strokeDashoffset={circum / 4}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text x={cx} y={cy - 6} textAnchor="middle" fill="#f1f5f9" fontSize={18} fontWeight="800">{filled}%</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#94a3b8" fontSize={9} fontWeight="600">Collected</text>
    </svg>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [duesSummary, setDuesSummary] = useState<RentalDuesSummary | null>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Period picker
  const [activePeriod, setActivePeriod] = useState<PeriodKey>('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingFrom, setPendingFrom] = useState('');
  const [pendingTo, setPendingTo] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { fetchAll(); }, [activePeriod, customFrom, customTo]);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const { startDate, endDate } = computeDateRange(activePeriod, customFrom, customTo);
      const qs = new URLSearchParams();
      if (startDate) qs.set('startDate', startDate);
      if (endDate) qs.set('endDate', endDate);
      const qstr = qs.toString() ? `?${qs.toString()}` : '';

      const [metricsRes, duesRes, invRes] = await Promise.all([
        api.get<DashboardMetrics>(`/reports/dashboard${qstr}`),
        api.get<{ data: RentalDuesSummary }>('/usage/dues-summary').catch(() => null),
        api.get<{ items: any[] }>('/reports/valuation').catch(() => null),
      ]);

      const data = (metricsRes as any)?.data ?? metricsRes;
      setMetrics(data);
      if (duesRes?.data) setDuesSummary(duesRes.data);
      if (invRes?.items) setInventory(invRes.items.filter((p: any) => (p.available ?? p.onHand ?? 0) > 0).slice(0, 6));
      else if ((invRes as any)?.data?.items) setInventory((invRes as any).data.items.filter((p: any) => (p.available ?? p.onHand ?? 0) > 0).slice(0, 6));
    } catch (err) {
      console.error('[DASHBOARD]', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Derived values (all from verified backend fields) ─────────────────────
  const ef = metrics?.executiveFinancials;
  const ih = metrics?.inventoryHealth;
  const rp = metrics?.rentalPerformance;
  const emi = metrics?.emiOverview;
  const fh = metrics?.financialHealth;
  const alerts = metrics?.businessAlerts ?? [];
  const recentSales = metrics?.recentSales ?? [];
  const repPeriod = metrics?.reportingPeriod;

  const salesRevenue       = ef?.salesRevenue?.value ?? metrics?.kpis?.periodSalesRevenue ?? 0;
  const prevSalesRevenue   = ef?.salesRevenue?.previousValue ?? 0;
  const salesDirection     = ef?.salesRevenue?.direction ?? 'neutral';
  const salesDeltaPct      = ef?.salesRevenue?.deltaPercent ?? 0;

  const grossProfit        = ef?.grossProfit?.value ?? metrics?.kpis?.currentGrossProfit ?? 0;
  const grossMarginPct     = ef?.grossProfit?.marginPercent ?? metrics?.kpis?.currentGrossMarginPct ?? 0;

  const stockValue         = ih?.totalInventoryValuationAtCost ?? metrics?.kpis?.totalInventoryValuationAtCost ?? 0;
  const potentialRetail    = ih?.totalPotentialRetailValuation ?? metrics?.kpis?.totalPotentialRetailValuation ?? 0;
  const potentialProfit    = ih?.potentialGrossMargin ?? 0;
  const potentialMarginPct = ih?.potentialMarginPercent ?? 0;

  const totalUnits         = ih?.totalUnitsOwned ?? metrics?.kpis?.totalUnitsOnHand ?? 0;
  const availableUnits     = ih?.totalAvailableForSale ?? metrics?.kpis?.totalAvailableForSale ?? 0;
  const unitsOnEmi         = emi?.instrumentsOnEmi ?? metrics?.kpis?.activeEmiSalesCount ?? 0;

  const cashCollected      = ef?.cashCollected?.value ?? metrics?.kpis?.currentCashCollected ?? 0;
  const pendingPayments    = ef?.outstandingReceivables?.emiReceivables ?? metrics?.kpis?.totalEmiReceivables ?? 0;
  const instrumentsSold    = currentSales().reduce((s: number, sale: any) => s + (sale.lineItems?.length ?? 0), 0);

  // helper — deduplicate reference within render
  function currentSales(): any[] { return recentSales; }

  // period label for the pill
  const displayLabel = periodLabel(activePeriod, customFrom, customTo, repPeriod);

  // upcoming vs overdue from dues summary
  const upcomingItems  = (duesSummary?.items ?? []).filter((i: any) => i.status === 'UPCOMING');
  const overdueItems   = (duesSummary?.items ?? []).filter((i: any) => i.status === 'OVERDUE');
  const upcomingAmount = upcomingItems.reduce((s: number, i: any) => s + (i.totalRentDue || 0), 0);
  const overdueAmount  = overdueItems.reduce((s: number, i: any) => s + (i.totalRentDue || 0), 0);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ── Header row ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Sales Dashboard</h1>
            <p className="text-sm text-slate-400 mt-0.5">Sales, inventory, EMI collections and business performance at a glance.</p>
          </div>

          {/* Period picker pill */}
          <div className="relative" ref={pickerRef}>
            <button
              type="button"
              onClick={() => { setPendingFrom(customFrom); setPendingTo(customTo); setPickerOpen(v => !v); }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-500/40 bg-amber-500/10 text-sm font-semibold text-amber-400 hover:bg-amber-500/20 transition-colors"
            >
              <Calendar className="h-4 w-4" />
              <span>{displayLabel}</span>
              <ChevronDown className="h-4 w-4" />
            </button>

            {pickerOpen && (
              <div className="absolute right-0 top-11 z-50 w-[420px] rounded-2xl border border-slate-700 bg-[#131929] shadow-2xl p-5 flex gap-6">
                {/* Quick range */}
                <div className="flex-1 space-y-1.5">
                  <p className="text-[11px] font-bold uppercase text-slate-400 mb-2">Quick Range</p>
                  {([
                    ['today',        'Today'],
                    ['this_week',    'This Week'],
                    ['this_month',   'This Month'],
                    ['last_month',   'Last Month'],
                    ['this_quarter', 'This Quarter'],
                    ['this_year',    'This Year'],
                  ] as [PeriodKey, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => { setActivePeriod(key); setPickerOpen(false); }}
                      className={`w-full text-left text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
                        activePeriod === key && key !== 'custom'
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Custom duration */}
                <div className="flex-1 space-y-3">
                  <p className="text-[11px] font-bold uppercase text-slate-400 mb-2">Custom Duration</p>
                  <div>
                    <label className="text-[11px] text-slate-400 font-semibold block mb-1">From</label>
                    <input
                      type="date"
                      value={pendingFrom}
                      onChange={e => setPendingFrom(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 font-semibold block mb-1">To</label>
                    <input
                      type="date"
                      value={pendingTo}
                      onChange={e => setPendingTo(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setPickerOpen(false)}
                      className="flex-1 py-1.5 text-xs font-bold rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (pendingFrom) {
                          setCustomFrom(pendingFrom);
                          setCustomTo(pendingTo || pendingFrom);
                          setActivePeriod('custom');
                        }
                        setPickerOpen(false);
                      }}
                      className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── ROW 1: 4 KPI cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

          {/* Sales Revenue */}
          <div className="rounded-2xl bg-[#1a2235] border border-slate-800 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                <ShoppingCart className="h-5 w-5 text-blue-400" />
              </div>
              <span className="text-sm font-semibold text-slate-400">Sales Revenue</span>
            </div>
            <div className="text-3xl font-black text-white tracking-tight">{formatCurrency(salesRevenue)}</div>
            <div className="mt-2 flex items-center gap-1 text-xs font-semibold">
              {salesDirection === 'up' ? (
                <><ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" /><span className="text-emerald-400">{salesDeltaPct}%</span></>
              ) : salesDirection === 'down' ? (
                <><ArrowDownRight className="h-3.5 w-3.5 text-rose-400" /><span className="text-rose-400">{salesDeltaPct}%</span></>
              ) : (
                <span className="text-slate-500">—</span>
              )}
              <span className="text-slate-500">vs prev period</span>
            </div>
          </div>

          {/* Gross Profit */}
          <div className="rounded-2xl bg-[#0f2318] border border-emerald-900/60 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                <BarChart2 className="h-5 w-5 text-emerald-400" />
              </div>
              <span className="text-sm font-semibold text-slate-400">Gross Profit</span>
            </div>
            <div className={`text-3xl font-black tracking-tight ${grossProfit >= 0 ? 'text-white' : 'text-rose-400'}`}>
              {formatCurrency(grossProfit)}
            </div>
            <div className="mt-2 text-xs font-bold text-emerald-400">{grossMarginPct}% margin</div>
          </div>

          {/* Total Stock Value */}
          <div className="rounded-2xl bg-[#1f1a0e] border border-amber-900/60 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                <Layers className="h-5 w-5 text-amber-400" />
              </div>
              <span className="text-sm font-semibold text-slate-400">Total Stock Value</span>
            </div>
            <div className="text-3xl font-black text-white tracking-tight">{formatCurrency(stockValue)}</div>
            <div className="mt-2 text-xs text-slate-500 font-medium">Investment in inventory</div>
          </div>

          {/* Total Instruments */}
          <div className="rounded-2xl bg-[#180f2a] border border-purple-900/60 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                <Box className="h-5 w-5 text-purple-400" />
              </div>
              <span className="text-sm font-semibold text-slate-400">Total Instruments</span>
            </div>
            <div className="text-3xl font-black text-white tracking-tight">{totalUnits}</div>
            <div className="mt-2 flex items-center gap-2 text-xs font-semibold">
              <span className="text-emerald-400">{availableUnits} Available</span>
              {unitsOnEmi > 0 && <><span className="text-slate-600">•</span><span className="text-amber-400">{unitsOnEmi} on EMI</span></>}
            </div>
          </div>
        </div>

        {/* ── ROW 2: Inventory table + Stock Summary ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

          {/* Inventory (Available for Sale) */}
          <div className="xl:col-span-2 rounded-2xl bg-[#1a2235] border border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-amber-400" />
                <span className="font-bold text-sm text-white">Inventory (Available for Sale)</span>
              </div>
              <Link href="/inventory" className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1">
                View Stock <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800">
                    <th className="py-2.5 px-5 text-left">Instrument / Model</th>
                    <th className="py-2.5 px-3 text-left">Inv. No.</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Buying Price</th>
                    <th className="py-2.5 px-3 text-right">Selling Price</th>
                    <th className="py-2.5 px-3 text-right">Profit / Unit</th>
                    <th className="py-2.5 px-3 text-right">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {isLoading ? (
                    <tr><td colSpan={7} className="py-8 text-center text-slate-500">Loading inventory…</td></tr>
                  ) : inventory.length === 0 ? (
                    <tr><td colSpan={7} className="py-8 text-center text-slate-500">No stock available for sale</td></tr>
                  ) : (
                    inventory.map((p: any, i: number) => {
                      const buy  = p.unitCost ?? 0;
                      const sell = p.unitPrice ?? 0;
                      const profit = sell - buy;
                      const margin = sell > 0 ? ((profit / sell) * 100).toFixed(1) : '0.0';
                      const qty = p.available ?? p.onHand ?? 0;
                      return (
                        <tr key={p.productId ?? i} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-2.5">
                              <div className="h-7 w-7 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
                                <Music2 className="h-3.5 w-3.5 text-slate-400" />
                              </div>
                              <span className="font-semibold text-slate-200">{p.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono text-amber-400">{p.sku ?? '—'}</td>
                          <td className="py-3 px-3 text-center font-bold text-slate-300">{qty}</td>
                          <td className="py-3 px-3 text-right text-slate-400">{formatCurrency(buy)}</td>
                          <td className="py-3 px-3 text-right text-slate-200 font-semibold">{formatCurrency(sell)}</td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-400">{formatCurrency(profit)}</td>
                          <td className="py-3 px-3 text-right font-bold text-slate-300">{margin}%</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stock Summary */}
          <div className="rounded-2xl bg-[#1a2235] border border-slate-800 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-amber-400" />
              <span className="font-bold text-sm text-white">Stock Summary</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2.5 border-b border-slate-800">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <div className="h-6 w-6 rounded bg-amber-500/15 flex items-center justify-center">
                    <Layers className="h-3 w-3 text-amber-400" />
                  </div>
                  Purchase Value
                </div>
                <span className="font-bold text-white">{formatCurrency(stockValue)}</span>
              </div>
              <div className="flex items-center justify-between py-2.5 border-b border-slate-800">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <div className="h-6 w-6 rounded bg-blue-500/15 flex items-center justify-center">
                    <ShoppingCart className="h-3 w-3 text-blue-400" />
                  </div>
                  Potential Retail Value
                </div>
                <span className="font-bold text-white">{formatCurrency(potentialRetail)}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <div className="h-6 w-6 rounded bg-emerald-500/15 flex items-center justify-center">
                    <TrendingUp className="h-3 w-3 text-emerald-400" />
                  </div>
                  Potential Profit
                </div>
                <div className="text-right">
                  <span className="font-bold text-emerald-400">{formatCurrency(potentialProfit)}</span>
                  <span className="text-xs text-slate-500 ml-1">({potentialMarginPct}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── ROW 3: Sales Overview | EMI Overview | Right column ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

          {/* Sales Overview */}
          <div className="rounded-2xl bg-[#1a2235] border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-amber-400" />
                <span className="font-bold text-sm text-white">Sales Overview</span>
              </div>
              <Link href="/sales" className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1">
                View All Sales <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xl font-black text-white">{formatCurrency(salesRevenue)}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Sales Revenue</div>
              </div>
              <div>
                <div className="text-xl font-black text-white">{metrics?.kpis?.periodSalesCount ?? 0}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Instruments Sold</div>
              </div>
              <div>
                <div className="text-xl font-black text-white">{formatCurrency(cashCollected)}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Amount Collected</div>
              </div>
              <div>
                <div className="text-xl font-black text-rose-400">{formatCurrency(pendingPayments)}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Pending Payments</div>
              </div>
            </div>

            {/* Recent Sales mini-table */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase text-slate-500 pb-1">Recent Sales</div>
              {recentSales.length === 0 ? (
                <div className="text-xs text-slate-600 py-3 text-center">No sales in this period</div>
              ) : (
                <>
                  <div className="grid grid-cols-5 text-[10px] font-bold uppercase text-slate-600 px-1 pb-1">
                    <span>Invoice</span><span>Date</span><span className="col-span-2">Instrument</span><span className="text-right">Amount</span>
                  </div>
                  {recentSales.map((s, i) => (
                    <div key={i} className="grid grid-cols-5 items-center text-xs px-1 py-1.5 rounded-lg hover:bg-slate-800/60 transition-colors">
                      <span className="font-mono text-amber-400 truncate">{s.invoiceNumber}</span>
                      <span className="text-slate-500 text-[11px]">{formatDate(s.createdAt)}</span>
                      <span className="col-span-2 text-slate-300 truncate pr-2">{s.productName}</span>
                      <div className="text-right">
                        <div className="font-bold text-white">{formatCurrency(s.grandTotal)}</div>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
                          s.paymentStatus === 'PAID'
                            ? 'bg-emerald-900/60 text-emerald-400'
                            : 'bg-amber-900/60 text-amber-400'
                        }`}>
                          {s.paymentStatus === 'PAID' ? 'Paid' : s.paymentStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* EMI / Installment Overview */}
          <div className="rounded-2xl border-2 border-amber-500/60 bg-[#1a1a0e] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-amber-400" />
                <span className="font-bold text-sm text-white">EMI / Installment Overview</span>
              </div>
              <Link href="/sales?saleType=EMI" className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1">
                View All <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Donut + stats */}
            <div className="flex items-center gap-5">
              <div className="shrink-0">
                <DonutChart pct={emi?.collectedPercent ?? 0} />
              </div>
              <div className="flex-1 space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Layers className="h-3.5 w-3.5 text-amber-400" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-semibold">Total EMI Amount</div>
                    <div className="text-base font-black text-white">{formatCurrency(emi?.totalEmiContractValue ?? 0)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-semibold">Collected Till Now</div>
                    <div className="text-base font-black text-emerald-400">{formatCurrency(emi?.totalEmiCollected ?? 0)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-rose-500/20 flex items-center justify-center shrink-0">
                    <Clock className="h-3.5 w-3.5 text-rose-400" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-semibold">Pending Amount</div>
                    <div className="text-base font-black text-rose-400">{formatCurrency(emi?.totalEmiPending ?? 0)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { icon: <Music2 className="h-3.5 w-3.5 text-blue-400" />, label: 'Instruments on EMI', value: emi?.instrumentsOnEmi ?? 0, bg: 'bg-blue-500/10' },
                { icon: <Layers className="h-3.5 w-3.5 text-slate-400" />, label: 'Total Installments', value: emi?.totalInstallments ?? 0, bg: 'bg-slate-500/10' },
                { icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />, label: 'Paid Installments', value: emi?.paidInstallments ?? 0, bg: 'bg-emerald-500/10' },
                { icon: <Clock className="h-3.5 w-3.5 text-amber-400" />, label: 'Remaining', value: emi?.remainingInstallments ?? 0, bg: 'bg-amber-500/10' },
              ].map((s, i) => (
                <div key={i} className={`rounded-xl ${s.bg} border border-slate-700/50 p-2.5 flex items-center gap-2`}>
                  <div className="h-6 w-6 rounded bg-slate-800 flex items-center justify-center shrink-0">{s.icon}</div>
                  <div>
                    <div className="text-[10px] text-slate-500 leading-tight">{s.label}</div>
                    <div className="text-sm font-black text-white">{s.value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-500 mb-1.5">
                <span>EMI Collection Progress</span>
                <span>{formatCurrency(emi?.totalEmiCollected ?? 0)} / {formatCurrency(emi?.totalEmiContractValue ?? 0)}</span>
              </div>
              <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  style={{ width: `${Math.min(100, emi?.collectedPercent ?? 0)}%` }}
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-700"
                />
              </div>
            </div>
          </div>

          {/* Right column: Stock Summary (compact) + Installments & Dues + Alerts */}
          <div className="space-y-4">

            {/* Installments & Dues */}
            <div className="rounded-2xl bg-[#1a2235] border border-slate-800 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-amber-400" />
                <span className="font-bold text-sm text-white">Installments &amp; Dues</span>
              </div>
              <div className="space-y-2">
                {/* Upcoming */}
                <Link href="/usage" className="flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2.5 hover:bg-amber-500/20 transition-colors group">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-amber-400" />
                    <span className="text-amber-300 font-semibold">
                      Upcoming ({upcomingItems.length})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-amber-400">{formatCurrency(upcomingAmount)}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
                {/* Overdue */}
                <Link href="/usage" className="flex items-center justify-between rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2.5 hover:bg-rose-500/20 transition-colors group">
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-rose-400" />
                    <span className="text-rose-300 font-semibold">
                      Overdue ({overdueItems.length})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-rose-400">{formatCurrency(overdueAmount)}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-rose-500 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              </div>
            </div>

            {/* Alerts */}
            <div className="rounded-2xl bg-[#1a2235] border border-slate-800 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span className="font-bold text-sm text-white">Alerts</span>
                {alerts.length > 0 && (
                  <span className="ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    {alerts.length}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {alerts.length === 0 ? (
                  <div className="text-xs text-slate-600 text-center py-2">No active alerts</div>
                ) : (
                  alerts.slice(0, 4).map((alert) => (
                    <Link
                      key={alert.id}
                      href={alert.deepLink}
                      className={`flex items-start justify-between rounded-xl px-3 py-2.5 border hover:opacity-90 transition-opacity group ${
                        alert.severity === 'critical'
                          ? 'bg-rose-500/10 border-rose-500/20'
                          : alert.severity === 'high'
                            ? 'bg-amber-500/10 border-amber-500/20'
                            : 'bg-slate-500/10 border-slate-500/20'
                      }`}
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        <div className={`h-5 w-5 rounded flex items-center justify-center shrink-0 mt-0.5 ${
                          alert.severity === 'critical' ? 'bg-rose-500/20' : 'bg-amber-500/20'
                        }`}>
                          <AlertCircle className={`h-3 w-3 ${alert.severity === 'critical' ? 'text-rose-400' : 'text-amber-400'}`} />
                        </div>
                        <div className="min-w-0">
                          <div className={`text-xs font-bold truncate ${alert.severity === 'critical' ? 'text-rose-300' : 'text-amber-300'}`}>
                            {alert.title}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">{alert.message}</div>
                        </div>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-600 shrink-0 mt-1 ml-2 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Refresh button (bottom right floating) ── */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={fetchAll}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            {isLoading ? 'Refreshing…' : 'Refresh Data'}
          </button>
        </div>

      </div>
    </div>
  );
}
