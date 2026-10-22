'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sale } from '@/lib/types';
import { formatIndianDecimal, numberToIndianWords } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api, getApiUrl } from '@/lib/api';
import { useSettings } from '@/context/SettingsContext';
import {
  Download,
  Mail,
  Printer,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  FileText,
} from 'lucide-react';

/**
 * Downloads the high-speed server-generated vector PDF invoice with auth credentials
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
  link.download = `TaxInvoice-${invoiceNumber}.pdf`;
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
  const { companyName, storeName, settings } = useSettings();
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

  const invoiceDate = new Date(sale.createdAt);
  const dateFormatted = invoiceDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });

  const irn =
    sale.irn ||
    '242b455eebf283a5c76a5689cd1bf14397ef25208f93a37-164dd9b476407904d';
  const ackNo = sale.ackNo || '122634809484159';
  const ackDate = sale.ackDate
    ? new Date(sale.ackDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
    : dateFormatted;

  const supplierName = companyName && !/soundstock|muziclub/i.test(companyName)
    ? companyName.replace(/retail/i, '').trim().toUpperCase() || 'STEREOBLISS'
    : 'STEREOBLISS';

  const supplierAddress = settings?.address || '';
  const supplierPhone = settings?.contactPhone || '';
  const supplierGstin = settings?.gstin || '';
  const supplierEmail = settings?.contactEmail || '';
  const supplierState = settings?.stateName || 'Maharashtra';
  const supplierStateCode = settings?.stateCode || '27';

  const buyerName = sale.customerName || 'Customer / Dealer';
  const buyerAddress = sale.customerAddress || supplierAddress || '-';
  const buyerGstin = sale.customerGstin || (supplierGstin ? 'Unregistered / B2C' : 'N/A');

  const eWayBillNo = sale.eWayBillNo || '282295408497';
  const dispatchThrough = sale.dispatchThrough || 'XP India';
  const destination = sale.destination || 'PUNE';
  const paymentMethod = sale.paymentMethod || 'UPI';

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
      const res = await api.post<{ success: boolean; message: string }>(`/sales/${sale._id}/send-email`, {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto">
        {/* Top Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Tax Invoice (e-Invoice Format) — #{sale.invoiceNumber}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                GST compliant original invoice for customer / dealer records &amp; email PDF dispatch
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={handleDownloadPdf}
              isLoading={isDownloadingPdf}
              className="gap-1.5 text-xs font-bold shadow-sm"
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
          <form onSubmit={handleSendEmail} className="p-4 bg-amber-500/5 border-b border-amber-500/20 space-y-3">
            <div className="flex flex-col sm:flex-row items-end gap-3">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Recipient Email Address (Dealer or Customer) *
                </label>
                <Input
                  type="email"
                  required
                  placeholder="e.g. dealer@company.com or customer@gmail.com"
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
                  placeholder="e.g. Please find your invoice attached for dispatch order."
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
                className="font-bold gap-1.5 text-xs h-9 shrink-0"
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
            className={`px-4 py-2 text-xs font-semibold flex items-center gap-2 ${
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

        {/* Scrollable Document Area with Authentic Invoice Styling */}
        <div className="max-h-[75vh] overflow-y-auto p-4 sm:p-6 bg-slate-100/60 dark:bg-slate-950/60">
          <div
            ref={invoicePrintRef}
            id="printable-tax-invoice"
            className="w-full mx-auto bg-white text-black p-5 sm:p-7 shadow-sm border border-black/80 font-sans text-xs space-y-0 leading-tight"
            style={{ maxWidth: '780px', color: '#000000', backgroundColor: '#ffffff' }}
          >
            {/* 1. Header Section */}
            <div className="pb-3 text-center border-b border-black">
              <h1 className="text-base font-black tracking-wider uppercase">TAX INVOICE</h1>
              <p className="text-[11px] font-normal text-slate-800">(ORIGINAL FOR RECIPIENT)</p>

              {/* IRN, Ack Details */}
              <div className="text-left text-[10px] space-y-0.5 pt-2">
                <div className="flex items-start gap-1">
                  <span className="font-semibold text-slate-700 shrink-0">IRN : </span>
                  <span className="font-mono font-bold text-[9px] break-all">{irn}</span>
                </div>
                <div className="flex items-center gap-6">
                  <div>
                    <span className="font-semibold text-slate-700">Ack No. : </span>
                    <span className="font-mono font-bold">{ackNo}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Ack Date : </span>
                    <span className="font-mono font-bold">{ackDate}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Two Column Section: Seller/Buyer vs Dispatch Details */}
            <div className="grid grid-cols-2 border-b border-black text-[11px]">
              {/* Left Column: Supplier, Consignee, Buyer */}
              <div className="border-r border-black divide-y divide-black">
                {/* Supplier */}
                <div className="p-2 space-y-0.5">
                  <div className="font-bold text-xs uppercase">{supplierName}</div>
                  <div className="text-[10px] text-slate-800">{supplierAddress}</div>
                  {supplierPhone && <div className="text-[10px]">Tel : {supplierPhone}</div>}
                  {supplierEmail && <div className="text-[10px]">E-mail : {supplierEmail}</div>}
                  <div className="text-[10px]">
                    <span className="font-semibold">GSTIN/UIN : </span>
                    <span className="font-bold">{supplierGstin || 'N/A'}</span>
                  </div>
                  <div className="text-[10px]">State Name : {supplierState}, Code : {supplierStateCode}</div>
                </div>

                {/* Consignee (Ship to) */}
                <div className="p-2 space-y-0.5">
                  <div className="font-bold text-[10px] uppercase text-slate-700">Consignee (Ship to)</div>
                  <div className="font-bold text-xs">{buyerName}</div>
                  <div className="text-[10px] text-slate-800">{buyerAddress}</div>
                  {sale.customerPhone && <div className="text-[10px]">Ph No : {sale.customerPhone}</div>}
                  <div className="text-[10px]">
                    <span className="font-semibold">GSTIN/UIN : </span>
                    <span className="font-bold">{buyerGstin}</span>
                  </div>
                  <div className="text-[10px]">State Name : Maharashtra, Code : 27</div>
                </div>

                {/* Buyer (Bill to) */}
                <div className="p-2 space-y-0.5">
                  <div className="font-bold text-[10px] uppercase text-slate-700">Buyer (Bill to)</div>
                  <div className="font-bold text-xs">{buyerName}</div>
                  <div className="text-[10px] text-slate-800">{buyerAddress}</div>
                  {sale.customerPhone && <div className="text-[10px]">Ph No : {sale.customerPhone}</div>}
                  <div className="text-[10px]">
                    <span className="font-semibold">GSTIN/UIN : </span>
                    <span className="font-bold">{buyerGstin}</span>
                  </div>
                  <div className="text-[10px]">State Name : Maharashtra, Code : 27</div>
                </div>
              </div>

              {/* Right Column: Invoice Details */}
              <div className="divide-y divide-black text-[10px]">
                <div className="grid grid-cols-2 divide-x divide-black p-0">
                  <div className="p-1.5">
                    <span className="block text-slate-600 text-[9px]">Invoice No.</span>
                    <strong className="font-mono text-xs">{sale.invoiceNumber}</strong>
                  </div>
                  <div className="p-1.5">
                    <span className="block text-slate-600 text-[9px]">e-Way Bill No.</span>
                    <strong className="font-mono text-[11px]">{eWayBillNo}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 divide-x divide-black p-0">
                  <div className="p-1.5">
                    <span className="block text-slate-600 text-[9px]">Delivery Note</span>
                    <span className="font-semibold">—</span>
                  </div>
                  <div className="p-1.5">
                    <span className="block text-slate-600 text-[9px]">Dated</span>
                    <strong className="font-bold text-[11px]">{dateFormatted}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 divide-x divide-black p-0">
                  <div className="p-1.5">
                    <span className="block text-slate-600 text-[9px]">Reference No. &amp; Date.</span>
                    <span className="font-semibold">—</span>
                  </div>
                  <div className="p-1.5">
                    <span className="block text-slate-600 text-[9px]">Mode/Terms of Payment</span>
                    <strong className="font-bold">{paymentMethod}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 divide-x divide-black p-0">
                  <div className="p-1.5">
                    <span className="block text-slate-600 text-[9px]">Other References</span>
                    <span className="font-semibold">—</span>
                  </div>
                  <div className="p-1.5">
                    <span className="block text-slate-600 text-[9px]">Dated</span>
                    <span className="font-semibold">—</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 divide-x divide-black p-0">
                  <div className="p-1.5">
                    <span className="block text-slate-600 text-[9px]">Buyer's Order No.</span>
                    <span className="font-semibold">—</span>
                  </div>
                  <div className="p-1.5">
                    <span className="block text-slate-600 text-[9px]">Dated</span>
                    <span className="font-semibold">—</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 divide-x divide-black p-0">
                  <div className="p-1.5">
                    <span className="block text-slate-600 text-[9px]">Dispatch Doc No.</span>
                    <span className="font-semibold">—</span>
                  </div>
                  <div className="p-1.5">
                    <span className="block text-slate-600 text-[9px]">Delivery Note Date</span>
                    <span className="font-semibold">—</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 divide-x divide-black p-0">
                  <div className="p-1.5">
                    <span className="block text-slate-600 text-[9px]">Dispatched through</span>
                    <strong className="font-bold">{dispatchThrough}</strong>
                  </div>
                  <div className="p-1.5">
                    <span className="block text-slate-600 text-[9px]">Destination</span>
                    <strong className="font-bold">{destination}</strong>
                  </div>
                </div>

                <div className="p-2 space-y-0.5">
                  <span className="block text-slate-600 text-[9px]">Terms of Delivery</span>
                  <div className="text-[10px] italic">
                    {sale.remarks || sale.notes || 'Immediate Delivery, Official Warranty Included'}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Table of Goods */}
            <div className="border-b border-black">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-black text-[10px] font-bold uppercase">
                    <th className="py-1 px-1.5 text-center w-8 border-r border-black">Sl<br/>No</th>
                    <th className="py-1 px-2 border-r border-black">Description of Goods</th>
                    <th className="py-1 px-2 text-center w-20 border-r border-black">HSN/SAC</th>
                    <th className="py-1 px-2 text-center w-20 border-r border-black">Quantity</th>
                    <th className="py-1 px-2 text-right w-24 border-r border-black">Rate</th>
                    <th className="py-1 px-1 text-center w-10 border-r border-black">per</th>
                    <th className="py-1 px-2 text-right w-28">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/20">
                  {sale.lineItems?.map((li, index) => {
                    const itemAmount = li.total || li.quantity * li.unitPrice;
                    return (
                      <tr key={index} className="align-top">
                        <td className="py-1.5 px-1 text-center font-bold border-r border-black">{index + 1}</td>
                        <td className="py-1.5 px-2 border-r border-black">
                          <div className="font-bold text-slate-950">
                            {li.product?.name}
                            {li.product?.color && <span className="font-normal text-slate-600"> ({li.product.color})</span>}
                          </div>
                          {li.serializedItemIds && li.serializedItemIds.length > 0 && (
                            <div className="text-[9px] font-mono text-slate-700">
                              SN: {li.serializedItemIds.map((s: any) => s.assetId || s).join(', ')}
                            </div>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-center font-mono text-[10px] border-r border-black">
                          {li.hsnCode || (li.product as any)?.hsnCode || '92029000'}
                        </td>
                        <td className="py-1.5 px-2 text-center font-bold border-r border-black">{li.quantity} Nos.</td>
                        <td className="py-1.5 px-2 text-right border-r border-black">{formatIndianDecimal(li.unitPrice)}</td>
                        <td className="py-1.5 px-1 text-center border-r border-black">Nos</td>
                        <td className="py-1.5 px-2 text-right font-bold">{formatIndianDecimal(itemAmount)}</td>
                      </tr>
                    );
                  })}

                  {/* Empty Spacer Rows for authentic tax invoice height */}
                  <tr className="h-10">
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td></td>
                  </tr>

                  {/* CGST Row */}
                  <tr>
                    <td className="border-r border-black"></td>
                    <td className="py-1 px-2 border-r border-black text-right italic font-medium" colSpan={5}>
                      Output @ CGST
                    </td>
                    <td className="py-1 px-2 text-right font-bold">{formatIndianDecimal(cgstAmount)}</td>
                  </tr>

                  {/* SGST Row */}
                  <tr>
                    <td className="border-r border-black"></td>
                    <td className="py-1 px-2 border-r border-black text-right italic font-medium" colSpan={5}>
                      Output @ SGST
                    </td>
                    <td className="py-1 px-2 text-right font-bold">{formatIndianDecimal(sgstAmount)}</td>
                  </tr>

                  {/* Total Row */}
                  <tr className="border-t-2 border-black font-black text-xs bg-slate-50">
                    <td className="border-r border-black"></td>
                    <td className="py-1.5 px-2 border-r border-black">Total</td>
                    <td className="border-r border-black"></td>
                    <td className="py-1.5 px-2 text-center border-r border-black">
                      {sale.lineItems?.reduce((acc, i) => acc + (i.quantity || 0), 0)} Nos.
                    </td>
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td className="py-1.5 px-2 text-right text-xs">INR {formatIndianDecimal(sale.grandTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 4. Amount Chargeable in Words & Signatory */}
            <div className="grid grid-cols-2 p-2 border-b border-black text-[10px]">
              <div className="space-y-1">
                <span className="text-slate-600 block">Amount Chargeable (in words):</span>
                <strong className="block text-[11px] font-bold uppercase leading-snug">
                  {numberToIndianWords(sale.grandTotal)}
                </strong>
                <div className="text-[9px] text-slate-600 pt-1">
                  Taxable Value: INR {formatIndianDecimal(taxableAmount)} | Central Tax: INR {formatIndianDecimal(cgstAmount)} | State Tax: INR {formatIndianDecimal(sgstAmount)}
                </div>
              </div>

              <div className="text-right flex flex-col justify-between items-end pl-4">
                <div className="text-[10px]">
                  for <strong>{supplierName}</strong>
                </div>
                <div className="pt-8 font-bold text-[10px] border-t border-black/40 px-3">
                  Authorised Signatory
                </div>
              </div>
            </div>

            {/* 5. Footer Computer Generated Declaration */}
            <div className="pt-2 text-center text-[10px] italic text-slate-700">
              This is a Computer Generated Invoice
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="flex items-center justify-between p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Invoice #{sale.invoiceNumber} • Status: <strong className="text-emerald-500">{sale.paymentStatus}</strong>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

export default TaxInvoiceModal;
