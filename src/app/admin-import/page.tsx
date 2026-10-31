'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getApiUrl } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  RefreshCw,
  ShieldAlert,
  ChevronRight,
  Eye,
  Rocket,
  AlertCircle,
  Info,
  X,
  BarChart2,
  Package,
  ShoppingCart,
  CreditCard,
  Music2,
  Truck,
} from 'lucide-react';

// ─── Types (mirror backend) ───────────────────────────────────────────────────

interface RowError {
  sheet: string;
  row: number;
  field: string;
  message: string;
}

interface ValidationPreview {
  categories: number;
  suppliers: number;
  locations: number;
  products: number;
  serializedItems: number;
  directSales: number;
  emiSales: number;
  emiPaymentRows: number;
  rentals: number;
  rentalPaymentRows: number;
  purchaseOrders: number;
}

interface ValidationResult {
  valid: boolean;
  totalRows: number;
  validRows: number;
  skippedRows: number;
  errorCount: number;
  errors: RowError[];
  preview: ValidationPreview;
}

interface ImportResult {
  success: boolean;
  durationMs: number;
  skipped: number;
  errors: RowError[];
  imported: {
    categories: number;
    suppliers: number;
    locations: number;
    products: number;
    serializedItems: number;
    sales: number;
    emiSales: number;
    rentals: number;
    purchaseOrders: number;
    stockMovements: number;
  };
}

// ─── Step indicators ─────────────────────────────────────────────────────────

type Step = 'upload' | 'validating' | 'preview' | 'importing' | 'done';

const STEPS: { key: Step; label: string }[] = [
  { key: 'upload',     label: '1. Upload File' },
  { key: 'preview',    label: '2. Review & Validate' },
  { key: 'done',       label: '3. Import Complete' },
];

function StepBar({ current }: { current: Step }) {
  const idx = { upload: 0, validating: 0, preview: 1, importing: 1, done: 2 }[current];
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((s, i) => (
        <React.Fragment key={s.key}>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
            i === idx ? 'bg-amber-500 text-slate-950 shadow-sm'
            : i < idx  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
          }`}>
            {i < idx
              ? <CheckCircle2 className="h-3.5 w-3.5" />
              : <span className="w-3.5 h-3.5 flex items-center justify-center font-extrabold">{i + 1}</span>
            }
            {s.label}
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-px flex-1 transition-colors ${i < idx ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Preview card ─────────────────────────────────────────────────────────────

function PreviewCard({ label, count, icon, color = 'slate' }: {
  label: string; count: number; icon: React.ReactNode;
  color?: 'green' | 'amber' | 'indigo' | 'slate' | 'rose';
}) {
  if (count === 0) return null;
  const bg: Record<string, string> = {
    green: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50',
    amber: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50',
    indigo: 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/50',
    rose:  'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/50',
    slate: 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700',
  };
  const txt: Record<string, string> = {
    green: 'text-emerald-700 dark:text-emerald-400', amber: 'text-amber-700 dark:text-amber-400',
    indigo: 'text-indigo-700 dark:text-indigo-400', rose: 'text-rose-700 dark:text-rose-400',
    slate: 'text-slate-700 dark:text-slate-300',
  };
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-3.5 ${bg[color]}`}>
      <div className={`shrink-0 ${txt[color]}`}>{icon}</div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className={`text-xl font-extrabold ${txt[color]}`}>{count.toLocaleString()}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminImportPage() {
  const { isSuperAdmin } = useAuth();

  const [step, setStep]                   = useState<Step>('upload');
  const [file, setFile]                   = useState<File | null>(null);
  const [isDragging, setIsDragging]       = useState(false);
  const [validation, setValidation]       = useState<ValidationResult | null>(null);
  const [importResult, setImportResult]   = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg]           = useState('');
  const [forceImport, setForceImport]     = useState(false);
  const [errorFilter, setErrorFilter]     = useState('');
  const [errorSheetFilter, setErrorSheetFilter] = useState('ALL');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Access guard ────────────────────────────────────────────────────────────
  if (!isSuperAdmin()) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Superadmin Access Required</h2>
        <p className="text-sm text-slate-500 max-w-sm">Historical data import is restricted to the Superadmin account to prevent accidental data modification.</p>
      </div>
    );
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const reset = () => {
    setStep('upload'); setFile(null); setValidation(null);
    setImportResult(null); setErrorMsg(''); setForceImport(false);
    setErrorFilter(''); setErrorSheetFilter('ALL');
  };

  const getToken = (): string => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('stereobliss_token') || localStorage.getItem('soundstock_token') || '';
  };

  // ── Download template ───────────────────────────────────────────────────────
  const downloadTemplate = () => {
    const token = getToken();
    const url   = getApiUrl('/import/template');
    const a     = document.createElement('a');
    // Pass token as query param since this is a direct download link
    a.href      = token ? `${url}?token=${encodeURIComponent(token)}` : url;
    a.download  = 'stereobliss-historical-import-template.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ── File selection ──────────────────────────────────────────────────────────
  const handleFileSelect = (f: File | null) => {
    if (!f) return;
    if (!f.name.endsWith('.xlsx') && !f.name.endsWith('.xls')) {
      setErrorMsg('Only Excel files (.xlsx) are accepted.'); return;
    }
    setErrorMsg(''); setValidation(null); setImportResult(null);
    setFile(f);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  }, []);

  // ── Validate ────────────────────────────────────────────────────────────────
  const handleValidate = async () => {
    if (!file) return;
    setStep('validating'); setErrorMsg('');

    try {
      const form = new FormData();
      form.append('file', file);

      const res = await fetch(getApiUrl('/import/validate'), {
        method: 'POST',
        body: form,
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || 'Validation failed');

      setValidation(json.data);
      setStep('preview');
    } catch (err: any) {
      setErrorMsg(err.message || 'Validation request failed.');
      setStep('upload');
    }
  };

  // ── Execute import ──────────────────────────────────────────────────────────
  const handleImport = async () => {
    if (!file) return;
    setStep('importing'); setErrorMsg('');

    try {
      const form = new FormData();
      form.append('file', file);
      if (forceImport) form.append('forceImport', 'true');

      const res = await fetch(getApiUrl('/import/execute'), {
        method: 'POST',
        body: form,
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        // 422 = validation errors still present — show them
        if (json.data?.validation) {
          setValidation(json.data.validation);
          setStep('preview');
          setErrorMsg(json.error?.message || 'Validation errors found — fix them first or enable "Skip invalid rows".');
          return;
        }
        throw new Error(json.error?.message || 'Import failed');
      }

      setImportResult(json.data);
      setStep('done');
    } catch (err: any) {
      setErrorMsg(err.message || 'Import request failed.');
      setStep('preview');
    }
  };

  // ── Error table helpers ─────────────────────────────────────────────────────
  const allSheets = validation
    ? ['ALL', ...Array.from(new Set(validation.errors.map(e => e.sheet)))]
    : ['ALL'];

  const filteredErrors = (validation?.errors ?? importResult?.errors ?? []).filter(e => {
    const matchSheet  = errorSheetFilter === 'ALL' || e.sheet === errorSheetFilter;
    const q           = errorFilter.toLowerCase();
    const matchSearch = !q || e.message.toLowerCase().includes(q) || e.field.toLowerCase().includes(q) || e.sheet.toLowerCase().includes(q);
    return matchSheet && matchSearch;
  });

  const previewTotal = validation
    ? Object.values(validation.preview).reduce((a, b) => a + b, 0)
    : 0;

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-12">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BrandLogo size="md" variant="badge" className="shadow-xs shrink-0" />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              Historical Data Import
              <Badge variant="outline" className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 border-amber-500/30">
                Superadmin
              </Badge>
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Import previous sales, rentals, products, and stock records into the live database.
            </p>
          </div>
        </div>
        {step !== 'upload' && (
          <Button variant="outline" size="sm" onClick={reset} className="gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> Start Over
          </Button>
        )}
      </div>

      {/* ── Step bar ── */}
      <StepBar current={step} />

      {/* ── Error banner ── */}
      {errorMsg && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/20 p-4">
          <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-rose-800 dark:text-rose-300">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-rose-400 hover:text-rose-600 transition-colors shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          STEP 1 — Upload
      ══════════════════════════════════════════════ */}
      {(step === 'upload' || step === 'validating') && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Left: Instructions + download */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-amber-500" /> How it works
              </h2>
              <ol className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
                {[
                  'Download the Excel template below.',
                  'Fill in your historical data across the 11 sheets in order.',
                  'Upload the completed file here.',
                  'Review the validation results — fix errors if needed.',
                  'Confirm and import. Existing records are automatically skipped.',
                ].map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 font-extrabold text-[10px]">{i + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>

              <Button
                variant="default"
                className="w-full gap-2 font-bold bg-amber-500 hover:bg-amber-600 text-slate-950"
                onClick={downloadTemplate}
              >
                <Download className="h-4 w-4" />
                Download Excel Template
              </Button>
            </div>

            {/* What's in the template */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Template covers</h3>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {[
                  { icon: '📂', label: 'Categories & Suppliers' },
                  { icon: '📍', label: 'Stock Locations' },
                  { icon: '🎸', label: 'Products & Serialized Items' },
                  { icon: '🛒', label: 'Direct Sales' },
                  { icon: '💳', label: 'EMI Sales & Instalments' },
                  { icon: '🎹', label: 'Instrument Rentals' },
                  { icon: '📅', label: 'Rental Payments' },
                  { icon: '📦', label: 'Purchase Orders' },
                ].map(({ icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <span>{icon}</span><span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Drop zone */}
          <div className="lg:col-span-3 space-y-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 cursor-pointer transition-all select-none ${
                isDragging
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20'
                  : file
                  ? 'border-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/10'
                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-amber-400 hover:bg-amber-50/30 dark:hover:bg-amber-950/10'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
              />

              {file ? (
                <div className="text-center space-y-2">
                  <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <FileSpreadsheet className="h-7 w-7" />
                  </div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB · Click to change file</p>
                </div>
              ) : (
                <div className="text-center space-y-3">
                  <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
                    <Upload className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-700 dark:text-slate-300">Drop your Excel file here</p>
                    <p className="text-xs text-slate-400 mt-1">or click to browse · .xlsx only · max 50 MB</p>
                  </div>
                </div>
              )}
            </div>

            {file && (
              <Button
                variant="default"
                className="w-full gap-2 font-bold text-sm"
                onClick={handleValidate}
                isLoading={step === 'validating'}
                disabled={step === 'validating'}
              >
                {step === 'validating' ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Validating file…</>
                ) : (
                  <><Eye className="h-4 w-4" /> Validate & Preview</>
                )}
              </Button>
            )}

            {/* Safety notice */}
            <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/15 p-3.5">
              <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                <strong>Safe to retry.</strong> Existing records are detected by invoice number, SKU, asset ID, and reference number — they are skipped automatically. No duplicate records will be created.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          STEP 2 — Preview & Validate
      ══════════════════════════════════════════════ */}
      {(step === 'preview' || step === 'importing') && validation && (
        <div className="space-y-6">

          {/* Summary banner */}
          <div className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5 ${
            validation.valid
              ? 'border-emerald-300 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/15'
              : 'border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/15'
          }`}>
            <div className="flex items-center gap-3">
              {validation.valid
                ? <CheckCircle2 className="h-7 w-7 text-emerald-500 shrink-0" />
                : <AlertTriangle className="h-7 w-7 text-amber-500 shrink-0" />}
              <div>
                <p className="font-bold text-sm text-slate-900 dark:text-white">
                  {validation.valid ? 'File is valid — ready to import' : `${validation.errorCount} error${validation.errorCount !== 1 ? 's' : ''} found`}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {validation.totalRows.toLocaleString()} total rows · {validation.validRows.toLocaleString()} valid · {validation.skippedRows.toLocaleString()} skipped · {previewTotal.toLocaleString()} records to create
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {!validation.valid && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={forceImport}
                    onChange={e => setForceImport(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-400 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Skip invalid rows & import valid ones</span>
                </label>
              )}
              <Button
                variant="default"
                className={`gap-2 font-bold ${validation.valid ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600 text-slate-950'}`}
                onClick={handleImport}
                isLoading={step === 'importing'}
                disabled={step === 'importing' || (!validation.valid && !forceImport)}
              >
                {step === 'importing'
                  ? <><RefreshCw className="h-4 w-4 animate-spin" /> Importing…</>
                  : <><Rocket className="h-4 w-4" /> Confirm Import</>}
              </Button>
            </div>
          </div>

          {/* Preview counts grid */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Records to be imported</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <PreviewCard label="Categories"       count={validation.preview.categories}    icon={<BarChart2 className="h-5 w-5" />}   color="slate" />
              <PreviewCard label="Suppliers"        count={validation.preview.suppliers}     icon={<Truck className="h-5 w-5" />}       color="slate" />
              <PreviewCard label="Locations"        count={validation.preview.locations}     icon={<Package className="h-5 w-5" />}     color="slate" />
              <PreviewCard label="Products"         count={validation.preview.products}      icon={<Package className="h-5 w-5" />}     color="amber" />
              <PreviewCard label="Serialized Units" count={validation.preview.serializedItems} icon={<Package className="h-5 w-5" />}  color="amber" />
              <PreviewCard label="Direct Sales"     count={validation.preview.directSales}   icon={<ShoppingCart className="h-5 w-5" />} color="green" />
              <PreviewCard label="EMI Sales"        count={validation.preview.emiSales}      icon={<CreditCard className="h-5 w-5" />}  color="green" />
              <PreviewCard label="EMI Payment rows" count={validation.preview.emiPaymentRows} icon={<CreditCard className="h-5 w-5" />} color="slate" />
              <PreviewCard label="Rentals"          count={validation.preview.rentals}       icon={<Music2 className="h-5 w-5" />}      color="indigo" />
              <PreviewCard label="Rental Payment rows" count={validation.preview.rentalPaymentRows} icon={<Music2 className="h-5 w-5" />} color="slate" />
              <PreviewCard label="Purchase Orders"  count={validation.preview.purchaseOrders} icon={<Truck className="h-5 w-5" />}    color="slate" />
            </div>
          </div>

          {/* Error table */}
          {validation.errors.length > 0 && (
            <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-rose-50/60 dark:bg-rose-950/10 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-rose-500" />
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {validation.errors.length} validation error{validation.errors.length !== 1 ? 's' : ''}
                    {validation.errors.length >= 500 && <span className="text-xs text-slate-500 ml-1">(first 500 shown)</span>}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Sheet filter */}
                  <select
                    value={errorSheetFilter}
                    onChange={e => setErrorSheetFilter(e.target.value)}
                    className="h-7 px-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
                  >
                    {['ALL', ...Array.from(new Set(validation.errors.map(e => e.sheet)))].map(s => (
                      <option key={s} value={s}>{s === 'ALL' ? 'All Sheets' : s}</option>
                    ))}
                  </select>
                  {/* Search */}
                  <input
                    type="text"
                    placeholder="Search errors…"
                    value={errorFilter}
                    onChange={e => setErrorFilter(e.target.value)}
                    className="h-7 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 w-40"
                  />
                </div>
              </div>
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/80">
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-4">Sheet</th>
                      <th className="py-2.5 px-4">Row</th>
                      <th className="py-2.5 px-4">Field</th>
                      <th className="py-2.5 px-4">Problem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredErrors.map((e, i) => (
                      <tr key={i} className="hover:bg-rose-50/40 dark:hover:bg-rose-950/10">
                        <td className="py-2.5 px-4">
                          <span className="font-bold text-slate-700 dark:text-slate-300">{e.sheet}</span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-500">{e.row > 0 ? `Row ${e.row}` : '—'}</td>
                        <td className="py-2.5 px-4">
                          <span className="font-mono text-amber-600 dark:text-amber-400">{e.field}</span>
                        </td>
                        <td className="py-2.5 px-4 text-rose-700 dark:text-rose-400">{e.message}</td>
                      </tr>
                    ))}
                    {filteredErrors.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400">No errors match this filter</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          STEP 3 — Done
      ══════════════════════════════════════════════ */}
      {step === 'done' && importResult && (
        <div className="space-y-6">

          {/* Success banner */}
          <div className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-6 ${
            importResult.success
              ? 'border-emerald-300 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/15'
              : 'border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/15'
          }`}>
            <div className="flex items-center gap-4">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${importResult.success ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'}`}>
                {importResult.success ? <CheckCircle2 className="h-8 w-8" /> : <AlertTriangle className="h-8 w-8" />}
              </div>
              <div>
                <p className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {importResult.success ? 'Import completed successfully!' : 'Import completed with some errors'}
                </p>
                <p className="text-sm text-slate-500 mt-0.5">
                  Finished in {(importResult.durationMs / 1000).toFixed(1)}s · {importResult.skipped} row{importResult.skipped !== 1 ? 's' : ''} skipped (duplicates or invalid)
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={reset} className="gap-1.5 font-bold">
              <RefreshCw className="h-3.5 w-3.5" /> Import Another File
            </Button>
          </div>

          {/* Results grid */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Records Created</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { label: 'Categories',       value: importResult.imported.categories,      color: 'slate' as const },
                { label: 'Suppliers',         value: importResult.imported.suppliers,       color: 'slate' as const },
                { label: 'Locations',         value: importResult.imported.locations,       color: 'slate' as const },
                { label: 'Products',          value: importResult.imported.products,        color: 'amber' as const },
                { label: 'Serialized Items',  value: importResult.imported.serializedItems, color: 'amber' as const },
                { label: 'Direct Sales',      value: importResult.imported.sales,           color: 'green' as const },
                { label: 'EMI Sales',         value: importResult.imported.emiSales,        color: 'green' as const },
                { label: 'Rentals',           value: importResult.imported.rentals,         color: 'indigo' as const },
                { label: 'Purchase Orders',   value: importResult.imported.purchaseOrders,  color: 'slate' as const },
                { label: 'Stock Movements',   value: importResult.imported.stockMovements,  color: 'slate' as const },
              ].map(({ label, value, color }) => (
                <div key={label} className={`rounded-xl border p-4 ${
                  value > 0
                    ? color === 'green'  ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/15'
                    : color === 'amber'  ? 'border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/15'
                    : color === 'indigo' ? 'border-indigo-200 dark:border-indigo-800/50 bg-indigo-50 dark:bg-indigo-950/15'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-50'
                }`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
                  <p className={`text-2xl font-extrabold mt-0.5 ${
                    value > 0
                      ? color === 'green' ? 'text-emerald-600 dark:text-emerald-400'
                      : color === 'amber' ? 'text-amber-600 dark:text-amber-400'
                      : color === 'indigo'? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-900 dark:text-white'
                      : 'text-slate-300 dark:text-slate-600'
                  }`}>{value.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Import errors (if any) */}
          {importResult.errors.length > 0 && (
            <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-rose-50/60 dark:bg-rose-950/10">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {importResult.errors.length} record{importResult.errors.length !== 1 ? 's' : ''} could not be imported
                </span>
              </div>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/80">
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-4">Sheet</th>
                      <th className="py-2.5 px-4">Field</th>
                      <th className="py-2.5 px-4">Problem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {importResult.errors.map((e, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-4 font-bold text-slate-700 dark:text-slate-300">{e.sheet}</td>
                        <td className="py-2.5 px-4 font-mono text-amber-600 dark:text-amber-400">{e.field}</td>
                        <td className="py-2.5 px-4 text-rose-700 dark:text-rose-400">{e.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Next steps */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-amber-500" /> What to do next
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {[
                { href: '/dashboard',  label: 'Business Overview', desc: 'Review the updated dashboard' },
                { href: '/inventory',  label: 'Inventory',          desc: 'Verify stock levels and products' },
                { href: '/sales',      label: 'Sales & Billing',    desc: 'Check imported sales records' },
              ].map(({ href, label, desc }) => (
                <a key={href} href={href}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 hover:border-amber-400 hover:bg-amber-50/30 dark:hover:bg-amber-950/10 transition-all group">
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{label}</p>
                    <p className="text-slate-400 mt-0.5">{desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-amber-500 shrink-0 mt-0.5 transition-colors" />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
