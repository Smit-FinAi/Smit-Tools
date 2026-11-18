/**
 * Smit FinStat PRO - Ind AS 118 Financial Reporting Engine
 * Computes Statement of Profit and Loss, Balance Sheet, SOCIE,
 * Supporting Schedules, MPMs, and CA Validations.
 */

const FinStatEngine = {
  /**
   * Aggregate ledgers by Ind AS 118 Line Item Code
   */
  aggregateByLineItem(ledgers) {
    const summary = {};

    // Initialize all line items from taxonomy
    for (const [code, item] of Object.entries(IndAS118Rules.LINE_ITEMS)) {
      summary[code] = {
        code: code,
        name: item.name,
        statement: item.statement,
        category: item.category,
        scheduleNote: item.scheduleNote,
        normalBalance: item.normalBalance,
        cyAmount: 0,
        pyAmount: 0,
        ledgers: []
      };
    }

    if (!Array.isArray(ledgers)) return summary;

    ledgers.forEach(l => {
      const code = l.lineItemCode && summary[l.lineItemCode] ? l.lineItemCode : 'OTHER_OP_EXP';
      const itemMeta = summary[code];

      let cyVal = 0;
      let pyVal = 0;

      if (itemMeta.normalBalance === 'CREDIT') {
        // Net is Debit - Credit. If credit is higher, net is negative. So -netCY gives positive credit amount.
        cyVal = -(l.netCY || 0);
        pyVal = -(l.netPY || 0);
      } else {
        // Debit normal balance
        cyVal = l.netCY || 0;
        pyVal = l.netPY || 0;
      }

      itemMeta.cyAmount += cyVal;
      itemMeta.pyAmount += pyVal;
      itemMeta.ledgers.push({
        id: l.id,
        code: l.code,
        name: l.name,
        netCY: l.netCY || 0,
        netPY: l.netPY || 0,
        cyCalculated: cyVal,
        pyCalculated: pyVal,
        isCustomOverride: !!l.isCustomOverride,
        userNotes: l.userNotes || ''
      });
    });

    return summary;
  },

  /**
   * Generate Statement of Profit and Loss under Ind AS 118
   */
  generateStatementOfPL(aggregated, businessActivity = 'STANDARD') {
    const getVal = (code) => {
      const item = aggregated && aggregated[code];
      return item ? { cy: item.cyAmount || 0, py: item.pyAmount || 0 } : { cy: 0, py: 0 };
    };

    // Main Business Activity adaptations
    const isLending = businessActivity === 'FINANCING';
    const isInvesting = businessActivity === 'INVESTING';

    // 1. OPERATING CATEGORY
    const revOps = getVal('REV_OPS');
    const revOtherOp = getVal('REV_OTHER_OP');

    let totalOpRevenueCY = revOps.cy + revOtherOp.cy;
    let totalOpRevenuePY = revOps.py + revOtherOp.py;

    // Operating expenses
    const costMat = getVal('COST_MAT');
    const purchStock = getVal('PURCH_STOCK');
    const chgInv = getVal('CHG_INV');
    const empBen = getVal('EMP_BEN');
    const depAmort = getVal('DEP_AMORT');
    const otherOpExp = getVal('OTHER_OP_EXP');

    let totalOpExpensesCY = costMat.cy + purchStock.cy + chgInv.cy + empBen.cy + depAmort.cy + otherOpExp.cy;
    let totalOpExpensesPY = costMat.py + purchStock.py + chgInv.py + empBen.py + depAmort.py + otherOpExp.py;

    // Special MBA additions to Operating:
    const invInterest = getVal('INV_INTEREST');
    const finBorrow = getVal('FIN_COST_BORROW');
    const invDiv = getVal('INV_DIVIDEND');
    const invGain = getVal('INV_GAIN_LOSS');
    const invProp = getVal('INV_PROP_INC');

    let mbaOpAdditionsCY = 0;
    let mbaOpAdditionsPY = 0;
    let mbaOpDeductionsCY = 0;
    let mbaOpDeductionsPY = 0;

    if (isLending) {
      // Interest income is operating
      mbaOpAdditionsCY += invInterest.cy;
      mbaOpAdditionsPY += invInterest.py;
      totalOpRevenueCY += invInterest.cy;
      // Borrowing cost is operating expense for lending
      mbaOpDeductionsCY += finBorrow.cy;
      mbaOpDeductionsPY += finBorrow.py;
      totalOpExpensesCY += finBorrow.cy;
    } else if (isInvesting) {
      // Investment returns are operating
      const totalInvReturnCY = invInterest.cy + invDiv.cy + invGain.cy + invProp.cy;
      const totalInvReturnPY = invInterest.py + invDiv.py + invGain.py + invProp.py;
      mbaOpAdditionsCY += totalInvReturnCY;
      mbaOpAdditionsPY += totalInvReturnPY;
      totalOpRevenueCY += totalInvReturnCY;
    }

    // MANDATORY SUBTOTAL 1: OPERATING PROFIT OR LOSS
    const operatingProfitCY = totalOpRevenueCY - totalOpExpensesCY;
    const operatingProfitPY = totalOpRevenuePY - totalOpExpensesPY;

    // 2. INVESTING CATEGORY
    let totalInvestingCY = 0;
    let totalInvestingPY = 0;
    const equityMethod = getVal('EQUITY_METHOD_PL');

    if (!isInvesting) {
      if (!isLending) {
        totalInvestingCY += invInterest.cy;
        totalInvestingPY += invInterest.py;
      }
      totalInvestingCY += invDiv.cy + invGain.cy + invProp.cy + equityMethod.cy;
      totalInvestingPY += invDiv.py + invGain.py + invProp.py + equityMethod.py;
    } else {
      totalInvestingCY = equityMethod.cy;
      totalInvestingPY = equityMethod.py;
    }

    // MANDATORY SUBTOTAL 2: PROFIT OR LOSS BEFORE FINANCING AND INCOME TAXES
    const pbitCY = operatingProfitCY + totalInvestingCY;
    const pbitPY = operatingProfitPY + totalInvestingPY;

    // 3. FINANCING CATEGORY
    const finLease = getVal('FIN_COST_LEASE');
    const finOther = getVal('FIN_OTHER');

    let totalFinancingCY = finLease.cy + finOther.cy;
    let totalFinancingPY = finLease.py + finOther.py;

    if (!isLending) {
      totalFinancingCY += finBorrow.cy;
      totalFinancingPY += finBorrow.py;
    }

    // MANDATORY SUBTOTAL 3: PROFIT OR LOSS BEFORE INCOME TAXES
    const pbtCY = pbitCY - totalFinancingCY;
    const pbtPY = pbitPY - totalFinancingPY;

    // 4. INCOME TAX EXPENSE
    const taxCurrent = getVal('TAX_CURRENT');
    const taxDeferred = getVal('TAX_DEFERRED');
    const totalTaxCY = taxCurrent.cy + taxDeferred.cy;
    const totalTaxPY = taxCurrent.py + taxDeferred.py;

    // PROFIT OR LOSS FROM CONTINUING OPERATIONS
    const patContinuingCY = pbtCY - totalTaxCY;
    const patContinuingPY = pbtPY - totalTaxPY;

    // 5. DISCONTINUED OPERATIONS
    const discOps = getVal('DISC_OPS');
    const patCY = patContinuingCY + discOps.cy;
    const patPY = patContinuingPY + discOps.py;

    // 6. OTHER COMPREHENSIVE INCOME (OCI)
    const ociNoReclass = getVal('OCI_NO_RECLASS');
    const ociReclass = getVal('OCI_RECLASS');
    const totalOciCY = ociNoReclass.cy + ociReclass.cy;
    const totalOciPY = ociNoReclass.py + ociReclass.py;

    // TOTAL COMPREHENSIVE INCOME
    const totalCompIncomeCY = patCY + totalOciCY;
    const totalCompIncomePY = patPY + totalOciPY;

    // Management-defined Performance Measures (MPMs) under Ind AS 118
    const operatingEbitdaCY = operatingProfitCY + depAmort.cy;
    const operatingEbitdaPY = operatingProfitPY + depAmort.py;

    return {
      operating: {
        revOps,
        revOtherOp,
        totalOpRevenueCY,
        totalOpRevenuePY,
        costMat,
        purchStock,
        chgInv,
        empBen,
        depAmort,
        otherOpExp,
        mbaOpAdditionsCY,
        mbaOpAdditionsPY,
        mbaOpDeductionsCY,
        mbaOpDeductionsPY,
        totalOpExpensesCY,
        totalOpExpensesPY,
        operatingProfitCY,
        operatingProfitPY
      },
      investing: {
        invInterest: isLending || isInvesting ? null : invInterest,
        invDiv: isInvesting ? null : invDiv,
        invGain: isInvesting ? null : invGain,
        invProp: isInvesting ? null : invProp,
        equityMethod,
        totalInvestingCY,
        totalInvestingPY
      },
      pbitCY,
      pbitPY,
      financing: {
        finBorrow: isLending ? null : finBorrow,
        finLease,
        finOther,
        totalFinancingCY,
        totalFinancingPY
      },
      pbtCY,
      pbtPY,
      tax: {
        taxCurrent,
        taxDeferred,
        totalTaxCY,
        totalTaxPY
      },
      patContinuingCY,
      patContinuingPY,
      discOps,
      patCY,
      patPY,
      oci: {
        ociNoReclass,
        ociReclass,
        totalOciCY,
        totalOciPY
      },
      totalCompIncomeCY,
      totalCompIncomePY,
      mpm: {
        operatingEbitdaCY,
        operatingEbitdaPY
      }
    };
  },

  /**
   * Generate Statement of Financial Position (Balance Sheet)
   */
  generateBalanceSheet(aggregated, plStatement = null) {
    const getVal = (code) => {
      const item = aggregated && aggregated[code];
      return item ? { cy: item.cyAmount || 0, py: item.pyAmount || 0 } : { cy: 0, py: 0 };
    };

    const pl = plStatement || (this.generateStatementOfPL ? this.generateStatementOfPL(aggregated) : null);

    // 1. NON-CURRENT ASSETS
    const ppe = getVal('PPE');
    const cwip = getVal('CWIP');
    const invProp = getVal('INV_PROP');
    const rouAsset = getVal('ROU_ASSET');
    const intangible = getVal('INTANGIBLE');
    const intangibleDev = getVal('INTANGIBLE_DEV');
    const ncFinInv = getVal('NC_FIN_INV');
    const ncFinLoans = getVal('NC_FIN_LOANS');
    const ncFinOtherVal = (getVal('NC_FIN_OTHER_ASSET').cy || getVal('NC_FIN_OTHER_ASSET').py) ? getVal('NC_FIN_OTHER_ASSET') : getVal('NC_FIN_OTHER');
    const dta = getVal('DTA');
    const ncTaxAsset = getVal('NC_TAX_ASSET');
    const otherNcAsset = getVal('OTHER_NC_ASSET');

    const totalNonCurrentAssetsCY = ppe.cy + cwip.cy + invProp.cy + rouAsset.cy + intangible.cy + 
      intangibleDev.cy + ncFinInv.cy + ncFinLoans.cy + ncFinOtherVal.cy + dta.cy + ncTaxAsset.cy + otherNcAsset.cy;
    const totalNonCurrentAssetsPY = ppe.py + cwip.py + invProp.py + rouAsset.py + intangible.py + 
      intangibleDev.py + ncFinInv.py + ncFinLoans.py + ncFinOtherVal.py + dta.py + ncTaxAsset.py + otherNcAsset.py;

    // 2. CURRENT ASSETS
    const inventories = getVal('INVENTORIES');
    const curFinInv = getVal('CUR_FIN_INV');
    const tradeRec = getVal('TRADE_REC');
    const cashBank = getVal('CASH_BANK');
    const otherBankBal = getVal('OTHER_BANK_BAL');
    const curFinLoans = getVal('CUR_FIN_LOANS');
    const curFinOtherVal = (getVal('CUR_FIN_OTHER_ASSET').cy || getVal('CUR_FIN_OTHER_ASSET').py) ? getVal('CUR_FIN_OTHER_ASSET') : getVal('CUR_FIN_OTHER');
    const curTaxAsset = getVal('CUR_TAX_ASSET');
    const otherCurAsset = getVal('OTHER_CUR_ASSET');

    const totalCurrentAssetsCY = inventories.cy + curFinInv.cy + tradeRec.cy + cashBank.cy + 
      otherBankBal.cy + curFinLoans.cy + curFinOtherVal.cy + curTaxAsset.cy + otherCurAsset.cy;
    const totalCurrentAssetsPY = inventories.py + curFinInv.py + tradeRec.py + cashBank.py + 
      otherBankBal.py + curFinLoans.py + curFinOtherVal.py + curTaxAsset.py + otherCurAsset.py;

    const totalAssetsCY = totalNonCurrentAssetsCY + totalCurrentAssetsCY;
    const totalAssetsPY = totalNonCurrentAssetsPY + totalCurrentAssetsPY;

    // 3. EQUITY
    const equityCap = getVal('EQUITY_CAP');
    const rawOtherEquity = getVal('OTHER_EQUITY');

    // Roll-forward current period profit / total comprehensive income into Retained Earnings / Other Equity
    const currentPeriodProfitCY = pl ? (pl.totalCompIncomeCY !== undefined ? pl.totalCompIncomeCY : (pl.patCY || 0)) : 0;
    const currentPeriodProfitPY = pl ? (pl.totalCompIncomePY !== undefined ? pl.totalCompIncomePY : (pl.patPY || 0)) : 0;

    const otherEquity = {
      cy: rawOtherEquity.cy + currentPeriodProfitCY,
      py: rawOtherEquity.py + currentPeriodProfitPY,
      rawCy: rawOtherEquity.cy,
      rawPy: rawOtherEquity.py,
      currentPeriodProfitCY,
      currentPeriodProfitPY
    };

    const totalEquityCY = equityCap.cy + otherEquity.cy;
    const totalEquityPY = equityCap.py + otherEquity.py;

    // 4. NON-CURRENT LIABILITIES
    const ncBorrow = getVal('NC_BORROW');
    const ncLeaseLiab = getVal('NC_LEASE_LIAB');
    const ncFinOtherLiabVal = (getVal('NC_FIN_OTHER_LIAB').cy || getVal('NC_FIN_OTHER_LIAB').py) ? getVal('NC_FIN_OTHER_LIAB') : getVal('NC_FIN_OTHER');
    const ncProv = getVal('NC_PROV');
    const dtl = getVal('DTL');
    const otherNcLiab = getVal('OTHER_NC_LIAB');

    const totalNonCurrentLiabCY = ncBorrow.cy + ncLeaseLiab.cy + ncFinOtherLiabVal.cy + ncProv.cy + dtl.cy + otherNcLiab.cy;
    const totalNonCurrentLiabPY = ncBorrow.py + ncLeaseLiab.py + ncFinOtherLiabVal.py + ncProv.py + dtl.py + otherNcLiab.py;

    // 5. CURRENT LIABILITIES
    const curBorrow = getVal('CUR_BORROW');
    const curLeaseLiab = getVal('CUR_LEASE_LIAB');
    const tradePayMsme = getVal('TRADE_PAY_MSME');
    const tradePayOther = getVal('TRADE_PAY_OTHER');
    const curFinOtherLiabVal = (getVal('CUR_FIN_OTHER_LIAB').cy || getVal('CUR_FIN_OTHER_LIAB').py) ? getVal('CUR_FIN_OTHER_LIAB') : getVal('CUR_FIN_OTHER');
    const otherCurLiab = getVal('OTHER_CUR_LIAB');
    const curProv = getVal('CUR_PROV');
    const curTaxLiab = getVal('CUR_TAX_LIAB');

    const totalCurrentLiabCY = curBorrow.cy + curLeaseLiab.cy + tradePayMsme.cy + tradePayOther.cy + 
      curFinOtherLiabVal.cy + otherCurLiab.cy + curProv.cy + curTaxLiab.cy;
    const totalCurrentLiabPY = curBorrow.py + curLeaseLiab.py + tradePayMsme.py + tradePayOther.py + 
      curFinOtherLiabVal.py + otherCurLiab.py + curProv.py + curTaxLiab.py;

    const totalLiabilitiesCY = totalNonCurrentLiabCY + totalCurrentLiabCY;
    const totalLiabilitiesPY = totalNonCurrentLiabPY + totalCurrentLiabPY;

    const totalEquityAndLiabilitiesCY = totalEquityCY + totalLiabilitiesCY;
    const totalEquityAndLiabilitiesPY = totalEquityPY + totalLiabilitiesPY;

    const netWorthCY = totalAssetsCY - totalLiabilitiesCY;
    const netWorthPY = totalAssetsPY - totalLiabilitiesPY;

    const bsDiffCY = Math.round((totalAssetsCY - totalEquityAndLiabilitiesCY) * 100) / 100;
    const bsDiffPY = Math.round((totalAssetsPY - totalEquityAndLiabilitiesPY) * 100) / 100;

    return {
      nonCurrentAssets: {
        ppe, cwip, invProp, rouAsset, intangible, intangibleDev,
        ncFinInv, ncFinLoans, ncFinOther: ncFinOtherVal, dta, ncTaxAsset, otherNcAsset,
        totalNonCurrentAssetsCY, totalNonCurrentAssetsPY
      },
      currentAssets: {
        inventories, curFinInv, tradeRec, cashBank, otherBankBal,
        curFinLoans, curFinOther: curFinOtherVal, curTaxAsset, otherCurAsset,
        totalCurrentAssetsCY, totalCurrentAssetsPY
      },
      totalAssetsCY,
      totalAssetsPY,
      equity: {
        equityCap, otherEquity,
        totalEquityCY, totalEquityPY
      },
      nonCurrentLiabilities: {
        ncBorrow, ncLeaseLiab, ncFinOther: ncFinOtherLiabVal, ncProv, dtl, otherNcLiab,
        totalNonCurrentLiabCY, totalNonCurrentLiabPY
      },
      currentLiabilities: {
        curBorrow, curLeaseLiab, tradePayMsme, tradePayOther,
        curFinOther: curFinOtherLiabVal, otherCurLiab, curProv, curTaxLiab,
        totalCurrentLiabCY, totalCurrentLiabPY
      },
      totalLiabilitiesCY,
      totalLiabilitiesPY,
      totalEquityAndLiabilitiesCY,
      totalEquityAndLiabilitiesPY,
      netWorthCY,
      netWorthPY,
      bsDiffCY,
      bsDiffPY,
      isBalancedCY: Math.abs(bsDiffCY) < 0.05,
      isBalancedPY: Math.abs(bsDiffPY) < 0.05
    };
  },

  /**
   * Validate full accounting equation, P&L to Equity reconciliation, and anomaly audits
   */
  performAuditChecks(tbSummary, plStatement, balanceSheet, ledgers) {
    const checks = [];
    const warnings = [];

    const tb = tbSummary || {
      totalDebitCY: 0,
      totalCreditCY: 0,
      diffCY: 0,
      isBalancedCY: true,
      totalDebitPY: 0,
      totalCreditPY: 0,
      diffPY: 0,
      isBalancedPY: true,
      duplicates: []
    };

    // 1. Trial Balance Equivalence
    checks.push({
      category: 'Trial Balance Verification',
      test: 'CY Trial Balance Total Debits equal Credits',
      status: tb.isBalancedCY ? 'PASS' : 'FAIL',
      detail: `Total Dr: ₹${this.formatNumber(tb.totalDebitCY)} | Total Cr: ₹${this.formatNumber(tb.totalCreditCY)} | Diff: ₹${this.formatNumber(tb.diffCY)}`
    });

    if (tb.totalDebitPY > 0 || tb.totalCreditPY > 0) {
      checks.push({
        category: 'Trial Balance Verification',
        test: 'PY Trial Balance Total Debits equal Credits',
        status: tb.isBalancedPY ? 'PASS' : 'FAIL',
        detail: `Total Dr: ₹${this.formatNumber(tb.totalDebitPY)} | Total Cr: ₹${this.formatNumber(tb.totalCreditPY)} | Diff: ₹${this.formatNumber(tb.diffPY)}`
      });
    }

    // 2. Balance Sheet Fundamental Equation (Assets = Equity + Liabilities)
    checks.push({
      category: 'Accounting Equation Check',
      test: 'CY Balance Sheet: Total Assets = Total Equity + Liabilities',
      status: balanceSheet.isBalancedCY ? 'PASS' : 'FAIL',
      detail: `Assets: ₹${this.formatNumber(balanceSheet.totalAssetsCY)} | Equity + Liab: ₹${this.formatNumber(balanceSheet.totalEquityAndLiabilitiesCY)} | Diff: ₹${this.formatNumber(balanceSheet.bsDiffCY)}`
    });

    if (balanceSheet.totalAssetsPY > 0) {
      checks.push({
        category: 'Accounting Equation Check',
        test: 'PY Balance Sheet: Total Assets = Total Equity + Liabilities',
        status: balanceSheet.isBalancedPY ? 'PASS' : 'FAIL',
        detail: `Assets: ₹${this.formatNumber(balanceSheet.totalAssetsPY)} | Equity + Liab: ₹${this.formatNumber(balanceSheet.totalEquityAndLiabilitiesPY)} | Diff: ₹${this.formatNumber(balanceSheet.bsDiffPY)}`
      });
    }

    // 3. P&L Net Profit to Retained Earnings Roll-Forward
    if (balanceSheet.equity.totalEquityPY > 0) {
      const expectedEquityChange = plStatement.patCY + plStatement.oci.totalOciCY;
      const actualEquityChange = balanceSheet.equity.totalEquityCY - balanceSheet.equity.totalEquityPY;
      const equityReconciliationDiff = Math.round((actualEquityChange - expectedEquityChange) * 100) / 100;

      checks.push({
        category: 'P&L to Balance Sheet Reconciliation',
        test: 'CY Profit/Loss + OCI rolls forward to Equity (Net of Dividends/Capital changes)',
        status: Math.abs(equityReconciliationDiff) < 1.0 ? 'PASS' : 'NOTE',
        detail: `P&L Total Comprehensive Income: ₹${this.formatNumber(expectedEquityChange)} | Net Equity Change: ₹${this.formatNumber(actualEquityChange)} | Variance: ₹${this.formatNumber(equityReconciliationDiff)} (Requires CA verification for share capital issuance or dividend payouts)`
      });
    }

    // 4. Anomaly Audits on Specific Accounts
    if (Array.isArray(ledgers)) {
      ledgers.forEach(l => {
        // Check negative Cash & Bank
        if (l.lineItemCode === 'CASH_BANK' && l.netCY < 0) {
          warnings.push({
            type: 'ANOMALY',
            severity: 'HIGH',
            ledger: l.name,
            code: l.code,
            issue: `Cash and bank ledger has a credit balance of ₹${this.formatNumber(Math.abs(l.netCY))}. Consider reclassifying to Bank Overdraft (Current Borrowings).`
          });
        }

        // Check negative Trade Receivables
        if (l.lineItemCode === 'TRADE_REC' && l.netCY < 0) {
          warnings.push({
            type: 'ANOMALY',
            severity: 'MEDIUM',
            ledger: l.name,
            code: l.code,
            issue: `Trade receivable ledger has a net credit balance of ₹${this.formatNumber(Math.abs(l.netCY))}. Consider reclassifying to Advances from Customers.`
          });
        }

        // Check negative Trade Payables
        if ((l.lineItemCode === 'TRADE_PAY_MSME' || l.lineItemCode === 'TRADE_PAY_OTHER') && l.netCY > 0) {
          warnings.push({
            type: 'ANOMALY',
            severity: 'MEDIUM',
            ledger: l.name,
            code: l.code,
            issue: `Trade payable ledger has a net debit balance of ₹${this.formatNumber(l.netCY)}. Consider reclassifying to Advance to Vendors.`
          });
        }

        // Low confidence classification
        if (l.confidence < 50 && !l.isCustomOverride) {
          warnings.push({
            type: 'CLASSIFICATION',
            severity: 'LOW',
            ledger: l.name,
            code: l.code,
            issue: `Ledger was auto-classified as "${l.lineItemCode}" with low confidence (${l.confidence}%). CA manual review recommended.`
          });
        }
      });
    }

    // Duplicate check
    if (tb.duplicates && tb.duplicates.length > 0) {
      tb.duplicates.forEach(d => {
        warnings.push({
          type: 'DATA_QUALITY',
          severity: 'MEDIUM',
          ledger: d.key,
          code: '',
          issue: `Duplicate ledger detected (${d.count} occurrences). Aggregated automatically.`
        });
      });
    }

    return { checks, warnings };
  },

  /**
   * Helper to format numbers in Indian format
   */
  formatNumber(val, decimals = 2) {
    if (val === null || val === undefined || isNaN(val)) return '0.00';
    return Number(val).toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }
};

if (typeof window !== 'undefined') {
  window.FinStatEngine = FinStatEngine;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FinStatEngine;
}
