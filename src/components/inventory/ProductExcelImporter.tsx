'use client';

import React, { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { getApiUrl } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCheck,
  RefreshCw,
  Boxes,
  ArrowRight,
  Info,
  X,
  Sparkles,
} from 'lucide-react';

interface ImportedProductItem {
  _id: string;
  name: string;
  sku: string;
  brand: string;
  categoryName: string;
  color?: string;
  hsnCode?: string;
  unitOfMeasure: string;
  minStockThreshold: number;
  initialStock?: number;
}

interface ImportResultData {
  success: boolean;
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  initialStockCreated?: number;
  products: ImportedProductItem[];
  errors: Array<{ row: number; field: string; message: string }>;
}

interface ProductExcelImporterProps {
  onSuccess?: () => void;
  className?: string;
}

export function ProductExcelImporter({ onSuccess, className = '' }: ProductExcelImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResultData | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getToken = (): string => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('stereobliss_token') || localStorage.getItem('soundstock_token') || '';
  };

  // ── Download Excel Template ───────────────────────────────────────────
  const handleDownloadTemplate = async () => {
    setIsDownloading(true);
    setErrorMessage('');
    try {
      const token = getToken();
      const url = getApiUrl('/products/bulk/template');

      const res = await fetch(url, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as any)?.error?.message || `Download failed (HTTP ${res.status})`);
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = 'stereobliss-product-catalog-template.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to download Excel template.');
    } finally {
      setIsDownloading(false);
    }
  };

  // ── File Selection ────────────────────────────────────────────────────
  const handleFileSelect = (selectedFile: File) => {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const hasValidExt = validExtensions.some((ext) => selectedFile.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      setErrorMessage('Please upload a valid Excel spreadsheet (.xlsx, .xls) or CSV file.');
      return;
    }

    setFile(selectedFile);
    setErrorMessage('');
    setImportResult(null);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  }, []);

  // ── Direct Import Submission ──────────────────────────────────────────
  const handleExecuteImport = async () => {
    if (!file) return;
    setIsImporting(true);
    setErrorMessage('');
    setImportResult(null);

    try {
      const token = getToken();
      const form = new FormData();
      form.append('file', file);

      const res = await fetch(getApiUrl('/products/bulk/import'), {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
        body: form,
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || json.message || `Import failed (HTTP ${res.status})`);
      }

      setImportResult(json.data);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to process Excel spreadsheet.');
    } finally {
      setIsImporting(false);
    }
  };

  const resetImport = () => {
    setFile(null);
    setImportResult(null);
    setErrorMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Card className={`shadow-sm border-slate-200 dark:border-slate-800 ${className}`}>
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2 text-slate-900 dark:text-white">
            <FileSpreadsheet className="h-5 w-5 text-amber-500" />
            <span>Product Catalog — Bulk Excel Import</span>
          </CardTitle>
          <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-amber-500 border-amber-500/30 w-fit">
            Superadmin &amp; Manager
          </Badge>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Add dozens of products directly into your catalog at once by filling our Excel spreadsheet.
        </p>
      </CardHeader>

      <CardContent className="pt-4 space-y-5 text-xs">
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage('')}
              className="text-xs opacity-70 hover:opacity-100 underline ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 1. Feature Benefits / Supported Columns Grid */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-bold">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>Supported Excel Sheet Columns:</span>
            </span>
            <span className="text-[10px] text-slate-400 font-normal">All columns matched automatically</span>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {[
              { name: 'Brand', required: false, desc: 'Yamaha, Fender, Roland, etc.' },
              { name: 'Product Name', required: true, desc: 'Required' },
              { name: 'Model / Series Name', required: false, desc: 'Pacifica, F310, Player' },
              { name: 'Category', required: true, desc: 'Auto-created if new' },
              { name: 'Color', required: false, desc: 'Natural, Sunburst, Black' },
              { name: 'HSN Code', required: false, desc: 'Default: 9202' },
              { name: 'Low Stock Alert', required: false, desc: 'Default: 5' },
              { name: 'Unit of Measure', required: false, desc: 'Default: pcs' },
              { name: 'Purchase Cost (₹)', required: false, desc: 'Optional' },
              { name: 'Selling Price (₹)', required: false, desc: 'Optional' },
              { name: 'Tracking Mode', required: false, desc: 'SERIALIZED or QUANTITY' },
              { name: 'Opening Stock', required: false, desc: 'Initial count directly on-hand' },
              { name: 'Serial Numbers (if Serialized)', required: false, desc: 'Comma-separated serials' },
              { name: 'Location Code', required: false, desc: 'Outlet code (Default: CENTRAL)' },
            ].map((col, idx) => (
              <span
                key={idx}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                  col.required
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                }`}
                title={col.desc}
              >
                <span>{col.name}</span>
                {col.required && <span className="text-amber-500 font-black">*</span>}
              </span>
            ))}
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 leading-relaxed">
            💡 <strong>Smart Processing:</strong> Missing categories are automatically created on the fly. SKUs are sequentially generated (e.g. SKU-0001) if omitted.
          </p>
        </div>

        {/* 2. Download Template & Upload Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Step A: Download Template Card */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col justify-between space-y-3">
            <div className="space-y-1">
              <span className="font-bold text-slate-900 dark:text-white text-xs block">
                Step 1: Download Standard Template
              </span>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Download the pre-formatted Excel workbook containing sample musical instruments, column hints, and instructions.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              isLoading={isDownloading}
              className="gap-2 font-bold border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer w-full justify-center"
            >
              <Download className="h-4 w-4" />
              <span>Download Excel Template (.xlsx)</span>
            </Button>
          </div>

          {/* Step B: Upload File Card */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col justify-between space-y-3">
            <div className="space-y-1">
              <span className="font-bold text-slate-900 dark:text-white text-xs block">
                Step 2: Upload Completed Spreadsheet
              </span>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Select your filled sheet (.xlsx, .xls, .csv). Products will be validated and added directly.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />

            {!file ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-3 rounded-lg border-2 border-dashed text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-slate-300 dark:border-slate-700 hover:border-amber-500/60 bg-slate-50/50 dark:bg-slate-900/40'
                }`}
              >
                <Upload className="h-5 w-5 mx-auto text-slate-400 mb-1" />
                <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                  Click to Browse or Drag &amp; Drop Excel
                </span>
                <span className="text-[10px] text-slate-400">Supports .xlsx, .xls, .csv</span>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <FileCheck className="h-4 w-4 text-amber-500 shrink-0" />
                  <div className="truncate">
                    <span className="font-bold text-slate-900 dark:text-white truncate block">
                      {file.name}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetImport}
                  className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                  title="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 3. Confirm Import Button */}
        {file && !importResult && (
          <div className="flex justify-end items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetImport}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleExecuteImport}
              isLoading={isImporting}
              className="gap-2 font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 cursor-pointer shadow-sm"
            >
              <Upload className="h-4 w-4" />
              <span>Confirm &amp; Add Products Directly</span>
            </Button>
          </div>
        )}

        {/* 4. Import Results Display */}
        {importResult && (
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                <div>
                  <span className="font-extrabold text-sm text-emerald-700 dark:text-emerald-300 block">
                    {importResult.importedCount} Product{importResult.importedCount === 1 ? '' : 's'} Added Directly to Catalog!
                    {importResult.initialStockCreated ? ` (${importResult.initialStockCreated} stock units placed on-hand)` : ''}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Total rows processed: {importResult.totalRows} • Skipped empty: {importResult.skippedCount}
                    {importResult.initialStockCreated ? ` • ${importResult.initialStockCreated} opening balance movements recorded` : ''}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetImport}
                  className="h-7 text-xs font-semibold"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  <span>Import Another File</span>
                </Button>
                <Link href="/inventory">
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <span>View Product Catalog</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* List of imported items */}
            {importResult.products && importResult.products.length > 0 && (
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-950">
                <div className="p-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-400 text-[11px] flex justify-between">
                  <span>Recently Imported Products</span>
                  <span>{importResult.products.length} Items</span>
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                  {importResult.products.map((p, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-900/40">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{p.name}</span>
                          {p.color && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-400">
                              {p.color}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Brand: <strong>{p.brand}</strong> • Category: <strong>{p.categoryName}</strong> • HSN: {p.hsnCode} • Low Stock: {p.minStockThreshold} {p.unitOfMeasure}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.initialStock !== undefined && p.initialStock > 0 && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                            {p.initialStock} in stock
                          </span>
                        )}
                        <span className="font-mono font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded text-[11px] border border-amber-500/20">
                          {p.sku}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* List of row errors if any */}
            {importResult.errors && importResult.errors.length > 0 && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 space-y-1.5">
                <span className="font-bold text-rose-500 text-xs flex items-center gap-1">
                  <XCircle className="h-4 w-4" />
                  <span>{importResult.errors.length} Row Notice(s):</span>
                </span>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {importResult.errors.map((err, i) => (
                    <div key={i} className="text-[11px] text-rose-600 dark:text-rose-400 flex items-start gap-1">
                      <span className="font-bold shrink-0">Row {err.row} [{err.field}]:</span>
                      <span>{err.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
