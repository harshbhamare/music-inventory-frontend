'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { History, RefreshCw, Search } from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [selectedEntity]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedEntity) params.set('entityType', selectedEntity);

      const res = await api.get<{ logs: any[] }>(`/meta/audit-logs?${params.toString()}`);
      setLogs(res.logs || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      (l.actorEmail && l.actorEmail.toLowerCase().includes(search.toLowerCase())) ||
      (l.reason && l.reason.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            System Activity & Audit Logs
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Complete traceability of sensitive operations, security changes, and staff actions.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchLogs} title="Refresh">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search action, actor, reason..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>

            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1.5 font-medium"
            >
              <option value="">All Entity Types</option>
              <option value="Product">Product</option>
              <option value="Sale">Sale</option>
              <option value="InternalUsage">Internal Usage</option>
              <option value="PurchaseReceipt">Purchase Receipt</option>
              <option value="InventoryAdjustment">Inventory Adjustment</option>
              <option value="MaintenanceRecord">Maintenance Record</option>
              <option value="User">User</option>
            </select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="responsive-table-wrapper">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                  <th className="py-3 px-4">Diff Snapshot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Loading audit history...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      No audit records found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-slate-900 dark:text-white font-semibold">
                        {log.actorEmail}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-[10px]">
                          {log.actorRole}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-bold text-amber-500 whitespace-nowrap">
                        {log.action}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {log.entityType}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {log.entityId}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs text-slate-600 dark:text-slate-400">
                        {log.reason || '—'}
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate font-mono text-[10px] text-slate-500">
                        {log.afterState ? JSON.stringify(log.afterState) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
