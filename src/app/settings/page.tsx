'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useSettings } from '@/context/SettingsContext';
import { ProductExcelImporter } from '@/components/inventory/ProductExcelImporter';
import {
  Settings,
  Save,
  Sun,
  Moon,
  Database,
  Building2,
  Receipt,
  FileSpreadsheet,
  Mail,
  CheckCircle2,
  Send,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  FileText,
  BadgeCheck,
  Zap,
  Server,
} from 'lucide-react';

interface EmailEngineStatus {
  activeEngine: 'RESEND' | 'NODEMAILER' | 'SIMULATED';
  resend: {
    configured: boolean;
    apiKeyMasked: string | null;
    dailyQuota: number;
    usedToday: number;
    remainingToday: number;
    quotaExhausted: boolean;
    exhaustedReason?: string;
    lastFailoverAt?: string;
  };
  nodemailer: {
    configured: boolean;
    transportType: string;
    host: string;
    userMasked: string | null;
  };
}

interface SystemInfo {
  counts: {
    products: number;
    serializedItems: number;
    purchases: number;
    receipts: number;
    sales: number;
    movements: number;
    users: number;
  };
}

export default function SettingsPage() {
  const { canManageSettings, isSuperAdmin } = useAuth();
  const { theme, setTheme } = useTheme();
  const { updateSettings } = useSettings();

  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Customer Email Notification Test State
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);
  const [emailStatus, setEmailStatus] = useState<EmailEngineStatus | null>(null);

  // Form states - Organization & Store Details
  const [companyName, setCompanyName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeCode, setStoreCode] = useState('CENTRAL');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [stateName, setStateName] = useState('Maharashtra');
  const [stateCode, setStateCode] = useState('27');
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const [threshold, setThreshold] = useState('3');
  const [lowStockDefault, setLowStockDefault] = useState('5');
  const [timeZone, setTimeZone] = useState('Asia/Kolkata');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const [setRes, sysRes, emailRes] = await Promise.all([
        api.get<{ setting: any; defaultLocation?: any }>('/meta/settings'),
        api.get<SystemInfo>('/meta/system-info').catch(() => null),
        api.get<EmailEngineStatus>('/reports/email-status').catch(() => null),
      ]);

      if (emailRes) setEmailStatus(emailRes);
      const s = setRes?.setting;
      const loc = setRes?.defaultLocation;

      if (s) {
        const cName = s.companyName && !/soundstock|muziclub/i.test(s.companyName) ? s.companyName : 'Stereobliss Retail';
        const stName =
          s.storeName && !/central studio|academy/i.test(s.storeName)
            ? s.storeName
            : loc?.name && !/central studio|academy/i.test(loc.name)
            ? loc.name
            : 'Stereobliss Central Store';
        const addr =
          s.address && !/central studio/i.test(s.address)
            ? s.address
            : loc?.address && !/central studio/i.test(loc.address)
            ? loc.address
            : '';

        setCompanyName(cName);
        setStoreName(stName);
        setStoreCode(s.storeCode || loc?.code || 'CENTRAL');
        setContactEmail(s.contactEmail || '');
        setContactPhone(s.contactPhone || '');
        setAddress(addr);
        setGstin(s.gstin || '');
        setStateName(s.stateName || 'Maharashtra');
        setStateCode(s.stateCode || '27');
        setCurrencySymbol(s.currencySymbol || '₹');
        setThreshold(String(s.managerApprovalThresholdValue ?? 3));
        setLowStockDefault(String(s.lowStockAlertThresholdDefault ?? 5));
        setTimeZone(s.timeZone || 'Asia/Kolkata');
      }

      if (sysRes) {
        setSystemInfo(sysRes);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage('');

    try {
      await updateSettings({
        companyName: companyName.trim(),
        storeName: storeName.trim(),
        storeCode: storeCode.trim().toUpperCase(),
        contactEmail: contactEmail.trim().toLowerCase(),
        contactPhone: contactPhone.trim(),
        address: address.trim(),
        gstin: gstin.trim().toUpperCase(),
        stateName: stateName.trim(),
        stateCode: stateCode.trim(),
        currencySymbol: currencySymbol.trim(),
        managerApprovalThresholdValue: parseInt(threshold, 10) || 3,
        lowStockAlertThresholdDefault: parseInt(lowStockDefault, 10) || 5,
        timeZone,
      });

      setMessage('✅ Organization, GST & Store Details successfully updated across the system.');
      await fetchSettings();
    } catch (err: any) {
      setMessage(`❌ Error saving settings: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailRecipient || !testEmailRecipient.includes('@')) {
      setTestEmailResult({ success: false, message: 'Please enter a valid recipient email address (e.g. yourname@domain.com).' });
      return;
    }
    setIsSendingTestEmail(true);
    setTestEmailResult(null);
    try {
      const res = await api.post<{ success: boolean; message?: string; data?: any }>('/reports/email-test', {
        recipientEmail: testEmailRecipient.trim(),
      });
      const provider = res?.data?.provider || 'RESEND';
      const failoverFrom = res?.data?.failoverFrom;
      const engineNote = failoverFrom
        ? `Delivered via Nodemailer SMTP (Auto-Failover from Resend: ${res?.data?.failoverReason || 'Quota reached'})`
        : provider === 'RESEND'
        ? `Delivered via Resend API (Primary Engine)`
        : provider === 'NODEMAILER'
        ? `Delivered via Nodemailer SMTP`
        : `Delivered via Simulated Engine`;

      setTestEmailResult({
        success: true,
        message: `✅ Test email successfully dispatched to ${testEmailRecipient.trim()}! [${engineNote}]`,
      });

      // Refresh live email status
      api.get<EmailEngineStatus>('/reports/email-status').then((s) => s && setEmailStatus(s)).catch(() => {});
    } catch (err: any) {
      setTestEmailResult({
        success: false,
        message: `❌ Delivery failed: ${err.message || 'Please verify email configuration in backend environment.'}`,
      });
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <Settings className="h-6 w-6 text-amber-500" />
          <span>System Configuration &amp; Product Intake Settings</span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {isSuperAdmin()
            ? 'Manage your organization identity, retail store details, GST tax identification, and bulk product catalog Excel intake.'
            : 'Manage bulk product catalog Excel intake and personalize workspace display appearance.'}
        </p>
      </div>

      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
        <span>
          <strong>Operational Access:</strong>{' '}
          {isSuperAdmin()
            ? 'Superadmins can configure store details, tax identification (GSTIN), and bulk product catalog imports.'
            : 'Managers can perform bulk product catalog Excel imports and customize workspace display theme.'}
        </span>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-semibold border flex items-center justify-between ${
            message.startsWith('✅')
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
          }`}
        >
          <span>{message}</span>
          <button
            type="button"
            onClick={() => setMessage('')}
            className="text-xs opacity-70 hover:opacity-100 underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Bulk Product Catalog Excel Importer (Available to BOTH Superadmin & Manager) */}
      <ProductExcelImporter />

      {/* Customer Automated Email Notifications & System Dispatch (Available to BOTH Superadmin & Manager) */}
      <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80 bg-gradient-to-r from-slate-50 via-amber-500/5 to-slate-50 dark:from-slate-900 dark:via-amber-500/10 dark:to-slate-900">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2.5 text-slate-900 dark:text-white">
              <div className="h-8 w-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold">Customer Automated Email Communication Suite</span>
                <div className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                  Executive, branded customer emails dispatched automatically across all sales, rentals, returns, and payment milestones.
                </div>
              </div>
            </CardTitle>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 self-start sm:self-auto">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>All 8 Channels Active</span>
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-6">
          {/* Dual-Engine Architecture Status Bar */}
          <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                  Dual-Engine Email Router Architecture
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  Primary: Resend API
                </span>
                <span className="text-slate-400 text-xs">→</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Auto-Failover: Nodemailer SMTP
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Resend Engine Status Card */}
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Resend API (Primary)</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    emailStatus?.resend.quotaExhausted
                      ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                      : emailStatus?.resend.configured
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}>
                    {emailStatus?.resend.quotaExhausted
                      ? 'Daily Limit Reached'
                      : emailStatus?.resend.configured
                      ? 'Active & Fast'
                      : 'Ready for API Key'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Daily Free Quota: <strong>{emailStatus?.resend.usedToday ?? 0} / {emailStatus?.resend.dailyQuota ?? 100}</strong> emails used today
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      (emailStatus?.resend.usedToday ?? 0) >= (emailStatus?.resend.dailyQuota ?? 100)
                        ? 'bg-rose-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (((emailStatus?.resend.usedToday ?? 0) / (emailStatus?.resend.dailyQuota ?? 100)) * 100))}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Nodemailer Failover Card */}
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Server className="h-3.5 w-3.5 text-amber-500" />
                    <span>Nodemailer SMTP (Failover)</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    emailStatus?.activeEngine === 'NODEMAILER'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                      : emailStatus?.nodemailer.configured
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}>
                    {emailStatus?.activeEngine === 'NODEMAILER'
                      ? 'Active Engine'
                      : emailStatus?.nodemailer.configured
                      ? 'Standby Ready'
                      : 'Configured via SMTP'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Auto-switch guarantee: Activates automatically when the 100 free Resend daily emails are exhausted or rate limited.
                </div>
              </div>
            </div>
          </div>
          {/* Notification Channels Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
            {/* 1. Purchase Tax Invoice */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 hover:border-amber-500/40 transition-colors space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Receipt className="h-4 w-4 text-amber-500" />
                  <span>Product Purchase Receipt &amp; Tax Invoice</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Instant POS
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                Dispatched immediately upon completed sale. Features official GST invoice table, serialized item IDs, congratulatory note, and attached PDF tax invoice.
              </p>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-500 flex items-center gap-1">
                <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>Trigger: Automated on POS checkout or manual resend</span>
              </div>
            </div>

            {/* 2. Monthly EMI Payment Receipt */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 hover:border-amber-500/40 transition-colors space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                  <span>Monthly EMI Payment Receipt</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Congratulatory
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                Warm congratulatory receipt upon EMI payment with principal/interest breakdown, updated ledger balance, and celebratory payoff badge when loan is 100% paid off.
              </p>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-500 flex items-center gap-1">
                <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>Trigger: Automated on EMI installment settlement</span>
              </div>
            </div>

            {/* 3. Stopped Rent & Equipment Return */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 hover:border-amber-500/40 transition-colors space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-teal-500" />
                  <span>Stopped Rent &amp; Equipment Return Receipt</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                  Restocking
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                Official intake confirmation when customer returns rented gear. Shows inspection condition rating (MINT/GOOD/FAIR), safe return acknowledgment, and deposit balance status.
              </p>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-500 flex items-center gap-1">
                <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>Trigger: Automated on return inspection &amp; inventory intake</span>
              </div>
            </div>

            {/* 4. Security Deposit Refund Receipt */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 hover:border-amber-500/40 transition-colors space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Security Deposit Refund Disbursement</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Accounting Receipt
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                Transparent financial receipt detailing initial deposit, itemized deductions (if any), net refunded amount, payout mode (UPI/Bank/Cash), and reference transaction number.
              </p>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-500 flex items-center gap-1">
                <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>Trigger: Automated on separate deposit refund disbursement</span>
              </div>
            </div>

            {/* 5. Rent Auto-Deduction Notice */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 hover:border-amber-500/40 transition-colors space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-indigo-500" />
                  <span>Rent Auto-Deduction Notice (from Deposit)</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  Auto-Deduct
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                Polite automated notification whenever monthly rent is deducted from the customer's retained security deposit balance, showing the deducted amount and remaining reserve.
              </p>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-500 flex items-center gap-1">
                <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>Trigger: Automated when rent is deducted from deposit</span>
              </div>
            </div>

            {/* 6. Rental Agreement Welcome Pack */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 hover:border-amber-500/40 transition-colors space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  <span>Rental Agreement Activation &amp; Welcome</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  Welcome Pack
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                Warm welcome email welcoming the customer to the StereoBliss family, confirming equipment handoff, serialized identifiers, and monthly billing schedule.
              </p>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-500 flex items-center gap-1">
                <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>Trigger: Automated on new rental contract activation</span>
              </div>
            </div>
          </div>

          {/* Interactive Live Email Dispatch Verification Tool */}
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="font-bold text-xs uppercase tracking-wider text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <Send className="h-4 w-4 text-amber-500" />
                <span>Send Live Verification Test Email</span>
              </span>
              <span className="text-[11px] text-amber-700/80 dark:text-amber-300/80">
                Test SMTP connection and inspect executive formatting in your inbox
              </span>
            </div>

            <form onSubmit={handleSendTestEmail} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="Enter your email to receive a live test (e.g. admin@stereobliss.com)"
                  value={testEmailRecipient}
                  onChange={(e) => setTestEmailRecipient(e.target.value)}
                  className="bg-white dark:bg-slate-950 text-xs h-10"
                />
              </div>
              <Button
                type="submit"
                variant="default"
                isLoading={isSendingTestEmail}
                className="font-bold text-xs gap-1.5 h-10 px-4 shrink-0 bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-sm cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send Verification Email</span>
              </Button>
            </form>

            {testEmailResult && (
              <div
                className={`p-3 rounded-lg text-xs font-semibold flex items-center justify-between border ${
                  testEmailResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                }`}
              >
                <span>{testEmailResult.message}</span>
                <button
                  type="button"
                  onClick={() => setTestEmailResult(null)}
                  className="text-[11px] underline opacity-70 hover:opacity-100 ml-3"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Visual Workspace Appearance */}
      <Card className="shadow-sm border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
          <CardTitle className="text-base flex items-center gap-2 text-slate-900 dark:text-white">
            <Sun className="h-4 w-4 text-amber-500" />
            <span>Workspace Display Theme</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                theme === 'light'
                  ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 shadow-sm">
                <Sun className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">Light Mode</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">High contrast, clean daytime layout</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                theme === 'dark'
                  ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-amber-400 shadow-sm">
                <Moon className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">Dark Mode</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Sleek, low-light studio environment</div>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Organization, Store & GST Details Form (Super Admin Only) */}
      {isSuperAdmin() && (
        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2 text-slate-900 dark:text-white">
              <Building2 className="h-4 w-4 text-amber-500" />
              <span>Organization, Store & GST Details</span>
            </CardTitle>
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
              Live Brand & Billing Configuration
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSaveSettings} className="space-y-5">
            {/* Company and Store Identity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Organization / Company Name *"
                required
                disabled={!canManageSettings()}
                placeholder="e.g. Your Business Name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                helperText="Displayed in system sidebar, brand headers, and printed bills."
              />

              <Input
                label="Primary Store / Outlet Name *"
                required
                disabled={!canManageSettings()}
                placeholder="e.g. Central Retail Store"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                helperText="Name of your default stock location & retail outlet."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Store Outlet Code *"
                required
                disabled={!canManageSettings()}
                placeholder="e.g. CENTRAL or STORE1"
                value={storeCode}
                onChange={(e) => setStoreCode(e.target.value.toUpperCase())}
                helperText="Short code for stock movements and receipts."
              />

              <Input
                label="Official Contact Email"
                type="email"
                disabled={!canManageSettings()}
                placeholder="e.g. info@yourcompany.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                helperText="Company email printed on customer tax invoices."
              />

              <Input
                label="Contact Phone Number"
                disabled={!canManageSettings()}
                placeholder="e.g. +91 98765 43210"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                helperText="Support phone number printed on bills."
              />
            </div>

            <div>
              <Input
                label="Physical Store / Billing Address"
                disabled={!canManageSettings()}
                placeholder="e.g. Shop No. 4, Commercial Complex, Main Road, Pune MH 411001"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                helperText="Full physical registered address printed on customer tax invoices."
              />
            </div>

            {/* GST Tax Identification & Invoicing Details */}
            <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 space-y-4">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="font-bold text-xs uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  GST Identification & Tax Invoice Info (Printed on Bill)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <Input
                    label="GSTIN / Business GST Number"
                    disabled={!canManageSettings()}
                    placeholder="e.g. 27AAAAA0000A1Z5"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    helperText="Printed on tax invoices, POS bills, and PDF receipts."
                  />
                </div>

                <Input
                  label="State Name"
                  disabled={!canManageSettings()}
                  placeholder="e.g. Maharashtra"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  helperText="Origin state printed on tax invoices."
                />

                <Input
                  label="State Code"
                  disabled={!canManageSettings()}
                  placeholder="e.g. 27"
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value)}
                  helperText="2-digit GST state code (e.g. 27 for Maharashtra)."
                />
              </div>
            </div>

            {/* System Thresholds & Currency */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Input
                label="Currency Symbol"
                disabled={!canManageSettings()}
                placeholder="₹"
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
              />

              <Input
                label="Superadmin Approval Threshold (Units)"
                type="number"
                min="1"
                disabled={!canManageSettings()}
                helperText="Manual count adjustments exceeding this need Superadmin sign-off"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />

              <Input
                label="Default Low Stock Safety Threshold"
                type="number"
                min="1"
                disabled={!canManageSettings()}
                helperText="Trigger alert when available units drop to or below this"
                value={lowStockDefault}
                onChange={(e) => setLowStockDefault(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Operating Time Zone
              </label>
              <select
                value={timeZone}
                disabled={!canManageSettings()}
                onChange={(e) => setTimeZone(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30) — India Standard Time</option>
                <option value="UTC">UTC (Coordinated Universal Time)</option>
                <option value="America/New_York">America/New_York (EST / EDT)</option>
                <option value="Europe/London">Europe/London (GMT / BST)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST +4:00)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT +8:00)</option>
              </select>
            </div>

            {canManageSettings() && (
              <div className="flex justify-end pt-3">
                <Button type="submit" variant="default" isLoading={isSaving} className="font-bold gap-1.5 shadow-sm">
                  <Save className="h-4 w-4" />
                  <span>Save Organization & Billing Settings</span>
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
      )}

      {/* System Database Overview (Read-Only metrics, No Wipe Button) */}
      {isSuperAdmin() && (
        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <CardTitle className="text-base flex items-center gap-2 text-slate-900 dark:text-white">
              <Database className="h-4 w-4 text-amber-500" />
              <span>System Database Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <div className="text-slate-400 text-[11px]">Catalogue Products</div>
                <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                  {systemInfo?.counts.products ?? 0} active items
                </div>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <div className="text-slate-400 text-[11px]">Serialized Items / Stock</div>
                <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                  {systemInfo?.counts.serializedItems ?? 0} units
                </div>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <div className="text-slate-400 text-[11px]">Completed Sales</div>
                <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                  {systemInfo?.counts.sales ?? 0} invoices
                </div>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <div className="text-slate-400 text-[11px]">Audit Ledger Entries</div>
                <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                  {systemInfo?.counts.movements ?? 0} movements
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
