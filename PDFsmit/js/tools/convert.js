/* ============================================================
   The PDF Factory — CONVERT tools
   pdf2word, pdf2excel, pdf2ppt, word2pdf, excel2pdf, ppt2pdf,
   pdf2jpg, jpg2pdf, pdfa, html2pdf, pdf2text
   ============================================================ */
(function () {
  'use strict';
  const F = window.PF;
  const el = F.el, mi = F.mi;

  /* =========================================================
     PDF → WORD (.docx)
     ========================================================= */
  F.register('pdf2word', function (ctx) {
    const { body, foot } = ctx;
    let files = [];
    const mode = F.select([
      { v: 'flow', t: 'Flowing text — best for editing' },
      { v: 'layout', t: 'Layout mode — keep line positions' },
      { v: 'image', t: 'Image mode — exact look, not editable' }
    ], 'flow');
    const pageBreaks = F.checkbox('Insert a page break between PDF pages', true);

    const dz = F.dropzone({
      multiple: true, label: 'Choose PDFs to convert to Word',
      onFiles: (f) => { files = f; F.setGo(f.length > 0); }
    });

    body.appendChild(F.note('Text is extracted directly from the PDF. Scanned pages contain no text — run <b>OCR PDF</b> first for those.'));
    body.appendChild(dz.node);
    body.appendChild(F.section('Conversion style'));
    body.appendChild(F.field('Mode', mode));
    body.appendChild(pageBreaks);

    F.footBtns(foot, {
      action: 'Convert to Word', actionIcon: 'description', disabled: true,
      onAction: () => F.run('Converting…', async () => {
        const { docx } = F.needs(['docx']);
        const outs = [];
        for (let fi = 0; fi < files.length; fi++) {
          const f = files[fi];
          const buf = await F.readBuf(f);
          const pdf = await F.loadPdfJs(buf);
          const children = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            F.progress(((fi + i / pdf.numPages) / files.length) * 100, 'Page ' + i + ' / ' + pdf.numPages);
            if (mode.value === 'image') {
              const canvas = await F.renderPage(pdf, i, { scale: 1.6 });
              const blob = await F.canvasBlob(canvas, 'image/png');
              children.push(new docx.Paragraph({
                children: [new docx.ImageRun({
                  data: await blob.arrayBuffer(),
                  transformation: { width: 600, height: Math.round(600 * canvas.height / canvas.width) }
                })]
              }));
            } else {
              const { items } = await F.pageItems(pdf, i);
              const lines = F.toLines(items);
              const sizes = lines.map((l) => l.size).sort((a, b) => a - b);
              const median = sizes.length ? sizes[Math.floor(sizes.length / 2)] : 11;
              lines.forEach((l) => {
                const big = l.size > median * 1.28;
                children.push(new docx.Paragraph({
                  heading: big ? docx.HeadingLevel.HEADING_2 : undefined,
                  spacing: { after: 90 },
                  indent: mode.value === 'layout' ? { left: Math.round(Math.max(0, l.x) * 15) } : undefined,
                  children: [new docx.TextRun({
                    text: l.text,
                    bold: l.bold || big,
                    size: Math.max(14, Math.round(l.size * 1.75)),
                    font: 'Calibri'
                  })]
                }));
              });
            }
            if (pageBreaks.input.checked && i < pdf.numPages) {
              children.push(new docx.Paragraph({ children: [new docx.PageBreak()] }));
            }
            if (i % 3 === 0) await F.tick();
          }
          if (!children.length) children.push(new docx.Paragraph({ text: '(no extractable text — the PDF looks scanned)' }));
          const doc = new docx.Document({
            creator: 'The PDF Factory by Smit Parekh',
            title: F.baseName(f.name),
            sections: [{ properties: {}, children }]
          });
          const blob = await docx.Packer.toBlob(doc);
          outs.push({ name: F.baseName(f.name) + '.docx', data: await blob.arrayBuffer() });
        }
        if (outs.length === 1) F.saveBlob(new Blob([outs[0].data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), outs[0].name);
        else await F.saveZip(outs, 'pdf_to_word.zip');
        F.result(body, {
          title: 'Word files ready', msg: outs.length + ' document(s) created.',
          stats: [{ k: 'Files', v: String(outs.length) }],
          actions: [{ label: 'Convert more', icon: 'refresh', primary: true, on: () => F.launch('pdf2word') }]
        });
        F.footBtns(foot, {});
      })
    });
  });

  /* =========================================================
     PDF → EXCEL (.xlsx)
     ========================================================= */
  F.register('pdf2excel', function (ctx) {
    const { body, foot } = ctx;
    let file = null;
    const sheetMode = F.select([
      { v: 'page', t: 'One sheet per PDF page' },
      { v: 'one', t: 'All pages in one sheet' }
    ], 'page');
    const tol = F.input({ type: 'number', value: '12', min: '2', max: '80' });

    const dz = F.dropzone({ multiple: false, label: 'Choose a PDF with tables', onFiles: (f) => { file = f[0]; F.setGo(!!file); } });
    body.appendChild(F.note('Columns are detected from the horizontal position of the text. Increase the gap value if columns merge, decrease it if one column splits.'));
    body.appendChild(dz.node);
    body.appendChild(F.rows([F.field('Sheets', sheetMode), F.field('Column gap (pt)', tol)]));

    F.footBtns(foot, {
      action: 'Convert to Excel', actionIcon: 'table_chart', disabled: true,
      onAction: () => F.run('Extracting tables…', async () => {
        const { XLSX } = F.needs(['XLSX']);
        const buf = await F.readBuf(file);
        const pdf = await F.loadPdfJs(buf);
        const wb = XLSX.utils.book_new();
        const all = [];
        const gap = Math.max(2, +tol.value || 12);
        for (let i = 1; i <= pdf.numPages; i++) {
          F.progress((i / pdf.numPages) * 100, 'Page ' + i);
          const { items } = await F.pageItems(pdf, i);
          const rows = buildTable(items, gap);
          if (sheetMode.value === 'page') {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows.length ? rows : [['(empty page)']]), 'Page ' + i);
          } else {
            if (all.length) all.push([]);
            all.push(['--- Page ' + i + ' ---']);
            rows.forEach((r) => all.push(r));
          }
          await F.tick();
        }
        if (sheetMode.value === 'one') {
          XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(all.length ? all : [['(no text found)']]), 'Extracted');
        }
        const name = F.baseName(file.name) + '.xlsx';
        XLSX.writeFile(wb, name, { compression: true });
        F.result(body, {
          title: 'Spreadsheet ready', msg: 'Tables extracted from ' + pdf.numPages + ' page(s).',
          stats: [{ k: 'Pages', v: String(pdf.numPages) }],
          actions: [{ label: 'Convert another', icon: 'refresh', primary: true, on: () => F.launch('pdf2excel') }]
        });
        F.footBtns(foot, {});
      })
    });
  });

  /** cluster text items into a rows × columns matrix */
  function buildTable(items, gap) {
    const lines = F.toLines(items, 3.4);
    if (!lines.length) return [];
    // collect candidate column x-positions from all lines
    const xs = [];
    lines.forEach((l) => l.items.forEach((it) => xs.push(it.x)));
    xs.sort((a, b) => a - b);
    const cols = [];
    xs.forEach((x) => {
      const c = cols.find((c) => Math.abs(c - x) < gap);
      if (c === undefined) cols.push(x);
    });
    cols.sort((a, b) => a - b);
    return lines.map((l) => {
      const row = new Array(cols.length).fill('');
      l.items.forEach((it) => {
        let best = 0, bd = Infinity;
        cols.forEach((c, k) => { const d = Math.abs(c - it.x); if (d < bd) { bd = d; best = k; } });
        row[best] = (row[best] ? row[best] + ' ' : '') + it.text.trim();
      });
      return row.map((v) => {
        const t = v.trim();
        if (/^-?[\d,]+(\.\d+)?$/.test(t) && t.replace(/[^\d]/g, '').length < 15) {
          const n = parseFloat(t.replace(/,/g, ''));
          if (!isNaN(n)) return n;
        }
        return t;
      });
    }).filter((r) => r.some((c) => c !== ''));
  }

  /* =========================================================
     PDF → POWERPOINT (.pptx)
     ========================================================= */
  F.register('pdf2ppt', function (ctx) {
    const { body, foot } = ctx;
    let file = null;
    const mode = F.select([
      { v: 'image', t: 'Slide image — pixel perfect' },
      { v: 'text', t: 'Editable text boxes' }
    ], 'image');
    const layout = F.select([{ v: '16x9', t: 'Widescreen 16:9' }, { v: '4x3', t: 'Standard 4:3' }], '16x9');
    const quality = F.select([{ v: '1.4', t: 'Standard' }, { v: '2', t: 'High' }, { v: '2.6', t: 'Very high' }], '2');

    const dz = F.dropzone({ multiple: false, label: 'Choose a PDF', onFiles: (f) => { file = f[0]; F.setGo(!!file); } });
    body.appendChild(F.note('Each PDF page becomes one slide.'));
    body.appendChild(dz.node);
    body.appendChild(F.rows([F.field('Slide content', mode), F.field('Slide size', layout), F.field('Image quality', quality)]));

    F.footBtns(foot, {
      action: 'Convert to PowerPoint', actionIcon: 'slideshow', disabled: true,
      onAction: () => F.run('Building slides…', async () => {
        const { PptxGenJS } = F.needs(['PptxGenJS']);
        const buf = await F.readBuf(file);
        const pdf = await F.loadPdfJs(buf);
        const pptx = new PptxGenJS();
        pptx.layout = layout.value === '4x3' ? 'LAYOUT_4x3' : 'LAYOUT_16x9';
        pptx.author = 'The PDF Factory by Smit Parekh';
        pptx.title = F.baseName(file.name);
        const SW = layout.value === '4x3' ? 10 : 13.333;
        const SH = 7.5;
        for (let i = 1; i <= pdf.numPages; i++) {
          F.progress((i / pdf.numPages) * 100, 'Slide ' + i + ' / ' + pdf.numPages);
          const slide = pptx.addSlide();
          if (mode.value === 'image') {
            const canvas = await F.renderPage(pdf, i, { scale: +quality.value });
            const data = canvas.toDataURL('image/jpeg', 0.9);
            const ar = canvas.width / canvas.height;
            let w = SW, h = SW / ar;
            if (h > SH) { h = SH; w = SH * ar; }
            slide.addImage({ data, x: (SW - w) / 2, y: (SH - h) / 2, w, h });
          } else {
            const { items, width, height } = await F.pageItems(pdf, i);
            const lines = F.toLines(items);
            lines.forEach((l) => {
              slide.addText(l.text, {
                x: Math.max(0, (l.x / width) * SW),
                y: Math.max(0, (l.y / height) * SH - 0.12),
                w: SW - Math.max(0, (l.x / width) * SW) - 0.15,
                h: 0.3,
                fontSize: Math.max(8, Math.min(30, l.size * 0.92)),
                bold: l.bold, color: '222222', valign: 'top', margin: 0
              });
            });
          }
          await F.tick();
        }
        const name = F.baseName(file.name) + '.pptx';
        await pptx.writeFile({ fileName: name });
        F.result(body, {
          title: 'Presentation ready', msg: pdf.numPages + ' slides created.',
          stats: [{ k: 'Slides', v: String(pdf.numPages) }],
          actions: [{ label: 'Convert another', icon: 'refresh', primary: true, on: () => F.launch('pdf2ppt') }]
        });
        F.footBtns(foot, {});
      })
    });
  });

  /* =========================================================
     shared: render HTML string → PDF pages (text-flow renderer)
     ========================================================= */
  async function htmlToPdfDoc(html, opts) {
    opts = opts || {};
    const { PDFLib } = F.needs(['PDFLib']);
    const doc = await F.newPdf();
    const size = F.PAGE_SIZES[opts.size || 'A4'];
    const M = opts.margin === undefined ? 56 : opts.margin;
    const fonts = {
      reg: await F.embedFont(doc, 'Helvetica'),
      bold: await F.embedFont(doc, 'Helvetica-Bold'),
      ital: await F.embedFont(doc, 'Helvetica-Oblique'),
      mono: await F.embedFont(doc, 'Courier')
    };
    const holder = el('div');
    holder.innerHTML = html;

    // flatten DOM into a block list
    const blocks = [];
    function walk(node, inherit) {
      for (const child of Array.prototype.slice.call(node.childNodes)) {
        if (child.nodeType === 3) {
          const t = child.textContent.replace(/\s+/g, ' ');
          if (t.trim()) blocks.push(Object.assign({ type: 'text', text: t }, inherit));
          continue;
        }
        if (child.nodeType !== 1) continue;
        const tag = child.tagName.toLowerCase();
        if (tag === 'script' || tag === 'style' || tag === 'head') continue;
        if (tag === 'br') { blocks.push({ type: 'br' }); continue; }
        if (tag === 'hr') { blocks.push({ type: 'hr' }); continue; }
        if (tag === 'img') { blocks.push({ type: 'img', src: child.getAttribute('src') }); continue; }
        const inh = Object.assign({}, inherit);
        if (/^h[1-6]$/.test(tag)) { inh.size = [0, 24, 20, 17, 15, 13.5, 12.5][+tag[1]]; inh.bold = true; inh.block = true; }
        if (tag === 'b' || tag === 'strong') inh.bold = true;
        if (tag === 'i' || tag === 'em') inh.ital = true;
        if (tag === 'code' || tag === 'pre') { inh.mono = true; inh.pre = true; }
        if (tag === 'p' || tag === 'div' || tag === 'section' || tag === 'article' || tag === 'blockquote' ||
          tag === 'ul' || tag === 'ol' || tag === 'table' || tag === 'tr') inh.block = true;
        if (tag === 'blockquote') inh.indent = (inherit.indent || 0) + 22;
        if (tag === 'li') { inh.bullet = true; inh.block = true; inh.indent = (inherit.indent || 0) + 16; }
        if (tag === 'td' || tag === 'th') inh.cell = true;
        if (inh.block) blocks.push({ type: 'startBlock', tag });
        walk(child, inh);
        if (inh.block) blocks.push({ type: 'endBlock', tag });
      }
    }
    walk(holder, { size: opts.fontSize || 11 });

    let page = doc.addPage(size.slice());
    let y = size[1] - M;
    const maxW = size[0] - M * 2;
    function newPage() { page = doc.addPage(size.slice()); y = size[1] - M; }
    function space(h) { if (y - h < M) newPage(); }

    let pendingLine = null;
    function flush() {
      if (!pendingLine) return;
      const b = pendingLine;
      pendingLine = null;
      const font = b.mono ? fonts.mono : b.bold ? fonts.bold : b.ital ? fonts.ital : fonts.reg;
      const size2 = b.size || 11;
      const indent = b.indent || 0;
      const lines = F.wrapText(F.wa(b.text.trim()), font, size2, maxW - indent - (b.bullet ? 10 : 0));
      lines.forEach((ln, k) => {
        space(size2 * 1.5);
        if (b.bullet && k === 0) {
          page.drawText('\u2022', { x: M + indent - 10, y, size: size2, font: fonts.reg, color: PDFLib.rgb(0.25, 0.25, 0.25) });
        }
        page.drawText(ln, { x: M + indent, y, size: size2, font, color: PDFLib.rgb(0.1, 0.1, 0.12) });
        y -= size2 * 1.45;
      });
      y -= b.gapAfter || 3;
    }

    for (const b of blocks) {
      if (b.type === 'startBlock') { flush(); continue; }
      if (b.type === 'endBlock') { flush(); y -= /^h[1-6]$/.test(b.tag) ? 6 : 4; continue; }
      if (b.type === 'br') { flush(); y -= 10; continue; }
      if (b.type === 'hr') {
        flush(); space(14);
        page.drawLine({ start: { x: M, y: y + 4 }, end: { x: size[0] - M, y: y + 4 }, thickness: 0.7, color: PDFLib.rgb(0.8, 0.8, 0.82) });
        y -= 14; continue;
      }
      if (b.type === 'img' && b.src && /^data:image\/(png|jpe?g)/i.test(b.src)) {
        flush();
        try {
          const isPng = /^data:image\/png/i.test(b.src);
          const bin = Uint8Array.from(atob(b.src.split(',')[1]), (c) => c.charCodeAt(0));
          const img = isPng ? await doc.embedPng(bin) : await doc.embedJpg(bin);
          const s = Math.min(1, maxW / img.width);
          space(img.height * s + 10);
          page.drawImage(img, { x: M, y: y - img.height * s, width: img.width * s, height: img.height * s });
          y -= img.height * s + 10;
        } catch (e) { console.warn('img', e); }
        continue;
      }
      if (b.type === 'text') {
        if (pendingLine && pendingLine.bold === !!b.bold && pendingLine.ital === !!b.ital &&
          pendingLine.mono === !!b.mono && pendingLine.size === (b.size || 11) && !b.cell) {
          pendingLine.text += b.text;
        } else {
          flush();
          pendingLine = {
            text: b.text, bold: !!b.bold, ital: !!b.ital, mono: !!b.mono,
            size: b.size || 11, indent: b.indent || 0, bullet: !!b.bullet
          };
        }
        if (b.cell) { pendingLine.text += '   '; }
      }
    }
    flush();
    return doc;
  }
  F.htmlToPdfDoc = htmlToPdfDoc;

  /* =========================================================
     WORD → PDF
     ========================================================= */
  F.register('word2pdf', function (ctx) {
    const { body, foot } = ctx;
    let files = [];
    const size = F.select(['A4', 'Letter', 'Legal', 'A3', 'A5'], 'A4');
    const fs = F.input({ type: 'number', value: '11', min: '7', max: '20' });
    const margin = F.input({ type: 'number', value: '56', min: '0' });

    const dz = F.dropzone({
      accept: '.docx,.doc,.txt,.rtf,.html,.htm', multiple: true,
      label: 'Choose Word documents (.docx)',
      sub: '.docx works best. Legacy .doc has limited support.',
      onFiles: (f) => { files = f; F.setGo(f.length > 0); }
    });
    body.appendChild(F.note('Modern <b>.docx</b> files convert with headings, lists, bold/italic and inline images.'));
    body.appendChild(dz.node);
    body.appendChild(F.rows([F.field('Page size', size), F.field('Base font size', fs), F.field('Margin (pt)', margin)]));

    F.footBtns(foot, {
      action: 'Convert to PDF', actionIcon: 'picture_as_pdf', disabled: true,
      onAction: () => F.run('Converting…', async () => {
        const outs = [];
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          F.progress((i / files.length) * 100, f.name);
          let html;
          const ext = F.ext(f.name);
          if (ext === 'docx' || ext === 'doc') {
            const { mammoth } = F.needs(['mammoth']);
            const buf = await F.readBuf(f);
            const r = await mammoth.convertToHtml({ arrayBuffer: buf }, {
              convertImage: mammoth.images.imgElement((image) =>
                image.read('base64').then((b64) => ({ src: 'data:' + image.contentType + ';base64,' + b64 })))
            });
            html = r.value;
            if (r.messages && r.messages.length) console.warn(r.messages);
          } else if (ext === 'html' || ext === 'htm') {
            html = await F.readText(f);
          } else {
            html = '<div>' + F.escapeHtml(await F.readText(f)).replace(/\n/g, '<br>') + '</div>';
          }
          const doc = await htmlToPdfDoc(html, { size: size.value, fontSize: +fs.value || 11, margin: +margin.value });
          F.stamp(doc);
          outs.push({ name: F.baseName(f.name) + '.pdf', data: await doc.save() });
        }
        if (outs.length === 1) F.saveBytes(outs[0].data, outs[0].name);
        else await F.saveZip(outs, 'word_to_pdf.zip');
        F.result(body, {
          title: 'PDFs ready', msg: outs.length + ' file(s) converted.',
          stats: [{ k: 'Files', v: String(outs.length) }],
          actions: [{ label: 'Convert more', icon: 'refresh', primary: true, on: () => F.launch('word2pdf') }]
        });
        F.footBtns(foot, {});
      })
    });
  });

  /* =========================================================
     EXCEL → PDF
     ========================================================= */
  F.register('excel2pdf', function (ctx) {
    const { body, foot } = ctx;
    let files = [];
    const size = F.select(['A4', 'Letter', 'A3', 'Legal'], 'A4');
    const orient = F.select([{ v: 'l', t: 'Landscape' }, { v: 'p', t: 'Portrait' }], 'l');
    const fs = F.input({ type: 'number', value: '9', min: '5', max: '16' });
    const gridOn = F.checkbox('Draw table grid lines', true);
    const headerOn = F.checkbox('Shade the first row as a header', true);

    const dz = F.dropzone({
      accept: '.xlsx,.xls,.csv,.ods', multiple: true, label: 'Choose spreadsheets',
      onFiles: (f) => { files = f; F.setGo(f.length > 0); }
    });
    body.appendChild(F.note('Every worksheet becomes its own set of PDF pages, with columns auto-sized.'));
    body.appendChild(dz.node);
    body.appendChild(F.rows([F.field('Page size', size), F.field('Orientation', orient), F.field('Font size', fs)]));
    body.appendChild(gridOn);
    body.appendChild(headerOn);

    F.footBtns(foot, {
      action: 'Convert to PDF', actionIcon: 'picture_as_pdf', disabled: true,
      onAction: () => F.run('Converting…', async () => {
        const { XLSX, PDFLib } = F.needs(['XLSX', 'PDFLib']);
        const outs = [];
        for (const f of files) {
          const buf = await F.readBuf(f);
          const wb = XLSX.read(buf, { type: 'array' });
          const doc = await F.newPdf();
          const reg = await F.embedFont(doc, 'Helvetica');
          const bold = await F.embedFont(doc, 'Helvetica-Bold');
          let [pw, ph] = F.PAGE_SIZES[size.value];
          if (orient.value === 'l') { const t = pw; pw = ph; ph = t; }
          const M = 32;
          const fsz = +fs.value || 9;
          const rowH = fsz * 1.75;

          wb.SheetNames.forEach((sn) => {
            const ws = wb.Sheets[sn];
            const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
            if (!aoa.length) return;
            const nCols = Math.max.apply(null, aoa.map((r) => r.length));
            const widths = [];
            for (let c = 0; c < nCols; c++) {
              let w = 0;
              aoa.forEach((r) => {
                const t = F.wa(String(r[c] === undefined ? '' : r[c]));
                let tw; try { tw = reg.widthOfTextAtSize(t, fsz); } catch (e) { tw = t.length * fsz * 0.5; }
                if (tw > w) w = tw;
              });
              widths.push(Math.min(Math.max(w + 10, 28), 260));
            }
            const total = widths.reduce((a, b) => a + b, 0);
            const avail = pw - M * 2;
            const sc = total > avail ? avail / total : 1;
            const colW = widths.map((w) => w * sc);

            let page = doc.addPage([pw, ph]);
            let y = ph - M;
            page.drawText(F.wa(sn), { x: M, y: y - 4, size: fsz + 3, font: bold, color: PDFLib.rgb(0.1, 0.1, 0.12) });
            y -= fsz * 2.6;

            aoa.forEach((row, ri) => {
              if (y - rowH < M) {
                page = doc.addPage([pw, ph]);
                y = ph - M;
              }
              let x = M;
              const isHead = ri === 0 && headerOn.input.checked;
              if (isHead) {
                page.drawRectangle({ x: M, y: y - rowH + 3, width: colW.reduce((a, b) => a + b, 0), height: rowH, color: PDFLib.rgb(0.93, 0.94, 0.97) });
              }
              for (let c = 0; c < nCols; c++) {
                const raw = row[c] === undefined ? '' : String(row[c]);
                let txt = F.wa(raw);
                const fnt = isHead ? bold : reg;
                // clip to cell
                while (txt.length > 1) {
                  let w; try { w = fnt.widthOfTextAtSize(txt, fsz); } catch (e) { w = txt.length * fsz * 0.5; }
                  if (w <= colW[c] - 6) break;
                  txt = txt.slice(0, -1);
                }
                if (txt) page.drawText(txt, { x: x + 3, y: y - fsz, size: fsz, font: fnt, color: PDFLib.rgb(0.12, 0.12, 0.15) });
                if (gridOn.input.checked) {
                  page.drawRectangle({
                    x, y: y - rowH + 3, width: colW[c], height: rowH,
                    borderColor: PDFLib.rgb(0.82, 0.83, 0.86), borderWidth: 0.4
                  });
                }
                x += colW[c];
              }
              y -= rowH;
            });
          });
          if (doc.getPageCount() === 0) doc.addPage([pw, ph]);
          F.stamp(doc);
          outs.push({ name: F.baseName(f.name) + '.pdf', data: await doc.save() });
        }
        if (outs.length === 1) F.saveBytes(outs[0].data, outs[0].name);
        else await F.saveZip(outs, 'excel_to_pdf.zip');
        F.result(body, {
          title: 'PDFs ready', msg: outs.length + ' spreadsheet(s) converted.',
          stats: [{ k: 'Files', v: String(outs.length) }],
          actions: [{ label: 'Convert more', icon: 'refresh', primary: true, on: () => F.launch('excel2pdf') }]
        });
        F.footBtns(foot, {});
      })
    });
  });

  /* =========================================================
     POWERPOINT → PDF
     ========================================================= */
  F.register('ppt2pdf', function (ctx) {
    const { body, foot } = ctx;
    let files = [];
    const size = F.select([{ v: '16x9', t: 'Widescreen 16:9' }, { v: '4x3', t: 'Standard 4:3' }], '16x9');
    const withNotes = F.checkbox('Include speaker notes under each slide', false);

    const dz = F.dropzone({
      accept: '.pptx', multiple: true, label: 'Choose .pptx presentations',
      onFiles: (f) => { files = f; F.setGo(f.length > 0); }
    });
    body.appendChild(F.note('Slide text, titles and embedded images are laid out on PDF pages. Complex animations and SmartArt are not reproduced.'));
    body.appendChild(dz.node);
    body.appendChild(F.rows([F.field('Slide size', size)]));
    body.appendChild(withNotes);

    F.footBtns(foot, {
      action: 'Convert to PDF', actionIcon: 'picture_as_pdf', disabled: true,
      onAction: () => F.run('Converting…', async () => {
        const { JSZip, PDFLib } = F.needs(['JSZip', 'PDFLib']);
        const outs = [];
        for (const f of files) {
          const zip = await JSZip.loadAsync(await F.readBuf(f));
          const slideNames = Object.keys(zip.files)
            .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
            .sort((a, b) => (+a.match(/\d+/)[0]) - (+b.match(/\d+/)[0]));
          const doc = await F.newPdf();
          const reg = await F.embedFont(doc, 'Helvetica');
          const bold = await F.embedFont(doc, 'Helvetica-Bold');
          const dims = size.value === '4x3' ? [720, 540] : [960, 540];

          for (let si = 0; si < slideNames.length; si++) {
            F.progress((si / slideNames.length) * 100, 'Slide ' + (si + 1));
            const xml = await zip.file(slideNames[si]).async('string');
            const page = doc.addPage(dims.slice());
            page.drawRectangle({ x: 0, y: 0, width: dims[0], height: dims[1], color: PDFLib.rgb(1, 1, 1) });

            // images from the slide's rels
            const relName = slideNames[si].replace('ppt/slides/', 'ppt/slides/_rels/') + '.rels';
            let images = [];
            if (zip.file(relName)) {
              const rels = await zip.file(relName).async('string');
              const re = /Target="([^"]*media\/[^"]+)"/g;
              let m;
              while ((m = re.exec(rels))) images.push('ppt/media/' + m[1].split('media/')[1]);
            }
            let imgY = dims[1] - 40;
            for (const path of images.slice(0, 2)) {
              const entry = zip.file(path);
              if (!entry) continue;
              try {
                const bin = await entry.async('uint8array');
                const isPng = /\.png$/i.test(path);
                const isJpg = /\.jpe?g$/i.test(path);
                if (!isPng && !isJpg) continue;
                const img = isPng ? await doc.embedPng(bin) : await doc.embedJpg(bin);
                const s = Math.min((dims[0] * 0.42) / img.width, (dims[1] * 0.42) / img.height);
                page.drawImage(img, {
                  x: dims[0] - img.width * s - 34, y: imgY - img.height * s,
                  width: img.width * s, height: img.height * s
                });
                imgY -= img.height * s + 14;
              } catch (e) { /* skip */ }
            }

            // text runs, grouped per <a:p> paragraph
            const paras = xml.split(/<a:p[ >]/).slice(1).map((chunk) => {
              const runs = [];
              const re = /<a:t>([\s\S]*?)<\/a:t>/g;
              let m;
              while ((m = re.exec(chunk))) runs.push(decodeXml(m[1]));
              return runs.join('');
            }).filter((t) => t.trim());

            let y = dims[1] - 56;
            paras.forEach((t, pi) => {
              const isTitle = pi === 0;
              const fsz = isTitle ? 26 : 15;
              const fnt = isTitle ? bold : reg;
              const lines = F.wrapText(F.wa(t), fnt, fsz, dims[0] * 0.56);
              lines.forEach((ln) => {
                if (y < 40) return;
                page.drawText(ln, {
                  x: 46, y, size: fsz, font: fnt,
                  color: isTitle ? PDFLib.rgb(0.09, 0.09, 0.12) : PDFLib.rgb(0.22, 0.22, 0.27)
                });
                y -= fsz * 1.42;
              });
              y -= isTitle ? 14 : 5;
            });
            page.drawText(String(si + 1), {
              x: dims[0] - 34, y: 18, size: 10, font: reg, color: PDFLib.rgb(0.6, 0.6, 0.65)
            });

            if (withNotes.input.checked) {
              const nn = 'ppt/notesSlides/notesSlide' + (si + 1) + '.xml';
              if (zip.file(nn)) {
                const nxml = await zip.file(nn).async('string');
                const re = /<a:t>([\s\S]*?)<\/a:t>/g;
                let m, txt = '';
                while ((m = re.exec(nxml))) txt += decodeXml(m[1]) + ' ';
                txt = txt.replace(/\s+/g, ' ').trim();
                if (txt && txt !== String(si + 1)) {
                  const np = doc.addPage(dims.slice());
                  np.drawText('Notes — slide ' + (si + 1), { x: 46, y: dims[1] - 50, size: 14, font: bold, color: PDFLib.rgb(0.1, 0.1, 0.12) });
                  let ny = dims[1] - 80;
                  F.wrapText(F.wa(txt), reg, 12, dims[0] - 92).forEach((ln) => {
                    if (ny < 40) return;
                    np.drawText(ln, { x: 46, y: ny, size: 12, font: reg, color: PDFLib.rgb(0.25, 0.25, 0.3) });
                    ny -= 17;
                  });
                }
              }
            }
            await F.tick();
          }
          if (doc.getPageCount() === 0) doc.addPage(dims.slice());
          F.stamp(doc);
          outs.push({ name: F.baseName(f.name) + '.pdf', data: await doc.save() });
        }
        if (outs.length === 1) F.saveBytes(outs[0].data, outs[0].name);
        else await F.saveZip(outs, 'ppt_to_pdf.zip');
        F.result(body, {
          title: 'PDFs ready', msg: outs.length + ' presentation(s) converted.',
          stats: [{ k: 'Files', v: String(outs.length) }],
          actions: [{ label: 'Convert more', icon: 'refresh', primary: true, on: () => F.launch('ppt2pdf') }]
        });
        F.footBtns(foot, {});
      })
    });
  });

  function decodeXml(s) {
    return String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'").replace(/&#(\d+);/g, (m, d) => String.fromCharCode(+d)).replace(/&amp;/g, '&');
  }

  /* =========================================================
     PDF → JPG
     ========================================================= */
  F.register('pdf2jpg', function (ctx) {
    const { body, foot } = ctx;
    let file = null, nPages = 0, buf = null;
    const fmt = F.select([{ v: 'image/jpeg', t: 'JPG' }, { v: 'image/png', t: 'PNG' }, { v: 'image/webp', t: 'WebP' }], 'image/jpeg');
    const dpi = F.select([{ v: '1', t: '72 DPI — screen' }, { v: '1.5', t: '110 DPI' },
    { v: '2', t: '150 DPI — good' }, { v: '3', t: '220 DPI — print' }, { v: '4.2', t: '300 DPI — max' }], '2');
    const q = F.input({ type: 'range', min: '30', max: '100', value: '88' });
    const qLabel = el('span', { class: 'tb-label', text: '88%' });
    q.addEventListener('input', () => (qLabel.textContent = q.value + '%'));
    const rangeIn = F.input({ placeholder: 'all  (or 1-5, 8)' });
    const zipOn = F.checkbox('Download as a single ZIP', true);

    const dz = F.dropzone({
      multiple: false, label: 'Choose a PDF',
      onFiles: async (fs) => {
        if (!fs.length) { F.setGo(false); return; }
        file = fs[0];
        buf = await F.readBuf(file);
        const pdf = await F.loadPdfJs(buf);
        nPages = pdf.numPages;
        F.setGo(true);
        F.toast(nPages + ' pages detected.', 'info');
      }
    });
    body.appendChild(dz.node);
    body.appendChild(F.rows([F.field('Format', fmt), F.field('Resolution', dpi), F.field('Pages', rangeIn)]));
    body.appendChild(F.field('Quality', el('div', { style: { display: 'flex', gap: '12px', alignItems: 'center' } }, [q, qLabel])));
    body.appendChild(zipOn);

    F.footBtns(foot, {
      action: 'Convert to images', actionIcon: 'image', disabled: true,
      onAction: () => F.run('Rendering…', async () => {
        const pdf = await F.loadPdfJs(buf);
        const idx = F.parseRange(rangeIn.value || 'all', pdf.numPages);
        const ext = fmt.value === 'image/png' ? 'png' : fmt.value === 'image/webp' ? 'webp' : 'jpg';
        const outs = [];
        const base = F.baseName(file.name);
        for (let k = 0; k < idx.length; k++) {
          const p = idx[k] + 1;
          F.progress((k / idx.length) * 100, 'Page ' + p + ' / ' + idx.length);
          const canvas = await F.renderPage(pdf, p, { scale: +dpi.value });
          const blob = await F.canvasBlob(canvas, fmt.value, (+q.value) / 100);
          outs.push({ name: base + '_page_' + String(p).padStart(3, '0') + '.' + ext, data: await blob.arrayBuffer() });
          canvas.width = canvas.height = 0;
          await F.tick();
        }
        if (zipOn.input.checked && outs.length > 1) await F.saveZip(outs, base + '_images.zip');
        else outs.forEach((o, i) => setTimeout(() => F.saveBlob(new Blob([o.data], { type: fmt.value }), o.name), i * 250));
        const total = outs.reduce((a, o) => a + o.data.byteLength, 0);
        F.result(body, {
          title: 'Images ready', msg: outs.length + ' image(s) exported.',
          stats: [{ k: 'Images', v: String(outs.length) }, { k: 'Total size', v: F.fmtSize(total) }],
          actions: [{ label: 'Download ZIP again', icon: 'folder_zip', primary: true, on: () => F.saveZip(outs, base + '_images.zip') },
          { label: 'Convert another', icon: 'refresh', on: () => F.launch('pdf2jpg') }]
        });
        F.footBtns(foot, {});
      })
    });
  });

  /* =========================================================
     JPG → PDF
     ========================================================= */
  F.register('jpg2pdf', function (ctx) {
    const { body, foot } = ctx;
    let files = [];
    const size = F.select(['Original', 'A4', 'Letter', 'A3', 'A5', 'Legal'], 'A4');
    const orient = F.select([{ v: 'auto', t: 'Auto per image' }, { v: 'p', t: 'Portrait' }, { v: 'l', t: 'Landscape' }], 'auto');
    const margin = F.input({ type: 'number', value: '20', min: '0' });
    const fit = F.select([{ v: 'contain', t: 'Fit inside page' }, { v: 'cover', t: 'Fill page (crop)' }, { v: 'stretch', t: 'Stretch to page' }], 'contain');
    const oneEach = F.checkbox('One image per page', true);
    const compressOn = F.checkbox('Re-compress images as JPEG (smaller PDF)', true);

    const dz = F.dropzone({
      accept: 'image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp', multiple: true,
      label: 'Choose images or drop them here',
      sub: 'JPG, PNG, WebP, GIF, BMP — drag rows to reorder.',
      onFiles: (f) => { files = f; F.setGo(f.length > 0); }
    });
    body.appendChild(dz.node);
    body.appendChild(F.section('Layout'));
    body.appendChild(F.rows([F.field('Page size', size), F.field('Orientation', orient),
    F.field('Margin (pt)', margin), F.field('Image fit', fit)]));
    body.appendChild(oneEach);
    body.appendChild(compressOn);

    F.footBtns(foot, {
      action: 'Create PDF', actionIcon: 'picture_as_pdf', disabled: true,
      onAction: () => F.run('Building PDF…', async () => {
        const doc = await F.newPdf();
        const M = Math.max(0, +margin.value || 0);
        for (let i = 0; i < files.length; i++) {
          F.progress((i / files.length) * 100, files[i].name);
          const f = files[i];
          const url = URL.createObjectURL(f);
          let img, iw, ih, embedded;
          try {
            const bitmap = await F.loadImage(url);
            iw = bitmap.naturalWidth; ih = bitmap.naturalHeight;
            if (compressOn.input.checked || !/jpe?g|png/i.test(f.type)) {
              const c = el('canvas');
              c.width = iw; c.height = ih;
              const cx = c.getContext('2d');
              cx.fillStyle = '#fff'; cx.fillRect(0, 0, iw, ih);
              cx.drawImage(bitmap, 0, 0);
              embedded = await doc.embedJpg(await F.canvasBytes(c, 'image/jpeg', 0.88));
              c.width = c.height = 0;
            } else {
              const bytes = new Uint8Array(await f.arrayBuffer());
              embedded = /png/i.test(f.type) ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
            }
          } finally { URL.revokeObjectURL(url); }
          img = embedded;

          let pw, ph;
          if (size.value === 'Original') { pw = iw + M * 2; ph = ih + M * 2; }
          else {
            const ps = F.PAGE_SIZES[size.value];
            const land = orient.value === 'l' || (orient.value === 'auto' && iw > ih);
            pw = land ? ps[1] : ps[0];
            ph = land ? ps[0] : ps[1];
          }
          const page = doc.addPage([pw, ph]);
          const aw = pw - M * 2, ah = ph - M * 2;
          let w, h, x, y;
          if (fit.value === 'stretch') { w = aw; h = ah; x = M; y = M; }
          else {
            const s = fit.value === 'cover' ? Math.max(aw / iw, ah / ih) : Math.min(aw / iw, ah / ih);
            w = iw * s; h = ih * s;
            x = M + (aw - w) / 2; y = M + (ah - h) / 2;
          }
          page.drawImage(img, { x, y, width: w, height: h });
          await F.tick();
        }
        const data = await F.savePdfDoc(doc, 'images.pdf');
        F.result(body, {
          title: 'PDF created', msg: files.length + ' image(s) combined.',
          stats: [{ k: 'Pages', v: String(doc.getPageCount()) }, { k: 'Size', v: F.fmtSize(data.length) }],
          actions: [{ label: 'Download again', icon: 'download', primary: true, on: () => F.saveBytes(data, 'images.pdf') },
          { label: 'Start over', icon: 'refresh', on: () => F.launch('jpg2pdf') }]
        });
        F.footBtns(foot, {});
      })
    });
  });

  /* =========================================================
     PDF → PDF/A
     ========================================================= */
  F.register('pdfa', function (ctx) {
    const { body, foot } = ctx;
    let files = [];
    const level = F.select([{ v: '2b', t: 'PDF/A-2b — recommended' }, { v: '1b', t: 'PDF/A-1b — widest support' },
    { v: '3b', t: 'PDF/A-3b — allows attachments' }], '2b');
    const flattenOn = F.checkbox('Flatten pages to images (guarantees fixed appearance)', false);
    const title = F.input({ placeholder: 'Document title (required by PDF/A)' });
    const author = F.input({ placeholder: 'Author' });

    const dz = F.dropzone({ multiple: true, label: 'Choose PDFs to archive', onFiles: (f) => { files = f; F.setGo(f.length > 0); } });
    body.appendChild(F.note('Adds the XMP identification, output intent and document metadata that archiving systems look for. For guaranteed conformance, tick the flatten option.'));
    body.appendChild(dz.node);
    body.appendChild(F.rows([F.field('Conformance level', level), F.field('Title', title), F.field('Author', author)]));
    body.appendChild(flattenOn);

    F.footBtns(foot, {
      action: 'Convert to PDF/A', actionIcon: 'inventory_2', disabled: true,
      onAction: () => F.run('Converting…', async () => {
        const { PDFLib } = F.needs(['PDFLib']);
        const outs = [];
        for (const f of files) {
          const buf = await F.readBuf(f);
          let doc;
          if (flattenOn.input.checked) {
            const pdf = await F.loadPdfJs(buf);
            doc = await F.newPdf();
            for (let i = 1; i <= pdf.numPages; i++) {
              F.progress((i / pdf.numPages) * 100, 'Page ' + i);
              const page = await pdf.getPage(i);
              const vp = page.getViewport({ scale: 1 });
              const canvas = await F.renderPage(pdf, i, { scale: 2 });
              const img = await doc.embedJpg(await F.canvasBytes(canvas, 'image/jpeg', 0.9));
              const p = doc.addPage([vp.width, vp.height]);
              p.drawImage(img, { x: 0, y: 0, width: vp.width, height: vp.height });
              canvas.width = canvas.height = 0;
              await F.tick();
            }
          } else {
            doc = await F.loadPdfLib(buf);
          }
          const t = title.value || F.baseName(f.name);
          const a = author.value || 'The PDF Factory';
          doc.setTitle(t);
          doc.setAuthor(a);
          doc.setSubject('PDF/A-' + level.value.toUpperCase() + ' archival document');
          doc.setKeywords(['PDF/A', 'archive']);
          doc.setCreationDate(new Date());
          F.stamp(doc);
          addPdfAMarkers(doc, level.value, t, a);
          outs.push({ name: F.baseName(f.name) + '_PDFA.pdf', data: await doc.save({ useObjectStreams: false }) });
        }
        if (outs.length === 1) F.saveBytes(outs[0].data, outs[0].name);
        else await F.saveZip(outs, 'pdfa_files.zip');
        F.result(body, {
          title: 'Archive copies ready', msg: 'PDF/A-' + level.value.toUpperCase() + ' metadata applied.',
          stats: [{ k: 'Files', v: String(outs.length) }],
          actions: [{ label: 'Convert more', icon: 'refresh', primary: true, on: () => F.launch('pdfa') }]
        });
        F.footBtns(foot, {});
      })
    });
  });

  function addPdfAMarkers(doc, level, title, author) {
    try {
      const { PDFLib } = F.lib();
      const part = level[0];
      const conf = level[1].toUpperCase();
      const now = new Date().toISOString();
      const xmp = '<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>\n' +
        '<x:xmpmeta xmlns:x="adobe:ns:meta/">\n' +
        ' <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n' +
        '  <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">\n' +
        '   <pdfaid:part>' + part + '</pdfaid:part>\n' +
        '   <pdfaid:conformance>' + conf + '</pdfaid:conformance>\n' +
        '  </rdf:Description>\n' +
        '  <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">\n' +
        '   <dc:title><rdf:Alt><rdf:li xml:lang="x-default">' + F.escapeHtml(title) + '</rdf:li></rdf:Alt></dc:title>\n' +
        '   <dc:creator><rdf:Seq><rdf:li>' + F.escapeHtml(author) + '</rdf:li></rdf:Seq></dc:creator>\n' +
        '  </rdf:Description>\n' +
        '  <rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/">\n' +
        '   <xmp:CreatorTool>The PDF Factory by Smit Parekh</xmp:CreatorTool>\n' +
        '   <xmp:CreateDate>' + now + '</xmp:CreateDate>\n' +
        '   <xmp:ModifyDate>' + now + '</xmp:ModifyDate>\n' +
        '  </rdf:Description>\n' +
        ' </rdf:RDF>\n</x:xmpmeta>\n<?xpacket end="w"?>';

      const ctxo = doc.context;
      const stream = ctxo.flateStream
        ? ctxo.stream(xmp, { Type: 'Metadata', Subtype: 'XML' })
        : ctxo.stream(xmp, { Type: 'Metadata', Subtype: 'XML' });
      const ref = ctxo.register(stream);
      doc.catalog.set(PDFLib.PDFName.of('Metadata'), ref);

      // OutputIntent (sRGB, no ICC stream — best effort marker)
      const oiDict = new Map();
      oiDict.set(PDFLib.PDFName.of('Type'), PDFLib.PDFName.of('OutputIntent'));
      oiDict.set(PDFLib.PDFName.of('S'), PDFLib.PDFName.of('GTS_PDFA1'));
      oiDict.set(PDFLib.PDFName.of('OutputConditionIdentifier'), PDFLib.PDFString.of('sRGB IEC61966-2.1'));
      oiDict.set(PDFLib.PDFName.of('RegistryName'), PDFLib.PDFString.of('http://www.color.org'));
      oiDict.set(PDFLib.PDFName.of('Info'), PDFLib.PDFString.of('sRGB IEC61966-2.1'));
      const oiRef = ctxo.register(PDFLib.PDFDict.fromMapWithContext(oiDict, ctxo));
      const arr = PDFLib.PDFArray.withContext(ctxo);
      arr.push(oiRef);
      doc.catalog.set(PDFLib.PDFName.of('OutputIntents'), arr);

      // MarkInfo
      const mi2 = new Map();
      mi2.set(PDFLib.PDFName.of('Marked'), PDFLib.PDFBool.True);
      doc.catalog.set(PDFLib.PDFName.of('MarkInfo'), PDFLib.PDFDict.fromMapWithContext(mi2, ctxo));
    } catch (e) { console.warn('pdfa markers', e); }
  }

  /* =========================================================
     HTML / TEXT → PDF
     ========================================================= */
  F.register('html2pdf', function (ctx) {
    const { body, foot } = ctx;
    let files = [];
    const ta = el('textarea', {
      placeholder: '<h1>Hello</h1>\n<p>Type or paste <b>HTML</b> or plain text here…</p>',
      style: { minHeight: '180px' }
    });
    const size = F.select(['A4', 'Letter', 'Legal', 'A3', 'A5'], 'A4');
    const fs = F.input({ type: 'number', value: '11', min: '7', max: '22' });
    const margin = F.input({ type: 'number', value: '56', min: '0' });
    const outName = F.input({ value: 'document.pdf' });

    const dz = F.dropzone({
      accept: '.html,.htm,.txt,.md', multiple: true, label: 'Or choose .html / .txt files',
      onFiles: (f) => { files = f; sync(); }
    });
    function sync() { F.setGo(files.length > 0 || ta.value.trim().length > 0); }
    ta.addEventListener('input', sync);

    body.appendChild(F.field('Paste HTML or text', ta));
    body.appendChild(dz.node);
    body.appendChild(F.rows([F.field('Page size', size), F.field('Font size', fs),
    F.field('Margin (pt)', margin), F.field('File name', outName)]));

    F.footBtns(foot, {
      action: 'Create PDF', actionIcon: 'picture_as_pdf', disabled: true,
      onAction: () => F.run('Rendering…', async () => {
        const opts = { size: size.value, fontSize: +fs.value || 11, margin: +margin.value };
        const outs = [];
        if (ta.value.trim()) {
          const raw = ta.value;
          const html = /<[a-z][\s\S]*>/i.test(raw) ? raw : '<div>' + F.escapeHtml(raw).replace(/\n/g, '<br>') + '</div>';
          const doc = await htmlToPdfDoc(html, opts);
          F.stamp(doc);
          const n = F.sanitize(outName.value || 'document.pdf');
          outs.push({ name: /\.pdf$/i.test(n) ? n : n + '.pdf', data: await doc.save() });
        }
        for (const f of files) {
          const txt = await F.readText(f);
          const isHtml = /html?$/i.test(F.ext(f.name));
          const html = isHtml ? txt : '<div>' + F.escapeHtml(txt).replace(/\n/g, '<br>') + '</div>';
          const doc = await htmlToPdfDoc(html, opts);
          F.stamp(doc);
          outs.push({ name: F.baseName(f.name) + '.pdf', data: await doc.save() });
        }
        if (outs.length === 1) F.saveBytes(outs[0].data, outs[0].name);
        else await F.saveZip(outs, 'html_to_pdf.zip');
        F.result(body, {
          title: 'PDF created', msg: outs.length + ' file(s) rendered.',
          stats: [{ k: 'Files', v: String(outs.length) }],
          actions: [{ label: 'Create another', icon: 'refresh', primary: true, on: () => F.launch('html2pdf') }]
        });
        F.footBtns(foot, {});
      })
    });
  });

  /* =========================================================
     PDF → TEXT
     ========================================================= */
  F.register('pdf2text', function (ctx) {
    const { body, foot } = ctx;
    let files = [];
    const marks = F.checkbox('Insert "--- Page N ---" markers', true);
    const preview = el('div');

    const dz = F.dropzone({ multiple: true, label: 'Choose PDFs', onFiles: (f) => { files = f; F.setGo(f.length > 0); } });
    body.appendChild(dz.node);
    body.appendChild(marks);
    body.appendChild(preview);

    F.footBtns(foot, {
      action: 'Extract text', actionIcon: 'text_snippet', disabled: true,
      onAction: () => F.run('Extracting…', async () => {
        const outs = [];
        let firstText = '';
        for (const f of files) {
          const pdf = await F.loadPdfJs(await F.readBuf(f));
          let txt = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            F.progress((i / pdf.numPages) * 100, 'Page ' + i);
            if (marks.input.checked) txt += (i > 1 ? '\n\n' : '') + '--- Page ' + i + ' ---\n';
            txt += await F.pageText(pdf, i) + '\n';
            if (i % 5 === 0) await F.tick();
          }
          if (!firstText) firstText = txt;
          outs.push({ name: F.baseName(f.name) + '.txt', data: txt });
        }
        if (outs.length === 1) F.saveBlob(new Blob([outs[0].data], { type: 'text/plain;charset=utf-8' }), outs[0].name);
        else await F.saveZip(outs, 'extracted_text.zip');
        const chars = outs.reduce((a, o) => a + o.data.length, 0);
        F.result(body, {
          title: 'Text extracted', msg: chars.toLocaleString() + ' characters.',
          stats: [{ k: 'Files', v: String(outs.length) }, { k: 'Characters', v: chars.toLocaleString() },
          { k: 'Words', v: String(firstText.split(/\s+/).filter(Boolean).length) }],
          actions: [{ label: 'Extract more', icon: 'refresh', primary: true, on: () => F.launch('pdf2text') }]
        });
        F.footBtns(foot, {});
      })
    });
  });
})();
