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
} from 'lucide-react';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'valuation' | 'reconciliation' | 'emailReports'>('valuation');

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
  }, [activeTab]);

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'valuation') {
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Reporting & Audit Center
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Valuation reports, inventory ledger reconciliation audits, and automated email reporting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'valuation' && (
            <Button
              variant="outline"
              size="sm"
              onClick={exportValuationCsv}
              className="gap-1.5 text-xs"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
              <span>Export CSV</span>
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={fetchReportData} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
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
          <span>Automated Email Reports & Delivery</span>
        </button>
      </div>

      {/* Tab 1: Valuation */}
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
                  Potential Retail Value
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(valuationData?.totals?.totalPotentialRetail ?? 0)}
                </div>
                <p className="text-xs text-slate-500 mt-1">At default catalog selling prices</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-indigo-500">
              <CardHeader className="pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Potential Gross Margin
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(valuationData?.totals?.totalPotentialMargin ?? 0)}
                </div>
                <p className="text-xs text-slate-500 mt-1">Potential retail margin before taxes</p>
              </CardContent>
            </Card>
          </div>

          {/* Product-wise valuation table */}
          <Card>
            <CardContent className="p-0">
              <div className="responsive-table-wrapper">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Product / SKU</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Tracking Mode</th>
                      <th className="py-3 px-4 text-center">On Hand</th>
                      <th className="py-3 px-4 text-right">Unit Cost</th>
                      <th className="py-3 px-4 text-right">Unit Price</th>
                      <th className="py-3 px-4 text-right">Total Cost Value</th>
                      <th className="py-3 px-4 text-right">Potential Retail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {valuationData?.items?.map((item) => (
                      <tr key={item.productId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">{item.name}</div>
                          <div className="font-mono text-[11px] text-amber-500">{item.sku}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {item.category}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{item.trackingMode}</Badge>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-white">
                          {item.onHand}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-500">
                          {formatCurrency(item.unitCost)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-amber-500">
                          {formatCurrency(item.valuationCost)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-500">
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

      {/* Tab 2: Reconciliation */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Independent Stock Ledger Integrity Audit
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Calculates cumulative delta of all immutable movements and compares against stored on-hand balances.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Badge
                variant={
                  reconciliationData?.mismatchesFound === 0 ? 'success' : 'danger'
                }
                className="text-xs font-bold py-1 px-3"
              >
                {reconciliationData?.mismatchesFound === 0
                  ? '✅ 100% Reconciled (No Discrepancies)'
                  : `⚠️ ${reconciliationData?.mismatchesFound} Discrepancy Found`}
              </Badge>
              <Button size="sm" variant="default" onClick={fetchReportData} className="text-xs font-bold">
                Run Audit Now
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="responsive-table-wrapper">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Product / SKU</th>
                      <th className="py-3 px-4">Tracking Mode</th>
                      <th className="py-3 px-4 text-center">Recorded Balance</th>
                      <th className="py-3 px-4 text-center">Ledger Derived Sum</th>
                      <th className="py-3 px-4 text-center">Physical Serials Count</th>
                      <th className="py-3 px-4 text-center">Discrepancy Delta</th>
                      <th className="py-3 px-4 text-center">Audit Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {reconciliationData?.results?.map((res) => (
                      <tr key={res.productId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {res.productName}
                          </div>
                          <div className="font-mono text-[11px] text-amber-500">{res.sku}</div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{res.trackingMode}</Badge>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-white">
                          {res.recordedOnHand}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-amber-500">
                          {res.calculatedFromLedger}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400">
                          {res.serializedPhysicalCount !== undefined
                            ? res.serializedPhysicalCount
                            : 'N/A (Bulk)'}
                        </td>
                        <td className="py-3 px-4 text-center font-bold">
                          {res.discrepancyDelta === 0 ? (
                            <span className="text-emerald-500">0</span>
                          ) : (
                            <span className="text-rose-500 font-extrabold">{res.discrepancyDelta}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {res.hasMismatch ? (
                            <Badge variant="danger" className="text-[10px]">
                              Mismatch
                            </Badge>
                          ) : (
                            <Badge variant="success" className="text-[10px]">
                              Verified
                            </Badge>
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

      {/* Tab 3: Email Reports & Schedules */}
      {activeTab === 'emailReports' && (
        <div className="space-y-6">
          {emailStatusMessage && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs font-semibold text-amber-700 dark:text-amber-400">
              {emailStatusMessage}
            </div>
          )}

          {/* Quick Manual Trigger Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Daily Stock Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-slate-500">
                  Sends current total stock, available quantities, low-stock alerts, and valuations.
                </p>
                <Button
                  size="sm"
                  variant="default"
                  isLoading={isSendingEmail}
                  onClick={() => handleTriggerEmail('summary')}
                  className="w-full text-xs font-bold"
                >
                  <Send className="mr-2 h-3.5 w-3.5" />
                  <span>Send Stock Summary</span>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Overdue Loan Reminders</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-slate-500">
                  Scans academy loans and alerts managers about equipment past expected return date.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  isLoading={isSendingEmail}
                  onClick={() => handleTriggerEmail('overdue')}
                  className="w-full text-xs font-bold"
                >
                  <Send className="mr-2 h-3.5 w-3.5" />
                  <span>Send Overdue Alerts</span>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Test Email Integration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-slate-500">
                  Sends a test notification to verify transactional email delivery logging.
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  isLoading={isSendingEmail}
                  onClick={() => handleTriggerEmail('test')}
                  className="w-full text-xs font-bold"
                >
                  <Send className="mr-2 h-3.5 w-3.5" />
                  <span>Send Test Email</span>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Delivery Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Email Dispatch Delivery Logs</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="responsive-table-wrapper">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Report Type</th>
                      <th className="py-3 px-4">Recipients</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Provider Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {emailLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500">
                          No email dispatches recorded yet. Click one of the buttons above to test.
                        </td>
                      </tr>
                    ) : (
                      emailLogs.map((log) => (
                        <tr key={log._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                            {formatDateTime(log.createdAt)}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                            {log.reportType}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                            {log.recipients?.join(', ')}
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                            {log.subject}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={
                                log.status === 'SENT'
                                  ? 'success'
                                  : log.status === 'SIMULATED'
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
