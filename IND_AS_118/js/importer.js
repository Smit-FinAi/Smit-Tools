/**
 * Smit FinStat PRO - Multi-Format Importer & Data Sanitizer
 * Supports CSV, XLS, XLSX imports (single 2-year TB, dual-year separate files, and clipboard paste)
 * Intelligent column auto-detection, cleaning, duplicate detection, dual-year merging, and trial balance summation.
 */

const TBImporter = {
  /**
   * Parse a File object (CSV, XLS, XLSX) into an array of object rows
   */
  async readFile(file) {
    return new Promise((resolve, reject) => {
      if (!window.XLSX) {
        reject(new Error('Spreadsheet parser library (SheetJS) is not loaded.'));
        return;
      }

      const reader = new FileReader();

      // Read as ArrayBuffer for both Excel and CSV - SheetJS handles both natively
      reader.readAsArrayBuffer(file);
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true, raw: false });
          
          if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            reject(new Error('The spreadsheet contains no readable worksheets.'));
            return;
          }

          // Find the best sheet (first sheet with > 2 rows of data)
          let bestSheet = workbook.SheetNames[0];
          let bestRows = [];

          for (const sName of workbook.SheetNames) {
            const currentRows = XLSX.utils.sheet_to_json(workbook.Sheets[sName], { header: 1, defval: '' });
            if (currentRows && currentRows.length > bestRows.length) {
              bestRows = currentRows;
              bestSheet = sName;
            }
          }

          resolve({ workbook, sheetNames: workbook.SheetNames, selectedSheet: bestSheet, rows: bestRows });
        } catch (err) {
          // If array buffer read fails on CSV, try plain text fallback
          try {
            const textReader = new FileReader();
            textReader.readAsText(file, 'utf-8');
            textReader.onload = (te) => {
              try {
                const text = te.target.result;
                const rows = TBImporter.parseCSVText(text);
                resolve({ workbook: null, sheetNames: ['CSV Data'], selectedSheet: 'CSV Data', rows });
              } catch (innerErr) {
                reject(new Error('Failed to parse file: ' + err.message));
              }
            };
          } catch (textErr) {
            reject(new Error('Failed to read file: ' + err.message));
          }
        }
      };
      reader.onerror = () => reject(new Error('File reading failed. Please check file permissions.'));
    });
  },

  /**
   * Universal text parser handling CSV, TSV (tabs from Excel/Tally/SAP/Sheets), and semicolons
   */
  parseCSVText(text) {
    if (!text) return [];
    const lines = text.split(/\r\n|\n|\r/);
    const rows = [];

    // Detect delimiter by scanning initial non-empty lines
    let delimiter = ',';
    for (const line of lines) {
      if (!line.trim()) continue;
      if (line.includes('\t')) {
        delimiter = '\t';
        break;
      } else if (line.includes(';') && !line.includes(',')) {
        delimiter = ';';
        break;
      } else if (line.includes(',')) {
        delimiter = ',';
        break;
      }
    }

    for (const line of lines) {
      if (!line.trim()) continue;
      const row = [];
      let inQuotes = false;
      let currentVal = '';

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          row.push(currentVal.trim().replace(/^["']|["']$/g, ''));
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
      row.push(currentVal.trim().replace(/^["']|["']$/g, ''));
      rows.push(row);
    }
    return rows;
  },

  /**
   * Intelligently find header row index (skipping company names, empty rows, date headers)
   */
  detectHeaderRow(rows) {
    if (!rows || rows.length === 0) return 0;

    const headerKeywords = [
      /ledger/i, /account/i, /particulars/i, /particular/i, /code/i, /debit/i, /credit/i, 
      /balance/i, /\bdr\b/i, /\bcr\b/i, /\bcy\b/i, /\bpy\b/i, /amount/i, /closing/i,
      /head/i, /description/i, /net/i, /opening/i
    ];

    let bestRowIdx = 0;
    let maxMatchCount = 0;

    // Scan first 20 rows
    const searchLimit = Math.min(rows.length, 20);
    for (let i = 0; i < searchLimit; i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;

      let matches = 0;
      for (const cell of row) {
        const val = String(cell || '').trim();
        if (headerKeywords.some(kw => kw.test(val))) {
          matches++;
        }
      }

      if (matches > maxMatchCount) {
        maxMatchCount = matches;
        bestRowIdx = i;
      }
    }

    return bestRowIdx;
  },

  /**
   * Automatically map raw headers to expected standard fields
   * Handles all Indian accounting software conventions (Tally, Busy, Marg, SAP, Zoho)
   */
  autoDetectColumns(headers) {
    const mapping = {
      codeCol: -1,
      nameCol: -1,
      debitCyCol: -1,
      creditCyCol: -1,
      netCyCol: -1,
      debitPyCol: -1,
      creditPyCol: -1,
      netPyCol: -1
    };

    if (!headers || !Array.isArray(headers)) return mapping;

    // Normalize each header: lowercase and replace punctuation/brackets with single spaces
    const norm = headers.map(h => String(h || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim());

    // Step 1: Detect Account Code
    norm.forEach((s, idx) => {
      if (mapping.codeCol === -1 && /\b(account code|ledger code|gl code|gl no|acc no|ac no|code|gl)\b/i.test(s)) {
        mapping.codeCol = idx;
      }
    });

    // Step 2: Detect Ledger Name / Particulars / Description
    norm.forEach((s, idx) => {
      if (idx === mapping.codeCol) return;
      if (mapping.nameCol === -1 && /\b(ledger name|account name|particulars|particular|account description|ledger description|head of account|head|account|ledger|description)\b/i.test(s)) {
        mapping.nameCol = idx;
      }
    });

    // Helper: detect whether a header refers to CY or PY
    const getYearCategory = (s) => {
      // Current Year (CY) checks - e.g. FY 2024-25, 2025, CY, Current
      if (/\b(cy|current|this year)\b/i.test(s)) return 'CY';
      if (/(2024 25|24 25|2025 26|25 26|2025|2026|31 03 2025|31 03 2026)/i.test(s)) return 'CY';

      // Previous Year (PY) checks - e.g. FY 2023-24, 2024, PY, Previous, Prior
      if (/\b(py|previous|prior|last year|ly)\b/i.test(s)) return 'PY';
      if (/(2023 24|23 24|2022 23|22 23|2024|2023|2022|31 03 2024|31 03 2023)/i.test(s)) return 'PY';

      return null;
    };

    // Step 3: Check columns with explicit year indicators
    norm.forEach((s, idx) => {
      if (idx === mapping.codeCol || idx === mapping.nameCol) return;
      const year = getYearCategory(s);

      if (year === 'PY') {
        if (mapping.debitPyCol === -1 && /\b(debit|dr)\b/i.test(s)) {
          mapping.debitPyCol = idx;
        } else if (mapping.creditPyCol === -1 && /\b(credit|cr)\b/i.test(s)) {
          mapping.creditPyCol = idx;
        } else if (mapping.netPyCol === -1 && /\b(net|balance|closing|amount)\b/i.test(s)) {
          mapping.netPyCol = idx;
        }
      } else if (year === 'CY') {
        if (mapping.debitCyCol === -1 && /\b(debit|dr)\b/i.test(s)) {
          mapping.debitCyCol = idx;
        } else if (mapping.creditCyCol === -1 && /\b(credit|cr)\b/i.test(s)) {
          mapping.creditCyCol = idx;
        } else if (mapping.netCyCol === -1 && /\b(net|balance|closing|amount)\b/i.test(s)) {
          mapping.netCyCol = idx;
        }
      }
    });

    // Step 4: Fallback for generic Debit / Credit / Balance columns without explicit year
    norm.forEach((s, idx) => {
      if (idx === mapping.codeCol || idx === mapping.nameCol || idx === mapping.debitPyCol || idx === mapping.creditPyCol || idx === mapping.netPyCol) return;

      if (mapping.debitCyCol === -1 && /\b(debit|dr)\b/i.test(s)) {
        mapping.debitCyCol = idx;
      } else if (mapping.creditCyCol === -1 && /\b(credit|cr)\b/i.test(s)) {
        mapping.creditCyCol = idx;
      } else if (mapping.netCyCol === -1 && /\b(net|balance|closing|closing balance|amount)\b/i.test(s)) {
        mapping.netCyCol = idx;
      }
    });

    // Step 5: Fallback if Ledger Name is still unassigned
    if (mapping.nameCol === -1) {
      norm.forEach((s, idx) => {
        if (mapping.nameCol === -1 && idx !== mapping.codeCol && s && s.length > 0) {
          mapping.nameCol = idx;
        }
      });
    }

    return mapping;
  },

  /**
   * Robust number parser for Indian financial figures:
   * Handles commas (1,23,456.78), currency symbols (₹, Rs), brackets (100) -> -100, Dr/Cr tags, and NIL/dashes.
   */
  parseNumber(val) {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;

    let s = String(val).trim().replace(/^["']|["']$/g, '').trim();
    if (!s) return 0;

    // Check for dashes, NIL, N/A, None
    if (/^[-—–\s]+$/.test(s) || /^(nil|null|none|na|n\/a)$/i.test(s)) {
      return 0;
    }

    let isNegative = false;

    // Parentheses check: (1,234.50) -> negative
    if (/^\(.*\)$/.test(s)) {
      isNegative = true;
      s = s.substring(1, s.length - 1);
    }

    // Trailing or leading minus check: -123 or 123-
    if (s.startsWith('-') || s.endsWith('-')) {
      isNegative = true;
      s = s.replace(/-/g, '');
    }

    // Trailing Cr check (e.g. "50,000 Cr")
    if (/\bcr\b/i.test(s)) {
      isNegative = true;
    }

    // Remove currency symbols, commas, spaces, Dr/Cr tokens
    s = s.replace(/[₹$,\s]/g, '').replace(/\b(dr|cr|rs|inr)\b/gi, '');
    
    const num = parseFloat(s);
    if (isNaN(num)) return 0;
    return isNegative ? -Math.abs(num) : num;
  },

  /**
   * Process raw rows with given column mapping into standardized ledger objects
   */
  processRows(rawRows, headerRowIdx, mapping, businessActivity = 'STANDARD') {
    const headers = rawRows[headerRowIdx] || [];
    const dataRows = rawRows.slice(headerRowIdx + 1);

    const ledgers = [];
    const duplicates = new Map();
    let totalDebitCY = 0;
    let totalCreditCY = 0;
    let totalDebitPY = 0;
    let totalCreditPY = 0;

    // Check if row is a total row or separator
    const isTotalOrHeaderRow = (name) => {
      if (!name) return true;
      const lower = name.trim().toLowerCase();
      return /^(total|grand\s*total|sum|difference|trial\s*balance\s*total|sub[- ]?total|closing\s*balance)$/i.test(lower);
    };

    dataRows.forEach((row, rowIdx) => {
      if (!row || !Array.isArray(row) || row.length === 0) return;

      const code = mapping.codeCol >= 0 && row[mapping.codeCol] !== undefined 
        ? String(row[mapping.codeCol] || '').trim() 
        : `GL-${(rowIdx + 1).toString().padStart(4, '0')}`;

      const name = mapping.nameCol >= 0 && row[mapping.nameCol] !== undefined 
        ? String(row[mapping.nameCol] || '').trim() 
        : '';

      if (!name || isTotalOrHeaderRow(name)) {
        return;
      }

      // 1. Calculate Current Year (CY) Balance
      let debitCY = 0;
      let creditCY = 0;
      let netCY = 0;

      if (mapping.debitCyCol >= 0 && mapping.creditCyCol >= 0) {
        debitCY = Math.abs(this.parseNumber(row[mapping.debitCyCol]));
        creditCY = Math.abs(this.parseNumber(row[mapping.creditCyCol]));
        netCY = debitCY - creditCY;
      } else if (mapping.netCyCol >= 0) {
        netCY = this.parseNumber(row[mapping.netCyCol]);
        if (netCY >= 0) {
          debitCY = netCY;
          creditCY = 0;
        } else {
          debitCY = 0;
          creditCY = Math.abs(netCY);
        }
      } else if (mapping.debitCyCol >= 0) {
        debitCY = Math.abs(this.parseNumber(row[mapping.debitCyCol]));
        netCY = debitCY;
      } else if (mapping.creditCyCol >= 0) {
        creditCY = Math.abs(this.parseNumber(row[mapping.creditCyCol]));
        netCY = -creditCY;
      }

      // 2. Calculate Previous Year (PY) Balance
      let debitPY = 0;
      let creditPY = 0;
      let netPY = 0;

      if (mapping.debitPyCol >= 0 && mapping.creditPyCol >= 0) {
        debitPY = Math.abs(this.parseNumber(row[mapping.debitPyCol]));
        creditPY = Math.abs(this.parseNumber(row[mapping.creditPyCol]));
        netPY = debitPY - creditPY;
      } else if (mapping.netPyCol >= 0) {
        netPY = this.parseNumber(row[mapping.netPyCol]);
        if (netPY >= 0) {
          debitPY = netPY;
          creditPY = 0;
        } else {
          debitPY = 0;
          creditPY = Math.abs(netPY);
        }
      } else if (mapping.debitPyCol >= 0) {
        debitPY = Math.abs(this.parseNumber(row[mapping.debitPyCol]));
        netPY = debitPY;
      } else if (mapping.creditPyCol >= 0) {
        creditPY = Math.abs(this.parseNumber(row[mapping.creditPyCol]));
        netPY = -creditPY;
      }

      // Check duplicates
      const dupKey = (code ? code + '__' : '') + name.toLowerCase();
      if (duplicates.has(dupKey)) {
        duplicates.set(dupKey, duplicates.get(dupKey) + 1);
      } else {
        duplicates.set(dupKey, 1);
      }

      totalDebitCY += debitCY;
      totalCreditCY += creditCY;
      totalDebitPY += debitPY;
      totalCreditPY += creditPY;

      const balanceType = netCY >= 0 ? 'DEBIT' : 'CREDIT';

      // Auto classify with Ind AS 118 Rules
      const classification = IndAS118Rules.classifyLedger(name, balanceType, businessActivity);

      ledgers.push({
        id: 'L_' + (rowIdx + 1) + '_' + Math.random().toString(36).substring(2, 8),
        code: code || `GL-${(rowIdx + 1).toString().padStart(4, '0')}`,
        name: name,
        debitCY: debitCY,
        creditCY: creditCY,
        netCY: netCY,
        debitPY: debitPY,
        creditPY: creditPY,
        netPY: netPY,
        lineItemCode: classification.lineItemCode,
        confidence: classification.confidence,
        matchedKeyword: classification.matchedKeyword,
        isCustomOverride: false,
        mbaNote: classification.mbaNote || null,
        userNotes: ''
      });
    });

    const duplicateList = [];
    duplicates.forEach((count, key) => {
      if (count > 1) {
        duplicateList.push({ key, count });
      }
    });

    const tbSummary = {
      totalDebitCY: Math.round(totalDebitCY * 100) / 100,
      totalCreditCY: Math.round(totalCreditCY * 100) / 100,
      diffCY: Math.round((totalDebitCY - totalCreditCY) * 100) / 100,
      isBalancedCY: Math.abs(totalDebitCY - totalCreditCY) < 0.05,
      totalDebitPY: Math.round(totalDebitPY * 100) / 100,
      totalCreditPY: Math.round(totalCreditPY * 100) / 100,
      diffPY: Math.round((totalDebitPY - totalCreditPY) * 100) / 100,
      isBalancedPY: Math.abs(totalDebitPY - totalCreditPY) < 0.05,
      ledgerCount: ledgers.length,
      duplicates: duplicateList
    };

    return { ledgers, tbSummary, headers };
  },

  /**
   * Merge separate CY and PY import results into comparative ledgers
   */
  mergeDualYearLedgers(cyResult, pyResult, businessActivity = 'STANDARD') {
    const cyLedgers = (cyResult && cyResult.ledgers) ? cyResult.ledgers : [];
    const pyLedgers = (pyResult && pyResult.ledgers) ? pyResult.ledgers : [];

    const ledgerMap = new Map();

    // 1. Index CY Ledgers
    cyLedgers.forEach(l => {
      const key = (l.name || '').trim().toLowerCase();
      ledgerMap.set(key, {
        id: l.id || ('L_CY_' + Math.random().toString(36).substring(2, 8)),
        code: l.code || '',
        name: l.name,
        debitCY: l.debitCY || 0,
        creditCY: l.creditCY || 0,
        netCY: l.netCY || 0,
        debitPY: 0,
        creditPY: 0,
        netPY: 0,
        lineItemCode: l.lineItemCode,
        confidence: l.confidence,
        matchedKeyword: l.matchedKeyword,
        isCustomOverride: !!l.isCustomOverride,
        mbaNote: l.mbaNote || null,
        userNotes: l.userNotes || ''
      });
    });

    // 2. Merge PY Ledgers
    pyLedgers.forEach(pl => {
      const key = (pl.name || '').trim().toLowerCase();
      // For PY TB processed independently, debitCY / creditCY / netCY hold the figures
      const pyDr = pl.debitCY !== undefined ? pl.debitCY : (pl.debitPY || 0);
      const pyCr = pl.creditCY !== undefined ? pl.creditCY : (pl.creditPY || 0);
      const pyNet = pl.netCY !== undefined ? pl.netCY : (pl.netPY || 0);

      if (ledgerMap.has(key)) {
        const existing = ledgerMap.get(key);
        existing.debitPY = pyDr;
        existing.creditPY = pyCr;
        existing.netPY = pyNet;
        if (!existing.code && pl.code) existing.code = pl.code;
      } else {
        // PY only ledger
        const balanceType = pyNet >= 0 ? 'DEBIT' : 'CREDIT';
        const classification = IndAS118Rules.classifyLedger(pl.name, balanceType, businessActivity);
        ledgerMap.set(key, {
          id: pl.id || ('L_PY_' + Math.random().toString(36).substring(2, 8)),
          code: pl.code || '',
          name: pl.name,
          debitCY: 0,
          creditCY: 0,
          netCY: 0,
          debitPY: pyDr,
          creditPY: pyCr,
          netPY: pyNet,
          lineItemCode: classification.lineItemCode,
          confidence: classification.confidence,
          matchedKeyword: classification.matchedKeyword,
          isCustomOverride: false,
          mbaNote: classification.mbaNote || null,
          userNotes: ''
        });
      }
    });

    return Array.from(ledgerMap.values());
  }
};

if (typeof window !== 'undefined') {
  window.TBImporter = TBImporter;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TBImporter;
}
