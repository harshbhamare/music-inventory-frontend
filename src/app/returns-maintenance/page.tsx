'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { MaintenanceRecord, InventoryAdjustment, Product, SerializedItem, StockLocation } from '@/lib/types';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import {
  Wrench,
  ShieldCheck,
  Plus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Tag,
  Boxes,
} from 'lucide-react';

export default function ReturnsMaintenancePage() {
  const { user, canApproveAdjustments } = useAuth();
  const [activeTab, setActiveTab] = useState<'maintenance' | 'approvals' | 'requestAdjustment'>('maintenance');

  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [serializedItems, setSerializedItems] = useState<SerializedItem[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Maintenance Ticket Modal
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedSerialId, setSelectedSerialId] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [vendor, setVendor] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('0');
  const [ticketError, setTicketError] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  // Release Maintenance Modal
  const [releaseRecord, setReleaseRecord] = useState<MaintenanceRecord | null>(null);
  const [releaseDisposition, setReleaseDisposition] = useState<'AVAILABLE' | 'QUARANTINED' | 'RETIRED'>('AVAILABLE');
  const [repairDetails, setRepairDetails] = useState('');
  const [finalCost, setFinalCost] = useState('0');
  const [releaseError, setReleaseError] = useState('');
  const [isReleasing, setIsReleasing] = useState(false);

  // Request Adjustment Form
  const [adjType, setAdjType] = useState<'WRITE_OFF' | 'MANUAL_COUNT' | 'DAMAGE_LOSS' | 'FOUND_ITEM' | 'CORRECTION'>('DAMAGE_LOSS');
  const [adjReason, setAdjReason] = useState('');
  const [adjProductId, setAdjProductId] = useState('');
  const [adjSerialId, setAdjSerialId] = useState('');
  const [adjDelta, setAdjDelta] = useState(-1);
  const [adjError, setAdjError] = useState('');
  const [adjSuccess, setAdjSuccess] = useState('');
  const [isSubmittingAdj, setIsSubmittingAdj] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [mntRes, adjRes, prodRes, serRes, locRes] = await Promise.all([
        api.get<{ records: MaintenanceRecord[] }>('/maintenance'),
        api.get<{ adjustments: InventoryAdjustment[] }>('/adjustments'),
        api.get<{ items: Product[] }>('/products?limit=100'),
        api.get<{ items: SerializedItem[] }>('/products/serialized-items?limit=200'),
        api.get<{ locations: StockLocation[] }>('/meta/locations'),
      ]);

      setRecords(mntRes.records || []);
      setAdjustments(adjRes.adjustments || []);
      setProducts(prodRes.items || []);
      setSerializedItems(serRes.items || []);
      setLocations(locRes.locations || []);
    } catch (err) {
      console.error('Failed to load maintenance/adjustments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedProduct = products.find((p) => p._id === selectedProductId);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setTicketError('');
    setIsSubmittingTicket(true);

    try {
      if (!selectedProductId) throw new Error('Please select a product.');

      await api.post('/maintenance', {
        product: selectedProductId,
        serializedItem: selectedSerialId || undefined,
        location: locations[0]?._id,
        problemDescription: problemDescription.trim(),
        vendor: vendor.trim() || undefined,
        cost: parseFloat(estimatedCost) || 0,
      });

      setIsNewTicketOpen(false);
      setSelectedProductId('');
      setSelectedSerialId('');
      setProblemDescription('');
      setVendor('');
      setEstimatedCost('0');
      fetchData();
    } catch (err: any) {
      setTicketError(err.message || 'Failed to create maintenance ticket.');
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  const handleReleaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!releaseRecord) return;
    setReleaseError('');
    setIsReleasing(true);

    try {
      await api.post(`/maintenance/${releaseRecord._id}/release`, {
        releaseDisposition,
        repairDetails: repairDetails.trim(),
        cost: parseFloat(finalCost) || 0,
      });

      setReleaseRecord(null);
      setRepairDetails('');
      setFinalCost('0');
      fetchData();
    } catch (err: any) {
      setReleaseError(err.message || 'Failed to release maintenance record.');
    } finally {
      setIsReleasing(false);
    }
  };

  const handleReviewAdjustment = async (id: string, action: 'APPROVE' | 'REJECT') => {
    try {
      await api.post(`/adjustments/${id}/review`, { action });
      fetchData();
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    }
  };

  const handleRequestAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdjError('');
    setAdjSuccess('');
    setIsSubmittingAdj(true);

    try {
      if (!adjProductId) throw new Error('Please select an affected product.');

      const res = await api.post<{ adjustment: InventoryAdjustment }>('/adjustments', {
        location: locations[0]?._id,
        type: adjType,
        reason: adjReason.trim(),
        items: [
          {
            product: adjProductId,
            serializedItem: adjSerialId || undefined,
            quantityDelta: adjDelta,
            reason: adjReason.trim(),
          },
        ],
      });

      setAdjSuccess(
        res.adjustment.status === 'APPROVED'
          ? 'Adjustment applied automatically.'
          : 'Adjustment submitted for Manager approval.'
      );
      setAdjReason('');
      setAdjProductId('');
      setAdjSerialId('');
      fetchData();
    } catch (err: any) {
      setAdjError(err.message || 'Failed to submit adjustment.');
    } finally {
      setIsSubmittingAdj(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Repairs, Maintenance & Adjustments
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Luthier repairs, quarantine dispositions, and manager approval queues.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={() => setIsNewTicketOpen(true)}
            className="gap-1.5 text-xs font-bold"
          >
            <Plus className="h-4 w-4" />
            <span>Create Repair Ticket</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('maintenance')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'maintenance'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Wrench className="h-4 w-4" />
          <span>Active Repairs & Setup</span>
          <span className="ml-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-bold">
            {records.filter((r) => r.status === 'IN_PROGRESS' || r.status === 'WAITING_PARTS').length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('approvals')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'approvals'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Superadmin Approvals</span>
          {adjustments.filter((a) => a.status === 'PENDING_APPROVAL').length > 0 && (
            <span className="ml-1 rounded-full bg-rose-500 text-white px-2 py-0.5 text-xs font-bold">
              {adjustments.filter((a) => a.status === 'PENDING_APPROVAL').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('requestAdjustment')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'requestAdjustment'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          <span>Request Stock Adjustment</span>
        </button>
      </div>

      {/* Tab 1: Maintenance Records */}
      {activeTab === 'maintenance' && (
        <Card>
          <CardContent className="p-0">
            <div className="responsive-table-wrapper">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Ticket Ref</th>
                    <th className="py-3 px-4">Instrument / Gear</th>
                    <th className="py-3 px-4">Problem Description</th>
                    <th className="py-3 px-4">Vendor / Luthier</th>
                    <th className="py-3 px-4 text-right">Repair Cost</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date Started</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        No maintenance tickets on record.
                      </td>
                    </tr>
                  ) : (
                    records.map((rec) => {
                      const isClosed = rec.status === 'COMPLETED' || rec.status === 'UNREPAIRABLE';
                      return (
                        <tr key={rec._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-mono font-bold text-amber-500">
                            {rec.recordReference}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {rec.product?.name}
                            </div>
                            {rec.serializedItem && (
                              <div className="font-mono text-[11px] text-amber-500">
                                Asset ID: {(rec.serializedItem as any).assetId || 'Serialized'}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate text-slate-600 dark:text-slate-300">
                            {rec.problemDescription}
                          </td>
                          <td className="py-3 px-4 text-slate-500">{rec.vendor || 'In-House'}</td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                            {formatCurrency(rec.cost)}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={
                                rec.status === 'COMPLETED'
                                  ? 'success'
                                  : rec.status === 'UNREPAIRABLE'
                                  ? 'danger'
                                  : 'warning'
                              }
                              className="text-[10px]"
                            >
                              {rec.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-slate-500">{formatDate(rec.startedAt)}</td>
                          <td className="py-3 px-4 text-center">
                            {!isClosed ? (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => {
                                  setReleaseRecord(rec);
                                  setFinalCost(String(rec.cost || 0));
                                }}
                                className="h-7 text-[11px] font-bold"
                              >
                                Release / Close
                              </Button>
                            ) : (
                              <span className="text-[11px] text-slate-400">
                                Closed ({rec.releaseDisposition})
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Manager Approval Queue */}
      {activeTab === 'approvals' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Pending Inventory Adjustments & Write-Offs</span>
              <span className="text-xs font-normal text-slate-500">
                Rule: Requester cannot approve their own adjustment
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="responsive-table-wrapper">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Items / Proposed Deltas</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Requested By</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Superadmin Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {adjustments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        No adjustment requests in queue.
                      </td>
                    </tr>
                  ) : (
                    adjustments.map((adj) => {
                      const isPending = adj.status === 'PENDING_APPROVAL';
                      const isSelf = adj.requestedBy?._id === user?.id;

                      return (
                        <tr key={adj._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-mono font-bold text-amber-500">
                            {adj.adjustmentReference}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline">{adj.type}</Badge>
                          </td>
                          <td className="py-3 px-4">
                            {adj.items?.map((it, idx) => (
                              <div key={idx} className="text-slate-800 dark:text-slate-200">
                                • {it.product?.name}:{' '}
                                <strong
                                  className={it.quantityDelta < 0 ? 'text-rose-500' : 'text-emerald-500'}
                                >
                                  {it.quantityDelta > 0 ? `+${it.quantityDelta}` : it.quantityDelta}
                                </strong>
                                {it.serializedItem && (
                                  <span className="ml-1 text-[10px] font-mono text-amber-500">
                                    [{(it.serializedItem as any).assetId || 'Asset'}]
                                  </span>
                                )}
                              </div>
                            ))}
                          </td>
                          <td className="py-3 px-4 max-w-xs text-slate-600 dark:text-slate-300">
                            {adj.reason}
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            {adj.requestedBy?.name || 'Staff'}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={
                                adj.status === 'APPROVED'
                                  ? 'success'
                                  : adj.status === 'REJECTED'
                                  ? 'danger'
                                  : 'warning'
                              }
                              className="text-[10px]"
                            >
                              {adj.status.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isPending && canApproveAdjustments() ? (
                              isSelf ? (
                                <span className="text-[10px] text-slate-400 italic">
                                  Self-approval blocked
                                </span>
                              ) : (
                                <div className="flex items-center justify-center gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => handleReviewAdjustment(adj._id, 'APPROVE')}
                                    className="h-7 text-[11px] font-bold"
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleReviewAdjustment(adj._id, 'REJECT')}
                                    className="h-7 text-[11px]"
                                  >
                                    Reject
                                  </Button>
                                </div>
                              )
                            ) : (
                              <span className="text-[11px] text-slate-400">
                                {adj.approvedBy ? `Reviewed by ${adj.approvedBy.name}` : 'Settled'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Request Stock Adjustment Form */}
      {activeTab === 'requestAdjustment' && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-base">Submit Inventory Adjustment Request</CardTitle>
            <p className="text-xs text-slate-500">
              Submit write-offs, physical count discrepancies, or damage loss for Superadmin approval.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRequestAdjustmentSubmit} className="space-y-4">
              {adjError && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs font-semibold text-red-500">
                  {adjError}
                </div>
              )}
              {adjSuccess && (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs font-semibold text-emerald-500">
                  {adjSuccess}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Adjustment Type *
                </label>
                <select
                  value={adjType}
                  onChange={(e) => setAdjType(e.target.value as any)}
                  className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-semibold"
                >
                  <option value="DAMAGE_LOSS">Damage / Loss (Deduct from On-Hand)</option>
                  <option value="WRITE_OFF">Write-Off (Irreparable Damaged Asset)</option>
                  <option value="MANUAL_COUNT">Manual Physical Count Variance</option>
                  <option value="FOUND_ITEM">Found / Recovered Stock</option>
                  <option value="CORRECTION">Ledger Correction</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Select Product *
                </label>
                <select
                  required
                  value={adjProductId}
                  onChange={(e) => {
                    setAdjProductId(e.target.value);
                    setAdjSerialId('');
                  }}
                  className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950"
                >
                  <option value="">Select a product...</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.sku}) — On Hand: {p.stockQuantity?.onHand} ({p.trackingMode})
                    </option>
                  ))}
                </select>
              </div>

              {selectedProduct?.trackingMode === 'SERIALIZED' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-amber-500">
                    Select Specific Serialized Instrument *
                  </label>
                  <select
                    value={adjSerialId}
                    onChange={(e) => setAdjSerialId(e.target.value)}
                    className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-mono text-amber-500 font-bold"
                  >
                    <option value="">Select Serialized Asset...</option>
                    {serializedItems
                      .filter((su) => (su.product?._id || su.product) === adjProductId)
                      .map((su) => (
                        <option key={su._id} value={su._id}>
                          {su.assetId} — Status: {su.status} (Serial: {su.manufacturerSerial || 'N/A'})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <Input
                label="Quantity Delta (e.g. -1 for loss, +2 for found stock) *"
                type="number"
                required
                value={adjDelta}
                onChange={(e) => setAdjDelta(parseInt(e.target.value, 10) || 0)}
              />

              <Input
                label="Detailed Reason & Justification *"
                required
                placeholder="e.g. Broken headstock during rehearsal, beyond repair. Verified by luthier."
                value={adjReason}
                onChange={(e) => setAdjReason(e.target.value)}
              />

              <Button type="submit" variant="default" isLoading={isSubmittingAdj} className="w-full font-bold">
                Submit for Approval
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Release Maintenance Modal */}
      <Modal
        isOpen={!!releaseRecord}
        onClose={() => setReleaseRecord(null)}
        title={`Release Maintenance Ticket — ${releaseRecord?.recordReference}`}
        description="Inspect completed repair, record actual costs, and transition asset state."
        maxWidth="lg"
      >
        {releaseRecord && (
          <form onSubmit={handleReleaseSubmit} className="space-y-4">
            {releaseError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs font-semibold text-red-500">
                {releaseError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Release Outcome / Disposition *
              </label>
              <select
                value={releaseDisposition}
                onChange={(e) => setReleaseDisposition(e.target.value as any)}
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-amber-500"
              >
                <option value="AVAILABLE">✅ Repaired & Good (Return to Available Stock)</option>
                <option value="QUARANTINED">🚫 Still Defective (Hold in Quarantine)</option>
                <option value="RETIRED">⚠️ Beyond Repair / Written Off (Retire Asset)</option>
              </select>
            </div>

            <Input
              label="Repair Details / Work Performed *"
              required
              placeholder="e.g. Fret dressing, action setup, replaced volume potentiometer"
              value={repairDetails}
              onChange={(e) => setRepairDetails(e.target.value)}
            />

            <Input
              label="Actual Repair Cost (₹)"
              type="number"
              min="0"
              value={finalCost}
              onChange={(e) => setFinalCost(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setReleaseRecord(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="default" isLoading={isReleasing} className="font-bold">
                Confirm Release
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
