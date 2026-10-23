'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Music2,
  IndianRupee,
  Percent,
  Search,
  SlidersHorizontal,
  Clock,
  ArrowDownRight,
  ShieldCheck,
  CalendarRange,
  Phone,
  User,
  Tag,
  Coins,
  Activity,
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
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface PeriodicSummaryItem {
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
  adjustmentsCount: number;
}

interface PeriodicSummaryResult {
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
    totalReceiptsCount: number;
    netCashFlow: number;
  };
  periods: PeriodicSummaryItem[];
  topProducts: Array<{
    name: string;
    sku: string;
    quantity: number;
    revenue: number;
    profit?: number;
  }>;
}

interface RentalProfitabilityItem {
  id: string;
  issueReference: string;
  customerName: string;
  customerContact?: string;
  customerEmail?: string;
  productName: string;
  sku: string;
  brand?: string;
  category: string;
  serializedItemId?: string;
  assetId?: string;
  serialNumber?: string;
  locationName: string;
  issueDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
  status: 'ACTIVE' | 'OVERDUE' | 'RETURNED';
  isRental: boolean;
  lockInPeriodMonths: number;
  monthlyRent: number;
  securityDeposit: number;
  totalRentPaid: number;
  totalRentDue: number;
  totalScheduledRent: number;
  purchaseCost: number;
  maintenanceCost: number;
  netProfit: number;
  roiPercent: number;
  isCapexRecovered: boolean;
  recoveryPercent: number;
  accessories: string[];
  paymentsCount: number;
  paidMonthsCount: number;
  overdueMonthsCount: number;
  nextPaymentDue?: {
    billingMonth: string;
    dueDate: string;
    amountDue: number;
  };
  monthlyPayments: Array<{
    monthIndex: number;
    billingMonth: string;
    dueDate: string;
    amountDue: number;
    amountPaid: number;
    paidAt?: string;
    paymentMethod?: string;
    transactionRef?: string;
    status: 'PAID' | 'DUE' | 'OVERDUE';
    notes?: string;
  }>;
}

interface RentalProfitabilityResult {
  kpis: {
    totalRentals: number;
    activeRentals: number;
    overdueRentals: number;
    returnedRentals: number;
    totalRentalRevenueCollected: number;
    totalRentalDue: number;
    totalScheduledRent: number;
    collectionRatePercent: number;
    totalSecurityDepositsHeld: number;
    activeMRR: number;
    projectedARR: number;
    totalAssetInvestmentCost: number;
    totalMaintenanceExpense: number;
    netRentalProfit: number;
    portfolioRoiPercent: number;
    capitalRecoveredCount: number;
  };
  monthlyCashflow: Array<{
    monthKey: string;
    label: string;
    collected: number;
    due: number;
    maintenance: number;
    netProfit: number;
  }>;
  categoryPerformance: Array<{
    category: string;
    rentalsCount: number;
    totalCollected: number;
    totalCapex: number;
    maintenanceCost: number;
    netProfit: number;
    roiPercent: number;
  }>;
  items: RentalProfitabilityItem[];
}

const CATEGORY_COLORS = ['#f59e0b', '#6366f1', '#10b981', '#ec4899', '#06b6d4', '#8b5cf6'];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'summary' | 'rentals' | 'valuation' | 'reconciliation' | 'emailReports'>('summary');
  const [summaryPeriod, setSummaryPeriod] = useState<'week' | 'month'>('week');
  const [summaryMetricView, setSummaryMetricView] = useState<'revenue_flow' | 'profit_margin' | 'orders_velocity'>('revenue_flow');

  // Periodic summary state
  const [periodicData, setPeriodicData] = useState<PeriodicSummaryResult | null>(null);

  // Rental profitability state
  const [rentalData, setRentalData] = useState<RentalProfitabilityResult | null>(null);
  const [rentalStatusFilter, setRentalStatusFilter] = useState<'ALL' | 'ACTIVE' | 'OVERDUE' | 'RETURNED'>('ALL');
  const [rentalSearch, setRentalSearch] = useState('');

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
  const [valuationSearch, setValuationSearch] = useState('');

  // Reconciliation report state
  const [reconciliationData, setReconciliationData] = useState<{
    timestamp: string;
    totalProductsChecked: number;
    mismatchesFound: number;
    results: any[];
  } | null>(null);
  const [reconciliationFilter, setReconciliationFilter] = useState<'ALL' | 'MISMATCHES'>('ALL');

  // Email report configs, recipient input & logs
  const { user } = useAuth();
  const [reportConfigs, setReportConfigs] = useState<any[]>([]);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatusMessage, setEmailStatusMessage] = useState('');
  const [emailSuccess, setEmailSuccess] = useState<boolean>(true);
  const [selectedReportType, setSelectedReportType] = useState<string>('RENTAL_PROFITABILITY_REPORT');
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
        const res = await api.get<any>(`/reports/periodic-summary?period=${summaryPeriod}`);
        const data = (res as any)?.data !== undefined ? (res as any).data : res;
        setPeriodicData(data);
      } else if (activeTab === 'rentals') {
        const res = await api.get<any>('/reports/rentals-profitability');
        const data = (res as any)?.data !== undefined ? (res as any).data : res;
        setRentalData(data);
      } else if (activeTab === 'valuation') {
        const res = await api.get<any>('/reports/valuation');
        const data = (res as any)?.data !== undefined ? (res as any).data : res;
        setValuationData(data);
      } else if (activeTab === 'reconciliation') {
        const res = await api.get<any>('/reports/reconciliation');
        const data = (res as any)?.data !== undefined ? (res as any).data : res;
        setReconciliationData(data);
      } else if (activeTab === 'emailReports') {
        const [confRes, logsRes] = await Promise.all([
          api.get<any>('/meta/report-configs'),
          api.get<any>('/reports/email-logs'),
        ]);
        const confData = (confRes as any)?.data !== undefined ? (confRes as any).data : confRes;
        const logsData = (logsRes as any)?.data !== undefined ? (logsRes as any).data : logsRes;
        setReportConfigs(confData?.configs || confData || []);
        setEmailLogs(logsData?.logs || logsData || []);
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
      setEmailStatusMessage('Please provide a valid recipient email address.');
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
      setEmailStatusMessage(res.message || `Email report successfully dispatched to ${target}!`);
      const logsRes = await api.get<any>('/reports/email-logs');
      const logsData = (logsRes as any)?.data !== undefined ? (logsRes as any).data : logsRes;
      setEmailLogs(logsData?.logs || logsData || []);
    } catch (err: any) {
      setEmailSuccess(false);
      setEmailStatusMessage(`Failed: ${err.message || 'Failed to dispatch email report via Gmail SMTP.'}`);
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
      setEmailStatusMessage(res.message || `Test email successfully sent to ${target}`);
      const logsRes = await api.get<any>('/reports/email-logs');
      const logsData = (logsRes as any)?.data !== undefined ? (logsRes as any).data : logsRes;
      setEmailLogs(logsData?.logs || logsData || []);
    } catch (err: any) {
      setEmailSuccess(false);
      setEmailStatusMessage(`Failed: ${err.message || 'Failed to send test email.'}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Filtered Rental items
  const filteredRentals = useMemo(() => {
    if (!rentalData?.items) return [];
    return rentalData.items.filter((item) => {
      const matchesStatus = rentalStatusFilter === 'ALL' || item.status === rentalStatusFilter;
      const q = rentalSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.productName.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        (item.assetId && item.assetId.toLowerCase().includes(q)) ||
        (item.serialNumber && item.serialNumber.toLowerCase().includes(q)) ||
        item.customerName.toLowerCase().includes(q) ||
        (item.customerContact && item.customerContact.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [rentalData, rentalStatusFilter, rentalSearch]);

  // Filtered Valuation items
  const filteredValuation = useMemo(() => {
    if (!valuationData?.items) return [];
    return valuationData.items.filter((item) => {
      const q = valuationSearch.toLowerCase().trim();
      return (
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [valuationData, valuationSearch]);

  // Valuation category chart data
  const valuationByCategory = useMemo(() => {
    if (!valuationData?.items) return [];
    const catMap = new Map<string, { category: string; costValue: number; retailValue: number; units: number }>();
    for (const item of valuationData.items) {
      const cat = item.category || 'Uncategorized';
      const existing = catMap.get(cat) || { category: cat, costValue: 0, retailValue: 0, units: 0 };
      existing.costValue += item.valuationCost || 0;
      existing.retailValue += item.potentialRetail || 0;
      existing.units += item.onHand || 0;
      catMap.set(cat, existing);
    }
    return Array.from(catMap.values());
  }, [valuationData]);

  // Filtered Reconciliation items
  const filteredReconciliation = useMemo(() => {
    if (!reconciliationData?.results) return [];
    if (reconciliationFilter === 'MISMATCHES') {
      return reconciliationData.results.filter((r) => r.status !== 'MATCH' || r.variance !== 0);
    }
    return reconciliationData.results;
  }, [reconciliationData, reconciliationFilter]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo size="md" variant="badge" className="shadow-xs shrink-0" />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <span>Reporting & Analytics Center</span>
              <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400 border-amber-500/30">
                Superadmin
              </Badge>
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Stereobliss Retail — Live operational reports, periodic financial summaries, rental instrument profit tracking, and audit verification.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'summary' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(getApiUrl(`/reports/export/periodic?period=${summaryPeriod}`), '_blank')}
              className="gap-1.5 text-xs font-semibold"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
              <span>Export {summaryPeriod === 'week' ? 'Weekly' : 'Monthly'} CSV</span>
            </Button>
          )}

          {activeTab === 'rentals' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(getApiUrl('/reports/export/rentals'), '_blank')}
              className="gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 border-purple-500/30 hover:bg-purple-500/10"
            >
              <FileSpreadsheet className="h-4 w-4 text-purple-500" />
              <span>Export Rental Profit CSV</span>
            </Button>
          )}

          {activeTab === 'valuation' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(getApiUrl('/reports/export/products'), '_blank')}
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

          <Button variant="outline" size="sm" onClick={fetchReportData} title="Refresh Live Data">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'summary'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>Weekly & Monthly Performance</span>
        </button>

        <button
          onClick={() => setActiveTab('rentals')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'rentals'
              ? 'border-purple-500 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Music2 className="h-4 w-4" />
          <span>Rental Profit & Asset Yield</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold border border-purple-500/20">
            PROFIT
          </span>
        </button>

        <button
          onClick={() => setActiveTab('valuation')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
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
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'reconciliation'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
          <span>Ledger Audit Reconciliation</span>
        </button>

        <button
          onClick={() => setActiveTab('emailReports')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'emailReports'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Mail className="h-4 w-4" />
          <span>Send Email Reports</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: WEEKLY & MONTHLY PERFORMANCE SUMMARY */}
      {/* ========================================================= */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="h-4 w-4 text-amber-500" />
                <span>Aggregated Performance Overview</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Switch between weekly cadence and monthly financial summaries to track store performance, profit margins, and stock intake velocity.
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

          {/* Metric KPI Cards with Profit & Margins */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-amber-500 shadow-sm bg-linear-to-br from-amber-500/5 to-transparent">
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
                <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                  <span>Across {periodicData?.kpis.totalSalesCount ?? 0} customer orders</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    Avg {periodicData?.kpis.averageOrderValue ? formatCurrency(periodicData.kpis.averageOrderValue) : '₹0'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500 shadow-sm bg-linear-to-br from-emerald-500/5 to-transparent">
              <CardHeader className="pb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Gross Estimated Profit</span>
                  </span>
                  <Badge variant="success" className="text-[10px] font-bold">
                    {periodicData?.kpis.grossMarginPercent ?? 0}% Margin
                  </Badge>
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(periodicData?.kpis.totalGrossProfit ?? 0)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  COGS Cost: {formatCurrency(periodicData?.kpis.totalCogs ?? 0)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-indigo-500 shadow-sm bg-linear-to-br from-indigo-500/5 to-transparent">
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
                  From {periodicData?.kpis.totalReceiptsCount ?? 0} supplier dock intake receipts
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500 shadow-sm bg-linear-to-br from-blue-500/5 to-transparent">
              <CardHeader className="pb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Boxes className="h-3.5 w-3.5 text-blue-500" />
                  <span>Total Units Sold</span>
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {periodicData?.kpis.totalUnitsSold ?? 0} units
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Net Flow: {formatCurrency((periodicData?.kpis.totalRevenue ?? 0) - (periodicData?.kpis.totalInwardPurchases ?? 0))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Interactive Multi-Metric Chart Card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-amber-500" />
                    <span>
                      {summaryPeriod === 'week' ? 'Weekly Operational Timeline Visuals' : 'Monthly Operational Timeline Visuals'}
                    </span>
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Compare sales revenue generated vs inventory intake expenditures and estimated profit margins.
                  </p>
                </div>

                <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setSummaryMetricView('revenue_flow')}
                    className={`px-3 py-1 font-semibold rounded-md transition-all ${
                      summaryMetricView === 'revenue_flow'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Revenue vs Intake
                  </button>
                  <button
                    type="button"
                    onClick={() => setSummaryMetricView('profit_margin')}
                    className={`px-3 py-1 font-semibold rounded-md transition-all ${
                      summaryMetricView === 'profit_margin'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Gross Profit & Margin
                  </button>
                  <button
                    type="button"
                    onClick={() => setSummaryMetricView('orders_velocity')}
                    className={`px-3 py-1 font-semibold rounded-md transition-all ${
                      summaryMetricView === 'orders_velocity'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Orders & Units Velocity
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  {summaryMetricView === 'revenue_flow' ? (
                    <BarChart data={periodicData?.periods || []} margin={{ top: 15, right: 15, left: 0, bottom: 25 }}>
                      <defs>
                        <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#d97706" stopOpacity={0.7} />
                        </linearGradient>
                        <linearGradient id="receiptsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.7} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="periodKey" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                      <Tooltip
                        formatter={(val: any) => formatCurrency(Number(val) || 0)}
                        labelFormatter={(label, items) => items?.[0]?.payload?.label || label}
                        contentStyle={{
                          borderRadius: '0.75rem',
                          fontSize: '12px',
                          background: 'rgba(15, 23, 42, 0.95)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#fff',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Bar dataKey="salesRevenue" name="Sales Revenue" fill="url(#salesGrad)" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="receiptsValue" name="Stock Inflow (Purchases)" fill="url(#receiptsGrad)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  ) : summaryMetricView === 'profit_margin' ? (
                    <BarChart data={periodicData?.periods || []} margin={{ top: 15, right: 15, left: 0, bottom: 25 }}>
                      <defs>
                        <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="periodKey" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                      <Tooltip
                        formatter={(val: any, name: any) =>
                          name === 'Margin %' ? `${val}%` : formatCurrency(Number(val) || 0)
                        }
                        labelFormatter={(label, items) => items?.[0]?.payload?.label || label}
                        contentStyle={{
                          borderRadius: '0.75rem',
                          fontSize: '12px',
                          background: 'rgba(15, 23, 42, 0.95)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#fff',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Bar dataKey="grossProfit" name="Estimated Gross Profit" fill="url(#profitGrad)" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="cogs" name="COGS (Product Cost)" fill="#94a3b8" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  ) : (
                    <BarChart data={periodicData?.periods || []} margin={{ top: 15, right: 15, left: 0, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="periodKey" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        labelFormatter={(label, items) => items?.[0]?.payload?.label || label}
                        contentStyle={{
                          borderRadius: '0.75rem',
                          fontSize: '12px',
                          background: 'rgba(15, 23, 42, 0.95)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#fff',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Bar dataKey="salesCount" name="Sales Orders" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="itemsSold" name="Physical Units Sold" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Period-by-Period Table & Top Products */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 shadow-sm">
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
                        <th className="py-3 px-4 text-right">Gross Profit (₹)</th>
                        <th className="py-3 px-4 text-center">Margin %</th>
                        <th className="py-3 px-4 text-center">Units</th>
                        <th className="py-3 px-4 text-right">Inward Stock (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                      {(periodicData?.periods || []).map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
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
                          <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(p.grossProfit)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              p.grossMarginPercent > 20
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : p.grossMarginPercent > 0
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}>
                              {p.grossMarginPercent}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400">
                            {p.itemsSold}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-indigo-600 dark:text-indigo-400">
                            {formatCurrency(p.receiptsValue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Top Selling Products */}
            <Card className="shadow-sm">
              <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Top Selling Products</span>
                  <span className="text-xs text-slate-400">By Revenue</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {(!periodicData?.topProducts || periodicData.topProducts.length === 0) ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No sales recorded in this period timeframe.
                  </div>
                ) : (
                  periodicData.topProducts.map((tp, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between"
                    >
                      <div className="space-y-0.5 max-w-[65%]">
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
                        {tp.profit !== undefined && (
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                            +{formatCurrency(tp.profit)} est. profit
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: RENTAL PROFITABILITY & ASSET FLEET YIELD */}
      {/* ========================================================= */}
      {activeTab === 'rentals' && (
        <div className="space-y-6">
          {/* Header Description & Search Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Music2 className="h-4 w-4 text-purple-500" />
                <span>Rental Fleet Profitability & Capex Recovery Engine</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Track revenue collected per rented instrument against its original purchase cost, maintenance expenses, and gross profit ROI.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter instrument, renter, serial..."
                  value={rentalSearch}
                  onChange={(e) => setRentalSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500/30"
                />
              </div>

              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950 text-xs">
                {(['ALL', 'ACTIVE', 'OVERDUE', 'RETURNED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setRentalStatusFilter(st)}
                    className={`px-3 py-1 font-semibold rounded-lg transition-all ${
                      rentalStatusFilter === st
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    {st === 'ALL' ? 'All Fleet' : st.charAt(0) + st.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Rental Fleet Hero KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-purple-500 shadow-sm bg-linear-to-br from-purple-500/5 to-transparent">
              <CardHeader className="pb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <IndianRupee className="h-3.5 w-3.5 text-purple-500" />
                    <span>Total Rent Collected</span>
                  </span>
                  <Badge variant="outline" className="text-[10px] text-purple-600 dark:text-purple-400 border-purple-500/30">
                    {rentalData?.kpis.collectionRatePercent ?? 100}% Paid
                  </Badge>
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                  {formatCurrency(rentalData?.kpis.totalRentalRevenueCollected ?? 0)}
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                  <span>Balance Due: <strong className="text-amber-500">{formatCurrency(rentalData?.kpis.totalRentalDue ?? 0)}</strong></span>
                  <span>{rentalData?.kpis.totalRentals ?? 0} agreements</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500 shadow-sm bg-linear-to-br from-emerald-500/5 to-transparent">
              <CardHeader className="pb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Coins className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Net Rental Profit</span>
                  </span>
                  <Badge variant="success" className="text-[10px]">
                    Net Margin
                  </Badge>
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(rentalData?.kpis.netRentalProfit ?? 0)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  After {formatCurrency(rentalData?.kpis.totalMaintenanceExpense ?? 0)} maintenance repairs
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500 shadow-sm bg-linear-to-br from-amber-500/5 to-transparent">
              <CardHeader className="pb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Percent className="h-3.5 w-3.5 text-amber-500" />
                    <span>Portfolio Capex ROI</span>
                  </span>
                  <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">
                    {rentalData?.kpis.capitalRecoveredCount ?? 0} Paid Off
                  </Badge>
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {rentalData?.kpis.portfolioRoiPercent ?? 0}%
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Of {formatCurrency(rentalData?.kpis.totalAssetInvestmentCost ?? 0)} instrument capex
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500 shadow-sm bg-linear-to-br from-blue-500/5 to-transparent">
              <CardHeader className="pb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-blue-500" />
                    <span>Monthly Recurring (MRR)</span>
                  </span>
                  <Badge variant="default" className="text-[9px] bg-blue-600">
                    Active
                  </Badge>
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  {formatCurrency(rentalData?.kpis.activeMRR ?? 0)}/mo
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Projected ARR: <strong>{formatCurrency(rentalData?.kpis.projectedARR ?? 0)}</strong> &bull; {rentalData?.kpis.activeRentals ?? 0} active
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Visual Charts: Cashflow Timeline & Capex Recovery by Category */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: Monthly Rental Cash Flow */}
            <Card className="lg:col-span-2 shadow-sm">
              <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-purple-500" />
                    <span>Monthly Rental Income & Receivables Cashflow</span>
                  </span>
                  <span className="text-xs font-normal text-slate-500">Values in INR (₹)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72 w-full pt-4">
                  {(!rentalData?.monthlyCashflow || rentalData.monthlyCashflow.length === 0) ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      No monthly payment records logged yet.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={rentalData.monthlyCashflow} margin={{ top: 10, right: 15, left: 0, bottom: 20 }}>
                        <defs>
                          <linearGradient id="rentalCollectedGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#6d28d9" stopOpacity={0.7} />
                          </linearGradient>
                          <linearGradient id="rentalDueGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#d97706" stopOpacity={0.6} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                        <Tooltip
                          formatter={(val: any) => formatCurrency(Number(val) || 0)}
                          contentStyle={{
                            borderRadius: '0.75rem',
                            fontSize: '12px',
                            background: 'rgba(15, 23, 42, 0.95)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#fff',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                        <Bar dataKey="collected" name="Rent Collected" fill="url(#rentalCollectedGrad)" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="due" name="Rent Due / Receivables" fill="url(#rentalDueGrad)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Chart 2: Category Rental Performance & Yield */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Category Rental Yield</span>
                  <Badge variant="outline" className="text-[10px]">
                    By Department
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {(!rentalData?.categoryPerformance || rentalData.categoryPerformance.length === 0) ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No rental categories recorded.
                  </div>
                ) : (
                  rentalData.categoryPerformance.map((cp, idx) => (
                    <div
                      key={cp.category}
                      className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                          />
                          <span>{cp.category}</span>
                        </span>
                        <span className="font-black text-purple-600 dark:text-purple-400">
                          {formatCurrency(cp.totalCollected)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>{cp.rentalsCount} rental agreement(s)</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {cp.roiPercent}% ROI
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, cp.roiPercent)}%`,
                            backgroundColor: cp.roiPercent >= 100 ? '#10b981' : '#8b5cf6',
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detailed Rental Instrument Profitability Table */}
          <Card className="shadow-sm">
            <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Instrument-by-Instrument Profit & Capex Recovery Ledger</span>
                    <Badge variant="outline" className="text-xs">
                      {filteredRentals.length} instruments listed
                    </Badge>
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Individual ROI tracking of every rented asset, customer details, capex cost, maintenance expenses, and net profit.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="responsive-table-wrapper">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Instrument / Serial</th>
                      <th className="py-3 px-4">Customer / Renter</th>
                      <th className="py-3 px-4 text-right">Asset Cost</th>
                      <th className="py-3 px-4 text-center">Monthly Rent</th>
                      <th className="py-3 px-4 text-right">Rent Paid (₹)</th>
                      <th className="py-3 px-4 text-right">Rent Due (₹)</th>
                      <th className="py-3 px-4 text-right">Maintenance</th>
                      <th className="py-3 px-4 text-right">Net Profit</th>
                      <th className="py-3 px-4 text-center">Capex ROI %</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {filteredRentals.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-400">
                          <Music2 className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                          <p className="font-semibold text-slate-600 dark:text-slate-400">No rental records matched your filters.</p>
                          <p className="text-xs text-slate-400 mt-0.5">Try clearing the search query or status filter.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredRentals.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-white line-clamp-1">
                              {item.productName}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] font-mono text-amber-500">{item.sku}</span>
                              {(item.assetId || item.serialNumber) && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono">
                                  {item.assetId || item.serialNumber}
                                </Badge>
                              )}
                              <span className="text-[10px] text-slate-400">&bull; {item.category}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                              <User className="h-3 w-3 text-slate-400" />
                              <span>{item.customerName}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              {item.customerContact && <span>{item.customerContact}</span>}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                            {formatCurrency(item.purchaseCost)}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {formatCurrency(item.monthlyRent)}
                            </span>
                            <div className="text-[10px] text-slate-400">
                              {item.paidMonthsCount}/{item.lockInPeriodMonths} mos
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right font-black text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(item.totalRentPaid)}
                          </td>

                          <td className="py-3 px-4 text-right font-bold text-amber-500">
                            {item.totalRentDue > 0 ? formatCurrency(item.totalRentDue) : '₹0'}
                          </td>

                          <td className="py-3 px-4 text-right text-rose-500 font-medium">
                            {item.maintenanceCost > 0 ? `-${formatCurrency(item.maintenanceCost)}` : '₹0'}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-black bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                              {formatCurrency(item.netProfit)}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <Badge
                                variant={item.roiPercent >= 100 ? 'success' : item.roiPercent >= 50 ? 'default' : 'warning'}
                                className="text-[10px] font-bold"
                              >
                                {item.roiPercent}% ROI
                              </Badge>
                              {item.isCapexRecovered && (
                                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                                  Pure Profit
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <Badge
                              variant={
                                item.status === 'ACTIVE'
                                  ? 'success'
                                  : item.status === 'OVERDUE'
                                  ? 'danger'
                                  : 'outline'
                              }
                              className="text-[10px]"
                            >
                              {item.status}
                            </Badge>
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

      {/* ========================================================= */}
      {/* TAB 3: INVENTORY VALUATION */}
      {/* ========================================================= */}
      {activeTab === 'valuation' && (
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="border-l-4 border-l-amber-500 shadow-sm">
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

            <Card className="border-l-4 border-l-emerald-500 shadow-sm">
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
                  Expected revenue at default retail MSRP
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-indigo-500 shadow-sm">
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
                  Potential profit upon 100% catalog sell-through
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Visual: Valuation Breakdown by Category */}
          {valuationByCategory.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Category Inventory Asset Valuation (Cost vs Retail)</span>
                  <span className="text-xs text-slate-400">Values in INR (₹)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={valuationByCategory} margin={{ top: 10, right: 15, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                      <Tooltip
                        formatter={(val: any) => formatCurrency(Number(val) || 0)}
                        contentStyle={{
                          borderRadius: '0.75rem',
                          fontSize: '12px',
                          background: 'rgba(15, 23, 42, 0.95)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#fff',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Bar dataKey="costValue" name="Asset Valuation (Cost)" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="retailValue" name="Potential Retail Value" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Valuation Table */}
          <Card className="shadow-sm">
            <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Product-by-Product Asset Valuation</CardTitle>
                  <span className="text-xs text-slate-500">
                    ({filteredValuation.length} products listed)
                  </span>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search product, SKU, category..."
                    value={valuationSearch}
                    onChange={(e) => setValuationSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>
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
                    {filteredValuation.map((item) => (
                      <tr key={item.productId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
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

      {/* ========================================================= */}
      {/* TAB 4: LEDGER RECONCILIATION AUDIT */}
      {/* ========================================================= */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-6">
          <Card className="border-l-4 border-l-blue-500 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-blue-500" />
                    <span>Real-time Ledger Integrity Verification</span>
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-1">
                    Every physical change generates an immutable transaction movement in the ledger.
                    This automated audit re-calculates all movements from Genesis and validates them against current product quantities.
                  </p>
                </div>
                <Badge
                  variant={reconciliationData?.mismatchesFound === 0 ? 'success' : 'danger'}
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
          <Card className="shadow-sm">
            <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Ledger Reconciliation Audit Log</CardTitle>
              <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setReconciliationFilter('ALL')}
                  className={`px-3 py-1 font-semibold rounded-md transition-all ${
                    reconciliationFilter === 'ALL'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  All Products ({reconciliationData?.results?.length ?? 0})
                </button>
                <button
                  type="button"
                  onClick={() => setReconciliationFilter('MISMATCHES')}
                  className={`px-3 py-1 font-semibold rounded-md transition-all ${
                    reconciliationFilter === 'MISMATCHES'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Discrepancies Only ({reconciliationData?.mismatchesFound ?? 0})
                </button>
              </div>
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
                    {filteredReconciliation.map((res, i) => (
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

      {/* ========================================================= */}
      {/* TAB 5: SEND EMAIL REPORTS & DELIVERY LOGS */}
      {/* ========================================================= */}
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
                      id: 'RENTAL_PROFITABILITY_REPORT',
                      title: 'Rental Profitability & Fleet Yield',
                      badge: 'New & Priority',
                      icon: Music2,
                      color: 'text-purple-500',
                      description: 'Total rent collected, net rental profit, capex cost recovery %, and active fleet metrics.',
                    },
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
                      badge: 'Verification',
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
                    Send {selectedReportType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
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
