'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import {
  MapPin,
  PlusCircle,
  ShoppingCart,
  Music2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from './ThemeToggle';
import { NotificationBell } from './NotificationBell';

interface HeaderProps {
  onQuickAction?: (action: string) => void;
}

export function Header({ onQuickAction }: HeaderProps) {
  const { user, canMakeSales, canReceiveStock, canIssueUsage, isSuperAdmin, isManager } = useAuth();
  const { storeName } = useSettings();

  const canViewDues = isSuperAdmin() || isManager() || canIssueUsage();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90 transition-colors">
      {/* Location & Store Outlet */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-800 dark:text-amber-400">
          <MapPin className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          <span>
            {storeName && !/central studio|academy/i.test(storeName)
              ? storeName
              : 'Stereobliss Central Store'}
          </span>
        </div>
      </div>

      {/* Quick Action Buttons & Theme Toggle */}
      <div className="flex items-center gap-3">
        {canReceiveStock() && (
          <a href="/intake">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs font-semibold">
              <PlusCircle className="h-3.5 w-3.5 text-amber-500" />
              <span className="hidden sm:inline">Receive Stock</span>
            </Button>
          </a>
        )}

        {canMakeSales() && (
          <a href="/sales">
            <Button size="sm" variant="default" className="gap-1.5 text-xs font-bold shadow-sm">
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>New Sale</span>
            </Button>
          </a>
        )}

        {canIssueUsage() && (
          <a href="/usage" className="hidden md:inline-block">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs font-semibold">
              <Music2 className="h-3.5 w-3.5 text-amber-500" />
              <span>Rent Instrument</span>
            </Button>
          </a>
        )}

        {/* Notification Bell for Rental Dues & Reminders */}
        {canViewDues && <NotificationBell />}

        {/* Theme Toggle Button */}
        <ThemeToggle />
      </div>
    </header>
  );
}
