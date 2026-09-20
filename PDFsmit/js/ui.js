/* ============================================================
   The PDF Factory — UI kit (modal, dropzones, thumbs, fields)
   ============================================================ */
(function () {
  'use strict';
  const F = (window.PF = window.PF || {});
  const el = F.el, mi = F.mi;

  /* ---------------- modal ---------------- */
  const root = () => F.$('#modalRoot');

  F.closeModal = function () {
    const r = root();
    if (!r) return;
    r.hidden = true;
    F.$('#modalBody').innerHTML = '';
    F.$('#modalFoot').innerHTML = '';
    document.body.style.overflow = '';
    if (F.activeCleanup) { try { F.activeCleanup(); } catch (e) { } F.activeCleanup = null; }
    if (location.hash.startsWith('#tool-')) history.replaceState(null, '', location.pathname + location.search);
  };

  F.openModal = function (tool) {
    const r = root();
    F.$('#modalTitle').textContent = tool.name;
    F.$('#modalDesc').textContent = tool.desc;
    const ico = F.$('#modalIco');
    ico.innerHTML = '';
    ico.appendChild(mi(tool.icon));
    F.$('.modal', r).style.setProperty('--tc', tool.color);
    F.$('#modalBody').innerHTML = '';
    F.$('#modalFoot').innerHTML = '';
    r.hidden = false;
    document.body.style.overflow = 'hidden';
    return { body: F.$('#modalBody'), foot: F.$('#modalFoot') };
  };

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) F.closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !root().hidden) F.closeModal();
  });

  /* ---------------- footer buttons ---------------- */
  F.footBtns = function (foot, opts) {
    foot.innerHTML = '';
    if (opts.info) foot.appendChild(el('span', { class: 'tb-label', text: opts.info }));
    foot.appendChild(el('div', { class: 'spacer' }));
    (opts.extra || []).forEach((b) => foot.appendChild(b));
    if (opts.cancel !== false) {
      foot.appendChild(el('button', { class: 'btn ghost', 'data-close': true }, [mi('close'), 'Close']));
    }
    if (opts.action) {
      const b = el('button', { class: 'btn primary', id: 'goBtn' }, [mi(opts.actionIcon || 'bolt'), opts.action]);
      b.addEventListener('click', opts.onAction);
      if (opts.disabled) b.disabled = true;
      foot.appendChild(b);
      return b;
    }
    return null;
  };
  F.setGo = function (on) {
    const b = F.$('#goBtn');
    if (b) b.disabled = !on;
  };

  /* ---------------- dropzone ---------------- */
  /**
   * opts: { accept, multiple, label, sub, onFiles(filesArray) }
   * returns { node, input, list, files }
   */
  F.dropzone = function (opts) {
    opts = opts || {};
    const accept = opts.accept || '.pdf,application/pdf';
    const multiple = opts.multiple !== false;
    const input = el('input', {
      type: 'file', accept: accept, multiple: multiple ? true : null,
      style: { display: 'none' }
    });
    const zone = el('div', { class: 'drop', tabindex: '0' }, [
      mi(opts.icon || 'cloud_upload'),
      el('h4', { text: opts.label || (multiple ? 'Choose files or drop them here' : 'Choose a file or drop it here') }),
      el('p', { text: opts.sub || 'Nothing is uploaded — everything stays on this device.' })
    ]);
    const list = el('div', { class: 'files' });
    const wrap = el('div', {}, [input, zone, list]);

    const state = { files: [] };

    function emit() {
      renderList();
      if (opts.onFiles) opts.onFiles(state.files);
    }
    function accepts(f) {
      if (accept === '*' || accept === '*/*') return true;
      const exts = accept.split(',').map((s) => s.trim().toLowerCase());
      const name = f.name.toLowerCase();
      return exts.some((a) => {
        if (a.startsWith('.')) return name.endsWith(a);
        if (a.endsWith('/*')) return (f.type || '').startsWith(a.slice(0, -1));
        return (f.type || '').toLowerCase() === a;
      });
    }
    function add(fileList) {
      const arr = Array.prototype.slice.call(fileList);
      const good = arr.filter(accepts);
      const bad = arr.length - good.length;
      if (bad) F.toast(bad + ' file(s) skipped — wrong type.', 'warn');
      if (!good.length) return;
      state.files = multiple ? state.files.concat(good) : [good[0]];
      emit();
    }
    function renderList() {
      list.innerHTML = '';
      state.files.forEach((f, i) => {
        const row = el('div', { class: 'file-row', draggable: multiple ? 'true' : null }, [
          multiple ? mi('drag_indicator', 'grab') : null,
          mi(/pdf$/i.test(f.name) ? 'picture_as_pdf' : /(png|jpe?g|webp|gif|bmp)$/i.test(f.name) ? 'image' : 'insert_drive_file', 'fi'),
          el('span', { class: 'nm', text: f.name, title: f.name }),
          el('span', { class: 'sz', text: F.fmtSize(f.size) }),
          el('button', {
            class: 'icon-btn', title: 'Remove', style: { width: '30px', height: '30px' },
            onclick: (e) => { e.stopPropagation(); state.files.splice(i, 1); emit(); }
          }, [mi('close')])
        ]);
        row._file = f;
        list.appendChild(row);
      });
      if (state.files.length > 1 && multiple) {
        list.appendChild(el('div', { class: 'tb-label', style: { padding: '2px 4px' }, text: 'Tip: drag rows to change the order.' }));
      }
    }

    if (multiple) {
      F.makeSortable(list, () => {
        const rows = F.$$('.file-row', list);
        const next = rows.map((r) => r._file).filter(Boolean);
        if (next.length === state.files.length) { state.files = next; if (opts.onFiles) opts.onFiles(state.files); }
        renderList();
      });
    }

    zone.addEventListener('click', () => input.click());
    zone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
    input.addEventListener('change', () => { add(input.files); input.value = ''; });
    ['dragenter', 'dragover'].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove('over'); }));
    zone.addEventListener('drop', (e) => { if (e.dataTransfer && e.dataTransfer.files) add(e.dataTransfer.files); });

    return { node: wrap, input, list, state, add, clear() { state.files = []; emit(); } };
  };

  /* ---------------- form field builders ---------------- */
  F.field = function (label, control, hint) {
    return el('div', { class: 'field' }, [
      label ? el('label', { text: label }) : null,
      control,
      hint ? el('div', { class: 'hint', text: hint }) : null
    ]);
  };
  F.input = function (attrs) { return el('input', Object.assign({ type: 'text' }, attrs)); };
  F.select = function (options, value, attrs) {
    const s = el('select', attrs || {});
    options.forEach((o) => {
      const v = typeof o === 'string' ? o : o.v;
      const t = typeof o === 'string' ? o : o.t;
      const op = el('option', { value: v, text: t });
      if (String(v) === String(value)) op.selected = true;
      s.appendChild(op);
    });
    return s;
  };
  F.checkbox = function (label, checked, attrs) {
    const i = el('input', Object.assign({ type: 'checkbox' }, attrs || {}));
    i.checked = !!checked;
    const l = el('label', { class: 'check' }, [i, el('span', { text: label })]);
    l.input = i;
    return l;
  };
  F.rows = function (children) { return el('div', { class: 'row' }, children.filter(Boolean)); };
  F.note = function (text, kind) {
    return el('div', { class: 'note ' + (kind || '') }, [mi(kind === 'warn' ? 'warning' : 'info'), el('div', { html: text })]);
  };
  F.section = function (title) {
    return el('h3', { style: { fontSize: '14px', margin: '22px 0 12px', fontWeight: '700' }, text: title });
  };

  /* ---------------- page thumbnail grid ---------------- */
  /**
   * Renders thumbnails for a pdf.js doc.
   * opts: { select:true|false, multi:true, onChange(selectedSet), max, rotations }
   * returns controller
   */
  F.thumbGrid = async function (pdf, opts) {
    opts = opts || {};
    const grid = el('div', { class: 'thumbs' });
    const n = pdf.numPages;
    const sel = new Set();
    const rot = {};
    const order = [];
    const cells = [];

    for (let i = 1; i <= n; i++) order.push(i);

    function fire() { if (opts.onChange) opts.onChange(Array.from(sel).sort((a, b) => a - b), order.slice(), rot); }

    for (let i = 1; i <= n; i++) {
      const cell = el('div', { class: 'thumb', 'data-p': i, draggable: opts.sortable ? 'true' : null }, [
        el('div', { class: 'pn', text: String(i) })
      ]);
      cell._page = i;
      if (opts.select !== false) {
        cell.addEventListener('click', (e) => {
          if (e.target.closest('.mini')) return;
          if (opts.multi === false) { sel.clear(); F.$$('.thumb', grid).forEach((c) => c.classList.remove('sel')); }
          if (sel.has(i)) { sel.delete(i); cell.classList.remove('sel'); }
          else { sel.add(i); cell.classList.add('sel'); }
          fire();
        });
      }
      if (opts.rotate) {
        const mini = el('div', { class: 'mini' }, [
          el('button', {
            title: 'Rotate left', onclick: (e) => { e.stopPropagation(); rot[i] = ((rot[i] || 0) - 90 + 360) % 360; applyRot(cell, rot[i]); fire(); }
          }, [mi('rotate_left')]),
          el('button', {
            title: 'Rotate right', onclick: (e) => { e.stopPropagation(); rot[i] = ((rot[i] || 0) + 90) % 360; applyRot(cell, rot[i]); fire(); }
          }, [mi('rotate_right')])
        ]);
        cell.appendChild(mini);
      }
      grid.appendChild(cell);
      cells.push(cell);
    }

    function applyRot(cell, deg) {
      const c = cell.querySelector('canvas');
      if (c) c.style.transform = 'rotate(' + deg + 'deg) scale(' + (deg % 180 === 90 ? 0.72 : 1) + ')';
    }

    // render lazily, in the background
    (async function renderAll() {
      for (let i = 1; i <= n; i++) {
        try {
          const canvas = await F.renderPage(pdf, i, { scale: 0.42, maxW: 220 });
          const cell = cells[i - 1];
          if (!cell.isConnected && !grid.isConnected) return;
          cell.insertBefore(canvas, cell.firstChild);
        } catch (e) { console.warn('thumb', i, e); }
        if (i % 4 === 0) await F.tick();
      }
    })();

    if (opts.sortable) {
      F.makeSortable(grid, () => {
        const next = F.$$('.thumb', grid).map((c) => c._page);
        order.length = 0;
        next.forEach((p) => order.push(p));
        renumber();
        fire();
      });
    }
    function renumber() {
      F.$$('.thumb', grid).forEach((c, idx) => { c.querySelector('.pn').textContent = (idx + 1) + ' (p' + c._page + ')'; });
    }

    return {
      node: grid,
      get selected() { return Array.from(sel).sort((a, b) => a - b); },
      get order() { return order.slice(); },
      get rotations() { return Object.assign({}, rot); },
      selectAll() { sel.clear(); for (let i = 1; i <= n; i++) sel.add(i); F.$$('.thumb', grid).forEach((c) => c.classList.add('sel')); fire(); },
      selectNone() { sel.clear(); F.$$('.thumb', grid).forEach((c) => c.classList.remove('sel')); fire(); },
      selectOdd() { sel.clear(); F.$$('.thumb', grid).forEach((c) => { const on = c._page % 2 === 1; c.classList.toggle('sel', on); if (on) sel.add(c._page); }); fire(); },
      selectEven() { sel.clear(); F.$$('.thumb', grid).forEach((c) => { const on = c._page % 2 === 0; c.classList.toggle('sel', on); if (on) sel.add(c._page); }); fire(); },
      invert() { F.$$('.thumb', grid).forEach((c) => { const on = !sel.has(c._page); c.classList.toggle('sel', on); if (on) sel.add(c._page); else sel.delete(c._page); }); fire(); },
      rotateAll(d) { F.$$('.thumb', grid).forEach((c) => { rot[c._page] = (((rot[c._page] || 0) + d) % 360 + 360) % 360; applyRot(c, rot[c._page]); }); fire(); },
      rotateSelected(d) {
        const list = sel.size ? Array.from(sel) : order.slice();
        list.forEach((p) => { rot[p] = (((rot[p] || 0) + d) % 360 + 360) % 360; const c = cells[p - 1]; applyRot(c, rot[p]); });
        fire();
      },
      removeSelected() {
        if (!sel.size) return;
        F.$$('.thumb', grid).forEach((c) => { if (sel.has(c._page)) c.remove(); });
        const keep = F.$$('.thumb', grid).map((c) => c._page);
        order.length = 0; keep.forEach((p) => order.push(p));
        sel.clear(); renumber(); fire();
      },
      reset() {
        grid.innerHTML = '';
        cells.forEach((c) => grid.appendChild(c));
        order.length = 0; for (let i = 1; i <= n; i++) order.push(i);
        sel.clear();
        F.$$('.thumb', grid).forEach((c) => { c.classList.remove('sel'); c.querySelector('.pn').textContent = String(c._page); });
        Object.keys(rot).forEach((k) => delete rot[k]);
        cells.forEach((c) => applyRot(c, 0));
        fire();
      },
      sortAsc() {
        const arr = F.$$('.thumb', grid).sort((a, b) => a._page - b._page);
        arr.forEach((c) => grid.appendChild(c));
        order.length = 0; arr.forEach((c) => order.push(c._page));
        renumber(); fire();
      },
      sortDesc() {
        const arr = F.$$('.thumb', grid).sort((a, b) => b._page - a._page);
        arr.forEach((c) => grid.appendChild(c));
        order.length = 0; arr.forEach((c) => order.push(c._page));
        renumber(); fire();
      }
    };
  };

  /* ---------------- toolbar ---------------- */
  F.toolbar = function (items) {
    const tb = el('div', { class: 'tb' });
    items.forEach((it) => {
      if (it === '|') { tb.appendChild(el('div', { class: 'sep' })); return; }
      if (typeof it === 'string') { tb.appendChild(el('span', { class: 'tb-label', text: it })); return; }
      if (it.nodeType) { tb.appendChild(it); return; }
      tb.appendChild(el('button', { class: 'btn sm', onclick: it.on, title: it.title || it.label },
        [it.icon ? mi(it.icon) : null, it.label]));
    });
    return tb;
  };

  /* ---------------- result panel ---------------- */
  F.result = function (body, opts) {
    body.innerHTML = '';
    const stats = el('div', { class: 'stat-grid' });
    (opts.stats || []).forEach((s) => stats.appendChild(el('div', { class: 'stat' }, [
      el('b', { text: s.v }), el('span', { text: s.k })
    ])));
    const btns = el('div', { style: { display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' } });
    (opts.actions || []).forEach((a) => btns.appendChild(
      el('button', { class: 'btn ' + (a.primary ? 'primary' : ''), onclick: a.on }, [mi(a.icon || 'download'), a.label])
    ));
    body.appendChild(el('div', { class: 'result' }, [
      mi(opts.icon || 'check_circle', 'big'),
      el('h3', { text: opts.title || 'Done!' }),
      el('p', { text: opts.msg || '' }),
      (opts.stats || []).length ? stats : null,
      btns
    ]));
  };

  /* ---------------- tabs ---------------- */
  F.tabs = function (defs, onSwitch) {
    const bar = el('div', { class: 'tabs' });
    const panes = el('div');
    defs.forEach((d, i) => {
      const b = el('button', { class: i === 0 ? 'on' : '', text: d.label });
      const pane = el('div', { style: { display: i === 0 ? 'block' : 'none' } }, [d.node]);
      b.addEventListener('click', () => {
        F.$$('button', bar).forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
        F.$$(':scope > div', panes).forEach((p) => (p.style.display = 'none'));
        pane.style.display = 'block';
        if (onSwitch) onSwitch(d.id, i);
      });
      bar.appendChild(b);
      panes.appendChild(pane);
    });
    return el('div', {}, [bar, panes]);
  };
})();
