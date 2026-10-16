'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Music2, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@soundstock.io');
  const [password, setPassword] = useState('Stock@2026');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRolePreset = (presetEmail: string) => {
    setEmail(presetEmail);
    setPassword('Stock@2026');
    setErrorMessage('');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden transition-colors">
      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle showLabel />
      </div>

      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-amber-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 shadow-xl shadow-amber-500/25 mb-4">
            <Music2 className="h-8 w-8 stroke-[2.5]" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              SOUNDSTOCK
            </h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              <span>Phase 2</span>
            </span>
          </div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-1.5">
            Studio Inventory & Academy Asset Management
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900/90 backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                <span>⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <Input
                label="Staff Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@soundstock.io"
              />
            </div>

            <div>
              <Input
                label="Password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
              />
            </div>

            <Button type="submit" size="lg" className="w-full mt-2 font-bold shadow-md" isLoading={isLoading}>
              <span>Sign In to SoundStock</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          {/* Quick Demo Role Presets */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 text-center">
              Quick Role Demo Presets (Password: Stock@2026)
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleRolePreset('admin@soundstock.io')}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800 dark:border-slate-700/60 dark:text-slate-200 transition-colors"
              >
                <span className="font-bold text-amber-600 dark:text-amber-400">Super Admin</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Full Access</span>
              </button>
              <button
                type="button"
                onClick={() => handleRolePreset('manager@soundstock.io')}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800 dark:border-slate-700/60 dark:text-slate-200 transition-colors"
              >
                <span className="font-bold text-indigo-600 dark:text-indigo-400">Manager</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Approvals</span>
              </button>
              <button
                type="button"
                onClick={() => handleRolePreset('sales@soundstock.io')}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800 dark:border-slate-700/60 dark:text-slate-200 transition-colors"
              >
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Sales Staff</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">POS</span>
              </button>
              <button
                type="button"
                onClick={() => handleRolePreset('staff@soundstock.io')}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800 dark:border-slate-700/60 dark:text-slate-200 transition-colors"
              >
                <span className="font-bold text-sky-600 dark:text-sky-400">Academy Staff</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Loans</span>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6 font-medium">
          © {new Date().getFullYear()} SoundStock Systems. All rights reserved.
        </p>
      </div>
    </div>
  );
}
