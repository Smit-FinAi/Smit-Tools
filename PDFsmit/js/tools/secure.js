/* ============================================================
   The PDF Factory — SECURITY & EXTRAS tools
   protect, unlock, sign, repair, ocr, redact, compare,
   flatten, grayscale, info, attach
   ============================================================ */
(function () {
  'use strict';
  const F = window.PF;
  const el = F.el, mi = F.mi;

  /* =========================================================
     PROTECT PDF  (AES-128 / RC4 encryption written by hand)
     ========================================================= */
  F.register('protect', function (ctx) {
    const { body, foot } = ctx;
    let files = [];
    const userPw = el('input', { type: 'password', placeholder: 'Password to open the document' });
    const userPw2 = el('input', { type: 'password', placeholder: 'Repeat the password' });
    const ownerPw = el('input', { type: 'password', placeholder: 'Optional — defaults to the user password' });
    const showPw = F.checkbox('Show passwords', false);
    showPw.input.addEventListener('change', () => {
      const t = showPw.input.checked ? 'text' : 'password';
      [userPw, userPw2, ownerPw].forEach((i) => i.setAttribute('type', t));
    });
    const strength = el('div', { class: 'hint' });
    const algo = F.select([
      { v: 'aes128', t: 'AES-128 — recommended' },
      { v: 'rc4-128', t: 'RC4 128-bit — maximum compatibility' }
    ], 'aes128');

    const pPrint = F.checkbox('Allow printing', true);
    const pCopy = F.checkbox('Allow copying text', false);
    const pModify = F.checkbox('Allow editing the document', false);
    const pAnnot = F.checkbox('Allow comments & form filling', true);

    function rate() {
      const v = userPw.value;
      let s = 0;
      if (v.length >= 8) s++;
      if (v.length >= 12) s++;
      if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++;
      if (/\d/.test(v)) s++;
      if (/[^\w\s]/.test(v)) s++;
      const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
      const cols = ['#e2231a', '#e2231a', '#f4b400', '#f4b400', '#0f9d58', '#0f9d58'];
      strength.textContent = v ? 'Strength: ' + labels[s] : '';
      strength.style.color = v ? cols[s] : '';
      F.setGo(files.length > 0 && v.length >= 4 && v === userPw2.value);
    }
    [userPw, userPw2].forEach((i) => i.addEventListener('input', rate));

    const dz = F.dropzone({
      multiple: true, label: 'Choose PDFs to protect',
      onFiles: (f) => { files = f; rate(); }
    });

    body.appendChild(F.note('The password is applied with real PDF encryption on your device. <b>Nobody can recover it for you</b> — store it safely.', 'warn'));
    body.appendChild(dz.node);
    body.appendChild(F.section('Password'));
    body.appendChild(F.rows([F.field('User password (to open)', userPw), F.field('Confirm password', userPw2)]));
    body.appendChild(strength);
    body.appendChild(F.rows([F.field('Owner password (permissions)', ownerPw), F.field('Encryption', algo)]));
    body.appendChild(showPw);
    body.appendChild(F.section('Permissions'));
    body.appendChild(F.rows([pPrint, pCopy, pModify, pAnnot]));

    F.footBtns(foot, {
      action: 'Protect PDF', actionIcon: 'lock', disabled: true,
      onAction: () => F.run('Encrypting…', async () => {
        if (userPw.value !== userPw2.value) throw new Error('The two passwords do not match.');
        if (userPw.value.length < 4) throw new Error('Use at least 4 characters.');
        const perms = {
          print: pPrint.input.checked, copy: pCopy.input.checked,
          modify: pModify.input.checked, annotate: pAnnot.input.checked
        };
        const outs = [];
        for (let i = 0; i < files.length; i++) {
          F.progress((i / files.length) * 100, files[i].name);
          const doc = await F.loadPdfLib(files[i]);
          F.stamp(doc);
          const clean = await doc.save({ useObjectStreams: false });
          const enc = await F.encryptPdf(clean, userPw.value, ownerPw.value || userPw.value, algo.value, perms);
          outs.push({ name: F.baseName(files[i].name) + '_protected.pdf', data: enc });
          await F.tick();
        }
        if (outs.length === 1) F.saveBytes(outs[0].data, outs[0].name);
        else await F.saveZip(outs, 'protected_pdfs.zip');
        F.result(body, {
          title: 'Locked', msg: outs.length + ' file(s) encrypted with ' + (algo.value === 'aes128' ? 'AES-128' : 'RC4-128') + '.',
          stats: [{ k: 'Files', v: String(outs.length) }, { k: 'Algorithm', v: algo.value === 'aes128' ? 'AES-128' : 'RC4-128' }],
          actions: [{
            label: 'Download again', icon: 'download', primary: true,
            on: () => outs.length === 1 ? F.saveBytes(outs[0].data, outs[0].name) : F.saveZip(outs, 'protected_pdfs.zip')
          }, { label: 'Protect more', icon: 'refresh', on: () => F.launch('protect') }]
        });
        F.footBtns(foot, {});
      })
    });
  });

  /* =========================================================
     UNLOCK PDF
     ========================================================= */
  F.register('unlock', function (ctx) {
    const { body, foot } = ctx;
    let files = [];
    const pw = el('input', { type: 'password', placeholder: 'Password (leave empty if there is none)' });
    const showPw = F.checkbox('Show password', false);
    showPw.input.addEventListener('change', () => pw.setAttribute('type', showPw.input.checked ? 'text' : 'password'));

    const dz = F.dropzone({
      multiple: true, label: 'Choose protected PDFs',
      onFiles: (f) => { files = f; F.setGo(f.length > 0); }
    });

    body.appendChild(F.note('Only use this on documents you own or are authorised to unlock. Removing owner-permission restrictions works without a password; an open-password needs the correct password.', 'warn'));
    body.appendChild(dz.node);
    body.appendChild(F.field('Password', pw));
    body.appendChild(showPw);

    F.footBtns(foot, {
      action: 'Remove protection', actionIcon: 'lock_open', disabled: true,
      onAction: () => F.run('Unlocking…', async () => {
        const outs = [];
        const failed = [];
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          F.progress((i / files.length) * 100, f.name);
          try {
            const buf = await F.readBuf(f);
            // pdf.js can decrypt with the password; re-render into a clean PDF via pdf-lib if needed
            let data = null;
            try {
              const doc = await F.loadPdfLib(buf, { ignoreEncryption: true });
              F.stamp(doc);
              data = await doc.save({ useObjectStreams: true });
              // verify readable
              await F.loadPdfJs(data);
            } catch (inner) {
              data = null;
            }
            if (!data) {
              // fall back: decrypt through pdf.js by rasterising
              const pdf = await F.loadPdfJs(buf, pw.value);
              const out = await F.newPdf();
              for (let p = 1; p <= pdf.numPages; p++) {
                F.progress(((i + p / pdf.numPages) / files.length) * 100, 'Page ' + p);
                const pg = await pdf.getPage(p);
                const vp = pg.getViewport({ scale: 1 });
                const canvas = await F.renderPage(pdf, p, { scale: 2 });
                const img = await out.embedJpg(await F.canvasBytes(canvas, 'image/jpeg', 0.92));
                const np = out.addPage([vp.width, vp.height]);
                np.drawImage(img, { x: 0, y: 0, width: vp.width, height: vp.height });
                canvas.width = canvas.height = 0;
                await F.tick();
              }
              F.stamp(out);
              data = await out.save();
            }
            outs.push({ name: F.baseName(f.name) + '_unlocked.pdf', data });
          } catch (e) {
            console.warn(e);
            failed.push(f.name + ' — ' + (e.message || 'wrong password'));
          }
        }
        if (!outs.length) throw new Error('Could not unlock: ' + (failed[0] || 'unknown error'));
        if (outs.length === 1) F.saveBytes(outs[0].data, outs[0].name);
        else await F.saveZip(outs, 'unlocked_pdfs.zip');
        if (failed.length) F.toast(failed.length + ' file(s) failed. ' + failed[0], 'warn', 8000);
        F.result(body, {
          title: 'Unlocked', msg: outs.length + ' file(s) are now open.',
          stats: [{ k: 'Unlocked', v: String(outs.length) }, { k: 'Failed', v: String(failed.length) }],
          actions: [{ label: 'Unlock more', icon: 'refresh', primary: true, on: () => F.launch('unlock') }]
        });
        F.footBtns(foot, {});
      })
    });
  });

  /* =========================================================
     SIGN PDF
     ========================================================= */
  F.register('sign', function (ctx) {
    const { body, foot } = ctx;
    let file = null, buf = null, pdf = null, sigCanvas = null, uploaded = null;
    let placement = null;   // {page, xPct, yPct, wPct}
    let previewCanvas = null, curPage = 1;

    /* --- draw pad --- */
    const pad = el('canvas', {
      width: 620, height: 210,
      style: { width: '100%', maxWidth: '620px', background: '#fff', border: '1px solid var(--line)', borderRadius: '12px', cursor: 'crosshair', touchAction: 'none' }
    });
    const pctx = pad.getContext('2d');
    pctx.fillStyle = '#fff'; pctx.fillRect(0, 0, pad.width, pad.height);
    pctx.lineWidth = 3.2; pctx.lineCap = 'round'; pctx.lineJoin = 'round'; pctx.strokeStyle = '#111827';
    let drawing = false, hasInk = false;
    const inkColor = el('input', { type: 'color', value: '#111827' });
    inkColor.addEventListener('input', () => (pctx.strokeStyle = inkColor.value));
    function padPt(e) {
      const r = pad.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      return { x: (t.clientX - r.left) * (pad.width / r.width), y: (t.clientY - r.top) * (pad.height / r.height) };
    }
    const pd = (e) => { e.preventDefault(); drawing = true; hasInk = true; const p = padPt(e); pctx.beginPath(); pctx.moveTo(p.x, p.y); };
    const pm = (e) => { if (!drawing) return; e.preventDefault(); const p = padPt(e); pctx.lineTo(p.x, p.y); pctx.stroke(); };
    const pu = () => { drawing = false; };
    pad.addEventListener('mousedown', pd); pad.addEventListener('mousemove', pm); window.addEventListener('mouseup', pu);
    pad.addEventListener('touchstart', pd, { passive: false }); pad.addEventListener('touchmove', pm, { passive: false }); pad.addEventListener('touchend', pu);
    function clearPad() { pctx.fillStyle = '#fff'; pctx.fillRect(0, 0, pad.width, pad.height); pctx.strokeStyle = inkColor.value; hasInk = false; }

    const drawPane = el('div', {}, [
      F.toolbar([el('span', { class: 'tb-label', text: 'Ink' }), inkColor,
      { label: 'Clear', icon: 'backspace', on: clearPad }]),
      pad
    ]);

    /* --- type pane --- */
    const typeIn = F.input({ placeholder: 'Your name', value: '' });
    const typeFont = F.select([
      { v: "'Brush Script MT', cursive", t: 'Signature script' },
      { v: "'Segoe Script', cursive", t: 'Handwriting' },
      { v: 'Georgia, serif', t: 'Classic serif' },
      { v: 'Roboto, sans-serif', t: 'Modern sans' }
    ], "'Brush Script MT', cursive");
    const typePreview = el('div', {
      style: {
        minHeight: '90px', display: 'grid', placeItems: 'center', background: '#fff',
        border: '1px solid var(--line)', borderRadius: '12px', fontSize: '42px', color: '#111827', padding: '10px'
      }
    });
    function syncType() {
      typePreview.textContent = typeIn.value || 'Your name';
      typePreview.style.fontFamily = typeFont.value;
      typePreview.style.color = inkColor.value;
    }
    typeIn.addEventListener('input', syncType);
    typeFont.addEventListener('change', syncType);
    syncType();
    const typePane = el('div', {}, [F.rows([F.field('Name', typeIn), F.field('Style', typeFont)]), typePreview]);

    /* --- upload pane --- */
    const upDz = F.dropzone({
      accept: 'image/*', multiple: false, label: 'Upload a signature image',
      sub: 'A PNG with a transparent background gives the cleanest result.',
      onFiles: (f) => { uploaded = f[0] || null; }
    });
    const removeBg = F.checkbox('Make white pixels transparent', true);

    let sigMode = 'draw';
    const sigTabs = F.tabs([
      { id: 'draw', label: 'Draw', node: drawPane },
      { id: 'type', label: 'Type', node: typePane },
      { id: 'upload', label: 'Upload', node: el('div', {}, [upDz.node, removeBg]) }
    ], (id) => { sigMode = id; });

    /* --- placement --- */
    const stage = el('div', { class: 'editor-stage', style: { position: 'relative', minHeight: '120px' } });
    const pageSel = F.select([], '1');
    const sizePct = F.input({ type: 'range', min: '8', max: '70', value: '26' });
    const sizeLbl = el('span', { class: 'tb-label', text: '26%' });
    sizePct.addEventListener('input', () => { sizeLbl.textContent = sizePct.value + '%'; drawMarker(); });
    const dateChk = F.checkbox('Stamp the date next to the signature', false);
    const reasonIn = F.input({ placeholder: 'Reason (optional) — e.g. Approved' });
    const allPages = F.checkbox('Place on every page at the same spot', false);

    const dz = F.dropzone({
      multiple: false, label: 'Choose the PDF to sign',
      onFiles: async (fs) => {
        if (!fs.length) { F.setGo(false); return; }
        file = fs[0];
        await F.run('Opening…', async () => {
          buf = await F.readBuf(file);
          pdf = await F.loadPdfJs(buf);
          pageSel.innerHTML = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            pageSel.appendChild(el('option', { value: String(i), text: 'Page ' + i }));
          }
          await showPage(1);
          F.setGo(true);
        });
      }
    });
    pageSel.addEventListener('change', () => showPage(+pageSel.value));

    async function showPage(n) {
      curPage = n;
      placement = null;
      const p = await pdf.getPage(n);
      const vp = p.getViewport({ scale: 1 });
      previewCanvas = await F.renderPage(pdf, n, { scale: Math.min(1.4, 620 / vp.width) });
      stage.innerHTML = '';
      const holder = el('div', { style: { position: 'relative', display: 'inline-block' } });
      holder.appendChild(previewCanvas);
      const marker = el('div', {
        id: 'sigMarker',
        style: {
          position: 'absolute', border: '2px dashed #1e88e5', background: 'rgba(30,136,229,.14)',
          display: 'none', pointerEvents: 'none', borderRadius: '4px'
        }
      });
      holder.appendChild(marker);
      holder.addEventListener('click', (e) => {
        const r = previewCanvas.getBoundingClientRect();
        const xPct = (e.clientX - r.left) / r.width;
        const yPct = (e.clientY - r.top) / r.height;
        placement = { page: n, xPct, yPct, wPct: (+sizePct.value || 26) / 100 };
        drawMarker();
      });
      stage.appendChild(holder);
    }
    function drawMarker() {
      const marker = F.$('#sigMarker', stage);
      if (!marker || !placement || !previewCanvas) return;
      const r = previewCanvas.getBoundingClientRect();
      const w = r.width * ((+sizePct.value || 26) / 100);
      const h = w * 0.34;
      placement.wPct = (+sizePct.value || 26) / 100;
      marker.style.display = 'block';
      marker.style.left = (placement.xPct * r.width - w / 2) + 'px';
      marker.style.top = (placement.yPct * r.height - h / 2) + 'px';
      marker.style.width = w + 'px';
      marker.style.height = h + 'px';
    }

    body.appendChild(F.note('Create your signature, then <b>click on the page preview</b> to place it. This is an electronic (visual) signature, not a cryptographic digital certificate.'));
    body.appendChild(dz.node);
    body.appendChild(F.section('1 · Your signature'));
    body.appendChild(sigTabs);
    body.appendChild(F.section('2 · Place it'));
    body.appendChild(F.rows([F.field('Page', pageSel),
    F.field('Size', el('div', { style: { display: 'flex', gap: '12px', alignItems: 'center' } }, [sizePct, sizeLbl])),
    F.field('Reason', reasonIn)]));
    body.appendChild(stage);
    body.appendChild(dateChk);
    body.appendChild(allPages);

    async function signatureCanvas() {
      if (sigMode === 'draw') {
        if (!hasInk) throw new Error('Draw your signature first.');
        return trimWhite(pad);
      }
      if (sigMode === 'type') {
        if (!typeIn.value.trim()) throw new Error('Type your name first.');
        const c = el('canvas');
        c.width = 900; c.height = 260;
        const cc = c.getContext('2d');
        cc.fillStyle = '#fff'; cc.fillRect(0, 0, c.width, c.height);
        cc.fillStyle = inkColor.value;
        cc.font = '120px ' + typeFont.value;
        cc.textBaseline = 'middle';
        cc.textAlign = 'center';
        cc.fillText(typeIn.value, c.width / 2, c.height / 2);
        return trimWhite(c);
      }
      if (!uploaded) throw new Error('Upload a signature image first.');
      const url = URL.createObjectURL(uploaded);
      try {
        const img = await F.loadImage(url);
        const c = el('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const cc = c.getContext('2d');
        cc.drawImage(img, 0, 0);
        return removeBg.input.checked ? whiteToAlpha(c) : c;
      } finally { URL.revokeObjectURL(url); }
    }

    function trimWhite(src) {
      const cc = src.getContext('2d');
      const d = cc.getImageData(0, 0, src.width, src.height).data;
      let minX = src.width, minY = src.height, maxX = 0, maxY = 0, found = false;
      for (let y = 0; y < src.height; y++) {
        for (let x = 0; x < src.width; x++) {
          const i = (y * src.width + x) * 4;
          if (d[i] < 235 || d[i + 1] < 235 || d[i + 2] < 235) {
            found = true;
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
          }
        }
      }
      if (!found) { minX = 0; minY = 0; maxX = src.width - 1; maxY = src.height - 1; }
      const pad2 = 8;
      minX = Math.max(0, minX - pad2); minY = Math.max(0, minY - pad2);
      maxX = Math.min(src.width - 1, maxX + pad2); maxY = Math.min(src.height - 1, maxY + pad2);
      const out = el('canvas');
      out.width = maxX - minX + 1; out.height = maxY - minY + 1;
      out.getContext('2d').drawImage(src, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
      return whiteToAlpha(out);
    }
    function whiteToAlpha(c) {
      const cc = c.getContext('2d');
      const im = cc.getImageData(0, 0, c.width, c.height);
      const a = im.data;
      for (let i = 0; i < a.length; i += 4) {
        const lum = (a[i] + a[i + 1] + a[i + 2]) / 3;
        if (lum > 232) a[i + 3] = 0;
        else if (lum > 170) a[i + 3] = Math.round(255 * (232 - lum) / 62);
      }
      cc.putImageData(im, 0, 0);
      return c;
    }

    F.footBtns(foot, {
      action: 'Sign PDF', actionIcon: 'gesture', disabled: true,
      onAction: () => F.run('Signing…', async () => {
        if (!placement) throw new Error('Click on the page preview to choose where the signature goes.');
        const { PDFLib } = F.needs(['PDFLib']);
        const sc = await signatureCanvas();
        const doc = await F.loadPdfLib(buf);
        const img = await doc.embedPng(await F.canvasBytes(sc, 'image/png'));
        const font = await F.embedFont(doc, 'Helvetica');
        const pages = doc.getPages();
        const targets = allPages.input.checked ? pages.map((_, i) => i) : [placement.page - 1];
        targets.forEach((pi) => {
          const page = pages[pi];
          const pw = page.getWidth(), ph = page.getHeight();
          const w = pw * placement.wPct;
          const h = (sc.height / sc.width) * w;
          const x = placement.xPct * pw - w / 2;
          const y = ph - placement.yPct * ph - h / 2;
          page.drawImage(img, { x: Math.max(0, x), y: Math.max(0, y), width: w, height: h });
          const extras = [];
          if (dateChk.input.checked) extras.push(new Date().toLocaleDateString());
          if (reasonIn.value.trim()) extras.push(reasonIn.value.trim());
          if (extras.length) {
            page.drawText(F.wa(extras.join('  ·  ')), {
              x: Math.max(2, x), y: Math.max(2, y - 12), size: 8.5, font,
              color: PDFLib.rgb(0.32, 0.34, 0.38)
            });
          }
        });
        const name = F.baseName(file.name) + '_signed.pdf';
        const data = await F.savePdfDoc(doc, name);
        F.result(body, {
          title: 'Signed', msg: targets.length + ' page(s) signed.',
          stats: [{ k: 'Pages signed', v: String(targets.length) }, { k: 'Size', v: F.fmtSize(data.length) }],
          actions: [{ label: 'Download again', icon: 'download', primary: true, on: () => F.saveBytes(data, name) },
          { label: 'Sign another', icon: 'refresh', on: () => F.launch('sign') }]
        });
        F.footBtns(foot, {});
      })
    });
  });

  /* =========================================================
     REPAIR PDF
     ========================================================= */
  F.register('repair', function (ctx) {
    const { body, foot } = ctx;
    let files = [];
    const deep = F.checkbox('Deep recovery — rebuild pages from rendered output', false);
    const log = el('div', { class: 'cmp-col', style: { marginTop: '14px', display: 'none' } }, [
      el('h5', { text: 'Recovery log' }),
      el('div', { class: 'pane', id: 'repairLog' })
    ]);

    const dz = F.dropzone({
      accept: '.pdf,application/pdf,*', multiple: true, label: 'Choose damaged PDFs',
      onFiles: (f) => { files = f; F.setGo(f.length > 0); }
    });
    body.appendChild(F.note('Rebuilds the cross-reference table and object structure. Deep recovery rasterises whatever still renders — slower, but it saves badly broken files.'));
    body.appendChild(dz.node);
    body.appendChild(deep);
    body.appendChild(log);

    function say(msg) {
      log.style.display = 'block';
      const pane = F.$('#repairLog', log);
      pane.textContent += msg + '\n';
      pane.scrollTop = pane.scrollHeight;
    }

    F.footBtns(foot, {
      action: 'Repair PDF', actionIcon: 'healing', disabled: true,
      onAction: () => F.run('Repairing…', async () => {
        const outs = [];
        const failed = [];
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          F.progress((i / files.length) * 100, f.name);
          say('▸ ' + f.name + ' (' + F.fmtSize(f.size) + ')');
          let data = null;
          const raw = await F.readBuf(f);

          // strategy 1 — pdf-lib tolerant parse & rewrite
          if (!deep.input.checked) {
            try {
              const doc = await F.loadPdfLib(raw, { throwOnInvalidObject: false });
              F.stamp(doc);
              data = await doc.save({ useObjectStreams: false });
              say('  ✓ structure rebuilt (' + doc.getPageCount() + ' pages)');
            } catch (e) { say('  · direct rebuild failed: ' + e.message); }
          }

          // strategy 2 — copy pages one by one into a fresh document
          if (!data) {
            try {
              const src = await F.loadPdfLib(raw, { throwOnInvalidObject: false });
              const out = await F.newPdf();
              let ok = 0;
              for (const pi of src.getPageIndices()) {
                try { const [p] = await out.copyPages(src, [pi]); out.addPage(p); ok++; }
                catch (e) { say('  ! page ' + (pi + 1) + ' unrecoverable'); }
              }
              if (ok) { F.stamp(out); data = await out.save(); say('  ✓ salvaged ' + ok + ' page(s)'); }
            } catch (e) { say('  · page-by-page failed: ' + e.message); }
          }

          // strategy 3 — render with pdf.js and rebuild as images
          if (!data) {
            try {
              const pdf = await F.loadPdfJs(raw);
              const out = await F.newPdf();
              let ok = 0;
              for (let p = 1; p <= pdf.numPages; p++) {
                try {
                  const pg = await pdf.getPage(p);
                  const vp = pg.getViewport({ scale: 1 });
                  const canvas = await F.renderPage(pdf, p, { scale: 2 });
                  const img = await out.embedJpg(await F.canvasBytes(canvas, 'image/jpeg', 0.92));
                  const np = out.addPage([vp.width, vp.height]);
                  np.drawImage(img, { x: 0, y: 0, width: vp.width, height: vp.height });
                  canvas.width = canvas.height = 0;
                  ok++;
                } catch (e) { say('  ! page ' + p + ' could not render'); }
                await F.tick();
              }
              if (ok) { F.stamp(out); data = await out.save(); say('  ✓ rendered ' + ok + ' page(s)'); }
            } catch (e) { say('  · render recovery failed: ' + e.message); }
          }

          if (data) outs.push({ name: F.baseName(f.name) + '_repaired.pdf', data });
          else { failed.push(f.name); say('  ✗ nothing could be recovered'); }
        }
        if (!outs.length) throw new Error('No data could be recovered from these files.');
        if (outs.length === 1) F.saveBytes(outs[0].data, outs[0].name);
        else await F.saveZip(outs, 'repaired_pdfs.zip');
        F.toast('Repaired ' + outs.length + ' file(s).', 'ok');
        if (failed.length) F.toast(failed.length + ' file(s) could not be recovered.', 'warn');
      })
    });
  });

  /* =========================================================
     OCR PDF
     ========================================================= */
  F.register('ocr', function (ctx) {
    const { body, foot } = ctx;
    let file = null, buf = null;
    const lang = F.select([
      { v: 'eng', t: 'English' },
      { v: 'hin', t: 'Hindi — हिन्दी' },
      { v: 'guj', t: 'Gujarati — ગુજરાતી' },
      { v: 'mar', t: 'Marathi — मराठी' },
      { v: 'ben', t: 'Bengali — বাংলা' },
      { v: 'tam', t: 'Tamil — தமிழ்' },
      { v: 'tel', t: 'Telugu — తెలుగు' },
      { v: 'kan', t: 'Kannada — ಕನ್ನಡ' },
      { v: 'mal', t: 'Malayalam — മലയാളം' },
      { v: 'pan', t: 'Punjabi — ਪੰਜਾਬੀ' },
      { v: 'urd', t: 'Urdu — اردو' },
      { v: 'ara', t: 'Arabic' },
      { v: 'fra', t: 'French' },
      { v: 'deu', t: 'German' },
      { v: 'spa', t: 'Spanish' },
      { v: 'eng+hin', t: 'English + Hindi' },
      { v: 'eng+guj', t: 'English + Gujarati' }
    ], 'eng');
    const outMode = F.select([
      { v: 'pdf', t: 'Searchable PDF — image + invisible text' },
      { v: 'txt', t: 'Plain text file (.txt)' },
      { v: 'both', t: 'Both' }
    ], 'pdf');
    const dpi = F.select([{ v: '1.6', t: 'Fast (120 DPI)' }, { v: '2.2', t: 'Balanced (160 DPI)' },
    { v: '3', t: 'Accurate (220 DPI)' }], '2.2');
    const rangeIn = F.input({ placeholder: 'all  (or 1-5)' });
    const preproc = F.checkbox('Pre-process: grayscale + contrast boost', true);
    const logPane = el('div', { class: 'cmp-col', style: { marginTop: '14px', display: 'none' } }, [
      el('h5', { text: 'Recognised text' }),
      el('div', { class: 'pane', id: 'ocrPane' })
    ]);

    const dz = F.dropzone({
      accept: '.pdf,image/*', multiple: false, label: 'Choose a scanned PDF or image',
      onFiles: async (fs) => {
        if (!fs.length) { F.setGo(false); return; }
        file = fs[0];
        buf = await F.readBuf(file);
        F.setGo(true);
      }
    });

    body.appendChild(F.note('OCR runs completely offline using Tesseract WebAssembly. The first run downloads the language data (a few MB) and caches it for later offline use.'));
    body.appendChild(dz.node);
    body.appendChild(F.rows([F.field('Language', lang), F.field('Output', outMode),
    F.field('Quality', dpi), F.field('Pages', rangeIn)]));
    body.appendChild(preproc);
    body.appendChild(logPane);

    F.footBtns(foot, {
      action: 'Run OCR', actionIcon: 'document_scanner', disabled: true,
      onAction: () => F.run('Preparing OCR…', async () => {
        const { Tesseract, PDFLib } = F.needs(['Tesseract', 'PDFLib']);
        const isImage = /^image\//.test(file.type) || /\.(png|jpe?g|webp|bmp|gif)$/i.test(file.name);

        // build the list of page canvases
        const canvases = [];
        const sizes = [];
        if (isImage) {
          const url = URL.createObjectURL(file);
          const img = await F.loadImage(url);
          const c = el('canvas');
          c.width = img.naturalWidth; c.height = img.naturalHeight;
          c.getContext('2d').drawImage(img, 0, 0);
          URL.revokeObjectURL(url);
          canvases.push(c);
          sizes.push([img.naturalWidth * 0.75, img.naturalHeight * 0.75]);
        } else {
          const pdf = await F.loadPdfJs(buf);
          const idx = F.parseRange(rangeIn.value || 'all', pdf.numPages);
          for (const i of idx) {
            const pg = await pdf.getPage(i + 1);
            const vp = pg.getViewport({ scale: 1 });
            const c = await F.renderPage(pdf, i + 1, { scale: +dpi.value });
            canvases.push(c);
            sizes.push([vp.width, vp.height]);
            await F.tick();
          }
        }

        const worker = await Tesseract.createWorker(lang.value, 1, {
          logger: (m) => {
            if (m.status && typeof m.progress === 'number') {
              F.progress(m.progress * 100, m.status.replace(/^\w/, (s) => s.toUpperCase()));
            }
          }
        });

        const out = await F.newPdf();
        const font = await F.embedFont(out, 'Helvetica');
        let allText = '';
        const pane = F.$('#ocrPane', logPane);
        logPane.style.display = 'block';
        pane.textContent = '';

        try {
          for (let i = 0; i < canvases.length; i++) {
            F.progress((i / canvases.length) * 100, 'Reading page ' + (i + 1) + ' / ' + canvases.length);
            let c = canvases[i];
            if (preproc.input.checked) c = boost(F.toGray(c));
            const { data } = await worker.recognize(c);
            allText += (i ? '\n\n--- Page ' + (i + 1) + ' ---\n' : '') + (data.text || '').trim();
            pane.textContent += (data.text || '').trim() + '\n\n';

            if (outMode.value !== 'txt') {
              const [pw, ph] = sizes[i];
              const page = out.addPage([pw, ph]);
              const jpg = await F.canvasBytes(canvases[i], 'image/jpeg', 0.85);
              const img = await out.embedJpg(jpg);
              page.drawImage(img, { x: 0, y: 0, width: pw, height: ph });
              const kx = pw / c.width, ky = ph / c.height;
              const words = (data.words || []).filter((w) => w.text && w.text.trim() && w.confidence > 35);
              words.forEach((w) => {
                const bb = w.bbox;
                const h = (bb.y1 - bb.y0) * ky;
                const txt = F.wa(w.text);
                if (!txt) return;
                let size = Math.max(3, h * 0.82);
                let tw;
                try { tw = font.widthOfTextAtSize(txt, size); } catch (e) { tw = txt.length * size * 0.5; }
                const target = (bb.x1 - bb.x0) * kx;
                if (tw > 0 && target > 0) size = size * Math.min(2, target / tw);
                try {
                  page.drawText(txt, {
                    x: bb.x0 * kx, y: ph - bb.y1 * ky + h * 0.16,
                    size: Math.max(2, size), font,
                    color: PDFLib.rgb(0, 0, 0), opacity: 0
                  });
                } catch (e) { /* skip unmappable glyphs */ }
              });
            }
            canvases[i].width = canvases[i].height = 0;
            await F.tick();
          }
        } finally {
          try { await worker.terminate(); } catch (e) { }
        }

        const base = F.baseName(file.name);
        if (outMode.value !== 'txt') {
          F.stamp(out);
          const data = await out.save();
          F.saveBytes(data, base + '_ocr.pdf');
        }
        if (outMode.value !== 'pdf') {
          F.saveBlob(new Blob([allText], { type: 'text/plain;charset=utf-8' }), base + '_ocr.txt');
        }
        const words = allText.split(/\s+/).filter(Boolean).length;
        F.toast('OCR finished — ' + words + ' words recognised.', 'ok');
        F.progress(100, 'Done');
      })
    });

    function boost(c) {
      const cc = c.getContext('2d');
      const im = cc.getImageData(0, 0, c.width, c.height);
      const a = im.data;
      for (let i = 0; i < a.length; i += 4) {
        let v = (a[i] - 128) * 1.6 + 132;
        v = v < 0 ? 0 : v > 255 ? 255 : v;
        a[i] = a[i + 1] = a[i + 2] = v;
      }
      cc.putImageData(im, 0, 0);
      return c;
    }
  });

  /* =========================================================
     REDACT PDF
     ========================================================= */
  F.register('redact', function (ctx) {
    const { body, foot } = ctx;
    let file = null, buf = null, pdf = null, curPage = 1, canvas = null;
    const boxes = {};   // page -> [{xPct,yPct,wPct,hPct}]
    const stage = el('div', { class: 'editor-stage', style: { position: 'relative' } });
    const side = el('div', { class: 'editor-side' });
    const wrap = el('div', { class: 'editor-wrap' }, [side, stage]);
    const searchIn = F.input({ placeholder: 'Find text to redact, e.g. Aadhaar number' });
    const caseChk = F.checkbox('Match case', false);
    const regexChk = F.checkbox('Treat as regular expression', false);

    const dz = F.dropzone({
      multiple: false, label: 'Choose a PDF to redact',
      onFiles: async (fs) => {
        if (!fs.length) { F.setGo(false); return; }
        file = fs[0];
        await F.run('Opening…', async () => {
          buf = await F.readBuf(file);
          pdf = await F.loadPdfJs(buf);
          Object.keys(boxes).forEach((k) => delete boxes[k]);
          side.innerHTML = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const cell = el('div', { class: 'thumb', onclick: () => showPage(i) }, [el('div', { class: 'pn', text: String(i) })]);
            cell._p = i;
            side.appendChild(cell);
            F.renderPage(pdf, i, { scale: 0.3, maxW: 160 }).then((c) => cell.insertBefore(c, cell.firstChild)).catch(() => { });
            if (i % 5 === 0) await F.tick();
          }
          await showPage(1);
          wrap.style.display = 'flex';
          F.setGo(true);
        });
      }
    });

    async function showPage(n) {
      curPage = n;
      F.$$('.thumb', side).forEach((c) => c.classList.toggle('sel', c._p === n));
      const pg = await pdf.getPage(n);
      const vp = pg.getViewport({ scale: 1 });
      canvas = await F.renderPage(pdf, n, { scale: Math.min(1.5, 660 / vp.width) });
      stage.innerHTML = '';
      const holder = el('div', { style: { position: 'relative', display: 'inline-block' }, id: 'redHolder' });
      holder.appendChild(canvas);
      stage.appendChild(holder);
      bindDrag(holder);
      paint();
    }

    function bindDrag(holder) {
      let start = null, live = null;
      const pt = (e) => {
        const r = canvas.getBoundingClientRect();
        const t = e.touches ? e.touches[0] : e;
        return {
          x: Math.max(0, Math.min(r.width, t.clientX - r.left)),
          y: Math.max(0, Math.min(r.height, t.clientY - r.top)), r
        };
      };
      const down = (e) => { e.preventDefault(); start = pt(e); };
      const move = (e) => {
        if (!start) return;
        e.preventDefault();
        const p = pt(e);
        live = { x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y), r: p.r };
        paint(live);
      };
      const up = () => {
        if (!start || !live || live.w < 5 || live.h < 5) { start = null; live = null; paint(); return; }
        const r = live.r;
        (boxes[curPage] = boxes[curPage] || []).push({
          xPct: live.x / r.width, yPct: live.y / r.height,
          wPct: live.w / r.width, hPct: live.h / r.height
        });
        start = null; live = null;
        paint();
      };
      holder.addEventListener('mousedown', down);
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
      holder.addEventListener('touchstart', down, { passive: false });
      holder.addEventListener('touchmove', move, { passive: false });
      holder.addEventListener('touchend', up);
    }

    function paint(live) {
      const holder = F.$('#redHolder', stage);
      if (!holder) return;
      F.$$('.redbox', holder).forEach((b) => b.remove());
      const r = canvas.getBoundingClientRect();
      (boxes[curPage] || []).forEach((b, i) => {
        const d = el('div', {
          class: 'redbox',
          style: {
            position: 'absolute', left: (b.xPct * r.width) + 'px', top: (b.yPct * r.height) + 'px',
            width: (b.wPct * r.width) + 'px', height: (b.hPct * r.height) + 'px',
            background: '#000', cursor: 'pointer', border: '1px solid #444'
          },
          title: 'Click to remove this redaction',
          onclick: (e) => { e.stopPropagation(); boxes[curPage].splice(i, 1); paint(); }
        });
        holder.appendChild(d);
      });
      if (live) {
        holder.appendChild(el('div', {
          class: 'redbox',
          style: {
            position: 'absolute', left: live.x + 'px', top: live.y + 'px',
            width: live.w + 'px', height: live.h + 'px',
            background: 'rgba(0,0,0,.6)', pointerEvents: 'none'
          }
        }));
      }
      updateCount();
    }
    const countLbl = el('span', { class: 'tb-label', text: '0 areas marked' });
    function updateCount() {
      const total = Object.keys(boxes).reduce((a, k) => a + boxes[k].length, 0);
      countLbl.textContent = total + ' area(s) marked';
      F.setGo(total > 0);
    }

    async function findText() {
      if (!pdf) { F.toast('Open a PDF first.', 'warn'); return; }
      const q = searchIn.value;
      if (!q) { F.toast('Type something to find.', 'warn'); return; }
      await F.run('Searching…', async () => {
        let re;
        try {
          re = regexChk.input.checked ? new RegExp(q, caseChk.input.checked ? 'g' : 'gi')
            : new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseChk.input.checked ? 'g' : 'gi');
        } catch (e) { throw new Error('Invalid regular expression.'); }
        let hits = 0;
        for (let p = 1; p <= pdf.numPages; p++) {
          const pg = await pdf.getPage(p);
          const vp = pg.getViewport({ scale: 1 });
          const tc = await pg.getTextContent();
          tc.items.forEach((it) => {
            if (!it.str) return;
            re.lastIndex = 0;
            if (!re.test(it.str)) return;
            const h = Math.abs(it.transform[3]) || it.height || 10;
            const x = it.transform[4];
            const y = vp.height - it.transform[5] - h;
            (boxes[p] = boxes[p] || []).push({
              xPct: Math.max(0, (x - 1) / vp.width),
              yPct: Math.max(0, (y - 1) / vp.height),
              wPct: Math.min(1, ((it.width || h * it.str.length * 0.5) + 2) / vp.width),
              hPct: Math.min(1, (h + 3) / vp.height)
            });
            hits++;
          });
          if (p % 5 === 0) await F.tick();
        }
        paint();
        F.toast(hits ? hits + ' match(es) marked for redaction.' : 'No matches found.', hits ? 'ok' : 'warn');
      });
    }

    body.appendChild(F.note('Drag black boxes over anything sensitive, or search for text to mark automatically. On save, the pages are <b>rasterised</b> so the hidden text is physically gone — not just covered.', 'warn'));
    body.appendChild(dz.node);
    body.appendChild(F.toolbar([
      searchIn, { label: 'Find & mark', icon: 'search', on: findText },
      caseChk, regexChk, '|',
      { label: 'Clear page', icon: 'layers_clear', on: () => { boxes[curPage] = []; paint(); } },
      { label: 'Clear all', icon: 'delete_sweep', on: () => { Object.keys(boxes).forEach((k) => delete boxes[k]); paint(); } },
      '|', countLbl
    ]));
    body.appendChild(wrap);
    wrap.style.display = 'none';

    F.footBtns(foot, {
      action: 'Apply redactions', actionIcon: 'visibility_off', disabled: true,
      onAction: () => F.run('Redacting…', async () => {
        const out = await F.newPdf();
        for (let p = 1; p <= pdf.numPages; p++) {
          F.progress((p / pdf.numPages) * 100, 'Page ' + p);
          const pg = await pdf.getPage(p);
          const vp = pg.getViewport({ scale: 1 });
          const c = await F.renderPage(pdf, p, { scale: 2 });
          const cc = c.getContext('2d');
          (boxes[p] || []).forEach((b) => {
            cc.fillStyle = '#000';
            cc.fillRect(b.xPct * c.width, b.yPct * c.height, b.wPct * c.width, b.hPct * c.height);
          });
          const img = await out.embedJpg(await F.canvasBytes(c, 'image/jpeg', 0.92));
          const np = out.addPage([vp.width, vp.height]);
          np.drawImage(img, { x: 0, y: 0, width: vp.width, height: vp.height });
          c.width = c.height = 0;
          await F.tick();
        }
        const name = F.baseName(file.name) + '_redacted.pdf';
        const data = await F.savePdfDoc(out, name);
        const total = Object.keys(boxes).reduce((a, k) => a + boxes[k].length, 0);
        F.result(body, {
          title: 'Redacted permanently', msg: 'The underlying text was destroyed, not hidden.',
          stats: [{ k: 'Areas redacted', v: String(total) }, { k: 'Pages', v: String(out.getPageCount()) },
          { k: 'Size', v: F.fmtSize(data.length) }],
          actions: [{ label: 'Download again', icon: 'download', primary: true, on: () => F.saveBytes(data, name) },
          { label: 'Redact another', icon: 'refresh', on: () => F.launch('redact') }]
        });
        F.footBtns(foot, {});
      })
    });
  });

  /* =========================================================
     COMPARE PDF
     ========================================================= */
  F.register('compare', function (ctx) {
    const { body, foot } = ctx;
    let fileA = null, fileB = null;
    const mode = F.select([{ v: 'text', t: 'Text differences' }, { v: 'visual', t: 'Visual (side-by-side pages)' }], 'text');
    const pageIn = F.input({ type: 'number', value: '1', min: '1' });
    const out = el('div', { style: { marginTop: '16px' } });

    const dzA = F.dropzone({ multiple: false, label: 'Original document (A)', onFiles: (f) => { fileA = f[0]; sync(); } });
    const dzB = F.dropzone({ multiple: false, label: 'Revised document (B)', onFiles: (f) => { fileB = f[0]; sync(); } });
    function sync() { F.setGo(!!fileA && !!fileB); }

    body.appendChild(F.note('Both documents stay on your device. Text mode highlights <ins>additions</ins> and <del>deletions</del>.'));
    body.appendChild(el('div', { class: 'cmp' }, [
      el('div', {}, [el('h4', { style: { fontSize: '13px', marginBottom: '8px' }, text: 'Document A' }), dzA.node]),
      el('div', {}, [el('h4', { style: { fontSize: '13px', marginBottom: '8px' }, text: 'Document B' }), dzB.node])
    ]));
    body.appendChild(F.rows([F.field('Comparison mode', mode), F.field('Visual page number', pageIn)]));
    body.appendChild(out);

    F.footBtns(foot, {
      action: 'Compare', actionIcon: 'difference', disabled: true,
      onAction: () => F.run('Comparing…', async () => {
        out.innerHTML = '';
        const pa = await F.loadPdfJs(await F.readBuf(fileA));
        const pb = await F.loadPdfJs(await F.readBuf(fileB));

        if (mode.value === 'visual') {
          const n = Math.max(1, Math.min(+pageIn.value || 1, Math.max(pa.numPages, pb.numPages)));
          const ca = n <= pa.numPages ? await F.renderPage(pa, n, { scale: 1.1 }) : null;
          const cb = n <= pb.numPages ? await F.renderPage(pb, n, { scale: 1.1 }) : null;
          const colA = el('div', { class: 'cmp-col' }, [el('h5', { text: 'A — page ' + n }), el('div', { class: 'pane' })]);
          const colB = el('div', { class: 'cmp-col' }, [el('h5', { text: 'B — page ' + n }), el('div', { class: 'pane' })]);
          if (ca) { ca.style.width = '100%'; ca.style.height = 'auto'; F.$('.pane', colA).appendChild(ca); }
          else F.$('.pane', colA).textContent = '(page does not exist)';
          if (cb) { cb.style.width = '100%'; cb.style.height = 'auto'; F.$('.pane', colB).appendChild(cb); }
          else F.$('.pane', colB).textContent = '(page does not exist)';

          // pixel difference overlay
          let diffPct = null;
          if (ca && cb) {
            const w = Math.min(ca.width, cb.width), h = Math.min(ca.height, cb.height);
            const da = ca.getContext('2d').getImageData(0, 0, w, h).data;
            const db = cb.getContext('2d').getImageData(0, 0, w, h).data;
            const dc = el('canvas'); dc.width = w; dc.height = h;
            const dctx = dc.getContext('2d');
            const im = dctx.createImageData(w, h);
            let diff = 0;
            for (let i = 0; i < da.length; i += 4) {
              const d = Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]);
              if (d > 40) {
                diff++;
                im.data[i] = 226; im.data[i + 1] = 35; im.data[i + 2] = 26; im.data[i + 3] = 235;
              } else {
                const g = 255 - (255 - da[i]) * 0.18;
                im.data[i] = im.data[i + 1] = im.data[i + 2] = g; im.data[i + 3] = 255;
              }
            }
            dctx.putImageData(im, 0, 0);
            diffPct = ((diff / (w * h)) * 100).toFixed(2);
            dc.style.width = '100%'; dc.style.height = 'auto';
            const colD = el('div', { class: 'cmp-col', style: { gridColumn: '1 / -1' } }, [
              el('h5', { text: 'Overlay — ' + diffPct + '% of pixels differ' }),
              el('div', { class: 'pane' }, [dc])
            ]);
            out.appendChild(el('div', { class: 'cmp' }, [colA, colB, colD]));
          } else {
            out.appendChild(el('div', { class: 'cmp' }, [colA, colB]));
          }
          F.toast('Visual comparison ready.', 'ok');
          return;
        }

        // ---- text mode ----
        let ta = '', tb = '';
        for (let i = 1; i <= pa.numPages; i++) {
          F.progress((i / (pa.numPages + pb.numPages)) * 100, 'Reading A, page ' + i);
          ta += await F.pageText(pa, i) + '\n\n';
        }
        for (let i = 1; i <= pb.numPages; i++) {
          F.progress(((pa.numPages + i) / (pa.numPages + pb.numPages)) * 100, 'Reading B, page ' + i);
          tb += await F.pageText(pb, i) + '\n\n';
        }
        const diff = F.diffWords(ta.trim(), tb.trim());
        let added = 0, removed = 0, same = 0;
        const htmlA = [], htmlB = [], htmlU = [];
        diff.forEach((d) => {
          const esc = F.escapeHtml(d.v);
          if (d.t === '=') { same += d.v.trim() ? 1 : 0; htmlA.push(esc); htmlB.push(esc); htmlU.push(esc); }
          else if (d.t === '-') { if (d.v.trim()) removed++; htmlA.push('<del>' + esc + '</del>'); htmlU.push('<del>' + esc + '</del>'); }
          else { if (d.v.trim()) added++; htmlB.push('<ins>' + esc + '</ins>'); htmlU.push('<ins>' + esc + '</ins>'); }
        });

        out.appendChild(el('div', { class: 'stat-grid' }, [
          el('div', { class: 'stat' }, [el('b', { text: String(added) }), el('span', { text: 'Words added' })]),
          el('div', { class: 'stat' }, [el('b', { text: String(removed) }), el('span', { text: 'Words removed' })]),
          el('div', { class: 'stat' }, [el('b', { text: String(same) }), el('span', { text: 'Words unchanged' })]),
          el('div', { class: 'stat' }, [
            el('b', { text: (added + removed) === 0 ? 'Identical' : Math.round(((added + removed) / Math.max(1, added + removed + same)) * 100) + '%' }),
            el('span', { text: 'Change level' })
          ])
        ]));
        out.appendChild(el('div', { class: 'cmp' }, [
          el('div', { class: 'cmp-col' }, [el('h5', { text: 'A — ' + F.escapeHtml(fileA.name) }), el('div', { class: 'pane', html: htmlA.join('') })]),
          el('div', { class: 'cmp-col' }, [el('h5', { text: 'B — ' + F.escapeHtml(fileB.name) }), el('div', { class: 'pane', html: htmlB.join('') })])
        ]));
        out.appendChild(el('div', { class: 'cmp-col', style: { marginTop: '12px' } }, [
          el('h5', { text: 'Combined change view' }),
          el('div', { class: 'pane', html: htmlU.join('') })
        ]));

        F.footBtns(foot, {
          action: 'Compare again', actionIcon: 'refresh',
          onAction: () => F.launch('compare'),
          extra: [el('button', {
            class: 'btn', onclick: () => {
              const report = 'Comparison report — The PDF Factory\n' +
                'A: ' + fileA.name + '\nB: ' + fileB.name + '\n' +
                'Generated: ' + new Date().toLocaleString() + '\n\n' +
                'Words added: ' + added + '\nWords removed: ' + removed + '\nWords unchanged: ' + same + '\n\n' +
                '=== DOCUMENT A ===\n' + ta.trim() + '\n\n=== DOCUMENT B ===\n' + tb.trim();
              F.saveBlob(new Blob([report], { type: 'text/plain;charset=utf-8' }), 'comparison_report.txt');
            }
          }, [mi('download'), 'Save report'])]
        });
        F.toast(added + removed === 0 ? 'The documents are identical.' : 'Found ' + (added + removed) + ' differences.',
          added + removed === 0 ? 'ok' : 'info');
      })
    });
  });

  /* =========================================================
     FLATTEN PDF
     ========================================================= */
  F.register('flatten', function (ctx) {
    const { body, foot } = ctx;
    let files = [];
    const mode = F.select([
      { v: 'forms', t: 'Flatten form fields & annotations (keeps text)' },
      { v: 'raster', t: 'Flatten everything to images (nothing editable)' }
    ], 'forms');
    const quality = F.select([{ v: '1.5', t: 'Standard' }, { v: '2', t: 'High' }, { v: '3', t: 'Print' }], '2');

    const dz = F.dropzone({ multiple: true, label: 'Choose PDFs to flatten', onFiles: (f) => { files = f; F.setGo(f.length > 0); } });
    body.appendChild(F.note('Flattening bakes filled form fields, stamps and comments into the page so they can no longer be changed.'));
    body.appendChild(dz.node);
    body.appendChild(F.rows([F.field('Mode', mode), F.field('Raster quality', quality)]));

    F.footBtns(foot, {
      action: 'Flatten', actionIcon: 'layers_clear', disabled: true,
      onAction: () => F.run('Flattening…', async () => {
        const outs = [];
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          F.progress((i / files.length) * 100, f.name);
          let data;
          if (mode.value === 'forms') {
            const doc = await F.loadPdfLib(f);
            try {
              const form = doc.getForm();
              form.flatten();
            } catch (e) { console.warn('no form', e); }
            F.stamp(doc);
            data = await doc.save({ useObjectStreams: true });
          } else {
            const buf = await F.readBuf(f);
            const pdf = await F.loadPdfJs(buf);
            const out = await F.newPdf();
            for (let p = 1; p <= pdf.numPages; p++) {
              F.progress(((i + p / pdf.numPages) / files.length) * 100, 'Page ' + p);
              const pg = await pdf.getPage(p);
              const vp = pg.getViewport({ scale: 1 });
              const c = await F.renderPage(pdf, p, { scale: +quality.value });
              const img = await out.embedJpg(await F.canvasBytes(c, 'image/jpeg', 0.9));
              const np = out.addPage([vp.width, vp.height]);
              np.drawImage(img, { x: 0, y: 0, width: vp.width, height: vp.height });
              c.width = c.height = 0;
              await F.tick();
            }
            F.stamp(out);
            data = await out.save();
          }
          outs.push({ name: F.baseName(f.name) + '_flat.pdf', data });
        }
        if (outs.length === 1) F.saveBytes(outs[0].data, outs[0].name);
        else await F.saveZip(outs, 'flattened_pdfs.zip');
        F.result(body, {
          title: 'Flattened', msg: outs.length + ' file(s) processed.',
          stats: [{ k: 'Files', v: String(outs.length) }],
          actions: [{ label: 'Flatten more', icon: 'refresh', primary: true, on: () => F.launch('flatten') }]
        });
        F.footBtns(foot, {});
      })
    });
  });

  /* =========================================================
     GRAYSCALE PDF
     ========================================================= */
  F.register('grayscale', function (ctx) {
    const { body, foot } = ctx;
    let files = [];
    const quality = F.select([{ v: '1.5', t: 'Standard (110 DPI)' }, { v: '2', t: 'High (150 DPI)' },
    { v: '3', t: 'Print (220 DPI)' }], '2');
    const bw = F.checkbox('Pure black & white (threshold, smallest files)', false);
    const thr = F.input({ type: 'range', min: '80', max: '220', value: '160' });
    const thrLbl = el('span', { class: 'tb-label', text: '160' });
    thr.addEventListener('input', () => (thrLbl.textContent = thr.value));

    const dz = F.dropzone({ multiple: true, label: 'Choose PDFs', onFiles: (f) => { files = f; F.setGo(f.length > 0); } });
    body.appendChild(F.note('Perfect for cheap monochrome printing — and it usually shrinks the file a lot.'));
    body.appendChild(dz.node);
    body.appendChild(F.rows([F.field('Quality', quality)]));
    body.appendChild(bw);
    body.appendChild(F.field('Black/white threshold', el('div', { style: { display: 'flex', gap: '12px', alignItems: 'center' } }, [thr, thrLbl])));

    F.footBtns(foot, {
      action: 'Convert to grayscale', actionIcon: 'gradient', disabled: true,
      onAction: () => F.run('Converting…', async () => {
        const outs = [];
        let before = 0, after = 0;
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          before += f.size;
          const pdf = await F.loadPdfJs(await F.readBuf(f));
          const out = await F.newPdf();
          for (let p = 1; p <= pdf.numPages; p++) {
            F.progress(((i + p / pdf.numPages) / files.length) * 100, 'Page ' + p);
            const pg = await pdf.getPage(p);
            const vp = pg.getViewport({ scale: 1 });
            let c = await F.renderPage(pdf, p, { scale: +quality.value });
            c = F.toGray(c);
            if (bw.input.checked) {
              const cc = c.getContext('2d');
              const im = cc.getImageData(0, 0, c.width, c.height);
              const a = im.data;
              const t = +thr.value || 160;
              for (let k = 0; k < a.length; k += 4) {
                const v = a[k] > t ? 255 : 0;
                a[k] = a[k + 1] = a[k + 2] = v;
              }
              cc.putImageData(im, 0, 0);
            }
            const img = await out.embedJpg(await F.canvasBytes(c, 'image/jpeg', 0.86));
            const np = out.addPage([vp.width, vp.height]);
            np.drawImage(img, { x: 0, y: 0, width: vp.width, height: vp.height });
            c.width = c.height = 0;
            await F.tick();
          }
          F.stamp(out);
          const data = await out.save();
          after += data.length;
          outs.push({ name: F.baseName(f.name) + '_gray.pdf', data });
        }
        if (outs.length === 1) F.saveBytes(outs[0].data, outs[0].name);
        else await F.saveZip(outs, 'grayscale_pdfs.zip');
        F.result(body, {
          title: 'Grayscale ready', msg: outs.length + ' file(s) converted.',
          stats: [{ k: 'Before', v: F.fmtSize(before) }, { k: 'After', v: F.fmtSize(after) },
          { k: 'Saved', v: before ? Math.max(0, Math.round((1 - after / before) * 100)) + '%' : '—' }],
          actions: [{ label: 'Convert more', icon: 'refresh', primary: true, on: () => F.launch('grayscale') }]
        });
        F.footBtns(foot, {});
      })
    });
  });

  /* =========================================================
     PDF INSPECTOR
     ========================================================= */
  F.register('info', function (ctx) {
    const { body, foot } = ctx;
    let file = null;
    const out = el('div');
    const dz = F.dropzone({
      multiple: false, label: 'Choose a PDF to inspect',
      onFiles: async (fs) => {
        if (!fs.length) { out.innerHTML = ''; return; }
        file = fs[0];
        await F.run('Inspecting…', async () => {
          out.innerHTML = '';
          const buf = await F.readBuf(file);
          const pdf = await F.loadPdfJs(buf);
          const meta = await pdf.getMetadata().catch(() => ({ info: {} }));
          const info = (meta && meta.info) || {};

          const fonts = new Set();
          const sizes = new Set();
          let images = 0, textChars = 0;
          const scan = Math.min(pdf.numPages, 25);
          for (let i = 1; i <= scan; i++) {
            F.progress((i / scan) * 100, 'Page ' + i);
            const pg = await pdf.getPage(i);
            const vp = pg.getViewport({ scale: 1 });
            sizes.add(Math.round(vp.width) + ' × ' + Math.round(vp.height) + ' pt');
            const tc = await pg.getTextContent();
            tc.items.forEach((it) => { if (it.fontName) fonts.add(it.fontName); textChars += (it.str || '').length; });
            try {
              const ops = await pg.getOperatorList();
              const { pdfjs } = F.lib();
              ops.fnArray.forEach((fn) => {
                if (fn === window.pdfjsLib.OPS.paintImageXObject || fn === window.pdfjsLib.OPS.paintJpegXObject) images++;
              });
            } catch (e) { }
            if (i % 5 === 0) await F.tick();
          }

          let encrypted = false;
          try {
            const head = new TextDecoder('latin1').decode(new Uint8Array(buf));
            encrypted = /\/Encrypt[\s\/<]/.test(head);
          } catch (e) { }

          let hasForm = false, fields = 0;
          try {
            const doc = await F.loadPdfLib(buf);
            const form = doc.getForm();
            fields = form.getFields().length;
            hasForm = fields > 0;
          } catch (e) { }

          const rows = [
            ['File name', file.name],
            ['File size', F.fmtSize(file.size)],
            ['Pages', String(pdf.numPages)],
            ['Page sizes', Array.from(sizes).join(', ') || '—'],
            ['PDF version', info.PDFFormatVersion || '—'],
            ['Title', info.Title || '—'],
            ['Author', info.Author || '—'],
            ['Subject', info.Subject || '—'],
            ['Keywords', info.Keywords || '—'],
            ['Creator', info.Creator || '—'],
            ['Producer', info.Producer || '—'],
            ['Created', fmtPdfDate(info.CreationDate)],
            ['Modified', fmtPdfDate(info.ModDate)],
            ['Encrypted', encrypted ? 'Yes' : 'No'],
            ['Linearised (fast web view)', info.IsLinearized ? 'Yes' : 'No'],
            ['Acro form fields', hasForm ? String(fields) : 'None'],
            ['Fonts used (first ' + scan + ' pages)', fonts.size ? Array.from(fonts).slice(0, 14).join(', ') : 'None'],
            ['Images (first ' + scan + ' pages)', String(images)],
            ['Text characters (first ' + scan + ' pages)', textChars.toLocaleString()],
            ['Likely scanned', textChars < 40 * scan ? 'Yes — run OCR to add text' : 'No — text layer present']
          ];

          out.appendChild(el('div', { class: 'stat-grid' }, [
            el('div', { class: 'stat' }, [el('b', { text: String(pdf.numPages) }), el('span', { text: 'Pages' })]),
            el('div', { class: 'stat' }, [el('b', { text: F.fmtSize(file.size) }), el('span', { text: 'File size' })]),
            el('div', { class: 'stat' }, [el('b', { text: String(fonts.size) }), el('span', { text: 'Fonts' })]),
            el('div', { class: 'stat' }, [el('b', { text: encrypted ? 'Locked' : 'Open' }), el('span', { text: 'Security' })])
          ]));

          const table = el('div', { class: 'files' });
          rows.forEach((r) => table.appendChild(el('div', { class: 'file-row' }, [
            el('span', { class: 'nm', style: { flex: '0 0 42%', color: 'var(--ink2)', fontWeight: '400' }, text: r[0] }),
            el('span', { class: 'nm', style: { fontWeight: '500' }, text: String(r[1]), title: String(r[1]) })
          ])));
          out.appendChild(table);

          F.footBtns(foot, {
            action: 'Save report', actionIcon: 'download',
            onAction: () => {
              const txt = 'PDF Inspection Report — The PDF Factory by Smit Parekh\n' +
                'Generated: ' + new Date().toLocaleString() + '\n\n' +
                rows.map((r) => r[0] + ': ' + r[1]).join('\n');
              F.saveBlob(new Blob([txt], { type: 'text/plain;charset=utf-8' }), F.baseName(file.name) + '_report.txt');
            }
          });
        });
      }
    });
    function fmtPdfDate(d) {
      if (!d) return '—';
      const m = /D:(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/.exec(String(d));
      if (!m) return String(d);
      return m[1] + '-' + m[2] + '-' + m[3] + (m[4] ? ' ' + m[4] + ':' + (m[5] || '00') : '');
    }

    body.appendChild(dz.node);
    body.appendChild(out);
    F.footBtns(foot, {});
  });

  /* =========================================================
     ATTACH FILES
     ========================================================= */
  F.register('attach', function (ctx) {
    const { body, foot } = ctx;
    let pdfFile = null, attachments = [];
    const dz = F.dropzone({
      multiple: false, label: 'Choose the PDF container',
      onFiles: (f) => { pdfFile = f[0]; sync(); }
    });
    const dzA = F.dropzone({
      accept: '*', multiple: true, label: 'Choose files to embed',
      sub: 'Any file type — spreadsheets, images, source data…',
      onFiles: (f) => { attachments = f; sync(); }
    });
    function sync() { F.setGo(!!pdfFile && attachments.length > 0); }
    const desc = F.input({ placeholder: 'Description shown in the attachments panel' });

    body.appendChild(F.note('Embedded files travel inside the PDF and open from the reader’s attachments panel. Great for sending source data with a report.'));
    body.appendChild(dz.node);
    body.appendChild(F.section('Files to embed'));
    body.appendChild(dzA.node);
    body.appendChild(F.field('Description', desc));

    F.footBtns(foot, {
      action: 'Attach files', actionIcon: 'attach_file', disabled: true,
      onAction: () => F.run('Attaching…', async () => {
        const doc = await F.loadPdfLib(pdfFile);
        for (let i = 0; i < attachments.length; i++) {
          const a = attachments[i];
          F.progress((i / attachments.length) * 100, a.name);
          const bytes = new Uint8Array(await a.arrayBuffer());
          await doc.attach(bytes, a.name, {
            mimeType: a.type || 'application/octet-stream',
            description: desc.value || ('Attached with The PDF Factory'),
            creationDate: new Date(a.lastModified || Date.now()),
            modificationDate: new Date()
          });
        }
        const name = F.baseName(pdfFile.name) + '_with_attachments.pdf';
        const data = await F.savePdfDoc(doc, name);
        F.result(body, {
          title: 'Attached', msg: attachments.length + ' file(s) embedded.',
          stats: [{ k: 'Attachments', v: String(attachments.length) }, { k: 'Size', v: F.fmtSize(data.length) }],
          actions: [{ label: 'Download again', icon: 'download', primary: true, on: () => F.saveBytes(data, name) },
          { label: 'Start over', icon: 'refresh', on: () => F.launch('attach') }]
        });
        F.footBtns(foot, {});
      })
    });
  });
})();
