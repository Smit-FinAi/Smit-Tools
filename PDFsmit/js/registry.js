/* ============================================================
   The PDF Factory — tool registry (categories + 40 tools)
   ============================================================ */
(function () {
  'use strict';
  const F = (window.PF = window.PF || {});

  F.CATS = [
    { id: 'organize', name: 'Organise', icon: 'auto_awesome_motion', color: '#e2231a' },
    { id: 'convert', name: 'Convert', icon: 'sync_alt', color: '#2f6df6' },
    { id: 'edit', name: 'Edit', icon: 'draw', color: '#7a3ff2' },
    { id: 'secure', name: 'Security & Extras', icon: 'shield', color: '#0f9d58' }
  ];

  /** Every tool: id, cat, name, desc, icon, color, badge?  */
  F.TOOLS = [
    /* ---------- ORGANISE ---------- */
    { id: 'merge', cat: 'organize', name: 'Merge PDF', desc: 'Combine multiple PDFs into one organised document.', icon: 'merge_type', color: '#e2231a' },
    { id: 'split', cat: 'organize', name: 'Split PDF', desc: 'Separate one PDF into pages or custom ranges.', icon: 'call_split', color: '#ff6a3d' },
    { id: 'compress', cat: 'organize', name: 'Compress PDF', desc: 'Shrink file size while keeping quality high.', icon: 'compress', color: '#00897b' },
    { id: 'remove', cat: 'organize', name: 'Remove Pages', desc: 'Delete unwanted pages from your PDF.', icon: 'delete_sweep', color: '#d81b60' },
    { id: 'extract', cat: 'organize', name: 'Extract Pages', desc: 'Pull out specific pages as new files.', icon: 'content_cut', color: '#8e24aa' },
    { id: 'organize', cat: 'organize', name: 'Organise PDF', desc: 'Rearrange, sort, rotate and add blank pages.', icon: 'dashboard_customize', color: '#3949ab' },
    { id: 'scan', cat: 'organize', name: 'Scan to PDF', desc: 'Use your camera to turn paper into a PDF.', icon: 'document_scanner', color: '#039be5', badge: 'camera' },
    { id: 'pagesize', cat: 'organize', name: 'Resize / Scale', desc: 'Fit every page to A4, Letter or a custom size.', icon: 'aspect_ratio', color: '#00acc1' },
    { id: 'nup', cat: 'organize', name: 'N‑up / Booklet', desc: 'Place 2, 4 or 9 pages on one sheet.', icon: 'grid_view', color: '#5e35b1' },

    /* ---------- CONVERT ---------- */
    { id: 'pdf2word', cat: 'convert', name: 'PDF to Word', desc: 'Turn PDFs into editable .docx documents.', icon: 'description', color: '#2b579a' },
    { id: 'pdf2excel', cat: 'convert', name: 'PDF to Excel', desc: 'Extract tables and data into .xlsx sheets.', icon: 'table_chart', color: '#1d6f42' },
    { id: 'pdf2ppt', cat: 'convert', name: 'PDF to PowerPoint', desc: 'Convert pages into .pptx slides.', icon: 'slideshow', color: '#d24726' },
    { id: 'word2pdf', cat: 'convert', name: 'Word to PDF', desc: 'Change .docx documents into PDF files.', icon: 'article', color: '#2b579a' },
    { id: 'excel2pdf', cat: 'convert', name: 'Excel to PDF', desc: 'Turn spreadsheets into readable PDFs.', icon: 'grid_on', color: '#1d6f42' },
    { id: 'ppt2pdf', cat: 'convert', name: 'PowerPoint to PDF', desc: 'Export presentation slides to PDF.', icon: 'co_present', color: '#d24726' },
    { id: 'pdf2jpg', cat: 'convert', name: 'PDF to JPG', desc: 'Convert each page into a high‑quality image.', icon: 'image', color: '#f4b400' },
    { id: 'jpg2pdf', cat: 'convert', name: 'JPG to PDF', desc: 'Combine images into a single PDF.', icon: 'photo_library', color: '#fb8c00' },
    { id: 'pdfa', cat: 'convert', name: 'PDF to PDF/A', desc: 'Convert to the long‑term archiving standard.', icon: 'inventory_2', color: '#6d4c41' },
    { id: 'html2pdf', cat: 'convert', name: 'HTML / Text to PDF', desc: 'Turn web markup or plain text into a PDF.', icon: 'code', color: '#e65100' },
    { id: 'pdf2text', cat: 'convert', name: 'PDF to Text', desc: 'Export all readable text as a .txt file.', icon: 'text_snippet', color: '#455a64' },

    /* ---------- EDIT ---------- */
    { id: 'edit', cat: 'edit', name: 'Edit PDF', desc: 'Add text, shapes, arrows, drawings and images.', icon: 'draw', color: '#7a3ff2' },
    { id: 'rotate', cat: 'edit', name: 'Rotate PDF', desc: 'Turn sideways pages the right way up.', icon: 'rotate_right', color: '#00838f' },
    { id: 'pagenum', cat: 'edit', name: 'Add Page Numbers', desc: 'Insert custom page numbers anywhere.', icon: 'format_list_numbered', color: '#3f51b5' },
    { id: 'watermark', cat: 'edit', name: 'Add Watermark', desc: 'Stamp text or an image across your pages.', icon: 'branding_watermark', color: '#c2185b' },
    { id: 'crop', cat: 'edit', name: 'Crop PDF', desc: 'Trim the visible margins of your pages.', icon: 'crop', color: '#00796b' },
    { id: 'header', cat: 'edit', name: 'Header & Footer', desc: 'Add running headers or footers with fields.', icon: 'title', color: '#5d4037' },
    { id: 'bates', cat: 'edit', name: 'Bates Numbering', desc: 'Legal‑style sequential stamps with prefix.', icon: 'pin', color: '#546e7a' },
    { id: 'meta', cat: 'edit', name: 'Edit Metadata', desc: 'Change title, author, subject and keywords.', icon: 'sell', color: '#8d6e63' },
    { id: 'background', cat: 'edit', name: 'Page Background', desc: 'Apply a solid colour behind every page.', icon: 'format_color_fill', color: '#ef6c00' },

    /* ---------- SECURE & EXTRAS ---------- */
    { id: 'protect', cat: 'secure', name: 'Protect PDF', desc: 'Lock a file with a strong password.', icon: 'lock', color: '#0f9d58' },
    { id: 'unlock', cat: 'secure', name: 'Unlock PDF', desc: 'Remove passwords from files you own.', icon: 'lock_open', color: '#43a047' },
    { id: 'sign', cat: 'secure', name: 'Sign PDF', desc: 'Draw, type or upload your signature.', icon: 'gesture', color: '#1e88e5' },
    { id: 'repair', cat: 'secure', name: 'Repair PDF', desc: 'Recover data from damaged PDF files.', icon: 'healing', color: '#f4511e' },
    { id: 'ocr', cat: 'secure', name: 'OCR PDF', desc: 'Make scanned documents searchable text.', icon: 'document_scanner', color: '#6a1b9a', badge: 'ai' },
    { id: 'redact', cat: 'secure', name: 'Redact PDF', desc: 'Permanently black out sensitive content.', icon: 'visibility_off', color: '#212121' },
    { id: 'compare', cat: 'secure', name: 'Compare PDF', desc: 'Spot differences between two versions.', icon: 'difference', color: '#0288d1' },
    { id: 'flatten', cat: 'secure', name: 'Flatten PDF', desc: 'Bake forms and annotations into the page.', icon: 'layers_clear', color: '#795548' },
    { id: 'grayscale', cat: 'secure', name: 'Grayscale PDF', desc: 'Convert pages to black & white for printing.', icon: 'gradient', color: '#616161' },
    { id: 'info', cat: 'secure', name: 'PDF Inspector', desc: 'See pages, size, fonts, metadata and more.', icon: 'analytics', color: '#00bfa5' },
    { id: 'attach', cat: 'secure', name: 'Attach Files', desc: 'Embed any file inside a PDF container.', icon: 'attach_file', color: '#7cb342' }
  ];

  /** Tool implementations register here: F.impl[id] = function(ctx){...} */
  F.impl = {};
  F.register = function (id, fn) { F.impl[id] = fn; };
})();
