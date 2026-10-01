/*
 * PDF EDIT PRO — viewport behaviour (touch panning + Ctrl/trackpad-pinch zoom).
 * Viewport changes never touch undo history or the draft: they only scroll/scale.
 */
(function () {
  'use strict';
  var wrap = document.getElementById('viewerWrap'), overlayEl = document.getElementById('overlay');
  if (!wrap || !overlayEl) return;

  // The overlay covers the whole page. In Select / Edit-Text mode it ignores drags, but its
  // `touch-action:none` made the browser refuse to start a native scroll from anywhere on
  // the page — so a zoomed-in page could not be panned. Allow panning there; keep `none`
  // for drawing tools, which need the raw pointer stream.
  function sync() {
    var t = 'select'; try { t = tool; } catch (e) { /* not ready */ }
    overlayEl.style.touchAction = (t === 'select' || t === 'editText') ? 'pan-x pan-y' : 'none';
  }
  ['click', 'pointerup', 'keyup'].forEach(function (ev) { document.addEventListener(ev, function () { setTimeout(sync, 0); }, true); });
  sync();

  // Desktop: Ctrl+wheel (also what trackpad pinch emits) zooms around the pointer.
  wrap.addEventListener('wheel', function (e) {
    if (!e.ctrlKey) return;
    e.preventDefault();
    var f = Math.exp(-e.deltaY * 0.01);
    try { if (pdfDoc) setZoom(scale * f, false, { x: e.clientX, y: e.clientY }); } catch (err) { console.error(err); }
  }, { passive: false });
})();
