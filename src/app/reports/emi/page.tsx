'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  ArrowLeft, CreditCard, RefreshCw, AlertTriangle, CheckCircle2,
  Clock, Search, Send, IndianRupee, TrendingUp, Users,
  ChevronRight, Mail,
} from 'lucide-react';

// ── types ─────────────────────────────────────────────────────────────────────
interface EmiPayment {
  monthIndex: number;
  billingMonth: string;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  status: 'PAID' | 'DUE' | 'OVERDUE';
}
interface EmiSale {
  _id: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  grandTotal: number;
  downPayment?: number;
  monthlyEmiAmount?: number;
  emiTenureMonths?: number;
  totalEmiPaid?: number;
  totalEmiDue?: number;
  paymentStatus: string;
  saleStatus: string;
  emiPayments?: EmiPayment[];
  soldBy?: { name: string };
  createdAt: string;
}
interface RentalDue {
  id: string;
  loanType?: string;
  issueReference: string;
  assignedPerson: string;
  customerEmail?: string;
  assignedPersonContact?: string;
  productName: string;
  totalRentDue: number;
  daysOverdue: number;
  status: string;
  billingMonth?: string;
  remindersSentCount: number;
}

function KpiCard({ icon, label, value, sub, color = 'slate' }: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
  color?: 'green' | 'amber' | 'red' | 'indigo' | 'slate';
}) {
  const bg: Record<string, string> = { green: 'bg-emerald-500/10 text-emerald-600', amber: 'bg-amber-500/10 text-amber-600', red: 'bg-rose-500/10 text-rose-600', indigo: 'bg-indigo-500/10 text-indigo-600', slate: 'bg-slate-100 dark:bg-slate-800 text-slate-500' };
  const val: Record<string, string> = { green: 'text-emerald-600 dark:text-emerald-400', amber: 'text-amber-600 dark:text-amber-400', red: 'text-rose-600 dark:text-rose-400', indigo: 'text-indigo-600 dark:text-indigo-400', slate: 'text-slate-900 dark:text-white' };
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl mb-3 ${bg[color]}`}>{icon}</div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-extrabold leading-none ${val[color]}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1.5">{sub}</p>}
    </div>
  );
}

export default function EmiReportPage() {
  const [emiSales, setEmiSales] = useState<EmiSale[]>([]);
  const [dues, setDues] = useState<RentalDue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'OVERDUE' | 'PAID'>('ALL');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sentFeedback, setSentFeedback] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [salesRes, duesRes] = await Promise.all([
        api.get<any>('/sales'),
        api.get<any>('/usage/dues-summary').catch(() => null),
      ]);
      const allSales: EmiSale[] = salesRes?.sales ?? [];
      setEmiSales(allSales.filter(s => s.saleStatus !== 'CANCELLED' && (s as any).isEmi));
      const duesData = duesRes?.data ?? duesRes;
      setDues((duesData?.items ?? []).filter((i: RentalDue) => i.loanType === 'EMI'));
    } catch (err) {
      console.error('EMI report fetch failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const sendReminder = async (item: RentalDue) => {
    if (!item.customerEmail) { alert(`No email on file for ${item.assignedPerson}.`); return; }
    setSendingId(item.id);
    try {
      const res = await api.post<{ sentTo: string }>(`/usage/${item.id}/send-reminder`, { recipientEmail: item.customerEmail });
      setSentFeedback(prev => ({ ...prev, [item.id]: `Sent to ${res.sentTo}` }));
      setTimeout(() => setSentFeedback(prev => { const n = { ...prev }; delete n[item.id]; return n; }), 4000);
    } catch (err: any) { alert(err.message || 'Failed to send reminder.'); }
    finally { setSendingId(null); }
  };

  // Derived KPIs
  const kpis = useMemo(() => {
    const active = emiSales.filter(s => (s.totalEmiDue ?? 0) > 0);
    const paid = emiSales.filter(s => (s.totalEmiDue ?? 0) <= 0);
    const overdue = dues.filter(d => d.status === 'OVERDUE');
    const totalOwed = emiSales.reduce((a, s) => a + (s.totalEmiDue ?? 0), 0);
    const totalCollected = emiSales.reduce((a, s) => a + (s.totalEmiPaid ?? 0), 0);
    const totalSaleValue = emiSales.reduce((a, s) => a + s.grandTotal, 0);
    const overdueAmount = overdue.reduce((a, d) => a + d.totalRentDue, 0);
    const collectionRate = totalSaleValue > 0 ? Math.round((totalCollected / totalSaleValue) * 100) : 0;
    return { active: active.length, paid: paid.length, total: emiSales.length, totalOwed, totalCollected, totalSaleValue, overdueAmount, overdueCount: overdue.length, collectionRate };
  }, [emiSales, dues]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return emiSales.filter(s => {
      const matchSearch = !q || s.customerName.toLowerCase().includes(q) || s.invoiceNumber.toLowerCase().includes(q) || s.customerPhone?.includes(q);
      const isActive = (s.totalEmiDue ?? 0) > 0;
      const isPaid = (s.totalEmiDue ?? 0) <= 0;
      const isOverdue = dues.some(d => d.id === s._id && d.status === 'OVERDUE');
      const matchStatus =
        statusFilter === 'ALL' ? true :
        statusFilter === 'ACTIVE' ? isActive :
        statusFilter === 'PAID' ? isPaid :
        isOverdue;
      return matchSearch && matchStatus;
    });
  }, [emiSales, dues, search, statusFilter]);

  const overdueItems = useMemo(() => dues.filter(d => d.status === 'OVERDUE').sort((a, b) => b.daysOverdue - a.daysOverdue), [dues]);

  return (
    <div className="space-y-7 pb-10">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">EMI & Instalments Report</h1>
            <p className="text-sm text-slate-500 mt-0.5">Customers paying in instalments — who's on track, who owes us money</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-amber-500' : ''}`} />
        </Button>
      </div>

      {isLoading && !emiSales.length ? (
        <div className="flex h-64 items-center justify-center gap-3 text-slate-400">
          <RefreshCw className="h-5 w-5 animate-spin text-amber-500" />
          <span className="text-sm">Loading EMI data…</span>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={<IndianRupee className="h-5 w-5" />} label="Still Owed to Us" value={formatCurrency(kpis.totalOwed)} sub={`Across ${kpis.active} active plans`} color="amber" />
            <KpiCard icon={<CheckCircle2 className="h-5 w-5" />} label="Collected So Far" value={formatCurrency(kpis.totalCollected)} sub={`${kpis.collectionRate}% of total EMI sale value`} color="green" />
            <KpiCard icon={<AlertTriangle className="h-5 w-5" />} label="Overdue Payments" value={formatCurrency(kpis.overdueAmount)} sub={`${kpis.overdueCount} customer${kpis.overdueCount !== 1 ? 's' : ''} behind on payments`} color={kpis.overdueCount > 0 ? 'red' : 'green'} />
            <KpiCard icon={<Users className="h-5 w-5" />} label="Completed Plans" value={String(kpis.paid)} sub={`${kpis.total} total EMI plans ever created`} color="slate" />
          </div>

          {/* Collection progress bar */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Overall Collection Progress</h2>
              <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{kpis.collectionRate}% collected</span>
            </div>
            <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className="h-3 rounded-full bg-emerald-400 transition-all duration-500" style={{ width: `${kpis.collectionRate}%` }} />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-2">
              <span>Collected: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(kpis.totalCollected)}</strong></span>
              <span>Total EMI Sale Value: <strong className="text-slate-700 dark:text-slate-300">{formatCurrency(kpis.totalSaleValue)}</strong></span>
              <span>Still Owed: <strong className="text-amber-600 dark:text-amber-400">{formatCurrency(kpis.totalOwed)}</strong></span>
            </div>
          </div>

          {/* Overdue list */}
          {overdueItems.length > 0 && (
            <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/10 p-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-sm font-bold text-rose-800 dark:text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  Customers Behind on EMI — Send a Reminder
                </h2>
                <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                  Total overdue: {formatCurrency(kpis.overdueAmount)}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {overdueItems.map(item => {
                  const sending = sendingId === item.id;
                  const feedback = sentFeedback[item.id];
                  return (
                    <div key={item.id} className="rounded-xl border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 p-3.5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-900 dark:text-white">{item.assignedPerson}</div>
                          <div className="text-[11px] text-slate-500 truncate">{item.productName}</div>
                          <div className="text-[10px] text-rose-500 font-bold mt-0.5">{item.daysOverdue}d overdue · {item.billingMonth}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-extrabold text-sm text-rose-600 dark:text-rose-400">{formatCurrency(item.totalRentDue)}</div>
                          {item.remindersSentCount > 0 && <div className="text-[10px] text-slate-400">Reminded {item.remindersSentCount}× already</div>}
                        </div>
                      </div>
                      {item.customerEmail ? (
                        <Button size="sm" variant="default" disabled={sending} onClick={() => sendReminder(item)}
                          className="w-full h-7 text-[11px] font-bold gap-1.5 bg-rose-600 hover:bg-rose-700 text-white">
                          <Send className={`h-3 w-3 ${sending ? 'animate-spin' : ''}`} />
                          {sending ? 'Sending…' : `Send Reminder to ${item.customerEmail.split('@')[0]}…`}
                        </Button>
                      ) : (
                        <div className="text-[10px] text-rose-400 font-semibold">No email — contact by phone</div>
                      )}
                      {feedback && <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />{feedback}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* All EMI Plans table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">All EMI Plans</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-50 dark:bg-slate-800/60 gap-0.5">
                  {(['ALL', 'ACTIVE', 'OVERDUE', 'PAID'] as const).map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${statusFilter === s ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}>
                      {s === 'ALL' ? `All (${kpis.total})` : s === 'ACTIVE' ? `Active (${kpis.active})` : s === 'OVERDUE' ? `Overdue (${kpis.overdueCount})` : `Paid Off (${kpis.paid})`}
                    </button>
                  ))}
                </div>
                <div className="relative w-52">
                  <input type="text" placeholder="Search customer, invoice…" value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Invoice</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3 text-right">Sale Value</th>
                    <th className="py-2.5 px-3 text-right">Down Payment</th>
                    <th className="py-2.5 px-3 text-right">Monthly EMI</th>
                    <th className="py-2.5 px-3 text-right">Collected</th>
                    <th className="py-2.5 px-3 text-right">Still Owed</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-center">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {filtered.map(s => {
                    const totalOwed = s.totalEmiDue ?? 0;
                    const isFullyPaid = totalOwed <= 0;
                    const dueItem = dues.find(d => d.id === s._id);
                    const isOverdue = dueItem?.status === 'OVERDUE';
                    const expanded = expandedId === s._id;
                    const paidPct = s.grandTotal > 0 ? Math.round(((s.totalEmiPaid ?? 0) / s.grandTotal) * 100) : 0;

                    return (
                      <React.Fragment key={s._id}>
                        <tr className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 ${isOverdue ? 'bg-rose-500/5' : isFullyPaid ? 'bg-emerald-500/5' : ''}`}>
                          <td className="py-2.5 px-3 font-mono font-bold text-amber-500">{s.invoiceNumber}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900 dark:text-white">{s.customerName}</div>
                            {s.customerPhone && <div className="text-[10px] text-slate-400">{s.customerPhone}</div>}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold">{formatCurrency(s.grandTotal)}</td>
                          <td className="py-2.5 px-3 text-right text-slate-500">{formatCurrency(s.downPayment ?? 0)}</td>
                          <td className="py-2.5 px-3 text-right text-amber-500 font-bold">{formatCurrency(s.monthlyEmiAmount ?? 0)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(s.totalEmiPaid ?? 0)}</td>
                          <td className="py-2.5 px-3 text-right">
                            {isFullyPaid
                              ? <span className="font-bold text-emerald-600">Fully paid ✓</span>
                              : <span className={`font-bold ${isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>{formatCurrency(totalOwed)}</span>}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isFullyPaid
                              ? <Badge variant="success" className="text-[10px]">Paid Off</Badge>
                              : isOverdue
                              ? <Badge variant="danger" className="text-[10px]">Overdue</Badge>
                              : <Badge variant="secondary" className="text-[10px]">Active</Badge>}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{formatDate(s.createdAt)}</td>
                          <td className="py-2.5 px-3 text-center">
                            <button onClick={() => setExpandedId(expanded ? null : s._id)}
                              className="text-xs text-amber-500 font-bold hover:underline">
                              {expanded ? 'Hide' : 'Schedule'}
                            </button>
                          </td>
                        </tr>
                        {/* Expanded payment schedule */}
                        {expanded && s.emiPayments && (
                          <tr>
                            <td colSpan={10} className="px-3 pb-3 bg-slate-50/80 dark:bg-slate-800/40">
                              <div className="pt-2 pb-1">
                                {/* Progress bar */}
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                    <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${paidPct}%` }} />
                                  </div>
                                  <span className="text-xs font-bold text-emerald-600 shrink-0">{paidPct}% paid</span>
                                </div>
                                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                                  {s.emiPayments.map(p => (
                                    <div key={p.monthIndex} className={`rounded-lg border p-2 text-center text-[11px] ${p.status === 'PAID' ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20' : p.status === 'OVERDUE' ? 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'}`}>
                                      <div className="font-bold text-slate-700 dark:text-slate-300 truncate text-[10px]">{p.billingMonth.replace('Month ', 'M')}</div>
                                      <div className={`font-extrabold mt-1 ${p.status === 'PAID' ? 'text-emerald-600' : p.status === 'OVERDUE' ? 'text-rose-600' : 'text-amber-500'}`}>
                                        {formatCurrency(p.amountDue)}
                                      </div>
                                      <div className={`text-[10px] font-bold mt-0.5 ${p.status === 'PAID' ? 'text-emerald-500' : p.status === 'OVERDUE' ? 'text-rose-500' : 'text-slate-400'}`}>
                                        {p.status}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div className="flex justify-end mt-2">
                                  <Link href="/sales" className="text-xs font-bold text-amber-500 hover:underline flex items-center gap-1">
                                    Open full EMI ledger <ChevronRight className="h-3 w-3" />
                                  </Link>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={10} className="py-10 text-center text-slate-400">No EMI plans match this filter</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
