"""Image/signature export vs editor canvas rendering. Usage: python3 tests/e2e-export-image.py <URL>"""
import asyncio, sys, io, base64, numpy as np
from PIL import Image
from playwright.async_api import async_playwright
URL=sys.argv[1]
JS="""async ([rot,pos]) => {
  const c=document.createElement('canvas'); c.width=160; c.height=80; const g=c.getContext('2d'); g.fillStyle='#1565c0'; g.fillRect(0,0,160,80); g.fillStyle='#e53935'; g.fillRect(0,0,50,80);
  const o={id:1,page:1,x:pos[0],y:pos[1],w:160,h:80,rotation:rot,opacity:1,zIndex:1,src:c.toDataURL('image/png'),uiEl:null};
  imageObjects={1:[o]};
  const ref=document.createElement('canvas'); ref.width=pdfCanvas.width; ref.height=pdfCanvas.height; const rc=ref.getContext('2d'); rc.fillStyle='#fff'; rc.fillRect(0,0,ref.width,ref.height);
  await drawImageObjOn(rc,o);
  let blob=null; window.downloadBlob=b=>{blob=b}; await performDownload(false); for(let i=0;i<100&&!blob;i++) await new Promise(r=>setTimeout(r,50));
  const d=await pdfjsLib.getDocument({data:new Uint8Array(await blob.arrayBuffer())}).promise; const pg=await d.getPage(1), vp=pg.getViewport({scale});
  const ec=document.createElement('canvas'); ec.width=vp.width; ec.height=vp.height; const ex=ec.getContext('2d'); ex.fillStyle='#fff'; ex.fillRect(0,0,ec.width,ec.height);
  await pg.render({canvasContext:ex,viewport:vp}).promise; return {scale, base:BASE_SCALE, exp:ec.toDataURL(), ref:ref.toDataURL()}; }"""
def ink(u): return np.array(Image.open(io.BytesIO(base64.b64decode(u.split(',')[1]))).convert('RGB')).min(axis=2)<200
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await (await b.new_context(viewport={'width':1366,'height':768})).new_page(); await pg.goto(URL); await pg.wait_for_timeout(500)
        await pg.evaluate("""async()=>{const d=await PDFLib.PDFDocument.create(); d.addPage([595,842]); await handleFile(new File([await d.save()],'t.pdf',{type:'application/pdf'}));}"""); await pg.wait_for_function("pdfDoc!==null"); await pg.wait_for_timeout(600)
        ok=0; n=0; worst=[]
        for rot in [0,45,90,180,270,-45]:
            for pos in [(60,80),(300,400),(500,900)]:
                r=await pg.evaluate(JS,[rot,list(pos)]); a,e=ink(r['ref']),ink(r['exp']); iou=(a&e).sum()/max(1,(a|e).sum()); n+=1; ok+= iou>0.9
                if iou<=0.9: worst.append((rot,pos,round(float(iou),2)))
        print(URL,'\n  image export PASS',ok,'/',n,'(IoU>0.9)', 'scale/base', r['scale'], r['base'], 'worst', worst[:5]); await b.close()
asyncio.run(main())
