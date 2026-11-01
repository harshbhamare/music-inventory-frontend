'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { DashboardMetrics, RentalDuesSummary, RentalDueItem, BusinessAlert } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Music2,
  CreditCard,
  Package,
  AlertTriangle,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
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
  Info,
  Calendar,
  Layers,
  HelpCircle,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

export type PeriodFilter = 'today' | 'this_week' | 'this_month' | 'last_month' | 'this_fy' | 'custom';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [duesSummary, setDuesSummary] = useState<RentalDuesSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activePeriod, setActivePeriod] = useState<PeriodFilter>('this_month');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [showCustomPicker, setShowCustomPicker] = useState<boolean>(false);
  const [infoModalMetric, setInfoModalMetric] = useState<{ title: string; definition: string; formula: string } | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [activePeriod]);

  const computeDateRange = (): { startDate?: string; endDate?: string } => {
    const now = new Date();
    if (activePeriod === 'today') {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return { startDate: d.toISOString(), endDate: now.toISOString() };
    }
    if (activePeriod === 'this_week') {
      const d = new Date(now);
      const day = d.getDay();
      const diffToMonday = (day + 6) % 7;
      d.setDate(d.getDate() - diffToMonday);
      d.setHours(0, 0, 0, 0);
      return { startDate: d.toISOString(), endDate: now.toISOString() };
    }
    if (activePeriod === 'this_month') {
      const d = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return { startDate: d.toISOString(), endDate: now.toISOString() };
    }
    if (activePeriod === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    if (activePeriod === 'this_fy') {
      // Indian Financial Year: April 1 to March 31
      const currentYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      const start = new Date(currentYear, 3, 1, 0, 0, 0, 0);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    if (activePeriod === 'custom' && customStart) {
      const s = new Date(customStart);
      s.setHours(0, 0, 0, 0);
      const e = customEnd ? new Date(customEnd) : new Date();
      e.setHours(23, 59, 59, 999);
      return { startDate: s.toISOString(), endDate: e.toISOString() };
    }
    return {};
  };

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const { startDate, endDate } = computeDateRange();
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.set('startDate', startDate);
      if (endDate) queryParams.set('endDate', endDate);

      const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';

      const [metricsRes, duesRes] = await Promise.all([
        api.get<DashboardMetrics>(`/reports/dashboard${qs}`),
        api.get<{ data: RentalDuesSummary }>('/usage/dues-summary').catch(() => null),
      ]);

      const data = (metricsRes as any)?.data !== undefined ? (metricsRes as any).data : metricsRes;
      setMetrics(data);
      if (duesRes?.data) setDuesSummary(duesRes.data);
    } catch (err) {
      console.error('[DASHBOARD_ERROR]', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyCustomRange = () => {
    if (!customStart) return;
    setActivePeriod('custom');
    fetchDashboardData();
  };

  const ef = metrics?.executiveFinancials;
  const fh = metrics?.financialHealth;
  const ih = metrics?.inventoryHealth;
  const rp = metrics?.rentalPerformance;
  const alerts = metrics?.businessAlerts || [];
  const trends = metrics?.executiveTrends?.dailyTimeline || [];
  const repPeriod = metrics?.reportingPeriod;

  // Fallback defaults if backend hasn't finished initial query
  const salesRevenueVal = ef?.salesRevenue?.value ?? metrics?.kpis?.periodSalesRevenue ?? 0;
  const cashCollectedVal = ef?.cashCollected?.value ?? metrics?.kpis?.currentCashCollected ?? salesRevenueVal;
  const grossProfitVal = ef?.grossProfit?.value ?? metrics?.kpis?.currentGrossProfit ?? 0;
  const grossMarginPct = ef?.grossProfit?.marginPercent ?? metrics?.kpis?.currentGrossMarginPct ?? (salesRevenueVal > 0 ? Number(((grossProfitVal / salesRevenueVal) * 100).toFixed(1)) : 0);
  const receivablesVal = ef?.outstandingReceivables?.value ?? metrics?.kpis?.totalOutstandingReceivables ?? 0;
  const inventoryCostVal = ef?.inventoryValuationAtCost?.value ?? metrics?.kpis?.totalInventoryValuationAtCost ?? 0;
  const netRentalProfitVal = ef?.netRentalProfit?.value ?? metrics?.kpis?.currentNetRentalProfit ?? 0;

  return (
    <div className="space-y-8 pb-12">
      {/* ── Top Executive Header ── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              CEO Executive Cockpit
            </h1>
            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-amber-500 border-amber-500/30">
              Live BI Intelligence
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            StereoBliss Retail & Instrument Fleet — Real-time performance, cash collections, inventory health & business risks.
          </p>
        </div>

        {/* ── Reporting Period Controls ── */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/80 p-1 text-xs shadow-inner">
            <button
              type="button"
              onClick={() => { setActivePeriod('today'); setShowCustomPicker(false); }}
              className={`px-3 py-1.5 font-bold rounded-lg transition-all ${activePeriod === 'today' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-white'}`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => { setActivePeriod('this_week'); setShowCustomPicker(false); }}
              className={`px-3 py-1.5 font-bold rounded-lg transition-all ${activePeriod === 'this_week' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-white'}`}
            >
              This Week
            </button>
            <button
              type="button"
              onClick={() => { setActivePeriod('this_month'); setShowCustomPicker(false); }}
              className={`px-3 py-1.5 font-bold rounded-lg transition-all ${activePeriod === 'this_month' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-white'}`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => { setActivePeriod('last_month'); setShowCustomPicker(false); }}
              className={`px-3 py-1.5 font-bold rounded-lg transition-all ${activePeriod === 'last_month' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-white'}`}
            >
              Last Month
            </button>
            <button
              type="button"
              onClick={() => { setActivePeriod('this_fy'); setShowCustomPicker(false); }}
              className={`px-3 py-1.5 font-bold rounded-lg transition-all ${activePeriod === 'this_fy' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-white'}`}
            >
              This FY
            </button>
            <button
              type="button"
              onClick={() => setShowCustomPicker(!showCustomPicker)}
              className={`px-3 py-1.5 font-bold rounded-lg transition-all ${activePeriod === 'custom' || showCustomPicker ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-white'}`}
            >
              Custom Range
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            title="Refresh Metrics"
            className="h-9 px-3 gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-amber-500' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('/api/reports/export/executive', '_blank')}
            className="h-9 px-3 gap-1.5 text-xs font-semibold border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* ── Custom Date Range Flyout ── */}
      {showCustomPicker && (
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 backdrop-blur-sm animate-in fade-in duration-200">
          <Calendar className="h-5 w-5 text-amber-500 shrink-0" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">From:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">To:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <Button size="sm" onClick={handleApplyCustomRange} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-8">
            Apply Period
          </Button>
        </div>
      )}

      {/* ── Active Period Summary Pill ── */}
      {repPeriod && (
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Selected Reporting Window:</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">{repPeriod.current.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Benchmark Comparison:</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">{repPeriod.previous.label}</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: EXECUTIVE FINANCIAL OVERVIEW (6 PRIMARY METRIC CARDS) */}
      {/* ========================================================================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <IndianRupee className="h-4 w-4 text-amber-500" />
            <span>Executive Financial Overview</span>
          </h2>
          <span className="text-xs text-slate-500">Updated from verified database records</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* 1. SALES REVENUE */}
          <Card className="relative overflow-hidden border-t-4 border-t-amber-500 bg-gradient-to-b from-amber-500/[0.04] to-transparent shadow-sm">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sales Revenue</span>
                <button
                  type="button"
                  onClick={() =>
                    setInfoModalMetric({
                      title: 'Sales Revenue',
                      definition: 'Recognized net revenue from confirmed sales transactions, strictly excluding cancelled orders and customer returns.',
                      formula: '∑ grandTotal (Confirmed Sales in Selected Period)',
                    })
                  }
                  className="text-slate-400 hover:text-amber-500 transition-colors"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {formatCurrency(salesRevenueVal)}
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-slate-500">vs prev period</span>
                {ef?.salesRevenue?.direction === 'up' ? (
                  <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-bold">
                    <ArrowUpRight className="h-3.5 w-3.5" />+{ef.salesRevenue.deltaPercent}%
                  </span>
                ) : ef?.salesRevenue?.direction === 'down' ? (
                  <span className="inline-flex items-center gap-0.5 text-rose-600 dark:text-rose-400 font-bold">
                    <ArrowDownRight className="h-3.5 w-3.5" />-{ef.salesRevenue.deltaPercent}%
                  </span>
                ) : (
                  <span className="text-slate-400 font-medium">0.0%</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 2. CASH COLLECTED */}
          <Card className="relative overflow-hidden border-t-4 border-t-emerald-500 bg-gradient-to-b from-emerald-500/[0.04] to-transparent shadow-sm">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Cash Collected</span>
                <button
                  type="button"
                  onClick={() =>
                    setInfoModalMetric({
                      title: 'Cash Collected',
                      definition: 'Actual liquid funds received during the period across direct POS payments, EMI down payments/installments, and monthly rental payments.',
                      formula: 'Direct POS Cash + EMI Down Payments + EMI Installments Paid + Rental Payments Collected',
                    })
                  }
                  className="text-slate-400 hover:text-emerald-500 transition-colors"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="text-2xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                {formatCurrency(cashCollectedVal)}
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-slate-500">Realized Collections</span>
                {ef?.cashCollected?.direction === 'up' ? (
                  <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-bold">
                    <ArrowUpRight className="h-3.5 w-3.5" />+{ef.cashCollected.deltaPercent}%
                  </span>
                ) : (
                  <span className="text-slate-400 font-medium">Verified Inflow</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 3. GROSS PROFIT */}
          <Card className="relative overflow-hidden border-t-4 border-t-indigo-500 bg-gradient-to-b from-indigo-500/[0.04] to-transparent shadow-sm">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Gross Profit</span>
                <button
                  type="button"
                  onClick={() =>
                    setInfoModalMetric({
                      title: 'Gross Profit',
                      definition: 'Recognized Sales Revenue minus direct Cost of Goods Sold (COGS) based on inventory purchase cost.',
                      formula: 'Sales Revenue - COGS (Purchase Cost of Items Sold)',
                    })
                  }
                  className="text-slate-400 hover:text-indigo-500 transition-colors"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="text-2xl font-extrabold tracking-tight text-indigo-600 dark:text-indigo-400">
                {formatCurrency(grossProfitVal)}
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-slate-500">Gross Margin</span>
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                  {grossMarginPct}%
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 4. OUTSTANDING RECEIVABLES */}
          <Card className="relative overflow-hidden border-t-4 border-t-rose-500 bg-gradient-to-b from-rose-500/[0.04] to-transparent shadow-sm">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Receivables</span>
                <button
                  type="button"
                  onClick={() =>
                    setInfoModalMetric({
                      title: 'Outstanding Receivables',
                      definition: 'Total outstanding credit balances owed by customers, including pending EMI installments and unpaid rental dues.',
                      formula: 'Total EMI Receivables + Total Unpaid Rental Monthly Dues',
                    })
                  }
                  className="text-slate-400 hover:text-rose-500 transition-colors"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="text-2xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400">
                {formatCurrency(receivablesVal)}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                <span>EMI: {formatCurrency(ef?.outstandingReceivables?.emiReceivables ?? fh?.outstandingEmiReceivables ?? 0)}</span>
                <span>Rent: {formatCurrency(ef?.outstandingReceivables?.rentalReceivables ?? fh?.outstandingRentalReceivables ?? 0)}</span>
              </div>
            </CardContent>
          </Card>

          {/* 5. INVENTORY VALUE (PURCHASE COST) */}
          <Card className="relative overflow-hidden border-t-4 border-t-cyan-500 bg-gradient-to-b from-cyan-500/[0.04] to-transparent shadow-sm">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Inventory Value</span>
                <button
                  type="button"
                  onClick={() =>
                    setInfoModalMetric({
                      title: 'Inventory Value at Cost',
                      definition: 'Current asset valuation of all physical products and rental assets owned by the business at purchase cost.',
                      formula: '∑ (Units On Hand × Purchase Cost)',
                    })
                  }
                  className="text-slate-400 hover:text-cyan-500 transition-colors"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="text-2xl font-extrabold tracking-tight text-cyan-600 dark:text-cyan-400">
                {formatCurrency(inventoryCostVal)}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                <span>Owned: {ih?.totalUnitsOwned ?? metrics?.kpis?.totalUnitsOnHand ?? 0} units</span>
                <span className="text-slate-700 dark:text-slate-300 font-semibold">Retail: {formatCurrency(ih?.totalPotentialRetailValuation ?? 0)}</span>
              </div>
            </CardContent>
          </Card>

          {/* 6. NET RENTAL PROFIT */}
          <Card className="relative overflow-hidden border-t-4 border-t-purple-500 bg-gradient-to-b from-purple-500/[0.04] to-transparent shadow-sm">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Net Rental Profit</span>
                <button
                  type="button"
                  onClick={() =>
                    setInfoModalMetric({
                      title: 'Net Rental Profit (Operational)',
                      definition: 'Rental revenue collected during the selected period minus attributable routine maintenance and servicing expenses.',
                      formula: 'Rental Revenue Collected - Incurred Maintenance Expenses',
                    })
                  }
                  className="text-slate-400 hover:text-purple-500 transition-colors"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="text-2xl font-extrabold tracking-tight text-purple-600 dark:text-purple-400">
                {formatCurrency(netRentalProfitVal)}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                <span>Recovery:</span>
                <span className="font-extrabold text-purple-600 dark:text-purple-400">
                  {rp?.fleetCapexRecoveryPercent ?? 0}% Recouped
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2: PRIORITIZED BUSINESS ALERTS ("NEEDS ATTENTION") */}
      {/* ========================================================================= */}
      {alerts.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-rose-500 animate-pulse" />
              <span>Needs Attention — Critical Risk & Action Register</span>
            </h2>
            <Badge variant="danger" className="text-xs font-bold">
              {alerts.length} Action Items
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {alerts.map((alert) => {
              const borderMap = {
                critical: 'border-l-rose-500 bg-rose-500/[0.03]',
                high: 'border-l-amber-500 bg-amber-500/[0.03]',
                medium: 'border-l-amber-400 bg-amber-400/[0.02]',
                low: 'border-l-blue-400 bg-blue-400/[0.02]',
              };
              const badgeVariant = alert.severity === 'critical' ? 'danger' : alert.severity === 'high' ? 'warning' : 'secondary';

              return (
                <Card key={alert.id} className={`border-l-4 ${borderMap[alert.severity]} p-3.5 flex flex-col justify-between shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all`}>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <AlertCircle className={`h-4 w-4 ${alert.severity === 'critical' ? 'text-rose-500' : 'text-amber-500'}`} />
                        <span>{alert.title}</span>
                      </span>
                      <Badge variant={badgeVariant as any} className="text-[10px] uppercase font-bold py-0 px-2">
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {alert.message}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    {alert.financialExposure > 0 ? (
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        Exposure: {formatCurrency(alert.financialExposure)}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px] font-medium">Impact: Operational</span>
                    )}

                    <Link href={alert.deepLink}>
                      <Button size="sm" variant="outline" className="h-7 text-xs px-2.5 gap-1 font-semibold hover:border-amber-500 hover:text-amber-500">
                        <span>{alert.actionText}</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: FINANCIAL HEALTH & NET CASH MOVEMENT */}
      {/* ========================================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span>Financial Health & Net Period Cash Movement</span>
            </CardTitle>
            <span className="text-xs text-slate-500 font-medium">Period liquid cash reconciliation</span>
          </CardHeader>
          <CardContent className="p-5 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">Total Inflows</span>
                <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-1">
                  {formatCurrency(fh?.cashInflows ?? cashCollectedVal)}
                </div>
                <div className="text-[11px] text-emerald-800 dark:text-emerald-400/80 mt-1">
                  POS Sales + EMI + Rental collections
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <span className="text-xs text-rose-700 dark:text-rose-400 font-semibold">Total Outflows</span>
                <div className="text-xl font-extrabold text-rose-700 dark:text-rose-300 mt-1">
                  {formatCurrency(fh?.cashOutflows ?? 0)}
                </div>
                <div className="text-[11px] text-rose-800 dark:text-rose-400/80 mt-1">
                  Inward stock receipts + servicing repairs
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold">Net Cash Movement</span>
                <div className={`text-xl font-extrabold mt-1 ${(fh?.netCashMovement ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {formatCurrency(fh?.netCashMovement ?? 0)}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Net period liquid surplus / deficit
                </div>
              </div>
            </div>

            {/* Obligations & Customer Trust Liabilities */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-amber-500" />
                  <span>Customer Trust Liabilities & Pending Obligations</span>
                </span>
                <span className="text-[11px] font-normal text-slate-500">Separated from Revenue by Accounting Standard</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="flex justify-between items-center p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">Customer Security Deposits Held</div>
                    <div className="text-[10px] text-slate-500">Refundable trust liability for active rentals</div>
                  </div>
                  <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400">
                    {formatCurrency(fh?.customerDepositsHeld ?? rp?.totalSecurityDepositsHeld ?? 0)}
                  </span>
                </div>

                <div className="flex justify-between items-center p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">Customer Refunds Payable</div>
                    <div className="text-[10px] text-slate-500">Completed loans pending deposit disbursement</div>
                  </div>
                  <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400">
                    {formatCurrency(fh?.refundsPayable ?? rp?.pendingRefundsTotal ?? 0)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Visual 4-Part Stock Reconciliation ── */}
        <Card className="shadow-sm">
          <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Package className="h-4 w-4 text-amber-500" />
              <span>Inventory & Fleet Reconciliation</span>
            </CardTitle>
            <Badge variant="outline" className="text-[10px]">
              {ih?.totalUnitsOwned ?? 0} Units Owned
            </Badge>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-xs">
            {/* Visual segmented bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                <span>Stock Allocation</span>
                <span>{ih?.totalUnitsOwned ?? 0} Total Units</span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                <div
                  title="Available for Sale"
                  style={{ width: `${Math.round(((ih?.totalAvailableForSale ?? 0) / Math.max(1, ih?.totalUnitsOwned ?? 1)) * 100)}%` }}
                  className="bg-emerald-500 h-full transition-all"
                />
                <div
                  title="Currently on Rent"
                  style={{ width: `${Math.round(((ih?.totalUnitsInRental ?? 0) / Math.max(1, ih?.totalUnitsOwned ?? 1)) * 100)}%` }}
                  className="bg-purple-500 h-full transition-all"
                />
                <div
                  title="Under Maintenance"
                  style={{ width: `${Math.round(((ih?.totalUnitsInMaintenance ?? 0) / Math.max(1, ih?.totalUnitsOwned ?? 1)) * 100)}%` }}
                  className="bg-rose-500 h-full transition-all"
                />
              </div>
            </div>

            {/* Breakdown table */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center py-1">
                <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span>Available for Retail Sale</span>
                </span>
                <span className="font-extrabold text-slate-900 dark:text-white">{ih?.totalAvailableForSale ?? 0} pcs</span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                  <span>Currently on Rent (Active Loans)</span>
                </span>
                <span className="font-extrabold text-slate-900 dark:text-white">{ih?.totalUnitsInRental ?? 0} pcs</span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  <span>Under Maintenance (Workshop)</span>
                </span>
                <span className="font-extrabold text-slate-900 dark:text-white">{ih?.totalUnitsInMaintenance ?? 0} pcs</span>
              </div>
            </div>

            {/* Valuation & Potential Margin summary */}
            <div className="p-3 rounded-lg bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 space-y-1.5 mt-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">Potential Retail Value:</span>
                <span className="font-extrabold text-slate-900 dark:text-white">{formatCurrency(ih?.totalPotentialRetailValuation ?? 0)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">Est. Gross Margin on Stock:</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(ih?.potentialGrossMargin ?? 0)} ({ih?.potentialMarginPercent ?? 0}%)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 4: RENTAL BUSINESS PERFORMANCE & CAPITAL RECOVERY */}
      {/* ========================================================================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Music2 className="h-4 w-4 text-purple-500" />
            <span>Rental Business Performance & Fleet Capital Recovery</span>
          </h2>
          <Link href="/reports?tab=rentals">
            <Button variant="ghost" size="sm" className="h-7 text-xs text-purple-500 hover:text-purple-600 gap-1 font-semibold">
              <span>Full Rental Analysis</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-5 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-slate-500">Active Agreements</span>
                <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {rp?.activeAgreements ?? 0}
                </div>
                <span className="text-[11px] text-slate-400">{rp?.instrumentsOnRent ?? 0} instruments out</span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-slate-500">Rental Income Collected</span>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatCurrency(rp?.rentalIncomeCollected ?? 0)}
                </div>
                <span className="text-[11px] text-slate-400">All-time: {formatCurrency(rp?.allTimeRentalCollected ?? 0)}</span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-slate-500">Payments Due / Overdue</span>
                <div className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-1">
                  {formatCurrency(rp?.totalRentalDue ?? 0)}
                </div>
                <span className="text-[11px] text-rose-500 font-semibold">{formatCurrency(rp?.totalRentalOverdue ?? 0)} overdue</span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-slate-500">Deposits Held</span>
                <div className="text-lg font-bold text-amber-500 mt-1">
                  {formatCurrency(rp?.totalSecurityDepositsHeld ?? 0)}
                </div>
                <span className="text-[11px] text-slate-400">Trust liability</span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-slate-500">Available for Deductions</span>
                <div className="text-lg font-bold text-indigo-500 mt-1">
                  {formatCurrency(rp?.depositsAvailableForDeduction ?? 0)}
                </div>
                <span className="text-[11px] text-slate-400">Deposit-mode pools</span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-slate-500">Fleet Capex Recovery</span>
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-1">
                  {rp?.fleetCapexRecoveryPercent ?? 0}%
                </div>
                <span className="text-[11px] text-slate-400">{rp?.unrecoveredCapexCount ?? 0} unrecouped assets</span>
              </div>
            </div>

            {/* Fleet Capex Payback Progress Bar */}
            <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 dark:bg-purple-950/20 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-purple-900 dark:text-purple-300">
                  Fleet Capital Recovery Progress: {formatCurrency(rp?.allTimeNetRentalProfit ?? 0)} generated vs {formatCurrency(rp?.totalFleetCapex ?? 0)} total fleet acquisition cost
                </span>
                <span className="font-extrabold text-purple-600 dark:text-purple-400">
                  {rp?.fleetCapexRecoveryPercent ?? 0}% Recouped
                </span>
              </div>
              <div className="h-2.5 w-full bg-purple-200 dark:bg-purple-950 rounded-full overflow-hidden">
                <div
                  style={{ width: `${Math.min(100, rp?.fleetCapexRecoveryPercent ?? 0)}%` }}
                  className="bg-purple-600 h-full rounded-full transition-all duration-500"
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Break-even achieved when all-time rental revenue exceeds asset purchase capex + servicing costs.</span>
                <span>{rp?.approachingDeadlinesCount ?? 0} agreement(s) approaching return deadline</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 5: EXECUTIVE TREND VISUALIZATIONS */}
      {/* ========================================================================= */}
      {trends.length > 0 && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Sales Revenue vs Cash Collections */}
          <Card className="shadow-sm">
            <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-amber-500" />
                <span>Sales Revenue vs. Liquid Cash Collections</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                    <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="salesRevenue" name="Recognized Revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="cashCollected" name="Cash Collected" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Chart 2: Gross Profit & Rental Collections */}
          <Card className="shadow-sm">
            <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                <span>Gross Profit & Monthly Rental Cash Generation</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                    <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="grossProfit" name="Gross Profit" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="rentalCollections" name="Rental Cash" stroke="#a855f7" strokeWidth={2.5} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* ── Metric Definition Info Modal ── */}
      {infoModalMetric && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-amber-500" />
                <span>{infoModalMetric.title}</span>
              </h3>
              <button
                type="button"
                onClick={() => setInfoModalMetric(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-slate-500">Definition:</span>
                <p className="text-slate-800 dark:text-slate-200 mt-0.5 leading-relaxed font-medium">
                  {infoModalMetric.definition}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 font-mono text-[11px] text-amber-600 dark:text-amber-400 border border-slate-200 dark:border-slate-800">
                <span className="font-sans font-bold text-slate-500 block mb-1">Authoritative Formula:</span>
                {infoModalMetric.formula}
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <Button size="sm" onClick={() => setInfoModalMetric(null)} className="text-xs bg-slate-800 hover:bg-slate-700 text-white">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
