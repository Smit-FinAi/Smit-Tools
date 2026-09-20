/* ============================================================
   The PDF Factory — EDIT tools
   edit, rotate, pagenum, watermark, crop, header, bates,
   meta, background
   ============================================================ */
(function () {
  'use strict';
  const F = window.PF;
  const el = F.el, mi = F.mi;

  /* helper: position presets -> {x,y} for a given page + text width */
  function place(pos, pw, ph, tw, th, m) {
    m = m === undefined ? 30 : m;
    const map = {
      'top-left': [m, ph - m - th],
      'top-center': [(pw - tw) / 2, ph - m - th],
      'top-right': [pw - m - tw, ph - m - th],
      'middle-left': [m, (ph - th) / 2],
      'middle-center': [(pw - tw) / 2, (ph - th) / 2],
      'middle-right': [pw - m - tw, (ph - th) / 2],
      'bottom-left': [m, m],
      'bottom-center': [(pw - tw) / 2, m],
      'bottom-right': [pw - m - tw, m]
    };
    const p = map[pos] || map['bottom-center'];
    return { x: p[0], y: p[1] };
  }
  const POSITIONS = [
    { v: 'top-left', t: 'Top left' }, { v: 'top-center', t: 'Top centre' }, { v: 'top-right', t: 'Top right' },
    { v: 'middle-left', t: 'Middle left' }, { v: 'middle-center', t: 'Middle centre' }, { v: 'middle-right', t: 'Middle right' },
    { v: 'bottom-left', t: 'Bottom left' }, { v: 'bottom-center', t: 'Bottom centre' }, { v: 'bottom-right', t: 'Bottom right' }
  ];
  const FONTS = ['Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Times-Roman', 'Times-Bold',
    'Times-Italic', 'Courier', 'Courier-Bold'];

  /* =========================================================
     EDIT PDF — canvas annotation editor
     ========================================================= */
  F.register('edit', function (ctx) {
    const { body, foot } = ctx;
    let buf = null, file = null, pdf = null, pageNo = 1, viewScale = 1;
    let canvas = null, octx = null, baseImg = null;
    const annots = {};            // pageNo -> array of shapes
    const undoStack = {};         // pageNo -> array
    let tool = 'select';
    let drawing = null;

    const stage = el('div', { class: 'editor-stage' });
    const side = el('div', { class: 'editor-side' });
    const wrap = el('div', { class: 'editor-wrap' }, [side, stage]);

    const colorIn = el('input', { type: 'color', value: '#e2231a' });
    const sizeIn = F.input({ type: 'number', value: '16', min: '1', max: '200', style: { width: '80px' } });
    const strokeIn = F.input({ type: 'number', value: '3', min: '1', max: '40', style: { width: '70px' } });
    const fontSel = F.select(FONTS, 'Helvetica', { style: { width: '160px' } });
    const fillChk = F.checkbox('Fill shape', false);
    const imgPicker = el('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });

    const toolButtons = [
      { id: 'select', icon: 'near_me', label: 'Select' },
      { id: 'text', icon: 'title', label: 'Text' },
      { id: 'pen', icon: 'draw', label: 'Draw' },
      { id: 'highlight', icon: 'ink_highlighter', label: 'Highlight' },
      { id: 'line', icon: 'horizontal_rule', label: 'Line' },
      { id: 'arrow', icon: 'arrow_right_alt', label: 'Arrow' },
      { id: 'rect', icon: 'crop_square', label: 'Rectangle' },
      { id: 'ellipse', icon: 'circle', label: 'Ellipse' },
      { id: 'image', icon: 'image', label: 'Image' },
      { id: 'erase', icon: 'backspace', label: 'Erase last' }
    ];
    const tbar = el('div', { class: 'tb' });
    const tBtns = {};
    toolButtons.forEach((t) => {
      const b = el('button', { class: 'btn sm', title: t.label, onclick: () => setTool(t.id) }, [mi(t.icon), t.label]);
      tBtns[t.id] = b;
      tbar.appendChild(b);
    });
    tbar.appendChild(el('div', { class: 'sep' }));
    tbar.appendChild(el('span', { class: 'tb-label', text: 'Colour' }));
    tbar.appendChild(colorIn);
    tbar.appendChild(el('span', { class: 'tb-label', text: 'Font size' }));
    tbar.appendChild(sizeIn);
    tbar.appendChild(el('span', { class: 'tb-label', text: 'Stroke' }));
    tbar.appendChild(strokeIn);
    tbar.appendChild(fontSel);
    tbar.appendChild(fillChk);
    tbar.appendChild(el('div', { class: 'sep' }));
    tbar.appendChild(el('button', { class: 'btn sm', onclick: undo }, [mi('undo'), 'Undo']));
    tbar.appendChild(el('button', { class: 'btn sm', onclick: clearPage }, [mi('layers_clear'), 'Clear page']));

    function setTool(id) {
      if (id === 'erase') { undo(); return; }
      tool = id;
      Object.keys(tBtns).forEach((k) => tBtns[k].classList.toggle('primary', k === id));
      if (id === 'image') imgPicker.click();
    }
    setTool('text');

    const dz = F.dropzone({
      multiple: false, label: 'Choose a PDF to edit',
      onFiles: async (fs) => {
        if (!fs.length) { F.setGo(false); return; }
        file = fs[0];
        await F.run('Opening…', async () => {
          buf = await F.readBuf(file);
          pdf = await F.loadPdfJs(buf);
          Object.keys(annots).forEach((k) => delete annots[k]);
          await buildSide();
          await showPage(1);
          dz.node.style.display = 'none';
          wrap.style.display = 'flex';
          tbar.style.display = 'flex';
          F.setGo(true);
        });
      }
    });

    async function buildSide() {
      side.innerHTML = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const cell = el('div', { class: 'thumb', onclick: () => showPage(i) }, [el('div', { class: 'pn', text: String(i) })]);
        cell._p = i;
        side.appendChild(cell);
        F.renderPage(pdf, i, { scale: 0.32, maxW: 170 }).then((c) => cell.insertBefore(c, cell.firstChild)).catch(() => { });
        if (i % 5 === 0) await F.tick();
      }
    }

    async function showPage(n) {
      pageNo = n;
      F.$$('.thumb', side).forEach((c) => c.classList.toggle('sel', c._p === n));
      const page = await pdf.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const maxW = Math.min(820, stage.clientWidth - 30 || 700);
      viewScale = Math.min(2, Math.max(0.5, maxW / base.width));
      const c = await F.renderPage(pdf, n, { scale: viewScale });
      baseImg = c;
      canvas = el('canvas');
      canvas.width = c.width; canvas.height = c.height;
      octx = canvas.getContext('2d');
      stage.innerHTML = '';
      stage.appendChild(canvas);
      bindCanvas();
      redraw();
    }

    function pos(e) {
      const r = canvas.getBoundingClientRect();
      const sx = canvas.width / r.width, sy = canvas.height / r.height;
      const t = e.touches ? e.touches[0] : e;
      return { x: (t.clientX - r.left) * sx, y: (t.clientY - r.top) * sy };
    }

    function bindCanvas() {
      const down = (e) => {
        if (tool === 'select' || tool === 'image') return;
        e.preventDefault();
        const p = pos(e);
        if (tool === 'text') {
          const txt = prompt('Text to add:');
          if (txt && txt.trim()) {
            push({ type: 'text', text: txt, x: p.x, y: p.y, size: +sizeIn.value || 16, color: colorIn.value, font: fontSel.value });
            redraw();
          }
          return;
        }
        drawing = {
          type: tool, x: p.x, y: p.y, x2: p.x, y2: p.y,
          color: colorIn.value, w: +strokeIn.value || 3,
          fill: fillChk.input.checked, points: [[p.x, p.y]]
        };
      };
      const move = (e) => {
        if (!drawing) return;
        e.preventDefault();
        const p = pos(e);
        drawing.x2 = p.x; drawing.y2 = p.y;
        if (drawing.type === 'pen' || drawing.type === 'highlight') drawing.points.push([p.x, p.y]);
        redraw(drawing);
      };
      const up = () => {
        if (!drawing) return;
        const d = drawing; drawing = null;
        const tiny = Math.abs(d.x2 - d.x) < 2 && Math.abs(d.y2 - d.y) < 2 && d.points.length < 3;
        if (!tiny) push(d);
        redraw();
      };
      canvas.addEventListener('mousedown', down);
      canvas.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
      canvas.addEventListener('touchstart', down, { passive: false });
      canvas.addEventListener('touchmove', move, { passive: false });
      canvas.addEventListener('touchend', up);
    }

    imgPicker.addEventListener('change', async () => {
      const f = imgPicker.files[0];
      imgPicker.value = '';
      if (!f || !canvas) return;
      const url = URL.createObjectURL(f);
      const img = await F.loadImage(url);
      const c = el('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const s = Math.min(1, (canvas.width * 0.4) / c.width);
      push({ type: 'image', canvas: c, x: 40, y: 40, w: c.width * s, h: c.height * s });
      redraw();
      F.toast('Image placed at the top-left — it scales with the page.', 'info');
      setTool('select');
    });

    function push(shape) {
      (annots[pageNo] = annots[pageNo] || []).push(shape);
    }
    function undo() {
      const a = annots[pageNo];
      if (a && a.length) { a.pop(); redraw(); }
    }
    function clearPage() {
      annots[pageNo] = [];
      redraw();
    }

    function drawShape(c, s) {
      c.save();
      c.strokeStyle = s.color || '#000';
      c.fillStyle = s.color || '#000';
      c.lineWidth = s.w || 3;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      if (s.type === 'text') {
        c.font = fontCss(s.font, s.size);
        c.textBaseline = 'alphabetic';
        c.fillText(s.text, s.x, s.y);
      } else if (s.type === 'pen') {
        c.beginPath();
        s.points.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
        c.stroke();
      } else if (s.type === 'highlight') {
        c.globalAlpha = 0.35;
        c.lineWidth = Math.max(10, (s.w || 3) * 5);
        c.beginPath();
        s.points.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
        c.stroke();
      } else if (s.type === 'line' || s.type === 'arrow') {
        c.beginPath(); c.moveTo(s.x, s.y); c.lineTo(s.x2, s.y2); c.stroke();
        if (s.type === 'arrow') {
          const a = Math.atan2(s.y2 - s.y, s.x2 - s.x);
          const h = Math.max(9, (s.w || 3) * 3.4);
          c.beginPath();
          c.moveTo(s.x2, s.y2);
          c.lineTo(s.x2 - h * Math.cos(a - 0.4), s.y2 - h * Math.sin(a - 0.4));
          c.lineTo(s.x2 - h * Math.cos(a + 0.4), s.y2 - h * Math.sin(a + 0.4));
          c.closePath(); c.fill();
        }
      } else if (s.type === 'rect') {
        const x = Math.min(s.x, s.x2), y = Math.min(s.y, s.y2);
        const w = Math.abs(s.x2 - s.x), h = Math.abs(s.y2 - s.y);
        if (s.fill) c.fillRect(x, y, w, h); else c.strokeRect(x, y, w, h);
      } else if (s.type === 'ellipse') {
        const cx = (s.x + s.x2) / 2, cy = (s.y + s.y2) / 2;
        const rx = Math.abs(s.x2 - s.x) / 2, ry = Math.abs(s.y2 - s.y) / 2;
        c.beginPath();
        c.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
        if (s.fill) c.fill(); else c.stroke();
      } else if (s.type === 'image') {
        c.drawImage(s.canvas, s.x, s.y, s.w, s.h);
      }
      c.restore();
    }

    function fontCss(name, size) {
      const bold = /bold/i.test(name || '') ? '700 ' : '';
      const ital = /oblique|italic/i.test(name || '') ? 'italic ' : '';
      const fam = /times/i.test(name || '') ? 'Times New Roman, serif'
        : /courier/i.test(name || '') ? 'Courier New, monospace' : 'Helvetica, Arial, sans-serif';
      return ital + bold + (size || 16) + 'px ' + fam;
    }

    function redraw(temp) {
      if (!octx) return;
      octx.clearRect(0, 0, canvas.width, canvas.height);
      octx.drawImage(baseImg, 0, 0);
      (annots[pageNo] || []).forEach((s) => drawShape(octx, s));
      if (temp) drawShape(octx, temp);
    }

    body.appendChild(F.note('Pick a tool, then click or drag on the page. <b>Text</b> asks for your words, <b>Draw</b> is freehand, and every change is baked in when you save.'));
    body.appendChild(dz.node);
    body.appendChild(tbar);
    body.appendChild(wrap);
    body.appendChild(imgPicker);
    tbar.style.display = 'none';
    wrap.style.display = 'none';

    F.footBtns(foot, {
      action: 'Save edited PDF', actionIcon: 'save', disabled: true,
      onAction: () => F.run('Applying edits…', async () => {
        const { PDFLib } = F.needs(['PDFLib']);
        const doc = await F.loadPdfLib(buf);
        const fontCache = {};
        const pages = doc.getPages();
        for (let i = 1; i <= pages.length; i++) {
          const list = annots[i];
          if (!list || !list.length) continue;
          F.progress((i / pages.length) * 100, 'Page ' + i);
          const page = pages[i - 1];
          const pw = page.getWidth(), ph = page.getHeight();
          // the canvas for page i was rendered at viewScale for the *current* page only;
          // recompute per page using its own base viewport
          const pjs = await pdf.getPage(i);
          const bv = pjs.getViewport({ scale: 1 });
          const cw = bv.width, chh = bv.height;   // canvas coords were scaled copies of this
          // our canvas is viewScale * base for the page displayed; store scale per shape set
          const sc = (list.__scale || viewScale);
          const k = pw / (cw * sc);               // canvas px -> pdf pt
          const toY = (yCanvas) => ph - yCanvas * k * (chh / chh);

          for (const s of list) {
            const col = F.pdfColor(s.color || '#000000');
            if (s.type === 'text') {
              const fkey = s.font || 'Helvetica';
              if (!fontCache[fkey]) fontCache[fkey] = await F.embedFont(doc, fkey);
              page.drawText(F.wa(s.text), {
                x: s.x * k, y: toY(s.y), size: (s.size || 16) * k,
                font: fontCache[fkey], color: col
              });
            } else if (s.type === 'pen' || s.type === 'highlight') {
              const w = (s.type === 'highlight' ? Math.max(10, (s.w || 3) * 5) : (s.w || 3)) * k;
              for (let p = 1; p < s.points.length; p++) {
                page.drawLine({
                  start: { x: s.points[p - 1][0] * k, y: toY(s.points[p - 1][1]) },
                  end: { x: s.points[p][0] * k, y: toY(s.points[p][1]) },
                  thickness: w, color: col,
                  opacity: s.type === 'highlight' ? 0.35 : 1
                });
              }
            } else if (s.type === 'line' || s.type === 'arrow') {
              page.drawLine({
                start: { x: s.x * k, y: toY(s.y) }, end: { x: s.x2 * k, y: toY(s.y2) },
                thickness: (s.w || 3) * k, color: col
              });
              if (s.type === 'arrow') {
                const a = Math.atan2(toY(s.y2) - toY(s.y), s.x2 * k - s.x * k);
                const h = Math.max(9, (s.w || 3) * 3.4) * k;
                const tipX = s.x2 * k, tipY = toY(s.y2);
                page.drawLine({
                  start: { x: tipX, y: tipY },
                  end: { x: tipX - h * Math.cos(a - 0.4), y: tipY - h * Math.sin(a - 0.4) },
                  thickness: (s.w || 3) * k, color: col
                });
                page.drawLine({
                  start: { x: tipX, y: tipY },
                  end: { x: tipX - h * Math.cos(a + 0.4), y: tipY - h * Math.sin(a + 0.4) },
                  thickness: (s.w || 3) * k, color: col
                });
              }
            } else if (s.type === 'rect') {
              const x = Math.min(s.x, s.x2) * k, w = Math.abs(s.x2 - s.x) * k;
              const yTop = Math.min(s.y, s.y2), h = Math.abs(s.y2 - s.y) * k;
              page.drawRectangle({
                x, y: toY(yTop) - h, width: w, height: h,
                borderColor: s.fill ? undefined : col, color: s.fill ? col : undefined,
                borderWidth: s.fill ? 0 : (s.w || 3) * k
              });
            } else if (s.type === 'ellipse') {
              const cx = ((s.x + s.x2) / 2) * k;
              const cy = toY((s.y + s.y2) / 2);
              page.drawEllipse({
                x: cx, y: cy,
                xScale: Math.max(1, Math.abs(s.x2 - s.x) / 2 * k),
                yScale: Math.max(1, Math.abs(s.y2 - s.y) / 2 * k),
                borderColor: s.fill ? undefined : col, color: s.fill ? col : undefined,
                borderWidth: s.fill ? 0 : (s.w || 3) * k
              });
            } else if (s.type === 'image') {
              const bytes = await F.canvasBytes(s.canvas, 'image/png');
              const img = await doc.embedPng(bytes);
              const w = s.w * k, h = s.h * k;
              page.drawImage(img, { x: s.x * k, y: toY(s.y) - h, width: w, height: h });
            }
          }
        }
        const name = F.baseName(file.name) + '_edited.pdf';
        const data = await F.savePdfDoc(doc, name);
        F.toast('Edits applied.', 'ok');
        F.result(body, {
          title: 'Saved', msg: 'Your annotated PDF is ready.',
          stats: [{ k: 'Pages', v: String(doc.getPageCount()) }, { k: 'Size', v: F.fmtSize(data.length) }],
          actions: [{ label: 'Download again', icon: 'download', primary: true, on: () => F.saveBytes(data, name) },
          { label: 'Edit another', icon: 'refresh', on: () => F.launch('edit') }]
        });
        F.footBtns(foot, {});
      })
    });

    // remember the scale used for each page's annotations
    const origShow = showPage;
    showPage = async function (n) {
      await origShow(n);
      annots[n] = annots[n] || [];
      if (annots[n].__scale === undefined) annots[n].__scale = viewScale;
    };
  });

  /* =========================================================
     ROTATE
     ========================================================= */
  F.register('rotate', function (ctx) {
    const { body, foot } = ctx;
    let buf = null, file = null, grid = null, nPages = 0;
    const preview = el('div');

    const dz = F.dropzone({
      multiple: false, label: 'Choose a PDF to rotate',
      onFiles: async (fs) => {
        preview.innerHTML = '';
        if (!fs.length) { F.setGo(false); return; }
        file = fs[0];
        await F.run('Reading…', async () => {
          buf = await F.readBuf(file);
          const pdf = await F.loadPdfJs(buf);
          nPages = pdf.numPages;
          grid = await F.thumbGrid(pdf, { select: true, multi: true, rotate: true });
          preview.appendChild(F.toolbar([
            'Rotate all:',
            { label: 'Left', icon: 'rotate_left', on: () => grid.rotateAll(-90) },
            { label: 'Right', icon: 'rotate_right', on: () => grid.rotateAll(90) },
            { label: '180°', icon: 'flip_camera_android', on: () => grid.rotateAll(180) },
            '|', 'Selected:',
            { label: 'Left', icon: 'rotate_left', on: () => grid.rotateSelected(-90) },
            { label: 'Right', icon: 'rotate_right', on: () => grid.rotateSelected(90) },
            '|',
            { label: 'Select all', icon: 'select_all', on: () => grid.selectAll() },
            { label: 'None', icon: 'deselect', on: () => grid.selectNone() },
            { label: 'Reset', icon: 'restart_alt', on: () => grid.reset() }
          ]));
          preview.appendChild(grid.node);
          F.setGo(true);
        });
      }
    });

    body.appendChild(F.note('Rotate everything at once, or click individual pages and rotate just those.'));
    body.appendChild(dz.node);
    body.appendChild(preview);

    F.footBtns(foot, {
      action: 'Save rotated PDF', actionIcon: 'rotate_right', disabled: true,
      onAction: () => F.run('Rotating…', async () => {
        const { PDFLib } = F.needs(['PDFLib']);
        const doc = await F.loadPdfLib(buf);
        const rot = grid.rotations;
        let changed = 0;
        doc.getPages().forEach((p, i) => {
          const d = rot[i + 1] || 0;
          if (!d) return;
          changed++;
          p.setRotation(PDFLib.degrees(((p.getRotation().angle + d) % 360 + 360) % 360));
        });
        if (!changed) throw new Error('Nothing rotated yet — use the buttons above first.');
        const name = F.baseName(file.name) + '_rotated.pdf';
        const data = await F.savePdfDoc(doc, name);
        F.result(body, {
          title: 'Rotated', msg: changed + ' page(s) turned.',
          stats: [{ k: 'Pages changed', v: String(changed) }, { k: 'Total pages', v: String(nPages) }],
          actions: [{ label: 'Download again', icon: 'download', primary: true, on: () => F.saveBytes(data, name) },
          { label: 'Rotate another', icon: 'refresh', on: () => F.launch('rotate') }]
        });
        F.footBtns(foot, {});
      })
    });
  });

  /* =========================================================
     ADD PAGE NUMBERS
     ========================================================= */
  F.register('pagenum', function (ctx) {
    const { body, foot } = ctx;
    let file = null;
    const fmt = F.select([
      { v: '{n}', t: '1, 2, 3' },
      { v: 'Page {n}', t: 'Page 1' },
      { v: '{n} / {total}', t: '1 / 10' },
      { v: 'Page {n} of {total}', t: 'Page 1 of 10' },
      { v: '- {n} -', t: '- 1 -' },
      { v: '{roman}', t: 'i, ii, iii' },
      { v: '{alpha}', t: 'a, b, c' },
      { v: 'custom', t: 'Custom…' }
    ], '{n}');
    const customFmt = F.input({ placeholder: 'e.g. Annexure {n} of {total}', value: 'Page {n} of {total}' });
    const customField = F.field('Custom text', customFmt, 'Use {n}, {total}, {roman}, {alpha}');
    customField.style.display = 'none';
    fmt.addEventListener('change', () => { customField.style.display = fmt.value === 'custom' ? 'block' : 'none'; });

    const position = F.select(POSITIONS, 'bottom-center');
    const fontSel = F.select(FONTS, 'Helvetica');
    const sizeIn = F.input({ type: 'number', value: '11', min: '5', max: '48' });
    const colorIn = el('input', { type: 'color', value: '#333333' });
    const marginIn = F.input({ type: 'number', value: '28', min: '0' });
    const startIn = F.input({ type: 'number', value: '1' });
    const rangeIn = F.input({ placeholder: 'all  (or 2-  to skip the cover)' });
    const skipFirst = F.checkbox('Skip the first page', false);
    const boxChk = F.checkbox('Draw a light background box behind the number', false);

    const dz = F.dropzone({ multiple: false, label: 'Choose a PDF', onFiles: (f) => { file = f[0]; F.setGo(!!file); } });
    body.appendChild(dz.node);
    body.appendChild(F.section('Number format'));
    body.appendChild(F.rows([F.field('Style', fmt), F.field('Start numbering at', startIn), F.field('Pages to number', rangeIn)]));
    body.appendChild(customField);
    body.appendChild(F.section('Appearance'));
    body.appendChild(F.rows([F.field('Position', position), F.field('Font', fontSel),
    F.field('Size', sizeIn), F.field('Colour', colorIn), F.field('Margin (pt)', marginIn)]));
    body.appendChild(skipFirst);
    body.appendChild(boxChk);

    F.footBtns(foot, {
      action: 'Add page numbers', actionIcon: 'format_list_numbered', disabled: true,
      onAction: () => F.run('Numbering…', async () => {
        const { PDFLib } = F.needs(['PDFLib']);
        const doc = await F.loadPdfLib(file);
        const font = await F.embedFont(doc, fontSel.value);
        const pages = doc.getPages();
        const total = pages.length;
        const template = fmt.value === 'custom' ? (customFmt.value || '{n}') : fmt.value;
        const idx = F.parseRange(rangeIn.value || 'all', total);
        const start = parseInt(startIn.value, 10) || 1;
        const size = +sizeIn.value || 11;
        const m = +marginIn.value || 0;
        const col = F.pdfColor(colorIn.value);
        let counter = start;
        let done = 0;
        for (let i = 0; i < total; i++) {
          if (idx.indexOf(i) === -1) continue;
          if (skipFirst.input.checked && i === 0) { continue; }
          const page = pages[i];
          const txt = F.wa(template
            .replace(/\{n\}/g, String(counter))
            .replace(/\{total\}/g, String(total))
            .replace(/\{roman\}/g, F.romanize(counter))
            .replace(/\{alpha\}/g, F.alphaLabel(counter)));
          let pw = page.getWidth(), ph = page.getHeight();
          const rotAngle = page.getRotation().angle % 360;
          if (rotAngle === 90 || rotAngle === 270) { const t = pw; pw = ph; ph = t; }
          let tw;
          try { tw = font.widthOfTextAtSize(txt, size); } catch (e) { tw = txt.length * size * 0.5; }
          const p = place(position.value, pw, ph, tw, size, m);
          if (boxChk.input.checked) {
            page.drawRectangle({
              x: p.x - 6, y: p.y - 4, width: tw + 12, height: size + 8,
              color: PDFLib.rgb(1, 1, 1), opacity: 0.8,
              borderColor: PDFLib.rgb(0.85, 0.85, 0.88), borderWidth: 0.5
            });
          }
          page.drawText(txt, {
            x: p.x, y: p.y, size, font, color: col,
            rotate: rotAngle ? PDFLib.degrees(rotAngle) : undefined
          });
          counter++; done++;
        }
        const name = F.baseName(file.name) + '_numbered.pdf';
        const data = await F.savePdfDoc(doc, name);
        F.result(body, {
          title: 'Numbers added', msg: done + ' page(s) numbered.',
          stats: [{ k: 'Numbered', v: String(done) }, { k: 'Total pages', v: String(total) }, { k: 'Size', v: F.fmtSize(data.length) }],
          actions: [{ label: 'Download again', icon: 'download', primary: true, on: () => F.saveBytes(data, name) },
          { label: 'Start over', icon: 'refresh', on: () => F.launch('pagenum') }]
        });
        F.footBtns(foot, {});
      })
    });
  });

  /* =========================================================
     WATERMARK
     ========================================================= */
  F.register('watermark', function (ctx) {
    const { body, foot } = ctx;
    let file = null, imgFile = null;

    const textIn = F.input({ value: 'CONFIDENTIAL' });
    const fontSel = F.select(FONTS, 'Helvetica-Bold');
    const sizeIn = F.input({ type: 'number', value: '58', min: '6', max: '300' });
    const colorIn = el('input', { type: 'color', value: '#e2231a' });
    const opacity = F.input({ type: 'range', min: '5', max: '100', value: '22' });
    const opLabel = el('span', { class: 'tb-label', text: '22%' });
    opacity.addEventListener('input', () => (opLabel.textContent = opacity.value + '%'));
    const rotateIn = F.input({ type: 'number', value: '45', min: '-180', max: '180' });
    const position = F.select(POSITIONS, 'middle-center');
    const tile = F.checkbox('Tile across the whole page (mosaic)', false);
    const tileGap = F.input({ type: 'number', value: '160', min: '40' });
    const rangeIn = F.input({ placeholder: 'all  (or 1-5)' });
    const scaleIn = F.input({ type: 'range', min: '5', max: '100', value: '40' });
    const scLabel = el('span', { class: 'tb-label', text: '40%' });
    scaleIn.addEventListener('input', () => (scLabel.textContent = scaleIn.value + '%'));
    const behind = F.checkbox('Draw behind the page content', false);

    const imgDz = F.dropzone({
      accept: 'image/*', multiple: false, label: 'Choose a logo / stamp image',
      sub: 'PNG with transparency looks best.',
      onFiles: (f) => { imgFile = f[0] || null; }
    });

    const textPane = el('div', {}, [
      F.field('Watermark text', textIn),
      F.rows([F.field('Font', fontSel), F.field('Size', sizeIn), F.field('Colour', colorIn), F.field('Rotation (°)', rotateIn)])
    ]);
    const imgPane = el('div', {}, [
      imgDz.node,
      F.field('Image width (% of page)', el('div', { style: { display: 'flex', gap: '12px', alignItems: 'center' } }, [scaleIn, scLabel]))
    ]);
    let mode = 'text';
    const tabs = F.tabs([
      { id: 'text', label: 'Text watermark', node: textPane },
      { id: 'image', label: 'Image watermark', node: imgPane }
    ], (id) => { mode = id; });

    const dz = F.dropzone({ multiple: false, label: 'Choose a PDF', onFiles: (f) => { file = f[0]; F.setGo(!!file); } });
    body.appendChild(dz.node);
    body.appendChild(F.section('Watermark'));
    body.appendChild(tabs);
    body.appendChild(F.section('Placement'));
    body.appendChild(F.rows([F.field('Position', position), F.field('Pages', rangeIn), F.field('Tile gap (pt)', tileGap)]));
    body.appendChild(F.field('Opacity', el('div', { style: { display: 'flex', gap: '12px', alignItems: 'center' } }, [opacity, opLabel])));
    body.appendChild(tile);
    body.appendChild(behind);

    F.footBtns(foot, {
      action: 'Add watermark', actionIcon: 'branding_watermark', disabled: true,
      onAction: () => F.run('Stamping…', async () => {
        const { PDFLib } = F.needs(['PDFLib']);
        const doc = await F.loadPdfLib(file);
        const pages = doc.getPages();
        const idx = F.parseRange(rangeIn.value || 'all', pages.length);
        const op = (+opacity.value || 22) / 100;
        const gap = Math.max(40, +tileGap.value || 160);
        let font = null, img = null, iw = 0, ih = 0;

        if (mode === 'text') {
          if (!textIn.value.trim()) throw new Error('Type some watermark text.');
          font = await F.embedFont(doc, fontSel.value);
        } else {
          if (!imgFile) throw new Error('Choose an image for the watermark.');
          const bytes = new Uint8Array(await imgFile.arrayBuffer());
          img = await F.embedImage(doc, bytes, imgFile.type);
          iw = img.width; ih = img.height;
        }

        for (const i of idx) {
          const page = pages[i];
          const pw = page.getWidth(), ph = page.getHeight();
          const draw = (x, y) => {
            if (mode === 'text') {
              page.drawText(F.wa(textIn.value), {
                x, y, size: +sizeIn.value || 58, font,
                color: F.pdfColor(colorIn.value), opacity: op,
                rotate: PDFLib.degrees(+rotateIn.value || 0)
              });
            } else {
              const w = pw * ((+scaleIn.value || 40) / 100);
              const h = (ih / iw) * w;
              page.drawImage(img, { x, y, width: w, height: h, opacity: op,
                rotate: PDFLib.degrees(+rotateIn.value || 0) });
            }
          };
          let tw, th;
          if (mode === 'text') {
            const s = +sizeIn.value || 58;
            try { tw = font.widthOfTextAtSize(F.wa(textIn.value), s); } catch (e) { tw = textIn.value.length * s * 0.5; }
            th = s;
          } else {
            tw = pw * ((+scaleIn.value || 40) / 100);
            th = (ih / iw) * tw;
          }
          if (tile.input.checked) {
            for (let x = -tw; x < pw + tw; x += Math.max(gap, tw * 0.75)) {
              for (let y = -th; y < ph + th; y += Math.max(gap, th * 1.4)) draw(x, y);
            }
          } else {
            const p = place(position.value, pw, ph, tw, th, 34);
            draw(p.x, p.y);
          }
        }
        const name = F.baseName(file.name) + '_watermarked.pdf';
        const data = await F.savePdfDoc(doc, name);
        if (behind.input.checked) F.toast('Note: content is drawn on top; use lower opacity for a "behind" look.', 'info', 6000);
        F.result(body, {
          title: 'Watermarked', msg: idx.length + ' page(s) stamped.',
          stats: [{ k: 'Pages', v: String(idx.length) }, { k: 'Size', v: F.fmtSize(data.length) }],
          actions: [{ label: 'Download again', icon: 'download', primary: true, on: () => F.saveBytes(data, name) },
          { label: 'Start over', icon: 'refresh', on: () => F.launch('watermark') }]
        });
        F.footBtns(foot, {});
      })
    });
  });

  /* =========================================================
     CROP
     ========================================================= */
  F.register('crop', function (ctx) {
    const { body, foot } = ctx;
    let file = null, buf = null, pdf = null, pageW = 0, pageH = 0;
    const stage = el('div', { class: 'editor-stage', style: { position: 'relative' } });

    const top = F.input({ type: 'number', value: '0', min: '0' });
    const bottom = F.input({ type: 'number', value: '0', min: '0' });
    const left = F.input({ type: 'number', value: '0', min: '0' });
    const right = F.input({ type: 'number', value: '0', min: '0' });
    const unit = F.select(['pt', 'mm', 'cm', 'in'], 'pt');
    const applyTo = F.select([{ v: 'all', t: 'All pages' }, { v: 'odd', t: 'Odd pages' },
    { v: 'even', t: 'Even pages' }, { v: 'custom', t: 'Custom range…' }], 'all');
    const rangeIn = F.input({ placeholder: '1-5, 8' });
    const rangeField = F.field('Range', rangeIn);
    rangeField.style.display = 'none';
    applyTo.addEventListener('change', () => { rangeField.style.display = applyTo.value === 'custom' ? 'block' : 'none'; });
    const autoBtn = el('button', { class: 'btn sm' }, [mi('auto_fix_high'), 'Auto-detect margins']);

    let sel = null; // {x,y,w,h} in canvas px
    let canvas = null, dragStart = null, box = null;

    const dz = F.dropzone({
      multiple: false, label: 'Choose a PDF to crop',
      onFiles: async (fs) => {
        if (!fs.length) { F.setGo(false); return; }
        file = fs[0];
        await F.run('Reading…', async () => {
          buf = await F.readBuf(file);
          pdf = await F.loadPdfJs(buf);
          const p = await pdf.getPage(1);
          const vp = p.getViewport({ scale: 1 });
          pageW = vp.width; pageH = vp.height;
          canvas = await F.renderPage(pdf, 1, { scale: Math.min(1.5, 620 / vp.width) });
          stage.innerHTML = '';
          const holder = el('div', { style: { position: 'relative', display: 'inline-block' } });
          holder.appendChild(canvas);
          box = el('div', {
            style: {
              position: 'absolute', border: '2px dashed #e2231a', background: 'rgba(226,35,26,.12)',
              pointerEvents: 'none', display: 'none'
            }
          });
          holder.appendChild(box);
          stage.appendChild(holder);
          bindDrag(holder);
          F.setGo(true);
        });
      }
    });

    function bindDrag(holder) {
      const pt = (e) => {
        const r = canvas.getBoundingClientRect();
        const t = e.touches ? e.touches[0] : e;
        return { x: Math.max(0, Math.min(r.width, t.clientX - r.left)), y: Math.max(0, Math.min(r.height, t.clientY - r.top)) };
      };
      const down = (e) => { e.preventDefault(); dragStart = pt(e); };
      const move = (e) => {
        if (!dragStart) return;
        e.preventDefault();
        const p = pt(e);
        sel = {
          x: Math.min(dragStart.x, p.x), y: Math.min(dragStart.y, p.y),
          w: Math.abs(p.x - dragStart.x), h: Math.abs(p.y - dragStart.y)
        };
        box.style.display = 'block';
        box.style.left = sel.x + 'px'; box.style.top = sel.y + 'px';
        box.style.width = sel.w + 'px'; box.style.height = sel.h + 'px';
      };
      const up = () => {
        if (!dragStart || !sel || sel.w < 6 || sel.h < 6) { dragStart = null; return; }
        dragStart = null;
        const r = canvas.getBoundingClientRect();
        const kx = pageW / r.width, ky = pageH / r.height;
        top.value = Math.round(sel.y * ky);
        left.value = Math.round(sel.x * kx);
        right.value = Math.round(pageW - (sel.x + sel.w) * kx);
        bottom.value = Math.round(pageH - (sel.y + sel.h) * ky);
        unit.value = 'pt';
        F.toast('Margins captured from your selection.', 'ok');
      };
      holder.addEventListener('mousedown', down);
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
      holder.addEventListener('touchstart', down, { passive: false });
      holder.addEventListener('touchmove', move, { passive: false });
      holder.addEventListener('touchend', up);
    }

    autoBtn.addEventListener('click', () => F.run('Detecting…', async () => {
      if (!pdf) throw new Error('Choose a PDF first.');
      const c = await F.renderPage(pdf, 1, { scale: 1 });
      const ctxc = c.getContext('2d');
      const d = ctxc.getImageData(0, 0, c.width, c.height).data;
      let minX = c.width, minY = c.height, maxX = 0, maxY = 0, found = false;
      for (let y = 0; y < c.height; y++) {
        for (let x = 0; x < c.width; x++) {
          const i = (y * c.width + x) * 4;
          if (d[i] < 238 || d[i + 1] < 238 || d[i + 2] < 238) {
            found = true;
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
          }
        }
      }
      if (!found) { F.toast('The first page looks blank.', 'warn'); return; }
      const pad = 6;
      const kx = pageW / c.width, ky = pageH / c.height;
      left.value = Math.max(0, Math.round(minX * kx - pad));
      top.value = Math.max(0, Math.round(minY * ky - pad));
      right.value = Math.max(0, Math.round((c.width - maxX) * kx - pad));
      bottom.value = Math.max(0, Math.round((c.height - maxY) * ky - pad));
      unit.value = 'pt';
      F.toast('Margins detected from page 1.', 'ok');
    }));

    body.appendChild(F.note('Drag a rectangle on the preview to set the keep-area, or type margins to trim from each edge.'));
    body.appendChild(dz.node);
    body.appendChild(F.toolbar([autoBtn]));
    body.appendChild(stage);
    body.appendChild(F.section('Trim margins'));
    body.appendChild(F.rows([F.field('Top', top), F.field('Bottom', bottom), F.field('Left', left),
    F.field('Right', right), F.field('Unit', unit)]));
    body.appendChild(F.rows([F.field('Apply to', applyTo)]));
    body.appendChild(rangeField);

    F.footBtns(foot, {
      action: 'Crop PDF', actionIcon: 'crop', disabled: true,
      onAction: () => F.run('Cropping…', async () => {
        const doc = await F.loadPdfLib(buf);
        const k = F.PT[unit.value] || 1;
        const t = (+top.value || 0) * k, b = (+bottom.value || 0) * k;
        const l = (+left.value || 0) * k, r = (+right.value || 0) * k;
        if (!t && !b && !l && !r) throw new Error('Set at least one margin to trim.');
        const pages = doc.getPages();
        let idx;
        if (applyTo.value === 'all') idx = pages.map((_, i) => i);
        else if (applyTo.value === 'odd') idx = pages.map((_, i) => i).filter((i) => i % 2 === 0);
        else if (applyTo.value === 'even') idx = pages.map((_, i) => i).filter((i) => i % 2 === 1);
        else idx = F.parseRange(rangeIn.value || 'all', pages.length);

        idx.forEach((i) => {
          const page = pages[i];
          const mb = page.getMediaBox();
          const nx = mb.x + l;
          const ny = mb.y + b;
          const nw = mb.width - l - r;
          const nh = mb.height - t - b;
          if (nw <= 10 || nh <= 10) return;
          page.setCropBox(nx, ny, nw, nh);
          page.setMediaBox(nx, ny, nw, nh);
        });
        const name = F.baseName(file.name) + '_cropped.pdf';
        const data = await F.savePdfDoc(doc, name);
        F.result(body, {
          title: 'Cropped', msg: idx.length + ' page(s) trimmed.',
          stats: [{ k: 'Pages', v: String(idx.length) }, { k: 'Size', v: F.fmtSize(data.length) }],
          actions: [{ label: 'Download again', icon: 'download', primary: true, on: () => F.saveBytes(data, name) },
          { label: 'Crop another', icon: 'refresh', on: () => F.launch('crop') }]
        });
        F.footBtns(foot, {});
      })
    });
  });

  /* =========================================================
     HEADER & FOOTER
     ========================================================= */
  F.register('header', function (ctx) {
    const { body, foot } = ctx;
    let file = null;
    const hl = F.input({ placeholder: 'Header left' });
    const hc = F.input({ placeholder: 'Header centre' });
    const hr = F.input({ placeholder: 'Header right' });
    const fl = F.input({ placeholder: 'Footer left' });
    const fc = F.input({ placeholder: 'Footer centre', value: '{n} / {total}' });
    const fr = F.input({ placeholder: 'Footer right' });
    const fontSel = F.select(FONTS, 'Helvetica');
    const sizeIn = F.input({ type: 'number', value: '9', min: '5', max: '28' });
    const colorIn = el('input', { type: 'color', value: '#444444' });
    const marginIn = F.input({ type: 'number', value: '26', min: '0' });
    const ruleChk = F.checkbox('Draw a thin rule under the header / above the footer', false);
    const rangeIn = F.input({ placeholder: 'all' });

    const dz = F.dropzone({ multiple: false, label: 'Choose a PDF', onFiles: (f) => { file = f[0]; F.setGo(!!file); } });
    body.appendChild(F.note('Fields available: <b>{n}</b> page number, <b>{total}</b> total pages, <b>{date}</b>, <b>{time}</b>, <b>{filename}</b>.'));
    body.appendChild(dz.node);
    body.appendChild(F.section('Header'));
    body.appendChild(F.rows([F.field('Left', hl), F.field('Centre', hc), F.field('Right', hr)]));
    body.appendChild(F.section('Footer'));
    body.appendChild(F.rows([F.field('Left', fl), F.field('Centre', fc), F.field('Right', fr)]));
    body.appendChild(F.section('Appearance'));
    body.appendChild(F.rows([F.field('Font', fontSel), F.field('Size', sizeIn),
    F.field('Colour', colorIn), F.field('Margin (pt)', marginIn), F.field('Pages', rangeIn)]));
    body.appendChild(ruleChk);

    F.footBtns(foot, {
      action: 'Apply header & footer', actionIcon: 'title', disabled: true,
      onAction: () => F.run('Applying…', async () => {
        const { PDFLib } = F.needs(['PDFLib']);
        const doc = await F.loadPdfLib(file);
        const font = await F.embedFont(doc, fontSel.value);
        const pages = doc.getPages();
        const total = pages.length;
        const idx = F.parseRange(rangeIn.value || 'all', total);
        const size = +sizeIn.value || 9;
        const m = +marginIn.value || 26;
        const col = F.pdfColor(colorIn.value);
        const now = new Date();
        const subst = (s, n) => F.wa(String(s || '')
          .replace(/\{n\}/g, String(n))
          .replace(/\{total\}/g, String(total))
          .replace(/\{date\}/g, now.toLocaleDateString())
          .replace(/\{time\}/g, now.toLocaleTimeString())
          .replace(/\{filename\}/g, F.baseName(file.name)));

        idx.forEach((i) => {
          const page = pages[i];
          const pw = page.getWidth(), ph = page.getHeight();
          const put = (txt, align, y) => {
            if (!txt) return;
            let w;
            try { w = font.widthOfTextAtSize(txt, size); } catch (e) { w = txt.length * size * 0.5; }
            const x = align === 'l' ? m : align === 'c' ? (pw - w) / 2 : pw - m - w;
            page.drawText(txt, { x, y, size, font, color: col });
          };
          const hy = ph - m - size;
          const fy = m;
          put(subst(hl.value, i + 1), 'l', hy);
          put(subst(hc.value, i + 1), 'c', hy);
          put(subst(hr.value, i + 1), 'r', hy);
          put(subst(fl.value, i + 1), 'l', fy);
          put(subst(fc.value, i + 1), 'c', fy);
          put(subst(fr.value, i + 1), 'r', fy);
          if (ruleChk.input.checked) {
            const grey = PDFLib.rgb(0.78, 0.79, 0.82);
            if (hl.value || hc.value || hr.value) {
              page.drawLine({ start: { x: m, y: hy - 5 }, end: { x: pw - m, y: hy - 5 }, thickness: 0.5, color: grey });
            }
            if (fl.value || fc.value || fr.value) {
              page.drawLine({ start: { x: m, y: fy + size + 4 }, end: { x: pw - m, y: fy + size + 4 }, thickness: 0.5, color: grey });
            }
          }
        });
        const name = F.baseName(file.name) + '_header_footer.pdf';
        const data = await F.savePdfDoc(doc, name);
        F.result(body, {
          title: 'Applied', msg: idx.length + ' page(s) updated.',
          stats: [{ k: 'Pages', v: String(idx.length) }, { k: 'Size', v: F.fmtSize(data.length) }],
          actions: [{ label: 'Download again', icon: 'download', primary: true, on: () => F.saveBytes(data, name) },
          { label: 'Start over', icon: 'refresh', on: () => F.launch('header') }]
        });
        F.footBtns(foot, {});
      })
    });
  });

  /* =========================================================
     BATES NUMBERING
     ========================================================= */
  F.register('bates', function (ctx) {
    const { body, foot } = ctx;
    let files = [];
    const prefix = F.input({ value: 'ABC' });
    const suffix = F.input({ placeholder: 'optional' });
    const startIn = F.input({ type: 'number', value: '1', min: '0' });
    const digits = F.input({ type: 'number', value: '6', min: '1', max: '12' });
    const stepIn = F.input({ type: 'number', value: '1', min: '1' });
    const position = F.select(POSITIONS, 'bottom-right');
    const fontSel = F.select(FONTS, 'Helvetica-Bold');
    const sizeIn = F.input({ type: 'number', value: '10', min: '5', max: '30' });
    const colorIn = el('input', { type: 'color', value: '#c62828' });
    const marginIn = F.input({ type: 'number', value: '24', min: '0' });
    const continuous = F.checkbox('Continue numbering across all selected files', true);
    const previewLbl = el('div', { class: 'hint' });

    function updatePreview() {
      const n = parseInt(startIn.value, 10) || 0;
      previewLbl.textContent = 'Preview: ' + (prefix.value || '') +
        String(n).padStart(Math.max(1, +digits.value || 6), '0') + (suffix.value || '');
    }
    [prefix, suffix, startIn, digits].forEach((i) => i.addEventListener('input', updatePreview));
    updatePreview();

    const dz = F.dropzone({ multiple: true, label: 'Choose PDFs', onFiles: (f) => { files = f; F.setGo(f.length > 0); } });
    body.appendChild(F.note('Bates stamps are sequential identifiers used in legal and audit workflows.'));
    body.appendChild(dz.node);
    body.appendChild(F.section('Stamp'));
    body.appendChild(F.rows([F.field('Prefix', prefix), F.field('Suffix', suffix),
    F.field('Start at', startIn), F.field('Digits', digits), F.field('Increment', stepIn)]));
    body.appendChild(previewLbl);
    body.appendChild(F.section('Appearance'));
    body.appendChild(F.rows([F.field('Position', position), F.field('Font', fontSel),
    F.field('Size', sizeIn), F.field('Colour', colorIn), F.field('Margin (pt)', marginIn)]));
    body.appendChild(continuous);

    F.footBtns(foot, {
      action: 'Apply Bates numbers', actionIcon: 'pin', disabled: true,
      onAction: () => F.run('Stamping…', async () => {
        const outs = [];
        let counter = parseInt(startIn.value, 10) || 1;
        const step = Math.max(1, +stepIn.value || 1);
        const pad = Math.max(1, +digits.value || 6);
        const size = +sizeIn.value || 10;
        const m = +marginIn.value || 24;
        let stamped = 0;
        for (const f of files) {
          if (!continuous.input.checked) counter = parseInt(startIn.value, 10) || 1;
          const doc = await F.loadPdfLib(f);
          const font = await F.embedFont(doc, fontSel.value);
          const col = F.pdfColor(colorIn.value);
          doc.getPages().forEach((page) => {
            const txt = F.wa((prefix.value || '') + String(counter).padStart(pad, '0') + (suffix.value || ''));
            const pw = page.getWidth(), ph = page.getHeight();
            let w;
            try { w = font.widthOfTextAtSize(txt, size); } catch (e) { w = txt.length * size * 0.5; }
            const p = place(position.value, pw, ph, w, size, m);
            page.drawText(txt, { x: p.x, y: p.y, size, font, color: col });
            counter += step;
            stamped++;
          });
          F.stamp(doc);
          outs.push({ name: F.baseName(f.name) + '_bates.pdf', data: await doc.save() });
        }
        if (outs.length === 1) F.saveBytes(outs[0].data, outs[0].name);
        else await F.saveZip(outs, 'bates_numbered.zip');
        F.result(body, {
          title: 'Bates applied', msg: stamped + ' page(s) stamped.',
          stats: [{ k: 'Files', v: String(outs.length) }, { k: 'Pages', v: String(stamped) },
          { k: 'Last number', v: String(counter - step) }],
          actions: [{ label: 'Start over', icon: 'refresh', primary: true, on: () => F.launch('bates') }]
        });
        F.footBtns(foot, {});
      })
    });
  });

  /* =========================================================
     METADATA
     ========================================================= */
  F.register('meta', function (ctx) {
    const { body, foot } = ctx;
    let file = null, doc = null;
    const title = F.input({});
    const author = F.input({});
    const subject = F.input({});
    const keywords = F.input({ placeholder: 'comma, separated, keywords' });
    const creator = F.input({});
    const producer = F.input({});
    const clearAll = F.checkbox('Wipe every field (privacy scrub)', false);
    const info = el('div');

    const dz = F.dropzone({
      multiple: false, label: 'Choose a PDF',
      onFiles: async (fs) => {
        if (!fs.length) { F.setGo(false); return; }
        file = fs[0];
        await F.run('Reading metadata…', async () => {
          doc = await F.loadPdfLib(file);
          title.value = safe(() => doc.getTitle()) || '';
          author.value = safe(() => doc.getAuthor()) || '';
          subject.value = safe(() => doc.getSubject()) || '';
          keywords.value = (safe(() => doc.getKeywords()) || '');
          creator.value = safe(() => doc.getCreator()) || '';
          producer.value = safe(() => doc.getProducer()) || '';
          info.innerHTML = '';
          info.appendChild(F.note('Pages: <b>' + doc.getPageCount() + '</b> · Created: <b>' +
            (safe(() => doc.getCreationDate()) ? doc.getCreationDate().toLocaleString() : 'unknown') + '</b>'));
          F.setGo(true);
        });
      }
    });
    function safe(fn) { try { return fn(); } catch (e) { return null; } }

    body.appendChild(dz.node);
    body.appendChild(info);
    body.appendChild(F.section('Document properties'));
    body.appendChild(F.rows([F.field('Title', title), F.field('Author', author)]));
    body.appendChild(F.rows([F.field('Subject', subject), F.field('Keywords', keywords)]));
    body.appendChild(F.rows([F.field('Creator app', creator), F.field('Producer', producer)]));
    body.appendChild(clearAll);

    F.footBtns(foot, {
      action: 'Save metadata', actionIcon: 'save', disabled: true,
      onAction: () => F.run('Saving…', async () => {
        const d = await F.loadPdfLib(file);
        if (clearAll.input.checked) {
          d.setTitle(''); d.setAuthor(''); d.setSubject(''); d.setKeywords([]);
          d.setCreator(''); d.setProducer('');
        } else {
          d.setTitle(title.value || '');
          d.setAuthor(author.value || '');
          d.setSubject(subject.value || '');
          d.setKeywords(keywords.value ? keywords.value.split(/\s*,\s*/).filter(Boolean) : []);
          d.setCreator(creator.value || 'The PDF Factory by Smit Parekh');
          d.setProducer(producer.value || 'The PDF Factory by Smit Parekh');
        }
        d.setModificationDate(new Date());
        const bytes = await d.save({ useObjectStreams: true });
        const name = F.baseName(file.name) + '_metadata.pdf';
        F.saveBytes(bytes, name);
        F.result(body, {
          title: 'Metadata saved', msg: clearAll.input.checked ? 'All identifying fields were wiped.' : 'Your document properties are updated.',
          stats: [{ k: 'Pages', v: String(d.getPageCount()) }, { k: 'Size', v: F.fmtSize(bytes.length) }],
          actions: [{ label: 'Download again', icon: 'download', primary: true, on: () => F.saveBytes(bytes, name) },
          { label: 'Edit another', icon: 'refresh', on: () => F.launch('meta') }]
        });
        F.footBtns(foot, {});
      })
    });
  });

  /* =========================================================
     PAGE BACKGROUND
     ========================================================= */
  F.register('background', function (ctx) {
    const { body, foot } = ctx;
    let file = null, imgFile = null;
    const colorIn = el('input', { type: 'color', value: '#fffdf2' });
    const opacity = F.input({ type: 'range', min: '5', max: '100', value: '100' });
    const opLabel = el('span', { class: 'tb-label', text: '100%' });
    opacity.addEventListener('input', () => (opLabel.textContent = opacity.value + '%'));
    const rangeIn = F.input({ placeholder: 'all' });
    let mode = 'color';

    const imgDz = F.dropzone({
      accept: 'image/*', multiple: false, label: 'Choose a background image',
      onFiles: (f) => { imgFile = f[0] || null; }
    });
    const tabs = F.tabs([
      { id: 'color', label: 'Solid colour', node: el('div', {}, [F.field('Background colour', colorIn)]) },
      { id: 'image', label: 'Image', node: imgDz.node }
    ], (id) => { mode = id; });

    const dz = F.dropzone({ multiple: false, label: 'Choose a PDF', onFiles: (f) => { file = f[0]; F.setGo(!!file); } });
    body.appendChild(F.note('The background is drawn <b>under</b> your existing content, so text stays readable.'));
    body.appendChild(dz.node);
    body.appendChild(tabs);
    body.appendChild(F.rows([F.field('Pages', rangeIn)]));
    body.appendChild(F.field('Opacity', el('div', { style: { display: 'flex', gap: '12px', alignItems: 'center' } }, [opacity, opLabel])));

    F.footBtns(foot, {
      action: 'Apply background', actionIcon: 'format_color_fill', disabled: true,
      onAction: () => F.run('Applying…', async () => {
        const { PDFLib } = F.needs(['PDFLib']);
        const src = await F.loadPdfLib(file);
        const out = await F.newPdf();
        const pages = src.getPages();
        const idx = F.parseRange(rangeIn.value || 'all', pages.length);
        const embedded = await out.embedPages(pages);
        const op = (+opacity.value || 100) / 100;
        let img = null;
        if (mode === 'image') {
          if (!imgFile) throw new Error('Choose a background image.');
          img = await F.embedImage(out, new Uint8Array(await imgFile.arrayBuffer()), imgFile.type);
        }
        for (let i = 0; i < pages.length; i++) {
          const sp = pages[i];
          const pw = sp.getWidth(), ph = sp.getHeight();
          const page = out.addPage([pw, ph]);
          if (idx.indexOf(i) > -1) {
            if (mode === 'color') {
              page.drawRectangle({ x: 0, y: 0, width: pw, height: ph, color: F.pdfColor(colorIn.value), opacity: op });
            } else {
              const s = Math.max(pw / img.width, ph / img.height);
              page.drawImage(img, {
                x: (pw - img.width * s) / 2, y: (ph - img.height * s) / 2,
                width: img.width * s, height: img.height * s, opacity: op
              });
            }
          }
          page.drawPage(embedded[i], { x: 0, y: 0, width: pw, height: ph });
        }
        const name = F.baseName(file.name) + '_background.pdf';
        const data = await F.savePdfDoc(out, name);
        F.result(body, {
          title: 'Background applied', msg: idx.length + ' page(s) updated.',
          stats: [{ k: 'Pages', v: String(out.getPageCount()) }, { k: 'Size', v: F.fmtSize(data.length) }],
          actions: [{ label: 'Download again', icon: 'download', primary: true, on: () => F.saveBytes(data, name) },
          { label: 'Start over', icon: 'refresh', on: () => F.launch('background') }]
        });
        F.footBtns(foot, {});
      })
    });
  });
})();
