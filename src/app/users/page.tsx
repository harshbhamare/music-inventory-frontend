'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { User, UserRole } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import { ShieldCheck, Plus, UserCheck, ShieldAlert, Key } from 'lucide-react';

export default function UsersPage() {
  const { user: currentUser, canManageSettings, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New User Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('MANAGER');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{ users: User[] }>('/auth/users');
      setUsers(res.users || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      await api.patch(`/auth/users/${userId}/status`);
      fetchUsers();
    } catch (err: any) {
      alert(`Error toggling status: ${err.message}`);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSaving(true);

    try {
      await api.post('/auth/users', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      });

      setIsModalOpen(false);
      setName('');
      setEmail('');
      setPassword('');
      fetchUsers();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create user account.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isSuperAdmin()) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 mb-4">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Superadmin Access Required</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mt-1.5">
          User account management and role configuration are restricted to Superadmin accounts only.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            User Accounts & Roles
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage profile roles and system access for StereoBliss - Retail Inventory.
          </p>
        </div>

        {canManageSettings() && (
          <Button
            size="sm"
            variant="default"
            onClick={() => setIsModalOpen(true)}
            className="gap-1.5 text-xs font-bold"
          >
            <Plus className="h-4 w-4" />
            <span>Create Staff User</span>
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="responsive-table-wrapper">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created Date</th>
                  {canManageSettings() && <th className="py-3 px-4 text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Loading users...
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isSelf = u._id === currentUser?.id;
                    const roleColor = u.role === 'SUPER_ADMIN' ? 'default' : 'info';
                    const roleDisplay = u.role === 'SUPER_ADMIN' ? 'SUPERADMIN' : 'MANAGER';

                    return (
                      <tr key={u._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center font-bold text-xs">
                            {u.name.charAt(0)}
                          </div>
                          <span>{u.name}</span>
                          {isSelf && (
                            <span className="text-[10px] text-amber-500 font-bold">(You)</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-mono">
                          {u.email}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={roleColor as any} className="text-[10px] font-bold">
                            {roleDisplay}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={u.isActive ? 'success' : 'danger'} className="text-[10px]">
                            {u.isActive ? 'ACTIVE' : 'DEACTIVATED'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-500">{formatDate(u.createdAt)}</td>
                        {canManageSettings() && (
                          <td className="py-3 px-4 text-center">
                            {!isSelf && (
                              <Button
                                size="sm"
                                variant={u.isActive ? 'outline' : 'default'}
                                onClick={() => handleToggleStatus(u._id!)}
                                className="h-7 text-[11px]"
                              >
                                {u.isActive ? 'Deactivate' : 'Reactivate'}
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Staff User"
        description="Provision access to StereoBliss - Retail Inventory."
        maxWidth="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs font-semibold text-red-500">
              {formError}
            </div>
          )}

          <Input
            label="Full Name *"
            required
            placeholder="e.g. Vikram Joshi"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            label="Email Address *"
            type="email"
            required
            placeholder="vikram@stereobliss.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Password *"
            type="password"
            required
            placeholder="Minimum 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Role & Permissions *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-semibold text-amber-500"
            >
              <option value="SUPER_ADMIN">Superadmin (Main Features, Full Control & Settings)</option>
              <option value="MANAGER">Manager (Stock Tracking, POS & Count Updates)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="default" isLoading={isSaving} className="font-bold">
              Create User
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
