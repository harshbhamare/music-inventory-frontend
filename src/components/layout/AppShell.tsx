'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Loader2 } from 'lucide-react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const { companyName } = useSettings();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user && pathname !== '/login') {
      router.push('/login');
    }
  }, [user, isLoading, pathname, router]);

  if (pathname === '/login') {
    return <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">{children}</main>;
  }

  if (isLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex items-center justify-center rounded-2xl bg-white p-3 shadow-xl border border-slate-200/80 dark:border-slate-800 animate-pulse">
            <img src="/logo.png" alt="Stereobliss" className="h-10 w-auto object-contain" />
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold tracking-wider text-slate-600 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
            <span>Loading {companyName || 'Stereobliss Retail'}...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      <Sidebar />
      <div className="flex flex-1 flex-col pl-64">
        <Header />
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
