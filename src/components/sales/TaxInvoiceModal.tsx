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

  const taxableAmount = sale.taxableAmount || (sale.subtotal - (sale.discountTotal || 0));
  const cgstAmount = sale.cgstAmount || Math.round(taxableAmount * 0.09 * 100) / 100;
  const sgstAmount = sale.sgstAmount || Math.round(taxableAmount * 0.09 * 100) / 100;

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
                        const itemAmount = li.total || li.quantity * li.unitPrice;
                        return (
                          <tr key={index} className="align-top">
                            <td className="py-2.5 px-2.5 text-center text-slate-900 border-r border-slate-200">{index + 1}</td>
                            <td className="py-2.5 px-3 border-r border-slate-200">
                              <div className="font-bold text-slate-950">
                                {li.product?.name}
                                {li.product?.color && <span className="font-normal text-slate-600"> ({li.product.color})</span>}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                HSN/SAC- {hsn}
                                {li.serializedItemIds && li.serializedItemIds.length > 0 && (
                                  <span> | SN: {li.serializedItemIds.map((s: any) => s.assetId || s.manufacturerSerial || s).join(', ')}</span>
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
                <div className="flex justify-between items-start mt-6">
                  {/* Left: Payment Method */}
                  <div className="space-y-1">
                    <span className="font-bold text-xs text-slate-900 block">Payment Method</span>
                    <span className="text-xs text-slate-700 block">{sale.paymentMethod || 'Gpay'}</span>
                  </div>

                  {/* Right: Totals summary */}
                  <div className="w-64 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-700">
                      <span>Subtotal</span>
                      <span className="font-normal text-slate-900">₹{formatIndianDecimal(taxableAmount)}</span>
                    </div>
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
                      <span className="tracking-wide">TOTAL (INR)</span>
                      <span className="text-sm font-extrabold">₹{formatIndianDecimal(sale.grandTotal)}</span>
                    </div>
                  </div>
                </div>

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
