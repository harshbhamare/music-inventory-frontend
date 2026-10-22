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
  Check,
  Sparkles,
  X,
} from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { useAuth } from '@/context/AuthContext';
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

  // Email report configs, recipient input & logs
  const { user } = useAuth();
  const [reportConfigs, setReportConfigs] = useState<any[]>([]);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatusMessage, setEmailStatusMessage] = useState('');
  const [emailSuccess, setEmailSuccess] = useState<boolean>(true);
  const [selectedReportType, setSelectedReportType] = useState<string>('DAILY_STOCK_SUMMARY');
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [reportNotes, setReportNotes] = useState<string>('');

  useEffect(() => {
    if (!recipientEmail && user?.email) {
      setRecipientEmail(user.email);
    }
  }, [user]);

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
        if (!recipientEmail && user?.email) {
          setRecipientEmail(user.email);
        }
      }
    } catch (err) {
      console.error('Failed to load report data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendEmailReport = async () => {
    const target = (recipientEmail || user?.email || '').trim();
    if (!target || !target.includes('@')) {
      setEmailSuccess(false);
      setEmailStatusMessage('Please provide a valid recipient email address (e.g. hustlerxeroindia@gmail.com).');
      return;
    }

    setIsSendingEmail(true);
    setEmailStatusMessage('');
    try {
      const res = await api.post<{ success: boolean; message: string; data?: any }>('/reports/send-email-report', {
        reportType: selectedReportType,
        recipientEmail: target,
        notes: reportNotes.trim() || undefined,
      });

      setEmailSuccess(true);
      setEmailStatusMessage(res.message || `✅ Email report successfully dispatched to ${target}!`);
      const logsRes = await api.get<{ logs: any[] }>('/reports/email-logs');
      setEmailLogs(logsRes.logs || []);
    } catch (err: any) {
      setEmailSuccess(false);
      setEmailStatusMessage(`❌ ${err.message || 'Failed to dispatch email report via Gmail SMTP.'}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendQuickTest = async () => {
    const target = (recipientEmail || user?.email || 'hustlerxeroindia@gmail.com').trim();
    setIsSendingEmail(true);
    setEmailStatusMessage('');
    try {
      const res = await api.post<{ success: boolean; message: string }>('/reports/email-test', {
        recipientEmail: target,
      });
      setEmailSuccess(true);
      setEmailStatusMessage(res.message || `✅ Test email successfully sent to ${target}`);
      const logsRes = await api.get<{ logs: any[] }>('/reports/email-logs');
      setEmailLogs(logsRes.logs || []);
    } catch (err: any) {
      setEmailSuccess(false);
      setEmailStatusMessage(`❌ ${err.message || 'Failed to send test email.'}`);
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
        <div className="flex items-center gap-3">
          <BrandLogo size="md" variant="badge" className="shadow-xs shrink-0" />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Reporting & Analytics Center
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Stereobliss Retail — Weekly and monthly operational summaries, catalog valuation, and audit reconciliation.
            </p>
          </div>
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

          <Button
            variant="default"
            size="sm"
            onClick={() => setActiveTab('emailReports')}
            className="gap-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs"
          >
            <Mail className="h-4 w-4" />
            <span>Send Email Report</span>
          </Button>

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
          <span>Send Email Reports</span>
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

      {/* Tab 4: Send Email Reports & Delivery */}
      {activeTab === 'emailReports' && (
        <div className="space-y-6">
          {/* Status Feedback Banner */}
          {emailStatusMessage && (
            <div
              className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-xs font-semibold transition-all ${
                emailSuccess
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {emailSuccess ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />
                )}
                <span>{emailStatusMessage}</span>
              </div>
              <button
                onClick={() => setEmailStatusMessage('')}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Interactive Send Email Report Console */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2 text-slate-900 dark:text-white">
                    <Mail className="h-5 w-5 text-amber-500" />
                    <span>Send Email Report</span>
                  </CardTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Select any store report and dispatch it immediately to any recipient email via verified Gmail SMTP.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 w-fit">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Gmail SMTP Active (hustlerxeroindia@gmail.com)</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-6">
              {/* Step 1: Recipient Email Input */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Send className="h-3.5 w-3.5 text-amber-500" />
                    <span>Recipient Email Address *</span>
                  </label>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-slate-400">Quick Fill:</span>
                    {user?.email && (
                      <button
                        type="button"
                        onClick={() => setRecipientEmail(user.email)}
                        className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-500/10 hover:text-amber-600 transition-colors font-medium"
                      >
                        My Email ({user.email})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setRecipientEmail('hustlerxeroindia@gmail.com')}
                      className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-500/10 hover:text-amber-600 transition-colors font-medium"
                    >
                      Store Admin (Gmail)
                    </button>
                    {recipientEmail && (
                      <button
                        type="button"
                        onClick={() => setRecipientEmail('')}
                        className="text-slate-400 hover:text-rose-500 px-1 font-medium"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    placeholder="Enter recipient email address (e.g. manager@domain.com, user@gmail.com)"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Multiple addresses can be separated by commas (e.g. <code>director@muziclub.com, admin@muziclub.com</code>).
                </p>
              </div>

              {/* Step 2: Choose Report Type */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>Select Report Type</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'DAILY_STOCK_SUMMARY',
                      title: 'Daily Stock Summary',
                      badge: 'Core Stock',
                      icon: Boxes,
                      color: 'text-amber-500',
                      description: 'On-hand stock, units available for sale, valuation at purchase cost, and low stock items list.',
                    },
                    {
                      id: 'WEEKLY_SALES_SUMMARY',
                      title: 'Weekly Sales Performance',
                      badge: 'Revenue',
                      icon: ShoppingCart,
                      color: 'text-emerald-500',
                      description: 'Last 7 days revenue in ₹, completed customer sales orders, and average order value.',
                    },
                    {
                      id: 'OVERDUE_USAGE_REMINDER',
                      title: 'Overdue Rentals & Loans',
                      badge: 'Operations',
                      icon: AlertTriangle,
                      color: 'text-rose-500',
                      description: 'Active instrument loans and student rentals that have passed their expected return date.',
                    },
                    {
                      id: 'LOW_STOCK_ALERT',
                      title: 'Low Stock Buffer Alert',
                      badge: 'Reorder Needed',
                      icon: ShieldAlert,
                      color: 'text-red-500',
                      description: 'Products at or below minimum safety thresholds with SKU codes and safety buffer levels.',
                    },
                    {
                      id: 'VALUATION_REPORT',
                      title: 'Inventory Valuation Report',
                      badge: 'Financial Worth',
                      icon: BarChart3,
                      color: 'text-indigo-500',
                      description: 'Full cost valuation, projected retail valuation, potential gross margin, and category breakdown.',
                    },
                    {
                      id: 'TEST_EMAIL',
                      title: 'Gmail Diagnostic Ping',
                      badge: 'System Verification',
                      icon: Send,
                      color: 'text-cyan-500',
                      description: 'Instant test email confirming Gmail App Password authentication and live SMTP dispatch.',
                    },
                  ].map((rpt) => {
                    const isSelected = selectedReportType === rpt.id;
                    const Icon = rpt.icon;
                    return (
                      <div
                        key={rpt.id}
                        onClick={() => setSelectedReportType(rpt.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-500/10 ring-2 ring-amber-500/20'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${rpt.color} shrink-0`} />
                            <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                              {rpt.title}
                            </h4>
                          </div>
                          <Badge
                            variant={isSelected ? 'default' : 'outline'}
                            className="text-[9px] px-1.5 py-0"
                          >
                            {rpt.badge}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                          {rpt.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Optional Remarks / Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-slate-400" />
                  <span>Custom Remarks / Note for Recipient (Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Prepared for Pune store manager weekly audit..."
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  size="default"
                  variant="default"
                  isLoading={isSendingEmail}
                  onClick={handleSendEmailReport}
                  className="font-bold gap-2 text-xs sm:text-sm bg-amber-500 hover:bg-amber-600 text-slate-950 px-5 shadow-xs"
                >
                  <Send className="h-4 w-4" />
                  <span>
                    Send {selectedReportType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())} to Recipient
                  </span>
                </Button>

                <Button
                  size="default"
                  variant="outline"
                  isLoading={isSendingEmail}
                  onClick={handleSendQuickTest}
                  className="gap-1.5 text-xs font-semibold"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Send Diagnostic Test Email</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Email Delivery Audit Trail */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base text-slate-900 dark:text-white">Email Delivery Audit Trail</CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Complete timestamped log of transactional report dispatches and provider message IDs.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchReportData}
                className="gap-1.5 text-xs font-medium"
                title="Refresh delivery logs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh Logs</span>
              </Button>
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
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <Mail className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                          <p className="font-semibold text-slate-600 dark:text-slate-400">No email dispatches recorded yet.</p>
                          <p className="text-xs text-slate-400 mt-0.5">Use the form above to send your first report to any email address.</p>
                        </td>
                      </tr>
                    ) : (
                      emailLogs.map((log) => (
                        <tr key={log._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                            {formatDateTime(log.sentAt || log.createdAt)}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {log.reportType}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-semibold">
                            {log.recipients?.join(', ')}
                          </td>
                          <td className="py-3 px-4 text-slate-800 dark:text-slate-200 max-w-xs">
                            <div className="truncate font-medium">{log.subject}</div>
                            {log.errorDetails && (
                              <div className="text-[10px] text-rose-500 truncate mt-0.5" title={log.errorDetails}>
                                Error: {log.errorDetails}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
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
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-400 max-w-[150px] truncate">
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
