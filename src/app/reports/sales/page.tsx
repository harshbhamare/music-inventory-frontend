'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { api, getApiUrl } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import {
  ArrowLeft, TrendingUp, ShoppingCart, CreditCard, Package,
  RefreshCw, Download, IndianRupee, Users, Percent, ChevronRight,
  CheckCircle2, AlertCircle, Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, AreaChart, Area, Legend,
} from 'recharts';

// ── types (matching backend PeriodicSummaryResult) ────────────────────────────
interface PeriodItem {
  periodKey: string;
  label: string;
  startDate: string;
  endDate: string;
  salesRevenue: number;
  salesCount: number;
  itemsSold: number;
  cogs: number;
  grossProfit: number;
  grossMarginPercent: number;
  receiptsCount: number;
  receiptsValue: number;
}
interface PeriodicResult {
  period: 'week' | 'month';
  kpis: {
    totalRevenue: number;
    totalSalesCount: number;
    totalUnitsSold: number;
    averageOrderValue: number;
    totalCogs: number;
    totalGrossProfit: number;
    grossMarginPercent: number;
    totalInwardPurchases: number;
    netCashFlow: number;
  };
  periods: PeriodItem[];
  topProducts: Array<{ name: string; sku: string; quantity: number; revenue: number; profit: number }>;
}
interface RecentSale {
  _id: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone?: string;
  grandTotal: number;
  paymentMethod: string;
  saleStatus: string;
  isEmi?: boolean;
  soldBy?: { name: string };
  createdAt: string;
}

// ── helpers ────────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, color = 'slate' }: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
  color?: 'green' | 'amber' | 'red' | 'indigo' | 'slate';
}) {
  const bg = { green: 'bg-emerald-500/10 text-emerald-600', amber: 'bg-amber-500/10 text-amber-600', red: 'bg-rose-500/10 text-rose-600', indigo: 'bg-indigo-500/10 text-indigo-600', slate: 'bg-slate-100 dark:bg-slate-800 text-slate-500' }[color];
  const val = { green: 'text-emerald-600 dark:text-emerald-400', amber: 'text-amber-600 dark:text-amber-400', red: 'text-rose-600 dark:text-rose-400', indigo: 'text-indigo-600 dark:text-indigo-400', slate: 'text-slate-900 dark:text-white' }[color];
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${bg}`}>{icon}</div>
      </div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-extrabold leading-none ${val}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1.5">{sub}</p>}
    </div>
  );
}

// ── page ───────────────────────────────────────────────────────────────────────
export default function SalesReportPage() {
  const [data, setData] = useState<PeriodicResult | null>(null);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [period, setPeriod] = useState<'week' | 'month'>('month');
  const [isLoading, setIsLoading] = useState(true);
  const [salesSearch, setSalesSearch] = useState('');

  useEffect(() => { fetchData(); }, [period]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [summaryRes, salesRes] = await Promise.all([
        api.get<any>(`/reports/periodic-summary?period=${period}`),
        api.get<any>('/sales'),
      ]);
      const summary = summaryRes?.data ?? summaryRes;
      setData(summary);
      setRecentSales((salesRes?.sales || []).slice(0, 50));
    } catch (err) {
      console.error('Sales report fetch failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const k = data?.kpis;

  // EMI vs Direct breakdown from recent sales
  const { emiCount, directCount, emiRevenue, directRevenue } = useMemo(() => {
    const all = recentSales;
    const emi = all.filter(s => s.isEmi);
    const direct = all.filter(s => !s.isEmi);
    return {
      emiCount: emi.length,
      directCount: direct.length,
      emiRevenue: emi.reduce((a, s) => a + s.grandTotal, 0),
      directRevenue: direct.reduce((a, s) => a + s.grandTotal, 0),
    };
  }, [recentSales]);

  const filteredSales = useMemo(() => {
    const q = salesSearch.toLowerCase();
    if (!q) return recentSales;
    return recentSales.filter(s =>
      s.customerName?.toLowerCase().includes(q) ||
      s.invoiceNumber?.toLowerCase().includes(q) ||
      s.customerPhone?.includes(q)
    );
  }, [recentSales, salesSearch]);

  const totalSalesForSplit = emiCount + directCount;
  const emiPct = totalSalesForSplit > 0 ? Math.round((emiCount / totalSalesForSplit) * 100) : 0;

  return (
    <div className="space-y-7 pb-10">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Sales Report</h1>
            <p className="text-sm text-slate-500 mt-0.5">How much we've sold, to whom, and how profitably</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 gap-0.5">
            {(['week', 'month'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${period === p ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}>
                {p === 'week' ? 'Last 8 Weeks' : 'Last 12 Months'}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-amber-500' : ''}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open(getApiUrl(`/reports/export/periodic?period=${period}`), '_blank')} className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      {isLoading && !data ? (
        <div className="flex h-64 items-center justify-center gap-3 text-slate-400">
          <RefreshCw className="h-5 w-5 animate-spin text-amber-500" />
          <span className="text-sm">Loading sales data…</span>
        </div>
      ) : (
        <>
          {/* ── KPI Row ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={<IndianRupee className="h-5 w-5" />} label="Total Revenue" value={formatCurrency(k?.totalRevenue ?? 0)} sub={`${k?.totalSalesCount ?? 0} confirmed sales`} color="green" />
            <KpiCard icon={<TrendingUp className="h-5 w-5" />} label="Gross Profit" value={formatCurrency(k?.totalGrossProfit ?? 0)} sub={`${k?.grossMarginPercent ?? 0}% profit margin`} color="green" />
            <KpiCard icon={<ShoppingCart className="h-5 w-5" />} label="Avg. Sale Value" value={formatCurrency(k?.averageOrderValue ?? 0)} sub={`${k?.totalUnitsSold ?? 0} units sold total`} color="amber" />
            <KpiCard icon={<Package className="h-5 w-5" />} label="Net Cash Position" value={formatCurrency(k?.netCashFlow ?? 0)} sub={`After ₹${((k?.totalInwardPurchases ?? 0) / 100000).toFixed(1)}L in stock purchases`} color={(k?.netCashFlow ?? 0) >= 0 ? 'green' : 'red'} />
          </div>

          {/* ── Revenue Trend Chart ── */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Revenue & Profit Trend</h2>
                <p className="text-xs text-slate-500 mt-0.5">{period === 'week' ? 'Weekly' : 'Monthly'} breakdown — revenue vs gross profit</p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.periods ?? []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.08} />
                  <XAxis dataKey="periodKey" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} width={56} />
                  <Tooltip
                    formatter={(val: any, name: string) => [formatCurrency(Number(val)), name === 'salesRevenue' ? 'Revenue' : 'Gross Profit']}
                    labelFormatter={(l: any) => l}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Legend formatter={(v) => v === 'salesRevenue' ? 'Revenue' : 'Gross Profit'} />
                  <Area type="monotone" dataKey="salesRevenue" stroke="#f59e0b" strokeWidth={2} fill="url(#revGrad)" />
                  <Area type="monotone" dataKey="grossProfit" stroke="#10b981" strokeWidth={2} fill="url(#profitGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── EMI vs Direct Split + Top Products ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* EMI vs Direct */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4">How Customers Are Paying</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-1">EMI / Instalments</p>
                  <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{emiCount}</p>
                  <p className="text-xs text-slate-500 mt-1">{formatCurrency(emiRevenue)}</p>
                  <p className="text-xs font-bold text-amber-600 mt-0.5">{emiPct}% of all sales</p>
                </div>
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-1">Direct / Full Pay</p>
                  <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{directCount}</p>
                  <p className="text-xs text-slate-500 mt-1">{formatCurrency(directRevenue)}</p>
                  <p className="text-xs font-bold text-emerald-600 mt-0.5">{100 - emiPct}% of all sales</p>
                </div>
              </div>
              {/* Split bar */}
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${emiPct}%` }} />
                <div className="h-full bg-emerald-400 flex-1 transition-all" />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>EMI {emiPct}%</span>
                <span>Direct {100 - emiPct}%</span>
              </div>
            </div>

            {/* Top Products */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Best-Selling Products</h2>
              {(data?.topProducts ?? []).length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No product sales data yet</p>
              ) : (
                <div className="space-y-2.5">
                  {(data?.topProducts ?? []).map((p, i) => (
                    <div key={p.sku} className="flex items-center gap-3">
                      <span className="text-xs font-extrabold text-slate-400 w-4 shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{p.name}</span>
                          <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0">{formatCurrency(p.revenue)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                          <div className="h-1.5 rounded-full bg-amber-400" style={{ width: `${Math.min(100, (p.revenue / Math.max(1, data?.topProducts[0]?.revenue ?? 1)) * 100)}%` }} />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">{p.quantity} units · profit {formatCurrency(p.profit)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Period Breakdown Table ── */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
              {period === 'week' ? 'Week-by-Week' : 'Month-by-Month'} Breakdown
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Period</th>
                    <th className="py-2.5 px-3 text-right">Revenue</th>
                    <th className="py-2.5 px-3 text-right">Sales</th>
                    <th className="py-2.5 px-3 text-right">Units Sold</th>
                    <th className="py-2.5 px-3 text-right">Gross Profit</th>
                    <th className="py-2.5 px-3 text-right">Margin %</th>
                    <th className="py-2.5 px-3 text-right">Stock Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {(data?.periods ?? []).map((p) => (
                    <tr key={p.periodKey} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">{p.periodKey}</div>
                        <div className="text-[10px] text-slate-400">{p.label}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.salesRevenue)}</td>
                      <td className="py-2.5 px-3 text-right">{p.salesCount}</td>
                      <td className="py-2.5 px-3 text-right">{p.itemsSold}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.grossProfit)}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`font-bold ${p.grossMarginPercent >= 20 ? 'text-emerald-600' : p.grossMarginPercent >= 10 ? 'text-amber-600' : 'text-rose-600'}`}>
                          {p.grossMarginPercent}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-500">{p.receiptsCount} receipts</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40 font-bold text-xs">
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300">TOTAL</td>
                    <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400">{formatCurrency(k?.totalRevenue ?? 0)}</td>
                    <td className="py-3 px-3 text-right">{k?.totalSalesCount ?? 0}</td>
                    <td className="py-3 px-3 text-right">{k?.totalUnitsSold ?? 0}</td>
                    <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400">{formatCurrency(k?.totalGrossProfit ?? 0)}</td>
                    <td className="py-3 px-3 text-right text-emerald-600">{k?.grossMarginPercent ?? 0}%</td>
                    <td className="py-3 px-3 text-right text-slate-500">—</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ── Recent Transactions ── */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Recent Transactions</h2>
              <div className="relative w-64">
                <input type="text" placeholder="Search customer, invoice…" value={salesSearch} onChange={e => setSalesSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
                <ShoppingCart className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Invoice</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-center">Type</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3">Staff</th>
                    <th className="py-2.5 px-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredSales.slice(0, 30).map(s => (
                    <tr key={s._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-500">{s.invoiceNumber}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 dark:text-white">{s.customerName}</div>
                        {s.customerPhone && <div className="text-[10px] text-slate-400">{s.customerPhone}</div>}
                      </td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400">{formatCurrency(s.grandTotal)}</td>
                      <td className="py-2.5 px-3 text-center">
                        {s.isEmi
                          ? <span className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">EMI</span>
                          : <span className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Direct</span>}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge variant={s.saleStatus === 'CONFIRMED' ? 'success' : 'secondary'} className="text-[10px]">{s.saleStatus}</Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{s.soldBy?.name || '—'}</td>
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{formatDate(s.createdAt)}</td>
                    </tr>
                  ))}
                  {filteredSales.length === 0 && (
                    <tr><td colSpan={7} className="py-10 text-center text-slate-400">No matching transactions</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredSales.length > 30 && <p className="text-xs text-slate-400 text-center pt-3">Showing first 30 of {filteredSales.length} results. Use search to narrow down.</p>}
          </div>
        </>
      )}
    </div>
  );
}
