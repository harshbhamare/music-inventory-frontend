'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api';

export interface AppSettingData {
  _id?: string;
  companyName: string;
  storeName?: string;
  storeCode?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  currency?: string;
  currencySymbol?: string;
  timeZone?: string;
  managerApprovalThresholdValue?: number;
  lowStockAlertThresholdDefault?: number;
  defaultLocation?: any;
}

interface SettingsContextType {
  settings: AppSettingData | null;
  companyName: string;
  storeName: string;
  currencySymbol: string;
  timeZone: string;
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
  updateSettings: (data: Partial<AppSettingData>) => Promise<AppSettingData>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      // First try public or full settings
      const res = await api.get<{ setting?: AppSettingData; companyName?: string; storeName?: string; currencySymbol?: string }>('/meta/settings/public').catch(() => null);
      if (res) {
        setSettings((prev) => ({
          ...prev,
          companyName: res.companyName || 'Muziclub Inventory',
          storeName: res.storeName || 'Muziclub Central Studio & Academy',
          currencySymbol: res.currencySymbol || '₹',
          timeZone: (res as any).timeZone || 'Asia/Kolkata',
        }));
      }

      // Try authenticated settings if token present
      const token = typeof window !== 'undefined' ? localStorage.getItem('stereobliss_token') || localStorage.getItem('soundstock_token') : null;
      if (token) {
        const fullRes = await api.get<{ setting: AppSettingData }>('/meta/settings').catch(() => null);
        if (fullRes?.setting) {
          const s = fullRes.setting;
          const loc = s.defaultLocation;
          setSettings({
            ...s,
            companyName: s.companyName || 'Muziclub Inventory',
            storeName: s.storeName || (loc && typeof loc === 'object' ? loc.name : 'Muziclub Central Studio & Academy'),
            storeCode: s.storeCode || (loc && typeof loc === 'object' ? loc.code : 'CENTRAL'),
            currencySymbol: s.currencySymbol || '₹',
          });
        }
      }
    } catch (err) {
      console.error('Failed to load settings in SettingsProvider:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (data: Partial<AppSettingData>): Promise<AppSettingData> => {
    const res = await api.patch<{ setting: AppSettingData; message?: string }>('/meta/settings', data);
    const updated = (res as any).setting || res;
    const loc = updated.defaultLocation;
    const normalized: AppSettingData = {
      ...updated,
      companyName: updated.companyName || data.companyName || 'Muziclub Inventory',
      storeName: updated.storeName || data.storeName || (loc && typeof loc === 'object' ? loc.name : 'Muziclub Central Studio & Academy'),
      storeCode: updated.storeCode || data.storeCode || (loc && typeof loc === 'object' ? loc.code : 'CENTRAL'),
      currencySymbol: updated.currencySymbol || data.currencySymbol || '₹',
    };
    setSettings(normalized);
    return normalized;
  };

  const companyName = settings?.companyName || 'Muziclub Inventory';
  const storeName = settings?.storeName || 'Muziclub Central Studio & Academy';
  const currencySymbol = settings?.currencySymbol || '₹';
  const timeZone = settings?.timeZone || 'Asia/Kolkata';

  return (
    <SettingsContext.Provider
      value={{
        settings,
        companyName,
        storeName,
        currencySymbol,
        timeZone,
        isLoading,
        refreshSettings: fetchSettings,
        updateSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
