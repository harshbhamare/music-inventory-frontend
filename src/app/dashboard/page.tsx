'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DashboardMetrics, StockMovement } from '@/lib/types';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Boxes,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  Wrench,
  Clock,
  TrendingUp,
  Truck,
  ShoppingCart,
  FileCheck2,
  RefreshCw,
  PlusCircle,
  Eye,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | '30days' | 'all'>('week');

  useEffect(() => {
    fetchMetrics();
  }, [dateRange]);

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      let startDate: string | undefined;

      if (dateRange === 'today') {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        startDate = d.toISOString();
      } else if (dateRange === 'week') {
        const d = new Date();
        const day = d.getDay();
        const diff = (day + 6) % 7;
        d.setDate(d.getDate() - diff);
        d.setHours(0, 0, 0, 0);
        startDate = d.toISOString();
      } else if (dateRange === 'month') {
        const d = new Date();
        const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
        startDate = startOfMonth.toISOString();
      } else if (dateRange === '30days') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        startDate = d.toISOString();
      }

      const res = await api.get<DashboardMetrics>(
        startDate ? `/reports/dashboard?startDate=${startDate}` : '/reports/dashboard'
      );
      setMetrics(res);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !metrics) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const kpis = metrics?.kpis;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Operational Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time inventory levels, academy instrument loans, and retail sales tracking.
          </p>
        </div>

        {/* Date Filter Controls & Refresh */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
            {(['today', 'week', 'month', '30days', 'all'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  dateRange === r
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {r === 'today'
                  ? 'Today'
                  : r === 'week'
                  ? 'This Week'
                  : r === 'month'
                  ? 'This Month'
                  : r === '30days'
                  ? 'Last 30 Days'
                  : 'All Time'}
              </button>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={fetchMetrics} title="Refresh">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Critical Action Banner if approvals or overdue loans exist */}
      {((kpis?.pendingApprovalsCount ?? 0) > 0 || (kpis?.overdueUsageCount ?? 0) > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-300">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-amber-500 shrink-0" />
            <div className="text-sm">
              <span className="font-bold">Attention Required:</span>{' '}
              {kpis?.pendingApprovalsCount ? (
                <span>{kpis.pendingApprovalsCount} stock adjustment(s) awaiting Superadmin approval. </span>
              ) : null}
              {kpis?.overdueUsageCount ? (
                <span>{kpis.overdueUsageCount} instrument loan(s) currently overdue.</span>
              ) : null}
            </div>
          </div>
          <div className="flex gap-2">
            {(kpis?.pendingApprovalsCount ?? 0) > 0 && (
              <a href="/returns-maintenance">
                <Button size="sm" variant="default" className="text-xs">
                  Review Adjustments
                </Button>
              </a>
            )}
            {(kpis?.overdueUsageCount ?? 0) > 0 && (
              <a href="/usage?status=OVERDUE">
                <Button size="sm" variant="outline" className="text-xs">
                  View Overdue Loans
                </Button>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Primary KPI Grid — Explicitly separated counts and valuation per spec */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* On Hand */}
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Units On Hand
            </span>
            <Boxes className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {kpis?.totalUnitsOnHand ?? 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Across {kpis?.distinctProductCount ?? 0} distinct products
            </p>
          </CardContent>
        </Card>

        {/* Available for Sale */}
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Available For Sale
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {kpis?.totalAvailableForSale ?? 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">Excludes internally issued & reserved</p>
          </CardContent>
        </Card>

        {/* In Academy Use */}
        <Card className="border-l-4 border-l-indigo-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              In Academy Use
            </span>
            <GraduationCap className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {kpis?.serializedInUseCount ?? 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Instruments deployed in classes & studios
            </p>
          </CardContent>
        </Card>

        {/* Low Stock Items */}
        <Card className="border-l-4 border-l-rose-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Low Stock Alerts
            </span>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {kpis?.lowStockCount ?? 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">Below minimum reorder threshold</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics: Sales Revenue, Valuation, Maintenance */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Sales Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Period Sales Revenue
            </span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(kpis?.periodSalesRevenue ?? 0)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {kpis?.periodSalesCount ?? 0} confirmed customer sale(s)
            </p>
          </CardContent>
        </Card>

        {/* Inventory Cost Valuation */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Inventory Valuation (At Cost)
            </span>
            <Boxes className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {formatCurrency(kpis?.totalInventoryValuationAtCost ?? 0)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Retail value: {formatCurrency(kpis?.totalPotentialRetailValuation ?? 0)}
            </p>
          </CardContent>
        </Card>

        {/* Instruments Under Maintenance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Under Repair / Setup
            </span>
            <Wrench className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {kpis?.instrumentsUnderMaintenanceCount ?? 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">Excluded from retail sale availability</p>
          </CardContent>
        </Card>

        {/* Overdue Loans */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Overdue Returns
            </span>
            <Clock className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
              {kpis?.overdueUsageCount ?? 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Of {kpis?.activeUsageCount ?? 0} active loans
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart and Recent Ledger Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Performance Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Sales Revenue Trend</span>
              <span className="text-xs font-normal text-slate-500">Last 7 Days</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              {metrics?.salesTrend && metrics.salesTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.salesTrend}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                    />
                    <Tooltip
                      formatter={(value: any) => [formatCurrency(Number(value)), 'Sales Revenue']}
                    />
                    <Bar dataKey="revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  No sales recorded in this period yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Operational Shortcuts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <a href="/sales" className="block">
              <Button variant="default" className="w-full justify-between font-bold">
                <span className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  <span>Record Customer Sale</span>
                </span>
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </a>

            <a href="/intake" className="block">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-amber-500" />
                  <span>Receive Stock Intake</span>
                </span>
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </a>

            <a href="/usage" className="block">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-indigo-500" />
                  <span>Issue Instrument for Academy</span>
                </span>
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </a>

            <a href="/inventory" className="block">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-emerald-500" />
                  <span>Browse Product Catalogue</span>
                </span>
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </a>

            <a href="/reports" className="block">
              <Button variant="secondary" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                  <span>Audit & Reconciliation</span>
                </span>
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>

      {/* Recent Stock Movement Ledger Audit Trail */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Stock Movements</CardTitle>
          <a href="/movements" className="text-xs font-semibold text-amber-500 hover:underline">
            View Complete Ledger →
          </a>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Reference</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3">Asset ID</th>
                  <th className="py-2.5 px-3">Delta</th>
                  <th className="py-2.5 px-3">Reason</th>
                  <th className="py-2.5 px-3">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {metrics?.recentMovements && metrics.recentMovements.length > 0 ? (
                  metrics.recentMovements.map((m) => (
                    <tr key={m._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        {formatDateTime(m.createdAt)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-amber-500 whitespace-nowrap">
                        {m.transactionRef}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <Badge variant="outline" className="text-[10px]">
                          {m.movementType.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 max-w-[200px] truncate text-slate-900 dark:text-slate-100">
                        {m.product?.name || 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {m.serializedItem?.assetId || '—'}
                      </td>
                      <td className="py-2.5 px-3 font-bold whitespace-nowrap">
                        <span
                          className={
                            m.quantityDelta > 0
                              ? 'text-emerald-500'
                              : m.quantityDelta < 0
                              ? 'text-rose-500'
                              : 'text-slate-400'
                          }
                        >
                          {m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 max-w-[220px] truncate">
                        {m.reason}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {m.performedBy?.name || 'System'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-500">
                      No stock movements recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
