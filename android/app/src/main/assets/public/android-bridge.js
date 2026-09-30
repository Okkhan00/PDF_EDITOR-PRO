/*
 * PdfEdit Pro — Android (Capacitor) bridge.
 *
 * Loaded AFTER the main editor script in index.html. It does not modify or
 * replace any editor logic; it only:
 *   1. routes file "downloads" through the native Android share sheet
 *      (WebView ignores <a download> for blob: URLs),
 *   2. handles the Android hardware/gesture Back button,
 *   3. gives Print a sensible native fallback (window.print() is a no-op in
 *      Android WebView),
 *   4. logs otherwise-silent errors to the console.
 *
 * In a normal desktop browser (no Capacitor native runtime) this file does
 * nothing, so the same index.html keeps working as a website too.
 */
(function () {
  'use strict';

  var cap = window.Capacitor;
  var isNative = !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());

  // Never hide errors silently.
  window.addEventListener('unhandledrejection', function (e) {
    console.error('[PdfEdit Pro] Unhandled promise rejection:', e.reason);
  });
  window.addEventListener('error', function (e) {
    console.error('[PdfEdit Pro] Uncaught error:', e.message, e.filename + ':' + e.lineno);
  });

  if (!isNative) return;

  var P = cap.Plugins || {};
  var Filesystem = P.Filesystem, Share = P.Share, App = P.App, SplashScreen = P.SplashScreen;

  function say(msg) {
    try { if (typeof toast === 'function') { toast(msg); return; } } catch (_) { /* fall through */ }
    console.log('[PdfEdit Pro]', msg);
  }

  // ---------------------------------------------------------------------
  // 1. Native save / share
  // ---------------------------------------------------------------------
  var originalDownloadBlob = (typeof downloadBlob === 'function') ? downloadBlob : null;
  var EXPORT_DIR = 'exports';
  var pending = [];        // [{uri, name}]
  var flushTimer = null;

  function safeName(name) {
    var n = String(name || 'document.pdf').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_').trim();
    return n || 'document.pdf';
  }

  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () {
        var s = String(r.result || '');
        var i = s.indexOf(',');
        resolve(i >= 0 ? s.slice(i + 1) : '');
      };
      r.onerror = function () { reject(r.error || new Error('Could not read file data')); };
      r.readAsDataURL(blob);
    });
  }

  async function flushShare() {
    flushTimer = null;
    var batch = pending; pending = [];
    if (!batch.length) return;
    try {
      await Share.share({
        title: batch.length === 1 ? batch[0].name : batch.length + ' files',
        dialogTitle: 'Save or share',
        files: batch.map(function (b) { return b.uri; })
      });
    } catch (err) {
      var msg = String((err && err.message) || err || '');
      if (/cancel/i.test(msg)) return;            // user dismissed the sheet
      console.error('[PdfEdit Pro] Share failed:', err);
      say('Could not open the share sheet: ' + msg);
    }
  }

  async function nativeDownload(blob, filename) {
    if (!blob || blob.size === 0) throw new Error('The file is empty, nothing to save');
    var name = safeName(filename);
    var data = await blobToBase64(blob);
    if (!data) throw new Error('The file could not be encoded');
    await Filesystem.writeFile({
      path: EXPORT_DIR + '/' + name,
      data: data,
      directory: 'CACHE',
      recursive: true
    });
    var res = await Filesystem.getUri({ path: EXPORT_DIR + '/' + name, directory: 'CACHE' });
    pending.push({ uri: res.uri, name: name });
    // Several downloads fired back-to-back (Split / multi-part export) are
    // combined into ONE share sheet instead of opening many.
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(flushShare, 500);
  }

  if (Filesystem && Share) {
    window.downloadBlob = function (blob, filename) {
      nativeDownload(blob, filename).catch(function (err) {
        console.error('[PdfEdit Pro] Native save failed:', err);
        say('Could not save file: ' + ((err && err.message) || err));
        if (originalDownloadBlob) {
          try { originalDownloadBlob(blob, filename); } catch (e2) { console.error(e2); }
        }
      });
    };
    // Clear leftovers from previous sessions.
    Filesystem.rmdir({ path: EXPORT_DIR, directory: 'CACHE', recursive: true }).catch(function () {});
  } else {
    console.warn('[PdfEdit Pro] Filesystem/Share plugins missing; using browser download.');
  }

  // ---------------------------------------------------------------------
  // 2. Print fallback (window.print() does nothing in Android WebView)
  // ---------------------------------------------------------------------
  function nativePrintFallback() {
    say('Printing: choose Print or your print service from the share sheet.');
    if (typeof performDownload === 'function') return performDownload(false);
  }
  if (typeof printCurrentDocument === 'function')            window.printCurrentDocument = nativePrintFallback;
  if (typeof printCurrentDocumentWithOptions === 'function') window.printCurrentDocumentWithOptions = nativePrintFallback;

  // ---------------------------------------------------------------------
  // 3. Hardware / gesture Back button
  // ---------------------------------------------------------------------
  function $(id) { return document.getElementById(id); }
  function has(el, cls) { return !!(el && el.classList.contains(cls)); }

  function closeTopModal() {
    var panels = document.querySelectorAll('.modalPanel.open');
    if (!panels.length) return false;
    var panel = panels[panels.length - 1];
    // A running export cannot be cancelled by Back.
    if (panel.id === 'exportProgressPanel') return true;
    var closeBtn = panel.querySelector('.modalHead button');
    if (closeBtn) { closeBtn.click(); return true; }
    var overlay = $(panel.id.replace(/Panel$/, 'Overlay'));
    if (overlay) { overlay.click(); return true; }
    panel.classList.remove('open');
    return true;
  }

  function isMobileVp() { return window.matchMedia('(max-width:700px)').matches; }

  function handleBack() {
    // 1. Modals / dialogs
    if (closeTopModal()) return;

    // 2. "Advanced tools" popover
    var adv = $('advToolsPopover');
    if (has(adv, 'open')) { if (typeof closeAdvPopover === 'function') closeAdvPopover(); else adv.classList.remove('open'); return; }

    // 3. Mobile tools bottom sheet
    var tb = document.querySelector('.toolbar.mobile-open');
    if (tb) { if (typeof closeMobileTools === 'function') closeMobileTools(); else tb.classList.remove('mobile-open'); return; }

    // 4. Sidebar drawer (mobile)
    if (has($('sidebarBackdrop'), 'open') || (isMobileVp() && has($('sidebarWrap'), 'open'))) {
      if (typeof toggleSidebar === 'function') toggleSidebar(false);
      return;
    }

    // 5. Search bar
    if (has($('searchBar'), 'visible')) { var sc = $('searchClose'); if (sc) sc.click(); return; }

    // 6. Crop mode
    if (has($('cropBar'), 'visible')) { var cc = $('cropCancelBtn'); if (cc) { cc.click(); return; } }

    // 7. Nothing temporary is open. Never exit unexpectedly mid-edit.
    var docOpen = false;
    try { docOpen = (typeof pdfDoc !== 'undefined') && !!pdfDoc; } catch (_) { /* ignore */ }
    var now = Date.now();
    if (docOpen && (!handleBack.last || now - handleBack.last > 2000)) {
      handleBack.last = now;
      say('Press back again to exit');
      return;
    }
    if (App && App.exitApp) App.exitApp();
  }

  if (App && App.addListener) {
    App.addListener('backButton', function () {
      try { handleBack(); } catch (e) { console.error('[PdfEdit Pro] Back handler error:', e); }
    });
  }

  // Hide the native splash as soon as the page is ready.
  function hideSplash() { if (SplashScreen && SplashScreen.hide) SplashScreen.hide().catch(function () {}); }
  if (document.readyState === 'complete') hideSplash(); else window.addEventListener('load', hideSplash);
})();
