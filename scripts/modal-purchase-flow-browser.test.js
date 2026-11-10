'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    const designId = 'iron-maiden-buenos-aires-2026-aniversario-fmd';
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
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'fmd-modal-audit-'));
    const chrome = spawn(process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
    let socket, send, launchError;
    chrome.on('error', error => { launchError = error; });
    const errors = [], failedAssets = [];
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
        const dir = path.join(root, 'reports/purchase-flow');
        fs.mkdirSync(dir, {recursive:true});
        const click = async selector => {
            assert(await evaluate('Boolean(document.querySelector('+JSON.stringify(selector)+')?.offsetParent)'), 'Hidden control: '+selector);
            await evaluate('document.querySelector('+JSON.stringify(selector)+').click()');
        };
        const next = () => click('[data-flow-action="next"]');
        const step = async expected => {
            assert.equal(await evaluate('Number(document.getElementById("modalPurchaseFlow").dataset.step)'),expected);
            assert.equal(await evaluate('[...document.querySelectorAll(".purchase-flow-panel")].filter(n=>!n.hidden).length'),1);
            assert.equal(await evaluate('Boolean(document.getElementById("btnBuyNow").offsetParent)'),expected===4);
        };
        const cases=[
            {page:'/iron-maiden/',id:designId,garment:'sin_mangas',color:'blanco',mode:'double',price:47000,back:3},
            {page:'/',id:designId,garment:'oversize',color:'negro',mode:'simple',price:43000},
            {page:'/iron-maiden/',product:7041,garment:'remera_clasica',color:'negro',mode:'double',price:45000},
            {page:'/slayer/',id:'slayer-3d-fmd-south-of-heaven-original-1988',garment:'remera_clasica',color:'negro',mode:'simple',price:38000},
            {page:'/slayer/',id:'slayer-3d-fmd-south-of-heaven-original-1988',garment:'remera_clasica',color:'negro',mode:'double',price:45000},
            {page:'/epica/',id:'epica-retrospect',garment:'remera_clasica',color:'negro',mode:'double',price:45000}
        ];
        for(const width of [390,1440]){
            await send('Emulation.setDeviceMetricsOverride',{width,height:950,deviceScaleFactor:1,mobile:width<500});
            for(const test of cases){
                await send('Page.navigate',{url:origin+test.page});
                await waitFor('catalogDesigns.length>0');
                const id=test.id || await evaluate('catalogDesigns.find(d=>d.front.productId==='+test.product+').designId');
                await evaluate('openCatalogDesign('+JSON.stringify(id)+')');
                await step(1);
                assert(await evaluate('document.querySelector(".purchase-flow-nav button[data-flow-action=\\"next\\"]").getBoundingClientRect().height>=48'));
                if(test.garment==='sin_mangas') await click('#modalGarmentSelector [data-modal-garment-type="sin_mangas"]');
                if(test.garment==='oversize') await click('#modalRemeraVariantSelector [data-remera-variant="oversize_unisex"]');
                if(test.garment==='remera_clasica') {
                    await click('#modalGarmentSelector [data-modal-garment-type="remera"]');
                    await click('#modalRemeraVariantSelector [data-remera-variant="hombre_clasica"]');
                }
                await next();await step(2);
                await next();await step(2);
                assert((await evaluate('document.querySelector(".purchase-flow-error").textContent')).includes('color'));
                await click('#colorSelector [data-color="'+test.color+'"]');
                await next();await step(2);
                assert((await evaluate('document.querySelector(".purchase-flow-error").textContent')).includes('talle'));
                await click('#sizeSelector [data-size="M"]');
                await evaluate('openSizeGuideForCurrentGarment()');
                assert(await evaluate('!document.getElementById("modalSizeGuidePanel").classList.contains("is-hidden")'));
                await evaluate('closeModalSizeGuide()');
                await next();await step(3);
                await click('[data-print-mode="'+test.mode+'"]');
                if(test.back){
                    await next();await step(3);
                    assert((await evaluate('document.querySelector(".purchase-flow-error").textContent')).includes('dorso'));
                    await click('#dorsoVariantsGrid [data-dorso-product-id="7312"][data-dorso-variant-index="'+test.back+'"] > .catalog-design-dorso');
                }
                if(!test.back && await evaluate('Boolean(getModalPurchaseProblem(3))')){
                    const choice=await evaluate('getCatalogDesignBackChoices()[0]');
                    assert(choice);
                    const selector='#dorsoVariantsGrid [data-dorso-product-id="'+choice.productId+'"][data-dorso-variant-index="'+choice.variantIndex+'"] > .catalog-design-dorso';
                    await evaluate('const option=document.querySelector('+JSON.stringify(selector)+');const group=option.closest("details");if(group)group.open=true');
                    await click(selector);
                }
                await next();await step(4);
                assert(await evaluate('document.getElementById("btnBuyNow").getBoundingClientRect().width >= document.getElementById("modalOrderSummary").getBoundingClientRect().width * .95'),'Primary purchase button width');
                assert((await evaluate('document.getElementById("modalPrice").textContent')).includes(test.price.toLocaleString('es-AR')));
                if(test.back){
                    assert.equal(await evaluate('selectedCatalogBackRef.variantIndex'),test.back);
                    await click('.purchase-flow-edits button:nth-child(2)');await step(2);
                    await click('#colorSelector [data-color="negro"]');
                    assert.equal(await evaluate('selectedCatalogBackRef.variantIndex'),test.back);
                    assert.equal(await evaluate('selectedPrintMode'),'double');
                    await next();await next();await step(4);
                    // Changing garment returns to the size decision without losing the chosen back.
                    await click('.purchase-flow-edits button:first-child');await step(1);
                    await click('#modalGarmentSelector [data-modal-garment-type="remera"]');
                    await next();await step(2);await next();await step(2);
                    await click('#sizeSelector [data-size="L"]');
                    await next();await next();await step(4);
                    assert.equal(await evaluate('selectedCatalogBackRef.variantIndex'),test.back);
                }
                assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Overflow');
                assert(await evaluate('document.querySelector(".modal-product-info").scrollWidth<=document.querySelector(".modal-product-info").clientWidth+1'),'Modal overflow');
                if(test.id===designId && test.page==='/iron-maiden/'){
                    await pause(2100);
                    const screenshot=await send('Page.captureScreenshot',{format:'png'});
                    fs.writeFileSync(path.join(dir,'review-'+width+'.png'),Buffer.from(screenshot.data,'base64'));
                    await click('.purchase-flow-edits button:first-child');
                    await pause(100);
                    const initial=await send('Page.captureScreenshot',{format:'png'});
                    fs.writeFileSync(path.join(dir,'step-1-'+width+'.png'),Buffer.from(initial.data,'base64'));
                    await next();await next();await next();await step(4);
                }
                await evaluate('cart.clearCart()');
                await click('#btnBuyNow');
                await waitFor('document.getElementById("cartPreviewModal").classList.contains("active")');
                assert.equal(await evaluate('cart.getCart().length'),1);
                const item=await evaluate('({item:cart.getCart()[0],summary:cart.generateSummary()})');
                assert(item.summary.includes('* Precio: $'+test.price.toLocaleString('es-AR')),item.summary);
                if(test.back)assert.equal(item.item.backCode,'IMRFA5-7312.V4');
                if(test.garment==='oversize')assert(item.summary.toLowerCase().includes('oversize'));
                await evaluate('closeCartPreview();cart.clearCart();openCatalogDesign('+JSON.stringify(id)+')');
                await step(1);
                assert.equal(await evaluate('document.querySelectorAll("#modalPurchaseFlow").length'),1);
                assert.equal(await evaluate('document.querySelectorAll("#sizeGroup").length'),1);
                assert.equal(await evaluate('document.querySelectorAll("#colorGroup").length'),1);
                await evaluate('closeModal(false,false);openModal(5016)');
                assert.equal(await evaluate('document.getElementById("modalPurchaseFlow")'),null);
                assert(await evaluate('document.getElementById("sizeGroup").parentElement.classList.contains("product-options-tight")'));
                await evaluate('closeModal(false,false)');
            }
        }
        // Search within collapsed back options and explicit deferral both remain usable.
        await send('Page.navigate',{url:origin+'/iron-maiden/'});
        await waitFor('catalogDesigns.length>0');
        await evaluate('openCatalogDesign('+JSON.stringify(designId)+');selectColor("negro");selectSize("M")');
        await next();await next();await step(3);
        await click('[data-print-mode="double"]');
        await evaluate('filterCatalogDesignBacks("Huracan")');
        assert(await evaluate('document.querySelector("#dorsoVariantsGrid details").open'));
        await click('.purchase-flow-defer');
        await next();await step(4);
        assert((await evaluate('document.getElementById("modalOrderSummaryText").textContent')).includes('A definir por WhatsApp'));
        await evaluate('closeModal(false,false);cart.clearCart()');
        assert.deepEqual(errors,[]);
        assert.deepEqual(failedAssets,[]);
        console.log(JSON.stringify({status:'PASS',widths:[390,1440],products:cases.length,onePanelAtATime:true,
            requiredChoices:true,editingPreservesBack:true,pricesAndCart:true,whatsappCodes:true,
            collapsedBackSearch:true,deferral:true,sizeGuide:true,reopenAndLegacy:true,errors,failedAssets}));

    } finally {
        if (send) await send('Browser.close').catch(() => {});
        socket?.close();
        for (let i = 0; i < 20 && chrome.exitCode === null; i++) await pause(100);
        if (chrome.exitCode === null) chrome.kill();
        server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
