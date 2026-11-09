import { jsPDF } from 'jspdf';
import { formatCurrency, formatDate } from './utils';
import { DashboardMetrics } from './types';

export interface PdfExportOptions {
  periodLabel: string;
  userName?: string;
  userRole?: string;
  data: DashboardMetrics;
  category?: string;
}

export function generateExecutivePdf(options: PdfExportOptions): void {
  const { periodLabel, userName = 'Executive User', userRole = 'Superadmin', data, category = 'Executive Overview' } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 18;

  // 1. Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Accent Line
  doc.setFillColor(245, 158, 11); // amber-500
  doc.rect(0, 27, pageWidth, 1.5, 'F');

  // Brand & Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('STEREOBLISS — EXECUTIVE BI REPORT', 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`Scope: ${category} | Period: ${periodLabel}`, 14, 21);

  // Metadata Right
  const nowStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Generated: ${nowStr} IST`, pageWidth - 14, 13, { align: 'right' });
  doc.text(`Author: ${userName} (${userRole})`, pageWidth - 14, 21, { align: 'right' });

  y = 38;

  // Helper Section Header
  const drawSectionHeader = (title: string, subtitle?: string) => {
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.rect(14, y, pageWidth - 28, 7.5, 'FD');

    doc.setFillColor(245, 158, 11); // amber indicator
    doc.rect(14, y, 2.5, 7.5, 'F');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(title.toUpperCase(), 19, y + 5.2);

    if (subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(subtitle, pageWidth - 16, y + 5.2, { align: 'right' });
    }

    y += 11;
  };

  // Helper Table Row
  const drawTableRow = (col1: string, col2: string, col3: string, col4: string, isHeader = false) => {
    const colX = [14, 80, 125, 160];
    const rowHeight = isHeader ? 7 : 6.5;

    if (isHeader) {
      doc.setFillColor(241, 245, 249);
      doc.rect(14, y, pageWidth - 28, rowHeight, 'F');
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
    } else {
      doc.setFillColor(255, 255, 255);
      doc.rect(14, y, pageWidth - 28, rowHeight, 'F');
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
    }

    // Border line bottom
    doc.setDrawColor(241, 245, 249);
    doc.line(14, y + rowHeight, pageWidth - 14, y + rowHeight);

    doc.text(col1, colX[0] + 2, y + 4.5);
    doc.text(col2, colX[1], y + 4.5);
    doc.text(col3, colX[2], y + 4.5);
    doc.text(col4, colX[3], y + 4.5);

    y += rowHeight;
  };

  const ef = data.executiveFinancials;
  const fh = data.financialHealth;
  const ih = data.inventoryHealth;
  const rp = data.rentalPerformance;

  // 2. Primary Executive Financials
  drawSectionHeader('1. Executive Financial Performance', 'Accounting Basis: Net Recognized vs Cash Realized');
  drawTableRow('Metric', 'Recorded Value', 'Previous Period', 'Growth / Delta', true);

  if (ef) {
    drawTableRow(
      'Sales Revenue',
      formatCurrency(ef.salesRevenue.value),
      formatCurrency(ef.salesRevenue.previousValue),
      `${ef.salesRevenue.deltaPercent > 0 ? '+' : ''}${ef.salesRevenue.deltaPercent}% (${ef.salesRevenue.direction})`
    );
    drawTableRow(
      'Cash Collected (Liquid Inflows)',
      formatCurrency(ef.cashCollected.value),
      formatCurrency(ef.cashCollected.previousValue),
      `${ef.cashCollected.deltaPercent > 0 ? '+' : ''}${ef.cashCollected.deltaPercent}% (${ef.cashCollected.direction})`
    );
    drawTableRow(
      'Gross Profit',
      `${formatCurrency(ef.grossProfit.value)} (${ef.grossProfit.marginPercent}%)`,
      `${formatCurrency(ef.grossProfit.previousValue)} (${ef.grossProfit.previousMarginPercent}%)`,
      `${ef.grossProfit.deltaPercent > 0 ? '+' : ''}${ef.grossProfit.deltaPercent}%`
    );
    drawTableRow(
      'Outstanding Receivables (EMI + Rent)',
      formatCurrency(ef.outstandingReceivables.value),
      formatCurrency(ef.outstandingReceivables.previousValue),
      'Active Dues'
    );
    drawTableRow(
      'Inventory Value (At Purchase Cost)',
      formatCurrency(ef.inventoryValuationAtCost.value),
      formatCurrency(ef.inventoryValuationAtCost.previousValue),
      'Capital Asset'
    );
    drawTableRow(
      'Net Rental Operating Profit',
      formatCurrency(ef.netRentalProfit.value),
      formatCurrency(ef.netRentalProfit.previousValue),
      `${ef.netRentalProfit.deltaPercent > 0 ? '+' : ''}${ef.netRentalProfit.deltaPercent}%`
    );
  }

  y += 5;

  // 3. Financial Health & Cash Movement
  drawSectionHeader('2. Cash Movement & Obligations', 'Strict Cash-Inflow vs Liability Distinctions');
  drawTableRow('Component', 'Amount', 'Accounting Nature', 'Status', true);

  if (fh) {
    drawTableRow('Total Cash Inflows', formatCurrency(fh.cashInflows), 'Direct + EMI + Rent Collected', 'Liquid Asset');
    drawTableRow('Total Cash Outflows', formatCurrency(fh.cashOutflows), 'PO Receipts + Maintenance Paid', 'Disbursement');
    drawTableRow(
      'Net Cash Movement',
      formatCurrency(fh.netCashMovement),
      fh.netCashMovement >= 0 ? 'Net Cash Surplus' : 'Net Cash Deficit',
      fh.netCashMovement >= 0 ? 'Positive' : 'Attention'
    );
    drawTableRow('Outstanding EMI Receivables', formatCurrency(fh.outstandingEmiReceivables), 'Contractual Balance Due', 'Pending Receipt');
    drawTableRow('Outstanding Rental Receivables', formatCurrency(fh.outstandingRentalReceivables), 'Monthly Subscription Dues', 'Pending Receipt');
    drawTableRow('Customer Security Deposits Held', formatCurrency(fh.customerDepositsHeld), 'Trust Escrow (Current Liability)', 'Not Revenue');
    drawTableRow('Customer Refunds Payable', formatCurrency(fh.refundsPayable), 'Returned Asset Obligations', 'Immediate Payable');
  }

  y += 5;

  // 4. Inventory & Rental Fleet Summary
  drawSectionHeader('3. Asset Reconciliation & Fleet Yield', 'Physical Balance Reconciliation');
  drawTableRow('Category', 'Quantity / Value', 'Operational Classification', 'Health Status', true);

  if (ih && rp) {
    drawTableRow('Total Units Owned', `${ih.totalUnitsOwned} Units`, 'Company Fixed & Current Asset Base', 'Reconciled');
    drawTableRow('Available for Retail Sale', `${ih.totalAvailableForSale} Units`, formatCurrency(ih.totalInventoryValuationAtCost), 'Active Warehouse');
    drawTableRow('Currently Rented Out', `${ih.totalUnitsInRental} Units`, `${rp.activeAgreements} Active Subscription Agreements`, 'Yield Generating');
    drawTableRow('In Maintenance / Workshop', `${ih.totalUnitsInMaintenance} Units`, 'Quarantined for Inspection/Repairs', ih.totalUnitsInMaintenance > 0 ? 'Under Service' : 'Clean');
    drawTableRow('Potential Retail Value', formatCurrency(ih.totalPotentialRetailValuation), `Potential Margin: ${formatCurrency(ih.potentialGrossMargin)} (${ih.potentialMarginPercent}%)`, 'Estimated Retail');
    drawTableRow('Fleet Capex Recovery Rate', `${rp.fleetCapexRecoveryPercent}%`, `Total Fleet Capex: ${formatCurrency(rp.totalFleetCapex)}`, rp.fleetCapexRecoveryPercent >= 100 ? 'Fully Recovered' : 'Amortizing');
  }

  y += 5;

  // 5. Critical Risk Register / Alerts
  drawSectionHeader('4. Risk Register — Immediate Attention Required', 'Prioritized by Financial Exposure');

  if (data.businessAlerts && data.businessAlerts.length > 0) {
    data.businessAlerts.slice(0, 4).forEach((alert) => {
      const isCrit = alert.severity === 'critical';
      doc.setFillColor(isCrit ? 254 : 255, isCrit ? 242 : 251, isCrit ? 242 : 235);
      doc.rect(14, y, pageWidth - 28, 9, 'F');
      doc.setDrawColor(isCrit ? 248 : 251, isCrit ? 113 : 191, isCrit ? 113 : 36);
      doc.rect(14, y, pageWidth - 28, 9, 'D');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(isCrit ? 159 : 146, isCrit ? 18 : 64, isCrit ? 57 : 14);
      doc.text(`[${alert.severity.toUpperCase()}] ${alert.title}`, 18, y + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      const exposureText = alert.financialExposure > 0 ? ` | Exposure: ${formatCurrency(alert.financialExposure)}` : '';
      doc.text(`${alert.message}${exposureText}`, 18, y + 7.8);

      y += 11;
    });
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(16, 185, 129);
    doc.text('No critical operational or financial alerts active. All accounts in verified standing.', 18, y + 4.5);
    y += 8;
  }

  // Footer notes & Accounting Definitions
  const footerY = pageHeight - 18;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, footerY - 4, pageWidth - 14, footerY - 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'ACCOUNTING DEFINITIONS: Recognized Sales Revenue excludes cancelled transactions and customer returns. Cash Collected represents liquid receipts. Customer security deposits are held in escrow as current liabilities and never recognized as revenue. Net Rental Profit = Rent Collected minus routine servicing.',
    14,
    footerY
  );
  doc.text(
    `CONFIDENTIAL — FOR STEREOBLISS CEO & EXECUTIVE BOARD ONLY | PAGE 1 OF 1`,
    pageWidth - 14,
    footerY + 4,
    { align: 'right' }
  );

  // Save PDF
  const filename = `StereoBliss_Executive_Report_${periodLabel.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  doc.save(filename);
}
