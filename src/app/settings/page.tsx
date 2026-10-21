'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useSettings } from '@/context/SettingsContext';
import {
  Settings,
  Save,
  Send,
  Mail,
  Sun,
  Moon,
  Database,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Play,
  Calendar,
  Building2,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';

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

interface ReportConfigItem {
  _id: string;
  reportType: string;
  title: string;
  recipients: string[];
  scheduleCron: string;
  timeZone: string;
  isEnabled: boolean;
  lastRunAt?: string;
}

export default function SettingsPage() {
  const { canManageSettings, isSuperAdmin } = useAuth();
  const { theme, setTheme } = useTheme();
  const { updateSettings, companyName: globalCompanyName, storeName: globalStoreName } = useSettings();

  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [isResettingData, setIsResettingData] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Form states - Organization & Store Details
  const [companyName, setCompanyName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeCode, setStoreCode] = useState('CENTRAL');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const [threshold, setThreshold] = useState('3');
  const [lowStockDefault, setLowStockDefault] = useState('5');
  const [timeZone, setTimeZone] = useState('Asia/Kolkata');

  // Background cron schedules state
  const [reportConfigs, setReportConfigs] = useState<ReportConfigItem[]>([]);
  const [savingConfigId, setSavingConfigId] = useState<string | null>(null);
  const [runningConfigId, setRunningConfigId] = useState<string | null>(null);
  const [newRecipientInputs, setNewRecipientInputs] = useState<Record<string, string>>({});
  const [configMessages, setConfigMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const [setRes, confRes, sysRes] = await Promise.all([
        api.get<{ setting: any; defaultLocation?: any }>('/meta/settings'),
        api.get<{ configs: ReportConfigItem[] }>('/meta/report-configs'),
        api.get<SystemInfo>('/meta/system-info').catch(() => null),
      ]);

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
            : 'Stereobliss Central Store, Pune, Maharashtra, India';

        setCompanyName(cName);
        setStoreName(stName);
        setStoreCode(s.storeCode || loc?.code || 'CENTRAL');
        setContactEmail(s.contactEmail || 'contact@stereobliss.com');
        setContactPhone(s.contactPhone || '+91 98765 43210');
        setAddress(addr);
        setCurrencySymbol(s.currencySymbol || '₹');
        setThreshold(String(s.managerApprovalThresholdValue || 3));
        setLowStockDefault(String(s.lowStockAlertThresholdDefault || 5));
        setTimeZone(s.timeZone || 'Asia/Kolkata');
      }

      setReportConfigs(confRes?.configs || []);
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
    if (
      !window.confirm(
        'Are you sure you want to remove all temporary transaction data (purchases, receipts, sales, audit logs) and restore the catalog to a clean baseline?'
      )
    ) {
      return;
    }
    setIsResettingData(true);
    setResetSuccessMessage('');
    setMessage('');
    try {
      const res = await api.post<{ message: string }>('/meta/reset-data');
      setResetSuccessMessage(res.message || 'All temporary transaction data removed successfully.');
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
      await updateSettings({
        companyName: companyName.trim(),
        storeName: storeName.trim(),
        storeCode: storeCode.trim().toUpperCase(),
        contactEmail: contactEmail.trim().toLowerCase(),
        contactPhone: contactPhone.trim(),
        address: address.trim(),
        currencySymbol: currencySymbol.trim(),
        managerApprovalThresholdValue: parseInt(threshold, 10) || 3,
        lowStockAlertThresholdDefault: parseInt(lowStockDefault, 10) || 5,
        timeZone,
      });

      setMessage('✅ Organization & Store Details successfully updated across the system.');
      await fetchSettings();
    } catch (err: any) {
      setMessage(`❌ Error saving settings: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Cron schedule helper: parse cron into hour and minute if daily
  const parseCronTime = (cronStr: string): string => {
    const parts = cronStr.trim().split(/\s+/);
    if (parts.length >= 5) {
      const min = parts[0].padStart(2, '0');
      const hr = parts[1].padStart(2, '0');
      if (!isNaN(Number(min)) && !isNaN(Number(hr))) {
        return `${hr}:${min}`;
      }
    }
    return '09:00';
  };

  const handleUpdateConfigLocal = (id: string, updates: Partial<ReportConfigItem>) => {
    setReportConfigs((prev) =>
      prev.map((c) => (c._id === id ? { ...c, ...updates } : c))
    );
  };

  const handleAddRecipient = (configId: string) => {
    const raw = newRecipientInputs[configId] || '';
    const emailsToAdd = raw
      .split(/[,;\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0 && e.includes('@'));

    if (emailsToAdd.length === 0) return;

    setReportConfigs((prev) =>
      prev.map((c) => {
        if (c._id === configId) {
          const current = new Set(c.recipients || []);
          emailsToAdd.forEach((em) => current.add(em));
          return { ...c, recipients: Array.from(current) };
        }
        return c;
      })
    );

    setNewRecipientInputs((prev) => ({ ...prev, [configId]: '' }));
  };

  const handleRemoveRecipient = (configId: string, emailToRemove: string) => {
    setReportConfigs((prev) =>
      prev.map((c) => {
        if (c._id === configId) {
          return { ...c, recipients: (c.recipients || []).filter((e) => e !== emailToRemove) };
        }
        return c;
      })
    );
  };

  const handleSaveCronConfig = async (config: ReportConfigItem) => {
    setSavingConfigId(config._id);
    setConfigMessages((prev) => ({ ...prev, [config._id]: '' }));

    try {
      const res = await api.patch<{ message: string; config: ReportConfigItem }>(
        `/meta/report-configs/${config._id}`,
        {
          title: config.title,
          scheduleCron: config.scheduleCron,
          recipients: config.recipients,
          isEnabled: config.isEnabled,
          timeZone: config.timeZone || timeZone,
        }
      );

      setConfigMessages((prev) => ({
        ...prev,
        [config._id]: '✅ Schedule and recipients successfully saved & active.',
      }));
    } catch (err: any) {
      setConfigMessages((prev) => ({
        ...prev,
        [config._id]: `❌ Failed to save: ${err.message}`,
      }));
    } finally {
      setSavingConfigId(null);
    }
  };

  const handleRunReportNow = async (config: ReportConfigItem) => {
    setRunningConfigId(config._id);
    setConfigMessages((prev) => ({ ...prev, [config._id]: '' }));

    try {
      const res = await api.post<{ message: string; lastRunAt?: string }>(
        `/meta/report-configs/${config._id}/run-now`
      );

      setConfigMessages((prev) => ({
        ...prev,
        [config._id]: `⚡ ${res.message || 'Report triggered successfully.'}`,
      }));

      if (res.lastRunAt) {
        handleUpdateConfigLocal(config._id, { lastRunAt: res.lastRunAt });
      }
    } catch (err: any) {
      setConfigMessages((prev) => ({
        ...prev,
        [config._id]: `❌ Failed to trigger: ${err.message}`,
      }));
    } finally {
      setRunningConfigId(null);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div className="flex items-center gap-3">
        <BrandLogo size="md" variant="badge" className="shadow-xs shrink-0" />
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Settings className="h-6 w-6 text-amber-500" />
            <span>System Configuration & Store Management</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Stereobliss Retail — Manage your organization identity, retail store details, automated background cron schedules, and notification mailing lists.
          </p>
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
        <span>
          <strong>Operational Access:</strong> Superadmins and Managers can configure store details, manage notification mailing lists, and adjust automated background cron schedules.
        </span>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-semibold text-amber-800 dark:text-amber-400 shadow-sm">
          {message}
        </div>
      )}

      {/* Theme & Display Preferences Card */}
      <Card className="shadow-sm border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
          <CardTitle className="text-base flex items-center gap-2">
            <Sun className="h-4 w-4 text-amber-500" />
            <span>Appearance & Theme Mode</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Select your preferred visual style. Light mode provides high clarity for retail sales counters, while Dark mode is ideal for low-light studio environments.
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

      {/* Organization & Store Details Form */}
      <Card className="shadow-sm border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2 text-slate-900 dark:text-white">
              <Building2 className="h-4 w-4 text-amber-500" />
              <span>Organization & Store Details</span>
            </CardTitle>
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
              Live Brand & Outlet Sync
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {/* Active Brand Logo Preview */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 mb-5">
            <div className="flex items-center gap-4">
              <BrandLogo size="lg" variant="badge" className="shadow-md" />
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Stereobliss Retail Brand Identity</span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">Active Everywhere</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Official logo active in Sidebar, Top Header, Login page, Loading screen, Reports, and System Favicon.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>frontend/logo/logo.png</span>
            </div>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Organization / Company Name *"
                required
                disabled={!canManageSettings()}
                placeholder="e.g. Stereobliss Retail"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                helperText="Displayed in system sidebar, brand headers, and exported invoices."
              />

              <Input
                label="Official Contact Email *"
                type="email"
                required
                disabled={!canManageSettings()}
                placeholder="e.g. contact@stereobliss.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                helperText="Primary communication and transactional email sender."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="Primary Store / Outlet Name *"
                  required
                  disabled={!canManageSettings()}
                  placeholder="e.g. Stereobliss Central Store"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  helperText="Name of your default stock location & retail outlet."
                />
              </div>

              <Input
                label="Store Outlet Code *"
                required
                disabled={!canManageSettings()}
                placeholder="e.g. CENTRAL or STEREO"
                value={storeCode}
                onChange={(e) => setStoreCode(e.target.value.toUpperCase())}
                helperText="Short code for stock movements and receipts."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Contact Phone Number"
                disabled={!canManageSettings()}
                placeholder="+91 98765 43210"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />

              <Input
                label="Physical Campus / Store Address"
                disabled={!canManageSettings()}
                placeholder="Floor 1, Retail Hub, Pune, Maharashtra"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
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
                  <span>Save Organization & Store Details</span>
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Automated Background Jobs & Cron Schedules */}
      {isSuperAdmin() && (
        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2 text-slate-900 dark:text-white">
                <Clock className="h-4 w-4 text-amber-500" />
                <span>Automated Background Jobs & Mailing Schedules (Cron)</span>
              </CardTitle>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Dynamic Node-Cron Active
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-6">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure automatic background schedules to dispatch inventory summaries, overdue rental alerts, and sales performance reports.
              Admins can customize the exact timing (hour & minute), toggle schedules, and specify <strong>one or multiple recipient emails</strong>.
            </p>

            <div className="space-y-6">
              {reportConfigs.map((config) => {
                const isRunning = runningConfigId === config._id;
                const isSavingThis = savingConfigId === config._id;
                const configMsg = configMessages[config._id];
                const currentCronTime = parseCronTime(config.scheduleCron);

                return (
                  <div
                    key={config._id}
                    className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-4 transition-all"
                  >
                    {/* Header: Title, Enable/Disable Switch, Last Run */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                            {config.title}
                          </h3>
                          <Badge variant={config.isEnabled ? 'default' : 'secondary'} className="text-[10px]">
                            {config.isEnabled ? 'Enabled & Scheduled' : 'Paused'}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Report Type: <code className="font-mono text-[11px] text-amber-600 dark:text-amber-400">{config.reportType}</code>
                          {config.lastRunAt && (
                            <span className="ml-2 text-slate-400">
                              • Last run: {new Date(config.lastRunAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={config.isEnabled}
                            onChange={(e) => handleUpdateConfigLocal(config._id, { isEnabled: e.target.checked })}
                            className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                          />
                          <span>{config.isEnabled ? 'Active' : 'Disabled'}</span>
                        </label>
                      </div>
                    </div>

                    {/* Timing & Schedule Configuration */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Automatic Schedule Frequency & Timing
                        </label>
                        <div className="flex items-center gap-2">
                          <select
                            value={
                              config.scheduleCron.startsWith('0 */6')
                                ? 'every_6h'
                                : config.scheduleCron.startsWith('0 */12')
                                ? 'every_12h'
                                : config.scheduleCron.endsWith('* * 0')
                                ? 'weekly_sun'
                                : config.scheduleCron.endsWith('* * *')
                                ? 'daily'
                                : 'custom'
                            }
                            onChange={(e) => {
                              const mode = e.target.value;
                              if (mode === 'daily') {
                                handleUpdateConfigLocal(config._id, { scheduleCron: `0 9 * * *` });
                              } else if (mode === 'weekly_sun') {
                                handleUpdateConfigLocal(config._id, { scheduleCron: `0 18 * * 0` });
                              } else if (mode === 'every_6h') {
                                handleUpdateConfigLocal(config._id, { scheduleCron: `0 */6 * * *` });
                              } else if (mode === 'every_12h') {
                                handleUpdateConfigLocal(config._id, { scheduleCron: `0 */12 * * *` });
                              }
                            }}
                            className="h-10 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium"
                          >
                            <option value="daily">Daily at specific time</option>
                            <option value="weekly_sun">Weekly (Sunday Evening)</option>
                            <option value="every_6h">Every 6 Hours (Periodic)</option>
                            <option value="every_12h">Every 12 Hours</option>
                            <option value="custom">Custom Cron Expression</option>
                          </select>

                          {/* Time Picker for daily / weekly */}
                          <div className="relative">
                            <input
                              type="time"
                              value={currentCronTime}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (!val) return;
                                const [h, m] = val.split(':');
                                const dayPart = config.scheduleCron.endsWith('* * 0') ? '* * 0' : '* * *';
                                handleUpdateConfigLocal(config._id, {
                                  scheduleCron: `${parseInt(m, 10)} ${parseInt(h, 10)} ${dayPart}`,
                                });
                              }}
                              className="h-10 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono font-bold"
                            />
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono">
                          Cron Expression: <span className="font-bold text-amber-600 dark:text-amber-400">{config.scheduleCron}</span> ({timeZone})
                        </p>
                      </div>

                      {/* Custom Cron Input fallback */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Edit Raw Cron Expression (Advanced)
                        </label>
                        <Input
                          value={config.scheduleCron}
                          placeholder="e.g. 0 9 * * *"
                          onChange={(e) => handleUpdateConfigLocal(config._id, { scheduleCron: e.target.value })}
                          className="font-mono text-xs"
                          helperText="5 fields: minute (0-59), hour (0-23), day of month, month, day of week"
                        />
                      </div>
                    </div>

                    {/* Mailing & Recipients List (One or Multiple Emails) */}
                    <div className="space-y-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-indigo-500" />
                          <span>Recipient Email Addresses ({config.recipients?.length || 0} configured)</span>
                        </label>
                        <span className="text-[11px] text-slate-400">
                          Multiple recipients supported
                        </span>
                      </div>

                      {/* Chips of existing recipients */}
                      <div className="flex flex-wrap gap-2 items-center min-h-[36px] p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                        {config.recipients && config.recipients.length > 0 ? (
                          config.recipients.map((email) => (
                            <span
                              key={email}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300"
                            >
                              <span>{email}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveRecipient(config._id, email)}
                                className="text-amber-700 hover:text-red-500 dark:text-amber-300 dark:hover:text-red-400"
                                title="Remove recipient"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-rose-500 font-medium">
                            No recipients configured! Add at least one email address below.
                          </span>
                        )}
                      </div>

                      {/* Add Recipient Form */}
                      <div className="flex gap-2">
                        <input
                          type="email"
                          placeholder="Type recipient email (e.g. accounts@stereobliss.com) and press Enter or click Add"
                          value={newRecipientInputs[config._id] || ''}
                          onChange={(e) => setNewRecipientInputs((prev) => ({ ...prev, [config._id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddRecipient(config._id);
                            }
                          }}
                          className="flex-1 h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddRecipient(config._id)}
                          className="text-xs font-semibold gap-1 shrink-0"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add Recipient</span>
                        </Button>
                      </div>
                    </div>

                    {/* Status Feedback */}
                    {configMsg && (
                      <div className="p-2.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        {configMsg}
                      </div>
                    )}

                    {/* Actions: Save & Run Now */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/80 dark:border-slate-800">
                      <div className="text-[11px] text-slate-400">
                        Changes immediately update the dynamic backend cron task without server restart.
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRunReportNow(config)}
                          isLoading={isRunning}
                          className="text-xs font-bold gap-1.5"
                          title="Send this email report immediately to all configured recipients"
                        >
                          <Play className="h-3.5 w-3.5 text-amber-500" />
                          <span>Run Now (Test Dispatch)</span>
                        </Button>

                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          onClick={() => handleSaveCronConfig(config)}
                          isLoading={isSavingThis}
                          className="text-xs font-bold gap-1.5 shadow-sm"
                        >
                          <Save className="h-3.5 w-3.5" />
                          <span>Save Schedule</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

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
    </div>
  );
}
