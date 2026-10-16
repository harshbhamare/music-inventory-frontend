'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Settings, Save, Send, Mail, Sun, Moon, Database, Copy, Check, RotateCcw } from 'lucide-react';

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
  const [setting, setSetting] = useState<any>(null);
  const [reportConfigs, setReportConfigs] = useState<any[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [isResettingData, setIsResettingData] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Form states
  const [companyName, setCompanyName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const [threshold, setThreshold] = useState('3');
  const [timeZone, setTimeZone] = useState('Asia/Kolkata');

  // Test email state
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const [setRes, confRes, sysRes] = await Promise.all([
        api.get<{ setting: any }>('/meta/settings'),
        api.get<{ configs: any[] }>('/meta/report-configs'),
        api.get<SystemInfo>('/meta/system-info').catch(() => null),
      ]);

      const s = setRes.setting;
      setSetting(s);
      if (s) {
        setCompanyName(s.companyName || '');
        setContactEmail(s.contactEmail || '');
        setContactPhone(s.contactPhone || '');
        setAddress(s.address || '');
        setCurrencySymbol(s.currencySymbol || '₹');
        setThreshold(String(s.managerApprovalThresholdValue || 3));
        setTimeZone(s.timeZone || 'Asia/Kolkata');
      }

      setReportConfigs(confRes.configs || []);
      if (sysRes) {
        setSystemInfo(sysRes);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setIsLoading(false);
    }
  };


  const handleResetData = async () => {
    if (!window.confirm('Are you sure you want to remove all temporary transaction data (purchases, receipts, sales, audit logs) and restore the catalog to a clean state?')) {
      return;
    }
    setIsResettingData(true);
    setResetSuccessMessage('');
    setMessage('');
    try {
      const res = await api.post<{ message: string }>('/meta/reset-data');
      setResetSuccessMessage(res.message || 'All temporary data removed successfully.');
      await fetchSettings();
    } catch (err: any) {
      setMessage(`❌ Error resetting data: ${err.message}`);
    } finally {
      setIsResettingData(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage('');

    try {
      await api.patch('/meta/settings', {
        companyName: companyName.trim(),
        contactEmail: contactEmail.trim().toLowerCase(),
        contactPhone: contactPhone.trim(),
        address: address.trim(),
        currencySymbol: currencySymbol.trim(),
        managerApprovalThresholdValue: parseInt(threshold, 10) || 3,
        timeZone,
      });

      setMessage('✅ Organization configuration updated successfully.');
      fetchSettings();
    } catch (err: any) {
      setMessage(`❌ Error saving settings: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setIsSendingTest(true);
    setMessage('');
    try {
      await api.post('/reports/email-test', { email: testEmailAddress || undefined });
      setMessage('✅ Test notification sent! Check the delivery logs on the Reports page.');
    } catch (err: any) {
      setMessage(`❌ Failed to send test email: ${err.message}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          System Configuration & Settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage system theme, store profiles, approval thresholds, and automated notifications.
        </p>
      </div>

      {message && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs font-semibold text-amber-800 dark:text-amber-400">
          {message}
        </div>
      )}

      {/* Theme & Display Preferences Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sun className="h-4 w-4 text-amber-500" />
            <span>Appearance & Theme Mode</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Choose your preferred interface theme. Light mode provides high contrast and clarity for retail counters and bright environments.
          </p>
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

      {/* System Data Summary & Maintenance */}
      {isSuperAdmin() && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-slate-500" />
                <CardTitle className="text-base text-slate-900 dark:text-white">System Data Maintenance</CardTitle>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetData}
                isLoading={isResettingData}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 gap-1.5 shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Wipe All Dummy Data & Reset</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4">
            {resetSuccessMessage && (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {resetSuccessMessage}
              </div>
            )}
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

      {/* Organization Profile Settings Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4 text-amber-500" />
            <span>Organization & Store Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Store / Academy Name"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />

              <Input
                label="Official Contact Email"
                type="email"
                required
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Contact Phone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />

              <Input
                label="Physical Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Input
                label="Currency Symbol"
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
              />

              <Input
                label="Manager Approval Threshold (Units)"
                type="number"
                min="1"
                helperText="Adjustments exceeding this quantity require manager sign-off"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Time Zone
                </label>
                <select
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                </select>
              </div>
            </div>

            {canManageSettings() && (
              <div className="flex justify-end pt-3">
                <Button type="submit" variant="default" isLoading={isSaving} className="font-bold gap-1.5">
                  <Save className="h-4 w-4" />
                  <span>Save Configuration</span>
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Transactional Email Integration & Test */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-indigo-500" />
            <span>Email Report Notifications & Test</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Daily stock summaries and overdue loan alerts are dispatched automatically via background jobs.
            Use the form below to send an immediate verification email to any address.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Enter test email address (or leave empty to send to your email)"
              type="email"
              value={testEmailAddress}
              onChange={(e) => setTestEmailAddress(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="default"
              onClick={handleTestEmail}
              isLoading={isSendingTest}
              className="font-bold gap-1.5 shrink-0"
            >
              <Send className="h-4 w-4" />
              <span>Send Test Notification</span>
            </Button>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Automated Schedules
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <div className="font-bold text-slate-900 dark:text-white">Daily Stock Summary</div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">Cron: 0 9 * * * (9:00 AM Daily)</div>
                <div className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] mt-1">Status: Active</div>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <div className="font-bold text-slate-900 dark:text-white">Overdue Instrument Alert</div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">Cron: 0 10 * * * (10:00 AM Daily)</div>
                <div className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] mt-1">Status: Active</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
