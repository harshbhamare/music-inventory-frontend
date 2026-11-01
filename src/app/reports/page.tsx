'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { api, getApiUrl } from '@/lib/api';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { DashboardMetrics } from '@/lib/types';
import { generateExecutivePdf } from '@/lib/pdfExport';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  TrendingUp,
  FileSpreadsheet,
  RefreshCw,
  Mail,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Send,
  Boxes,
  ShoppingCart,
  Music2,
  IndianRupee,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  X,
  Search,
  Clock,
  ShieldCheck,
  CreditCard,
  Users,
  AlertCircle,
  FileText,
  DollarSign,
  Download,
  Info,
  ChevronRight,
  PieChart as PieChartIcon,
  Percent,
  Check,
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
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

type ReportTab = 'executive' | 'sales' | 'rentals' | 'valuation' | 'reconciliation' | 'exports';
type PeriodFilter = 'today' | 'week' | 'month' | 'last_month' | 'financial_year' | 'custom';

const PALETTE = ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#06b6d4'];

export default function ReportsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ReportTab>('executive');

  // Date Filters
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  // Tab Data States
  const [dashboardData, setDashboardData] = useState<DashboardMetrics | null>(null);
  const [periodicData, setPeriodicData] = useState<any>(null);
  const [periodicPeriod, setPeriodicPeriod] = useState<'week' | 'month'>('month');
  const [rentalData, setRentalData] = useState<any>(null);
  const [rentalStatusFilter, setRentalStatusFilter] = useState<'ALL' | 'ACTIVE' | 'OVERDUE' | 'RETURNED'>('ALL');
  const [rentalSearch, setRentalSearch] = useState('');
  const [valuationData, setValuationData] = useState<any>(null);
  const [valuationSearch, setValuationSearch] = useState('');
  const [reconciliationData, setReconciliationData] = useState<any>(null);
  const [reconciliationFilter, setReconciliationFilter] = useState<'ALL' | 'MISMATCHES'>('ALL');
  const [salesList, setSalesList] = useState<any[]>([]);
  const [salesSearch, setSalesSearch] = useState('');

  // Email state
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatusMessage, setEmailStatusMessage] = useState('');
  const [emailSuccess, setEmailSuccess] = useState(true);
  const [selectedReportType, setSelectedReportType] = useState('RENTAL_PROFITABILITY_REPORT');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [reportNotes, setReportNotes] = useState('');

  const [isLoading, setIsLoading] = useState(true);

  // Initialize email recipient
  useEffect(() => {
    if (!recipientEmail && user?.email) {
      setRecipientEmail(user.email);
    }
  }, [user]);

  // Compute start/end dates
  const { startDate, endDate, periodLabel } = useMemo(() => {
    const now = new Date();
    let s: Date | undefined;
    let e: Date | undefined;
    let label = 'This Month';

    if (periodFilter === 'today') {
      s = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      e = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      label = 'Today';
    } else if (periodFilter === 'week') {
      const day = now.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      s = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0);
      e = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      label = 'This Week';
    } else if (periodFilter === 'month') {
      s = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      label = 'This Month';
    } else if (periodFilter === 'last_month') {
      s = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      e = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      label = 'Last Month';
    } else if (periodFilter === 'financial_year') {
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
      s = new Date(fyStartYear, 3, 1, 0, 0, 0);
      e = new Date(fyStartYear + 1, 2, 31, 23, 59, 59, 999);
      label = `FY ${fyStartYear}-${fyStartYear + 1}`;
    } else if (periodFilter === 'custom' && customStart && customEnd) {
      s = new Date(customStart);
      e = new Date(customEnd);
      label = `${customStart} to ${customEnd}`;
    }

    return { startDate: s, endDate: e, periodLabel: label };
  }, [periodFilter, customStart, customEnd]);

  // Fetch report data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.set('startDate', startDate.toISOString());
      if (endDate) queryParams.set('endDate', endDate.toISOString());
      const queryStr = queryParams.toString() ? `?${queryParams.toString()}` : '';

      if (activeTab === 'executive') {
        const res = await api.get<any>(`/reports/dashboard${queryStr}`);
        setDashboardData(res?.data ?? res);
      } else if (activeTab === 'sales') {
        const [dashRes, periodicRes, salesRes] = await Promise.all([
          api.get<any>(`/reports/dashboard${queryStr}`),
          api.get<any>(`/reports/periodic-summary?period=${periodicPeriod}`),
          api.get<any>('/sales?limit=100'),
        ]);
        setDashboardData(dashRes?.data ?? dashRes);
        setPeriodicData(periodicRes?.data ?? periodicRes);
        const salesData = salesRes?.data ?? salesRes;
        setSalesList(Array.isArray(salesData) ? salesData : salesData?.sales ?? []);
      } else if (activeTab === 'rentals') {
        const res = await api.get<any>('/reports/rentals-profitability');
        setRentalData(res?.data ?? res);
      } else if (activeTab === 'valuation') {
        const [valRes, dashRes] = await Promise.all([
          api.get<any>('/reports/valuation'),
          api.get<any>(`/reports/dashboard${queryStr}`),
        ]);
        setValuationData(valRes?.data ?? valRes);
        setDashboardData(dashRes?.data ?? dashRes);
      } else if (activeTab === 'reconciliation') {
        const res = await api.get<any>('/reports/reconciliation');
        setReconciliationData(res?.data ?? res);
      } else if (activeTab === 'exports') {
        const [dashRes, logsRes] = await Promise.all([
          api.get<any>(`/reports/dashboard${queryStr}`),
          api.get<any>('/reports/email-logs'),
        ]);
        setDashboardData(dashRes?.data ?? dashRes);
        const logsData = logsRes?.data ?? logsRes;
        setEmailLogs(logsData?.logs ?? logsData ?? []);
      }
    } catch (err) {
      console.error('Failed to fetch reporting data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, periodFilter, startDate, endDate, periodicPeriod]);

  // Handlers
  const handlePdfExport = () => {
    if (!dashboardData) return;
    generateExecutivePdf({
      periodLabel,
      userName: user?.name || user?.email || 'CEO',
      userRole: user?.role || 'Superadmin',
      data: dashboardData,
      category: activeTab.toUpperCase(),
    });
  };

  const handleSendEmailReport = async () => {
    const target = (recipientEmail || user?.email || '').trim();
    if (!target || !target.includes('@')) {
      setEmailSuccess(false);
      setEmailStatusMessage('Please enter a valid recipient email address.');
      return;
    }

    setIsSendingEmail(true);
    setEmailStatusMessage('');
    try {
      const res = await api.post<{ success: boolean; message: string }>('/reports/send-email-report', {
        reportType: selectedReportType,
        recipientEmail: target,
        notes: reportNotes.trim() || undefined,
      });
      setEmailSuccess(true);
      setEmailStatusMessage(res.message || `Executive report dispatched successfully to ${target}!`);
      const logsRes = await api.get<any>('/reports/email-logs');
      const logsData = logsRes?.data ?? logsRes;
      setEmailLogs(logsData?.logs ?? logsData ?? []);
    } catch (err: any) {
      setEmailSuccess(false);
      setEmailStatusMessage(`Dispatch Error: ${err.message || 'Failed to send email report via Gmail SMTP.'}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Filtered Rental items
  const filteredRentals = useMemo(() => {
    if (!rentalData?.items) return [];
    return rentalData.items.filter((item: any) => {
      const matchesStatus = rentalStatusFilter === 'ALL' || item.status === rentalStatusFilter;
      const q = rentalSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.productName.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        (item.assetId && item.assetId.toLowerCase().includes(q)) ||
        (item.serialNumber && item.serialNumber.toLowerCase().includes(q)) ||
        item.customerName.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [rentalData, rentalStatusFilter, rentalSearch]);

  // Filtered Valuation items
  const filteredValuation = useMemo(() => {
    if (!valuationData?.items) return [];
    return valuationData.items.filter((item: any) => {
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
      return reconciliationData.results.filter((r: any) => r.status !== 'MATCH' || r.variance !== 0);
    }
    return reconciliationData.results;
  }, [reconciliationData, reconciliationFilter]);

  // Sales by employee
  const salesByEmployee = useMemo(() => {
    if (!salesList || salesList.length === 0) return [];
    const map = new Map<string, { name: string; salesCount: number; revenue: number }>();
    for (const s of salesList) {
      if (s.saleStatus === 'CANCELLED' || s.saleStatus === 'RETURNED') continue;
      const empName = s.soldBy?.name || 'Store Staff';
      const existing = map.get(empName) || { name: empName, salesCount: 0, revenue: 0 };
      existing.salesCount += 1;
      existing.revenue += s.grandTotal || 0;
      map.set(empName, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [salesList]);

  // Filtered sales ledger
  const filteredSalesLedger = useMemo(() => {
    if (!salesList) return [];
    const q = salesSearch.toLowerCase().trim();
    return salesList.filter((s: any) => {
      if (!q) return true;
      return (
        s.invoiceNumber?.toLowerCase().includes(q) ||
        s.customerName?.toLowerCase().includes(q) ||
        s.soldBy?.name?.toLowerCase().includes(q) ||
        s.paymentMethod?.toLowerCase().includes(q)
      );
    });
  }, [salesList, salesSearch]);

  const ef = dashboardData?.executiveFinancials;
  const fh = dashboardData?.financialHealth;
  const ih = dashboardData?.inventoryHealth;
  const rp = dashboardData?.rentalPerformance;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Executive Business Intelligence & Reporting
            </h1>
            <Badge variant="outline" className="border-amber-500/30 text-amber-500 bg-amber-500/10 font-bold uppercase text-[10px]">
              CEO Suite
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Authoritative, reconciled financial statements, rental capital recovery, inventory valuation, and invariant ledger audit.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {dashboardData && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePdfExport}
              className="gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
            >
              <FileText className="h-4 w-4 text-rose-500" />
              <span>Executive PDF</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(getApiUrl(`/reports/export/executive?startDate=${startDate?.toISOString() || ''}&endDate=${endDate?.toISOString() || ''}`), '_blank')}
            className="gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
            <span>Executive CSV</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => setActiveTab('exports')}
            className="gap-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs"
          >
            <Mail className="h-4 w-4" />
            <span>Dispatch Report</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            title="Refresh Data"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Primary Category Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar gap-1">
        {[
          { id: 'executive', label: 'Executive Summary', icon: TrendingUp },
          { id: 'sales', label: 'Sales & Collections', icon: ShoppingCart },
          { id: 'rentals', label: 'Rental Profitability & Asset Recovery', icon: Music2 },
          { id: 'valuation', label: 'Inventory Valuation & Stock Health', icon: Boxes },
          { id: 'reconciliation', label: 'Financial Reconciliation & Audit', icon: ShieldCheck },
          { id: 'exports', label: 'Export & Dispatch Center', icon: Download },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ReportTab)}
              className={`flex items-center gap-2 pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all ${
                isActive
                  ? 'border-amber-500 text-amber-500 dark:text-amber-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.id === 'reconciliation' && reconciliationData && (
                <span
                  className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                    reconciliationData.mismatchesFound === 0
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                  }`}
                >
                  {reconciliationData.mismatchesFound === 0 ? '100%' : `${reconciliationData.mismatchesFound} DISCREPANCY`}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Global Period Selector Bar (shown for relevant tabs) */}
      {(activeTab === 'executive' || activeTab === 'sales' || activeTab === 'valuation' || activeTab === 'exports') && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Calendar className="h-4 w-4 text-amber-500" />
            <span>Reporting Horizon:</span>
            <span className="text-amber-600 dark:text-amber-400 font-bold">{periodLabel}</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'financial_year', label: 'This FY' },
              { id: 'custom', label: 'Custom' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriodFilter(p.id as PeriodFilter)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  periodFilter === p.id
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}

            {periodFilter === 'custom' && (
              <div className="flex items-center gap-2 ml-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
                <span className="text-xs text-slate-400">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: EXECUTIVE SUMMARY */}
      {/* ========================================================================= */}
      {activeTab === 'executive' && (
        <div className="space-y-6">
          {/* Executive Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Sales Revenue */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Recognized Sales Revenue</span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <ShoppingCart className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {ef ? formatCurrency(ef.salesRevenue.value) : '₹0'}
              </p>
              <div className="flex items-center justify-between mt-3 text-xs">
                <span className="text-slate-500">Prior: {ef ? formatCurrency(ef.salesRevenue.previousValue) : '₹0'}</span>
                {ef && (
                  <span className={`inline-flex items-center gap-1 font-bold ${ef.salesRevenue.deltaPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {ef.salesRevenue.deltaPercent >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                    <span>{Math.abs(ef.salesRevenue.deltaPercent)}%</span>
                  </span>
                )}
              </div>
            </div>

            {/* Cash Collected */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Actual Cash Collected</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <IndianRupee className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {ef ? formatCurrency(ef.cashCollected.value) : '₹0'}
              </p>
              <div className="flex items-center justify-between mt-3 text-xs">
                <span className="text-slate-500">Direct + EMI + Rent</span>
                {ef && (
                  <span className={`inline-flex items-center gap-1 font-bold ${ef.cashCollected.deltaPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {ef.cashCollected.deltaPercent >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                    <span>{Math.abs(ef.cashCollected.deltaPercent)}%</span>
                  </span>
                )}
              </div>
            </div>

            {/* Gross Profit */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Gross Profit (COGS Deducted)</span>
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-black text-slate-900 dark:text-white">
                  {ef ? formatCurrency(ef.grossProfit.value) : '₹0'}
                </p>
                <span className="text-xs font-bold text-amber-500">
                  ({ef?.grossProfit.marginPercent || 0}%)
                </span>
              </div>
              <div className="flex items-center justify-between mt-3 text-xs">
                <span className="text-slate-500">Prior: {ef ? formatCurrency(ef.grossProfit.previousValue) : '₹0'}</span>
                {ef && (
                  <span className={`inline-flex items-center gap-1 font-bold ${ef.grossProfit.deltaPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {ef.grossProfit.deltaPercent >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                    <span>{Math.abs(ef.grossProfit.deltaPercent)}%</span>
                  </span>
                )}
              </div>
            </div>

            {/* Outstanding Receivables */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Outstanding Receivables</span>
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                  <CreditCard className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-purple-600 dark:text-purple-400">
                {ef ? formatCurrency(ef.outstandingReceivables.value) : '₹0'}
              </p>
              <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                <span>EMI Dues: {fh ? formatCurrency(fh.outstandingEmiReceivables) : '₹0'}</span>
                <span>Rent Dues: {fh ? formatCurrency(fh.outstandingRentalReceivables) : '₹0'}</span>
              </div>
            </div>

            {/* Inventory Valuation */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Inventory Value (Purchase Cost)</span>
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                  <Boxes className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {ef ? formatCurrency(ef.inventoryValuationAtCost.value) : '₹0'}
              </p>
              <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                <span>{ih ? `${ih.totalUnitsOwned} Total Units Owned` : '0 Units'}</span>
                <span>{ih ? `${ih.totalAvailableForSale} Avail for Sale` : ''}</span>
              </div>
            </div>

            {/* Net Rental Profit */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Net Rental Operating Profit</span>
                <div className="p-2 rounded-xl bg-pink-500/10 text-pink-500">
                  <Music2 className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-pink-600 dark:text-pink-400">
                {ef ? formatCurrency(ef.netRentalProfit.value) : '₹0'}
              </p>
              <div className="flex items-center justify-between mt-3 text-xs">
                <span className="text-slate-500">Fleet Payback: {rp ? `${rp.fleetCapexRecoveryPercent}%` : '0%'}</span>
                <Badge variant="outline" className="border-pink-500/30 text-pink-500 text-[10px]">
                  Rent - Service
                </Badge>
              </div>
            </div>
          </div>

          {/* Financial Health & Cash Movement Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-base flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-emerald-500" />
                  <span>Cash Movement & Liquidity (Selected Period)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Cash Inflows</span>
                    <p className="text-lg font-black text-emerald-500 mt-1">
                      {fh ? formatCurrency(fh.cashInflows) : '₹0'}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Cash Outflows</span>
                    <p className="text-lg font-black text-rose-500 mt-1">
                      {fh ? formatCurrency(fh.cashOutflows) : '₹0'}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Net Movement</span>
                    <p className={`text-lg font-black mt-1 ${fh && fh.netCashMovement >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {fh ? formatCurrency(fh.netCashMovement) : '₹0'}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs space-y-2">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-slate-700 dark:text-slate-300">Customer Security Deposits Held:</span>
                    <span className="text-amber-500 font-bold">{fh ? formatCurrency(fh.customerDepositsHeld) : '₹0'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Held in trust as Current Liability. Security deposits are strictly excluded from revenue and profit.
                  </p>
                  <div className="flex items-center justify-between font-semibold pt-1 border-t border-amber-500/10">
                    <span className="text-slate-700 dark:text-slate-300">Customer Refunds Payable:</span>
                    <span className="text-rose-500 font-bold">{fh ? formatCurrency(fh.refundsPayable) : '₹0'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 4-Part Inventory & Asset Breakdown */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-base flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-indigo-500" />
                  <span>Inventory & Asset Health (Stock Reconciliation)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Total Owned</span>
                    <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{ih?.totalUnitsOwned ?? 0}</p>
                    <span className="text-[10px] text-slate-400">Company Fleet</span>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Available</span>
                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{ih?.totalAvailableForSale ?? 0}</p>
                    <span className="text-[10px] text-emerald-600/70">Retail Sale</span>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
                    <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase">On Rent</span>
                    <p className="text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5">{ih?.totalUnitsInRental ?? 0}</p>
                    <span className="text-[10px] text-purple-600/70">With Customer</span>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">Maintenance</span>
                    <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{ih?.totalUnitsInMaintenance ?? 0}</p>
                    <span className="text-[10px] text-amber-600/70">Workshop</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500">Potential Retail Valuation:</span>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                      {ih ? formatCurrency(ih.totalPotentialRetailValuation) : '₹0'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500">Estimated Gross Margin:</span>
                    <p className="font-bold text-emerald-500 mt-0.5">
                      {ih ? `${formatCurrency(ih.potentialGrossMargin)} (${ih.potentialMarginPercent}%)` : '0%'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Critical Risk Alerts Register */}
          <Card className="shadow-sm border-l-4 border-l-rose-500">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-rose-500" />
                <span>Executive Risk Register (Needs Immediate Attention)</span>
              </CardTitle>
              <Badge variant="outline" className="border-rose-500/30 text-rose-500 text-xs font-bold">
                {dashboardData?.businessAlerts?.length ?? 0} Alerts Active
              </Badge>
            </CardHeader>
            <CardContent className="p-5">
              {dashboardData?.businessAlerts && dashboardData.businessAlerts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {dashboardData.businessAlerts.map((alert, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={alert.severity === 'critical' ? 'danger' : 'warning'}
                            className="text-[10px] font-extrabold uppercase py-0"
                          >
                            {alert.severity}
                          </Badge>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{alert.title}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{alert.message}</p>
                        {alert.financialExposure > 0 && (
                          <p className="text-xs font-black text-rose-500">
                            Exposure: {formatCurrency(alert.financialExposure)}
                          </p>
                        )}
                      </div>
                      <Link
                        href={alert.deepLink}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500 text-slate-950 hover:bg-amber-600 transition-colors whitespace-nowrap shrink-0"
                      >
                        {alert.actionText || 'Resolve →'}
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-emerald-500 font-semibold flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>No operational risks active. All store and rental accounts are fully verified.</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SALES & COLLECTIONS */}
      {/* ========================================================================= */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          {/* Sales KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Sales Invoiced</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {ef ? formatCurrency(ef.salesRevenue.value) : '₹0'}
              </p>
              <p className="text-xs text-slate-500 mt-1">Excludes cancelled & returned orders</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Cash Realized from Sales</span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {ef ? formatCurrency(ef.cashCollected.value) : '₹0'}
              </p>
              <p className="text-xs text-slate-500 mt-1">Direct Sales + EMI receipts</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Outstanding EMI Receivables</span>
              <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                {fh ? formatCurrency(fh.outstandingEmiReceivables) : '₹0'}
              </p>
              <p className="text-xs text-slate-500 mt-1">Remaining customer installment dues</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Gross Profit on Sales</span>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  {ef ? formatCurrency(ef.grossProfit.value) : '₹0'}
                </p>
                <span className="text-xs font-bold text-amber-500">({ef?.grossProfit.marginPercent || 0}%)</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Revenue minus line-item COGS</p>
            </div>
          </div>

          {/* Sales Performance by Employee & Top Products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm">
              <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-amber-500" />
                  <span>Sales Volume by Staff Member</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="responsive-table-wrapper">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase">
                        <th className="py-2.5 px-4">Staff Member</th>
                        <th className="py-2.5 px-4 text-center">Orders</th>
                        <th className="py-2.5 px-4 text-right">Total Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {salesByEmployee.map((emp, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                          <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">{emp.name}</td>
                          <td className="py-2.5 px-4 text-center">{emp.salesCount}</td>
                          <td className="py-2.5 px-4 text-right font-black text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(emp.revenue)}
                          </td>
                        </tr>
                      ))}
                      {salesByEmployee.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-4 text-center text-slate-400">No recorded sales transactions.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-base flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-blue-500" />
                  <span>Top-Selling Products (Velocity & Margin)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="responsive-table-wrapper">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase">
                        <th className="py-2.5 px-4">Product</th>
                        <th className="py-2.5 px-4 text-center">Qty Sold</th>
                        <th className="py-2.5 px-4 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {(periodicData?.topProducts || []).map((prod: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                          <td className="py-2.5 px-4">
                            <p className="font-bold text-slate-900 dark:text-white">{prod.name}</p>
                            <p className="font-mono text-[10px] text-slate-400">{prod.sku}</p>
                          </td>
                          <td className="py-2.5 px-4 text-center font-bold">{prod.quantity}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(prod.revenue)}
                          </td>
                        </tr>
                      ))}
                      {(!periodicData?.topProducts || periodicData.topProducts.length === 0) && (
                        <tr>
                          <td colSpan={3} className="py-4 text-center text-slate-400">No top products recorded.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sales Transactions Ledger */}
          <Card className="shadow-sm">
            <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base">Recent Sales & Collections Ledger</CardTitle>
                <p className="text-xs text-slate-500">Live invoices with payment method and settlement status</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search invoices, customers..."
                    value={salesSearch}
                    onChange={(e) => setSalesSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(getApiUrl('/reports/export/sales'), '_blank')}
                  className="gap-1 text-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>CSV</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="responsive-table-wrapper max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Invoice #</th>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Customer</th>
                      <th className="py-2.5 px-4">Payment Method</th>
                      <th className="py-2.5 px-4 text-right">Grand Total</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                      <th className="py-2.5 px-4">Salesperson</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {filteredSalesLedger.map((s: any) => (
                      <tr key={s._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="py-2.5 px-4 font-mono font-bold text-amber-500">{s.invoiceNumber}</td>
                        <td className="py-2.5 px-4 text-slate-500">{formatDate(s.createdAt)}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">{s.customerName}</td>
                        <td className="py-2.5 px-4">
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {s.paymentMethod} {s.isEmi ? '(EMI)' : ''}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4 text-right font-black text-slate-900 dark:text-white">
                          {formatCurrency(s.grandTotal)}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <Badge
                            variant={s.paymentStatus === 'PAID' ? 'success' : s.paymentStatus === 'PARTIAL' ? 'warning' : 'danger'}
                            className="text-[10px] font-bold"
                          >
                            {s.paymentStatus}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4 text-slate-500">{s.soldBy?.name || 'Staff'}</td>
                      </tr>
                    ))}
                    {filteredSalesLedger.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-400">No matching sales records.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: RENTAL PROFITABILITY & ASSET RECOVERY */}
      {/* ========================================================================= */}
      {activeTab === 'rentals' && (
        <div className="space-y-6">
          {/* Rental Fleet KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Rent Income Collected</span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {rentalData ? formatCurrency(rentalData.kpis.totalRentalRevenueCollected) : '₹0'}
              </p>
              <p className="text-xs text-slate-500 mt-1">Excludes security deposits held</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Net Operating Rental Profit</span>
              <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                {rentalData ? formatCurrency(rentalData.kpis.netRentalProfit) : '₹0'}
              </p>
              <p className="text-xs text-slate-500 mt-1">Rent Collected - Maint Expenses</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Fleet Capex Recovery Rate</span>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-2xl font-black text-amber-500">
                  {rentalData ? `${rentalData.kpis.portfolioRoiPercent}%` : '0%'}
                </p>
                <span className="text-xs text-slate-400">of ₹{rentalData ? rentalData.kpis.totalAssetInvestmentCost?.toLocaleString('en-IN') : 0} Capex</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {rentalData?.kpis.capitalRecoveredCount ?? 0} Assets Fully Recouped
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Rental Receivables & Dues</span>
              <p className="text-2xl font-black text-rose-500 mt-1">
                {rentalData ? formatCurrency(rentalData.kpis.totalRentalDue) : '₹0'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Security Deposits Held: {rentalData ? formatCurrency(rentalData.kpis.totalSecurityDepositsHeld) : '₹0'}
              </p>
            </div>
          </div>

          {/* Instrument Level Fleet Breakdown */}
          <Card className="shadow-sm">
            <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base">Rental Fleet Asset Performance & Payback</CardTitle>
                <p className="text-xs text-slate-500">Track capital recovery and net yield per issued instrument</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search instrument, customer, ref..."
                    value={rentalSearch}
                    onChange={(e) => setRentalSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                  />
                </div>
                <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 p-1 text-xs">
                  {['ALL', 'ACTIVE', 'OVERDUE', 'RETURNED'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setRentalStatusFilter(st as any)}
                      className={`px-2.5 py-1 rounded font-bold transition-all ${
                        rentalStatusFilter === st
                          ? 'bg-purple-500 text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(getApiUrl('/reports/export/rentals'), '_blank')}
                  className="gap-1 text-xs"
                >
                  <Download className="h-3.5 w-3.5 text-purple-500" />
                  <span>CSV</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="responsive-table-wrapper max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Agreement Ref</th>
                      <th className="py-2.5 px-4">Instrument & Serial</th>
                      <th className="py-2.5 px-4">Customer</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                      <th className="py-2.5 px-4 text-right">Monthly Rent</th>
                      <th className="py-2.5 px-4 text-right">Rent Collected</th>
                      <th className="py-2.5 px-4 text-right">Capex Cost</th>
                      <th className="py-2.5 px-4 text-right">Net Profit</th>
                      <th className="py-2.5 px-4 text-center">Recovery %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {filteredRentals.map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="py-2.5 px-4 font-mono font-bold text-amber-500">{r.issueReference}</td>
                        <td className="py-2.5 px-4">
                          <p className="font-bold text-slate-900 dark:text-white">{r.productName}</p>
                          <p className="font-mono text-[10px] text-slate-400">
                            {r.assetId || r.serialNumber || r.sku}
                          </p>
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">{r.customerName}</td>
                        <td className="py-2.5 px-4 text-center">
                          <Badge
                            variant={r.status === 'ACTIVE' ? 'success' : r.status === 'OVERDUE' ? 'danger' : 'outline'}
                            className="text-[10px] font-bold"
                          >
                            {r.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4 text-right font-semibold">{formatCurrency(r.monthlyRent)}</td>
                        <td className="py-2.5 px-4 text-right font-black text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(r.totalRentPaid)}
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-500">{formatCurrency(r.purchaseCost)}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-purple-600 dark:text-purple-400">
                          {formatCurrency(r.netProfit)}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-[11px] font-black ${r.isCapexRecovered ? 'text-emerald-500' : 'text-amber-500'}`}>
                              {r.recoveryPercent}%
                            </span>
                            <div className="w-14 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${r.isCapexRecovered ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                style={{ width: `${Math.min(100, r.recoveryPercent)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredRentals.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-6 text-center text-slate-400">No matching rental agreements.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: INVENTORY VALUATION & STOCK HEALTH */}
      {/* ========================================================================= */}
      {activeTab === 'valuation' && (
        <div className="space-y-6">
          {/* Valuation KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Inventory Value (At Cost)</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {valuationData ? formatCurrency(valuationData.totals.totalValuationCost) : '₹0'}
              </p>
              <p className="text-xs text-slate-500 mt-1">Based on purchase cost</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Potential Retail Valuation</span>
              <p className="text-2xl font-black text-amber-500 mt-1">
                {valuationData ? formatCurrency(valuationData.totals.totalPotentialRetail) : '₹0'}
              </p>
              <p className="text-xs text-slate-500 mt-1">At default retail selling price</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Estimated Gross Margin</span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {valuationData ? formatCurrency(valuationData.totals.totalPotentialMargin) : '₹0'}
              </p>
              <p className="text-xs text-slate-500 mt-1">Unrealized retail profit upside</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Reconciled Fleet Units</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {valuationData?.totals.totalOnHand ?? 0} Units
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {ih ? `${ih.totalAvailableForSale} Avail | ${ih.totalUnitsInRental} Rented | ${ih.totalUnitsInMaintenance} Maint` : ''}
              </p>
            </div>
          </div>

          {/* Product Valuation Table */}
          <Card className="shadow-sm">
            <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base">Product-Level Valuation & Stock Balance</CardTitle>
                <p className="text-xs text-slate-500">Catalog cost, retail value, and operational status</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search product, SKU, category..."
                    value={valuationSearch}
                    onChange={(e) => setValuationSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(getApiUrl('/reports/export/products'), '_blank')}
                  className="gap-1 text-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>CSV</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="responsive-table-wrapper max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Product Name</th>
                      <th className="py-2.5 px-4">SKU</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4 text-center">On-Hand</th>
                      <th className="py-2.5 px-4 text-center">Available</th>
                      <th className="py-2.5 px-4 text-right">Unit Cost</th>
                      <th className="py-2.5 px-4 text-right">Unit Retail</th>
                      <th className="py-2.5 px-4 text-right">Total Cost Value</th>
                      <th className="py-2.5 px-4 text-right">Potential Retail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {filteredValuation.map((item: any) => (
                      <tr key={item.productId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">{item.name}</td>
                        <td className="py-2.5 px-4 font-mono text-amber-500">{item.sku}</td>
                        <td className="py-2.5 px-4 text-slate-500">{item.category}</td>
                        <td className="py-2.5 px-4 text-center font-bold text-slate-900 dark:text-white">{item.onHand}</td>
                        <td className="py-2.5 px-4 text-center">
                          <span className={`font-bold ${item.available > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {item.available}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-500">{formatCurrency(item.unitCost)}</td>
                        <td className="py-2.5 px-4 text-right text-slate-500">{formatCurrency(item.unitPrice)}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                          {formatCurrency(item.valuationCost)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-black text-amber-500">
                          {formatCurrency(item.potentialRetail)}
                        </td>
                      </tr>
                    ))}
                    {filteredValuation.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-6 text-center text-slate-400">No matching products found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: FINANCIAL RECONCILIATION & AUDIT */}
      {/* ========================================================================= */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-6">
          {/* Header Banner with EXACT compliance status - NEVER FALSE 100% */}
          <Card
            className={`shadow-sm border-l-4 ${
              reconciliationData?.isFullyCompliant
                ? 'border-l-emerald-500'
                : 'border-l-rose-500'
            }`}
          >
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-blue-500" />
                    <span>Invariant Ledger Integrity Audit</span>
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-1">
                    Recalculates all immutable stock movements from Genesis and validates them against catalog balances and physical serial registers.
                  </p>
                </div>
                {/* Fixed compliance badge: NEVER displays 100% when mismatches exist */}
                <Badge
                  variant={reconciliationData?.isFullyCompliant ? 'success' : 'danger'}
                  className="font-black text-xs px-3 py-1 uppercase tracking-wider"
                >
                  {reconciliationData?.isFullyCompliant
                    ? '100% Invariant Compliant'
                    : `${reconciliationData?.compliancePercentage || 0}% Compliant (${reconciliationData?.mismatchesFound || 0} Discrepancies)`}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500">Audit Timestamp:</span>
                  <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                    {reconciliationData?.timestamp ? formatDateTime(reconciliationData.timestamp) : 'Just now'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Products Audited:</span>
                  <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                    {reconciliationData?.totalProductsChecked ?? 0}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Verified Compliant:</span>
                  <div className="font-bold text-emerald-500 mt-0.5">
                    {reconciliationData
                      ? `${reconciliationData.totalProductsChecked - reconciliationData.mismatchesFound} Products`
                      : '0'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Ledger Discrepancies:</span>
                  <div
                    className={`font-black mt-0.5 ${
                      reconciliationData?.mismatchesFound === 0 ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {reconciliationData?.mismatchesFound ?? 0} Mismatches Found
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schedule Reconciliations (Sales Schedule & Rental Schedule) */}
          {reconciliationData?.financialReconciliation && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sales Schedule Reconciliation */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-amber-500" />
                    <span>Sales & Collections Schedule Reconciliation</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Total Completed Sales Transactions:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {reconciliationData.financialReconciliation.salesSchedule.totalSalesCount}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Recognized Sales Revenue:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatCurrency(reconciliationData.financialReconciliation.salesSchedule.recognizedSalesRevenue)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Direct Sales Liquid Cash Collected:</span>
                    <span className="font-bold text-emerald-500">
                      {formatCurrency(reconciliationData.financialReconciliation.salesSchedule.directSalesCashCollected)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">EMI Down Payments Collected:</span>
                    <span className="font-bold text-emerald-500">
                      {formatCurrency(reconciliationData.financialReconciliation.salesSchedule.emiDownPaymentsCollected)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">EMI Installments Collected:</span>
                    <span className="font-bold text-emerald-500">
                      {formatCurrency(reconciliationData.financialReconciliation.salesSchedule.emiInstallmentsCollected)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Outstanding EMI Receivables:</span>
                    <span className="font-bold text-purple-500">
                      {formatCurrency(reconciliationData.financialReconciliation.salesSchedule.outstandingEmiReceivables)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 font-bold bg-slate-50 dark:bg-slate-950 px-2 rounded-lg">
                    <span>Unreconciled Revenue Variance:</span>
                    <span
                      className={
                        reconciliationData.financialReconciliation.salesSchedule.unreconciledRevenueVariance === 0
                          ? 'text-emerald-500'
                          : 'text-rose-500'
                      }
                    >
                      {formatCurrency(reconciliationData.financialReconciliation.salesSchedule.unreconciledRevenueVariance)} (0 Variance = Perfect Balance)
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Rental Schedule Reconciliation */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Music2 className="h-4 w-4 text-purple-500" />
                    <span>Rental Agreements & Trust Escrow Reconciliation</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Active Rental Agreements:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {reconciliationData.financialReconciliation.rentalSchedule.activeAgreementsCount}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Rent Income Realized:</span>
                    <span className="font-bold text-emerald-500">
                      {formatCurrency(reconciliationData.financialReconciliation.rentalSchedule.rentCollected)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Outstanding Rental Subscription Receivables:</span>
                    <span className="font-bold text-rose-500">
                      {formatCurrency(reconciliationData.financialReconciliation.rentalSchedule.outstandingRentReceivables)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Customer Security Deposits Held in Trust:</span>
                    <span className="font-bold text-amber-500">
                      {formatCurrency(reconciliationData.financialReconciliation.rentalSchedule.depositsHeldInTrust)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Customer Refund Liabilities Payable:</span>
                    <span className="font-bold text-rose-500">
                      {formatCurrency(reconciliationData.financialReconciliation.rentalSchedule.refundLiabilitiesPayable)}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-semibold mt-1">
                    ✓ Escrow Invariant Verified: Customer deposits held are strictly isolated from operational revenue.
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Audit Results Table */}
          <Card className="shadow-sm">
            <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base">Ledger Invariant Audit Log</CardTitle>
                <p className="text-xs text-slate-500">Catalog on-hand vs Genesis transaction sum with corrective actions</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 p-1 text-xs">
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
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Discrepancies Only ({reconciliationData?.mismatchesFound ?? 0})
                  </button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(getApiUrl('/reports/export/reconciliation'), '_blank')}
                  className="gap-1 text-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>CSV</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="responsive-table-wrapper max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Product Name</th>
                      <th className="py-2.5 px-4">SKU</th>
                      <th className="py-2.5 px-4 text-center">Catalog On-Hand</th>
                      <th className="py-2.5 px-4 text-center">Calculated from Ledger</th>
                      <th className="py-2.5 px-4 text-center">Physical Count</th>
                      <th className="py-2.5 px-4 text-center">Variance</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                      <th className="py-2.5 px-4">Recommended Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {filteredReconciliation.map((res: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">{res.productName}</td>
                        <td className="py-2.5 px-4 font-mono text-amber-500">{res.sku}</td>
                        <td className="py-2.5 px-4 text-center font-bold">{res.recordedOnHand}</td>
                        <td className="py-2.5 px-4 text-center font-bold text-indigo-500">{res.calculatedOnHand}</td>
                        <td className="py-2.5 px-4 text-center text-slate-500">
                          {res.serializedPhysicalCount !== undefined ? res.serializedPhysicalCount : 'N/A'}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span
                            className={`font-black ${
                              res.variance === 0 ? 'text-emerald-500' : 'text-rose-500'
                            }`}
                          >
                            {res.variance === 0 ? '0' : res.variance > 0 ? `+${res.variance}` : res.variance}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {res.status === 'MATCH' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-500 text-xs font-bold">
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Verified</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-500 text-xs font-bold">
                              <AlertTriangle className="h-4 w-4" />
                              <span>Mismatch</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300 text-[11px]">
                          {res.recommendedAction}
                        </td>
                      </tr>
                    ))}
                    {filteredReconciliation.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-slate-400">
                          {reconciliationFilter === 'MISMATCHES'
                            ? 'All products are 100% invariant compliant. Zero mismatches found.'
                            : 'No product records found.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: EXPORTS & DISPATCH CENTER */}
      {/* ========================================================================= */}
      {activeTab === 'exports' && (
        <div className="space-y-6">
          {/* Status Feedback Banner */}
          {emailStatusMessage && (
            <div
              className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-xs font-semibold ${
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

          {/* Download Center Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Executive PDF */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
                    <FileText className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="border-rose-500/30 text-rose-500 text-[10px] uppercase font-bold">
                    PDF Document
                  </Badge>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Executive BI Briefing</h3>
                <p className="text-xs text-slate-500 mt-1">
                  High-resolution executive PDF briefing containing financial performance, cash movement, asset reconciliation, and risk register.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePdfExport}
                className="w-full mt-4 gap-2 text-xs font-bold text-rose-500 border-rose-500/30 hover:bg-rose-500/10"
              >
                <Download className="h-4 w-4" />
                <span>Generate PDF Briefing</span>
              </Button>
            </div>

            {/* Executive CSV */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 text-[10px] uppercase font-bold">
                    Executive CSV
                  </Badge>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Executive Financials Dataset</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Reconciled KPIs with prior period comparisons, percentages, and strict accounting basis definitions.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(getApiUrl(`/reports/export/executive?startDate=${startDate?.toISOString() || ''}&endDate=${endDate?.toISOString() || ''}`), '_blank')}
                className="w-full mt-4 gap-2 text-xs font-bold text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
              >
                <Download className="h-4 w-4" />
                <span>Export Executive CSV</span>
              </Button>
            </div>

            {/* Rental Profitability CSV */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
                    <Music2 className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="border-purple-500/30 text-purple-500 text-[10px] uppercase font-bold">
                    Rental Fleet CSV
                  </Badge>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Rental Profitability & Capex</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Asset-level rental income, maintenance expenses, capital recovery %, and payback periods.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(getApiUrl('/reports/export/rentals'), '_blank')}
                className="w-full mt-4 gap-2 text-xs font-bold text-purple-500 border-purple-500/30 hover:bg-purple-500/10"
              >
                <Download className="h-4 w-4" />
                <span>Export Rental CSV</span>
              </Button>
            </div>

            {/* Inventory Valuation CSV */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500">
                    <Boxes className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="border-indigo-500/30 text-indigo-500 text-[10px] uppercase font-bold">
                    Stock Valuation
                  </Badge>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Inventory Valuation Dataset</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Catalog quantities on-hand, available, unit purchase cost, potential retail price, and gross margins.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(getApiUrl('/reports/export/products'), '_blank')}
                className="w-full mt-4 gap-2 text-xs font-bold text-indigo-500 border-indigo-500/30 hover:bg-indigo-500/10"
              >
                <Download className="h-4 w-4" />
                <span>Export Valuation CSV</span>
              </Button>
            </div>

            {/* Ledger Reconciliation CSV */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="border-blue-500/30 text-blue-500 text-[10px] uppercase font-bold">
                    Audit Log
                  </Badge>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Ledger Reconciliation Audit</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Full product audit log with recorded balances, calculated sums, variances, and corrective actions.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(getApiUrl('/reports/export/reconciliation'), '_blank')}
                className="w-full mt-4 gap-2 text-xs font-bold text-blue-500 border-blue-500/30 hover:bg-blue-500/10"
              >
                <Download className="h-4 w-4" />
                <span>Export Audit CSV</span>
              </Button>
            </div>

            {/* Sales & Orders CSV */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                    <ShoppingCart className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="border-amber-500/30 text-amber-500 text-[10px] uppercase font-bold">
                    Sales Ledger
                  </Badge>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Sales & Collections Ledger</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Completed customer sales, invoice numbers, payment methods, customer names, and salesperson attribution.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(getApiUrl('/reports/export/sales'), '_blank')}
                className="w-full mt-4 gap-2 text-xs font-bold text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
              >
                <Download className="h-4 w-4" />
                <span>Export Sales CSV</span>
              </Button>
            </div>
          </div>

          {/* Interactive Send Email Report Console */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2 text-slate-900 dark:text-white">
                    <Mail className="h-5 w-5 text-amber-500" />
                    <span>Executive Email Dispatch Service</span>
                  </CardTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Dispatch verified financial statements and operational reports directly to executive recipients via Gmail SMTP.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 w-fit">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>SMTP Active (hustlerxeroindia@gmail.com)</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-6">
              {/* Recipient */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Send className="h-3.5 w-3.5 text-amber-500" />
                  <span>Recipient Email Address *</span>
                </label>
                <input
                  type="email"
                  placeholder="Enter recipient email (e.g. ceo@stereobliss.com)"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              {/* Report Type */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>Select Report Type</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { id: 'RENTAL_PROFITABILITY_REPORT', title: 'Rental Profitability & Fleet Yield', desc: 'Rent collected, capex recovery %, active fleet performance' },
                    { id: 'DAILY_STOCK_SUMMARY', title: 'Daily Stock & Asset Summary', desc: 'Units on hand, available for sale, valuation at cost' },
                    { id: 'WEEKLY_SALES_SUMMARY', title: 'Weekly Sales Performance', desc: 'Recognized revenue, completed orders, payment methods' },
                  ].map((rep) => (
                    <button
                      key={rep.id}
                      type="button"
                      onClick={() => setSelectedReportType(rep.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        selectedReportType === rep.id
                          ? 'border-amber-500 bg-amber-500/10 text-slate-900 dark:text-white shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <p className="text-xs font-bold">{rep.title}</p>
                      <p className="text-[11px] text-slate-400 mt-1">{rep.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <Button
                variant="default"
                size="default"
                onClick={handleSendEmailReport}
                disabled={isSendingEmail}
                className="gap-2 font-bold bg-amber-500 hover:bg-amber-600 text-slate-950"
              >
                <Send className="h-4 w-4" />
                <span>{isSendingEmail ? 'Dispatching...' : 'Dispatch Email Report Now'}</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
