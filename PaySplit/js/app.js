/**
 * PaySplit – app.js
 * UPI Payment Splitter PWA
 * Author: Smit Parekh
 * https://www.youtube.com/@TheParekhShow
 *
 * All monetary calculations use integer paise (1 INR = 100 paise)
 * to prevent floating-point rounding errors.
 */

'use strict';

/* ============================================================
   CONSTANTS & STATE
   ============================================================ */
const LS_KEY = 'paysplit_session';

let splitMode = 'auto';          // 'auto' | 'manual'
let generatedData = null;        // holds last generation result
let deferredInstallPrompt = null;

/* ============================================================
   UTILITY FUNCTIONS
   ============================================================ */

/** Format paise integer as ₹X.XX */
function formatINR(paise) {
  const rupees = paise / 100;
  return '₹' + rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Parse rupee string/number → paise integer (rounds to nearest paise) */
function toPaise(rupeesStr) {
  const val = parseFloat(rupeesStr);
  if (isNaN(val)) return NaN;
  return Math.round(val * 100);
}

/** Validate a UPI VPA string */
function isValidUPI(upi) {
  return /^[a-zA-Z0-9.\-_+]+@[a-zA-Z0-9]+$/.test(upi.trim());
}

/** Build a UPI payment URI */
function buildUpiUri(upiId, payeeName, amountRupees, description, txnRef) {
  const params = new URLSearchParams();
  params.set('pa', upiId.trim());
  params.set('pn', payeeName.trim());
  params.set('am', amountRupees.toFixed(2));
  params.set('cu', 'INR');
  if (description && description.trim()) params.set('tn', description.trim());
  if (txnRef) params.set('tr', txnRef);
  return 'upi://pay?' + params.toString();
}

/** Show a toast notification */
let toastTimeout;
function showToast(msg, type = 'info', duration = 3000) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast show ' + type;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

/** Copy text to clipboard */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!', 'success');
  } catch {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Copied!', 'success');
  }
}

/** Generate a short transaction reference ID */
function genTxnRef(index) {
  const ts = Date.now().toString(36).toUpperCase();
  return `PS${ts}${(index + 1).toString().padStart(2, '0')}`;
}

/* ============================================================
   LOCAL STORAGE
   ============================================================ */
function saveSession() {
  try {
    const data = {
      totalAmount: document.getElementById('totalAmount').value,
      upiId:       document.getElementById('upiId').value,
      payeeName:   document.getElementById('payeeName').value,
      description: document.getElementById('description').value,
      numSplits:   document.getElementById('numSplits').value,
      splitMode,
      theme:       document.body.classList.contains('dark-mode') ? 'dark' : 'light',
    };
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {}
}

function loadSession() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.totalAmount) document.getElementById('totalAmount').value = data.totalAmount;
    if (data.upiId)       document.getElementById('upiId').value       = data.upiId;
    if (data.payeeName)   document.getElementById('payeeName').value   = data.payeeName;
    if (data.description) document.getElementById('description').value = data.description;
    if (data.numSplits)   document.getElementById('numSplits').value   = data.numSplits;
    if (data.splitMode)   setSplitMode(data.splitMode);
    if (data.theme === 'dark') document.body.classList.replace('light-mode', 'dark-mode');
  } catch {}
}

function clearSession() {
  try { localStorage.removeItem(LS_KEY); } catch {}
}

/* ============================================================
   SPLIT MODE
   ============================================================ */
function setSplitMode(mode) {
  splitMode = mode;
  document.getElementById('autoSplitBtn').classList.toggle('active', mode === 'auto');
  document.getElementById('manualSplitBtn').classList.toggle('active', mode === 'manual');
  const manualArea = document.getElementById('manualAllocArea');
  if (mode === 'manual') {
    manualArea.classList.remove('hidden');
    renderManualFields();
  } else {
    manualArea.classList.add('hidden');
  }
}

/* ============================================================
   MANUAL ALLOCATION FIELDS
   ============================================================ */
function renderManualFields() {
  const n = parseInt(document.getElementById('numSplits').value, 10);
  const container = document.getElementById('manualFields');
  if (isNaN(n) || n < 2) { container.innerHTML = ''; return; }

  const totalPaise = toPaise(document.getElementById('totalAmount').value);
  const existing = container.querySelectorAll('.manual-field-input');

  container.innerHTML = '';

  for (let i = 0; i < n; i++) {
    const prevVal = existing[i] ? existing[i].value : '';
    const item = document.createElement('div');
    item.className = 'manual-field-item';
    item.innerHTML = `
      <label class="manual-field-label">Payment ${i + 1}</label>
      <div class="manual-field-wrapper">
        <input type="number" class="manual-field-input" data-index="${i}"
               placeholder="0.00" min="0.01" step="0.01"
               value="${prevVal}" autocomplete="off" />
      </div>`;
    container.appendChild(item);
  }

  // Update allocation status on each change
  container.querySelectorAll('.manual-field-input').forEach(inp => {
    inp.addEventListener('input', updateAllocStatus);
  });

  updateAllocStatus();
}

function updateAllocStatus() {
  const inputs = document.querySelectorAll('.manual-field-input');
  const totalPaise = toPaise(document.getElementById('totalAmount').value);
  let sumPaise = 0;
  inputs.forEach(inp => {
    const v = toPaise(inp.value);
    if (!isNaN(v)) sumPaise += v;
  });
  const statusEl = document.getElementById('allocStatus');
  if (isNaN(totalPaise) || totalPaise <= 0) {
    statusEl.textContent = '';
    statusEl.className = 'alloc-status';
    return;
  }
  const diff = totalPaise - sumPaise;
  if (diff === 0) {
    statusEl.textContent = `✓ Perfectly allocated ${formatINR(totalPaise)}`;
    statusEl.className = 'alloc-status ok';
  } else if (diff > 0) {
    statusEl.textContent = `${formatINR(diff)} remaining`;
    statusEl.className = 'alloc-status warn';
  } else {
    statusEl.textContent = `Exceeds by ${formatINR(Math.abs(diff))}`;
    statusEl.className = 'alloc-status warn';
  }
}

/* ============================================================
   VALIDATION
   ============================================================ */
function clearErrors() {
  document.querySelectorAll('.field-hint').forEach(el => el.textContent = '');
  document.querySelectorAll('.field-input').forEach(el => el.classList.remove('error'));
}

function setError(fieldId, hintId, msg) {
  const field = document.getElementById(fieldId);
  const hint  = document.getElementById(hintId);
  if (field) field.classList.add('error');
  if (hint)  hint.textContent = msg;
}

function validateInputs() {
  clearErrors();
  let valid = true;

  // Total amount
  const totalStr = document.getElementById('totalAmount').value;
  const totalPaise = toPaise(totalStr);
  if (!totalStr || isNaN(totalPaise) || totalPaise <= 0) {
    setError('totalAmount', 'totalAmountHint', 'Please enter a valid amount greater than ₹0.');
    valid = false;
  } else if (totalPaise < 100) {
    setError('totalAmount', 'totalAmountHint', 'Minimum amount is ₹1.00.');
    valid = false;
  } else if (totalPaise > 10_000_000_00) { // 1 crore
    setError('totalAmount', 'totalAmountHint', 'Amount cannot exceed ₹1,00,00,000.');
    valid = false;
  }

  // UPI ID
  const upiId = document.getElementById('upiId').value.trim();
  if (!upiId) {
    setError('upiId', 'upiIdHint', 'UPI ID is required.');
    valid = false;
  } else if (!isValidUPI(upiId)) {
    setError('upiId', 'upiIdHint', 'Enter a valid UPI ID (e.g. name@upi).');
    valid = false;
  }

  // Payee name
  const payeeName = document.getElementById('payeeName').value.trim();
  if (!payeeName) {
    setError('payeeName', 'payeeNameHint', 'Payee name is required.');
    valid = false;
  }

  // Number of splits
  const numStr = document.getElementById('numSplits').value;
  const numSplits = parseInt(numStr, 10);
  if (!numStr || isNaN(numSplits) || numSplits < 2) {
    setError('numSplits', 'numSplitsHint', 'Minimum 2 splits required.');
    valid = false;
  } else if (numSplits > 20) {
    setError('numSplits', 'numSplitsHint', 'Maximum 20 splits allowed.');
    valid = false;
  }

  if (!valid) return null;

  // Manual allocation validation
  if (splitMode === 'manual') {
    const inputs = document.querySelectorAll('.manual-field-input');
    let sumPaise = 0;
    let hasInvalid = false;

    inputs.forEach((inp, idx) => {
      const v = toPaise(inp.value);
      if (isNaN(v) || v <= 0) {
        inp.classList.add('error');
        hasInvalid = true;
      } else {
        sumPaise += v;
      }
    });

    if (hasInvalid) {
      showToast('All manual amounts must be greater than ₹0.', 'error');
      return null;
    }

    if (sumPaise !== totalPaise) {
      const diff = totalPaise - sumPaise;
      showToast(
        diff > 0
          ? `Allocation is short by ${formatINR(diff)}. Adjust amounts.`
          : `Allocation exceeds by ${formatINR(Math.abs(diff))}. Reduce amounts.`,
        'error', 4000
      );
      return null;
    }
  }

  return { totalPaise, upiId, payeeName, numSplits };
}

/* ============================================================
   SPLIT CALCULATION (integer paise)
   ============================================================ */
function calcSplits(totalPaise, numSplits) {
  if (splitMode === 'manual') {
    const inputs = document.querySelectorAll('.manual-field-input');
    return Array.from(inputs).map(inp => toPaise(inp.value));
  }

  // Equal split with remainder distribution
  const base = Math.floor(totalPaise / numSplits);
  const rem  = totalPaise % numSplits;
  const splits = Array(numSplits).fill(base);
  for (let i = 0; i < rem; i++) splits[i]++; // distribute leftover paise to first N splits
  return splits;
}

/* ============================================================
   QR CODE GENERATION
   ============================================================ */
function generateQRCode(containerId, uri, size = 180) {
  return new QRCode(document.getElementById(containerId), {
    text: uri,
    width: size,
    height: size,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.M,
  });
}

function getQrCanvas(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return null;
  return el.querySelector('canvas') || el.querySelector('img');
}

/** Convert QR canvas/img to PNG Blob */
async function qrToBlob(containerId) {
  return new Promise(resolve => {
    const wrapper = document.getElementById(containerId);
    const canvas = wrapper.querySelector('canvas');
    if (canvas) {
      canvas.toBlob(blob => resolve(blob), 'image/png');
    } else {
      const img = wrapper.querySelector('img');
      const c = document.createElement('canvas');
      c.width = 180; c.height = 180;
      const ctx = c.getContext('2d');
      const image = new Image();
      image.onload = () => { ctx.drawImage(image, 0, 0); c.toBlob(resolve, 'image/png'); };
      image.src = img.src;
    }
  });
}

/* ============================================================
   RENDER QR GRID
   ============================================================ */
function renderQRGrid(splits, upiId, payeeName, description) {
  const grid = document.getElementById('qrGrid');
  grid.innerHTML = '';

  const cards = splits.map((paise, idx) => {
    const rupees = paise / 100;
    const txnRef = genTxnRef(idx);
    const uri    = buildUpiUri(upiId, payeeName, rupees, description, txnRef);
    const qrId   = `qr-${idx}`;

    const card = document.createElement('div');
    card.className = 'qr-card';
    card.style.animationDelay = `${idx * 60}ms`;
    card.innerHTML = `
      <span class="qr-card-number">QR ${idx + 1} of ${splits.length}</span>
      <div class="qr-canvas-wrapper">
        <div id="${qrId}"></div>
      </div>
      <div class="qr-amount">${formatINR(paise)}</div>
      <div class="qr-meta">
        <span class="qr-payee">${escHtml(payeeName)}</span>
        <span class="qr-upiid">${escHtml(upiId)}</span>
        ${description ? `<span class="qr-upiid" style="color:var(--text-secondary);font-size:.75rem;margin-top:2px;">${escHtml(description)}</span>` : ''}
      </div>
      <div class="qr-actions">
        <button class="qr-dl-btn" data-idx="${idx}" title="Download QR ${idx + 1}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download
        </button>
      </div>`;
    grid.appendChild(card);

    // Generate QR (async on next tick so DOM is ready)
    setTimeout(() => generateQRCode(qrId, uri, 180), 0);

    return { paise, rupees, uri, txnRef, qrId };
  });

  // Download individual buttons
  grid.querySelectorAll('.qr-dl-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.idx, 10);
      const item = cards[idx];
      const blob = await qrToBlob(item.qrId);
      if (!blob) { showToast('QR not ready yet, please wait.', 'error'); return; }
      downloadBlob(blob, `PaySplit_QR${idx + 1}_${formatINR(item.paise).replace('₹','')}.png`);
      showToast(`QR ${idx + 1} downloaded!`, 'success');
    });
  });

  return cards;
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ============================================================
   DASHBOARD UPDATE
   ============================================================ */
function updateDashboard(totalPaise, splits) {
  const allocatedPaise = splits.reduce((a, b) => a + b, 0);
  const pendingPaise   = totalPaise - allocatedPaise;

  document.getElementById('dashTotal').textContent     = formatINR(totalPaise);
  document.getElementById('dashCount').textContent     = splits.length;
  document.getElementById('dashAllocated').textContent = formatINR(allocatedPaise);
  document.getElementById('dashPending').textContent   = formatINR(pendingPaise < 0 ? 0 : pendingPaise);
}

/* ============================================================
   DOWNLOAD HELPERS
   ============================================================ */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function downloadAllAsZip(cards, payeeName) {
  if (typeof JSZip === 'undefined') {
    showToast('JSZip not loaded. Cannot create ZIP.', 'error'); return;
  }
  const zip = new JSZip();
  showToast('Preparing ZIP...', 'info', 5000);

  for (let i = 0; i < cards.length; i++) {
    // Wait for QR to render if needed
    await new Promise(r => setTimeout(r, 200));
    const blob = await qrToBlob(cards[i].qrId);
    if (blob) {
      const fname = `QR${i + 1}_${formatINR(cards[i].paise).replace('₹','')}_INR.png`;
      zip.file(fname, blob);
    }
  }

  // Add a text summary
  const summary = buildTextSummary(cards, payeeName);
  zip.file('PaySplit_Summary.txt', summary);

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(zipBlob, `PaySplit_${Date.now()}.zip`);
  showToast('ZIP downloaded!', 'success');
}

function buildTextSummary(cards, payeeName) {
  const lines = [
    '============================',
    '  PaySplit – Payment Summary',
    '  by Smit Parekh',
    '============================',
    '',
    `Payee: ${payeeName}`,
    `Generated: ${new Date().toLocaleString('en-IN')}`,
    `Total Splits: ${cards.length}`,
    '',
    'Individual Allocations:',
    '----------------------------',
  ];
  cards.forEach((c, i) => {
    lines.push(`  QR ${i + 1}: ${formatINR(c.paise)}  |  Ref: ${c.txnRef}`);
    lines.push(`         ${c.uri}`);
    lines.push('');
  });
  lines.push('NOTE: Scanning a QR code does not confirm payment settlement.');
  lines.push('Verify via your authorized UPI application.');
  return lines.join('\n');
}

/* ============================================================
   SHARE
   ============================================================ */
async function sharePayment(cards, payeeName, totalPaise) {
  const text = `PaySplit – ${formatINR(totalPaise)} split into ${cards.length} payments\nPayee: ${payeeName}\nGenerated via PaySplit by Smit Parekh`;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'PaySplit Payment', text });
    } catch {}
  } else {
    await copyToClipboard(text);
    showToast('Payment info copied to clipboard!', 'info');
  }
}

/* ============================================================
   MAIN GENERATE HANDLER
   ============================================================ */
function handleGenerate(e) {
  e.preventDefault();
  const validated = validateInputs();
  if (!validated) return;

  const { totalPaise, upiId, payeeName, numSplits } = validated;
  const description = document.getElementById('description').value.trim();
  const splits      = calcSplits(totalPaise, numSplits);

  // Render dashboard
  document.getElementById('dashboardSection').classList.remove('hidden');
  updateDashboard(totalPaise, splits);

  // Render QR grid
  document.getElementById('qrSection').classList.remove('hidden');
  const cards = renderQRGrid(splits, upiId, payeeName, description);

  generatedData = { cards, totalPaise, splits, upiId, payeeName, description };

  saveSession();
  showToast(`${splits.length} QR codes generated!`, 'success');

  // Scroll to dashboard
  setTimeout(() => {
    document.getElementById('dashboardSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

/* ============================================================
   RESET
   ============================================================ */
function handleReset() {
  document.getElementById('paymentForm').reset();
  document.getElementById('totalAmount').value  = '';
  document.getElementById('upiId').value        = '';
  document.getElementById('payeeName').value    = '';
  document.getElementById('description').value  = '';
  document.getElementById('numSplits').value    = '2';
  clearErrors();
  setSplitMode('auto');
  document.getElementById('dashboardSection').classList.add('hidden');
  document.getElementById('qrSection').classList.add('hidden');
  document.getElementById('qrGrid').innerHTML = '';
  generatedData = null;
  showToast('Form reset.', 'info');
}

/* ============================================================
   CLEAR ALL DATA
   ============================================================ */
function handleClearAll() {
  if (!confirm('Clear all data and session? This will reset the form and remove saved data.')) return;
  clearSession();
  handleReset();
  showToast('All data cleared.', 'success');
}

/* ============================================================
   THEME TOGGLE
   ============================================================ */
function toggleTheme() {
  const isDark = document.body.classList.contains('dark-mode');
  document.body.classList.toggle('dark-mode', !isDark);
  document.body.classList.toggle('light-mode', isDark);
  saveSession();
}

/* ============================================================
   PWA INSTALL
   ============================================================ */
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  document.getElementById('installBanner').classList.remove('hidden');
});

window.addEventListener('appinstalled', () => {
  document.getElementById('installBanner').classList.add('hidden');
  deferredInstallPrompt = null;
  showToast('PaySplit installed!', 'success');
});

/* ============================================================
   EVENT WIRING
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {

  // Load saved session
  loadSession();

  // Form submit
  document.getElementById('paymentForm').addEventListener('submit', handleGenerate);

  // Reset
  document.getElementById('resetBtn').addEventListener('click', handleReset);

  // Clear all
  document.getElementById('clearAllBtn').addEventListener('click', handleClearAll);

  // Theme toggle
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);

  // Split mode buttons
  document.getElementById('autoSplitBtn').addEventListener('click', () => setSplitMode('auto'));
  document.getElementById('manualSplitBtn').addEventListener('click', () => {
    setSplitMode('manual');
    renderManualFields();
  });

  // numSplits change → re-render manual fields
  document.getElementById('numSplits').addEventListener('input', () => {
    if (splitMode === 'manual') renderManualFields();
  });

  // totalAmount change → update manual status
  document.getElementById('totalAmount').addEventListener('input', () => {
    if (splitMode === 'manual') updateAllocStatus();
  });

  // Copy UPI ID
  document.getElementById('copyUpiBtn').addEventListener('click', () => {
    const upi = document.getElementById('upiId').value.trim();
    if (upi) copyToClipboard(upi);
    else showToast('Enter a UPI ID first.', 'error');
  });

  // Download all ZIP
  document.getElementById('downloadAllBtn').addEventListener('click', async () => {
    if (!generatedData) { showToast('Generate QR codes first.', 'error'); return; }
    // Small delay to ensure QR canvases are fully painted
    await new Promise(r => setTimeout(r, 300));
    await downloadAllAsZip(generatedData.cards, generatedData.payeeName);
  });

  // Print
  document.getElementById('printBtn').addEventListener('click', () => {
    if (!generatedData) { showToast('Generate QR codes first.', 'error'); return; }
    window.print();
  });

  // Share
  document.getElementById('shareBtn').addEventListener('click', () => {
    if (!generatedData) { showToast('Generate QR codes first.', 'error'); return; }
    sharePayment(generatedData.cards, generatedData.payeeName, generatedData.totalPaise);
  });

  // PWA install banner
  document.getElementById('installBtn').addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      document.getElementById('installBanner').classList.add('hidden');
    }
    deferredInstallPrompt = null;
  });

  document.getElementById('dismissInstall').addEventListener('click', () => {
    document.getElementById('installBanner').classList.add('hidden');
  });

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }

});
