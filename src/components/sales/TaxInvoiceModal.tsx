'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sale } from '@/lib/types';
import { formatIndianDecimal } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api, getApiUrl } from '@/lib/api';
import {
  Download,
  Mail,
  Printer,
  X,
  CheckCircle2,
  AlertCircle,
  Send,
  FileText,
} from 'lucide-react';

/**
 * Downloads the high-speed server-generated vector PDF invoice matching reference_invoice.jpg
 */
export async function downloadInvoicePdf(saleId: string, invoiceNumber: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('stereobliss_token') : null;
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(getApiUrl(`/sales/${saleId}/pdf`), {
    method: 'GET',
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to download PDF (HTTP ${response.status})`);
  }

  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `Invoice-${invoiceNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1500);
}

interface TaxInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
}

export function TaxInvoiceModal({ isOpen, onClose, sale }: TaxInvoiceModalProps) {
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const invoicePrintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sale) {
      setRecipientEmail(sale.customerEmail || '');
      setEmailStatus(null);
      setShowEmailForm(false);
    }
  }, [sale]);

  if (!isOpen || !sale) return null;

  const invoiceDate = new Date(sale.createdAt || Date.now());
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateFormatted = `${pad(invoiceDate.getDate())}/${pad(invoiceDate.getMonth() + 1)}/${invoiceDate.getFullYear()}`;

  const grossSubtotal = sale.subtotal || (sale.lineItems || []).reduce((acc, li) => acc + (li.unitPrice || 0) * (li.quantity || 1), 0);
  const discountTotal = sale.discountTotal ?? (sale.lineItems || []).reduce((acc, li) => acc + (li.discount || 0) * (li.quantity || 1), 0);
  const taxableAmount = sale.taxableAmount ?? Math.max(0, grossSubtotal - discountTotal);
  const cgstAmount = sale.cgstAmount ?? Math.round(taxableAmount * 0.09 * 100) / 100;
  const sgstAmount = sale.sgstAmount ?? Math.round(taxableAmount * 0.09 * 100) / 100;

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      await downloadInvoicePdf(sale._id, sale.invoiceNumber);
    } catch (err) {
      console.error('PDF download error:', err);
      // Fallback print
      window.print();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail || !recipientEmail.includes('@')) {
      setEmailStatus({ type: 'error', message: 'Please provide a valid recipient email address.' });
      return;
    }

    setIsSendingEmail(true);
    setEmailStatus(null);

    try {
      await api.post<{ success: boolean; message: string }>(`/sales/${sale._id}/send-email`, {
        recipientEmail: recipientEmail.trim(),
        customNotes: customNotes.trim() || undefined,
      });

      setEmailStatus({
        type: 'success',
        message: `✅ Tax Invoice PDF dispatched successfully to ${recipientEmail}`,
      });
      setShowEmailForm(false);
    } catch (err: any) {
      setEmailStatus({
        type: 'error',
        message: `❌ Failed to send email: ${err.message || 'Please verify SMTP / .env settings'}`,
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto">
        {/* Top Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 no-print">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[#0077c5] flex items-center justify-center">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Tax Invoice — #{sale.invoiceNumber}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Official Stereobliss Tax Invoice format for customer records, print, and PDF dispatch
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={handleDownloadPdf}
              isLoading={isDownloadingPdf}
              className="gap-1.5 text-xs font-bold shadow-sm bg-[#1a6eb7] hover:bg-[#155a96]"
              title="Save vector PDF directly to your device"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Save / Download PDF</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowEmailForm(!showEmailForm)}
              className="gap-1.5 text-xs font-semibold"
            >
              <Mail className="h-3.5 w-3.5 text-amber-500" />
              <span>Send PDF Email</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
              className="gap-1.5 text-xs font-semibold"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Print</span>
            </Button>

            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Email Send Form (collapsible / toggleable) */}
        {showEmailForm && (
          <form onSubmit={handleSendEmail} className="p-4 bg-amber-500/5 border-b border-amber-500/20 space-y-3 no-print">
            <div className="flex flex-col sm:flex-row items-end gap-3">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Recipient Email Address (Customer) *
                </label>
                <Input
                  type="email"
                  required
                  placeholder="e.g. customer@gmail.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex-1 space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Optional Note / Reference
                </label>
                <Input
                  placeholder="e.g. Please find your invoice attached for your purchase."
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <Button
                type="submit"
                variant="default"
                size="sm"
                isLoading={isSendingEmail}
                className="font-bold gap-1.5 text-xs h-9 shrink-0 bg-[#1a6eb7] hover:bg-[#155a96]"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Dispatch Email PDF</span>
              </Button>
            </div>
          </form>
        )}

        {/* Status Alert Notification */}
        {emailStatus && (
          <div
            className={`px-4 py-2 text-xs font-semibold flex items-center gap-2 no-print ${
              emailStatus.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-b border-emerald-500/20'
                : 'bg-red-500/10 text-red-600 dark:text-red-400 border-b border-red-500/20'
            }`}
          >
            {emailStatus.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{emailStatus.message}</span>
          </div>
        )}

        {/* Scrollable Document Area with Authentic Invoice Styling Matching reference_invoice.jpg */}
        <div className="max-h-[78vh] overflow-y-auto p-4 sm:p-6 bg-slate-200/50 dark:bg-slate-950/80 print-container">
          <div
            ref={invoicePrintRef}
            id="printable-tax-invoice"
            className="relative w-full mx-auto bg-white text-slate-900 shadow-md border border-slate-300 font-sans text-xs"
            style={{
              maxWidth: '780px',
              minHeight: '1080px',
              backgroundColor: '#ffffff',
              color: '#0f172a',
            }}
          >
            {/* Background Template: Stereobliss logo top-left & music notes icon bottom-right */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/templates/invoice_template.png"
              alt="Stereobliss Invoice Template"
              className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
              style={{ minHeight: '100%' }}
            />

            {/* Invoice Content Layer */}
            <div className="relative z-10 px-8 py-7 sm:px-10 sm:py-8 flex flex-col justify-between" style={{ minHeight: '1080px' }}>
              <div>
                {/* 1. Header: Stereobliss Logo on left (from template), Company Info on right */}
                <div className="flex justify-between items-start pt-2">
                  <div className="w-1/2">
                    {/* Left space reserved for the Stereobliss logo on the background template */}
                  </div>
                  <div className="text-left space-y-0.5 text-[11px] text-slate-700 w-1/2 pl-6">
                    <div className="font-extrabold text-[13px] tracking-wide text-black uppercase">STEREOBLISS</div>
                    <div>2nd Floor, Radhika Avenue, Wakad- Nasik Road</div>
                    <div>Next to Copa Vila</div>
                    <div>9960540161</div>
                    <div>harsh.bagle@muziclub.com</div>
                    <div>www.muziclub.com</div>
                    <div className="font-semibold text-black">GSTIN : 27ADDFS8850Q1Z6</div>
                  </div>
                </div>

                {/* Horizontal Divider Line below Header */}
                <hr className="border-t border-slate-300 mt-5 mb-5" />

                {/* 2. BILL TO & INVOICE Details Section */}
                <div className="flex justify-between items-start my-2">
                  {/* Left: BILL TO */}
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">BILL TO</span>
                    <div className="text-base font-bold text-slate-900">{sale.customerName}</div>
                    {sale.customerPhone && <div className="text-xs text-slate-700">{sale.customerPhone}</div>}
                    {sale.customerEmail && <div className="text-xs text-slate-700">{sale.customerEmail}</div>}
                  </div>

                  {/* Right: INVOICE details */}
                  <div className="flex items-stretch gap-3 pl-6 w-1/2">
                    <div className="w-[3px] bg-[#0077c5] rounded-full self-stretch shrink-0" />
                    <div className="space-y-1">
                      <h2 className="text-2xl font-black text-[#0077c5] tracking-tight leading-none uppercase">INVOICE</h2>
                      <div className="grid grid-cols-[90px_1fr] text-xs pt-1.5 gap-y-1">
                        <span className="font-bold text-slate-900">Invoice No.</span>
                        <span className="text-slate-800 font-medium">{sale.invoiceNumber}</span>
                        <span className="font-bold text-slate-900">Invoice Date</span>
                        <span className="text-slate-800">{dateFormatted}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Line Items Table matching reference_invoice.jpg */}
                <div className="mt-7 border border-slate-200 rounded-none overflow-hidden bg-white">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#1a6eb7] text-white font-bold text-[11px]">
                        <th className="py-2 px-2.5 text-center w-10 border-r border-blue-400/40">#</th>
                        <th className="py-2 px-3 border-r border-blue-400/40">Description</th>
                        <th className="py-2 px-2.5 text-center w-28 border-r border-blue-400/40">HSN/SAC</th>
                        <th className="py-2 px-2 text-center w-14 border-r border-blue-400/40">Qty</th>
                        <th className="py-2 px-3 text-right w-24 border-r border-blue-400/40">Price (₹)</th>
                        <th className="py-2 px-3 text-right w-24">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {sale.lineItems?.map((li, index) => {
                        const hsn = li.hsnCode || (li.product as any)?.hsnCode || '92029000';
                        const itemDiscount = (li.discount || 0) * (li.quantity || 1);
                        const itemAmount = li.total ?? Math.max(0, (li.quantity * li.unitPrice) - itemDiscount);
                        return (
                          <tr key={index} className="align-top">
                            <td className="py-2.5 px-2.5 text-center text-slate-900 border-r border-slate-200">{index + 1}</td>
                            <td className="py-2.5 px-3 border-r border-slate-200">
                              <div className="font-bold text-slate-950">
                                {(li.product as any)?.name || (li as any).productName || 'Musical Product'}
                                {(li.product as any)?.color && <span className="font-normal text-slate-600"> ({(li.product as any).color})</span>}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5 space-y-0.5">
                                <div>
                                  HSN/SAC- {hsn}
                                  {li.serializedItemIds && li.serializedItemIds.length > 0 && (
                                    <span> | SN: {li.serializedItemIds.map((s: any) => s.assetId || s.manufacturerSerial || s).join(', ')}</span>
                                  )}
                                </div>
                                {itemDiscount > 0 && (
                                  <div className="inline-flex items-center gap-1 font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 text-[9.5px]">
                                    <span>Discount Offered: −₹{formatIndianDecimal(itemDiscount)}</span>
                                    <span className="text-emerald-500">({formatIndianDecimal(li.discount || 0)}/unit)</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-2.5 text-center text-slate-700 border-r border-slate-200">{hsn}</td>
                            <td className="py-2.5 px-2 text-center text-slate-900 border-r border-slate-200">{li.quantity}</td>
                            <td className="py-2.5 px-3 text-right text-slate-900 border-r border-slate-200">{formatIndianDecimal(li.unitPrice)}</td>
                            <td className="py-2.5 px-3 text-right text-slate-900">{formatIndianDecimal(itemAmount)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 4. Payment Method & Totals Section */}
                <div className="flex justify-between items-start mt-6 gap-6">
                  {/* Left: Payment Method or EMI Financing Facility */}
                  {sale.isEmi ? (
                    <div className="flex-1 rounded-lg border border-slate-300 bg-slate-50/70 p-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                        <span className="font-extrabold text-[11px] text-[#0284c7] uppercase tracking-wider">
                          Customer EMI Financing &amp; Deposit
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                          {sale.emiTenureMonths || 6} Months Plan
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-y-1.5 text-[11px]">
                        <span className="text-slate-600 font-medium">Initial Deposit / Down Payment:</span>
                        <span className="font-bold text-emerald-700 text-right">
                          ₹{formatIndianDecimal(sale.downPayment || 0)}
                        </span>

                        <span className="text-slate-600 font-medium">Financed Principal:</span>
                        <span className="font-bold text-slate-900 text-right">
                          ₹{formatIndianDecimal(Math.max(0, sale.grandTotal - (sale.downPayment || 0)))}
                        </span>

                        <span className="text-slate-600 font-medium">Monthly Installment:</span>
                        <span className="font-bold text-amber-700 text-right">
                          ₹{formatIndianDecimal(sale.monthlyEmiAmount || 0)} / mo
                        </span>

                        <span className="text-slate-600 font-medium">Total Collected to Date:</span>
                        <span className="font-bold text-emerald-700 text-right">
                          ₹{formatIndianDecimal(sale.totalEmiPaid ?? (sale.downPayment || 0))}
                        </span>

                        <span className="text-slate-600 font-medium">Remaining EMI Balance:</span>
                        <span
                          className={`font-bold text-right ${
                            (sale.totalEmiDue || 0) > 0 ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          ₹{formatIndianDecimal(sale.totalEmiDue ?? Math.max(0, sale.grandTotal - (sale.downPayment || 0)))}
                        </span>

                        <span className="text-slate-600 font-medium">Financing Status:</span>
                        <span className="font-bold text-slate-900 text-right">
                          {(sale.totalEmiDue || 0) <= 0 ? 'COMPLETED / FULLY PAID' : 'ACTIVE EMI PLAN'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <span className="font-bold text-xs text-slate-900 block">Payment Method</span>
                      <span className="text-xs text-slate-700 block">{sale.paymentMethod || 'Gpay'}</span>
                    </div>
                  )}

                  {/* Right: Totals summary */}
                  <div className="w-72 space-y-1.5 text-xs shrink-0">
                    <div className="flex justify-between text-slate-700">
                      <span>Subtotal</span>
                      <span className="font-normal text-slate-900">₹{formatIndianDecimal(discountTotal > 0 ? grossSubtotal : taxableAmount)}</span>
                    </div>

                    {discountTotal > 0 && (
                      <div className="flex justify-between text-emerald-600 font-bold bg-emerald-50/60 px-1 py-0.5 rounded">
                        <span>Less: Discount Offered</span>
                        <span>−₹{formatIndianDecimal(discountTotal)}</span>
                      </div>
                    )}

                    {discountTotal > 0 && (
                      <div className="flex justify-between text-slate-700 pt-0.5 border-t border-slate-200">
                        <span className="font-medium">Taxable Amount</span>
                        <span className="font-semibold text-slate-900">₹{formatIndianDecimal(taxableAmount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-slate-700">
                      <span>CGST (9%)</span>
                      <span className="font-normal text-slate-900">₹{formatIndianDecimal(cgstAmount)}</span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>SGST (9%)</span>
                      <span className="font-normal text-slate-900">₹{formatIndianDecimal(sgstAmount)}</span>
                    </div>

                    {/* Highlighted TOTAL (INR) Bar with light blue background */}
                    <div className="flex justify-between items-center bg-[#e1f0fa] px-3 py-2 rounded-none font-bold text-xs text-slate-950 mt-2">
                      <span className="tracking-wide">TOTAL INVOICE (INR)</span>
                      <span className="text-sm font-extrabold">₹{formatIndianDecimal(sale.grandTotal)}</span>
                    </div>

                    {sale.isEmi && (
                      <>
                        <div className="flex justify-between items-center text-xs text-emerald-700 font-bold pt-1">
                          <span>Less: Initial Deposit Paid</span>
                          <span>(-) ₹{formatIndianDecimal(sale.downPayment || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center bg-[#fef3c7] px-3 py-1.5 rounded-none font-bold text-xs text-[#92400e] mt-1">
                          <span className="tracking-wide">NET EMI BALANCE DUE</span>
                          <span className="text-sm font-extrabold">
                            ₹{formatIndianDecimal(sale.totalEmiDue ?? Math.max(0, sale.grandTotal - (sale.downPayment || 0)))}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* 5. Month-by-Month Installment Repayment Schedule */}
                {sale.isEmi && sale.emiPayments && sale.emiPayments.length > 0 && (
                  <div className="mt-5 border border-slate-200 rounded-none overflow-hidden bg-white">
                    <div className="bg-slate-800 text-white font-bold text-[10px] uppercase px-3 py-1.5 tracking-wider">
                      Month-by-Month EMI Installment Schedule &amp; Ledger
                    </div>
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                          <th className="py-1.5 px-3">Installment</th>
                          <th className="py-1.5 px-3">Due Date</th>
                          <th className="py-1.5 px-3 text-right">Amount Due</th>
                          <th className="py-1.5 px-3 text-right">Amount Paid</th>
                          <th className="py-1.5 px-3 text-center">Status</th>
                          <th className="py-1.5 px-3 text-center">Txn Ref</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sale.emiPayments.map((p, idx) => (
                          <tr key={idx} className={p.status === 'PAID' ? 'bg-emerald-50/40' : ''}>
                            <td className="py-1.5 px-3 font-semibold text-slate-900">
                              {p.billingMonth || `Month ${p.monthIndex}`}
                            </td>
                            <td className="py-1.5 px-3 text-slate-600">
                              {p.dueDate ? new Date(p.dueDate).toLocaleDateString('en-IN') : '—'}
                            </td>
                            <td className="py-1.5 px-3 text-right text-slate-800 font-mono">
                              ₹{formatIndianDecimal(p.amountDue)}
                            </td>
                            <td className="py-1.5 px-3 text-right font-bold text-emerald-700 font-mono">
                              ₹{formatIndianDecimal(p.amountPaid || 0)}
                            </td>
                            <td className="py-1.5 px-3 text-center">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  p.status === 'PAID'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {p.status}
                              </span>
                            </td>
                            <td className="py-1.5 px-3 text-center font-mono text-[10px] text-slate-600">
                              {p.transactionRef || (p.status === 'PAID' ? 'Counter' : '—')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Divider Line below Totals */}
                <hr className="border-t border-slate-300 mt-8 mb-4" />

                {/* 5. Terms & Conditions Section */}
                <div className="space-y-1.5 text-xs text-slate-700">
                  <span className="font-bold text-slate-900 block">Terms &amp; Conditions</span>
                  <div className="space-y-1 text-[11px] text-slate-700">
                    <div>3. &nbsp; Goods remain property of the seller until full payment is received.</div>
                    <div>4. &nbsp; Prices are inclusive of all applicable taxes.</div>
                  </div>
                </div>
              </div>

              {/* 6. Footer Computer Generated Receipt Disclaimer */}
              <div className="pt-10 pb-2">
                <hr className="border-t border-slate-300 mb-2.5" />
                <p className="text-center text-[10px] tracking-wider text-slate-500 uppercase font-medium">
                  THIS IS A SYSTEM GENERATED RECEIPT. SIGNATURE IS NOT REQUIRED.
                </p>
                <hr className="border-t border-slate-300 mt-2.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="flex items-center justify-between p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 no-print">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Invoice #{sale.invoiceNumber} • Status: <strong className="text-emerald-500">{sale.paymentStatus}</strong>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Global Print Media Query Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .no-print {
            display: none !important;
          }
          .print-container,
          #printable-tax-invoice,
          #printable-tax-invoice * {
            visibility: visible;
          }
          #printable-tax-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}

export default TaxInvoiceModal;
