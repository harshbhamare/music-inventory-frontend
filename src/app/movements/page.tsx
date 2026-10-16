'use client';

import React, { useState, useEffect } from 'react';
import { api, getApiUrl } from '@/lib/api';
import { StockMovement } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  ArrowLeftRight,
  Search,
  FileSpreadsheet,
  RefreshCw,
  Filter,
} from 'lucide-react';

export default function MovementsPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movementType, setMovementType] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMovements();
  }, [movementType, search]);

  const fetchMovements = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (movementType) params.set('movementType', movementType);
      if (search) params.set('search', search);

      const res = await api.get<{ movements: StockMovement[] }>(`/movements?${params.toString()}`);
      setMovements(res.movements || []);
    } catch (err) {
      console.error('Failed to load movements:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const exportCsv = () => {
    window.open(getApiUrl('/reports/export/movements'), '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Stock Movement Audit Ledger
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Immutable transaction history explaining every change in quantity, condition, location, or ownership.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5 text-xs">
            <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
            <span>Export CSV</span>
          </Button>

          <Button variant="outline" size="sm" onClick={fetchMovements} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filter toolbar */}
      <Card>
        <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search Transaction Ref, Reason..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>

            <select
              value={movementType}
              onChange={(e) => setMovementType(e.target.value)}
              className="text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1.5 font-medium"
            >
              <option value="">All Movement Types</option>
              <option value="PURCHASE_RECEIPT">Purchase Receipt (+ Intake)</option>
              <option value="SALE">Customer Sale (- Outflow)</option>
              <option value="SALE_RETURN">Sale Return (+ Return to Stock)</option>
              <option value="INTERNAL_ISSUE">Internal Usage Issue (Academy)</option>
              <option value="INTERNAL_RETURN">Internal Usage Return</option>
              <option value="MAINTENANCE_OUT">Maintenance Out</option>
              <option value="MAINTENANCE_IN">Maintenance In</option>
              <option value="MANUAL_ADJUSTMENT">Manual Adjustment</option>
            </select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="responsive-table-wrapper">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Transaction Ref</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Product / SKU</th>
                  <th className="py-3 px-4">Asset ID</th>
                  <th className="py-3 px-4 text-center">Quantity Delta</th>
                  <th className="py-3 px-4">Status Transition</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Loading stock movements...
                    </td>
                  </tr>
                ) : movements.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      No stock movements found matching filter.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr key={m._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {formatDateTime(m.createdAt)}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-amber-500 whitespace-nowrap">
                        {m.transactionRef}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-[10px]">
                          {m.movementType.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {m.product?.name}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">{m.product?.sku}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                        {m.serializedItem?.assetId || '—'}
                      </td>
                      <td className="py-3 px-4 text-center font-bold">
                        <span
                          className={
                            m.quantityDelta > 0
                              ? 'text-emerald-500'
                              : m.quantityDelta < 0
                              ? 'text-rose-500'
                              : 'text-slate-400'
                          }
                        >
                          {m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {m.sourceStatus && m.destinationStatus
                          ? `${m.sourceStatus} → ${m.destinationStatus}`
                          : '—'}
                      </td>
                      <td className="py-3 px-4 max-w-xs text-slate-600 dark:text-slate-300">
                        {m.reason}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {m.performedBy?.name || 'System'}
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
