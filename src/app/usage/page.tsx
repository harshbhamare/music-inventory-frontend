'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { InternalUsage, Product, SerializedItem, StockLocation } from '@/lib/types';
import { formatDate, formatDateTime } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import {
  GraduationCap,
  Plus,
  RotateCcw,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  CalendarPlus,
  UserCheck,
  Search,
  Wrench,
  ShieldAlert,
} from 'lucide-react';

export default function UsagePage() {
  const { canIssueUsage } = useAuth();
  const [usages, setUsages] = useState<InternalUsage[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [availableSerials, setAvailableSerials] = useState<SerializedItem[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'OVERDUE' | 'RETURNED'>('ALL');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Issue Equipment Modal
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [purpose, setPurpose] = useState<
    'CLASS' | 'PRACTICE' | 'REHEARSAL' | 'DEMONSTRATION' | 'EVENT' | 'REPAIR' | 'OTHER'
  >('CLASS');
  const [assignedPerson, setAssignedPerson] = useState('');
  const [assignedPersonContact, setAssignedPersonContact] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedSerialId, setSelectedSerialId] = useState('');
  const [issueQuantity, setIssueQuantity] = useState(1);
  const [issueCondition, setIssueCondition] = useState('GOOD');
  const [notes, setNotes] = useState('');
  const [issueError, setIssueError] = useState('');
  const [isIssuing, setIsIssuing] = useState(false);

  // Return & Inspection Modal
  const [returnModalUsage, setReturnModalUsage] = useState<InternalUsage | null>(null);
  const [inspectionOutcomes, setInspectionOutcomes] = useState<
    Record<string, { condition: string; outcome: 'OK_TO_STOCK' | 'NEEDS_MAINTENANCE' | 'QUARANTINE_DAMAGED'; notes: string }>
  >({});
  const [returnError, setReturnError] = useState('');
  const [isReturning, setIsReturning] = useState(false);

  // Extend Date Modal
  const [extendModalUsage, setExtendModalUsage] = useState<InternalUsage | null>(null);
  const [newExtendedDate, setNewExtendedDate] = useState('');
  const [extensionReason, setExtensionReason] = useState('');
  const [extendError, setExtendError] = useState('');
  const [isExtending, setIsExtending] = useState(false);

  useEffect(() => {
    fetchUsages();
    fetchInventory();
  }, [statusFilter, search]);

  const fetchUsages = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (search) params.set('search', search);

      const res = await api.get<{ usages: InternalUsage[] }>(`/usage?${params.toString()}`);
      setUsages(res.usages || []);
    } catch (err) {
      console.error('Failed to load internal usages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const [prodRes, serialsRes, locRes] = await Promise.all([
        api.get<{ items: Product[] }>('/products?limit=100'),
        api.get<{ items: SerializedItem[] }>('/products/serialized-items?status=AVAILABLE&limit=100'),
        api.get<{ locations: StockLocation[] }>('/meta/locations'),
      ]);
      setProducts(prodRes.items || []);
      setAvailableSerials(serialsRes.items || []);
      setLocations(locRes.locations || []);
    } catch (err) {
      console.error('Failed to load inventory for usage:', err);
    }
  };

  const selectedProduct = products.find((p) => p._id === selectedProductId);

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIssueError('');
    setIsIssuing(true);

    try {
      if (!selectedProduct) throw new Error('Please select an instrument or accessory.');

      const isSerialized = selectedProduct.trackingMode === 'SERIALIZED';
      if (isSerialized && !selectedSerialId) {
        throw new Error('Please select an available serialized instrument unit.');
      }

      await api.post('/usage', {
        purpose,
        assignedPerson: assignedPerson.trim(),
        assignedPersonContact: assignedPersonContact.trim() || undefined,
        location: locations[0]?._id,
        expectedReturnDate,
        notes: notes.trim() || undefined,
        items: [
          {
            product: selectedProduct._id,
            quantityIssued: isSerialized ? 1 : issueQuantity,
            serializedItemId: isSerialized ? selectedSerialId : undefined,
            issueCondition,
          },
        ],
      });

      setIsIssueModalOpen(false);
      setAssignedPerson('');
      setAssignedPersonContact('');
      setSelectedProductId('');
      setSelectedSerialId('');
      setNotes('');
      fetchUsages();
      fetchInventory();
    } catch (err: any) {
      setIssueError(err.message || 'Failed to issue equipment.');
    } finally {
      setIsIssuing(false);
    }
  };

  const openReturnModal = (usage: InternalUsage) => {
    setReturnModalUsage(usage);
    const initialOutcomes: any = {};
    usage.items.forEach((item, idx) => {
      initialOutcomes[idx] = {
        condition: item.issueCondition || 'GOOD',
        outcome: 'OK_TO_STOCK',
        notes: '',
      };
    });
    setInspectionOutcomes(initialOutcomes);
    setReturnError('');
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnModalUsage) return;
    setReturnError('');
    setIsReturning(true);

    try {
      const itemsPayload = returnModalUsage.items.map((item, idx) => {
        const insp = inspectionOutcomes[idx] || {
          condition: 'GOOD',
          outcome: 'OK_TO_STOCK',
          notes: '',
        };
        const remaining = item.quantityIssued - item.quantityReturned;

        return {
          product: (item.product as any)._id || item.product,
          quantityReturned: remaining,
          serializedItemId: (item.serializedItemId as any)?._id || item.serializedItemId,
          returnCondition: insp.condition,
          inspectionOutcome: insp.outcome,
          inspectionNotes: insp.notes || undefined,
        };
      });

      await api.post(`/usage/${returnModalUsage._id}/return`, {
        items: itemsPayload,
        notes: 'Return inspection processed',
      });

      setReturnModalUsage(null);
      fetchUsages();
      fetchInventory();
    } catch (err: any) {
      setReturnError(err.message || 'Failed to process return inspection.');
    } finally {
      setIsReturning(false);
    }
  };

  const openExtendModal = (usage: InternalUsage) => {
    setExtendModalUsage(usage);
    setNewExtendedDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16));
    setExtensionReason('');
    setExtendError('');
  };

  const handleExtendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendModalUsage) return;
    setExtendError('');
    setIsExtending(true);

    try {
      await api.post(`/usage/${extendModalUsage._id}/extend`, {
        extendedDate: newExtendedDate,
        reason: extensionReason.trim(),
      });

      setExtendModalUsage(null);
      fetchUsages();
    } catch (err: any) {
      setExtendError(err.message || 'Failed to extend loan date.');
    } finally {
      setIsExtending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Internal Equipment & Academy Loans
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track musical instruments deployed for music classes, rehearsals, student practice, and events.
          </p>
        </div>

        {canIssueUsage() && (
          <Button
            size="sm"
            variant="default"
            onClick={() => setIsIssueModalOpen(true)}
            className="gap-1.5 text-xs font-bold shadow-md"
          >
            <Plus className="h-4 w-4" />
            <span>Issue Instrument / Gear</span>
          </Button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
          {(['ALL', 'ACTIVE', 'OVERDUE', 'RETURNED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 font-bold rounded-lg transition-colors ${
                statusFilter === s
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {s === 'ALL' ? 'All Loans' : s === 'ACTIVE' ? 'Active Loans' : s === 'OVERDUE' ? '⚠️ Overdue' : 'Returned'}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search Reference, Student, Teacher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      {/* Internal Usages List */}
      <Card>
        <CardContent className="p-0">
          <div className="responsive-table-wrapper">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Issue Ref</th>
                  <th className="py-3 px-4">Responsible Person</th>
                  <th className="py-3 px-4">Purpose</th>
                  <th className="py-3 px-4">Issued Instrument / Gear</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Expected Return</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Loading usage records...
                    </td>
                  </tr>
                ) : usages.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      No internal equipment loans matching this filter.
                    </td>
                  </tr>
                ) : (
                  usages.map((u) => {
                    const isReturned = u.status === 'RETURNED';
                    const isOverdue = u.isOverdue || (!isReturned && new Date(u.expectedReturnDate) < new Date());

                    return (
                      <tr
                        key={u._id}
                        className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 ${
                          isOverdue ? 'bg-rose-500/5' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-amber-500">
                          {u.issueReference}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {u.assignedPerson}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {u.assignedPersonContact || 'No contact specified'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-[10px] font-semibold">
                            {u.purpose}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            {u.items.map((it, idx) => (
                              <div key={idx} className="text-slate-800 dark:text-slate-200">
                                • {it.product?.name} (x{it.quantityIssued})
                                {it.serializedItemId && (
                                  <span className="ml-1.5 font-mono text-amber-500 font-bold">
                                    [{(it.serializedItemId as any).assetId || 'Serialized'}]
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-500">{formatDate(u.issueDate)}</td>
                        <td className="py-3 px-4">
                          <span
                            className={
                              isOverdue ? 'font-bold text-rose-500 flex items-center gap-1' : 'text-slate-700 dark:text-slate-300'
                            }
                          >
                            {isOverdue && <AlertTriangle className="h-3 w-3 shrink-0" />}
                            {formatDateTime(u.expectedReturnDate)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={isReturned ? 'success' : isOverdue ? 'danger' : 'info'}
                            className="text-[10px]"
                          >
                            {isReturned ? 'RETURNED' : isOverdue ? 'OVERDUE' : 'ACTIVE LOAN'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {!isReturned && canIssueUsage() ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => openReturnModal(u)}
                                className="h-7 text-[11px] font-bold gap-1"
                              >
                                <RotateCcw className="h-3 w-3" />
                                <span>Inspect & Return</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openExtendModal(u)}
                                className="h-7 text-[11px]"
                                title="Extend Return Date"
                              >
                                <CalendarPlus className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-emerald-500 font-bold flex items-center justify-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Completed
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

      {/* Issue Equipment Modal */}
      <Modal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        title="Issue Equipment for Academy Activities"
        description="Loan instruments or accessories for music classes, student practice, rehearsals, or demos."
        maxWidth="2xl"
      >
        <form onSubmit={handleIssueSubmit} className="space-y-4">
          {issueError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs font-semibold text-red-500">
              {issueError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Loan Purpose *
              </label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value as any)}
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-semibold text-amber-500"
              >
                <option value="CLASS">Music Academy Class</option>
                <option value="PRACTICE">Student Practice Studio</option>
                <option value="REHEARSAL">Band Rehearsal Room</option>
                <option value="DEMONSTRATION">Student / Teacher Demonstration</option>
                <option value="EVENT">Academy Concert / Live Event</option>
                <option value="REPAIR">Setup / Inspection</option>
              </select>
            </div>

            <Input
              label="Expected Return Date & Time *"
              type="datetime-local"
              required
              value={expectedReturnDate}
              onChange={(e) => setExpectedReturnDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Responsible Person (Student / Teacher) *"
              required
              placeholder="e.g. Aarav Mehta (Batch 4)"
              value={assignedPerson}
              onChange={(e) => setAssignedPerson(e.target.value)}
            />

            <Input
              label="Contact Phone Number"
              placeholder="+91 98234 56789"
              value={assignedPersonContact}
              onChange={(e) => setAssignedPersonContact(e.target.value)}
            />
          </div>

          {/* Product & Serialized Asset Selection */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Select Instrument / Product *
              </label>
              <select
                required
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  setSelectedSerialId('');
                }}
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-medium"
              >
                <option value="">Select an instrument...</option>
                {products
                  .filter((p) => p.availableForSale > 0)
                  .map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.sku}) — Available: {p.availableForSale} units ({p.trackingMode})
                    </option>
                  ))}
              </select>
            </div>

            {selectedProduct && selectedProduct.trackingMode === 'SERIALIZED' && (
              <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="block text-xs font-semibold uppercase tracking-wider text-amber-500">
                  Select Specific Serialized Instrument *
                </label>
                <select
                  required
                  value={selectedSerialId}
                  onChange={(e) => setSelectedSerialId(e.target.value)}
                  className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 font-mono font-bold text-amber-500"
                >
                  <option value="">Choose Asset ID...</option>
                  {availableSerials
                    .filter((su) => (su.product?._id || su.product) === selectedProduct._id)
                    .map((su) => (
                      <option key={su._id} value={su._id}>
                        {su.assetId} — Condition: {su.condition} (Serial:{' '}
                        {su.manufacturerSerial || 'N/A'})
                      </option>
                    ))}
                </select>
              </div>
            )}

            {selectedProduct && selectedProduct.trackingMode === 'QUANTITY' && (
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                <Input
                  label="Quantity to Issue *"
                  type="number"
                  min="1"
                  max={selectedProduct.availableForSale}
                  value={issueQuantity}
                  onChange={(e) => setIssueQuantity(parseInt(e.target.value, 10) || 1)}
                />
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Condition
                  </label>
                  <select
                    value={issueCondition}
                    onChange={(e) => setIssueCondition(e.target.value)}
                    className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950"
                  >
                    <option value="NEW">NEW</option>
                    <option value="MINT">MINT</option>
                    <option value="GOOD">GOOD</option>
                    <option value="FAIR">FAIR</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <Input
            label="Notes / Special Instructions"
            placeholder="e.g. For beginner acoustic batch, please return to Studio 2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsIssueModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="default" isLoading={isIssuing} className="font-bold">
              Issue Instrument
            </Button>
          </div>
        </form>
      </Modal>

      {/* Return & Inspection Modal */}
      <Modal
        isOpen={!!returnModalUsage}
        onClose={() => setReturnModalUsage(null)}
        title={`Return Inspection — ${returnModalUsage?.issueReference}`}
        description="Inspect physical condition of returned equipment and set release disposition."
        maxWidth="2xl"
      >
        {returnModalUsage && (
          <form onSubmit={handleReturnSubmit} className="space-y-5">
            {returnError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs font-semibold text-red-500">
                {returnError}
              </div>
            )}

            <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-xs">
              <span className="text-slate-500">Loaned to:</span>{' '}
              <strong className="text-slate-900 dark:text-white">
                {returnModalUsage.assignedPerson}
              </strong>{' '}
              for <strong>{returnModalUsage.purpose}</strong>
            </div>

            <div className="space-y-4">
              {returnModalUsage.items.map((item, idx) => {
                const insp = inspectionOutcomes[idx] || {
                  condition: 'GOOD',
                  outcome: 'OK_TO_STOCK',
                  notes: '',
                };

                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3"
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {item.product?.name}
                      </span>
                      {item.serializedItemId && (
                        <span className="font-mono font-bold text-amber-500">
                          Asset ID: {(item.serializedItemId as any).assetId || 'Serialized'}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-500">Return Condition *</label>
                        <select
                          value={insp.condition}
                          onChange={(e) => {
                            setInspectionOutcomes({
                              ...inspectionOutcomes,
                              [idx]: { ...insp, condition: e.target.value },
                            });
                          }}
                          className="w-full h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-800 bg-transparent"
                        >
                          <option value="MINT">MINT (Like New)</option>
                          <option value="GOOD">GOOD (Normal Wear)</option>
                          <option value="FAIR">FAIR (Needs Setup / Strings)</option>
                          <option value="POOR">POOR (Requires Luthier Repair)</option>
                          <option value="DAMAGED">DAMAGED (Cracked / Broken)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-slate-500">Inspection Outcome *</label>
                        <select
                          value={insp.outcome}
                          onChange={(e) => {
                            setInspectionOutcomes({
                              ...inspectionOutcomes,
                              [idx]: { ...insp, outcome: e.target.value as any },
                            });
                          }}
                          className="w-full h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-800 bg-transparent font-bold text-amber-500"
                        >
                          <option value="OK_TO_STOCK">
                            ✅ OK to Stock (Return to Available Pool)
                          </option>
                          <option value="NEEDS_MAINTENANCE">
                            🔧 Needs Maintenance (Send for Repair)
                          </option>
                          <option value="QUARANTINE_DAMAGED">
                            🚫 Quarantine / Damaged (Block from Sale)
                          </option>
                        </select>
                      </div>
                    </div>

                    <Input
                      placeholder="Inspection notes (e.g. Minor scratches on back, strings still good)"
                      value={insp.notes}
                      onChange={(e) => {
                        setInspectionOutcomes({
                          ...inspectionOutcomes,
                          [idx]: { ...insp, notes: e.target.value },
                        });
                      }}
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setReturnModalUsage(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="default" isLoading={isReturning} className="font-bold">
                Confirm Return & Apply Stock Transition
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Extend Loan Modal */}
      <Modal
        isOpen={!!extendModalUsage}
        onClose={() => setExtendModalUsage(null)}
        title="Extend Loan Return Deadline"
        description={`Extend schedule for loan ${extendModalUsage?.issueReference}`}
        maxWidth="md"
      >
        {extendModalUsage && (
          <form onSubmit={handleExtendSubmit} className="space-y-4">
            {extendError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs font-semibold text-red-500">
                {extendError}
              </div>
            )}

            <Input
              label="New Expected Return Date & Time *"
              type="datetime-local"
              required
              value={newExtendedDate}
              onChange={(e) => setNewExtendedDate(e.target.value)}
            />

            <Input
              label="Reason for Extension *"
              required
              placeholder="e.g. Student requested 1 extra week for annual festival rehearsal"
              value={extensionReason}
              onChange={(e) => setExtensionReason(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setExtendModalUsage(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="default" isLoading={isExtending} className="font-bold">
                Confirm Extension
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
