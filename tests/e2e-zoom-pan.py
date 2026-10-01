"""Mobile zoom/pan regression. Usage: python3 tests/e2e-zoom-pan.py <index.html URL>"""
import asyncio, sys
from playwright.async_api import async_playwright
URL = sys.argv[1]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width':390,'height':844}, has_touch=True, is_mobile=True, device_scale_factor=2)
        pg = await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(500)
        await pg.evaluate("""async()=>{const d=await PDFLib.PDFDocument.create(); const pgx=d.addPage([595,842]); const f=await d.embedFont(PDFLib.StandardFonts.Helvetica);
          pgx.drawText('Top-left corner',{x:20,y:810,size:14,font:f}); pgx.drawText('Bottom-right corner',{x:420,y:20,size:14,font:f});
          await handleFile(new File([await d.save()],'t.pdf',{type:'application/pdf'}));}""")
        await pg.wait_for_function("pdfDoc!==null"); await pg.wait_for_timeout(800)
        # hide Home overlay if present
        await pg.evaluate("document.getElementById('homeScreen')?.classList.add('hidden')")
        await pg.evaluate("setZoom(scale*2.2,false)"); await pg.wait_for_timeout(1200)
        R = await pg.evaluate("""()=>{
          const w=document.getElementById('viewerWrap'), h=document.getElementById('canvasHolder'); const out={};
          w.scrollLeft=0; w.scrollTop=0; let hr=h.getBoundingClientRect(), vr=w.getBoundingClientRect();
          out.leftEdgeVisible = hr.left >= vr.left-1;           // page's left edge reachable at scrollLeft=0
          w.scrollLeft=1e6; w.scrollTop=1e6; hr=h.getBoundingClientRect();
          out.rightEdgeVisible = hr.right <= vr.right+1+0 || (hr.right - vr.right) <= 24; // within padding
          out.holder = [Math.round(h.clientWidth), Math.round(h.clientHeight)]; out.viewer=[w.clientWidth,w.clientHeight];
          return out;}""")
        print('corner reachability:', R)
        # anchor test: choose a point on the page, zoom in around it, it must stay put
        A = await pg.evaluate("""async()=>{
          const w=document.getElementById('viewerWrap'), h=document.getElementById('canvasHolder'); w.scrollLeft=0; w.scrollTop=0;
          const hr=h.getBoundingClientRect(), ax=hr.left+hr.width*0.25, ay=hr.top+hr.height*0.2;   // a point near the upper-left
          const fx=(ax-hr.left)/hr.width, fy=(ay-hr.top)/hr.height;
          await setZoom(scale*1.5,false,{x:ax,y:ay});
          const h2=h.getBoundingClientRect(); return {dx:+(h2.left+fx*h2.width-ax).toFixed(2), dy:+(h2.top+fy*h2.height-ay).toFixed(2)};}""")
        print('pinch-anchor drift (px, want ~0):', A)
        # NOTE: real finger-drag cannot be synthesised in headless Chromium here (CDP touch scroll
        # does not even scroll a plain div), so assert the computed touch-action instead.
        await pg.evaluate("tool='select'; document.dispatchEvent(new Event('click'))"); await pg.wait_for_timeout(100)
        print('overlay touch-action in Select (want pan-x pan-y):', await pg.evaluate("getComputedStyle(document.getElementById('overlay')).touchAction"))
        hist = await pg.evaluate("historyStack.length")
        print('undo history entries from zoom/pan:', hist, '| page errors:', errs)
        await b.close()
asyncio.run(main())
