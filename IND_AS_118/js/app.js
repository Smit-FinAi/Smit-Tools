/**
 * Smit FinStat PRO - Application Controller & State Management
 * Connects UI, Import, Classification, Calculation Engine, Auditing and Exports.
 */

const FinStatApp = {
  // Global State
  state: {
    entity: {
      name: 'Apex Auto Components Limited',
      cin: 'L28920MH2008PLC184321',
      cyLabel: '31st March 2026',
      pyLabel: '31st March 2025',
      scale: 'ABSOLUTE', // 'ABSOLUTE', 'THOUSANDS', 'LAKHS', 'CRORES'
      scaleMultiplier: 1,
      scaleLabel: 'Absolute Figures in INR',
      businessActivity: 'STANDARD', // 'STANDARD', 'FINANCING', 'INVESTING'
      effectiveDate: '2026-04-01'
    },
    activeTab: 'setup',
    importMode: 'single', // 'single', 'dual', 'paste'
    dualFiles: {
      cyFile: null,
      pyFile: null,
      cyResult: null,
      pyResult: null
    },
    rawImport: null,
    ledgers: [],
    tbSummary: null,
    reportData: null,
    auditTrail: [],
    selectedLedgerIds: new Set(),
    filter: {
      search: '',
      category: 'ALL',
      confidence: 'ALL',
      overrideOnly: false
    }
  },

  /**
   * Initialise Application
   */
  init() {
    this.bindEvents();
    this.populateBulkAssignDropdown();
    this.registerServiceWorker();
    this.syncSetupForm();

    // Auto-load Manufacturing sample on startup for immediate out-of-the-box readiness
    if (typeof EmbeddedSamples !== 'undefined' && EmbeddedSamples.manufacturing) {
      this.loadEmbeddedSample('manufacturing', true);
    }
  },

  /**
   * Register PWA Service Worker (only on HTTP/HTTPS/localhost)
   */
  registerServiceWorker() {
    if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
          .then(reg => console.log('[PWA] Service Worker registered:', reg.scope))
          .catch(err => console.log('[PWA] Service Worker registration failed:', err));
      });
    }
  },

  /**
   * Bind DOM Events
   */
  bindEvents() {
    // Tab Navigation
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (tab) this.switchTab(tab);
      });
    });

    // Setup Form Change
    document.getElementById('setup-company-name')?.addEventListener('input', (e) => {
      this.state.entity.name = e.target.value.trim();
      this.updateHeaderEntityPill();
      this.renderExportPreview();
    });

    document.getElementById('setup-cin')?.addEventListener('input', (e) => {
      this.state.entity.cin = e.target.value.trim();
      this.renderExportPreview();
    });

    document.getElementById('setup-cy-label')?.addEventListener('input', (e) => {
      this.state.entity.cyLabel = e.target.value.trim();
      this.recalculateStatements();
      this.renderFinancialStatements();
      this.renderExportPreview();
    });

    document.getElementById('setup-py-label')?.addEventListener('input', (e) => {
      this.state.entity.pyLabel = e.target.value.trim();
      this.recalculateStatements();
      this.renderFinancialStatements();
      this.renderExportPreview();
    });

    document.getElementById('setup-mba')?.addEventListener('change', (e) => {
      this.state.entity.businessActivity = e.target.value;
      this.logAudit('CONFIG_CHANGE', `Changed Main Business Activity to ${e.target.value}`);
      this.reclassifyAllLedgers(false);
      this.recalculateStatements();
      this.renderAllViews();
      this.showToast('Updated Main Business Activity and re-indexed Ind AS 118 categories', 'info');
    });

    document.getElementById('setup-scale')?.addEventListener('change', (e) => {
      this.setScale(e.target.value);
    });

    // Single File Upload Setup
    const dropzone = document.getElementById('tb-dropzone');
    const fileInput = document.getElementById('tb-file-input');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') {
          fileInput.click();
        }
      });

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });

      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this.handleFileUpload(e.dataTransfer.files[0]);
        }
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.handleFileUpload(e.target.files[0]);
        }
        e.target.value = ''; // Reset so same file can be re-selected
      });
    }

    // Dual File Upload Setup
    const cyFileInput = document.getElementById('tb-cy-file-input');
    const pyFileInput = document.getElementById('tb-py-file-input');

    if (cyFileInput) {
      cyFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.handleDualFileSelected(e.target.files[0], 'cy');
        }
        e.target.value = '';
      });
    }

    if (pyFileInput) {
      pyFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.handleDualFileSelected(e.target.files[0], 'py');
        }
        e.target.value = '';
      });
    }

    // Mapping Search & Filters
    document.getElementById('mapping-search')?.addEventListener('input', (e) => {
      this.state.filter.search = e.target.value.toLowerCase().trim();
      this.renderMappingTable();
    });

    document.getElementById('mapping-category-filter')?.addEventListener('change', (e) => {
      this.state.filter.category = e.target.value;
      this.renderMappingTable();
    });

    document.getElementById('mapping-confidence-filter')?.addEventListener('change', (e) => {
      this.state.filter.confidence = e.target.value;
      this.renderMappingTable();
    });

    document.getElementById('mapping-override-filter')?.addEventListener('change', (e) => {
      this.state.filter.overrideOnly = e.target.checked;
      this.renderMappingTable();
    });
  },

  /**
   * Set Import Mode: 'single' | 'dual' | 'paste'
   */
  setImportMode(mode) {
    this.state.importMode = mode;

    document.getElementById('btn-mode-single')?.classList.toggle('btn-primary', mode === 'single');
    document.getElementById('btn-mode-single')?.classList.toggle('btn-secondary', mode !== 'single');

    document.getElementById('btn-mode-dual')?.classList.toggle('btn-primary', mode === 'dual');
    document.getElementById('btn-mode-dual')?.classList.toggle('btn-secondary', mode !== 'dual');

    document.getElementById('btn-mode-paste')?.classList.toggle('btn-primary', mode === 'paste');
    document.getElementById('btn-mode-paste')?.classList.toggle('btn-secondary', mode !== 'paste');

    const singleContainer = document.getElementById('import-mode-single-container');
    const dualContainer = document.getElementById('import-mode-dual-container');
    const pasteContainer = document.getElementById('import-mode-paste-container');

    if (singleContainer) singleContainer.style.display = mode === 'single' ? 'block' : 'none';
    if (dualContainer) dualContainer.style.display = mode === 'dual' ? 'block' : 'none';
    if (pasteContainer) pasteContainer.style.display = mode === 'paste' ? 'block' : 'none';
  },

  /**
   * Switch Active Tab & Render
   */
  switchTab(tabId) {
    this.state.activeTab = tabId;

    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === `pane-${tabId}`);
    });

    // Render tab content on enter
    if (tabId === 'mapping') {
      this.renderMappingTable();
    } else if (tabId === 'audit') {
      this.renderAuditDashboard();
    } else if (tabId === 'preview') {
      this.renderFinancialStatements();
    } else if (tabId === 'export') {
      this.renderExportPreview();
    }
  },

  /**
   * Handle Single File Upload
   */
  async handleFileUpload(file) {
    try {
      this.showToast(`Reading ${file.name}...`, 'info');
      const result = await TBImporter.readFile(file);
      
      // Store workbook in state
      this.state.rawImport = {
        fileName: file.name,
        workbook: result.workbook,
        sheetNames: result.sheetNames || [],
        selectedSheet: result.selectedSheet,
        rows: result.rows,
        headerRowIdx: 0,
        headers: [],
        mapping: null
      };

      // Populate multi-sheet selector if multiple worksheets
      const sheetBox = document.getElementById('multi-sheet-selector-box');
      const sheetSelect = document.getElementById('select-sheet-name');
      if (result.sheetNames && result.sheetNames.length > 1 && sheetBox && sheetSelect) {
        sheetSelect.innerHTML = '';
        result.sheetNames.forEach(sn => {
          const opt = document.createElement('option');
          opt.value = sn;
          opt.textContent = sn;
          if (sn === result.selectedSheet) opt.selected = true;
          sheetSelect.appendChild(opt);
        });
        sheetBox.style.display = 'block';
      } else if (sheetBox) {
        sheetBox.style.display = 'none';
      }

      this.processUploadedRows(result.rows, file.name);
    } catch (err) {
      this.showToast('Upload Error: ' + err.message, 'error');
    }
  },

  /**
   * Switch Worksheet for multi-sheet Excel
   */
  changeSelectedWorksheet() {
    const sheetSelect = document.getElementById('select-sheet-name');
    if (!sheetSelect || !this.state.rawImport || !this.state.rawImport.workbook) return;

    const sName = sheetSelect.value;
    const sheet = this.state.rawImport.workbook.Sheets[sName];
    if (!sheet) return;

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    this.state.rawImport.selectedSheet = sName;
    this.state.rawImport.rows = rows;
    this.processUploadedRows(rows, `${this.state.rawImport.fileName} [${sName}]`);
  },

  /**
   * Process rows after file read or sheet switch
   */
  processUploadedRows(rows, sourceName) {
    const headerRowIdx = TBImporter.detectHeaderRow(rows);
    const headers = rows[headerRowIdx] || [];
    const autoMapping = TBImporter.autoDetectColumns(headers);

    this.state.rawImport.headerRowIdx = headerRowIdx;
    this.state.rawImport.headers = headers;
    this.state.rawImport.mapping = autoMapping;

    // Check if we have high-confidence automatic detection (Ledger Name + at least 1 amount column)
    const hasAmounts = (autoMapping.debitCyCol >= 0 && autoMapping.creditCyCol >= 0) || autoMapping.netCyCol >= 0 || autoMapping.debitCyCol >= 0;
    
    if (autoMapping.nameCol >= 0 && hasAmounts) {
      // Auto-parse directly
      const processed = TBImporter.processRows(rows, headerRowIdx, autoMapping, this.state.entity.businessActivity);
      this.state.ledgers = processed.ledgers;
      this.state.tbSummary = processed.tbSummary;

      this.logAudit('IMPORT', `Auto-imported ${processed.ledgers.length} ledgers from ${sourceName}`);
      this.recalculateStatements();
      this.renderAllViews();
      this.switchTab('mapping');
      this.showToast(`Imported ${processed.ledgers.length} ledgers successfully. Trial Balance Difference: ₹${processed.tbSummary.diffCY}`, processed.tbSummary.isBalancedCY ? 'success' : 'warning');
    } else {
      // Open Mapping Modal for manual column assignment
      this.showColumnMappingModal(headers, autoMapping);
    }
  },

  /**
   * Handle Direct Clipboard Pasted Text
   */
  handlePastedText() {
    const input = document.getElementById('tb-paste-input');
    if (!input || !input.value.trim()) {
      this.showToast('Please paste your Trial Balance text first.', 'warning');
      return;
    }

    const text = input.value.trim();
    const rows = TBImporter.parseCSVText(text);

    if (rows.length < 2) {
      this.showToast('Pasted data contains insufficient rows.', 'warning');
      return;
    }

    this.state.rawImport = {
      fileName: 'Pasted Data',
      rows: rows,
      headerRowIdx: 0,
      headers: [],
      mapping: null
    };

    this.processUploadedRows(rows, 'Pasted Data');
  },

  /**
   * Handle Dual-File Selection (CY and PY separate files)
   */
  async handleDualFileSelected(file, type) {
    try {
      this.showToast(`Reading ${file.name}...`, 'info');
      const result = await TBImporter.readFile(file);
      const headerRowIdx = TBImporter.detectHeaderRow(result.rows);
      const headers = result.rows[headerRowIdx] || [];
      const autoMapping = TBImporter.autoDetectColumns(headers);

      let statusEl = null;
      if (type === 'cy') {
        this.state.dualFiles.cyFile = file;
        this.state.dualFiles.cyResult = TBImporter.processRows(result.rows, headerRowIdx, autoMapping, this.state.entity.businessActivity);
        statusEl = document.getElementById('cy-file-status');
        if (statusEl) statusEl.textContent = `✓ ${file.name} (${this.state.dualFiles.cyResult.ledgers.length} ledgers)`;
      } else {
        this.state.dualFiles.pyFile = file;
        this.state.dualFiles.pyResult = TBImporter.processRows(result.rows, headerRowIdx, autoMapping, this.state.entity.businessActivity);
        statusEl = document.getElementById('py-file-status');
        if (statusEl) statusEl.textContent = `✓ ${file.name} (${this.state.dualFiles.pyResult.ledgers.length} ledgers)`;
      }

      const mergeBtn = document.getElementById('btn-merge-dual');
      if (mergeBtn) {
        mergeBtn.disabled = !(this.state.dualFiles.cyResult && this.state.dualFiles.pyResult);
      }

      this.showToast(`Loaded ${type.toUpperCase()} file successfully.`, 'success');
    } catch (err) {
      this.showToast('Error reading file: ' + err.message, 'error');
    }
  },

  /**
   * Process and merge Dual Files
   */
  processDualFiles() {
    if (!this.state.dualFiles.cyResult || !this.state.dualFiles.pyResult) {
      this.showToast('Please select both CY and PY files before merging.', 'warning');
      return;
    }

    const mergedLedgers = TBImporter.mergeDualYearLedgers(
      this.state.dualFiles.cyResult,
      this.state.dualFiles.pyResult,
      this.state.entity.businessActivity
    );

    this.state.ledgers = mergedLedgers;
    this.state.tbSummary = {
      totalDebitCY: this.state.dualFiles.cyResult.tbSummary.totalDebitCY,
      totalCreditCY: this.state.dualFiles.cyResult.tbSummary.totalCreditCY,
      diffCY: this.state.dualFiles.cyResult.tbSummary.diffCY,
      isBalancedCY: this.state.dualFiles.cyResult.tbSummary.isBalancedCY,
      totalDebitPY: this.state.dualFiles.pyResult.tbSummary.totalDebitCY, // In pyResult, figures are under debitCY
      totalCreditPY: this.state.dualFiles.pyResult.tbSummary.totalCreditCY,
      diffPY: this.state.dualFiles.pyResult.tbSummary.diffCY,
      isBalancedPY: this.state.dualFiles.pyResult.tbSummary.isBalancedCY,
      ledgerCount: mergedLedgers.length,
      duplicates: []
    };

    this.logAudit('IMPORT_DUAL', `Merged CY (${this.state.dualFiles.cyFile.name}) and PY (${this.state.dualFiles.pyFile.name}) into ${mergedLedgers.length} comparative ledgers.`);
    this.recalculateStatements();
    this.renderAllViews();
    this.switchTab('mapping');
    this.showToast(`Merged ${mergedLedgers.length} ledgers successfully!`, 'success');
  },

  /**
   * Show Column Mapping Modal
   */
  showColumnMappingModal(headers, autoMapping) {
    const modal = document.getElementById('modal-column-mapping');
    if (!modal) return;

    const populateSelect = (selectId, selectedIdx) => {
      const select = document.getElementById(selectId);
      if (!select) return;
      select.innerHTML = '<option value="-1">-- Not Present / Exclude --</option>';
      headers.forEach((h, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = `Col ${idx + 1}: ${String(h || '').trim() || '[Empty]'}`;
        if (idx === selectedIdx) opt.selected = true;
        select.appendChild(opt);
      });
    };

    populateSelect('map-col-code', autoMapping.codeCol);
    populateSelect('map-col-name', autoMapping.nameCol);
    populateSelect('map-col-dr-cy', autoMapping.debitCyCol);
    populateSelect('map-col-cr-cy', autoMapping.creditCyCol);
    populateSelect('map-col-net-cy', autoMapping.netCyCol);
    populateSelect('map-col-dr-py', autoMapping.debitPyCol);
    populateSelect('map-col-cr-py', autoMapping.creditPyCol);
    populateSelect('map-col-net-py', autoMapping.netPyCol);

    // Render Preview Rows
    const previewContainer = document.getElementById('mapping-preview-table');
    if (previewContainer && this.state.rawImport) {
      const rows = this.state.rawImport.rows.slice(this.state.rawImport.headerRowIdx, this.state.rawImport.headerRowIdx + 6);
      let html = '<table class="financial-table" style="font-size:0.75rem;"><thead><tr>';
      headers.forEach((h, i) => html += `<th>Col ${i+1}: ${h}</th>`);
      html += '</tr></thead><tbody>';
      rows.slice(1).forEach(r => {
        html += '<tr>';
        headers.forEach((_, i) => html += `<td>${r[i] !== undefined ? r[i] : ''}</td>`);
        html += '</tr>';
      });
      html += '</tbody></table>';
      previewContainer.innerHTML = html;
    }

    modal.classList.add('active');
  },

  /**
   * Confirm Column Mapping and process data
   */
  confirmColumnMapping() {
    const mapping = {
      codeCol: parseInt(document.getElementById('map-col-code').value),
      nameCol: parseInt(document.getElementById('map-col-name').value),
      debitCyCol: parseInt(document.getElementById('map-col-dr-cy').value),
      creditCyCol: parseInt(document.getElementById('map-col-cr-cy').value),
      netCyCol: parseInt(document.getElementById('map-col-net-cy').value),
      debitPyCol: parseInt(document.getElementById('map-col-dr-py').value),
      creditPyCol: parseInt(document.getElementById('map-col-cr-py').value),
      netPyCol: parseInt(document.getElementById('map-col-net-py').value)
    };

    if (mapping.nameCol === -1) {
      this.showToast('Please select at least the Ledger / Account Name column.', 'warning');
      return;
    }

    const processed = TBImporter.processRows(
      this.state.rawImport.rows,
      this.state.rawImport.headerRowIdx,
      mapping,
      this.state.entity.businessActivity
    );

    this.state.ledgers = processed.ledgers;
    this.state.tbSummary = processed.tbSummary;
    this.closeModal('modal-column-mapping');

    this.logAudit('IMPORT', `Imported ${processed.ledgers.length} ledgers from ${this.state.rawImport.fileName}`);
    this.recalculateStatements();
    this.renderAllViews();
    this.switchTab('mapping');
    this.showToast(`Imported ${processed.ledgers.length} ledgers successfully. Trial Balance Difference: ₹${processed.tbSummary.diffCY}`, processed.tbSummary.isBalancedCY ? 'success' : 'warning');
  },

  /**
   * Load Embedded Sample Dataset
   */
  loadEmbeddedSample(sampleKey, silent = false) {
    if (typeof EmbeddedSamples === 'undefined' || !EmbeddedSamples[sampleKey]) {
      this.showToast('Sample dataset could not be found.', 'error');
      return;
    }

    const sample = EmbeddedSamples[sampleKey];
    this.state.entity.name = sample.companyName;
    this.state.entity.cin = sample.cin;
    this.state.entity.cyLabel = sample.cyLabel;
    this.state.entity.pyLabel = sample.pyLabel;
    this.state.entity.businessActivity = sample.businessActivity;

    this.syncSetupForm();

    const headerRowIdx = TBImporter.detectHeaderRow(sample.rows);
    const headers = sample.rows[headerRowIdx];
    const mapping = TBImporter.autoDetectColumns(headers);

    const processed = TBImporter.processRows(sample.rows, headerRowIdx, mapping, sample.businessActivity);
    this.state.ledgers = processed.ledgers;
    this.state.tbSummary = processed.tbSummary;

    this.logAudit('SAMPLE_LOAD', `Loaded sample dataset: ${sample.companyName}`);
    this.recalculateStatements();
    this.renderAllViews();

    if (!silent) {
      this.showToast(`Loaded ${sample.companyName} sample dataset. Ready for review.`, 'success');
      this.switchTab('preview');
    }
  },

  /**
   * Recalculate all Financial Statements and Audits
   */
  recalculateStatements() {
    if (!this.state.ledgers || this.state.ledgers.length === 0) return;

    const aggregated = FinStatEngine.aggregateByLineItem(this.state.ledgers);
    const pl = FinStatEngine.generateStatementOfPL(aggregated, this.state.entity.businessActivity);
    const bs = FinStatEngine.generateBalanceSheet(aggregated, pl);
    const audit = FinStatEngine.performAuditChecks(this.state.tbSummary, pl, bs, this.state.ledgers);

    this.state.reportData = {
      aggregated,
      pl,
      bs,
      audit,
      ledgers: this.state.ledgers
    };

    // Update Mapping Tab Badge
    const mapBadge = document.getElementById('tab-badge-mapping');
    if (mapBadge) mapBadge.textContent = this.state.ledgers.length;

    this.updateStatusBadges();
  },

  /**
   * Re-render all views whenever state changes
   */
  renderAllViews() {
    this.renderMappingTable();
    this.renderAuditDashboard();
    this.renderFinancialStatements();
    this.renderExportPreview();
  },

  /**
   * Reclassify all ledgers when Main Business Activity (MBA) is toggled or reset requested
   */
  reclassifyAllLedgers(forceResetOverrides = false) {
    this.state.ledgers.forEach(l => {
      if (!l.isCustomOverride || forceResetOverrides) {
        const balanceType = l.netCY >= 0 ? 'DEBIT' : 'CREDIT';
        const res = IndAS118Rules.classifyLedger(l.name, balanceType, this.state.entity.businessActivity);
        l.lineItemCode = res.lineItemCode;
        l.confidence = res.confidence;
        l.matchedKeyword = res.matchedKeyword;
        l.mbaNote = res.mbaNote || null;
        if (forceResetOverrides) l.isCustomOverride = false;
      }
    });

    if (forceResetOverrides) {
      this.logAudit('RESET_CLASSIFICATION', 'Reset all ledgers to auto-classification rules.');
      this.recalculateStatements();
      this.renderAllViews();
      this.showToast('Reset all classifications to default Ind AS 118 rules.', 'info');
    }
  },

  /**
   * Set Scale Multiplier (Absolute, Lakhs, Crores, Thousands)
   */
  setScale(scaleKey) {
    this.state.entity.scale = scaleKey;
    if (scaleKey === 'CRORES') {
      this.state.entity.scaleMultiplier = 10000000;
      this.state.entity.scaleLabel = 'In ₹ Crores';
    } else if (scaleKey === 'LAKHS') {
      this.state.entity.scaleMultiplier = 100000;
      this.state.entity.scaleLabel = 'In ₹ Lakhs';
    } else if (scaleKey === 'THOUSANDS') {
      this.state.entity.scaleMultiplier = 1000;
      this.state.entity.scaleLabel = 'In ₹ Thousands';
    } else {
      this.state.entity.scaleMultiplier = 1;
      this.state.entity.scaleLabel = 'In Absolute ₹ Figures';
    }
    this.recalculateStatements();
    this.renderFinancialStatements();
    this.renderExportPreview();
  },

  /**
   * Helper to format money based on active scale
   */
  formatMoney(val) {
    if (val === null || val === undefined || isNaN(val)) return '0.00';
    const scaledVal = val / this.state.entity.scaleMultiplier;
    return FinStatEngine.formatNumber(scaledVal);
  },

  /**
   * Sync Setup Form with State
   */
  syncSetupForm() {
    const e = this.state.entity;
    if (document.getElementById('setup-company-name')) document.getElementById('setup-company-name').value = e.name;
    if (document.getElementById('setup-cin')) document.getElementById('setup-cin').value = e.cin;
    if (document.getElementById('setup-cy-label')) document.getElementById('setup-cy-label').value = e.cyLabel;
    if (document.getElementById('setup-py-label')) document.getElementById('setup-py-label').value = e.pyLabel;
    if (document.getElementById('setup-mba')) document.getElementById('setup-mba').value = e.businessActivity;
    if (document.getElementById('setup-scale')) document.getElementById('setup-scale').value = e.scale;
    this.updateHeaderEntityPill();
  },

  updateHeaderEntityPill() {
    const el = document.getElementById('header-entity-name');
    if (el) el.textContent = this.state.entity.name || 'No Entity Selected';
  },

  updateStatusBadges() {
    const tb = this.state.tbSummary;
    const bs = this.state.reportData?.bs;

    const tbVal = document.getElementById('badge-tb-status');
    const tbSub = document.getElementById('badge-tb-sub');
    if (tbVal && tb) {
      tbVal.textContent = tb.isBalancedCY ? '₹ 0.00' : `₹ ${FinStatEngine.formatNumber(tb.diffCY)}`;
      tbVal.style.color = tb.isBalancedCY ? '#059669' : '#dc2626';
      if (tbSub) tbSub.textContent = tb.isBalancedCY ? 'Debits equal Credits (Balanced)' : 'Trial Balance Imbalance Detected!';
    }

    const bsVal = document.getElementById('badge-bs-status');
    const bsSub = document.getElementById('badge-bs-sub');
    if (bsVal && bs) {
      bsVal.textContent = bs.isBalancedCY ? 'Balanced' : `Diff: ₹ ${FinStatEngine.formatNumber(bs.bsDiffCY)}`;
      bsVal.style.color = bs.isBalancedCY ? '#059669' : '#dc2626';
      if (bsSub) bsSub.textContent = bs.isBalancedCY ? 'Total Assets = Equity + Liabilities' : 'Balance Sheet does not balance!';
    }

    const dot = document.getElementById('header-entity-dot');
    if (dot) {
      dot.style.backgroundColor = (tb && tb.isBalancedCY && bs && bs.isBalancedCY) ? '#10b981' : '#f59e0b';
    }
  },

  /**
   * Populate Bulk Assign Dropdown
   */
  populateBulkAssignDropdown() {
    const select = document.getElementById('bulk-assign-lineitem');
    if (!select) return;

    select.innerHTML = '<option value="">-- Choose Target Classification --</option>';
    for (const [code, meta] of Object.entries(IndAS118Rules.LINE_ITEMS)) {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = `[${meta.statement}-${meta.category}] ${meta.scheduleNote ? `(${meta.scheduleNote}) ` : ''}${meta.name}`;
      select.appendChild(opt);
    }
  },

  /**
   * Reset Filters in Module 3
   */
  resetFilters() {
    this.state.filter.search = '';
    this.state.filter.category = 'ALL';
    this.state.filter.confidence = 'ALL';
    this.state.filter.overrideOnly = false;

    if (document.getElementById('mapping-search')) document.getElementById('mapping-search').value = '';
    if (document.getElementById('mapping-category-filter')) document.getElementById('mapping-category-filter').value = 'ALL';
    if (document.getElementById('mapping-confidence-filter')) document.getElementById('mapping-confidence-filter').value = 'ALL';
    if (document.getElementById('mapping-override-filter')) document.getElementById('mapping-override-filter').checked = false;

    this.renderMappingTable();
  },

  /**
   * Toggle Select All Checkboxes in Module 3
   */
  toggleSelectAll(checked) {
    this.state.selectedLedgerIds.clear();
    const checkboxes = document.querySelectorAll('.ledger-checkbox');
    checkboxes.forEach(cb => {
      cb.checked = checked;
      if (checked) {
        this.state.selectedLedgerIds.add(cb.getAttribute('data-ledger-id'));
      }
    });

    const countEl = document.getElementById('selected-ledgers-count');
    if (countEl) countEl.textContent = this.state.selectedLedgerIds.size;

    const mainCb = document.getElementById('select-all-checkbox');
    if (mainCb) mainCb.checked = checked;
  },

  onLedgerCheckboxChange(ledgerId, checked) {
    if (checked) {
      this.state.selectedLedgerIds.add(ledgerId);
    } else {
      this.state.selectedLedgerIds.delete(ledgerId);
    }

    const countEl = document.getElementById('selected-ledgers-count');
    if (countEl) countEl.textContent = this.state.selectedLedgerIds.size;
  },

  /**
   * Apply Bulk Classification to selected ledgers
   */
  applyBulkClassification() {
    const targetCode = document.getElementById('bulk-assign-lineitem')?.value;
    if (!targetCode) {
      this.showToast('Please select a target classification line item.', 'warning');
      return;
    }

    if (this.state.selectedLedgerIds.size === 0) {
      this.showToast('Please select at least one ledger using the checkboxes.', 'warning');
      return;
    }

    let count = 0;
    this.state.ledgers.forEach(l => {
      if (this.state.selectedLedgerIds.has(l.id)) {
        l.lineItemCode = targetCode;
        l.isCustomOverride = true;
        l.confidence = 100;
        count++;
      }
    });

    this.logAudit('BULK_RECLASSIFICATION', `Bulk reclassified ${count} ledgers to ${targetCode}`);
    this.recalculateStatements();
    this.renderAllViews();
    this.showToast(`Updated ${count} ledgers to ${targetCode}`, 'success');
  },

  /**
   * Render Mapping Workstation Table
   */
  renderMappingTable() {
    const container = document.getElementById('mapping-table-body');
    if (!container) return;

    if (!this.state.ledgers || this.state.ledgers.length === 0) {
      container.innerHTML = `<tr><td colspan="8" class="text-center" style="padding:2rem; color:#64748b;">No trial balance loaded yet. Please import a file or click <strong>Sample Mfg</strong> in the top header.</td></tr>`;
      document.getElementById('mapping-filtered-count').textContent = '0 ledgers loaded';
      return;
    }

    let filtered = this.state.ledgers.filter(l => {
      // 1. Search filter
      if (this.state.filter.search) {
        const s = this.state.filter.search;
        if (!l.name.toLowerCase().includes(s) && !l.code.toLowerCase().includes(s)) return false;
      }

      // 2. Category filter
      if (this.state.filter.category !== 'ALL') {
        const item = IndAS118Rules.LINE_ITEMS[l.lineItemCode];
        if (!item) return false;
        if (item.category !== this.state.filter.category && item.statement !== this.state.filter.category) {
          // Special group checks
          if (this.state.filter.category === 'OCI' && item.statement !== 'OCI') return false;
          if (this.state.filter.category === 'INCOME_TAXES' && item.category !== 'INCOME_TAXES') return false;
          if (this.state.filter.category === 'DISCONTINUED' && item.category !== 'DISCONTINUED') return false;
          if (this.state.filter.category !== 'OCI' && this.state.filter.category !== 'INCOME_TAXES' && this.state.filter.category !== 'DISCONTINUED') return false;
        }
      }

      // 3. Confidence filter
      if (this.state.filter.confidence !== 'ALL') {
        if (this.state.filter.confidence === 'HIGH' && l.confidence < 80) return false;
        if (this.state.filter.confidence === 'MED' && (l.confidence < 50 || l.confidence >= 80)) return false;
        if (this.state.filter.confidence === 'LOW' && l.confidence >= 50) return false;
      }

      // 4. Override filter
      if (this.state.filter.overrideOnly && !l.isCustomOverride) {
        return false;
      }

      return true;
    });

    document.getElementById('mapping-filtered-count').textContent = `Showing ${filtered.length} of ${this.state.ledgers.length} ledgers`;

    let html = '';
    filtered.forEach(l => {
      const item = IndAS118Rules.LINE_ITEMS[l.lineItemCode] || { name: l.lineItemCode, category: 'UNKNOWN', scheduleNote: '' };
      const confBadgeClass = l.confidence >= 80 ? 'badge-success' : l.confidence >= 50 ? 'badge-warning' : 'badge-danger';
      const isSelected = this.state.selectedLedgerIds.has(l.id);

      html += `
        <tr>
          <td class="text-center">
            <input type="checkbox" class="ledger-checkbox" data-ledger-id="${l.id}" ${isSelected ? 'checked' : ''} onchange="FinStatApp.onLedgerCheckboxChange('${l.id}', this.checked)">
          </td>
          <td><span class="tabular-nums" style="font-weight:600;">${l.code}</span></td>
          <td>
            <strong>${l.name}</strong>
            ${l.mbaNote ? `<div style="font-size:0.7rem; color:#2563eb; margin-top:2px;">ℹ️ ${l.mbaNote}</div>` : ''}
            ${l.userNotes ? `<div style="font-size:0.7rem; color:#059669; margin-top:2px;">📝 Note: ${l.userNotes}</div>` : ''}
          </td>
          <td class="text-right tabular-nums">${FinStatEngine.formatNumber(l.netCY)}</td>
          <td class="text-right tabular-nums">${FinStatEngine.formatNumber(l.netPY)}</td>
          <td>
            <select class="form-control form-select" style="font-size:0.75rem; padding:0.25rem 0.5rem;" onchange="FinStatApp.updateLedgerClassification('${l.id}', this.value)">
              ${Object.entries(IndAS118Rules.LINE_ITEMS).map(([code, meta]) => `
                <option value="${code}" ${code === l.lineItemCode ? 'selected' : ''}>
                  [${meta.statement}-${meta.category}] ${meta.scheduleNote ? `(${meta.scheduleNote})` : ''} ${meta.name}
                </option>
              `).join('')}
            </select>
          </td>
          <td class="text-center">
            <span class="badge ${confBadgeClass}">${l.confidence}%</span>
            ${l.isCustomOverride ? '<span class="badge badge-info" style="margin-left:4px;">CA Override</span>' : ''}
          </td>
          <td class="text-center">
            <button class="btn btn-secondary btn-sm" onclick="FinStatApp.openLedgerNoteModal('${l.id}')">Note</button>
          </td>
        </tr>
      `;
    });

    container.innerHTML = html;
  },

  /**
   * Update Ledger Classification manually from dropdown
   */
  updateLedgerClassification(ledgerId, newLineItemCode) {
    const ledger = this.state.ledgers.find(l => l.id === ledgerId);
    if (!ledger) return;

    const oldCode = ledger.lineItemCode;
    ledger.lineItemCode = newLineItemCode;
    ledger.isCustomOverride = true;
    ledger.confidence = 100; // CA verified

    this.logAudit('RECLASSIFICATION', `Reclassified "${ledger.name}" (${ledger.code}) from ${oldCode} to ${newLineItemCode}`);
    this.recalculateStatements();
    this.renderAllViews();
    this.showToast(`Updated classification for ${ledger.name}`, 'info');
  },

  /**
   * Open CA Note Modal
   */
  openLedgerNoteModal(ledgerId) {
    const ledger = this.state.ledgers.find(l => l.id === ledgerId);
    if (!ledger) return;

    const modal = document.getElementById('modal-ledger-note');
    if (!modal) return;

    document.getElementById('note-ledger-title').textContent = `${ledger.code} - ${ledger.name}`;
    document.getElementById('note-ledger-input').value = ledger.userNotes || '';
    modal.setAttribute('data-ledger-id', ledgerId);
    modal.classList.add('active');
  },

  saveLedgerNote() {
    const modal = document.getElementById('modal-ledger-note');
    const ledgerId = modal.getAttribute('data-ledger-id');
    const ledger = this.state.ledgers.find(l => l.id === ledgerId);
    if (ledger) {
      ledger.userNotes = document.getElementById('note-ledger-input').value.trim();
      this.logAudit('NOTE_ADDED', `Added note to ledger "${ledger.name}"`);
      this.recalculateStatements();
      this.renderMappingTable();
    }
    this.closeModal('modal-ledger-note');
  },

  /**
   * Render Audit & Validation Dashboard (Module 4)
   */
  renderAuditDashboard() {
    if (!this.state.reportData || !this.state.reportData.audit) return;
    const audit = this.state.reportData.audit;

    const checksContainer = document.getElementById('audit-checks-container');
    if (checksContainer) {
      let html = '';
      audit.checks.forEach(c => {
        const badgeClass = c.status === 'PASS' ? 'pass' : c.status === 'FAIL' ? 'fail' : 'warn';
        html += `
          <div class="stat-card" style="margin-bottom:0.75rem;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <strong>${c.test}</strong>
              <span class="stat-badge ${badgeClass}">${c.status}</span>
            </div>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">${c.detail}</div>
          </div>
        `;
      });
      checksContainer.innerHTML = html;
    }

    const warningsContainer = document.getElementById('audit-warnings-container');
    if (warningsContainer) {
      if (audit.warnings.length === 0) {
        warningsContainer.innerHTML = '<div style="color:#059669; font-size:0.85rem; padding:1rem;">✅ No anomaly flags or unusual balances detected. All ledger classifications pass standard CA sanity checks.</div>';
      } else {
        let html = '';
        audit.warnings.forEach(w => {
          html += `
            <div style="background-color:#fffbeb; border-left:4px solid #f59e0b; padding:0.75rem; margin-bottom:0.5rem; border-radius:4px; font-size:0.8rem;">
              <strong>[${w.type} - ${w.severity}] ${w.ledger} (${w.code})</strong>
              <div style="margin-top:2px; color:#78350f;">${w.issue}</div>
            </div>
          `;
        });
        warningsContainer.innerHTML = html;
      }
    }

    // Render Audit Trail Log
    const logContainer = document.getElementById('audit-trail-container');
    if (logContainer) {
      if (this.state.auditTrail.length === 0) {
        logContainer.innerHTML = '<div style="color:#94a3b8; font-size:0.75rem; padding:0.5rem;">No user adjustments recorded yet.</div>';
      } else {
        let html = '<ul style="list-style:none; font-size:0.75rem;">';
        this.state.auditTrail.slice().reverse().forEach(entry => {
          html += `
            <li style="padding:0.4rem 0; border-bottom:1px solid #e2e8f0;">
              <span style="color:#64748b; font-family:monospace;">[${entry.time}]</span>
              <strong style="color:#1e3a8a; margin:0 4px;">${entry.action}:</strong>
              <span>${entry.details}</span>
            </li>
          `;
        });
        html += '</ul>';
        logContainer.innerHTML = html;
      }
    }
  },

  /**
   * Render Interactive Financial Statements (P&L, Balance Sheet, Schedules) (Module 5)
   */
  renderFinancialStatements() {
    if (!this.state.reportData) return;
    const pl = this.state.reportData.pl;
    const bs = this.state.reportData.bs;
    const aggregated = this.state.reportData.aggregated;
    const entity = this.state.entity;

    // 1. RENDER STATEMENT OF PROFIT AND LOSS
    const plContainer = document.getElementById('pl-table-body');
    if (plContainer) {
      plContainer.innerHTML = `
        <tr class="row-category"><td colspan="4">I. OPERATING CATEGORY</td></tr>
        <tr>
          <td class="indent-1">Revenue from Operations</td>
          <td class="text-center">18</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.operating.revOps.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.operating.revOps.py)}</td>
        </tr>
        <tr>
          <td class="indent-1">Other Operating Revenue</td>
          <td class="text-center">18.1</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.operating.revOtherOp.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.operating.revOtherOp.py)}</td>
        </tr>
        <tr class="row-subtotal">
          <td>TOTAL OPERATING REVENUE (A)</td>
          <td></td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.operating.totalOpRevenueCY)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.operating.totalOpRevenuePY)}</td>
        </tr>
        <tr>
          <td class="indent-1">Cost of Materials Consumed</td>
          <td class="text-center">19</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.operating.costMat.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.operating.costMat.py)}</td>
        </tr>
        <tr>
          <td class="indent-1">Purchases of Stock-in-Trade</td>
          <td class="text-center">20</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.operating.purchStock.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.operating.purchStock.py)}</td>
        </tr>
        <tr>
          <td class="indent-1">Changes in Inventories of FG, WIP & Stock-in-Trade</td>
          <td class="text-center">21</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.operating.chgInv.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.operating.chgInv.py)}</td>
        </tr>
        <tr>
          <td class="indent-1">Employee Benefits Expense</td>
          <td class="text-center">22</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.operating.empBen.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.operating.empBen.py)}</td>
        </tr>
        <tr>
          <td class="indent-1">Depreciation and Amortisation Expense</td>
          <td class="text-center">23</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.operating.depAmort.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.operating.depAmort.py)}</td>
        </tr>
        <tr>
          <td class="indent-1">Other Operating Expenses</td>
          <td class="text-center">24</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.operating.otherOpExp.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.operating.otherOpExp.py)}</td>
        </tr>
        <tr class="row-subtotal">
          <td>TOTAL OPERATING EXPENSES (B)</td>
          <td></td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.operating.totalOpExpensesCY)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.operating.totalOpExpensesPY)}</td>
        </tr>
        <tr class="row-grandtotal" style="background-color:#dbeafe; color:#1e3a8a;">
          <td>OPERATING PROFIT OR LOSS (I = A - B) [MANDATORY SUBTOTAL]</td>
          <td></td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.operating.operatingProfitCY)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.operating.operatingProfitPY)}</td>
        </tr>

        <tr class="row-category"><td colspan="4">II. INVESTING CATEGORY</td></tr>
        ${pl.investing.invInterest ? `
        <tr>
          <td class="indent-1">Interest Income from Investments and Deposits</td>
          <td class="text-center">25</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.investing.invInterest.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.investing.invInterest.py)}</td>
        </tr>` : ''}
        ${pl.investing.invDiv ? `
        <tr>
          <td class="indent-1">Dividend Income</td>
          <td class="text-center">25.1</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.investing.invDiv.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.investing.invDiv.py)}</td>
        </tr>` : ''}
        ${pl.investing.invGain ? `
        <tr>
          <td class="indent-1">Net Gain / (Loss) on Financial Assets at FVTPL</td>
          <td class="text-center">25.2</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.investing.invGain.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.investing.invGain.py)}</td>
        </tr>` : ''}
        ${pl.investing.invProp ? `
        <tr>
          <td class="indent-1">Income from Investment Property</td>
          <td class="text-center">25.3</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.investing.invProp.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.investing.invProp.py)}</td>
        </tr>` : ''}
        <tr>
          <td class="indent-1">Share of Profit / (Loss) of Associates & Joint Ventures</td>
          <td class="text-center">25.4</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.investing.equityMethod.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.investing.equityMethod.py)}</td>
        </tr>
        <tr class="row-subtotal">
          <td>TOTAL INVESTING INCOME / (LOSS) (II)</td>
          <td></td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.investing.totalInvestingCY)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.investing.totalInvestingPY)}</td>
        </tr>
        <tr class="row-grandtotal" style="background-color:#e0f2fe; color:#0369a1;">
          <td>PROFIT BEFORE FINANCING & INCOME TAXES (I + II) [MANDATORY SUBTOTAL]</td>
          <td></td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.pbitCY)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.pbitPY)}</td>
        </tr>

        <tr class="row-category"><td colspan="4">III. FINANCING CATEGORY</td></tr>
        ${pl.financing.finBorrow ? `
        <tr>
          <td class="indent-1">Interest Expense on Borrowings</td>
          <td class="text-center">26</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.financing.finBorrow.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.financing.finBorrow.py)}</td>
        </tr>` : ''}
        <tr>
          <td class="indent-1">Interest Expense on Lease Liabilities (Ind AS 116)</td>
          <td class="text-center">26.1</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.financing.finLease.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.financing.finLease.py)}</td>
        </tr>
        <tr>
          <td class="indent-1">Other Finance Costs & Unwinding of Discount</td>
          <td class="text-center">26.2</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.financing.finOther.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.financing.finOther.py)}</td>
        </tr>
        <tr class="row-subtotal">
          <td>TOTAL FINANCING COSTS (III)</td>
          <td></td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.financing.totalFinancingCY)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.financing.totalFinancingPY)}</td>
        </tr>
        <tr class="row-grandtotal" style="background-color:#dbeafe; color:#1e3a8a;">
          <td>PROFIT BEFORE TAX (PBT) [MANDATORY SUBTOTAL]</td>
          <td></td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.pbtCY)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.pbtPY)}</td>
        </tr>

        <tr class="row-category"><td colspan="4">IV. TAX EXPENSE & DISCONTINUED OPERATIONS</td></tr>
        <tr>
          <td class="indent-1">Current Tax Expense</td>
          <td class="text-center">27</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.tax.taxCurrent.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.tax.taxCurrent.py)}</td>
        </tr>
        <tr>
          <td class="indent-1">Deferred Tax Charge / (Credit)</td>
          <td class="text-center">27.1</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.tax.taxDeferred.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.tax.taxDeferred.py)}</td>
        </tr>
        <tr>
          <td class="indent-1">Profit / (Loss) from Discontinued Operations (Net of Tax)</td>
          <td class="text-center">28</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.discOps.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.discOps.py)}</td>
        </tr>
        <tr class="row-grandtotal" style="background-color:#d1fae5; color:#065f46;">
          <td>PROFIT FOR THE PERIOD (PAT)</td>
          <td></td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.patCY)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.patPY)}</td>
        </tr>

        <tr class="row-category"><td colspan="4">V. OTHER COMPREHENSIVE INCOME (OCI)</td></tr>
        <tr>
          <td class="indent-1">Items that will not be reclassified to profit or loss</td>
          <td class="text-center">29</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.oci.ociNoReclass.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.oci.ociNoReclass.py)}</td>
        </tr>
        <tr>
          <td class="indent-1">Items that will be reclassified to profit or loss</td>
          <td class="text-center">30</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.oci.ociReclass.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.oci.ociReclass.py)}</td>
        </tr>
        <tr class="row-grandtotal" style="background-color:#a7f3d0; color:#064e3b;">
          <td>TOTAL COMPREHENSIVE INCOME FOR THE PERIOD</td>
          <td></td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.totalCompIncomeCY)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(pl.totalCompIncomePY)}</td>
        </tr>

        <tr style="background-color:#f8fafc;"><td colspan="4" style="font-weight:700; color:#475569; padding-top:12px;">📊 Management-defined Performance Measures (MPM Disclosures)</td></tr>
        <tr>
          <td class="indent-1"><strong>Operating EBITDA</strong> (Operating Profit + Depr/Amort)</td>
          <td class="text-center">-</td>
          <td class="text-right tabular-nums" style="font-weight:700;">${this.formatMoney(pl.mpm.operatingEbitdaCY)}</td>
          <td class="text-right tabular-nums" style="font-weight:700;">${this.formatMoney(pl.mpm.operatingEbitdaPY)}</td>
        </tr>
      `;
    }

    // 2. RENDER STATEMENT OF FINANCIAL POSITION (BALANCE SHEET)
    const bsContainer = document.getElementById('bs-table-body');
    if (bsContainer) {
      bsContainer.innerHTML = `
        <tr class="row-category"><td colspan="4">I. ASSETS</td></tr>
        <tr style="background-color:#f8fafc; font-weight:600;"><td colspan="4">(1) Non-Current Assets</td></tr>
        <tr>
          <td class="indent-1">Property, Plant and Equipment</td>
          <td class="text-center">1</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.nonCurrentAssets.ppe.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.nonCurrentAssets.ppe.py)}</td>
        </tr>
        <tr>
          <td class="indent-1">Capital Work-in-Progress</td>
          <td class="text-center">1.1</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.nonCurrentAssets.cwip.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.nonCurrentAssets.cwip.py)}</td>
        </tr>
        <tr>
          <td class="indent-1">Investment Property</td>
          <td class="text-center">2</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.nonCurrentAssets.invProp.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.nonCurrentAssets.invProp.py)}</td>
        </tr>
        <tr>
          <td class="indent-1">Right-of-Use Assets</td>
          <td class="text-center">3</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.nonCurrentAssets.rouAsset.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.nonCurrentAssets.rouAsset.py)}</td>
        </tr>
        <tr>
          <td class="indent-1">Goodwill & Other Intangibles</td>
          <td class="text-center">4</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.nonCurrentAssets.intangible.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.nonCurrentAssets.intangible.py)}</td>
        </tr>
        <tr>
          <td class="indent-1">Non-Current Financial Assets - Investments</td>
          <td class="text-center">5</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.nonCurrentAssets.ncFinInv.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.nonCurrentAssets.ncFinInv.py)}</td>
        </tr>
        <tr>
          <td class="indent-1">Non-Current Financial Assets - Loans</td>
          <td class="text-center">6</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.nonCurrentAssets.ncFinLoans.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.nonCurrentAssets.ncFinLoans.py)}</td>
        </tr>
        <tr>
          <td class="indent-1">Deferred Tax Assets (Net)</td>
          <td class="text-center">8</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.nonCurrentAssets.dta.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.nonCurrentAssets.dta.py)}</td>
        </tr>
        <tr>
          <td class="indent-1">Other Non-Current Assets</td>
          <td class="text-center">10</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.nonCurrentAssets.otherNcAsset.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.nonCurrentAssets.otherNcAsset.py)}</td>
        </tr>
        <tr class="row-subtotal">
          <td>TOTAL NON-CURRENT ASSETS</td>
          <td></td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.nonCurrentAssets.totalNonCurrentAssetsCY)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.nonCurrentAssets.totalNonCurrentAssetsPY)}</td>
        </tr>

        <tr style="background-color:#f8fafc; font-weight:600;"><td colspan="4">(2) Current Assets</td></tr>
        <tr>
          <td class="indent-1">Inventories</td>
          <td class="text-center">11</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.currentAssets.inventories.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.currentAssets.inventories.py)}</td>
        </tr>
        <tr>
          <td class="indent-1">Current Investments</td>
          <td class="text-center">12</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.currentAssets.curFinInv.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.currentAssets.curFinInv.py)}</td>
        </tr>
        <tr>
          <td class="indent-1">Trade Receivables</td>
          <td class="text-center">13</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.currentAssets.tradeRec.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.currentAssets.tradeRec.py)}</td>
        </tr>
        <tr>
          <td class="indent-1">Cash and Cash Equivalents</td>
          <td class="text-center">14</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.currentAssets.cashBank.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.currentAssets.cashBank.py)}</td>
        </tr>
        <tr>
          <td class="indent-1">Other Bank Balances</td>
          <td class="text-center">14.1</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.currentAssets.otherBankBal.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.currentAssets.otherBankBal.py)}</td>
        </tr>
        <tr>
          <td class="indent-1">Other Current Assets & Advance Tax</td>
          <td class="text-center">17</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.currentAssets.otherCurAsset.cy + bs.currentAssets.curTaxAsset.cy + bs.currentAssets.curFinOther.cy + bs.currentAssets.curFinLoans.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.currentAssets.otherCurAsset.py + bs.currentAssets.curTaxAsset.py + bs.currentAssets.curFinOther.py + bs.currentAssets.curFinLoans.py)}</td>
        </tr>
        <tr class="row-subtotal">
          <td>TOTAL CURRENT ASSETS</td>
          <td></td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.currentAssets.totalCurrentAssetsCY)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.currentAssets.totalCurrentAssetsPY)}</td>
        </tr>
        <tr class="row-grandtotal" style="background-color:#dbeafe; color:#1e3a8a;">
          <td>TOTAL ASSETS</td>
          <td></td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.totalAssetsCY)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.totalAssetsPY)}</td>
        </tr>

        <tr class="row-category"><td colspan="4">II. EQUITY AND LIABILITIES</td></tr>
        <tr style="background-color:#f8fafc; font-weight:600;"><td colspan="4">(1) Equity</td></tr>
        <tr>
          <td class="indent-1">Equity Share Capital</td>
          <td class="text-center">31</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.equity.equityCap.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.equity.equityCap.py)}</td>
        </tr>
        <tr>
          <td class="indent-1">Other Equity</td>
          <td class="text-center">32</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.equity.otherEquity.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.equity.otherEquity.py)}</td>
        </tr>
        <tr class="row-subtotal">
          <td>TOTAL EQUITY</td>
          <td></td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.equity.totalEquityCY)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.equity.totalEquityPY)}</td>
        </tr>

        <tr style="background-color:#f8fafc; font-weight:600;"><td colspan="4">(2) Non-Current Liabilities</td></tr>
        <tr>
          <td class="indent-1">Borrowings (Term Loans / Debentures)</td>
          <td class="text-center">33</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.nonCurrentLiabilities.ncBorrow.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.nonCurrentLiabilities.ncBorrow.py)}</td>
        </tr>
        <tr>
          <td class="indent-1">Lease Liabilities (Ind AS 116)</td>
          <td class="text-center">34</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.nonCurrentLiabilities.ncLeaseLiab.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.nonCurrentLiabilities.ncLeaseLiab.py)}</td>
        </tr>
        <tr>
          <td class="indent-1">Provisions & Other Non-Current Liabilities</td>
          <td class="text-center">36-38</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.nonCurrentLiabilities.ncProv.cy + bs.nonCurrentLiabilities.dtl.cy + bs.nonCurrentLiabilities.otherNcLiab.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.nonCurrentLiabilities.ncProv.py + bs.nonCurrentLiabilities.dtl.py + bs.nonCurrentLiabilities.otherNcLiab.py)}</td>
        </tr>
        <tr class="row-subtotal">
          <td>TOTAL NON-CURRENT LIABILITIES</td>
          <td></td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.nonCurrentLiabilities.totalNonCurrentLiabCY)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.nonCurrentLiabilities.totalNonCurrentLiabPY)}</td>
        </tr>

        <tr style="background-color:#f8fafc; font-weight:600;"><td colspan="4">(3) Current Liabilities</td></tr>
        <tr>
          <td class="indent-1">Borrowings (Working Capital & CC)</td>
          <td class="text-center">39</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.currentLiabilities.curBorrow.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.currentLiabilities.curBorrow.py)}</td>
        </tr>
        <tr>
          <td class="indent-1">Lease Liabilities (Current)</td>
          <td class="text-center">40</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.currentLiabilities.curLeaseLiab.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.currentLiabilities.curLeaseLiab.py)}</td>
        </tr>
        <tr>
          <td class="indent-1">Trade Payables - MSME Enterprises</td>
          <td class="text-center">41</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.currentLiabilities.tradePayMsme.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.currentLiabilities.tradePayMsme.py)}</td>
        </tr>
        <tr>
          <td class="indent-1">Trade Payables - Other Creditors</td>
          <td class="text-center">41.1</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.currentLiabilities.tradePayOther.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.currentLiabilities.tradePayOther.py)}</td>
        </tr>
        <tr>
          <td class="indent-1">Other Financial & Current Liabilities, Provisions</td>
          <td class="text-center">42-45</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.currentLiabilities.curFinOther.cy + bs.currentLiabilities.otherCurLiab.cy + bs.currentLiabilities.curProv.cy + bs.currentLiabilities.curTaxLiab.cy)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.currentLiabilities.curFinOther.py + bs.currentLiabilities.otherCurLiab.py + bs.currentLiabilities.curProv.py + bs.currentLiabilities.curTaxLiab.py)}</td>
        </tr>
        <tr class="row-subtotal">
          <td>TOTAL CURRENT LIABILITIES</td>
          <td></td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.currentLiabilities.totalCurrentLiabCY)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.currentLiabilities.totalCurrentLiabPY)}</td>
        </tr>
        <tr class="row-grandtotal" style="background-color:#dbeafe; color:#1e3a8a;">
          <td>TOTAL EQUITY AND LIABILITIES</td>
          <td></td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.totalEquityAndLiabilitiesCY)}</td>
          <td class="text-right tabular-nums">${this.formatMoney(bs.totalEquityAndLiabilitiesPY)}</td>
        </tr>
      `;
    }

    // 3. RENDER EXPANDABLE SUPPORTING SCHEDULES (DRILL-DOWN)
    const schedulesContainer = document.getElementById('schedules-accordion-container');
    if (schedulesContainer) {
      let html = '';
      for (const [code, item] of Object.entries(aggregated)) {
        if (!item.ledgers || item.ledgers.length === 0) continue;

        html += `
          <details style="margin-bottom:0.75rem; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden;">
            <summary style="background-color:#f8fafc; padding:0.65rem 1rem; cursor:pointer; font-weight:600; font-size:0.85rem; display:flex; justify-content:space-between; align-items:center;">
              <div>
                <span class="badge badge-info" style="margin-right:8px;">${item.scheduleNote || code}</span>
                <strong>${item.name}</strong> (${item.ledgers.length} ledgers)
              </div>
              <div style="font-family:monospace; font-weight:700;">
                CY: ₹${this.formatMoney(item.cyAmount)} | PY: ₹${this.formatMoney(item.pyAmount)}
              </div>
            </summary>
            <div style="padding:0.75rem;">
              <table class="financial-table" style="font-size:0.75rem;">
                <thead>
                  <tr>
                    <th>Ledger Code</th>
                    <th>Ledger Description</th>
                    <th class="text-right">CY Amount (${entity.scaleLabel})</th>
                    <th class="text-right">PY Amount (${entity.scaleLabel})</th>
                    <th>Classification Type</th>
                  </tr>
                </thead>
                <tbody>
                  ${item.ledgers.map(l => `
                    <tr>
                      <td class="tabular-nums font-mono">${l.code}</td>
                      <td>${l.name}</td>
                      <td class="text-right tabular-nums">${this.formatMoney(l.cyCalculated)}</td>
                      <td class="text-right tabular-nums">${this.formatMoney(l.pyCalculated)}</td>
                      <td>${l.isCustomOverride ? '<span class="badge badge-info">CA Manual Override</span>' : '<span class="badge badge-neutral">Auto Classify</span>'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </details>
        `;
      }
      schedulesContainer.innerHTML = html;
    }
  },

  /**
   * Render Export Preview Panel (Module 6)
   */
  renderExportPreview() {
    const infoContainer = document.getElementById('export-summary-box');
    if (!infoContainer || !this.state.reportData) return;

    const pl = this.state.reportData.pl;
    const bs = this.state.reportData.bs;

    infoContainer.innerHTML = `
      <div style="line-height:1.6;">
        <p><strong>Entity Name:</strong> ${this.state.entity.name}</p>
        <p><strong>CIN:</strong> ${this.state.entity.cin || 'N/A'}</p>
        <p><strong>Framework:</strong> Ind AS 118 (Presentation and Disclosure in Financial Statements)</p>
        <p><strong>Main Business Activity:</strong> ${this.state.entity.businessActivity}</p>
        <p><strong>Reporting Periods:</strong> ${this.state.entity.cyLabel} (Current) & ${this.state.entity.pyLabel} (Previous)</p>
        <p><strong>Total Assets:</strong> ₹${this.formatMoney(bs.totalAssetsCY)} | <strong>Net Profit (PAT):</strong> ₹${this.formatMoney(pl.patCY)}</p>
        <p><strong>Audit Status:</strong> <span style="color:#059669; font-weight:700;">${bs.isBalancedCY ? 'Balanced' : 'Imbalance Detected'}</span></p>
      </div>
    `;
  },

  /**
   * Triggers
   */
  triggerExcelExport() {
    if (!this.state.reportData) {
      this.showToast('Please import or load financial data first.', 'warning');
      return;
    }
    FinStatExporter.exportToExcel(this.state.reportData, this.state.entity);
    this.showToast('Excel workbook generated successfully!', 'success');
  },

  triggerPDFExport() {
    if (!this.state.reportData) {
      this.showToast('Please import or load financial data first.', 'warning');
      return;
    }
    FinStatExporter.exportToPDF(this.state.reportData, this.state.entity);
    this.showToast('PDF financial statements downloaded!', 'success');
  },

  triggerCSVExport() {
    if (!this.state.reportData) {
      this.showToast('Please import or load financial data first.', 'warning');
      return;
    }
    FinStatExporter.exportToCSV(this.state.reportData, this.state.entity);
    this.showToast('CSV export downloaded!', 'success');
  },

  triggerPrint() {
    this.switchTab('preview');
    setTimeout(() => {
      window.print();
    }, 250);
  },

  /**
   * Audit Trail Logger
   */
  logAudit(action, details) {
    const entry = {
      time: new Date().toLocaleTimeString(),
      action,
      details
    };
    this.state.auditTrail.push(entry);
  },

  /**
   * Modal helper
   */
  closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('active');
  },

  /**
   * Toast notification helper
   */
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
};

if (typeof window !== 'undefined') {
  window.FinStatApp = FinStatApp;
}

// Auto initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  FinStatApp.init();
});
