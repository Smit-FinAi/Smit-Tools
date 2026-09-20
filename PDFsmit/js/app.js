/* ============================================================
   The PDF Factory — app bootstrap
   ============================================================ */
(function () {
  'use strict';
  const F = window.PF;
  const el = F.el, mi = F.mi;

  /* ---------------- theme ---------------- */
  const THEME_KEY = 'pf-theme';
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    const btn = F.$('#themeBtn');
    if (btn) btn.innerHTML = '';
    if (btn) btn.appendChild(mi(t === 'dark' ? 'light_mode' : 'dark_mode'));
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#0c1016' : '#e2231a');
  }
  const saved = localStorage.getItem(THEME_KEY);
  applyTheme(saved || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  F.$('#themeBtn').addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });

  /* ---------------- build grid ---------------- */
  const sectionsBox = F.$('#toolSections');

  function toolCard(t) {
    const card = el('button', {
      class: 'tool', style: { '--tc': t.color }, 'data-id': t.id,
      'data-search': (t.name + ' ' + t.desc + ' ' + t.id).toLowerCase(),
      onclick: () => F.launch(t.id)
    }, [
      t.badge ? el('span', { class: 'badge', text: t.badge }) : null,
      el('span', { class: 't-ico' }, [mi(t.icon)]),
      el('h3', { text: t.name }),
      el('p', { text: t.desc })
    ]);
    return card;
  }

  F.CATS.forEach((c) => {
    const tools = F.TOOLS.filter((t) => t.cat === c.id);
    const grid = el('div', { class: 'grid' });
    tools.forEach((t) => grid.appendChild(toolCard(t)));
    sectionsBox.appendChild(el('section', { class: 'cat', id: 'cat-' + c.id, 'data-cat': c.id }, [
      el('div', { class: 'cat-head' }, [
        el('span', { class: 'dot', style: { background: c.color } }),
        el('h2', { text: c.name }),
        el('span', { class: 'count', text: tools.length + ' tools' }),
        el('div', { class: 'rule' })
      ]),
      grid
    ]));
  });

  /* ---------------- chips ---------------- */
  const chipBox = F.$('#catChips');
  const allChip = el('button', { class: 'chip on', 'data-cat': 'all' }, [mi('apps'), 'All ' + F.TOOLS.length]);
  chipBox.appendChild(allChip);
  F.CATS.forEach((c) => {
    chipBox.appendChild(el('button', { class: 'chip', 'data-cat': c.id }, [
      el('span', { class: 'material-icons-round', style: { color: c.color }, text: c.icon }), c.name
    ]));
  });
  chipBox.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    F.$$('.chip', chipBox).forEach((c) => c.classList.remove('on'));
    chip.classList.add('on');
    const cat = chip.getAttribute('data-cat');
    F.$$('.cat').forEach((s) => { s.style.display = (cat === 'all' || s.getAttribute('data-cat') === cat) ? '' : 'none'; });
    F.$('#search').value = '';
    F.$('#noResults').hidden = true;
    if (cat !== 'all') document.getElementById('cat-' + cat).scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ---------------- search ---------------- */
  const search = F.$('#search');
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    let hits = 0;
    F.$$('.cat').forEach((sec) => {
      let visible = 0;
      F.$$('.tool', sec).forEach((card) => {
        const on = !q || card.getAttribute('data-search').indexOf(q) > -1;
        card.style.display = on ? '' : 'none';
        if (on) visible++;
      });
      sec.style.display = visible ? '' : 'none';
      hits += visible;
    });
    F.$('#noResults').hidden = hits > 0;
    if (q) F.$$('.chip').forEach((c, i) => c.classList.toggle('on', i === 0));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== search && F.$('#modalRoot').hidden) {
      e.preventDefault(); search.focus(); search.select();
    }
  });

  /* ---------------- launch ---------------- */
  F.launch = function (id) {
    const tool = F.TOOLS.find((t) => t.id === id);
    if (!tool) { F.toast('Unknown tool: ' + id, 'err'); return; }
    const impl = F.impl[id];
    const ctx = F.openModal(tool);
    history.replaceState(null, '', '#tool-' + id);
    if (!impl) {
      ctx.body.appendChild(F.note('This tool is still being wired up.', 'warn'));
      F.footBtns(ctx.foot, {});
      return;
    }
    try { impl(Object.assign({ tool }, ctx)); }
    catch (e) {
      console.error(e);
      ctx.body.innerHTML = '';
      ctx.body.appendChild(F.note('Could not start this tool: ' + F.escapeHtml(e.message), 'warn'));
      F.footBtns(ctx.foot, {});
    }
  };

  F.$('#brandHome').addEventListener('click', (e) => {
    e.preventDefault();
    F.closeModal();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ---------------- about ---------------- */
  F.$('#aboutLink').addEventListener('click', (e) => {
    e.preventDefault();
    const ctx = F.openModal({ name: 'About & Privacy', desc: 'How The PDF Factory works', icon: 'info', color: '#2f6df6' });
    ctx.body.appendChild(el('div', {
      html:
        '<p style="line-height:1.75;font-size:14px">' +
        '<b>The PDF Factory</b> was built by <b>Smit Parekh</b> so that Indian businesses and individuals can process ' +
        'documents without ever sending them to a server — keeping you comfortably on the right side of the ' +
        '<b>Digital Personal Data Protection Act</b>.</p>' +
        '<ul style="line-height:1.9;font-size:14px">' +
        '<li>Every tool runs inside your browser using WebAssembly &amp; JavaScript.</li>' +
        '<li>No file is ever uploaded. There is no backend, no database, no analytics.</li>' +
        '<li>Install it as an app and it keeps working with no internet at all.</li>' +
        '<li>Open the DevTools Network tab and watch — you will see zero file traffic.</li>' +
        '</ul>' +
        '<p style="font-size:14px">Libraries used: pdf-lib, PDF.js, JSZip, SheetJS, docx, PptxGenJS, Mammoth and Tesseract.js — all MIT/Apache licensed.</p>' +
        '<p style="font-size:14px">More tutorials on <a style="color:#e2231a;font-weight:600" href="https://www.youtube.com/@TheParekhShow" target="_blank" rel="noopener">youtube.com/@TheParekhShow</a></p>'
    }));
    F.footBtns(ctx.foot, {});
  });

  /* ---------------- PWA ---------------- */
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    F.$('#installBtn').hidden = false;
  });
  async function doInstall(e) {
    if (e) e.preventDefault();
    if (!deferredPrompt) { F.toast('Use your browser menu → “Install app” / “Add to Home screen”.', 'info', 6000); return; }
    deferredPrompt.prompt();
    const r = await deferredPrompt.userChoice;
    if (r.outcome === 'accepted') F.toast('Installed! Launch it from your home screen.', 'ok');
    deferredPrompt = null;
    F.$('#installBtn').hidden = true;
  }
  F.$('#installBtn').addEventListener('click', doInstall);
  F.$('#installBtn2').addEventListener('click', doInstall);
  window.addEventListener('appinstalled', () => F.toast('The PDF Factory is now installed.', 'ok'));

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW failed', e));
    });
  }

  window.addEventListener('online', () => F.toast('Back online — libraries will refresh their cache.', 'ok'));

  /* ---------------- deep link ---------------- */
  F.$('#yr').textContent = new Date().getFullYear();
  if (/^#tool-/.test(location.hash)) {
    const id = location.hash.replace('#tool-', '');
    setTimeout(() => F.launch(id), 240);
  }

  /* ---------------- library sanity check ---------------- */
  setTimeout(() => {
    const L = F.lib();
    const missing = Object.keys(L).filter((k) => !L[k]);
    if (missing.length) {
      console.warn('Missing libs:', missing);
      F.toast('Some libraries did not load (' + missing.join(', ') + '). Connect once so they can be cached.', 'warn', 9000);
    }
  }, 2500);

  console.log('%cThe PDF Factory%c by Smit Parekh — ' + F.TOOLS.length + ' tools ready.',
    'font-weight:900;color:#e2231a;font-size:14px', 'color:#888');
})();
