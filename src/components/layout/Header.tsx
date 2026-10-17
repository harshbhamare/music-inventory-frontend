'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import {
  MapPin,
  PlusCircle,
  ShoppingCart,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  onQuickAction?: (action: string) => void;
}

export function Header({ onQuickAction }: HeaderProps) {
  const { user, canMakeSales, canReceiveStock, canIssueUsage } = useAuth();
  const { storeName } = useSettings();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90 transition-colors">
      {/* Location & Phase 2 Badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-800 dark:text-amber-400">
          <MapPin className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          <span>{storeName || 'Main Store & Academy'}</span>
        </div>

        <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
          <Sparkles className="h-3 w-3" />
          <span>Phase 2 Active</span>
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
              <GraduationCap className="h-3.5 w-3.5 text-indigo-500" />
              <span>Issue Instrument</span>
            </Button>
          </a>
        )}

        {/* Theme Toggle Button */}
        <ThemeToggle />
      </div>
    </header>
  );
}
