/* ============================================================
   The PDF Factory — ORGANISE tools
   merge, split, compress, remove, extract, organize,
   scan, pagesize, nup
   ============================================================ */
(function () {
  'use strict';
  const F = window.PF;
  const el = F.el, mi = F.mi;

  /* =========================================================
     MERGE
     ========================================================= */
  F.register('merge', function (ctx) {
    const { body, foot } = ctx;
    const dz = F.dropzone({
      accept: '.pdf,application/pdf', multiple: true,
      label: 'Choose PDF files or drop them here',
      sub: 'Add 2 or more PDFs. Drag rows to set the order.',
      onFiles: (f) => F.setGo(f.length >= 2)
    });
    const outName = F.input({ value: 'merged.pdf' });
    const addBlank = F.checkbox('Insert a blank page between documents', false);
    const bookmarks = F.checkbox('Add a bookmark per source file', true);

    body.appendChild(F.note('Files are merged top-to-bottom in the order shown below.'));
    body.appendChild(dz.node);
    body.appendChild(F.section('Options'));
    body.appendChild(F.rows([F.field('Output file name', outName)]));
    body.appendChild(addBlank);
    body.appendChild(bookmarks);

    F.footBtns(foot, {
      action: 'Merge PDFs', actionIcon: 'merge_type', disabled: true,
      onAction: () => F.run('Merging…', async () => {
        const files = dz.state.files;
        const out = await F.newPdf();
        const marks = [];
        for (let i = 0; i < files.length; i++) {
          F.progress((i / files.length) * 100, 'Merging ' + files[i].name);
          const src = await F.loadPdfLib(files[i]);
          const idx = src.getPageIndices();
          const pages = await out.copyPages(src, idx);
          marks.push({ title: F.baseName(files[i].name), page: out.getPageCount() });
          pages.forEach((p) => out.addPage(p));
          if (addBlank.input.checked && i < files.length - 1) {
            const last = out.getPage(out.getPageCount() - 1);
            out.addPage([last.getWidth(), last.getHeight()]);
          }
          await F.tick();
        }
        if (bookmarks.input.checked) addOutline(out, marks);
        const name = F.sanitize(outName.value || 'merged.pdf');
        const bytes = await F.savePdfDoc(out, /\.pdf$/i.test(name) ? name : name + '.pdf');
        F.result(body, {
          title: 'Merged successfully', msg: files.length + ' files combined into one PDF.',
          stats: [
            { k: 'Source files', v: String(files.length) },
            { k: 'Total pages', v: String(out.getPageCount()) },
            { k: 'Output size', v: F.fmtSize(bytes.length) }
          ],
          actions: [{ label: 'Download again', icon: 'download', primary: true, on: () => F.saveBytes(bytes, name) },
          { label: 'Merge more', icon: 'refresh', on: () => F.launch('merge') }]
        });
        foot.innerHTML = '';
        F.footBtns(foot, {});
        F.toast('Merged ' + files.length + ' PDFs.', 'ok');
      })
    });
  });

  /** best-effort outline writer using raw pdf-lib objects */
  function addOutline(doc, marks) {
    try {
      const { PDFLib } = F.lib();
      if (!PDFLib || !marks.length) return;
      const ctxo = doc.context;
      const PDFName = PDFLib.PDFName, PDFNumber = PDFLib.PDFNumber,
        PDFString = PDFLib.PDFHexString, PDFArray = PDFLib.PDFArray, PDFDict = PDFLib.PDFDict;
      const outlinesRef = ctxo.nextRef();
      const items = marks.map((m) => ({ m, ref: ctxo.nextRef() }));
      items.forEach((it, i) => {
        const d = new Map();
        d.set(PDFName.of('Title'), PDFLib.PDFString.of(it.m.title));
        d.set(PDFName.of('Parent'), outlinesRef);
        if (i > 0) d.set(PDFName.of('Prev'), items[i - 1].ref);
        if (i < items.length - 1) d.set(PDFName.of('Next'), items[i + 1].ref);
        const page = doc.getPage(Math.min(it.m.page, doc.getPageCount() - 1));
        const arr = PDFArray.withContext(ctxo);
        arr.push(page.ref);
        arr.push(PDFName.of('Fit'));
        d.set(PDFName.of('Dest'), arr);
        ctxo.assign(it.ref, PDFDict.fromMapWithContext(d, ctxo));
      });
      const od = new Map();
      od.set(PDFName.of('Type'), PDFName.of('Outlines'));
      od.set(PDFName.of('First'), items[0].ref);
      od.set(PDFName.of('Last'), items[items.length - 1].ref);
      od.set(PDFName.of('Count'), PDFNumber.of(items.length));
      ctxo.assign(outlinesRef, PDFDict.fromMapWithContext(od, ctxo));
      doc.catalog.set(PDFName.of('Outlines'), outlinesRef);
    } catch (e) { console.warn('outline', e); }
  }

  /* =========================================================
     SPLIT
     ========================================================= */
  F.register('split', function (ctx) {
    const { body, foot } = ctx;
    let pdfjsDoc = null, bytes = null, nPages = 0, file = null;

    const modeSel = F.select([
      { v: 'each', t: 'Every page → separate PDF' },
      { v: 'ranges', t: 'Custom ranges' },
      { v: 'every', t: 'Split every N pages' },
      { v: 'at', t: 'Split at page numbers' },
      { v: 'half', t: 'Split in half' }
    ], 'each');
    const rangeIn = F.input({ placeholder: '1-3, 5, 8-12' });
    const nIn = F.input({ type: 'number', value: '2', min: '1' });
    const atIn = F.input({ placeholder: '4, 9, 15' });
    const zipOut = F.checkbox('Download all parts as one ZIP', true);

    const optRange = F.field('Ranges (comma separated)', rangeIn, 'Each range becomes its own PDF. e.g. 1-3, 5, 8-12');
    const optN = F.field('Pages per file', nIn);
    const optAt = F.field('Split before these pages', atIn, 'e.g. 4, 9 → parts 1-3, 4-8, 9-end');
    const opts = el('div', {}, [optRange, optN, optAt]);
    function syncMode() {
      optRange.style.display = modeSel.value === 'ranges' ? 'block' : 'none';
      optN.style.display = modeSel.value === 'every' ? 'block' : 'none';
      optAt.style.display = modeSel.value === 'at' ? 'block' : 'none';
    }
    modeSel.addEventListener('change', syncMode);

    const preview = el('div');
    const dz = F.dropzone({
      multiple: false, label: 'Choose a PDF to split',
      onFiles: async (fs) => {
        preview.innerHTML = '';
        if (!fs.length) { F.setGo(false); return; }
        file = fs[0];
        await F.run('Reading…', async () => {
          bytes = await F.readBuf(file);
          pdfjsDoc = await F.loadPdfJs(bytes);
          nPages = pdfjsDoc.numPages;
          preview.appendChild(F.note('<b>' + F.escapeHtml(file.name) + '</b> — ' + nPages + ' pages.'));
          const g = await F.thumbGrid(pdfjsDoc, { select: false });
          preview.appendChild(g.node);
          F.setGo(true);
        });
      }
    });

    body.appendChild(dz.node);
    body.appendChild(F.section('Split mode'));
    body.appendChild(F.field('Mode', modeSel));
    body.appendChild(opts);
    body.appendChild(zipOut);
    body.appendChild(preview);
    syncMode();

    F.footBtns(foot, {
      action: 'Split PDF', actionIcon: 'call_split', disabled: true,
      onAction: () => F.run('Splitting…', async () => {
        const parts = buildParts(modeSel.value, nPages, rangeIn.value, +nIn.value || 2, atIn.value);
        if (!parts.length) throw new Error('No pages selected — check your ranges.');
        const base = F.baseName(file.name);
        const outputs = [];
        for (let i = 0; i < parts.length; i++) {
          F.progress((i / parts.length) * 100, 'Part ' + (i + 1) + ' / ' + parts.length);
          const src = await F.loadPdfLib(bytes);
          const out = await F.newPdf();
          const pages = await out.copyPages(src, parts[i]);
          pages.forEach((p) => out.addPage(p));
          F.stamp(out);
          const data = await out.save();
          outputs.push({ name: base + '_' + F.rangeLabel(parts[i]).replace(/[,\s]+/g, '_') + '.pdf', data });
          await F.tick();
        }
        if (zipOut.input.checked && outputs.length > 1) {
          await F.saveZip(outputs, base + '_split.zip');
        } else {
          outputs.forEach((o, i) => setTimeout(() => F.saveBytes(o.data, o.name), i * 260));
        }
        F.result(body, {
          title: 'Split complete', msg: 'Created ' + outputs.length + ' file(s).',
          stats: [{ k: 'Source pages', v: String(nPages) }, { k: 'Files created', v: String(outputs.length) }],
          actions: [{
            label: 'Download ZIP again', icon: 'folder_zip', primary: true,
            on: () => F.saveZip(outputs, base + '_split.zip')
          }, { label: 'Split another', icon: 'refresh', on: () => F.launch('split') }]
        });
        F.footBtns(foot, {});
      })
    });
  });

  function buildParts(mode, n, rangeSpec, every, atSpec) {
    const all = Array.from({ length: n }, (_, i) => i);
    if (mode === 'each') return all.map((i) => [i]);
    if (mode === 'half') { const h = Math.ceil(n / 2); return [all.slice(0, h), all.slice(h)].filter((a) => a.length); }
    if (mode === 'every') {
      const out = [];
      for (let i = 0; i < n; i += every) out.push(all.slice(i, i + every));
      return out;
    }
    if (mode === 'at') {
      const cuts = String(atSpec).split(/[,;\s]+/).map((x) => parseInt(x, 10) - 1)
        .filter((x) => x > 0 && x < n).sort((a, b) => a - b);
      const out = [];
      let prev = 0;
      cuts.concat([n]).forEach((c) => { if (c > prev) out.push(all.slice(prev, c)); prev = c; });
      return out;
    }
    // ranges
    return String(rangeSpec).split(/[,;]+/).map((s) => s.trim()).filter(Boolean)
      .map((s) => F.parseRange(s, n)).filter((a) => a.length);
  }

  /* =========================================================
     COMPRESS
     ========================================================= */
  F.register('compress', function (ctx) {
    const { body, foot } = ctx;
    let files = [];
    const level = F.select([
      { v: 'light', t: 'Light — best quality (150 DPI)' },
      { v: 'medium', t: 'Recommended — good balance (110 DPI)' },
      { v: 'strong', t: 'Strong — small file (80 DPI)' },
      { v: 'extreme', t: 'Extreme — smallest (60 DPI)' }
    ], 'medium');
    const gray = F.checkbox('Convert to grayscale (much smaller)', false);
    const keepText = F.checkbox('Lossless mode — keep text selectable (re-save only)', false);

    const dz = F.dropzone({
      multiple: true, label: 'Choose PDFs to compress',
      onFiles: (f) => { files = f; F.setGo(f.length > 0); }
    });

    body.appendChild(F.note('Lossless mode simply re-writes and cleans the file. The other levels rasterise pages to reach much smaller sizes — text will no longer be selectable.'));
    body.appendChild(dz.node);
    body.appendChild(F.section('Compression'));
    body.appendChild(F.field('Level', level));
    body.appendChild(gray);
    body.appendChild(keepText);

    F.footBtns(foot, {
      action: 'Compress', actionIcon: 'compress', disabled: true,
      onAction: () => F.run('Compressing…', async () => {
        const cfg = {
          light: { dpi: 150, q: 0.82 }, medium: { dpi: 110, q: 0.7 },
          strong: { dpi: 80, q: 0.58 }, extreme: { dpi: 60, q: 0.45 }
        }[level.value];
        const outs = [];
        let before = 0, after = 0;
        for (let fi = 0; fi < files.length; fi++) {
          const f = files[fi];
          before += f.size;
          const buf = await F.readBuf(f);
          let data;
          if (keepText.input.checked) {
            const doc = await F.loadPdfLib(buf);
            F.stamp(doc);
            data = await doc.save({ useObjectStreams: true });
          } else {
            data = await rasterCompress(buf, cfg, gray.input.checked,
              (p, m) => F.progress(((fi + p / 100) / files.length) * 100, m));
          }
          after += data.length;
          outs.push({ name: F.baseName(f.name) + '_compressed.pdf', data });
        }
        if (outs.length === 1) F.saveBytes(outs[0].data, outs[0].name);
        else await F.saveZip(outs, 'compressed_pdfs.zip');

        const pct = before ? Math.max(0, Math.round((1 - after / before) * 100)) : 0;
        F.result(body, {
          title: pct > 0 ? 'Reduced by ' + pct + '%' : 'Compression finished',
          msg: pct > 0 ? 'Your file is smaller and ready.' : 'This PDF was already well optimised — try a stronger level.',
          stats: [{ k: 'Before', v: F.fmtSize(before) }, { k: 'After', v: F.fmtSize(after) }, { k: 'Saved', v: pct + '%' }],
          actions: [{
            label: 'Download again', icon: 'download', primary: true,
            on: () => outs.length === 1 ? F.saveBytes(outs[0].data, outs[0].name) : F.saveZip(outs, 'compressed_pdfs.zip')
          }, { label: 'Compress more', icon: 'refresh', on: () => F.launch('compress') }]
        });
        F.footBtns(foot, {});
      })
    });
  });

  async function rasterCompress(buf, cfg, grayscale, onProg) {
    const pdf = await F.loadPdfJs(buf);
    const out = await F.newPdf();
    const n = pdf.numPages;
    for (let i = 1; i <= n; i++) {
      if (onProg) onProg((i / n) * 100, 'Page ' + i + ' / ' + n);
      const page = await pdf.getPage(i);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(2, Math.max(0.3, cfg.dpi / 72));
      let canvas = await F.renderPage(pdf, i, { scale });
      if (grayscale) canvas = toGray(canvas);
      const jpg = await F.canvasBytes(canvas, 'image/jpeg', cfg.q);
      const img = await out.embedJpg(jpg);
      const p = out.addPage([base.width, base.height]);
      p.drawImage(img, { x: 0, y: 0, width: base.width, height: base.height });
      canvas.width = canvas.height = 0;
      if (i % 3 === 0) await F.tick();
    }
    F.stamp(out);
    return out.save({ useObjectStreams: true });
  }

  function toGray(canvas) {
    const ctx = canvas.getContext('2d');
    const d = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const a = d.data;
    for (let i = 0; i < a.length; i += 4) {
      const v = (a[i] * 0.299 + a[i + 1] * 0.587 + a[i + 2] * 0.114) | 0;
      a[i] = a[i + 1] = a[i + 2] = v;
    }
    ctx.putImageData(d, 0, 0);
    return canvas;
  }
  F.toGray = toGray;

  /* =========================================================
     REMOVE PAGES  /  EXTRACT PAGES  (shared builder)
     ========================================================= */
  function pagePicker(ctx, cfg) {
    const { body, foot } = ctx;
    let bytes = null, file = null, grid = null, n = 0;
    const spec = F.input({ placeholder: '1-3, 5, 8-  (or odd / even)' });
    const specField = F.field(cfg.specLabel, spec, 'You can also click pages below. Typed ranges win if filled.');
    const preview = el('div');
    const splitEach = cfg.extract ? F.checkbox('Save each selected page as its own file', false) : null;

    const dz = F.dropzone({
      multiple: false, label: 'Choose a PDF',
      onFiles: async (fs) => {
        preview.innerHTML = '';
        if (!fs.length) { F.setGo(false); return; }
        file = fs[0];
        await F.run('Reading…', async () => {
          bytes = await F.readBuf(file);
          const pdf = await F.loadPdfJs(bytes);
          n = pdf.numPages;
          grid = await F.thumbGrid(pdf, { select: true, multi: true, onChange: () => sync() });
          preview.appendChild(F.toolbar([
            { label: 'All', icon: 'select_all', on: () => grid.selectAll() },
            { label: 'None', icon: 'deselect', on: () => grid.selectNone() },
            { label: 'Odd', icon: 'looks_one', on: () => grid.selectOdd() },
            { label: 'Even', icon: 'looks_two', on: () => grid.selectEven() },
            { label: 'Invert', icon: 'flip', on: () => grid.invert() },
            '|', el('span', { class: 'tb-label', id: 'selInfo', text: '0 selected' })
          ]));
          preview.appendChild(grid.node);
          sync();
        });
      }
    });
    function chosen() {
      if (spec.value.trim()) return F.parseRange(spec.value, n);
      return grid ? grid.selected.map((p) => p - 1) : [];
    }
    function sync() {
      const c = chosen();
      const info = F.$('#selInfo', preview);
      if (info) info.textContent = c.length + ' selected (' + F.rangeLabel(c) + ')';
      F.setGo(!!file && c.length > 0 && (!cfg.remove || c.length < n));
    }
    spec.addEventListener('input', sync);

    body.appendChild(F.note(cfg.note));
    body.appendChild(dz.node);
    body.appendChild(specField);
    if (splitEach) body.appendChild(splitEach);
    body.appendChild(preview);

    F.footBtns(foot, {
      action: cfg.action, actionIcon: cfg.icon, disabled: true,
      onAction: () => F.run('Working…', async () => {
        const sel = chosen();
        const keep = cfg.remove
          ? Array.from({ length: n }, (_, i) => i).filter((i) => sel.indexOf(i) === -1)
          : sel;
        if (!keep.length) throw new Error('That would leave zero pages.');
        const base = F.baseName(file.name);
        if (splitEach && splitEach.input.checked) {
          const outs = [];
          for (const i of keep) {
            const src = await F.loadPdfLib(bytes);
            const out = await F.newPdf();
            const [p] = await out.copyPages(src, [i]);
            out.addPage(p);
            F.stamp(out);
            outs.push({ name: base + '_page_' + (i + 1) + '.pdf', data: await out.save() });
          }
          await F.saveZip(outs, base + '_pages.zip');
          F.result(body, {
            title: 'Extracted', msg: outs.length + ' single-page PDFs saved in a ZIP.',
            stats: [{ k: 'Pages', v: String(outs.length) }],
            actions: [{ label: 'Download again', icon: 'folder_zip', primary: true, on: () => F.saveZip(outs, base + '_pages.zip') }]
          });
        } else {
          const src = await F.loadPdfLib(bytes);
          const out = await F.newPdf();
          const pages = await out.copyPages(src, keep);
          pages.forEach((p) => out.addPage(p));
          const name = base + cfg.suffix + '.pdf';
          const data = await F.savePdfDoc(out, name);
          F.result(body, {
            title: 'Done', msg: cfg.doneMsg.replace('{n}', String(keep.length)),
            stats: [{ k: 'Pages in', v: String(n) }, { k: 'Pages out', v: String(keep.length) }, { k: 'Size', v: F.fmtSize(data.length) }],
            actions: [{ label: 'Download again', icon: 'download', primary: true, on: () => F.saveBytes(data, name) },
            { label: 'Start over', icon: 'refresh', on: () => F.launch(cfg.id) }]
          });
        }
        F.footBtns(foot, {});
      })
    });
  }

  F.register('remove', (ctx) => pagePicker(ctx, {
    id: 'remove', remove: true, action: 'Remove Pages', icon: 'delete_sweep',
    specLabel: 'Pages to DELETE', suffix: '_pages_removed',
    note: 'Select the pages you want to <b>delete</b>. Everything else is kept.',
    doneMsg: '{n} pages remain in your PDF.'
  }));

  F.register('extract', (ctx) => pagePicker(ctx, {
    id: 'extract', extract: true, action: 'Extract Pages', icon: 'content_cut',
    specLabel: 'Pages to EXTRACT', suffix: '_extracted',
    note: 'Select the pages you want to <b>keep</b>. They become a new PDF.',
    doneMsg: '{n} pages extracted into a new PDF.'
  }));

  /* =========================================================
     ORGANISE PDF
     ========================================================= */
  F.register('organize', function (ctx) {
    const { body, foot } = ctx;
    let bytes = null, file = null, grid = null, n = 0;
    const blanks = [];  // {after: index-in-order}
    const preview = el('div');

    const dz = F.dropzone({
      multiple: false, label: 'Choose a PDF to organise',
      onFiles: async (fs) => {
        preview.innerHTML = '';
        blanks.length = 0;
        if (!fs.length) { F.setGo(false); return; }
        file = fs[0];
        await F.run('Reading…', async () => {
          bytes = await F.readBuf(file);
          const pdf = await F.loadPdfJs(bytes);
          n = pdf.numPages;
          grid = await F.thumbGrid(pdf, { select: true, multi: true, sortable: true, rotate: true });
          preview.appendChild(F.toolbar([
            'Order:',
            { label: 'Sort 1→N', icon: 'sort', on: () => grid.sortAsc() },
            { label: 'Reverse', icon: 'swap_vert', on: () => grid.sortDesc() },
            '|', 'Rotate:',
            { label: 'Left', icon: 'rotate_left', on: () => grid.rotateSelected(-90) },
            { label: 'Right', icon: 'rotate_right', on: () => grid.rotateSelected(90) },
            '|',
            { label: 'Delete selected', icon: 'delete', on: () => grid.removeSelected() },
            { label: 'Add blank page', icon: 'add_box', on: () => addBlankCell() },
            { label: 'Reset', icon: 'restart_alt', on: () => { blanks.length = 0; grid.reset(); } }
          ]));
          preview.appendChild(F.note('Drag the page cards to reorder. Hover a card for rotate buttons.'));
          preview.appendChild(grid.node);
          F.setGo(true);
        });
      }
    });

    function addBlankCell() {
      const cell = el('div', { class: 'thumb blank', draggable: 'true' }, [
        el('div', { class: 'pn', text: 'blank' }),
        el('div', { class: 'mini' }, [el('button', {
          title: 'Remove', onclick: (e) => { e.stopPropagation(); cell.remove(); }
        }, [mi('close')])])
      ]);
      cell._page = 0; // 0 = blank marker
      grid.node.appendChild(cell);
      F.toast('Blank page added at the end — drag it where you need it.', 'info');
    }

    body.appendChild(dz.node);
    body.appendChild(preview);

    F.footBtns(foot, {
      action: 'Save Organised PDF', actionIcon: 'save', disabled: true,
      onAction: () => F.run('Building…', async () => {
        const cells = F.$$('.thumb', grid.node);
        if (!cells.length) throw new Error('No pages left.');
        const rot = grid.rotations;
        const src = await F.loadPdfLib(bytes);
        const out = await F.newPdf();
        const { PDFLib } = F.lib();
        const need = cells.filter((c) => c._page > 0).map((c) => c._page - 1);
        const copied = await out.copyPages(src, need);
        const map = {};
        need.forEach((pi, k) => { map[pi] = copied[k]; });
        let lastSize = [595.28, 841.89];
        cells.forEach((c) => {
          if (c._page > 0) {
            const p = map[c._page - 1];
            const added = out.addPage(p);
            lastSize = [added.getWidth(), added.getHeight()];
            const r = rot[c._page] || 0;
            if (r) added.setRotation(PDFLib.degrees((added.getRotation().angle + r) % 360));
          } else {
            out.addPage(lastSize.slice());
          }
        });
        const name = F.baseName(file.name) + '_organised.pdf';
        const data = await F.savePdfDoc(out, name);
        F.result(body, {
          title: 'Saved', msg: 'Your reorganised PDF is ready.',
          stats: [{ k: 'Pages', v: String(out.getPageCount()) }, { k: 'Size', v: F.fmtSize(data.length) }],
          actions: [{ label: 'Download again', icon: 'download', primary: true, on: () => F.saveBytes(data, name) },
          { label: 'Organise another', icon: 'refresh', on: () => F.launch('organize') }]
        });
        F.footBtns(foot, {});
      })
    });
  });

  /* =========================================================
     SCAN TO PDF (camera)
     ========================================================= */
  F.register('scan', function (ctx) {
    const { body, foot } = ctx;
    const shots = [];
    let stream = null, video = null;

    const videoBox = el('div', {
      style: {
        background: '#000', borderRadius: '14px', overflow: 'hidden',
        display: 'grid', placeItems: 'center', minHeight: '240px', position: 'relative'
      }
    });
    const gallery = el('div', { class: 'thumbs' });
    const enhance = F.checkbox('Auto-enhance (boost contrast, whiten paper)', true);
    const sizeSel = F.select(['Original', 'A4', 'Letter', 'Legal'], 'A4');

    const startBtn = el('button', { class: 'btn primary' }, [mi('videocam'), 'Start camera']);
    const shotBtn = el('button', { class: 'btn' }, [mi('photo_camera'), 'Capture page']);
    const stopBtn = el('button', { class: 'btn ghost' }, [mi('videocam_off'), 'Stop camera']);
    const fileBtn = el('button', { class: 'btn' }, [mi('upload_file'), 'Use photos instead']);
    const picker = el('input', { type: 'file', accept: 'image/*', multiple: true, capture: 'environment', style: { display: 'none' } });
    shotBtn.disabled = true; stopBtn.disabled = true;

    startBtn.addEventListener('click', async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 2560 }, height: { ideal: 1440 } },
          audio: false
        });
        video = el('video', { autoplay: true, playsinline: true, muted: true, style: { width: '100%', display: 'block' } });
        video.srcObject = stream;
        videoBox.innerHTML = '';
        videoBox.appendChild(video);
        startBtn.disabled = true; shotBtn.disabled = false; stopBtn.disabled = false;
      } catch (e) {
        F.toast('Camera unavailable: ' + e.message + ' — use "Use photos instead".', 'err', 6000);
      }
    });
    function stopCam() {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      stream = null;
      videoBox.innerHTML = '<div style="color:#888;font:400 13px Roboto;padding:40px">Camera off</div>';
      startBtn.disabled = false; shotBtn.disabled = true; stopBtn.disabled = true;
    }
    stopBtn.addEventListener('click', stopCam);
    F.activeCleanup = stopCam;

    shotBtn.addEventListener('click', () => {
      if (!video) return;
      const c = el('canvas');
      c.width = video.videoWidth; c.height = video.videoHeight;
      c.getContext('2d').drawImage(video, 0, 0);
      addShot(c);
    });
    fileBtn.addEventListener('click', () => picker.click());
    picker.addEventListener('change', async () => {
      for (const f of Array.prototype.slice.call(picker.files)) {
        const url = URL.createObjectURL(f);
        const img = await F.loadImage(url);
        const c = el('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        addShot(c);
      }
      picker.value = '';
    });

    function addShot(canvas) {
      shots.push(canvas);
      const th = el('div', { class: 'thumb' }, [
        el('div', { class: 'pn', text: 'Page ' + shots.length }),
        el('div', { class: 'mini' }, [el('button', {
          title: 'Delete', onclick: () => {
            const i = shots.indexOf(canvas);
            if (i > -1) shots.splice(i, 1);
            th.remove(); renum(); F.setGo(shots.length > 0);
          }
        }, [mi('delete')])])
      ]);
      const prev = el('canvas');
      const s = Math.min(1, 260 / canvas.width);
      prev.width = canvas.width * s; prev.height = canvas.height * s;
      prev.getContext('2d').drawImage(canvas, 0, 0, prev.width, prev.height);
      th.insertBefore(prev, th.firstChild);
      gallery.appendChild(th);
      renum();
      F.setGo(true);
    }
    function renum() {
      F.$$('.thumb', gallery).forEach((t, i) => (t.querySelector('.pn').textContent = 'Page ' + (i + 1)));
    }

    body.appendChild(F.note('Use your device camera to photograph documents, or pick existing photos. Everything is processed on-device.'));
    body.appendChild(videoBox);
    body.appendChild(el('div', { class: 'tb', style: { marginTop: '12px' } }, [startBtn, shotBtn, stopBtn, fileBtn, picker]));
    body.appendChild(F.rows([F.field('Page size', sizeSel)]));
    body.appendChild(enhance);
    body.appendChild(gallery);
    stopCam();

    F.footBtns(foot, {
      action: 'Create PDF', actionIcon: 'picture_as_pdf', disabled: true,
      onAction: () => F.run('Building PDF…', async () => {
        const out = await F.newPdf();
        for (let i = 0; i < shots.length; i++) {
          F.progress((i / shots.length) * 100, 'Page ' + (i + 1));
          let c = shots[i];
          if (enhance.input.checked) c = enhanceScan(c);
          const jpg = await F.canvasBytes(c, 'image/jpeg', 0.85);
          const img = await out.embedJpg(jpg);
          let w = img.width, h = img.height;
          const ps = F.PAGE_SIZES[sizeSel.value];
          if (ps) {
            const land = w > h;
            const pw = land ? ps[1] : ps[0], ph = land ? ps[0] : ps[1];
            const s = Math.min(pw / w, ph / h);
            const page = out.addPage([pw, ph]);
            page.drawImage(img, { x: (pw - w * s) / 2, y: (ph - h * s) / 2, width: w * s, height: h * s });
          } else {
            const page = out.addPage([w, h]);
            page.drawImage(img, { x: 0, y: 0, width: w, height: h });
          }
          await F.tick();
        }
        const data = await F.savePdfDoc(out, 'scan.pdf');
        stopCam();
        F.result(body, {
          title: 'Scan saved', msg: shots.length + ' page(s) captured.',
          stats: [{ k: 'Pages', v: String(shots.length) }, { k: 'Size', v: F.fmtSize(data.length) }],
          actions: [{ label: 'Download again', icon: 'download', primary: true, on: () => F.saveBytes(data, 'scan.pdf') },
          { label: 'New scan', icon: 'refresh', on: () => F.launch('scan') }]
        });
        F.footBtns(foot, {});
      })
    });
  });

  function enhanceScan(src) {
    const c = el('canvas');
    c.width = src.width; c.height = src.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(src, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height);
    const a = d.data;
    // estimate white point
    let max = 0;
    for (let i = 0; i < a.length; i += 40) {
      const v = (a[i] + a[i + 1] + a[i + 2]) / 3;
      if (v > max) max = v;
    }
    const wp = Math.max(160, max * 0.96);
    const contrast = 1.35;
    for (let i = 0; i < a.length; i += 4) {
      for (let k = 0; k < 3; k++) {
        let v = (a[i + k] / wp) * 255;
        v = (v - 128) * contrast + 134;
        a[i + k] = v < 0 ? 0 : v > 255 ? 255 : v;
      }
    }
    ctx.putImageData(d, 0, 0);
    return c;
  }

  /* =========================================================
     RESIZE / SCALE PAGES
     ========================================================= */
  F.register('pagesize', function (ctx) {
    const { body, foot } = ctx;
    let files = [];
    const sizeSel = F.select(Object.keys(F.PAGE_SIZES).filter((k) => k !== 'Original').concat(['Custom']), 'A4');
    const orient = F.select([{ v: 'auto', t: 'Keep orientation' }, { v: 'p', t: 'Portrait' }, { v: 'l', t: 'Landscape' }], 'auto');
    const cw = F.input({ type: 'number', value: '210' });
    const ch = F.input({ type: 'number', value: '297' });
    const unit = F.select(['mm', 'cm', 'in', 'pt'], 'mm');
    const margin = F.input({ type: 'number', value: '0', min: '0' });
    const customRow = F.rows([F.field('Width', cw), F.field('Height', ch), F.field('Unit', unit)]);
    customRow.style.display = 'none';
    sizeSel.addEventListener('change', () => { customRow.style.display = sizeSel.value === 'Custom' ? 'grid' : 'none'; });

    const dz = F.dropzone({ multiple: true, label: 'Choose PDFs to resize', onFiles: (f) => { files = f; F.setGo(f.length > 0); } });
    body.appendChild(F.note('Every page is scaled proportionally and centred on the new sheet size.'));
    body.appendChild(dz.node);
    body.appendChild(F.section('Target size'));
    body.appendChild(F.rows([F.field('Paper', sizeSel), F.field('Orientation', orient), F.field('Margin (pt)', margin)]));
    body.appendChild(customRow);

    F.footBtns(foot, {
      action: 'Resize', actionIcon: 'aspect_ratio', disabled: true,
      onAction: () => F.run('Resizing…', async () => {
        const { PDFLib } = F.needs(['PDFLib']);
        const outs = [];
        const m = Math.max(0, +margin.value || 0);
        for (const f of files) {
          const src = await F.loadPdfLib(f);
          const out = await F.newPdf();
          const idx = src.getPageIndices();
          const embedded = await out.embedPages(src.getPages());
          for (let i = 0; i < idx.length; i++) {
            const ep = embedded[i];
            const sp = src.getPage(i);
            let sw = sp.getWidth(), sh = sp.getHeight();
            const rot = sp.getRotation().angle % 360;
            if (rot === 90 || rot === 270) { const t = sw; sw = sh; sh = t; }
            let target;
            if (sizeSel.value === 'Custom') {
              const k = F.PT[unit.value];
              target = [(+cw.value || 210) * k, (+ch.value || 297) * k];
            } else target = F.PAGE_SIZES[sizeSel.value].slice();
            let [pw, ph] = target;
            const wantLand = orient.value === 'l' || (orient.value === 'auto' && sw > sh);
            if (wantLand && pw < ph) { const t = pw; pw = ph; ph = t; }
            if (!wantLand && pw > ph) { const t = pw; pw = ph; ph = t; }
            const s = Math.min((pw - 2 * m) / sw, (ph - 2 * m) / sh);
            const page = out.addPage([pw, ph]);
            page.drawPage(ep, {
              xScale: s, yScale: s,
              x: (pw - sw * s) / 2, y: (ph - sh * s) / 2
            });
          }
          F.stamp(out);
          outs.push({ name: F.baseName(f.name) + '_resized.pdf', data: await out.save() });
        }
        if (outs.length === 1) F.saveBytes(outs[0].data, outs[0].name);
        else await F.saveZip(outs, 'resized_pdfs.zip');
        F.toast('Resized ' + outs.length + ' file(s).', 'ok');
        F.result(body, {
          title: 'Resized', msg: 'All pages fitted to ' + sizeSel.value + '.',
          stats: [{ k: 'Files', v: String(outs.length) }],
          actions: [{ label: 'Start over', icon: 'refresh', primary: true, on: () => F.launch('pagesize') }]
        });
        F.footBtns(foot, {});
      })
    });
  });

  /* =========================================================
     N-UP
     ========================================================= */
  F.register('nup', function (ctx) {
    const { body, foot } = ctx;
    let file = null;
    const perSheet = F.select([{ v: '2', t: '2 pages per sheet' }, { v: '4', t: '4 pages per sheet' },
    { v: '6', t: '6 pages per sheet' }, { v: '9', t: '9 pages per sheet' }, { v: '16', t: '16 pages per sheet' }], '2');
    const sheet = F.select(['A4', 'Letter', 'A3', 'Legal'], 'A4');
    const gap = F.input({ type: 'number', value: '10', min: '0' });
    const border = F.checkbox('Draw a thin border around each page', false);

    const dz = F.dropzone({ multiple: false, label: 'Choose a PDF', onFiles: (f) => { file = f[0]; F.setGo(!!file); } });
    body.appendChild(F.note('Great for handouts and saving paper — places several pages on one sheet.'));
    body.appendChild(dz.node);
    body.appendChild(F.rows([F.field('Layout', perSheet), F.field('Sheet size', sheet), F.field('Gap (pt)', gap)]));
    body.appendChild(border);

    F.footBtns(foot, {
      action: 'Create N-up PDF', actionIcon: 'grid_view', disabled: true,
      onAction: () => F.run('Building…', async () => {
        const { PDFLib } = F.needs(['PDFLib']);
        const src = await F.loadPdfLib(file);
        const out = await F.newPdf();
        const per = +perSheet.value;
        const grids = { 2: [1, 2], 4: [2, 2], 6: [2, 3], 9: [3, 3], 16: [4, 4] }[per];
        let [cols, rows] = grids;
        let [pw, ph] = F.PAGE_SIZES[sheet.value];
        if (per === 2) { const t = pw; pw = ph; ph = t; } // landscape for 2-up
        const g = +gap.value || 0;
        const cellW = (pw - g * (cols + 1)) / cols;
        const cellH = (ph - g * (rows + 1)) / rows;
        const pages = src.getPages();
        const emb = await out.embedPages(pages);
        for (let i = 0; i < emb.length; i += per) {
          const page = out.addPage([pw, ph]);
          for (let k = 0; k < per && i + k < emb.length; k++) {
            const c = k % cols, r = Math.floor(k / cols);
            const sp = pages[i + k];
            let sw = sp.getWidth(), sh = sp.getHeight();
            const s = Math.min(cellW / sw, cellH / sh);
            const x = g + c * (cellW + g) + (cellW - sw * s) / 2;
            const y = ph - (g + r * (cellH + g)) - cellH + (cellH - sh * s) / 2;
            page.drawPage(emb[i + k], { xScale: s, yScale: s, x, y });
            if (border.input.checked) {
              page.drawRectangle({
                x: x - 1, y: y - 1, width: sw * s + 2, height: sh * s + 2,
                borderColor: PDFLib.rgb(0.75, 0.75, 0.75), borderWidth: 0.6
              });
            }
          }
        }
        const name = F.baseName(file.name) + '_' + per + 'up.pdf';
        const data = await F.savePdfDoc(out, name);
        F.result(body, {
          title: 'N-up ready', msg: per + ' pages per sheet.',
          stats: [{ k: 'Sheets', v: String(out.getPageCount()) }, { k: 'Size', v: F.fmtSize(data.length) }],
          actions: [{ label: 'Download again', icon: 'download', primary: true, on: () => F.saveBytes(data, name) }]
        });
        F.footBtns(foot, {});
      })
    });
  });
})();
