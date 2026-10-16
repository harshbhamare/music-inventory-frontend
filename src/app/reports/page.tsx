'use client';

import React, { useState, useEffect } from 'react';
import { api, getApiUrl } from '@/lib/api';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  BarChart3,
  FileSpreadsheet,
  RefreshCw,
  Mail,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Send,
  Boxes,
  TrendingUp,
  FileText,
  Calendar,
  Layers,
  ArrowUpRight,
  ShoppingCart,
  Truck,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';

interface PeriodicSummaryItem {
  periodKey: string;
  label: string;
  startDate: string;
  endDate: string;
  salesRevenue: number;
  salesCount: number;
  itemsSold: number;
  receiptsCount: number;
  receiptsValue: number;
  adjustmentsCount: number;
}

interface PeriodicSummaryResult {
  period: 'week' | 'month';
  kpis: {
    totalRevenue: number;
    totalSalesCount: number;
    totalUnitsSold: number;
    averageOrderValue: number;
    totalInwardPurchases: number;
    totalReceiptsCount: number;
  };
  periods: PeriodicSummaryItem[];
  topProducts: Array<{
    name: string;
    sku: string;
    quantity: number;
    revenue: number;
  }>;
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'summary' | 'valuation' | 'reconciliation' | 'emailReports'>('summary');
  const [summaryPeriod, setSummaryPeriod] = useState<'week' | 'month'>('week');

  // Periodic summary state
  const [periodicData, setPeriodicData] = useState<PeriodicSummaryResult | null>(null);

  // Valuation report state
  const [valuationData, setValuationData] = useState<{
    items: any[];
    totals: {
      totalOnHand: number;
      totalValuationCost: number;
      totalPotentialRetail: number;
      totalPotentialMargin: number;
    };
  } | null>(null);

  // Reconciliation report state
  const [reconciliationData, setReconciliationData] = useState<{
    timestamp: string;
    totalProductsChecked: number;
    mismatchesFound: number;
    results: any[];
  } | null>(null);

  // Email report configs & logs
  const [reportConfigs, setReportConfigs] = useState<any[]>([]);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatusMessage, setEmailStatusMessage] = useState('');

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, [activeTab, summaryPeriod]);

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'summary') {
        const res = await api.get<{ success: boolean; data: PeriodicSummaryResult }>(
          `/reports/periodic-summary?period=${summaryPeriod}`
        );
        setPeriodicData(res.data);
      } else if (activeTab === 'valuation') {
        const res = await api.get<any>('/reports/valuation');
        setValuationData(res);
      } else if (activeTab === 'reconciliation') {
        const res = await api.get<any>('/reports/reconciliation');
        setReconciliationData(res);
      } else if (activeTab === 'emailReports') {
        const [confRes, logsRes] = await Promise.all([
          api.get<{ configs: any[] }>('/meta/report-configs'),
          api.get<{ logs: any[] }>('/reports/email-logs'),
        ]);
        setReportConfigs(confRes.configs || []);
        setEmailLogs(logsRes.logs || []);
      }
    } catch (err) {
      console.error('Failed to load report data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerEmail = async (action: 'summary' | 'overdue' | 'test') => {
    setIsSendingEmail(true);
    setEmailStatusMessage('');
    try {
      if (action === 'summary') {
        await api.post('/reports/send-summary');
        setEmailStatusMessage('✅ Daily Stock Summary email report dispatched successfully.');
      } else if (action === 'overdue') {
        await api.post('/reports/send-overdue-reminders');
        setEmailStatusMessage('✅ Overdue instrument loan notice dispatched successfully.');
      } else if (action === 'test') {
        await api.post('/reports/email-test');
        setEmailStatusMessage('✅ Test email notification dispatched successfully.');
      }
      fetchReportData();
    } catch (err: any) {
      setEmailStatusMessage(`❌ Error: ${err.message || 'Failed to dispatch email'}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const exportValuationCsv = () => {
    window.open(getApiUrl('/reports/export/products'), '_blank');
  };

  const exportPeriodicCsv = () => {
    window.open(getApiUrl(`/reports/export/periodic?period=${summaryPeriod}`), '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Reporting & Analytics Center
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Weekly and monthly operational summaries, catalog valuation, and audit reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'summary' && (
            <Button
              variant="outline"
              size="sm"
              onClick={exportPeriodicCsv}
              className="gap-1.5 text-xs font-semibold"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
              <span>Export {summaryPeriod === 'week' ? 'Weekly' : 'Monthly'} CSV</span>
            </Button>
          )}

          {activeTab === 'valuation' && (
            <Button
              variant="outline"
              size="sm"
              onClick={exportValuationCsv}
              className="gap-1.5 text-xs font-semibold"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
              <span>Export Valuation CSV</span>
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={fetchReportData} title="Refresh">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'summary'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>Weekly & Monthly Summary</span>
        </button>

        <button
          onClick={() => setActiveTab('valuation')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'valuation'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Inventory Valuation</span>
        </button>

        <button
          onClick={() => setActiveTab('reconciliation')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'reconciliation'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
          <span>Ledger Reconciliation Audit</span>
        </button>

        <button
          onClick={() => setActiveTab('emailReports')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'emailReports'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Mail className="h-4 w-4" />
          <span>Automated Email Reports</span>
        </button>
      </div>

      {/* Tab 1: Periodic Weekly / Monthly Summary */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* Period Selector Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="h-4 w-4 text-amber-500" />
                <span>Aggregated Performance Overview</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Switch between weekly cadence and monthly financial summaries to track store performance and stock velocity.
              </p>
            </div>

            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950 shrink-0">
              <button
                type="button"
                onClick={() => setSummaryPeriod('week')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  summaryPeriod === 'week'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Weekly View (8 Weeks)
              </button>
              <button
                type="button"
                onClick={() => setSummaryPeriod('month')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  summaryPeriod === 'month'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Monthly View (12 Months)
              </button>
            </div>
          </div>

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-amber-500">
              <CardHeader className="pb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <ShoppingCart className="h-3.5 w-3.5 text-amber-500" />
                  <span>Total Sales Revenue</span>
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {formatCurrency(periodicData?.kpis.totalRevenue ?? 0)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Across {periodicData?.kpis.totalSalesCount ?? 0} invoices
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader className="pb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Boxes className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Total Units Sold</span>
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {periodicData?.kpis.totalUnitsSold ?? 0} units
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Avg {periodicData?.kpis.averageOrderValue ? formatCurrency(periodicData.kpis.averageOrderValue) : '₹0'} / order
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-indigo-500">
              <CardHeader className="pb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Stock Purchases Inflow</span>
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {formatCurrency(periodicData?.kpis.totalInwardPurchases ?? 0)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  From {periodicData?.kpis.totalReceiptsCount ?? 0} dock receipts
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                  <span>Net Inflow Differential</span>
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {formatCurrency((periodicData?.kpis.totalRevenue ?? 0) - (periodicData?.kpis.totalInwardPurchases ?? 0))}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Revenue minus intake expenditure
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Visual Bar Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>
                  {summaryPeriod === 'week' ? 'Weekly Sales Revenue vs Stock Inflow' : 'Monthly Sales Revenue vs Stock Inflow'}
                </span>
                <span className="text-xs font-normal text-slate-500">Values in INR (₹)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={periodicData?.periods || []} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis
                      dataKey="periodKey"
                      tick={{ fontSize: 11 }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    />
                    <Tooltip
                      formatter={(val: any) => formatCurrency(Number(val) || 0)}
                      labelFormatter={(label, items) => {
                        const item = items?.[0]?.payload;
                        return item ? `${item.label}` : label;
                      }}
                      contentStyle={{
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        background: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#fff',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar
                      dataKey="salesRevenue"
                      name="Sales Revenue"
                      fill="#f59e0b"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="receiptsValue"
                      name="Inward Stock Purchases"
                      fill="#6366f1"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Period-by-Period Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Detailed {summaryPeriod === 'week' ? 'Weekly' : 'Monthly'} Breakdown</span>
                  <Badge variant="outline" className="text-xs">
                    {periodicData?.periods.length ?? 0} periods tracked
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="responsive-table-wrapper">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-4">Period Range</th>
                        <th className="py-3 px-4 text-center">Orders</th>
                        <th className="py-3 px-4 text-right">Revenue (₹)</th>
                        <th className="py-3 px-4 text-center">Units Sold</th>
                        <th className="py-3 px-4 text-center">Receipts</th>
                        <th className="py-3 px-4 text-right">Inward Stock (₹)</th>
                        <th className="py-3 px-4 text-center">Adjustments</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                      {(periodicData?.periods || []).map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">{p.label}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {p.startDate.slice(0, 10)} to {p.endDate.slice(0, 10)}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center font-semibold text-slate-700 dark:text-slate-300">
                            {p.salesCount}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-amber-600 dark:text-amber-400">
                            {formatCurrency(p.salesRevenue)}
                          </td>
                          <td className="py-3 px-4 text-center font-medium text-slate-600 dark:text-slate-400">
                            {p.itemsSold}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400">
                            {p.receiptsCount}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-indigo-600 dark:text-indigo-400">
                            {formatCurrency(p.receiptsValue)}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-500">
                            {p.adjustmentsCount > 0 ? (
                              <Badge variant="warning" className="text-[10px]">
                                {p.adjustmentsCount}
                              </Badge>
                            ) : (
                              '0'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Top Selling Products in Period */}
            <Card>
              <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Top Selling Products</span>
                  <span className="text-xs text-slate-400">By Revenue</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {(!periodicData?.topProducts || periodicData.topProducts.length === 0) ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No sales recorded in this period timeframe.
                  </div>
                ) : (
                  periodicData.topProducts.map((tp, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                          {idx + 1}. {tp.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">SKU: {tp.sku}</div>
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          {tp.quantity} unit(s) sold
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-black text-amber-500">
                          {formatCurrency(tp.revenue)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Valuation */}
      {activeTab === 'valuation' && (
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="border-l-4 border-l-amber-500">
              <CardHeader className="pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total Valuation at Purchase Cost
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  {formatCurrency(valuationData?.totals?.totalValuationCost ?? 0)}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Total physical units: {valuationData?.totals?.totalOnHand ?? 0}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader className="pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total Potential Retail Value
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  {formatCurrency(valuationData?.totals?.totalPotentialRetail ?? 0)}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Expected revenue at default MSRP
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-indigo-500">
              <CardHeader className="pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Estimated Gross Margin
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  {formatCurrency(valuationData?.totals?.totalPotentialMargin ?? 0)}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Potential profit upon 100% sell-through
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Valuation Table */}
          <Card>
            <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base">Product-by-Product Asset Valuation</CardTitle>
                <span className="text-xs text-slate-500">
                  {valuationData?.items?.length ?? 0} products listed
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="responsive-table-wrapper">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Product / SKU</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-center">On Hand</th>
                      <th className="py-3 px-4 text-center">Available</th>
                      <th className="py-3 px-4 text-right">Unit Cost</th>
                      <th className="py-3 px-4 text-right">Selling Price</th>
                      <th className="py-3 px-4 text-right">Valuation (Cost)</th>
                      <th className="py-3 px-4 text-right">Potential Retail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {valuationData?.items?.map((item) => (
                      <tr key={item.productId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">{item.name}</div>
                          <div className="text-[11px] font-mono text-amber-500">{item.sku}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{item.category}</td>
                        <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-white">
                          {item.onHand}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={
                              item.available > 0
                                ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                                : 'text-rose-500 font-semibold'
                            }
                          >
                            {item.available}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                          {formatCurrency(item.unitCost)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                          {formatCurrency(item.valuationCost)}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-amber-500">
                          {formatCurrency(item.potentialRetail)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 3: Ledger Reconciliation Audit */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-blue-500" />
                    <span>Real-time Ledger Integrity Verification</span>
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-1">
                    Every physical change generates an immutable transaction movement in the ledger.
                    This automated audit re-calculates all movements from Genesis and validates them against current product quantities.
                  </p>
                </div>
                <Badge
                  variant={
                    reconciliationData?.mismatchesFound === 0 ? 'success' : 'danger'
                  }
                  className="font-bold text-xs"
                >
                  {reconciliationData?.mismatchesFound === 0
                    ? '100% Invariant Compliant'
                    : `${reconciliationData?.mismatchesFound} Discrepancy Found`}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
                <div>
                  <span className="text-slate-500">Last Verified:</span>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {reconciliationData?.timestamp
                      ? formatDateTime(reconciliationData.timestamp)
                      : 'Just now'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Total Products Audited:</span>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {reconciliationData?.totalProductsChecked ?? 0}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Ledger Discrepancies:</span>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400">
                    {reconciliationData?.mismatchesFound ?? 0} Mismatches
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audit Results Table */}
          <Card>
            <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base">Ledger Reconciliation Audit Log</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="responsive-table-wrapper">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Product Name</th>
                      <th className="py-3 px-4">SKU</th>
                      <th className="py-3 px-4 text-center">Recorded Balance</th>
                      <th className="py-3 px-4 text-center">Calculated from Ledger</th>
                      <th className="py-3 px-4 text-center">Variance</th>
                      <th className="py-3 px-4 text-center">Audit Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {reconciliationData?.results?.map((res, i) => (
                      <tr key={i} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {res.productName}
                        </td>
                        <td className="py-3 px-4 font-mono text-amber-500">{res.sku}</td>
                        <td className="py-3 px-4 text-center font-bold">{res.recordedOnHand}</td>
                        <td className="py-3 px-4 text-center font-bold text-indigo-500">
                          {res.calculatedOnHand}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={
                              res.variance === 0
                                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                                : 'text-rose-500 font-bold'
                            }
                          >
                            {res.variance === 0 ? '0' : res.variance}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {res.status === 'MATCH' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Verified</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-500 text-xs font-semibold">
                              <AlertTriangle className="h-4 w-4" />
                              <span>Mismatch</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 4: Automated Email Reports & Delivery */}
      {activeTab === 'emailReports' && (
        <div className="space-y-6">
          {emailStatusMessage && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs font-semibold text-amber-800 dark:text-amber-400">
              {emailStatusMessage}
            </div>
          )}

          {/* Action Trigger Card */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="h-4 w-4 text-amber-500" />
                <span>Manual Email Dispatch Triggers</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <p className="text-xs text-slate-500">
                Trigger transactional notifications immediately to verified recipient lists.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  size="sm"
                  variant="default"
                  isLoading={isSendingEmail}
                  onClick={() => handleTriggerEmail('summary')}
                  className="font-bold gap-1.5 text-xs"
                >
                  <Mail className="h-4 w-4" />
                  <span>Send Daily Stock Summary Now</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  isLoading={isSendingEmail}
                  onClick={() => handleTriggerEmail('overdue')}
                  className="gap-1.5 text-xs"
                >
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span>Send Overdue Usage Alerts</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  isLoading={isSendingEmail}
                  onClick={() => handleTriggerEmail('test')}
                  className="gap-1.5 text-xs"
                >
                  <Send className="h-4 w-4 text-indigo-500" />
                  <span>Send Config Test Email</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Automated Schedule Configs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reportConfigs.map((cfg) => (
              <Card key={cfg._id} className="border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                        {cfg.name}
                      </CardTitle>
                      <div className="text-[11px] font-mono text-amber-500 mt-0.5">
                        Cron: {cfg.cronSchedule}
                      </div>
                    </div>
                    <Badge variant={cfg.enabled ? 'success' : 'outline'} className="text-[10px]">
                      {cfg.enabled ? 'Active Schedule' : 'Paused'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400">Recipients:</span>
                    <div className="text-slate-700 dark:text-slate-300 font-medium truncate">
                      {cfg.recipients?.join(', ') || 'No recipients assigned'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Last Dispatched:</span>
                    <div className="text-slate-600 dark:text-slate-400">
                      {cfg.lastRunAt ? formatDateTime(cfg.lastRunAt) : 'Not yet dispatched'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Email Delivery Audit Trail */}
          <Card>
            <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base">Email Delivery Audit Trail</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="responsive-table-wrapper">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Dispatched At</th>
                      <th className="py-3 px-4">Report Type</th>
                      <th className="py-3 px-4">Recipients</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4">Provider Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {emailLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No email dispatch records found.
                        </td>
                      </tr>
                    ) : (
                      emailLogs.map((log) => (
                        <tr key={log._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-4 text-slate-500">
                            {formatDateTime(log.sentAt || log.createdAt)}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="text-[10px]">
                              {log.reportType}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                            {log.recipients?.join(', ')}
                          </td>
                          <td className="py-3 px-4 text-slate-800 dark:text-slate-200 truncate max-w-xs">
                            {log.subject}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge
                              variant={
                                log.status === 'SENT'
                                  ? 'success'
                                  : log.status === 'PENDING'
                                  ? 'warning'
                                  : 'danger'
                              }
                              className="text-[10px]"
                            >
                              {log.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                            {log.providerReference || '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
