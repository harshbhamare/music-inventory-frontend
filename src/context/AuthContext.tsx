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
  canUpdateStock: () => boolean;
  canManageSuppliers: () => boolean;
  canManageMaintenance: () => boolean;
  canApproveAdjustments: () => boolean;
  canManageSettings: () => boolean;
  canManageUsers: () => boolean;
  isSuperAdmin: () => boolean;
  isManager: () => boolean;
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
        // Normalize role if legacy role present
        const normalizedRole =
          res.user.role === 'INVENTORY_MANAGER' ? 'MANAGER' : res.user.role;
        setUser({ ...res.user, role: normalizedRole as UserRole });
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
    const normalizedRole =
      res.user.role === 'INVENTORY_MANAGER' ? 'MANAGER' : res.user.role;
    setUser({ ...res.user, role: normalizedRole as UserRole });
    if (res.token && typeof window !== 'undefined') {
      localStorage.setItem('stereobliss_token', res.token);
      localStorage.removeItem('soundstock_token');
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
      localStorage.removeItem('stereobliss_token');
      localStorage.removeItem('soundstock_token');
    }
    setUser(null);
    router.push('/login');
  };

  const hasRole = (...roles: UserRole[]): boolean => {
    if (!user) return false;
    const current = (user.role === 'INVENTORY_MANAGER' ? 'MANAGER' : user.role) as UserRole;
    return roles.includes(current) || roles.includes(user.role);
  };

  // Main features: Super Admin & Manager
  const isSuperAdmin = () => hasRole('SUPER_ADMIN');
  const canManageCatalogue = () => hasRole('SUPER_ADMIN', 'MANAGER'); // Product creation, deletion & master catalog specs
  const canManageSettings = () => hasRole('SUPER_ADMIN', 'MANAGER'); // Settings, store details, cron customizations & report schedules
  const canManageUsers = () => isSuperAdmin(); // User accounts, provisioning, role assignment
  const canApproveAdjustments = () => hasRole('SUPER_ADMIN', 'MANAGER'); // Review & approve write-offs and adjustments

  // Operational tracking and updating features: Manager & Super Admin
  const isManager = () => hasRole('MANAGER') || hasRole('INVENTORY_MANAGER');
  const canReceiveStock = () => hasRole('SUPER_ADMIN', 'MANAGER');
  const canMakeSales = () => hasRole('SUPER_ADMIN', 'MANAGER');
  const canIssueUsage = () => hasRole('SUPER_ADMIN', 'MANAGER');
  const canUpdateStock = () => hasRole('SUPER_ADMIN', 'MANAGER');
  const canManageSuppliers = () => hasRole('SUPER_ADMIN', 'MANAGER');
  const canManageMaintenance = () => hasRole('SUPER_ADMIN', 'MANAGER');

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
        canUpdateStock,
        canManageSuppliers,
        canManageMaintenance,
        canApproveAdjustments,
        canManageSettings,
        canManageUsers,
        isSuperAdmin,
        isManager,
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
