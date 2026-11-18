/**
 * Smit FinStat PRO - Multi-Format Export Engine
 * Generates Multi-Sheet Excel (.xlsx), Professional PDF, CSV and Printable Financial Statements.
 */

const FinStatExporter = {
  /**
   * Export Multi-Sheet Excel Workbook
   */
  exportToExcel(reportData, companyInfo) {
    if (!window.XLSX) {
      alert('SheetJS library is loading, please try again.');
      return;
    }

    const wb = XLSX.utils.book_new();
    const pl = reportData.pl;
    const bs = reportData.bs;
    const aggregated = reportData.aggregated;
    const company = companyInfo || { name: 'ABC ENTERPRISES LIMITED', cin: 'L12345MH2010PLC123456', cyLabel: '31st March 2026', pyLabel: '31st March 2025' };

    // 1. STATEMENT OF PROFIT AND LOSS SHEET
    const plRows = [
      [company.name.toUpperCase()],
      [`CIN: ${company.cin || 'N/A'}`],
      ['STATEMENT OF PROFIT AND LOSS UNDER IND AS 118'],
      [`(For the year ended ${company.cyLabel} with comparative figures for ${company.pyLabel})`],
      [`Reporting Currency: INR (${company.scaleLabel || 'In Absolute Figures'}) | Main Business Activity: ${company.mbaLabel || 'Standard'}`],
      [],
      ['Particulars', 'Note No.', `Year Ended ${company.cyLabel}`, `Year Ended ${company.pyLabel}`],
      ['I. OPERATING CATEGORY', '', '', ''],
      ['   Revenue from Operations', '18', pl.operating.revOps.cy, pl.operating.revOps.py],
      ['   Other Operating Revenue', '18.1', pl.operating.revOtherOp.cy, pl.operating.revOtherOp.py],
      ['   TOTAL OPERATING REVENUE (A)', '', pl.operating.totalOpRevenueCY, pl.operating.totalOpRevenuePY],
      [],
      ['   Operating Expenses:', '', '', ''],
      ['   Cost of Materials Consumed', '19', pl.operating.costMat.cy, pl.operating.costMat.py],
      ['   Purchases of Stock-in-Trade', '20', pl.operating.purchStock.cy, pl.operating.purchStock.py],
      ['   Changes in Inventories of FG, WIP and Stock-in-Trade', '21', pl.operating.chgInv.cy, pl.operating.chgInv.py],
      ['   Employee Benefits Expense', '22', pl.operating.empBen.cy, pl.operating.empBen.py],
      ['   Depreciation and Amortisation Expense', '23', pl.operating.depAmort.cy, pl.operating.depAmort.py],
      ['   Other Operating Expenses', '24', pl.operating.otherOpExp.cy, pl.operating.otherOpExp.py],
      ['   TOTAL OPERATING EXPENSES (B)', '', pl.operating.totalOpExpensesCY, pl.operating.totalOpExpensesPY],
      [],
      ['   OPERATING PROFIT OR LOSS (I = A - B) [MANDATORY SUBTOTAL]', '', pl.operating.operatingProfitCY, pl.operating.operatingProfitPY],
      [],
      ['II. INVESTING CATEGORY', '', '', ''],
      ['   Interest Income from Investments and Deposits', '25', pl.investing.invInterest ? pl.investing.invInterest.cy : 0, pl.investing.invInterest ? pl.investing.invInterest.py : 0],
      ['   Dividend Income', '25.1', pl.investing.invDiv ? pl.investing.invDiv.cy : 0, pl.investing.invDiv ? pl.investing.invDiv.py : 0],
      ['   Net Gain / (Loss) on Financial Assets at FVTPL', '25.2', pl.investing.invGain ? pl.investing.invGain.cy : 0, pl.investing.invGain ? pl.investing.invGain.py : 0],
      ['   Income from Investment Property', '25.3', pl.investing.invProp ? pl.investing.invProp.cy : 0, pl.investing.invProp ? pl.investing.invProp.py : 0],
      ['   Share of Profit / (Loss) of Associates & Joint Ventures', '25.4', pl.investing.equityMethod ? pl.investing.equityMethod.cy : 0, pl.investing.equityMethod ? pl.investing.equityMethod.py : 0],
      ['   TOTAL INVESTING INCOME / (LOSS) (II)', '', pl.investing.totalInvestingCY, pl.investing.totalInvestingPY],
      [],
      ['III. PROFIT OR LOSS BEFORE FINANCING & TAX (I + II) [MANDATORY SUBTOTAL]', '', pl.pbitCY, pl.pbitPY],
      [],
      ['IV. FINANCING CATEGORY', '', '', ''],
      ['   Interest Expense on Borrowings', '26', pl.financing.finBorrow ? pl.financing.finBorrow.cy : 0, pl.financing.finBorrow ? pl.financing.finBorrow.py : 0],
      ['   Interest Expense on Lease Liabilities (Ind AS 116)', '26.1', pl.financing.finLease.cy, pl.financing.finLease.py],
      ['   Other Finance Costs & Unwinding of Discount', '26.2', pl.financing.finOther.cy, pl.financing.finOther.py],
      ['   TOTAL FINANCING COSTS (IV)', '', pl.financing.totalFinancingCY, pl.financing.totalFinancingPY],
      [],
      ['V. PROFIT OR LOSS BEFORE TAX (III - IV) [MANDATORY SUBTOTAL]', '', pl.pbtCY, pl.pbtPY],
      [],
      ['VI. INCOME TAX EXPENSE', '', '', ''],
      ['   Current Tax', '27', pl.tax.taxCurrent.cy, pl.tax.taxCurrent.py],
      ['   Deferred Tax', '27.1', pl.tax.taxDeferred.cy, pl.tax.taxDeferred.py],
      ['   TOTAL TAX EXPENSE (VI)', '', pl.tax.totalTaxCY, pl.tax.totalTaxPY],
      [],
      ['VII. PROFIT FOR THE PERIOD FROM CONTINUING OPERATIONS (V - VI)', '', pl.patContinuingCY, pl.patContinuingPY],
      ['VIII. Profit / (Loss) from Discontinued Operations (Net of Tax)', '28', pl.discOps.cy, pl.discOps.py],
      ['IX. PROFIT FOR THE PERIOD (VII + VIII)', '', pl.patCY, pl.patPY],
      [],
      ['X. OTHER COMPREHENSIVE INCOME (OCI)', '', '', ''],
      ['   Items that will not be reclassified to profit or loss', '29', pl.oci.ociNoReclass.cy, pl.oci.ociNoReclass.py],
      ['   Items that will be reclassified to profit or loss', '30', pl.oci.ociReclass.cy, pl.oci.ociReclass.py],
      ['   TOTAL OTHER COMPREHENSIVE INCOME (X)', '', pl.oci.totalOciCY, pl.oci.totalOciPY],
      [],
      ['XI. TOTAL COMPREHENSIVE INCOME FOR THE PERIOD (IX + X)', '', pl.totalCompIncomeCY, pl.totalCompIncomePY],
      [],
      ['DISCLOSURE: Management-defined Performance Measures (MPM)', '', '', ''],
      ['   Operating EBITDA (Operating Profit + Depr/Amort)', '', pl.mpm.operatingEbitdaCY, pl.mpm.operatingEbitdaPY]
    ];

    const plSheet = XLSX.utils.aoa_to_sheet(plRows);
    plSheet['!cols'] = [{ wch: 55 }, { wch: 12 }, { wch: 22 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, plSheet, 'Statement of Profit & Loss');

    // 2. STATEMENT OF FINANCIAL POSITION (BALANCE SHEET)
    const bsRows = [
      [company.name.toUpperCase()],
      [`CIN: ${company.cin || 'N/A'}`],
      ['STATEMENT OF FINANCIAL POSITION (BALANCE SHEET)'],
      [`(As at ${company.cyLabel} and ${company.pyLabel})`],
      [`Reporting Currency: INR (${company.scaleLabel || 'In Absolute Figures'})`],
      [],
      ['Particulars', 'Note No.', `As at ${company.cyLabel}`, `As at ${company.pyLabel}`],
      ['I. ASSETS', '', '', ''],
      ['(1) Non-Current Assets', '', '', ''],
      ['   (a) Property, Plant and Equipment', '1', bs.nonCurrentAssets.ppe.cy, bs.nonCurrentAssets.ppe.py],
      ['   (b) Capital Work-in-Progress', '1.1', bs.nonCurrentAssets.cwip.cy, bs.nonCurrentAssets.cwip.py],
      ['   (c) Investment Property', '2', bs.nonCurrentAssets.invProp.cy, bs.nonCurrentAssets.invProp.py],
      ['   (d) Right-of-Use Assets', '3', bs.nonCurrentAssets.rouAsset.cy, bs.nonCurrentAssets.rouAsset.py],
      ['   (e) Goodwill and Other Intangibles', '4', bs.nonCurrentAssets.intangible.cy, bs.nonCurrentAssets.intangible.py],
      ['   (f) Intangibles Under Development', '4.1', bs.nonCurrentAssets.intangibleDev.cy, bs.nonCurrentAssets.intangibleDev.py],
      ['   (g) Financial Assets:', '', '', ''],
      ['       (i) Investments', '5', bs.nonCurrentAssets.ncFinInv.cy, bs.nonCurrentAssets.ncFinInv.py],
      ['       (ii) Loans', '6', bs.nonCurrentAssets.ncFinLoans.cy, bs.nonCurrentAssets.ncFinLoans.py],
      ['       (iii) Other Financial Assets', '7', bs.nonCurrentAssets.ncFinOther.cy, bs.nonCurrentAssets.ncFinOther.py],
      ['   (h) Deferred Tax Assets (Net)', '8', bs.nonCurrentAssets.dta.cy, bs.nonCurrentAssets.dta.py],
      ['   (i) Non-Current Tax Assets (Net)', '9', bs.nonCurrentAssets.ncTaxAsset.cy, bs.nonCurrentAssets.ncTaxAsset.py],
      ['   (j) Other Non-Current Assets', '10', bs.nonCurrentAssets.otherNcAsset.cy, bs.nonCurrentAssets.otherNcAsset.py],
      ['   TOTAL NON-CURRENT ASSETS', '', bs.nonCurrentAssets.totalNonCurrentAssetsCY, bs.nonCurrentAssets.totalNonCurrentAssetsPY],
      [],
      ['(2) Current Assets', '', '', ''],
      ['   (a) Inventories', '11', bs.currentAssets.inventories.cy, bs.currentAssets.inventories.py],
      ['   (b) Financial Assets:', '', '', ''],
      ['       (i) Current Investments', '12', bs.currentAssets.curFinInv.cy, bs.currentAssets.curFinInv.py],
      ['       (ii) Trade Receivables', '13', bs.currentAssets.tradeRec.cy, bs.currentAssets.tradeRec.py],
      ['       (iii) Cash and Cash Equivalents', '14', bs.currentAssets.cashBank.cy, bs.currentAssets.cashBank.py],
      ['       (iv) Bank Balances other than Cash', '14.1', bs.currentAssets.otherBankBal.cy, bs.currentAssets.otherBankBal.py],
      ['       (v) Loans', '15', bs.currentAssets.curFinLoans.cy, bs.currentAssets.curFinLoans.py],
      ['       (vi) Other Financial Assets', '16', bs.currentAssets.curFinOther.cy, bs.currentAssets.curFinOther.py],
      ['   (c) Current Tax Assets (Net)', '17', bs.currentAssets.curTaxAsset.cy, bs.currentAssets.curTaxAsset.py],
      ['   (d) Other Current Assets', '17.1', bs.currentAssets.otherCurAsset.cy, bs.currentAssets.otherCurAsset.py],
      ['   TOTAL CURRENT ASSETS', '', bs.currentAssets.totalCurrentAssetsCY, bs.currentAssets.totalCurrentAssetsPY],
      [],
      ['TOTAL ASSETS', '', bs.totalAssetsCY, bs.totalAssetsPY],
      [],
      ['II. EQUITY AND LIABILITIES', '', '', ''],
      ['(1) Equity', '', '', ''],
      ['   (a) Equity Share Capital', '31', bs.equity.equityCap.cy, bs.equity.equityCap.py],
      ['   (b) Other Equity', '32', bs.equity.otherEquity.cy, bs.equity.otherEquity.py],
      ['   TOTAL EQUITY', '', bs.equity.totalEquityCY, bs.equity.totalEquityPY],
      [],
      ['(2) Non-Current Liabilities', '', '', ''],
      ['   (a) Financial Liabilities:', '', '', ''],
      ['       (i) Borrowings', '33', bs.nonCurrentLiabilities.ncBorrow.cy, bs.nonCurrentLiabilities.ncBorrow.py],
      ['       (ii) Lease Liabilities', '34', bs.nonCurrentLiabilities.ncLeaseLiab.cy, bs.nonCurrentLiabilities.ncLeaseLiab.py],
      ['       (iii) Other Financial Liabilities', '35', bs.nonCurrentLiabilities.ncFinOther.cy, bs.nonCurrentLiabilities.ncFinOther.py],
      ['   (b) Provisions', '36', bs.nonCurrentLiabilities.ncProv.cy, bs.nonCurrentLiabilities.ncProv.py],
      ['   (c) Deferred Tax Liabilities (Net)', '37', bs.nonCurrentLiabilities.dtl.cy, bs.nonCurrentLiabilities.dtl.py],
      ['   (d) Other Non-Current Liabilities', '38', bs.nonCurrentLiabilities.otherNcLiab.cy, bs.nonCurrentLiabilities.otherNcLiab.py],
      ['   TOTAL NON-CURRENT LIABILITIES', '', bs.nonCurrentLiabilities.totalNonCurrentLiabCY, bs.nonCurrentLiabilities.totalNonCurrentLiabPY],
      [],
      ['(3) Current Liabilities', '', '', ''],
      ['   (a) Financial Liabilities:', '', '', ''],
      ['       (i) Borrowings', '39', bs.currentLiabilities.curBorrow.cy, bs.currentLiabilities.curBorrow.py],
      ['       (ii) Lease Liabilities', '40', bs.currentLiabilities.curLeaseLiab.cy, bs.currentLiabilities.curLeaseLiab.py],
      ['       (iii) Trade Payables:', '', '', ''],
      ['           - Micro and Small Enterprises (MSME)', '41', bs.currentLiabilities.tradePayMsme.cy, bs.currentLiabilities.tradePayMsme.py],
      ['           - Other than MSME', '41.1', bs.currentLiabilities.tradePayOther.cy, bs.currentLiabilities.tradePayOther.py],
      ['       (iv) Other Financial Liabilities', '42', bs.currentLiabilities.curFinOther.cy, bs.currentLiabilities.curFinOther.py],
      ['   (b) Other Current Liabilities', '43', bs.currentLiabilities.otherCurLiab.cy, bs.currentLiabilities.otherCurLiab.py],
      ['   (c) Provisions', '44', bs.currentLiabilities.curProv.cy, bs.currentLiabilities.curProv.py],
      ['   (d) Current Tax Liabilities (Net)', '45', bs.currentLiabilities.curTaxLiab.cy, bs.currentLiabilities.curTaxLiab.py],
      ['   TOTAL CURRENT LIABILITIES', '', bs.currentLiabilities.totalCurrentLiabCY, bs.currentLiabilities.totalCurrentLiabPY],
      [],
      ['TOTAL LIABILITIES', '', bs.totalLiabilitiesCY, bs.totalLiabilitiesPY],
      ['TOTAL EQUITY AND LIABILITIES', '', bs.totalEquityAndLiabilitiesCY, bs.totalEquityAndLiabilitiesPY]
    ];

    const bsSheet = XLSX.utils.aoa_to_sheet(bsRows);
    bsSheet['!cols'] = [{ wch: 55 }, { wch: 12 }, { wch: 22 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, bsSheet, 'Balance Sheet');

    // 3. SUPPORTING SCHEDULES (DRILL-DOWN) SHEET
    const scheduleRows = [
      ['SUPPORTING SCHEDULES & CONSTITUENT LEDGER BREAKDOWN'],
      [`Company: ${company.name}`],
      [],
      ['Schedule Note', 'Line Item Name', 'Ledger Code', 'Ledger Name', `CY Balance (${company.cyLabel})`, `PY Balance (${company.pyLabel})`, 'User Notes']
    ];

    for (const [code, item] of Object.entries(aggregated)) {
      if (!item.ledgers || item.ledgers.length === 0) continue;

      scheduleRows.push([item.scheduleNote || code, item.name, '', '', item.cyAmount, item.pyAmount, 'TOTAL']);

      item.ledgers.forEach(l => {
        scheduleRows.push([
          '',
          '',
          l.code,
          l.name,
          l.cyCalculated,
          l.pyCalculated,
          l.isCustomOverride ? 'Manual CA Override' : ''
        ]);
      });
      scheduleRows.push([]); // blank separator
    }

    const schedSheet = XLSX.utils.aoa_to_sheet(scheduleRows);
    schedSheet['!cols'] = [{ wch: 16 }, { wch: 40 }, { wch: 14 }, { wch: 45 }, { wch: 20 }, { wch: 20 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, schedSheet, 'Supporting Schedules');

    // 4. MAPPED TRIAL BALANCE & AUDIT TRAIL
    const tbRows = [
      ['FULL MAPPED TRIAL BALANCE WITH IND AS 118 CLASSIFICATION'],
      [`Exported from Smit FinStat PRO on ${new Date().toLocaleString()}`],
      [],
      ['Ledger Code', 'Ledger Name', 'CY Debit', 'CY Credit', 'CY Net (Dr-Cr)', 'PY Debit', 'PY Credit', 'PY Net (Dr-Cr)', 'Ind AS 118 Line Item', 'Confidence', 'Manual Override', 'CA Notes']
    ];

    reportData.ledgers.forEach(l => {
      tbRows.push([
        l.code,
        l.name,
        l.debitCY,
        l.creditCY,
        l.netCY,
        l.debitPY,
        l.creditPY,
        l.netPY,
        l.lineItemCode,
        l.confidence + '%',
        l.isCustomOverride ? 'YES' : 'NO',
        l.userNotes || ''
      ]);
    });

    const tbSheet = XLSX.utils.aoa_to_sheet(tbRows);
    tbSheet['!cols'] = [{ wch: 14 }, { wch: 42 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 24 }, { wch: 12 }, { wch: 16 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, tbSheet, 'Mapped Trial Balance');

    // 5. AUDIT & VALIDATION REPORT
    const auditRows = [
      ['CA VALIDATION & RECONCILIATION AUDIT TRAIL'],
      [],
      ['Check Category', 'Test Description', 'Status', 'Audit Findings & Figures']
    ];

    if (reportData.audit && reportData.audit.checks) {
      reportData.audit.checks.forEach(c => {
        auditRows.push([c.category, c.test, c.status, c.detail]);
      });
    }

    auditRows.push([]);
    auditRows.push(['ANOMALY & WARNING FLAGS']);
    auditRows.push(['Type', 'Severity', 'Ledger Code', 'Ledger Name', 'Flag Details']);

    if (reportData.audit && reportData.audit.warnings) {
      reportData.audit.warnings.forEach(w => {
        auditRows.push([w.type, w.severity, w.code, w.ledger, w.issue]);
      });
    }

    const auditSheet = XLSX.utils.aoa_to_sheet(auditRows);
    auditSheet['!cols'] = [{ wch: 25 }, { wch: 40 }, { wch: 12 }, { wch: 60 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, auditSheet, 'Audit Report');

    // Trigger Download
    const fileName = `${(company.name || 'Financial_Statements').replace(/[^a-z0-9]/gi, '_')}_IndAS118_FY${new Date().getFullYear()}.xlsx`;
    XLSX.writeFile(wb, fileName);
  },

  /**
   * Export PDF using jsPDF and autoTable
   */
  exportToPDF(reportData, companyInfo) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert('jsPDF library is not loaded. You can use Printable HTML as an instant alternative.');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    const company = companyInfo || { name: 'ABC ENTERPRISES LIMITED', cin: 'L12345MH2010PLC123456', cyLabel: '31st March 2026', pyLabel: '31st March 2025' };
    const pl = reportData.pl;
    const bs = reportData.bs;

    // Header generator helper
    const addHeader = (title) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(20, 35, 60);
      doc.text(company.name.toUpperCase(), 297, 40, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(90, 100, 115);
      doc.text(`CIN: ${company.cin || 'N/A'} | Ind AS 118 Financial Statements`, 297, 54, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text(title, 297, 70, { align: 'center' });

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`(Figures in INR - ${company.scaleLabel || 'Absolute'} | Main Business Activity: ${company.mbaLabel || 'Standard'})`, 297, 82, { align: 'center' });
    };

    // PAGE 1: STATEMENT OF PROFIT AND LOSS
    addHeader('STATEMENT OF PROFIT AND LOSS UNDER IND AS 118');

    const plTableData = [
      [{ content: 'I. OPERATING CATEGORY', colSpan: 4, styles: { fontStyle: 'bold', fillColor: [240, 244, 248] } }],
      ['Revenue from Operations', '18', FinStatEngine.formatNumber(pl.operating.revOps.cy), FinStatEngine.formatNumber(pl.operating.revOps.py)],
      ['Other Operating Revenue', '18.1', FinStatEngine.formatNumber(pl.operating.revOtherOp.cy), FinStatEngine.formatNumber(pl.operating.revOtherOp.py)],
      [{ content: 'TOTAL OPERATING REVENUE (A)', styles: { fontStyle: 'bold' } }, '', FinStatEngine.formatNumber(pl.operating.totalOpRevenueCY), FinStatEngine.formatNumber(pl.operating.totalOpRevenuePY)],
      ['Cost of Materials Consumed', '19', FinStatEngine.formatNumber(pl.operating.costMat.cy), FinStatEngine.formatNumber(pl.operating.costMat.py)],
      ['Purchases of Stock-in-Trade', '20', FinStatEngine.formatNumber(pl.operating.purchStock.cy), FinStatEngine.formatNumber(pl.operating.purchStock.py)],
      ['Changes in Inventories of FG, WIP & Traded Goods', '21', FinStatEngine.formatNumber(pl.operating.chgInv.cy), FinStatEngine.formatNumber(pl.operating.chgInv.py)],
      ['Employee Benefits Expense', '22', FinStatEngine.formatNumber(pl.operating.empBen.cy), FinStatEngine.formatNumber(pl.operating.empBen.py)],
      ['Depreciation and Amortisation Expense', '23', FinStatEngine.formatNumber(pl.operating.depAmort.cy), FinStatEngine.formatNumber(pl.operating.depAmort.py)],
      ['Other Operating Expenses', '24', FinStatEngine.formatNumber(pl.operating.otherOpExp.cy), FinStatEngine.formatNumber(pl.operating.otherOpExp.py)],
      [{ content: 'TOTAL OPERATING EXPENSES (B)', styles: { fontStyle: 'bold' } }, '', FinStatEngine.formatNumber(pl.operating.totalOpExpensesCY), FinStatEngine.formatNumber(pl.operating.totalOpExpensesPY)],
      [{ content: 'OPERATING PROFIT OR LOSS (I = A - B)', styles: { fontStyle: 'bold', fillColor: [224, 238, 255] } }, '', FinStatEngine.formatNumber(pl.operating.operatingProfitCY), FinStatEngine.formatNumber(pl.operating.operatingProfitPY)],

      [{ content: 'II. INVESTING CATEGORY', colSpan: 4, styles: { fontStyle: 'bold', fillColor: [240, 244, 248] } }],
      ['Interest Income from Investments and Deposits', '25', FinStatEngine.formatNumber(pl.investing.invInterest ? pl.investing.invInterest.cy : 0), FinStatEngine.formatNumber(pl.investing.invInterest ? pl.investing.invInterest.py : 0)],
      ['Dividend & Net Gain on Financial Instruments', '25.1', FinStatEngine.formatNumber((pl.investing.invDiv ? pl.investing.invDiv.cy : 0) + (pl.investing.invGain ? pl.investing.invGain.cy : 0)), FinStatEngine.formatNumber((pl.investing.invDiv ? pl.investing.invDiv.py : 0) + (pl.investing.invGain ? pl.investing.invGain.py : 0))],
      ['Share of Profit of Associates / Joint Ventures', '25.4', FinStatEngine.formatNumber(pl.investing.equityMethod ? pl.investing.equityMethod.cy : 0), FinStatEngine.formatNumber(pl.investing.equityMethod ? pl.investing.equityMethod.py : 0)],
      [{ content: 'TOTAL INVESTING INCOME / (LOSS) (II)', styles: { fontStyle: 'bold' } }, '', FinStatEngine.formatNumber(pl.investing.totalInvestingCY), FinStatEngine.formatNumber(pl.investing.totalInvestingPY)],
      [{ content: 'PROFIT BEFORE FINANCING & TAX (I + II)', styles: { fontStyle: 'bold', fillColor: [230, 240, 255] } }, '', FinStatEngine.formatNumber(pl.pbitCY), FinStatEngine.formatNumber(pl.pbitPY)],

      [{ content: 'III. FINANCING CATEGORY', colSpan: 4, styles: { fontStyle: 'bold', fillColor: [240, 244, 248] } }],
      ['Interest Expense on Borrowings', '26', FinStatEngine.formatNumber(pl.financing.finBorrow ? pl.financing.finBorrow.cy : 0), FinStatEngine.formatNumber(pl.financing.finBorrow ? pl.financing.finBorrow.py : 0)],
      ['Interest on Lease Liabilities (Ind AS 116) & Other Costs', '26.1', FinStatEngine.formatNumber(pl.financing.finLease.cy + pl.financing.finOther.cy), FinStatEngine.formatNumber(pl.financing.finLease.py + pl.financing.finOther.py)],
      [{ content: 'TOTAL FINANCING COSTS (III)', styles: { fontStyle: 'bold' } }, '', FinStatEngine.formatNumber(pl.financing.totalFinancingCY), FinStatEngine.formatNumber(pl.financing.totalFinancingPY)],
      [{ content: 'PROFIT BEFORE TAX (PBT)', styles: { fontStyle: 'bold', fillColor: [224, 238, 255] } }, '', FinStatEngine.formatNumber(pl.pbtCY), FinStatEngine.formatNumber(pl.pbtPY)],

      [{ content: 'IV. TAX EXPENSE & DISCONTINUED OPERATIONS', colSpan: 4, styles: { fontStyle: 'bold', fillColor: [240, 244, 248] } }],
      ['Current Tax & Deferred Tax', '27', FinStatEngine.formatNumber(pl.tax.totalTaxCY), FinStatEngine.formatNumber(pl.tax.totalTaxPY)],
      ['Discontinued Operations (Net of Tax)', '28', FinStatEngine.formatNumber(pl.discOps.cy), FinStatEngine.formatNumber(pl.discOps.py)],
      [{ content: 'PROFIT FOR THE PERIOD (PAT)', styles: { fontStyle: 'bold', fillColor: [209, 250, 229] } }, '', FinStatEngine.formatNumber(pl.patCY), FinStatEngine.formatNumber(pl.patPY)],
      ['Other Comprehensive Income (OCI)', '29/30', FinStatEngine.formatNumber(pl.oci.totalOciCY), FinStatEngine.formatNumber(pl.oci.totalOciPY)],
      [{ content: 'TOTAL COMPREHENSIVE INCOME FOR THE PERIOD', styles: { fontStyle: 'bold', fillColor: [187, 247, 208] } }, '', FinStatEngine.formatNumber(pl.totalCompIncomeCY), FinStatEngine.formatNumber(pl.totalCompIncomePY)]
    ];

    doc.autoTable({
      startY: 95,
      head: [['Particulars', 'Note', `FY ${company.cyLabel}`, `FY ${company.pyLabel}`]],
      body: plTableData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3.5, textColor: [30, 41, 59] },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 260 },
        1: { cellWidth: 40, halign: 'center' },
        2: { cellWidth: 110, halign: 'right' },
        3: { cellWidth: 110, halign: 'right' }
      }
    });

    // PAGE 2: BALANCE SHEET
    doc.addPage();
    addHeader('STATEMENT OF FINANCIAL POSITION (BALANCE SHEET)');

    const bsTableData = [
      [{ content: 'I. ASSETS', colSpan: 4, styles: { fontStyle: 'bold', fillColor: [240, 244, 248] } }],
      [{ content: '1. Non-Current Assets', colSpan: 4, styles: { fontStyle: 'bold' } }],
      ['   Property, Plant & Equipment & CWIP', '1 / 1.1', FinStatEngine.formatNumber(bs.nonCurrentAssets.ppe.cy + bs.nonCurrentAssets.cwip.cy), FinStatEngine.formatNumber(bs.nonCurrentAssets.ppe.py + bs.nonCurrentAssets.cwip.py)],
      ['   Right-of-Use Assets & Investment Property', '2 / 3', FinStatEngine.formatNumber(bs.nonCurrentAssets.rouAsset.cy + bs.nonCurrentAssets.invProp.cy), FinStatEngine.formatNumber(bs.nonCurrentAssets.rouAsset.py + bs.nonCurrentAssets.invProp.py)],
      ['   Goodwill & Other Intangibles', '4', FinStatEngine.formatNumber(bs.nonCurrentAssets.intangible.cy), FinStatEngine.formatNumber(bs.nonCurrentAssets.intangible.py)],
      ['   Non-Current Financial Assets (Investments & Loans)', '5-7', FinStatEngine.formatNumber(bs.nonCurrentAssets.ncFinInv.cy + bs.nonCurrentAssets.ncFinLoans.cy + bs.nonCurrentAssets.ncFinOther.cy), FinStatEngine.formatNumber(bs.nonCurrentAssets.ncFinInv.py + bs.nonCurrentAssets.ncFinLoans.py + bs.nonCurrentAssets.ncFinOther.py)],
      ['   Deferred Tax Assets (Net) & Other Non-Current Assets', '8-10', FinStatEngine.formatNumber(bs.nonCurrentAssets.dta.cy + bs.nonCurrentAssets.ncTaxAsset.cy + bs.nonCurrentAssets.otherNcAsset.cy), FinStatEngine.formatNumber(bs.nonCurrentAssets.dta.py + bs.nonCurrentAssets.ncTaxAsset.py + bs.nonCurrentAssets.otherNcAsset.py)],
      [{ content: 'TOTAL NON-CURRENT ASSETS', styles: { fontStyle: 'bold' } }, '', FinStatEngine.formatNumber(bs.nonCurrentAssets.totalNonCurrentAssetsCY), FinStatEngine.formatNumber(bs.nonCurrentAssets.totalNonCurrentAssetsPY)],

      [{ content: '2. Current Assets', colSpan: 4, styles: { fontStyle: 'bold' } }],
      ['   Inventories', '11', FinStatEngine.formatNumber(bs.currentAssets.inventories.cy), FinStatEngine.formatNumber(bs.currentAssets.inventories.py)],
      ['   Current Financial Assets - Investments & Loans', '12/15', FinStatEngine.formatNumber(bs.currentAssets.curFinInv.cy + bs.currentAssets.curFinLoans.cy), FinStatEngine.formatNumber(bs.currentAssets.curFinInv.py + bs.currentAssets.curFinLoans.py)],
      ['   Trade Receivables', '13', FinStatEngine.formatNumber(bs.currentAssets.tradeRec.cy), FinStatEngine.formatNumber(bs.currentAssets.tradeRec.py)],
      ['   Cash and Cash Equivalents & Other Bank Balances', '14', FinStatEngine.formatNumber(bs.currentAssets.cashBank.cy + bs.currentAssets.otherBankBal.cy), FinStatEngine.formatNumber(bs.currentAssets.cashBank.py + bs.currentAssets.otherBankBal.py)],
      ['   Other Current Assets & Tax Assets', '16-17', FinStatEngine.formatNumber(bs.currentAssets.curFinOther.cy + bs.currentAssets.curTaxAsset.cy + bs.currentAssets.otherCurAsset.cy), FinStatEngine.formatNumber(bs.currentAssets.curFinOther.py + bs.currentAssets.curTaxAsset.py + bs.currentAssets.otherCurAsset.py)],
      [{ content: 'TOTAL CURRENT ASSETS', styles: { fontStyle: 'bold' } }, '', FinStatEngine.formatNumber(bs.currentAssets.totalCurrentAssetsCY), FinStatEngine.formatNumber(bs.currentAssets.totalCurrentAssetsPY)],
      [{ content: 'TOTAL ASSETS', styles: { fontStyle: 'bold', fillColor: [224, 238, 255] } }, '', FinStatEngine.formatNumber(bs.totalAssetsCY), FinStatEngine.formatNumber(bs.totalAssetsPY)],

      [{ content: 'II. EQUITY AND LIABILITIES', colSpan: 4, styles: { fontStyle: 'bold', fillColor: [240, 244, 248] } }],
      [{ content: '1. Equity', colSpan: 4, styles: { fontStyle: 'bold' } }],
      ['   Equity Share Capital', '31', FinStatEngine.formatNumber(bs.equity.equityCap.cy), FinStatEngine.formatNumber(bs.equity.equityCap.py)],
      ['   Other Equity', '32', FinStatEngine.formatNumber(bs.equity.otherEquity.cy), FinStatEngine.formatNumber(bs.equity.otherEquity.py)],
      [{ content: 'TOTAL EQUITY', styles: { fontStyle: 'bold' } }, '', FinStatEngine.formatNumber(bs.equity.totalEquityCY), FinStatEngine.formatNumber(bs.equity.totalEquityPY)],

      [{ content: '2. Non-Current Liabilities', colSpan: 4, styles: { fontStyle: 'bold' } }],
      ['   Borrowings & Lease Liabilities', '33-34', FinStatEngine.formatNumber(bs.nonCurrentLiabilities.ncBorrow.cy + bs.nonCurrentLiabilities.ncLeaseLiab.cy), FinStatEngine.formatNumber(bs.nonCurrentLiabilities.ncBorrow.py + bs.nonCurrentLiabilities.ncLeaseLiab.py)],
      ['   Provisions, DTL & Other Non-Current Liabilities', '35-38', FinStatEngine.formatNumber(bs.nonCurrentLiabilities.ncProv.cy + bs.nonCurrentLiabilities.dtl.cy + bs.nonCurrentLiabilities.ncFinOther.cy + bs.nonCurrentLiabilities.otherNcLiab.cy), FinStatEngine.formatNumber(bs.nonCurrentLiabilities.ncProv.py + bs.nonCurrentLiabilities.dtl.py + bs.nonCurrentLiabilities.ncFinOther.py + bs.nonCurrentLiabilities.otherNcLiab.py)],
      [{ content: 'TOTAL NON-CURRENT LIABILITIES', styles: { fontStyle: 'bold' } }, '', FinStatEngine.formatNumber(bs.nonCurrentLiabilities.totalNonCurrentLiabCY), FinStatEngine.formatNumber(bs.nonCurrentLiabilities.totalNonCurrentLiabPY)],

      [{ content: '3. Current Liabilities', colSpan: 4, styles: { fontStyle: 'bold' } }],
      ['   Borrowings & Lease Liabilities (Current)', '39-40', FinStatEngine.formatNumber(bs.currentLiabilities.curBorrow.cy + bs.currentLiabilities.curLeaseLiab.cy), FinStatEngine.formatNumber(bs.currentLiabilities.curBorrow.py + bs.currentLiabilities.curLeaseLiab.py)],
      ['   Trade Payables - MSME & Other', '41', FinStatEngine.formatNumber(bs.currentLiabilities.tradePayMsme.cy + bs.currentLiabilities.tradePayOther.cy), FinStatEngine.formatNumber(bs.currentLiabilities.tradePayMsme.py + bs.currentLiabilities.tradePayOther.py)],
      ['   Other Financial Liabilities, Current Tax & Provisions', '42-45', FinStatEngine.formatNumber(bs.currentLiabilities.curFinOther.cy + bs.currentLiabilities.otherCurLiab.cy + bs.currentLiabilities.curProv.cy + bs.currentLiabilities.curTaxLiab.cy), FinStatEngine.formatNumber(bs.currentLiabilities.curFinOther.py + bs.currentLiabilities.otherCurLiab.py + bs.currentLiabilities.curProv.py + bs.currentLiabilities.curTaxLiab.py)],
      [{ content: 'TOTAL CURRENT LIABILITIES', styles: { fontStyle: 'bold' } }, '', FinStatEngine.formatNumber(bs.currentLiabilities.totalCurrentLiabCY), FinStatEngine.formatNumber(bs.currentLiabilities.totalCurrentLiabPY)],
      [{ content: 'TOTAL EQUITY AND LIABILITIES', styles: { fontStyle: 'bold', fillColor: [224, 238, 255] } }, '', FinStatEngine.formatNumber(bs.totalEquityAndLiabilitiesCY), FinStatEngine.formatNumber(bs.totalEquityAndLiabilitiesPY)]
    ];

    doc.autoTable({
      startY: 95,
      head: [['Particulars', 'Note', `As at ${company.cyLabel}`, `As at ${company.pyLabel}`]],
      body: bsTableData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3.5, textColor: [30, 41, 59] },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 260 },
        1: { cellWidth: 40, halign: 'center' },
        2: { cellWidth: 110, halign: 'right' },
        3: { cellWidth: 110, halign: 'right' }
      }
    });

    // Add Signature Blocks at the bottom of Page 2
    const finalY = doc.lastAutoTable.finalY || 680;
    if (finalY < 720) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(50, 60, 70);
      doc.text('For and on behalf of the Board of Directors', 40, finalY + 30);
      doc.text('As per our report of even date attached', 360, finalY + 30);
      doc.setFont('helvetica', 'bold');
      doc.text('Managing Director / Director', 40, finalY + 65);
      doc.text('Chief Financial Officer', 200, finalY + 65);
      doc.text('For Chartered Accountants (Statutory Auditors)', 360, finalY + 65);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.text('DIN: 01234567', 40, finalY + 75);
      doc.text('Membership No: 000000 | UDIN: 26118XXXXXXXX', 360, finalY + 75);
    }

    const pdfFileName = `${(company.name || 'Financial_Statements').replace(/[^a-z0-9]/gi, '_')}_IndAS118.pdf`;
    doc.save(pdfFileName);
  },

  /**
   * Export Mapped Trial Balance as CSV
   */
  exportToCSV(reportData, companyInfo) {
    const headers = [
      'Ledger Code', 'Ledger Name', 'CY Debit', 'CY Credit', 'CY Net Balance',
      'PY Debit', 'PY Credit', 'PY Net Balance', 'Ind AS 118 Line Item',
      'Confidence %', 'Manual CA Override', 'CA Notes'
    ];

    const rows = reportData.ledgers.map(l => [
      `"${l.code}"`,
      `"${l.name.replace(/"/g, '""')}"`,
      l.debitCY,
      l.creditCY,
      l.netCY,
      l.debitPY,
      l.creditPY,
      l.netPY,
      `"${l.lineItemCode}"`,
      l.confidence,
      l.isCustomOverride ? 'YES' : 'NO',
      `"${(l.userNotes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${(companyInfo.name || 'TB').replace(/[^a-z0-9]/gi, '_')}_Mapped_Trial_Balance.csv`;
    link.click();
  }
};

if (typeof window !== 'undefined') {
  window.FinStatExporter = FinStatExporter;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FinStatExporter;
}
