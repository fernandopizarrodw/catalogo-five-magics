'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const { buildCatalogDesigns } = require('../js/catalog-design.js');
const root = path.resolve(__dirname, '..');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    const products = JSON.parse(fs.readFileSync(path.join(root, 'data/products.json'), 'utf8'));
    const cards=require('../js/home-sleeveless.js');
    const previous=JSON.parse(execFileSync('git',['show','HEAD:data/products.json'],{cwd:root,encoding:'utf8',maxBuffer:20000000}));
    const options={resolveDesignId:({product,conceptName,transitionId,slugify})=>product.designFamilyId ? 'cd-'+slugify(product.designFamilyId)+'--'+slugify(conceptName) : 'cd-'+transitionId+'--p'+product.id};
    const designs=buildCatalogDesigns(products,options), oldDesigns=buildCatalogDesigns(previous,options);
    for(const old of oldDesigns){const current=designs.find(d=>d.designId===old.designId);assert(current,old.designId);assert.equal(current.orderCodeBase,old.orderCodeBase,old.designId);}
    assert.equal(designs.length,oldDesigns.length+1,'Only the distinct Hidden Treasures artwork is new');
    const changedIds=new Set(cards.map(c=>c.product));
    assert.deepEqual(products.filter(p=>!changedIds.has(p.id)),previous.filter(p=>!changedIds.has(p.id)));
    for(const card of cards)assert(fs.existsSync(path.join(root,'images/remeras sin mangas',card.file)));
    const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
    const server = http.createServer((req, res) => {
        try {
            let file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
            if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403).end(); return; }
            if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
            res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
            fs.createReadStream(file).pipe(res);
        } catch { res.writeHead(404).end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'fmd-home-sleeveless-'));
    const chrome = spawn(process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
    let socket, send, launchError;
    chrome.on('error', error => { launchError = error; });
    const errors = [], failedAssets = [];
    const reportDir = path.join(root, 'reports/home-sleeveless');
    fs.mkdirSync(reportDir, { recursive: true });
    try {
        const portFile = path.join(profile, 'DevToolsActivePort');
        for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) { if (launchError) throw launchError; await pause(100); }
        const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
        const targets = await fetch(`http://127.0.0.1:${port}/json`).then(r => r.json());
        socket = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
        await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
        let sequence = 0;
        const pending = new Map();
        socket.addEventListener('message', event => {
            const data = JSON.parse(event.data);
            if (data.method === 'Runtime.exceptionThrown') errors.push(data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text);
            if (data.method === 'Network.responseReceived' && data.params.response.url.startsWith(origin) && data.params.response.status >= 400) failedAssets.push(data.params.response.url);
            const request = pending.get(data.id);
            if (!request) return;
            pending.delete(data.id); clearTimeout(request.timeout);
            data.error ? request.reject(new Error(data.error.message)) : request.resolve(data.result);
        });
        send = (method, params = {}) => new Promise((resolve, reject) => {
            const id = ++sequence;
            const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)); }, 15000);
            pending.set(id, { resolve, reject, timeout }); socket.send(JSON.stringify({ id, method, params }));
        });
        const evaluate = async expression => {
            const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
            if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
            return result.result.value;
        };
        const waitFor = async expression => {
            for (let i = 0; i < 150; i++) { if (await evaluate(expression).catch(() => false)) return; await pause(100); }
            throw new Error(`Not ready: ${expression}`);
        };
        await send('Runtime.enable'); await send('Network.enable');
        await send('Page.navigate', { url: `${origin}/` });
        await waitFor('document.readyState === "complete" && document.querySelectorAll("[data-sleeveless-index]").length===12');
        const summaries=[];
        for (const width of [360,1440]) {
            await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<500});
            assert.equal(await evaluate('document.querySelectorAll("[data-sleeveless-index]:not([hidden])").length'),4);
            await evaluate('document.getElementById("sinMangas").scrollIntoView({behavior:"instant",block:"start"})');
            await waitFor('[...document.querySelectorAll("[data-sleeveless-index]:not([hidden]) img")].every(i=>i.complete&&i.naturalWidth>0)');
            assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),`Overflow ${width}`);
            const shot=await send('Page.captureScreenshot',{format:'png'});
            fs.writeFileSync(path.join(reportDir,`section-${width}.png`),Buffer.from(shot.data,'base64'));
            await evaluate('document.getElementById("homeSleevelessMore").click()');
            assert.equal(await evaluate('document.querySelectorAll("[data-sleeveless-index]:not([hidden])").length'),12);
            for (let i=0;i<cards.length;i++) {
                const card=cards[i];
                await evaluate(`cart.clearCart();document.querySelector('[data-sleeveless-index="${i}"]').click();selectSize('M')`);
                await waitFor('document.querySelectorAll(".carousel-slide img")[currentSlide]?.complete&&document.querySelectorAll(".carousel-slide img")[currentSlide]?.naturalWidth>0');
                const state=await evaluate('({garment:selectedModalGarment,mode:selectedPrintMode,image:selectedCatalogFrontRef?.image,color:selectedColor,back:selectedCatalogBackRef,prices:resolveModalPriceConfig()})');
                assert.equal(state.garment,'sin_mangas',card.file);
                assert.equal(state.mode,'double',card.file);
                assert(state.image.endsWith(card.file),JSON.stringify({card:card.file,state}));
                assert(state.back,`Missing back ${card.file}`);
                assert.equal(state.prices.simple,38000); assert.equal(state.prices.doble,45000);
                const order=await evaluate('({added:addToCartFromModal(),item:cart.getCart()[0],summary:cart.generateSummary()})');
                assert(order.added,card.file); assert(order.item.backCode,card.file); assert(order.item.frontCode,card.file);
                assert(order.summary.includes('Remera clásica sin mangas unisex'));
                assert(order.summary.includes('* Precio: $45.000'));
                assert(!order.summary.includes('a definir'),card.file);
                assert(order.item.frontImage.includes('sin_mangas'),card.file);
                const white=await evaluate('selectColor("blanco");selectSize("L");({color:selectedColor,mode:selectedPrintMode,back:selectedCatalogBackRef?.variantIndex})');
                assert.equal(white.color,'blanco',card.file); assert.equal(white.mode,'double'); assert.equal(white.back,state.back.variantIndex);
                const simple=await evaluate('cart.clearCart();selectPrintMode("simple");({added:addToCartFromModal(),summary:cart.generateSummary()})');
                assert(simple.added); assert(simple.summary.includes('* Precio: $38.000')); assert(simple.summary.includes('* Color: Blanca'));
                assert.equal(await evaluate('cart.getCart().length'),1);
                if(i===0){await evaluate('openSizeGuideForCurrentGarment()'); assert((await evaluate('document.getElementById("modalSizeGuideTitle").textContent')).includes('sin mangas')); await evaluate('closeModalSizeGuide()');}
                summaries.push({file:card.file,width,message:order.summary});
                await evaluate('closeModal(false,false);cart.clearCart()');
            }
            await evaluate('document.getElementById("homeSleevelessMore").click()');
        }
        const normal=await evaluate('(() => {openCatalogDesign("pantera-live-from-donington-94","remera_clasica");selectSize("M");selectColor("negro");selectPrintMode("simple");return {added:addToCartFromModal(),summary:cart.generateSummary()};})()');
        assert(normal.added); assert(normal.summary.includes('* Precio: $38.000')); assert(!normal.summary.includes('sin mangas'));
        assert.deepEqual(errors,[]); assert.deepEqual(failedAssets,[]);
        fs.writeFileSync(path.join(reportDir,'orders.json'),JSON.stringify(summaries,null,2));
        console.log(JSON.stringify({status:'PASS',mocks:12,bands:11,widths:[360,1440],matchingFrontBack:true,prices:true,whiteSelection:true,sizeGuide:true,cartWhatsapp:true,previousCodesAndLinks:true,errors,failedAssets,screenshots:reportDir}));

    } finally {
        if (send) await send('Browser.close').catch(() => {});
        socket?.close();
        for (let i = 0; i < 20 && chrome.exitCode === null; i++) await pause(100);
        if (chrome.exitCode === null) chrome.kill();
        server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

