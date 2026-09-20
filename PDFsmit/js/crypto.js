/* ============================================================
   The PDF Factory — standard-security PDF encryption
   Implements the PDF 1.7 standard security handler:
     • RC4 128-bit  (R3 / V2)
     • AES-128      (R4 / V4, /AESV2)
   Everything runs locally — no network, no libraries.
   ============================================================ */
(function () {
  'use strict';
  const F = (window.PF = window.PF || {});

  /* -------------------------------------------------- MD5 */
  function md5(bytes) {
    function L(x, c) { return (x << c) | (x >>> (32 - c)); }
    function A(a, b) { return (a + b) & 0xFFFFFFFF; }
    function FF(a, b, c, d, x, s, t) { a = A(A(a, A((b & c) | (~b & d), x)), t); return A(L(a, s), b); }
    function GG(a, b, c, d, x, s, t) { a = A(A(a, A((b & d) | (c & ~d), x)), t); return A(L(a, s), b); }
    function HH(a, b, c, d, x, s, t) { a = A(A(a, A(b ^ c ^ d, x)), t); return A(L(a, s), b); }
    function II(a, b, c, d, x, s, t) { a = A(A(a, A(c ^ (b | ~d), x)), t); return A(L(a, s), b); }

    const len = bytes.length;
    const nBlocks = ((len + 8) >> 6) + 1;
    const words = new Int32Array(nBlocks * 16);
    for (let i = 0; i < len; i++) words[i >> 2] |= bytes[i] << ((i % 4) * 8);
    words[len >> 2] |= 0x80 << ((len % 4) * 8);
    words[nBlocks * 16 - 2] = len * 8;

    let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
    const K = [
      -680876936, -389564586, 606105819, -1044525330, -176418897, 1200080426,
      -1473231341, -45705983, 1770035416, -1958414417, -42063, -1990404162,
      1804603682, -40341101, -1502002290, 1236535329,
      -165796510, -1069501632, 643717713, -373897302, -701558691, 38016083,
      -660478335, -405537848, 568446438, -1019803690, -187363961, 1163531501,
      -1444681467, -51403784, 1735328473, -1926607734,
      -378558, -2022574463, 1839030562, -35309556, -1530992060, 1272893353,
      -155497632, -1094730640, 681279174, -358537222, -722521979, 76029189,
      -640364487, -421815835, 530742520, -995338651,
      -198630844, 1126891415, -1416354905, -57434055, 1700485571, -1894986606,
      -1051523, -2054922799, 1873313359, -30611744, -1560198380, 1309151649,
      -145523070, -1120210379, 718787259, -343485551
    ];
    const S1 = [7, 12, 17, 22], S2 = [5, 9, 14, 20], S3 = [4, 11, 16, 23], S4 = [6, 10, 15, 21];

    for (let i = 0; i < words.length; i += 16) {
      const oa = a, ob = b, oc = c, od = d;
      for (let j = 0; j < 64; j++) {
        let f, g, s;
        if (j < 16) { f = FF; g = j; s = S1[j % 4]; }
        else if (j < 32) { f = GG; g = (5 * j + 1) % 16; s = S2[j % 4]; }
        else if (j < 48) { f = HH; g = (3 * j + 5) % 16; s = S3[j % 4]; }
        else { f = II; g = (7 * j) % 16; s = S4[j % 4]; }
        // a = b + rol(a + f(b,c,d) + X[g] + K[j], s); then rotate a<-d<-c<-b
        const na = f(a, b, c, d, words[i + g], s, K[j]);
        a = d; d = c; c = b; b = na;
      }
      a = A(a, oa); b = A(b, ob); c = A(c, oc); d = A(d, od);
    }
    const out = new Uint8Array(16);
    [a, b, c, d].forEach((v, i) => {
      out[i * 4] = v & 0xFF;
      out[i * 4 + 1] = (v >>> 8) & 0xFF;
      out[i * 4 + 2] = (v >>> 16) & 0xFF;
      out[i * 4 + 3] = (v >>> 24) & 0xFF;
    });
    return out;
  }

  /* -------------------------------------------------- RC4 */
  function rc4(key, data) {
    const S = new Uint8Array(256);
    for (let i = 0; i < 256; i++) S[i] = i;
    let j = 0;
    for (let i = 0; i < 256; i++) {
      j = (j + S[i] + key[i % key.length]) & 0xFF;
      const t = S[i]; S[i] = S[j]; S[j] = t;
    }
    const out = new Uint8Array(data.length);
    let i = 0; j = 0;
    for (let k = 0; k < data.length; k++) {
      i = (i + 1) & 0xFF;
      j = (j + S[i]) & 0xFF;
      const t = S[i]; S[i] = S[j]; S[j] = t;
      out[k] = data[k] ^ S[(S[i] + S[j]) & 0xFF];
    }
    return out;
  }

  /* -------------------------------------------------- AES-128-CBC (encrypt only) */
  const SBOX = (function () {
    const s = new Uint8Array(256), inv = new Uint8Array(256);
    let p = 1, q = 1;
    do {
      p = p ^ ((p << 1) & 0xFF) ^ ((p & 0x80) ? 0x1B : 0);
      q ^= q << 1; q ^= q << 2; q ^= q << 4; q &= 0xFF;
      if (q & 0x80) q ^= 0x09;
      const x = q ^ ((q << 1) | (q >>> 7)) ^ ((q << 2) | (q >>> 6)) ^ ((q << 3) | (q >>> 5)) ^ ((q << 4) | (q >>> 4));
      s[p] = (x ^ 0x63) & 0xFF;
    } while (p !== 1);
    s[0] = 0x63;
    for (let i = 0; i < 256; i++) inv[s[i]] = i;
    return s;
  })();

  function xtime(a) { return ((a << 1) ^ ((a & 0x80) ? 0x1B : 0)) & 0xFF; }
  function mul(a, b) {
    let r = 0;
    while (b) { if (b & 1) r ^= a; a = xtime(a); b >>= 1; }
    return r & 0xFF;
  }
  function expandKey(key) {
    const Nk = 4, Nr = 10;
    const w = new Uint8Array(16 * (Nr + 1));
    w.set(key, 0);
    let rcon = 1;
    for (let i = Nk; i < 4 * (Nr + 1); i++) {
      let t = [w[(i - 1) * 4], w[(i - 1) * 4 + 1], w[(i - 1) * 4 + 2], w[(i - 1) * 4 + 3]];
      if (i % Nk === 0) {
        t = [SBOX[t[1]] ^ rcon, SBOX[t[2]], SBOX[t[3]], SBOX[t[0]]];
        rcon = xtime(rcon);
      }
      for (let k = 0; k < 4; k++) w[i * 4 + k] = w[(i - Nk) * 4 + k] ^ t[k];
    }
    return w;
  }
  function encryptBlock(state, w) {
    const Nr = 10;
    for (let i = 0; i < 16; i++) state[i] ^= w[i];
    for (let round = 1; round <= Nr; round++) {
      for (let i = 0; i < 16; i++) state[i] = SBOX[state[i]];
      // ShiftRows (column-major state: state[r + 4c])
      let t;
      t = state[1]; state[1] = state[5]; state[5] = state[9]; state[9] = state[13]; state[13] = t;
      t = state[2]; state[2] = state[10]; state[10] = t;
      t = state[6]; state[6] = state[14]; state[14] = t;
      t = state[15]; state[15] = state[11]; state[11] = state[7]; state[7] = state[3]; state[3] = t;
      if (round !== Nr) {
        for (let c = 0; c < 4; c++) {
          const a0 = state[c * 4], a1 = state[c * 4 + 1], a2 = state[c * 4 + 2], a3 = state[c * 4 + 3];
          state[c * 4] = mul(a0, 2) ^ mul(a1, 3) ^ a2 ^ a3;
          state[c * 4 + 1] = a0 ^ mul(a1, 2) ^ mul(a2, 3) ^ a3;
          state[c * 4 + 2] = a0 ^ a1 ^ mul(a2, 2) ^ mul(a3, 3);
          state[c * 4 + 3] = mul(a0, 3) ^ a1 ^ a2 ^ mul(a3, 2);
        }
      }
      for (let i = 0; i < 16; i++) state[i] ^= w[round * 16 + i];
    }
    return state;
  }
  function aesCbcEncrypt(key, data, iv) {
    const w = expandKey(key);
    const padLen = 16 - (data.length % 16);
    const padded = new Uint8Array(data.length + padLen);
    padded.set(data, 0);
    padded.fill(padLen, data.length);
    const out = new Uint8Array(16 + padded.length);
    out.set(iv, 0);
    let prev = iv;
    for (let off = 0; off < padded.length; off += 16) {
      const block = new Uint8Array(16);
      for (let i = 0; i < 16; i++) block[i] = padded[off + i] ^ prev[i];
      encryptBlock(block, w);
      out.set(block, 16 + off);
      prev = block;
    }
    return out;
  }

  function randomBytes(n) {
    const b = new Uint8Array(n);
    (window.crypto || window.msCrypto).getRandomValues(b);
    return b;
  }

  /* -------------------------------------------------- standard security handler */
  const PAD = new Uint8Array([
    0x28, 0xBF, 0x4E, 0x5E, 0x4E, 0x75, 0x8A, 0x41, 0x64, 0x00, 0x4E, 0x56,
    0xFF, 0xFA, 0x01, 0x08, 0x2E, 0x2E, 0x00, 0xB6, 0xD0, 0x68, 0x3E, 0x80,
    0x2F, 0x0C, 0xA9, 0xFE, 0x64, 0x53, 0x69, 0x7A
  ]);

  function padPassword(pw) {
    const bytes = [];
    for (let i = 0; i < pw.length && bytes.length < 32; i++) {
      const c = pw.charCodeAt(i);
      bytes.push(c > 255 ? 0x3F : c);   // '?' for non-latin1
    }
    const out = new Uint8Array(32);
    out.set(bytes.slice(0, 32), 0);
    if (bytes.length < 32) out.set(PAD.subarray(0, 32 - bytes.length), bytes.length);
    return out;
  }

  function permissionsValue(p) {
    // bits 1-2 reserved (1), bit 3 print, 4 modify, 5 copy, 6 annotate,
    // 9 fill forms, 10 extract for accessibility, 11 assemble, 12 print high-res
    let v = -1;                   // all bits set
    v &= ~(1 << 2); if (p.print) v |= (1 << 2);
    v &= ~(1 << 3); if (p.modify) v |= (1 << 3);
    v &= ~(1 << 4); if (p.copy) v |= (1 << 4);
    v &= ~(1 << 5); if (p.annotate) v |= (1 << 5);
    v &= ~(1 << 8); if (p.annotate) v |= (1 << 8);
    v |= (1 << 9);                                    // accessibility extraction
    v &= ~(1 << 10); if (p.modify) v |= (1 << 10);    // assemble
    v &= ~(1 << 11); if (p.print) v |= (1 << 11);     // high-res print
    v &= ~(1 << 0); v &= ~(1 << 1);                   // bits 1-2 must be 0
    return v | 0;
  }

  function computeOwnerKey(ownerPw, userPw, keyLenBytes, rev) {
    let hash = md5(padPassword(ownerPw || userPw));
    if (rev >= 3) for (let i = 0; i < 50; i++) hash = md5(hash);
    const key = hash.subarray(0, keyLenBytes);
    let data = padPassword(userPw);
    data = rc4(key, data);
    if (rev >= 3) {
      for (let i = 1; i <= 19; i++) {
        const k2 = new Uint8Array(key.length);
        for (let j = 0; j < key.length; j++) k2[j] = key[j] ^ i;
        data = rc4(k2, data);
      }
    }
    return data;
  }

  function computeEncryptionKey(userPw, O, P, id, keyLenBytes, rev, encryptMetadata) {
    const parts = [];
    parts.push(padPassword(userPw));
    parts.push(O);
    const pb = new Uint8Array(4);
    pb[0] = P & 0xFF; pb[1] = (P >> 8) & 0xFF; pb[2] = (P >> 16) & 0xFF; pb[3] = (P >> 24) & 0xFF;
    parts.push(pb);
    parts.push(id);
    if (rev >= 4 && !encryptMetadata) parts.push(new Uint8Array([0xFF, 0xFF, 0xFF, 0xFF]));
    let total = 0;
    parts.forEach((p) => (total += p.length));
    const buf = new Uint8Array(total);
    let off = 0;
    parts.forEach((p) => { buf.set(p, off); off += p.length; });
    let hash = md5(buf);
    if (rev >= 3) for (let i = 0; i < 50; i++) hash = md5(hash.subarray(0, keyLenBytes));
    return hash.subarray(0, keyLenBytes);
  }

  function computeUserKey(key, id, rev) {
    if (rev === 2) return rc4(key, PAD);
    const buf = new Uint8Array(32 + id.length);
    buf.set(PAD, 0);
    buf.set(id, 32);
    let hash = md5(buf);
    let data = rc4(key, hash);
    for (let i = 1; i <= 19; i++) {
      const k2 = new Uint8Array(key.length);
      for (let j = 0; j < key.length; j++) k2[j] = key[j] ^ i;
      data = rc4(k2, data);
    }
    const out = new Uint8Array(32);
    out.set(data, 0);
    out.set(randomBytes(16), 16);   // arbitrary padding per spec
    return out;
  }

  function objectKey(baseKey, num, gen, isAes) {
    const extra = isAes ? 9 : 5;
    const buf = new Uint8Array(baseKey.length + extra);
    buf.set(baseKey, 0);
    buf[baseKey.length] = num & 0xFF;
    buf[baseKey.length + 1] = (num >> 8) & 0xFF;
    buf[baseKey.length + 2] = (num >> 16) & 0xFF;
    buf[baseKey.length + 3] = gen & 0xFF;
    buf[baseKey.length + 4] = (gen >> 8) & 0xFF;
    if (isAes) buf.set([0x73, 0x41, 0x6C, 0x54], baseKey.length + 5);   // "sAlT"
    const h = md5(buf);
    return h.subarray(0, Math.min(16, baseKey.length + 5));
  }

  /* -------------------------------------------------- PDF rewriting */
  const enc = {
    latin1: (s) => { const a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) & 0xFF; return a; },
    str: (b) => { let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return s; }
  };

  function hex(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, '0');
    return s;
  }

  /**
   * Encrypt an already-serialised PDF (produced by pdf-lib with
   * useObjectStreams:false) with the standard security handler.
   *
   * @param {Uint8Array} bytes  plain PDF
   * @param {string} userPw
   * @param {string} ownerPw
   * @param {'aes128'|'rc4-128'} algo
   * @param {object} perms  {print, copy, modify, annotate}
   * @returns {Promise<Uint8Array>} encrypted PDF
   */
  F.encryptPdf = async function (bytes, userPw, ownerPw, algo, perms) {
    const isAes = algo !== 'rc4-128';
    const keyLenBytes = 16;
    const rev = isAes ? 4 : 3;
    const V = isAes ? 4 : 2;

    const src = enc.str(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
    const docId = randomBytes(16);
    const P = permissionsValue(perms || {});
    const O = computeOwnerKey(ownerPw, userPw, keyLenBytes, rev);
    const key = computeEncryptionKey(userPw, O, P, docId, keyLenBytes, rev, true);
    const U = computeUserKey(key, docId, rev);

    /* ---- parse all indirect objects "N G obj ... endobj" ---- */
    const objRe = /(\d+)\s+(\d+)\s+obj\b/g;
    const objects = [];
    let m;
    while ((m = objRe.exec(src))) {
      const start = m.index;
      const bodyStart = objRe.lastIndex;
      const end = src.indexOf('endobj', bodyStart);
      if (end === -1) continue;
      objects.push({ num: +m[1], gen: +m[2], start, bodyStart, end: end + 6, body: src.slice(bodyStart, end) });
    }
    if (!objects.length) throw new Error('Could not parse the PDF for encryption.');

    /* ---- find the trailer's /Root and /Info ---- */
    let rootRef = '', infoRef = '';
    const trailerIdx = src.lastIndexOf('trailer');
    const tailArea = trailerIdx > -1 ? src.slice(trailerIdx) : src.slice(-4000);
    const rootM = /\/Root\s+(\d+)\s+(\d+)\s+R/.exec(tailArea) || /\/Root\s+(\d+)\s+(\d+)\s+R/.exec(src);
    if (rootM) rootRef = rootM[1] + ' ' + rootM[2] + ' R';
    const infoM = /\/Info\s+(\d+)\s+(\d+)\s+R/.exec(tailArea) || /\/Info\s+(\d+)\s+(\d+)\s+R/.exec(src);
    if (infoM) infoRef = infoM[1] + ' ' + infoM[2] + ' R';

    /* ---- encrypt strings and streams object by object ---- */
    function encryptData(data, num, gen) {
      const k = objectKey(key, num, gen, isAes);
      if (isAes) return aesCbcEncrypt(k, data, randomBytes(16));
      return rc4(k, data);
    }

    function processBody(body, num, gen) {
      // 1. split off the stream payload, if any
      let dict = body, stream = null, tail = '';
      const sIdx = body.indexOf('stream');
      if (sIdx > -1) {
        let dataStart = sIdx + 6;
        if (body[dataStart] === '\r') dataStart++;
        if (body[dataStart] === '\n') dataStart++;
        const eIdx = body.lastIndexOf('endstream');
        if (eIdx > dataStart) {
          dict = body.slice(0, sIdx);
          stream = body.slice(dataStart, eIdx);
          tail = body.slice(eIdx);
        }
      }

      // 2. encrypt literal ( ) and hex < > strings inside the dictionary
      let outDict = '';
      let i = 0;
      while (i < dict.length) {
        const ch = dict[i];

        // dictionary delimiters are consumed atomically so that the second
        // '<' of '<<' can never be mistaken for the start of a hex string
        if (ch === '<' && dict[i + 1] === '<') { outDict += '<<'; i += 2; continue; }
        if (ch === '>' && dict[i + 1] === '>') { outDict += '>>'; i += 2; continue; }

        // comments run to the end of the line
        if (ch === '%') {
          let j = i;
          while (j < dict.length && dict[j] !== '\n' && dict[j] !== '\r') j++;
          outDict += dict.slice(i, j);
          i = j;
          continue;
        }

        // names: /Foo#20Bar — copy verbatim, they are never encrypted
        if (ch === '/') {
          let j = i + 1;
          while (j < dict.length && !/[\s\/\[\]<>(){}%]/.test(dict[j])) j++;
          outDict += dict.slice(i, j);
          i = j;
          continue;
        }

        if (ch === '(') {
          let depth = 1, j = i + 1, raw = '';
          while (j < dict.length && depth > 0) {
            const c = dict[j];
            if (c === '\\') { raw += c + (dict[j + 1] || ''); j += 2; continue; }
            if (c === '(') depth++;
            else if (c === ')') { depth--; if (!depth) break; }
            raw += c;
            j++;
          }
          // unescape
          const plain = raw.replace(/\\([nrtbf()\\])|\\([0-7]{1,3})/g, (mm, c1, oct) => {
            if (c1) return { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '(': '(', ')': ')', '\\': '\\' }[c1];
            return String.fromCharCode(parseInt(oct, 8));
          });
          const encd = encryptData(enc.latin1(plain), num, gen);
          outDict += '<' + hex(encd) + '>';
          i = j + 1;
          continue;
        }
        if (ch === '<') {
          const close = dict.indexOf('>', i);
          if (close > -1) {
            const h = dict.slice(i + 1, close).replace(/\s+/g, '');
            const arr = new Uint8Array(Math.ceil(h.length / 2));
            for (let k = 0; k < arr.length; k++) arr[k] = parseInt(h.substr(k * 2, 2).padEnd(2, '0'), 16);
            const encd = encryptData(arr, num, gen);
            outDict += '<' + hex(encd) + '>';
            i = close + 1;
            continue;
          }
        }
        outDict += ch;
        i++;
      }

      if (stream === null) return outDict;

      const encStream = encryptData(enc.latin1(stream), num, gen);
      // rewrite /Length
      outDict = outDict.replace(/\/Length\s+\d+(\s+\d+\s+R)?/, '/Length ' + encStream.length);
      if (!/\/Length\s/.test(outDict)) {
        outDict = outDict.replace(/<<\s*/, '<< /Length ' + encStream.length + ' ');
      }
      return outDict + 'stream\n' + enc.str(encStream) + '\n' + tail.replace(/^endstream/, 'endstream');
    }

    /* ---- rebuild the file ---- */
    let out = '%PDF-1.7\n%\xE2\xE3\xCF\xD3\n';
    const offsets = {};
    let maxNum = 0;

    objects.forEach((o) => {
      maxNum = Math.max(maxNum, o.num);
      offsets[o.num] = out.length;
      const newBody = processBody(o.body, o.num, o.gen);
      out += o.num + ' ' + o.gen + ' obj' + newBody + 'endobj\n';
    });

    // /Encrypt dictionary object
    const encNum = maxNum + 1;
    offsets[encNum] = out.length;
    let encDict = '<< /Filter /Standard /V ' + V + ' /R ' + rev +
      ' /Length ' + (keyLenBytes * 8) +
      ' /P ' + P +
      ' /O <' + hex(O) + '>' +
      ' /U <' + hex(U) + '>';
    if (isAes) {
      encDict += ' /CF << /StdCF << /CFM /AESV2 /AuthEvent /DocOpen /Length ' + keyLenBytes + ' >> >>' +
        ' /StmF /StdCF /StrF /StdCF /EncryptMetadata true';
    }
    encDict += ' >>';
    out += encNum + ' 0 obj\n' + encDict + '\nendobj\n';

    // xref
    const size = encNum + 1;
    const xrefPos = out.length;
    let xref = 'xref\n0 ' + size + '\n0000000000 65535 f \n';
    for (let n = 1; n < size; n++) {
      const off = offsets[n];
      xref += (off === undefined ? '0000000000 65535 f \n'
        : String(off).padStart(10, '0') + ' 00000 n \n');
    }
    out += xref;
    out += 'trailer\n<< /Size ' + size +
      (rootRef ? ' /Root ' + rootRef : '') +
      (infoRef ? ' /Info ' + infoRef : '') +
      ' /Encrypt ' + encNum + ' 0 R' +
      ' /ID [<' + hex(docId) + '> <' + hex(docId) + '>] >>\n' +
      'startxref\n' + xrefPos + '\n%%EOF\n';

    return enc.latin1(out);
  };

  /* expose primitives for debugging / reuse */
  F.crypto = { md5, rc4, aesCbcEncrypt, randomBytes, hex };
})();
