"""Editor-vs-export watermark regression test (needs: pip install playwright; a static server).
Usage: python3 tests/e2e-export-watermark.py http://localhost:8765/index.html
Compares the editor's own canvas rendering of each watermark with the real exported PDF
re-rendered by PDF.js and reports pixel-overlap (IoU). Mirrored/rotated/shifted output => low IoU."""
import asyncio, sys, json, io, base64
import numpy as np
from PIL import Image
from playwright.async_api import async_playwright
URL = sys.argv[1]
POS = ['TL','TC','TR','CL','C','CR','BL','BC','BR']
ROT = [0, 45, 90, -45]
JS_CASE = """async ([pos, rot, fs, kind]) => {
  const W = canvasHolder.clientWidth, H = canvasHolder.clientHeight;
  const w = kind==='img' ? 150 : 260, h = kind==='img' ? 90 : 70, m = 0.06;
  const xs = {L:W*m, C:(W-w)/2, R:W-w-W*m}, ys = {T:H*m, C:(H-h)/2, B:H-h-H*m};
  const px = pos==='C' ? 'C' : pos[1], py = pos==='C' ? 'C' : pos[0];
  const o = defaultWmObject(kind==='img'?'image':'text', 1);
  Object.assign(o, {x: xs[px], y: ys[py], w, h, rotation: rot, opacity: 1, fontSize: fs, text: 'WATERMARK', color: '#c62828', align:'center'});
  if (kind==='img') { const c=document.createElement('canvas'); c.width=150; c.height=90; const g=c.getContext('2d');
    g.fillStyle='#1565c0'; g.fillRect(0,0,150,90); g.fillStyle='#fff'; g.fillRect(0,0,50,90); o.src=c.toDataURL('image/png'); }
  userWatermarks = {1:[o]};
  renderWatermarkObjects();
  const ref = document.createElement('canvas'); ref.width = pdfCanvas.width; ref.height = pdfCanvas.height;
  const rc = ref.getContext('2d'); rc.fillStyle='#fff'; rc.fillRect(0,0,ref.width,ref.height);
  await drawUserWatermarksOnAsync(rc, 1);
  let blob = null; window.downloadBlob = (b)=>{ blob=b; };
  await performDownload(false);
  for (let i=0;i<100 && !blob;i++) await new Promise(r=>setTimeout(r,50));
  if (!blob) return {err:'no blob'};
  const doc = await pdfjsLib.getDocument({data: new Uint8Array(await blob.arrayBuffer())}).promise;
  const pg = await doc.getPage(1), vp = pg.getViewport({scale});
  const ec = document.createElement('canvas'); ec.width = vp.width; ec.height = vp.height;
  const ex = ec.getContext('2d'); ex.fillStyle='#fff'; ex.fillRect(0,0,ec.width,ec.height);
  await pg.render({canvasContext: ex, viewport: vp}).promise;
  return {exp: ec.toDataURL('image/png'), ref: ref.toDataURL('image/png')};
}"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await (await b.new_context(viewport={'width':1366,'height':768})).new_page()
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(500)
        res=[]
        for orient,(pw,ph) in {'portrait':(595,842),'landscape':(842,595)}.items():
            await pg.evaluate("""async ([w,h]) => { const d = await PDFLib.PDFDocument.create(); d.addPage([w,h]); d.addPage([w,h]);
              const bytes = await d.save(); await handleFile(new File([bytes],'t.pdf',{type:'application/pdf'})); }""", [pw,ph])
            await pg.wait_for_function("pdfDoc!==null && numPages===2"); await pg.wait_for_timeout(600)
            cases = [(po,r,40,'txt') for po in POS for r in ROT] if orient=='portrait' else [(po,r,40,'txt') for po in ['TL','C','BR'] for r in ROT]
            cases += [('C',r,40,'img') for r in ([0,45,90,-45] if orient=='portrait' else [45])]
            cases += [('C',45,16,'txt'),('C',45,90,'txt')] if orient=='portrait' else []
            for c in cases:
                r = await pg.evaluate(JS_CASE, list(c))
                if 'err' in r: res.append((orient,)+c+(r,)); continue
                def ink(im): a = np.array(im.convert('RGB')).min(axis=2) < 200; return a
                exp = ink(Image.open(io.BytesIO(base64.b64decode(r['exp'].split(',')[1]))))
                ref = ink(Image.open(io.BytesIO(base64.b64decode(r['ref'].split(',')[1]))))
                dom = ref  # editor canvas rendering (its baseline is verified against the DOM preview separately)
                if dom.shape != exp.shape: res.append((orient,)+c+({'err':f'shape {dom.shape} {exp.shape}'},)); continue
                def cmp(a,b):
                    i=(a&b).sum(); u=(a|b).sum()
                    ca=np.argwhere(a).mean(0) if a.any() else None; cb=np.argwhere(b).mean(0) if b.any() else None
                    return {'iou': float(i/u) if u else 0, 'dy': float(cb[0]-ca[0]) if ca is not None and cb is not None else None, 'dx': float(cb[1]-ca[1]) if ca is not None and cb is not None else None}
                m = cmp(dom, exp); m['ref_iou_vs_dom'] = round(cmp(dom, ref)['iou'],2); m['ink']=[int(dom.sum()),int(exp.sum())]
                res.append((orient,)+c+(m,))
        ok = [x for x in res if 'iou' in x[-1] and x[-1]['iou']>=0.5 and x[-1].get('dx') is not None and abs(x[-1]['dx'])<=6 and abs(x[-1]['dy'])<=6]
        print(f'{URL}\n  PASS {len(ok)}/{len(res)}  (IoU>=0.5 and centroid shift<=6px)  page errors: {len(errs)}')
        bad = sorted([x for x in res if x not in ok], key=lambda x: x[-1].get('iou',0))
        for x in bad[:6]: print('  FAIL', x[:5], json.dumps(x[-1]))
        if ok: print('  min IoU among passes:', round(min(x[-1]['iou'] for x in ok),2), ' max |centroid shift| px:', round(max(abs(x[-1]['dx'])+abs(x[-1]['dy']) for x in ok),1))
        await b.close()
asyncio.run(main())
