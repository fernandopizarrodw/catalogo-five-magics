'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const documentIncludesBuzo = text => /\bbuzo\b/i.test(text);

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
        const dir = path.join(root, 'reports/run-argentina-modal');
        fs.mkdirSync(dir, { recursive: true });
        const product = JSON.parse(fs.readFileSync(path.join(root, 'data/products.json'), 'utf8')).find(p => p.id === 7312);
        assert.equal(product.variants.length, 7);
        assert.deepEqual(product.variants.slice(1,4).map(v => v.role), ['back','back','back']);
        const selectGarment = async garment => {
            await evaluate(garment === 'sin_mangas'
                ? 'document.querySelector("#modalGarmentSelector [data-modal-garment-type=\\"sin_mangas\\"]").click()'
                : 'selectRemeraVariant(' + JSON.stringify(garment === 'oversize' ? 'oversize_unisex' : 'hombre_clasica') + ')');
        };
        for (const page of ['/iron-maiden/', '/']) {
            for (const width of [390, 1440]) {
                await send('Emulation.setDeviceMetricsOverride', { width, height:1000, deviceScaleFactor:1, mobile:width<500 });
                await send('Page.navigate', { url:origin + page + '#diseno-' + designId });
                await waitFor('currentCatalogDesign?.designId===' + JSON.stringify(designId));
                await pause(150);
                assert.equal(await evaluate('document.getElementById("modalName").textContent'), product.name);
                assert.equal(await evaluate('selectedPrintMode'), 'simple');
                assert.equal(await evaluate('resolveModalPriceConfig().simple'), 40000);
                assert.equal(await evaluate('currentModalSourceRefs.length'), 5);
                assert.equal(await evaluate('catalogDesigns.filter(d=>d.designId===' + JSON.stringify(designId) + ').length'), 1);
                assert.equal(await evaluate('document.getElementById("modalPreviewReferenceNote").parentElement.classList.contains("modal-product-info")'), true);
                assert(await evaluate('Boolean(document.querySelector("#modalGarmentSelector [data-modal-garment-type=\\"sin_mangas\\"]")?.offsetParent)'), 'Sleeveless button');
                assert(await evaluate('new Promise(resolve=>Promise.all([...document.querySelectorAll(".carousel-slide img")].map(img=>img.decode().then(()=>true,()=>false))).then(result=>resolve(result.every(Boolean))))'), 'Mock images failed');
                assert.equal(await evaluate('document.getElementById("modalPurchaseFlow").dataset.step'), '1');
                assert.equal(await evaluate('document.getElementById("colorGroup").parentElement.dataset.step'), '2');
                assert.equal(await evaluate('document.getElementById("printModeSelector").parentElement.dataset.step'), '3');
                assert.equal(await evaluate('document.getElementById("modalPrice").parentElement.dataset.step'), '4');
                for (const garment of ['remera_clasica','oversize','sin_mangas']) {
                    await selectGarment(garment);
                    for (const mode of ['simple','double']) {
                        for (const color of ['negro','blanco']) {
                            await evaluate('selectPrintMode(' + JSON.stringify(mode) + ');selectColor(' + JSON.stringify(color) + ');selectSize("M");cart.clearCart()');
                            if (mode === 'double') await evaluate('if(selectedCatalogBackRef?.productId!==7312||selectedCatalogBackRef?.variantIndex!==3)selectCatalogDesignBack(7312,3)');
                            const stateBefore = await evaluate('JSON.stringify({garment:selectedModalGarment,mode:selectedPrintMode,color:selectedColor,size:selectedSize,back:selectedCatalogBackRef?.variantIndex})');
                            for (let index=0;index<5;index++) await evaluate('goToSlide('+index+',false)');
                            await pause(150);
                            assert.equal(await evaluate('JSON.stringify({garment:selectedModalGarment,mode:selectedPrintMode,color:selectedColor,size:selectedSize,back:selectedCatalogBackRef?.variantIndex})'),stateBefore, 'Gallery changed order');
                            const result = await evaluate('({added:addToCartFromModal(),item:cart.getCart()[0],summary:cart.generateSummary(),count:cart.getCart().length})');
                            assert(result.added, JSON.stringify(result));
                            assert.equal(result.count,1);
                            const price = (garment==='oversize'?43000:40000) + (mode==='double'?7000:0);
                            assert(result.summary.includes('* Precio: $'+price.toLocaleString('es-AR')),result.summary);
                            assert.equal(result.item.frontCode,'IMRFA5-7312.V1');
                            if(mode==='double') assert.equal(result.item.backCode,'IMRFA5-7312.V4');
                            if(garment==='sin_mangas'){
                                assert(result.summary.toLowerCase().includes('sin mangas'),result.summary);
                                assert(!documentIncludesBuzo(result.summary),result.summary);
                                assert((await evaluate('document.getElementById("modalOrderSummaryText").textContent')).includes('sin mangas'));
                                assert((await evaluate('document.getElementById("modalPreviewReferenceNote").textContent')).includes('sin mangas'));
                            }
                        }
                    }
                }
                for (const [file, backIndex] of [['IRON DOBLE 3.jpg',1],['IRON DOBLE 2.jpg',2],['IRON DOBLE 1.jpg',3]]) {
                    await evaluate('closeModal(false,false);openCatalogDesignPreview('+JSON.stringify(designId)+',"remera","double",'+JSON.stringify('images/iron_maiden/iron maiden fmd edition/'+file)+')');
                    assert.equal(await evaluate('selectedCatalogBackRef?.variantIndex'),backIndex);
                    assert((await evaluate('currentModalSourceRefs[currentSlide].image')).endsWith(file));
                    assert.equal(await evaluate('selectedPrintMode'),'double');
                }
                const backChoices = await evaluate('getCatalogDesignBackChoices().map(ref=>({productId:ref.productId,variantIndex:ref.variantIndex,backType:ref.backType}))');
                assert.deepEqual(backChoices.filter(r=>r.backType==='Recomendado').map(r=>r.variantIndex).sort(),[1,2,3]);
                assert.equal(await evaluate('document.querySelectorAll("#dorsoVariantsGrid .catalog-design-dorso-choice").length'),backChoices.length);
                assert.equal(await evaluate('document.querySelectorAll("#dorsoVariantsGrid > .catalog-design-dorso-recommended .catalog-design-dorso-choice").length'),3);
                assert.equal(await evaluate('document.querySelector("#dorsoVariantsGrid details.catalog-design-dorso-all").open'),false);
                const other = backChoices.find(r=>r.productId!==7312);
                assert(other);
                await evaluate('selectColor("negro");selectSize("M");setModalPurchaseStep(3,false)');
                await evaluate('filterCatalogDesignBacks('+JSON.stringify(String(other.productId))+')');
                assert(await evaluate('document.querySelector("#dorsoVariantsGrid [data-dorso-product-id=\\"'+other.productId+'\\"][data-dorso-variant-index=\\"'+other.variantIndex+'\\"]").offsetParent!==null'));
                await evaluate('selectCatalogDesignBack('+other.productId+','+other.variantIndex+');selectSize("M");selectColor("negro");cart.clearCart()');
                const otherOrder=await evaluate('({added:addToCartFromModal(),item:cart.getCart()[0]})');
                assert(otherOrder.added);
                assert.notEqual(otherOrder.item.backCode,'IMRFA5-7312.V4');
                await evaluate('cart.clearCart();selectModalGarmentType("sin_mangas");selectSize("2XL");selectColor("blanco")');
                assert.equal(await evaluate('selectedPrintMode'),'double');
                assert.equal(await evaluate('selectedCatalogBackRef.productId'),other.productId);
                assert.equal(await evaluate('selectedSize'),'2XL');
                assert.equal(await evaluate('document.querySelector("#sizeSelector [data-size=\\"3XL\\"]").offsetParent'),null);
                await evaluate('openSizeGuideForCurrentGarment()');
                assert(await evaluate('document.getElementById("modalSizeGuidePanel").textContent.toLowerCase().includes("sin mangas")'));
                await evaluate('closeModalSizeGuide()');
                assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Page overflow '+width);
                if(page==='/iron-maiden/'){
                    await evaluate('closeModal(false,false);openCatalogDesign('+JSON.stringify(designId)+');document.getElementById("modalName").scrollIntoView({behavior:"instant",block:"start"})');
                    await pause(100);
                    const shot=await send('Page.captureScreenshot',{format:'png'});
                    fs.writeFileSync(path.join(dir,'after-'+width+'.png'),Buffer.from(shot.data,'base64'));
                    await evaluate('selectColor("negro");selectSize("M");setModalPurchaseStep(3,false);selectPrintMode("double");selectCatalogDesignBack(7312,3);document.getElementById("upsellDorso").scrollIntoView({behavior:"instant",block:"start"})');
                    await pause(300);
                    const backsShot=await send('Page.captureScreenshot',{format:'png'});
                    fs.writeFileSync(path.join(dir,'backs-'+width+'.png'),Buffer.from(backsShot.data,'base64'));
                }
                await evaluate('closeModal(false,false);openCatalogDesign("iron-maiden-eddie-argentina-estadio-huracan-fmd");selectRemeraVariant("hombre_clasica");selectColor("negro");selectSize("M")');
                assert.equal(await evaluate('resolveModalPriceConfig().simple'),38000);
                assert.equal(await evaluate('resolveModalPriceConfig().doble'),45000);
                assert.equal(await evaluate('document.getElementById("sizeGroup").parentElement.dataset.step'),'2');
                assert.equal(await evaluate('document.getElementById("colorGroup").parentElement.dataset.step'),'2');
                await evaluate('setModalPurchaseStep(2,false)');
                assert(await evaluate('Boolean(document.getElementById("colorGroup").offsetParent)'));
                assert.equal(await evaluate('document.querySelector("#modalGarmentGroup .option-label").textContent'),'Prenda:');
                assert.equal(await evaluate('document.getElementById("modalPreviewReferenceNote").parentElement.classList.contains("carousel-container")'),true);
                await evaluate('closeModal(false,false);cart.clearCart()');
            }
        }
        assert.deepEqual(errors, []); assert.deepEqual(failedAssets, []);
        console.log(JSON.stringify({status:'PASS',pages:['Maiden','General'],widths:[390,1440],gallery:5,
            garmentColorPrintPrices:true,suggestedBacks:3,otherBacks:true,cartWhatsapp:true,
            sleeveSizeGuide:true,normalModalRestored:true,errors,failedAssets}));

    } finally {
        if (send) await send('Browser.close').catch(() => {});
        socket?.close();
        for (let i = 0; i < 20 && chrome.exitCode === null; i++) await pause(100);
        if (chrome.exitCode === null) chrome.kill();
        server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
