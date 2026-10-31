'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { api, getApiUrl } from '@/lib/api';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  ArrowLeft, Package, RefreshCw, Download, AlertTriangle,
  CheckCircle2, TrendingUp, Search, Wrench, Truck, BarChart2,
  IndianRupee, ChevronRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';

interface ValuationItem {
  productId: string;
  name: string;
  sku: string;
  brand: string;
  category: string;
  trackingMode: string;
  onHand: number;
  available: number;
  unitCost: number;
  unitPrice: number;
  valuationCost: number;
  potentialRetail: number;
  potentialGrossMargin: number;
}
interface ValuationTotals {
  totalOnHand: number;
  totalValuationCost: number;
  totalPotentialRetail: number;
  totalPotentialMargin: number;
}
interface DashboardKpis {
  totalUnitsOnHand: number;
  totalAvailableForSale: number;
  distinctProductCount: number;
  lowStockCount: number;
  instrumentsUnderMaintenanceCount: number;
  totalInventoryValuationAtCost: number;
  totalPotentialRetailValuation: number;
  todayReceiptsCount: number;
  serializedInUseCount: number;
}
interface Movement {
  _id: string;
  movementType: string;
  transactionRef: string;
  quantityDelta: number;
  reason: string;
  createdAt: string;
  product?: { name: string; sku: string };
  serializedItem?: { assetId: string };
  performedBy?: { name: string };
  location?: { name: string };
}

function KpiCard({ icon, label, value, sub, color = 'slate', alert = false }: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
  color?: 'green' | 'amber' | 'red' | 'indigo' | 'slate'; alert?: boolean;
}) {
  const bg: Record<string, string> = { green: 'bg-emerald-500/10 text-emerald-600', amber: 'bg-amber-500/10 text-amber-600', red: 'bg-rose-500/10 text-rose-600', indigo: 'bg-indigo-500/10 text-indigo-600', slate: 'bg-slate-100 dark:bg-slate-800 text-slate-500' };
  const val: Record<string, string> = { green: 'text-emerald-600 dark:text-emerald-400', amber: 'text-amber-600 dark:text-amber-400', red: 'text-rose-600 dark:text-rose-400', indigo: 'text-indigo-600 dark:text-indigo-400', slate: 'text-slate-900 dark:text-white' };
  return (
    <div className={`rounded-2xl border ${alert ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/10' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'} p-5`}>
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl mb-3 ${bg[color]}`}>{icon}</div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-extrabold leading-none ${val[color]}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1.5">{sub}</p>}
    </div>
  );
}

export default function InventoryReportPage() {
  const [valuation, setValuation] = useState<{ items: ValuationItem[]; totals: ValuationTotals } | null>(null);
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'value' | 'available' | 'margin'>('value');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [valRes, dashRes] = await Promise.all([
        api.get<any>('/reports/valuation'),
        api.get<any>('/reports/dashboard'),
      ]);
      const valData = valRes?.data ?? valRes;
      const dashData = dashRes?.kpis ?? dashRes;
      setValuation(valData);
      setKpis(dashData);
      setMovements((dashData?.recentMovements ?? dashRes?.recentMovements ?? []).slice(0, 20));
    } catch (err) {
      console.error('Inventory report fetch failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const categories = useMemo(() => {
    if (!valuation?.items) return [];
    const cats = Array.from(new Set(valuation.items.map(i => i.category))).sort();
    return ['ALL', ...cats];
  }, [valuation]);

  const sorted = useMemo(() => {
    if (!valuation?.items) return [];
    let items = [...valuation.items];
    const q = search.toLowerCase();
    if (q) items = items.filter(i => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q) || i.brand?.toLowerCase().includes(q));
    if (categoryFilter !== 'ALL') items = items.filter(i => i.category === categoryFilter);
    if (sortBy === 'value') items.sort((a, b) => b.valuationCost - a.valuationCost);
    else if (sortBy === 'available') items.sort((a, b) => b.available - a.available);
    else if (sortBy === 'margin') items.sort((a, b) => b.potentialGrossMargin - a.potentialGrossMargin);
    else items.sort((a, b) => a.name.localeCompare(b.name));
    return items;
  }, [valuation, search, categoryFilter, sortBy]);

  const lowStockItems = useMemo(() => (valuation?.items ?? []).filter(i => i.available <= 5 && i.available > 0).sort((a, b) => a.available - b.available), [valuation]);
  const outOfStockItems = useMemo(() => (valuation?.items ?? []).filter(i => i.available === 0), [valuation]);

  // Category breakdown for chart
  const categoryChart = useMemo(() => {
    if (!valuation?.items) return [];
    const m = new Map<string, { category: string; costValue: number; retailValue: number; units: number }>();
    for (const item of valuation.items) {
      const cat = item.category || 'Uncategorized';
      const ex = m.get(cat) || { category: cat, costValue: 0, retailValue: 0, units: 0 };
      ex.costValue += item.valuationCost;
      ex.retailValue += item.potentialRetail;
      ex.units += item.onHand;
      m.set(cat, ex);
    }
    return Array.from(m.values()).sort((a, b) => b.retailValue - a.retailValue).slice(0, 8);
  }, [valuation]);

  const t = valuation?.totals;
  const marginPct = t && t.totalPotentialRetail > 0 ? Math.round(((t.totalPotentialRetail - t.totalValuationCost) / t.totalPotentialRetail) * 100) : 0;
  const availPct = kpis && kpis.totalUnitsOnHand > 0 ? Math.round((kpis.totalAvailableForSale / kpis.totalUnitsOnHand) * 100) : 0;

  return (
    <div className="space-y-7 pb-10">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Inventory Report</h1>
            <p className="text-sm text-slate-500 mt-0.5">What we have in stock, what it's worth, and what's running low</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-amber-500' : ''}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open(getApiUrl('/reports/export/products'), '_blank')} className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
          <Link href="/intake">
            <Button size="sm" variant="default" className="gap-1.5 text-xs font-bold">
              <Truck className="h-3.5 w-3.5" /> Receive Stock
            </Button>
          </Link>
        </div>
      </div>

      {isLoading && !valuation ? (
        <div className="flex h-64 items-center justify-center gap-3 text-slate-400">
          <RefreshCw className="h-5 w-5 animate-spin text-amber-500" />
          <span className="text-sm">Loading inventory data…</span>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={<Package className="h-5 w-5" />} label="Units Ready to Sell" value={String(kpis?.totalAvailableForSale ?? 0)} sub={`${availPct}% of total stock is sellable`} color="green" />
            <KpiCard icon={<IndianRupee className="h-5 w-5" />} label="Stock Value (Cost)" value={formatCurrency(t?.totalValuationCost ?? 0)} sub={`Retail value: ${formatCurrency(t?.totalPotentialRetail ?? 0)}`} color="slate" />
            <KpiCard icon={<TrendingUp className="h-5 w-5" />} label="Potential Profit if Sold" value={formatCurrency((t?.totalPotentialRetail ?? 0) - (t?.totalValuationCost ?? 0))} sub={`${marginPct}% margin on full stock`} color="green" />
            <KpiCard icon={<AlertTriangle className="h-5 w-5" />} label="Products Running Low" value={String((kpis?.lowStockCount ?? 0))} sub={`${outOfStockItems.length} products have zero stock`} color={(kpis?.lowStockCount ?? 0) > 0 ? 'red' : 'green'} alert={(kpis?.lowStockCount ?? 0) > 5} />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={<BarChart2 className="h-5 w-5" />} label="Total Products" value={String(kpis?.distinctProductCount ?? 0)} sub="In active catalogue" color="slate" />
            <KpiCard icon={<Package className="h-5 w-5" />} label="Total Units On Hand" value={String(kpis?.totalUnitsOnHand ?? 0)} sub={`Including ${kpis?.serializedInUseCount ?? 0} out on rent/loan`} color="slate" />
            <KpiCard icon={<Wrench className="h-5 w-5" />} label="Under Repair" value={String(kpis?.instrumentsUnderMaintenanceCount ?? 0)} sub="Not available for sale or rent" color={( kpis?.instrumentsUnderMaintenanceCount ?? 0) > 0 ? 'amber' : 'slate'} />
            <KpiCard icon={<Truck className="h-5 w-5" />} label="Stock Deliveries" value={String(kpis?.todayReceiptsCount ?? 0)} sub="Received in current period" color="indigo" />
          </div>

          {/* Low stock alert */}
          {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
            <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/10 p-4 space-y-3">
              <h2 className="text-sm font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                Stock Running Low — Reorder Soon
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {[...outOfStockItems, ...lowStockItems].slice(0, 8).map(item => (
                  <div key={item.productId} className={`rounded-xl border p-3 ${item.available === 0 ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/20' : 'border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900'}`}>
                    <div className="font-bold text-xs text-slate-900 dark:text-white truncate">{item.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{item.brand} · {item.sku}</div>
                    <div className={`font-extrabold text-sm mt-1.5 ${item.available === 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                      {item.available === 0 ? '0 units — OUT OF STOCK' : `${item.available} left`}
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/intake" className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:underline">
                <Truck className="h-3.5 w-3.5" /> Go to Receive Stock <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          )}

          {/* Category chart */}
          {categoryChart.length > 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <div className="mb-4">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Stock Value by Category</h2>
                <p className="text-xs text-slate-500 mt-0.5">What each instrument category is worth at cost vs retail</p>
              </div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChart} layout="vertical" barCategoryGap="25%" barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.08} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} width={60} />
                    <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={90} />
                    <Tooltip formatter={(val: any, name: string) => [formatCurrency(Number(val)), name === 'costValue' ? 'At Cost' : 'At Retail']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend formatter={(v) => v === 'costValue' ? 'Cost Value' : 'Retail Value'} />
                    <Bar dataKey="costValue" fill="#94a3b8" radius={[0, 3, 3, 0]} />
                    <Bar dataKey="retailValue" fill="#f59e0b" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Full product list */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Full Stock List ({sorted.length} products)
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                  className="h-8 px-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300">
                  {categories.map(c => <option key={c} value={c}>{c === 'ALL' ? 'All Categories' : c}</option>)}
                </select>
                <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                  className="h-8 px-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300">
                  <option value="value">Sort: By Value</option>
                  <option value="available">Sort: By Available</option>
                  <option value="margin">Sort: By Margin</option>
                  <option value="name">Sort: By Name</option>
                </select>
                <div className="relative w-48">
                  <input type="text" placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">On Hand</th>
                    <th className="py-2.5 px-3 text-right">Available</th>
                    <th className="py-2.5 px-3 text-right">Cost / Unit</th>
                    <th className="py-2.5 px-3 text-right">Price / Unit</th>
                    <th className="py-2.5 px-3 text-right">Total at Cost</th>
                    <th className="py-2.5 px-3 text-right">Potential Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {sorted.slice(0, 50).map(item => (
                    <tr key={item.productId} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 ${item.available === 0 ? 'opacity-60' : ''}`}>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 dark:text-white">{item.name}</div>
                        <div className="text-[10px] text-slate-400">{item.brand} · {item.sku}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{item.category}</td>
                      <td className="py-2.5 px-3 text-right font-bold">{item.onHand}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`font-extrabold ${item.available === 0 ? 'text-rose-500' : item.available <= 3 ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {item.available}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-500">{formatCurrency(item.unitCost)}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-amber-500">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-700 dark:text-slate-300">{formatCurrency(item.valuationCost)}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`font-bold ${item.potentialGrossMargin > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                          {formatCurrency(item.potentialGrossMargin)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {sorted.length === 0 && (
                    <tr><td colSpan={8} className="py-10 text-center text-slate-400">No products match this filter</td></tr>
                  )}
                </tbody>
                {sorted.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40 font-bold text-xs">
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300" colSpan={2}>TOTAL ({sorted.length} products shown)</td>
                      <td className="py-3 px-3 text-right">{sorted.reduce((a, i) => a + i.onHand, 0)}</td>
                      <td className="py-3 px-3 text-right text-emerald-600">{sorted.reduce((a, i) => a + i.available, 0)}</td>
                      <td className="py-3 px-3" colSpan={2}></td>
                      <td className="py-3 px-3 text-right">{formatCurrency(sorted.reduce((a, i) => a + i.valuationCost, 0))}</td>
                      <td className="py-3 px-3 text-right text-emerald-600">{formatCurrency(sorted.reduce((a, i) => a + i.potentialGrossMargin, 0))}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            {sorted.length > 50 && <p className="text-xs text-slate-400 text-center pt-3">Showing first 50 of {sorted.length} products</p>}
          </div>
        </>
      )}
    </div>
  );
}
