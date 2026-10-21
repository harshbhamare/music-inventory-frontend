'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import {
  LayoutDashboard,
  Boxes,
  Truck,
  ArrowLeftRight,
  ShoppingCart,
  Wrench,
  Users2,
  BarChart3,
  ShieldCheck,
  History,
  Settings,
  Music2,
  LogOut,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrandLogo } from '@/components/ui/BrandLogo';

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, hasRole } = useAuth();
  const { companyName } = useSettings();
  const [showPhase3, setShowPhase3] = useState(false);

  // Phase 2 Core Modules — Streamlined & accessible
  const coreNavItems = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      visible: true,
    },
    {
      title: 'Inventory Catalog',
      href: '/inventory',
      icon: Boxes,
      visible: true,
    },
    {
      title: 'Receive Stock',
      href: '/intake',
      icon: Truck,
      badge: 'Stock In',
      visible: hasRole('SUPER_ADMIN', 'MANAGER'),
    },
    {
      title: 'Sales & Billing',
      href: '/sales',
      icon: ShoppingCart,
      badge: 'POS',
      visible: hasRole('SUPER_ADMIN', 'MANAGER'),
    },
    {
      title: 'Rent Instrument',
      href: '/usage',
      icon: Music2,
      badge: 'Rentals',
      visible: hasRole('SUPER_ADMIN', 'MANAGER'),
    },
    {
      title: 'Stock Movements',
      href: '/movements',
      icon: ArrowLeftRight,
      visible: hasRole('SUPER_ADMIN', 'MANAGER'),
    },
    {
      title: 'Reports & Summary',
      href: '/reports',
      icon: BarChart3,
      visible: hasRole('SUPER_ADMIN', 'MANAGER'),
    },
  ];

  // Administration items (Main Features: Super Admin Only)
  const adminNavItems = [
    {
      title: 'Team & Roles',
      href: '/users',
      icon: ShieldCheck,
      visible: hasRole('SUPER_ADMIN'),
    },
    {
      title: 'Settings',
      href: '/settings',
      icon: Settings,
      visible: hasRole('SUPER_ADMIN', 'MANAGER'),
    },
  ];

  // Operations & Maintenance Modules
  const phase3NavItems = [
    {
      title: 'Returns & Repairs',
      href: '/returns-maintenance',
      icon: Wrench,
      phase: 'Ops',
      visible: hasRole('SUPER_ADMIN', 'MANAGER'),
    },
    {
      title: 'Suppliers Directory',
      href: '/suppliers',
      icon: Users2,
      phase: 'Ops',
      visible: hasRole('SUPER_ADMIN', 'MANAGER'),
    },
    {
      title: 'Activity Audit Log',
      href: '/audit-logs',
      icon: History,
      phase: 'Ops',
      visible: hasRole('SUPER_ADMIN', 'MANAGER'),
    },
  ];

  const isCurrentActive = (href: string) => {
    return pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white text-slate-800 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 transition-colors">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 px-4 border-b border-slate-200 dark:border-slate-800">
        <BrandLogo size="md" variant="badge" className="shadow-md" />
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-base tracking-wide text-slate-900 dark:text-white truncate max-w-[140px]">
              {companyName && !/soundstock|muziclub/i.test(companyName)
                ? companyName.replace(/retail/i, '').trim().toUpperCase() || 'STEREOBLISS'
                : 'STEREOBLISS'}
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-400 border border-amber-500/20 shrink-0">
              Retail
            </span>
          </div>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[170px]">
            Inventory & Asset Ops
          </p>
        </div>
      </div>

      {/* Navigation list */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {/* Phase 2 Core Modules */}
        <div>
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Core Operations</span>
            <span className="text-[10px] font-normal text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">P2</span>
          </div>

          <div className="space-y-1">
            {coreNavItems
              .filter((item) => item.visible)
              .map((item) => {
                const isActive = isCurrentActive(item.href);
                const Icon = item.icon;

                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'group flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-150',
                      isActive
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={cn(
                          'h-4 w-4 transition-transform group-hover:scale-110',
                          isActive
                            ? 'text-slate-950 stroke-[2.5]'
                            : 'text-slate-500 group-hover:text-amber-600 dark:text-slate-400 dark:group-hover:text-amber-400'
                        )}
                      />
                      <span>{item.title}</span>
                    </div>
                    {item.badge && !isActive && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                        {item.badge}
                      </span>
                    )}
                  </a>
                );
              })}
          </div>
        </div>

        {/* Administration */}
        {adminNavItems.some((i) => i.visible) && (
          <div>
            <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Administration
            </div>

            <div className="space-y-1">
              {adminNavItems
                .filter((item) => item.visible)
                .map((item) => {
                  const isActive = isCurrentActive(item.href);
                  const Icon = item.icon;

                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'group flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-150',
                        isActive
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={cn(
                            'h-4 w-4 transition-transform group-hover:scale-110',
                            isActive
                              ? 'text-slate-950 stroke-[2.5]'
                              : 'text-slate-500 group-hover:text-amber-600 dark:text-slate-400 dark:group-hover:text-amber-400'
                          )}
                        />
                        <span>{item.title}</span>
                      </div>
                    </a>
                  );
                })}
            </div>
          </div>
        )}

        {/* Optional Collapsible: Phase 3 Advanced Features */}
        <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setShowPhase3(!showPhase3)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Layers className="h-3 w-3" />
              <span>Phase 3 Modules</span>
            </span>
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 transition-transform duration-200',
                showPhase3 && 'rotate-180'
              )}
            />
          </button>

          {showPhase3 && (
            <div className="mt-1 space-y-1 pl-1">
              {phase3NavItems
                .filter((item) => item.visible)
                .map((item) => {
                  const isActive = isCurrentActive(item.href);
                  const Icon = item.icon;

                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'group flex items-center justify-between rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-150',
                        isActive
                          ? 'bg-slate-200 text-slate-950 dark:bg-slate-800 dark:text-white font-bold'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-200'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-3.5 w-3.5 text-slate-400" />
                        <span>{item.title}</span>
                      </div>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-500">
                        P3
                      </span>
                    </a>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* User profile footer */}
      {user && (
        <div className="border-t border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-950/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/30">
                {user.name.charAt(0)}
              </div>
              <div className="truncate">
                <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{user.name}</p>
                <p className="truncate text-[10px] text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider">
                  {user.role === 'SUPER_ADMIN' ? 'Superadmin' : 'Manager'}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              aria-label="Logout"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-red-600 dark:hover:bg-slate-800 dark:hover:text-red-400 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
