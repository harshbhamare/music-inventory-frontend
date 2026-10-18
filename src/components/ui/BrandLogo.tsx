'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Headphones } from 'lucide-react';

export interface BrandLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'badge' | 'full' | 'plain';
  showSubtitle?: boolean;
  priority?: boolean;
}

export function BrandLogo({
  className,
  size = 'md',
  variant = 'badge',
  showSubtitle = false,
  priority = false,
}: BrandLogoProps) {
  const [imageError, setImageError] = useState(false);

  // Size dimensions tailored for horizontal logo
  const sizeMap = {
    xs: { badge: 'h-7 w-14 px-1 py-0.5 rounded-lg', text: 'text-xs', sub: 'text-[9px]' },
    sm: { badge: 'h-8 w-18 px-1.5 py-0.5 rounded-xl', text: 'text-sm', sub: 'text-[10px]' },
    md: { badge: 'h-10 w-24 px-2 py-1 rounded-xl', text: 'text-base', sub: 'text-[11px]' },
    lg: { badge: 'h-14 w-32 px-2.5 py-1.5 rounded-2xl', text: 'text-xl', sub: 'text-xs' },
    xl: { badge: 'h-20 w-44 px-3 py-2 rounded-2xl', text: 'text-2xl', sub: 'text-sm' },
  };

  const currentSize = sizeMap[size];

  if (variant === 'full') {
    return (
      <div className={cn('inline-flex items-center gap-2.5', className)}>
        <div className="relative flex items-center justify-center rounded-xl bg-white px-2.5 py-1.5 shadow-sm border border-slate-200/90 dark:border-slate-700/80 shrink-0">
          {!imageError ? (
            <img
              src="/logo.png"
              alt="Stereobliss"
              loading={priority ? 'eager' : 'lazy'}
              className={cn(
                'object-contain transition-transform duration-200 hover:scale-105',
                size === 'xs' && 'h-5 w-auto max-w-[80px]',
                size === 'sm' && 'h-7 w-auto max-w-[110px]',
                size === 'md' && 'h-9 w-auto max-w-[140px]',
                size === 'lg' && 'h-12 w-auto max-w-[190px]',
                size === 'xl' && 'h-16 w-auto max-w-[240px]'
              )}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex items-center gap-1.5 text-red-600 font-extrabold text-sm">
              <Headphones className="h-4 w-4" />
              <span>STEREOBLISS</span>
            </div>
          )}
        </div>
        {showSubtitle && (
          <div className="flex flex-col">
            <span className={cn('font-extrabold tracking-wide text-slate-900 dark:text-white', currentSize.text)}>
              STEREOBLISS
            </span>
            <span className={cn('font-semibold text-amber-600 dark:text-amber-400', currentSize.sub)}>
              Retail Inventory
            </span>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'plain') {
    return (
      <img
        src="/logo.png"
        alt="Stereobliss"
        loading={priority ? 'eager' : 'lazy'}
        className={cn('h-auto object-contain', className)}
        onError={() => setImageError(true)}
      />
    );
  }

  // Default: 'badge' variant with clean white card for maximum brand readability in both light and dark themes
  return (
    <div
      className={cn(
        'relative flex items-center justify-center bg-white shadow-sm border border-slate-200/90 dark:border-slate-700/90 overflow-hidden shrink-0 transition-transform duration-200 hover:shadow',
        currentSize.badge,
        className
      )}
    >
      {!imageError ? (
        <img
          src="/logo.png"
          alt="Stereobliss"
          loading={priority ? 'eager' : 'lazy'}
          className="h-full w-auto max-w-full object-contain mx-auto"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="flex items-center justify-center h-full w-full bg-red-50 text-red-600">
          <Headphones className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}

export default BrandLogo;
