'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Music2, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  const handleRolePreset = async (presetEmail: string, presetPassword = 'Stock@2026') => {
    setEmail(presetEmail);
    setPassword(presetPassword);
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
          <div className="mb-4 flex items-center justify-center">
            <div className="rounded-2xl bg-white p-3 shadow-2xl border border-slate-200/90 dark:border-slate-700/80 transition-all hover:scale-105 duration-300">
              <img
                src="/logo.png"
                alt="Stereobliss"
                className="h-14 w-auto object-contain max-w-[210px]"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              STEREOBLISS
            </h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              <span>Retail</span>
            </span>
          </div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-1.5">
            Stereobliss Retail — Musical Instrument & Audio Inventory
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
                placeholder="e.g. admin@stereobliss.com"
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
              <span>Sign In</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          {/* Quick Sign-in Presets */}
          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 text-center">
              Quick Sign-in Presets (Password: Stock@2026)
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleRolePreset('admin@stereobliss.com')}
                className="flex flex-col items-start p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800 dark:border-slate-700/60 dark:text-slate-200 transition-colors text-left"
              >
                <span className="font-extrabold text-amber-600 dark:text-amber-400 text-xs">Super Admin</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-full font-mono">
                  admin@stereobliss.com
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleRolePreset('manager@stereobliss.com')}
                className="flex flex-col items-start p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800 dark:border-slate-700/60 dark:text-slate-200 transition-colors text-left"
              >
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-xs">Store Manager</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-full font-mono">
                  manager@stereobliss.com
                </span>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6 font-medium">
          © {new Date().getFullYear()} Stereobliss - Retail Inventory. All rights reserved.
        </p>
      </div>
    </div>
  );
}
