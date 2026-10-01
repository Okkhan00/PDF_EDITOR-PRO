/*
 * PDF EDIT PRO — canvas ↔ PDF coordinate helpers (single source of truth for
 * rotated-object export).
 *
 * Editor/canvas space : origin top-left, Y down, rotation positive = CLOCKWISE
 *                       (CSS rotate() and canvas ctx.rotate()), pivot = box centre.
 * PDF / pdf-lib space : origin bottom-left, Y up, rotation positive = COUNTER-
 *                       CLOCKWISE, pivot = the (x, y) point passed to drawText /
 *                       drawImage (NOT the centre).
 *
 * To make an exported object match the editor we therefore (1) negate the
 * angle and (2) move the draw anchor to where the rotated corner/baseline lands
 * when the object is rotated about its centre.
 */
(function (root) {
  'use strict';

  // Rotate point (px,py) about (cx,cy) by `deg` degrees, PDF space (CCW positive).
  function rotatePoint(px, py, cx, cy, deg) {
    var r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r), dx = px - cx, dy = py - cy;
    return { x: cx + dx * c - dy * s, y: cy + dx * s + dy * c };
  }

  // Editor rotation (clockwise degrees) -> pdf-lib rotation (CCW degrees).
  function canvasToPdfAngle(canvasDeg) { return -(canvasDeg || 0); }

  // Draw anchor + angle for an image/rect whose BOTTOM-LEFT corner is (x,y) in
  // PDF space, size w×h, rotated `canvasDeg` (editor convention) about its centre.
  function anchorForRotatedRect(x, y, w, h, canvasDeg) {
    var a = canvasToPdfAngle(canvasDeg), p = rotatePoint(x, y, x + w / 2, y + h / 2, a);
    return { x: p.x, y: p.y, angle: a };
  }

  // Draw anchor + angle for a text run on a single baseline.
  //   cx,cy        : box centre in PDF space (rotation pivot)
  //   leftOffset   : text's left edge relative to cx (e.g. -textWidth/2 when centred)
  //   baselineDrop : how far the baseline sits BELOW the box centre (PDF units, >0)
  function anchorForRotatedText(cx, cy, leftOffset, baselineDrop, canvasDeg) {
    var a = canvasToPdfAngle(canvasDeg), p = rotatePoint(cx + leftOffset, cy - baselineDrop, cx, cy, a);
    return { x: p.x, y: p.y, angle: a };
  }

  // Editor y-down box -> PDF y-up bottom-left, given scale factors and page height.
  function boxToPdf(o, rx, ry, pageHeight) {
    var w = o.w * rx, h = o.h * ry;
    return { x: o.x * rx, y: pageHeight - (o.y + o.h) * ry, w: w, h: h };
  }

  // Canvas textBaseline='middle' sits ~0.3465em above the baseline for Helvetica/Arial
  // ((ascent .905 − descent .212) / 2).
  var MIDDLE_TO_BASELINE_EM = 0.3465;

  var api = {
    rotatePoint: rotatePoint, canvasToPdfAngle: canvasToPdfAngle,
    anchorForRotatedRect: anchorForRotatedRect, anchorForRotatedText: anchorForRotatedText,
    boxToPdf: boxToPdf, MIDDLE_TO_BASELINE_EM: MIDDLE_TO_BASELINE_EM
  };
  root.PdfCoords = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
