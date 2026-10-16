'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User, UserRole } from '@/lib/types';
import { api } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
  canManageCatalogue: () => boolean;
  canReceiveStock: () => boolean;
  canMakeSales: () => boolean;
  canIssueUsage: () => boolean;
  canApproveAdjustments: () => boolean;
  canManageSettings: () => boolean;
  isSuperAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    checkCurrentUser();
  }, []);

  async function checkCurrentUser() {
    try {
      const res = await api.get<{ user: User }>('/auth/me');
      if (res && res.user) {
        setUser(res.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  const login = async (email: string, password: string) => {
    const res = await api.post<{ user: User; token: string }>('/auth/login', { email, password });
    setUser(res.user);
    if (res.token && typeof window !== 'undefined') {
      localStorage.setItem('soundstock_token', res.token);
    }
    router.push('/dashboard');
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // ignore
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('soundstock_token');
    }
    setUser(null);
    router.push('/login');
  };

  const hasRole = (...roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const canManageCatalogue = () => hasRole('SUPER_ADMIN', 'INVENTORY_MANAGER');
  const canReceiveStock = () => hasRole('SUPER_ADMIN', 'INVENTORY_MANAGER', 'INVENTORY_STAFF');
  const canMakeSales = () => hasRole('SUPER_ADMIN', 'INVENTORY_MANAGER', 'SALES_STAFF');
  const canIssueUsage = () => hasRole('SUPER_ADMIN', 'INVENTORY_MANAGER', 'INVENTORY_STAFF');
  const canApproveAdjustments = () => hasRole('SUPER_ADMIN', 'INVENTORY_MANAGER');
  const canManageSettings = () => hasRole('SUPER_ADMIN');
  const isSuperAdmin = () => hasRole('SUPER_ADMIN');

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        hasRole,
        canManageCatalogue,
        canReceiveStock,
        canMakeSales,
        canIssueUsage,
        canApproveAdjustments,
        canManageSettings,
        isSuperAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
