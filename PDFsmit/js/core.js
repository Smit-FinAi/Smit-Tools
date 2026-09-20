/* ============================================================
   The PDF Factory — core helpers
   by Smit Parekh
   ============================================================ */
(function () {
  'use strict';

  const F = (window.PF = window.PF || {});

  /* ---------- library shortcuts ---------- */
  F.lib = function () {
    return {
      PDFLib: window.PDFLib,
      pdfjs: window.pdfjsLib,
      JSZip: window.JSZip,
      XLSX: window.XLSX,
      docx: window.docx,
      PptxGenJS: window.PptxGenJS,
      mammoth: window.mammoth,
      Tesseract: window.Tesseract,
      fontkit: window.fontkit
    };
  };

  F.needs = function (names) {
    const L = F.lib();
    const missing = names.filter((n) => !L[n]);
    if (missing.length) {
      throw new Error(
        'Library not loaded: ' + missing.join(', ') +
        '. Connect to the internet once so the CDN scripts can cache, then reload.'
      );
    }
    return L;
  };

  /* ---------- pdf.js worker ---------- */
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  /* ---------- tiny dom ---------- */
  F.el = function (tag, attrs, children) {
    const n = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v === null || v === undefined || v === false) continue;
        if (k === 'class') n.className = v;
        else if (k === 'html') n.innerHTML = v;
        else if (k === 'text') n.textContent = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') n.addEventListener(k.slice(2), v);
        else n.setAttribute(k, v === true ? '' : v);
      }
    }
    (children || []).forEach((c) => {
      if (c === null || c === undefined || c === false) return;
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return n;
  };
  F.$ = (s, r) => (r || document).querySelector(s);
  F.$$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  F.mi = (name, cls) => F.el('span', { class: 'material-icons-round ' + (cls || ''), text: name });

  /* ---------- formatting ---------- */
  F.fmtSize = function (b) {
    if (b === 0 || b === undefined || b === null) return '0 B';
    const u = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(u.length - 1, Math.floor(Math.log(b) / Math.log(1024)));
    return (b / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + u[i];
  };
  F.baseName = function (n) { return String(n || 'file').replace(/\.[^.]+$/, ''); };
  F.ext = function (n) { const m = /\.([^.]+)$/.exec(String(n || '')); return m ? m[1].toLowerCase() : ''; };
  F.sanitize = function (n) { return String(n).replace(/[\\/:*?"<>|]+/g, '_').slice(0, 120); };

  /* ---------- toasts ---------- */
  const ICONS = { ok: 'check_circle', err: 'error', warn: 'warning', info: 'info' };
  F.toast = function (msg, kind, ms) {
    kind = kind || 'info';
    const box = F.$('#toasts');
    if (!box) { console.log('[' + kind + ']', msg); return; }
    const t = F.el('div', { class: 'toast ' + kind }, [F.mi(ICONS[kind] || 'info'), F.el('div', { text: msg })]);
    box.appendChild(t);
    setTimeout(() => {
      t.style.transition = 'opacity .3s, transform .3s';
      t.style.opacity = '0';
      t.style.transform = 'translateX(30px)';
      setTimeout(() => t.remove(), 320);
    }, ms || 4200);
  };

  /* ---------- busy overlay ---------- */
  let busyCount = 0;
  F.busy = function (msg) {
    busyCount++;
    const b = F.$('#busy');
    F.$('#busyMsg').textContent = msg || 'Working…';
    F.$('#busyBar').style.width = '0%';
    b.hidden = false;
  };
  F.progress = function (pct, msg) {
    const bar = F.$('#busyBar');
    if (bar) bar.style.width = Math.max(0, Math.min(100, pct)) + '%';
    if (msg) F.$('#busyMsg').textContent = msg;
  };
  F.idle = function () {
    busyCount = Math.max(0, busyCount - 1);
    if (busyCount === 0) F.$('#busy').hidden = true;
  };
  /** run an async job with the busy overlay */
  F.run = async function (msg, fn) {
    F.busy(msg);
    try {
      const r = await fn();
      return r;
    } catch (e) {
      console.error(e);
      F.toast(e && e.message ? e.message : String(e), 'err', 7000);
      throw e;
    } finally {
      F.idle();
    }
  };
  /** let the browser paint */
  F.tick = () => new Promise((r) => setTimeout(r, 0));

  /* ---------- file readers ---------- */
  F.readBuf = (file) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(new Error('Could not read ' + file.name));
    r.readAsArrayBuffer(file);
  });
  F.readText = (file) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(new Error('Could not read ' + file.name));
    r.readAsText(file);
  });
  F.readDataURL = (file) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(new Error('Could not read ' + file.name));
    r.readAsDataURL(file);
  });
  F.loadImage = (src) => new Promise((res, rej) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('Could not decode image'));
    i.src = src;
  });

  /* ---------- saving ---------- */
  F.saveBlob = function (blob, name) {
    if (window.saveAs) { window.saveAs(blob, name); return; }
    const url = URL.createObjectURL(blob);
    const a = F.el('a', { href: url, download: name });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };
  F.saveBytes = function (bytes, name, type) {
    F.saveBlob(new Blob([bytes], { type: type || 'application/pdf' }), name);
  };
  F.saveZip = async function (entries, name) {
    const { JSZip } = F.needs(['JSZip']);
    const zip = new JSZip();
    entries.forEach((e) => zip.file(e.name, e.data));
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    F.saveBlob(blob, name);
    return blob;
  };

  /* ---------- pdf-lib helpers ---------- */
  F.loadPdfLib = async function (fileOrBuf, opts) {
    const { PDFLib } = F.needs(['PDFLib']);
    const buf = fileOrBuf instanceof ArrayBuffer || fileOrBuf instanceof Uint8Array
      ? fileOrBuf : await F.readBuf(fileOrBuf);
    return PDFLib.PDFDocument.load(buf, Object.assign({ ignoreEncryption: true, updateMetadata: false }, opts || {}));
  };
  F.newPdf = async function () {
    const { PDFLib } = F.needs(['PDFLib']);
    return PDFLib.PDFDocument.create();
  };
  F.stamp = function (doc) {
    try {
      doc.setProducer('The PDF Factory by Smit Parekh');
      doc.setCreator('The PDF Factory by Smit Parekh');
      doc.setModificationDate(new Date());
    } catch (e) { /* ignore */ }
    return doc;
  };
  F.savePdfDoc = async function (doc, name, opts) {
    F.stamp(doc);
    const bytes = await doc.save(Object.assign({ useObjectStreams: true, addDefaultPage: false }, opts || {}));
    F.saveBytes(bytes, F.sanitize(name));
    return bytes;
  };

  /* ---------- pdf.js helpers ---------- */
  F.loadPdfJs = async function (fileOrBuf, password) {
    const { pdfjs } = F.needs(['pdfjs']);
    let data = fileOrBuf instanceof ArrayBuffer ? fileOrBuf
      : fileOrBuf instanceof Uint8Array ? fileOrBuf.buffer
        : await F.readBuf(fileOrBuf);
    // pdf.js transfers/detaches the buffer — always give it a private copy
    const copy = data.slice(0);
    const task = window.pdfjsLib.getDocument({
      data: copy,
      password: password || undefined,
      isEvalSupported: false,
      useSystemFonts: true,
      cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/standard_fonts/'
    });
    return task.promise;
  };

  /** Render one page of a pdf.js doc to a canvas. */
  F.renderPage = async function (pdf, pageNo, scaleOrOpts) {
    const o = typeof scaleOrOpts === 'object' ? scaleOrOpts : { scale: scaleOrOpts || 1.2 };
    const page = await pdf.getPage(pageNo);
    let viewport = page.getViewport({ scale: o.scale || 1.2, rotation: o.rotation });
    if (o.maxW && viewport.width > o.maxW) {
      viewport = page.getViewport({ scale: (o.scale || 1.2) * (o.maxW / viewport.width), rotation: o.rotation });
    }
    if (o.fitW) {
      viewport = page.getViewport({ scale: o.fitW / page.getViewport({ scale: 1 }).width, rotation: o.rotation });
    }
    const canvas = F.el('canvas');
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, background: 'rgb(255,255,255)' }).promise;
    return canvas;
  };

  F.canvasBlob = (canvas, type, q) => new Promise((res) => canvas.toBlob(res, type || 'image/png', q));
  F.canvasBytes = async function (canvas, type, q) {
    const b = await F.canvasBlob(canvas, type, q);
    return new Uint8Array(await b.arrayBuffer());
  };

  /** Extract plain text of a pdf.js page, preserving rough line breaks. */
  F.pageText = async function (pdf, pageNo) {
    const page = await pdf.getPage(pageNo);
    const tc = await page.getTextContent();
    let out = '';
    let lastY = null;
    let lastX = null;
    tc.items.forEach((it) => {
      if (!it.str) return;
      const y = it.transform[5];
      const x = it.transform[4];
      if (lastY !== null && Math.abs(y - lastY) > 2.2) {
        out += (Math.abs(y - lastY) > 16 ? '\n\n' : '\n');
      } else if (lastX !== null && x - lastX > 8 && !/\s$/.test(out)) {
        out += ' ';
      }
      out += it.str;
      lastY = y;
      lastX = x + (it.width || 0);
    });
    return out.replace(/[ \t]+\n/g, '\n').trim();
  };

  /** Structured text items with positions — used by Word/Excel/PPT converters. */
  F.pageItems = async function (pdf, pageNo) {
    const page = await pdf.getPage(pageNo);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    const items = tc.items.filter((i) => i.str && i.str.trim()).map((i) => ({
      text: i.str,
      x: i.transform[4],
      y: vp.height - i.transform[5],
      w: i.width || 0,
      h: i.height || Math.abs(i.transform[3]) || 10,
      font: i.fontName || '',
      bold: /bold|black|heavy|semibold/i.test(i.fontName || '')
    }));
    return { items, width: vp.width, height: vp.height };
  };

  /** Group text items into visual lines. */
  F.toLines = function (items, tol) {
    tol = tol || 3.2;
    const sorted = items.slice().sort((a, b) => a.y - b.y || a.x - b.x);
    const lines = [];
    sorted.forEach((it) => {
      const ln = lines.find((l) => Math.abs(l.y - it.y) <= Math.max(tol, it.h * 0.6));
      if (ln) { ln.items.push(it); ln.y = (ln.y * (ln.items.length - 1) + it.y) / ln.items.length; }
      else lines.push({ y: it.y, items: [it] });
    });
    lines.forEach((l) => {
      l.items.sort((a, b) => a.x - b.x);
      l.x = l.items[0].x;
      l.size = Math.max.apply(null, l.items.map((i) => i.h));
      l.bold = l.items.every((i) => i.bold);
      let t = '';
      let prev = null;
      l.items.forEach((i) => {
        if (prev && i.x - (prev.x + prev.w) > Math.max(1.4, i.h * 0.22) && !/\s$/.test(t)) t += ' ';
        t += i.text;
        prev = i;
      });
      l.text = t.replace(/\s+/g, ' ').trim();
    });
    return lines.sort((a, b) => a.y - b.y).filter((l) => l.text);
  };

  /* ---------- page range parsing ---------- */
  /** "1-3,7,9-" (1-based) -> sorted unique 0-based index array */
  F.parseRange = function (spec, total) {
    spec = String(spec || '').trim();
    if (!spec || spec.toLowerCase() === 'all') return Array.from({ length: total }, (_, i) => i);
    const out = new Set();
    spec.split(/[,;\s]+/).filter(Boolean).forEach((part) => {
      let m = /^(\d+)\s*[-–]\s*(\d+)$/.exec(part);
      if (m) {
        let a = +m[1], b = +m[2];
        if (a > b) { const t = a; a = b; b = t; }
        for (let i = a; i <= b; i++) if (i >= 1 && i <= total) out.add(i - 1);
        return;
      }
      m = /^(\d+)\s*[-–]$/.exec(part);
      if (m) { for (let i = +m[1]; i <= total; i++) if (i >= 1) out.add(i - 1); return; }
      m = /^[-–]\s*(\d+)$/.exec(part);
      if (m) { for (let i = 1; i <= Math.min(+m[1], total); i++) out.add(i - 1); return; }
      if (/^\d+$/.test(part)) { const n = +part; if (n >= 1 && n <= total) out.add(n - 1); return; }
      if (/^odd$/i.test(part)) { for (let i = 0; i < total; i += 2) out.add(i); return; }
      if (/^even$/i.test(part)) { for (let i = 1; i < total; i += 2) out.add(i); return; }
    });
    return Array.from(out).sort((a, b) => a - b);
  };
  F.rangeLabel = function (idx) {
    if (!idx.length) return 'none';
    const parts = [];
    let s = idx[0], p = idx[0];
    for (let i = 1; i <= idx.length; i++) {
      if (idx[i] === p + 1) { p = idx[i]; continue; }
      parts.push(s === p ? String(s + 1) : (s + 1) + '-' + (p + 1));
      s = p = idx[i];
    }
    return parts.join(', ');
  };

  /* ---------- geometry / units ---------- */
  F.PT = { mm: 2.834645669, cm: 28.34645669, in: 72, pt: 1, px: 0.75 };
  F.PAGE_SIZES = {
    Original: null,
    A4: [595.28, 841.89],
    A3: [841.89, 1190.55],
    A5: [419.53, 595.28],
    Letter: [612, 792],
    Legal: [612, 1008],
    Tabloid: [792, 1224]
  };

  /* ---------- misc ---------- */
  F.escapeHtml = function (s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  };
  F.hexToRgb = function (hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex).trim());
    if (!m) return { r: 0, g: 0, b: 0 };
    return { r: parseInt(m[1], 16) / 255, g: parseInt(m[2], 16) / 255, b: parseInt(m[3], 16) / 255 };
  };
  F.pdfColor = function (hex) {
    const { PDFLib } = F.needs(['PDFLib']);
    const c = F.hexToRgb(hex);
    return PDFLib.rgb(c.r, c.g, c.b);
  };
  F.romanize = function (n) {
    const map = [[1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'],
    [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']];
    let out = '';
    map.forEach(([v, s]) => { while (n >= v) { out += s; n -= v; } });
    return out;
  };
  F.alphaLabel = function (n) {
    let s = '';
    while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(97 + r) + s; n = Math.floor((n - 1) / 26); }
    return s;
  };
  /** WinAnsi-safe text for pdf-lib standard fonts */
  F.wa = function (s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
      .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
      .replace(/[\u2013\u2014\u2212]/g, '-')
      .replace(/\u2026/g, '...')
      .replace(/\u00A0/g, ' ')
      .replace(/\u2022/g, '*')
      .replace(/\t/g, '    ')
      // drop anything outside printable latin-1
      .replace(/[^\x20-\x7E\u00A1-\u00FF\n\r]/g, '');
  };
  /** wrap text to a width using a pdf-lib font */
  F.wrapText = function (text, font, size, maxW) {
    const lines = [];
    String(text).split(/\r?\n/).forEach((para) => {
      if (!para.trim()) { lines.push(''); return; }
      const words = para.split(/\s+/);
      let cur = '';
      words.forEach((w) => {
        const test = cur ? cur + ' ' + w : w;
        let width;
        try { width = font.widthOfTextAtSize(test, size); } catch (e) { width = test.length * size * 0.5; }
        if (width > maxW && cur) { lines.push(cur); cur = w; }
        else cur = test;
      });
      if (cur) lines.push(cur);
    });
    return lines;
  };

  /* ---------- simple word diff (Compare PDF) ---------- */
  F.diffWords = function (a, b) {
    const A = String(a).split(/(\s+)/);
    const B = String(b).split(/(\s+)/);
    const n = A.length, m = B.length;
    // LCS with limited memory (fine for typical page text)
    const MAX = 2600;
    if (n > MAX || m > MAX) {
      // fall back to line diff for very large inputs
      return F.diffLines(a, b);
    }
    const dp = new Uint32Array((n + 1) * (m + 1));
    const W = m + 1;
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i * W + j] = A[i] === B[j] ? dp[(i + 1) * W + j + 1] + 1
          : Math.max(dp[(i + 1) * W + j], dp[i * W + j + 1]);
      }
    }
    const out = [];
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (A[i] === B[j]) { out.push({ t: '=', v: A[i] }); i++; j++; }
      else if (dp[(i + 1) * W + j] >= dp[i * W + j + 1]) { out.push({ t: '-', v: A[i] }); i++; }
      else { out.push({ t: '+', v: B[j] }); j++; }
    }
    while (i < n) out.push({ t: '-', v: A[i++] });
    while (j < m) out.push({ t: '+', v: B[j++] });
    return out;
  };
  F.diffLines = function (a, b) {
    const A = String(a).split('\n'), B = String(b).split('\n');
    const out = [];
    const setB = new Set(B);
    const setA = new Set(A);
    let i = 0, j = 0;
    while (i < A.length || j < B.length) {
      if (i < A.length && j < B.length && A[i] === B[j]) { out.push({ t: '=', v: A[i] + '\n' }); i++; j++; }
      else if (i < A.length && !setB.has(A[i])) { out.push({ t: '-', v: A[i] + '\n' }); i++; }
      else if (j < B.length && !setA.has(B[j])) { out.push({ t: '+', v: B[j] + '\n' }); j++; }
      else if (i < A.length) { out.push({ t: '-', v: A[i] + '\n' }); i++; }
      else { out.push({ t: '+', v: B[j] + '\n' }); j++; }
    }
    return out;
  };

  /* ---------- drag to reorder ---------- */
  F.makeSortable = function (container, onReorder) {
    let dragEl = null;
    container.addEventListener('dragstart', (e) => {
      const row = e.target.closest('[draggable="true"]');
      if (!row) return;
      dragEl = row;
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', ''); } catch (x) { }
    });
    container.addEventListener('dragend', () => {
      if (dragEl) dragEl.classList.remove('dragging');
      dragEl = null;
      if (onReorder) onReorder();
    });
    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!dragEl) return;
      const items = F.$$('[draggable="true"]', container).filter((x) => x !== dragEl);
      let after = null;
      for (const it of items) {
        const r = it.getBoundingClientRect();
        const horiz = r.width > r.height * 1.6 ? false : true;
        const mid = horiz ? r.top + r.height / 2 : r.left + r.width / 2;
        const pos = horiz ? e.clientY : e.clientX;
        if (pos < mid) { after = it; break; }
      }
      if (after) container.insertBefore(dragEl, after);
      else container.appendChild(dragEl);
    });
  };

  /* ---------- standard font loader ---------- */
  F.embedFont = async function (doc, name) {
    const { PDFLib } = F.needs(['PDFLib']);
    const S = PDFLib.StandardFonts;
    const map = {
      Helvetica: S.Helvetica, 'Helvetica-Bold': S.HelveticaBold, 'Helvetica-Oblique': S.HelveticaOblique,
      'Helvetica-BoldOblique': S.HelveticaBoldOblique,
      'Times-Roman': S.TimesRoman, 'Times-Bold': S.TimesRomanBold, 'Times-Italic': S.TimesRomanItalic,
      'Times-BoldItalic': S.TimesRomanBoldItalic,
      Courier: S.Courier, 'Courier-Bold': S.CourierBold, 'Courier-Oblique': S.CourierOblique,
      'Courier-BoldOblique': S.CourierBoldOblique
    };
    return doc.embedFont(map[name] || S.Helvetica);
  };

  /* ---------- image embed (auto png/jpg) ---------- */
  F.embedImage = async function (doc, bytes, mime) {
    if (/jpe?g/i.test(mime || '')) return doc.embedJpg(bytes);
    if (/png/i.test(mime || '')) return doc.embedPng(bytes);
    // unknown -> re-encode through canvas as PNG
    const blob = new Blob([bytes]);
    const url = URL.createObjectURL(blob);
    try {
      const img = await F.loadImage(url);
      const c = F.el('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      return doc.embedPng(await F.canvasBytes(c, 'image/png'));
    } finally { URL.revokeObjectURL(url); }
  };

  /* ---------- encryption detection ---------- */
  F.isEncrypted = async function (file) {
    try {
      const buf = await F.readBuf(file);
      const txt = new TextDecoder('latin1').decode(new Uint8Array(buf).slice(-4096));
      return /\/Encrypt\s/.test(txt) || /\/Encrypt\b/.test(new TextDecoder('latin1').decode(new Uint8Array(buf)));
    } catch (e) { return false; }
  };

  F.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
})();
