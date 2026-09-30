/*
 * PDF EDIT PRO — Home screen + Recent Files.
 * Reuses the editor's existing handleFile()/#fileInput; contains no PDF logic.
 *
 * Recent storage (all local):
 *   - metadata (name, size, time) in localStorage
 *   - Android app only: a private copy of the PDF (<= MAX_COPY_MB, newest MAX_RECENT)
 *     in the app's own data folder, so tapping a recent item can reopen it.
 *     Android's file input gives no persistent link to the original file, so a
 *     copy is the only way to reopen without adding a native picker plugin.
 *   - Browser: metadata only (browsers can't reopen a file by path); tapping a
 *     recent item asks the user to pick the file again.
 */
(function () {
  'use strict';
  var KEY = 'pdfeditpro.recent.v1', MAX_RECENT = 8, MAX_COPY_MB = 25, DIR = 'recent';
  var cap = window.Capacitor;
  var native = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  var FS = native && cap.Plugins ? cap.Plugins.Filesystem : null;

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
  function save(l) { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (e) { console.error(e); } }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function say(m) { try { toast(m); } catch (e) { console.log(m); } }
  function size(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
  function when(t) {
    var d = new Date(t), n = new Date(), day = 864e5;
    var a = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime(), b = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    if (a === b) return 'Today'; if (a - b === day) return 'Yesterday';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  function b64(blob) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(String(r.result).split(',')[1] || ''); };
      r.onerror = function () { rej(r.error); };
      r.readAsDataURL(blob);
    });
  }
  function rmCopy(id) { if (FS) FS.deleteFile({ path: DIR + '/' + id + '.pdf', directory: 'DATA' }).catch(function () {}); }

  async function remember(file) {
    try {
      var id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6), hasCopy = false;
      if (FS && file.size <= MAX_COPY_MB * 1048576) {
        try {
          await FS.writeFile({ path: DIR + '/' + id + '.pdf', data: await b64(file), directory: 'DATA', recursive: true });
          hasCopy = true;
        } catch (e) { console.warn('[Recent] could not keep a copy:', e); }
      }
      var list = load().filter(function (r) { if (r.name === file.name && r.size === file.size) { rmCopy(r.id); return false; } return true; });
      list.unshift({ id: id, name: file.name, size: file.size, t: Date.now(), copy: hasCopy });
      list.slice(MAX_RECENT).forEach(function (r) { rmCopy(r.id); });
      save(list.slice(0, MAX_RECENT));
    } catch (e) { console.error('[Recent] failed to record:', e); }
  }

  // ---- UI ----
  var css = '#homeScreen{position:fixed;inset:0;z-index:2000;background:var(--paper);color:var(--ink);overflow-y:auto;' +
    'padding:calc(24px + env(safe-area-inset-top,0px)) 20px calc(24px + env(safe-area-inset-bottom,0px));font-family:Inter,system-ui,sans-serif}' +
    '#homeScreen.hidden{display:none}#homeScreen .hw{max-width:560px;margin:0 auto}' +
    '#homeScreen h1{font-size:26px;margin:8px 0 2px;letter-spacing:.5px}#homeScreen .sub{color:var(--muted);font-size:13px;margin-bottom:22px}' +
    '#homeOpen{width:100%;min-height:56px;font-size:17px;font-weight:600;border:0;border-radius:14px;background:var(--accent);color:var(--accent-ink);cursor:pointer}' +
    '#homeScreen h2{font-size:13px;text-transform:uppercase;letter-spacing:.8px;color:var(--muted);margin:28px 0 8px;display:flex;justify-content:space-between;align-items:center}' +
    '#homeClear{background:none;border:0;color:var(--danger);font-size:13px;cursor:pointer;min-height:36px}' +
    '.hrow{display:flex;align-items:center;gap:6px;background:var(--bg-pill,#fff);border:1px solid var(--line);border-radius:12px;margin-bottom:8px}' +
    '.hrow .hmain{display:block;flex:1;min-width:0;text-align:left;background:none;border:0;color:inherit;padding:12px;min-height:56px;cursor:pointer;font:inherit}' +
    '.hrow .hn{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hrow .hm{font-size:12px;color:var(--muted);margin-top:2px}' +
    '.hrow .hx{background:none;border:0;color:var(--muted);font-size:18px;min-width:48px;min-height:56px;cursor:pointer}' +
    '#homeEmpty{color:var(--muted);text-align:center;padding:24px 0;font-size:14px}#homeScreen .pw{text-align:center;color:var(--muted);font-size:12px;margin-top:32px}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var home = document.createElement('div'); home.id = 'homeScreen';
  home.innerHTML = '<div class="hw"><h1>PDF EDIT PRO</h1><div class="sub">Offline PDF editor · your files never leave this device</div>' +
    '<button id="homeOpen">＋ Open PDF</button><div class="hrow" id="homeResume" style="display:none;margin-top:10px"><button class="hmain"><div class="hn"></div><div class="hm">Return to your open document</div></button></div><h2><span>Recent documents</span><button id="homeClear">Clear all</button></h2>' +
    '<div id="homeList"></div><div class="pw">Powered by Aizaz</div></div>';
  document.body.appendChild(home);

  function render() {
    var l = load(), box = document.getElementById('homeList');
    var cur = document.getElementById('homeResume'), open = false, nm = '';
    try { open = !!pdfDoc; nm = originalFileName; } catch (e) { /* no doc */ }
    cur.style.display = open ? '' : 'none';
    if (open) cur.querySelector('.hn').textContent = '✎ Continue editing: ' + nm;
    document.getElementById('homeClear').style.display = l.length ? '' : 'none';
    if (!l.length) { box.innerHTML = '<div id="homeEmpty">No recent documents yet.<br>Open a PDF to get started.</div>'; return; }
    box.innerHTML = l.map(function (r) {
      return '<div class="hrow" data-id="' + esc(r.id) + '"><button class="hmain"><div class="hn">📄 ' + esc(r.name) + '</div><div class="hm">' +
        when(r.t) + ' · ' + size(r.size) + '</div></button><button class="hx" title="Remove from recent" aria-label="Remove">✕</button></div>';
    }).join('');
  }
  function show() { render(); home.classList.remove('hidden'); }
  function hide() { home.classList.add('hidden'); }

  async function openRecent(r) {
    if (!r.copy || !FS) { say('Please pick this file again with Open PDF (' + r.name + ')'); document.getElementById('fileInput').click(); return; }
    try {
      var u = await FS.getUri({ path: DIR + '/' + r.id + '.pdf', directory: 'DATA' });
      var resp = await fetch(cap.convertFileSrc(u.uri));
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      var blob = await resp.blob();
      var f = new File([blob], r.name, { type: 'application/pdf' }); f.__fromRecent = true;
      await window.handleFile(f);
    } catch (e) {
      console.error('[Recent] reopen failed:', e);
      save(load().filter(function (x) { return x.id !== r.id; })); render();
      say('Unable to open this recent file. The saved copy is no longer available.');
    }
  }

  document.getElementById('homeOpen').addEventListener('click', function () { document.getElementById('fileInput').click(); });
  document.querySelector('#homeResume .hmain').addEventListener('click', hide);
  document.getElementById('homeClear').addEventListener('click', function () { load().forEach(function (r) { rmCopy(r.id); }); save([]); render(); });
  document.getElementById('homeList').addEventListener('click', function (e) {
    var row = e.target.closest('.hrow'); if (!row) return;
    var r = load().filter(function (x) { return x.id === row.dataset.id; })[0]; if (!r) return;
    if (e.target.closest('.hx')) { rmCopy(r.id); save(load().filter(function (x) { return x.id !== r.id; })); render(); }
    else openRecent(r);
  });

  // ---- Unsaved-change tracking (no editor logic touched) ----
  // "Dirty" = an edit was recorded via the editor's own pushHistory() since the
  // last load / export / draft save.
  var dirty = false;
  if (typeof window.pushHistory === 'function') {
    var origPush = window.pushHistory;
    window.pushHistory = function () { dirty = true; return origPush.apply(this, arguments); };
  }
  if (typeof window.downloadBlob === 'function') {
    var origDl = window.downloadBlob;
    window.downloadBlob = function () { dirty = false; return origDl.apply(this, arguments); };
  }
  var sd = document.getElementById('saveDraftBtn');
  if (sd) sd.addEventListener('click', function () { dirty = false; });

  // Themed confirm built on the app's own modal classes (so Android Back = Cancel).
  function confirmLeave(leaveLabel) {
    return new Promise(function (resolve) {
      var ov = document.createElement('div'); ov.className = 'modalOverlay open'; ov.id = 'leaveOverlay'; ov.style.zIndex = 2100;
      var pn = document.createElement('div'); pn.className = 'modalPanel open'; pn.id = 'leavePanel'; pn.style.zIndex = 2101; pn.style.maxWidth = '92vw';
      pn.innerHTML = '<div class="modalHead"><span>Unsaved Changes</span><button title="Cancel">&#10005;</button></div><div class="modalBody">' +
        '<p style="margin:0 0 12px;font-size:14px;line-height:1.5">You have unsaved changes. Export the PDF, or save a draft, before leaving.</p>' +
        '<button class="modalBtn" data-a="draft" style="min-height:48px">💾 Save Draft &amp; ' + leaveLabel + '</button>' +
        '<button class="modalBtn" data-a="leave" style="min-height:48px">' + leaveLabel + ' without saving</button>' +
        '<button class="modalBtn" data-a="cancel" style="min-height:48px">Cancel</button></div>';
      function done(a) { ov.remove(); pn.remove(); resolve(a); }
      ov.addEventListener('click', function () { done('cancel'); });
      pn.querySelector('.modalHead button').addEventListener('click', function () { done('cancel'); });
      pn.addEventListener('click', function (e) { var b = e.target.closest('[data-a]'); if (b) done(b.dataset.a); });
      document.body.appendChild(ov); document.body.appendChild(pn);
    });
  }
  async function guard(leaveLabel) {           // resolves true if it's OK to continue
    if (!dirty) return true;
    var a = await confirmLeave(leaveLabel);
    if (a === 'cancel') return false;
    if (a === 'draft') { var b = document.getElementById('saveDraftBtn'); if (b) b.click(); }
    dirty = false; return true;
  }

  // Wrap the editor's single file-entry point (file input, drag-drop, Recent all use it).
  var orig = window.handleFile;
  if (typeof orig === 'function') {
    window.handleFile = async function (file) {
      var open = false; try { open = !!pdfDoc; } catch (e) { /* ignore */ }
      if (open && !(await guard('Open new file'))) return;
      var before = null; try { before = pdfDoc; } catch (e) { /* ignore */ }
      await orig.apply(this, arguments);
      var ok = false; try { ok = !!pdfDoc && pdfDoc !== before; } catch (e) { /* ignore */ }
      if (ok) { dirty = false; hide(); if (file && file.name && !file.__fromRecent) remember(file); }
    };
  } else { console.error('[Home] handleFile not found; Home screen disabled.'); return; }

  // Home button in the editor header (44px touch target).
  var h1 = document.querySelector('header h1');
  if (h1) {
    var hb = document.createElement('button'); hb.id = 'homeBtn'; hb.className = 'btn-secondary';
    hb.textContent = '🏠 Home'; hb.title = 'Back to Home'; hb.style.minHeight = '40px';
    hb.addEventListener('click', async function () { if (await guard('Go Home')) show(); });
    h1.after(hb);
  }

  window.PdfEditHome = { show: show, hide: hide };
  show();
})();
