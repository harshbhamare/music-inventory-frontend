'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useSettings } from '@/context/SettingsContext';
import {
  Settings,
  Save,
  Sun,
  Moon,
  Database,
  Building2,
  Receipt,
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

export default function SettingsPage() {
  const { canManageSettings, isSuperAdmin } = useAuth();
  const { theme, setTheme } = useTheme();
  const { updateSettings } = useSettings();

  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
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
      const [setRes, sysRes] = await Promise.all([
        api.get<{ setting: any; defaultLocation?: any }>('/meta/settings'),
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
            Manage your organization identity, retail store details, GST tax identification, and billing information.
          </p>
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
        <span>
          <strong>Operational Access:</strong> Superadmins and Managers can configure store details, tax identification (GSTIN), and billing preferences.
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

      {/* Organization, Store & GST Details Form */}
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
