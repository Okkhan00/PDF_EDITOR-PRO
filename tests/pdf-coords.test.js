// Run: node tests/pdf-coords.test.js   (no dependencies)
const assert = require('assert');
const C = require('../www/pdf-coords.js');
const near = (a, b, m) => assert(Math.abs(a - b) < 1e-9, `${m}: ${a} !== ${b}`);
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok -', name); };

t('canvas clockwise -> pdf counter-clockwise (sign flip)', () => {
  near(C.canvasToPdfAngle(45), -45, 'a'); near(C.canvasToPdfAngle(-30), 30, 'b'); near(C.canvasToPdfAngle(0) + 0, 0, 'c');
});
t('rotatePoint 90° CCW about origin', () => {
  const p = C.rotatePoint(1, 0, 0, 0, 90); near(p.x, 0, 'x'); near(p.y, 1, 'y');
});
t('rect, no rotation: anchor unchanged', () => {
  const a = C.anchorForRotatedRect(100, 200, 50, 20, 0); near(a.x, 100, 'x'); near(a.y, 200, 'y'); near(a.angle, 0, 'ang');
});
t('rect 90° clockwise (editor): bottom-left corner lands at top-left of the rotated box', () => {
  // 100x40 box at (0,0), centre (50,20). Rotated 90° clockwise it becomes a vertical
  // box spanning x 30..70, y -30..70; the old bottom-left corner is now its TOP-left: (30,70).
  const a = C.anchorForRotatedRect(0, 0, 100, 40, 90);
  near(a.angle, -90, 'angle'); near(a.x, 30, 'x'); near(a.y, 70, 'y');
});
t('rect 180°: anchor goes to the opposite corner', () => {
  const a = C.anchorForRotatedRect(0, 0, 100, 40, 180); near(a.x, 100, 'x'); near(a.y, 40, 'y');
});
t('rotation about centre keeps the centre fixed (any angle)', () => {
  for (const d of [-180, -45, 30, 45, 90, 270]) {
    const a = C.anchorForRotatedRect(10, 20, 80, 30, d), c = C.rotatePoint(a.x, a.y, 0, 0, 0);
    // re-derive centre: move from anchor by the (w/2,h/2) vector rotated by angle
    const centre = C.rotatePoint(a.x + 40, a.y + 15, a.x, a.y, a.angle);
    near(centre.x, 50, 'cx ' + d); near(centre.y, 35, 'cy ' + d);
  }
});
t('text centred, 0°: baseline-left is half text width left of centre, below it by 0.3465em', () => {
  const a = C.anchorForRotatedText(300, 400, -50, C.MIDDLE_TO_BASELINE_EM * 20, 0);
  near(a.x, 250, 'x'); near(a.y, 400 - 6.93, 'y');
});
t('text rotated 45° clockwise (editor): start of text moves to upper-left of centre', () => {
  const a = C.anchorForRotatedText(0, 0, -50, 0, 45);   // text 100 wide centred on origin
  // clockwise 45° in Y-up space: start point (-50,0) goes to upper-left (-35.35, +35.35)
  near(a.x, -50 * Math.cos(Math.PI / 4), 'x'); near(a.y, 50 * Math.sin(Math.PI / 4), 'y'); near(a.angle, -45, 'ang');
});
t('boxToPdf flips Y using page height', () => {
  const b = C.boxToPdf({ x: 10, y: 20, w: 100, h: 50 }, 2, 2, 800);
  near(b.x, 20, 'x'); near(b.y, 800 - 140, 'y'); near(b.w, 200, 'w'); near(b.h, 100, 'h');
});
console.log(n + ' tests passed');
