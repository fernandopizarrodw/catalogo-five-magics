'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const { buildCatalogDesigns } = require('../js/catalog-design.js');
const configs = require('../js/band-archives-config.js');
const root = path.resolve(__dirname, '..');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    const products = JSON.parse(fs.readFileSync(path.join(root, 'data/products.json'), 'utf8'));
    const previous = JSON.parse(execFileSync('git', ['show', 'HEAD:data/products.json'], { cwd: root, encoding: 'utf8' }));
    assert.deepEqual(products.filter(p => p.id !== 7101), previous.filter(p => p.id !== 7101), 'Other products must remain unchanged');
    const designs = buildCatalogDesigns(products);
    const identities = list => list.map(d => [d.designId, d.orderCodeBase]);
    const newDesign = 'slayer-reign-in-blood-argentina-2026';
    assert.equal(designs.filter(d => d.designId === newDesign).length, 1, 'Exactly one new front design');
    assert.deepEqual(identities(designs.filter(d => d.designId !== newDesign)), identities(buildCatalogDesigns(previous)), 'Existing designs and front codes must remain unchanged');
    const config = configs.find(c => c.slug === 'slayer');
    assert.equal(config.defaultGarment, 'remera');
    assert.equal(config.designOrder[0], 'cd-slayer-reign-in-blood--p7101');
    const product = products.find(p => p.id === 7101);
    for (const variant of product.variants) {
        assert(fs.existsSync(path.join(root, variant.img)), variant.img);
        for (const preview of variant.stylePreviews || []) assert(fs.existsSync(path.join(root, preview.img)), preview.img);
    }
    const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
    const server = http.createServer((req, res) => {
        try {
            let file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
            if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
            if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
            res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
            fs.createReadStream(file).pipe(res);
        } catch { res.writeHead(404).end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'fmd-slayer-'));
    const chrome = spawn(process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
    let socket, send, launchError;
    chrome.on('error', error => { launchError = error; });
    const reportDir = path.join(root, 'reports', 'slayer-campaign');
    fs.mkdirSync(reportDir, { recursive: true });
    const errors = [], failedAssets = [], flows = [];
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
        await send('Network.setCacheDisabled', { cacheDisabled: true });
        await send('Page.navigate', { url: `${origin}/slayer/` });
        await waitFor('document.readyState === "complete" && catalogDesignById.has("cd-slayer-reign-in-blood--p7101") && document.querySelector("#productsGrid [data-design-id]")');
        assert(await evaluate('catalogDesigns.filter(d=>d.band === "Slayer").every(d=>BAND_LANDING_CONFIG.designOrder.includes(d.designId))'), 'Every active Slayer design needs editorial order');
        assert.equal(await evaluate('bandLandingGarment'), 'remera');
        assert.equal(await evaluate('document.querySelector("#productsGrid [data-design-id]").dataset.designId'), 'cd-slayer-reign-in-blood--p7101');
        for (const width of [360, 390, 1440]) {
            await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 500 });
            await evaluate('window.scrollTo(0,0)');
            assert(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), `Overflow at ${width}`);
            for (const collection of ['', 'reign-in-blood', 'classics', 'fmd-originals']) {
                const count = await evaluate(`selectBandLandingCollection('${collection}'); getCatalogDesignResults().length`);
                assert(count > 0, `Empty collection: ${collection}; ${JSON.stringify(await evaluate('catalogDesigns.filter(d=>d.band === "Slayer").map(d=>[d.designId,d.publicName])'))}`);
            }
            await evaluate('selectBandLandingCollection("")');
            await evaluate('currentSearch="no-existing-design"; document.getElementById("searchInput").value=currentSearch; filterProducts(); document.querySelector(".slayer-hero-actions .band-landing-primary-cta").click()');
            assert.equal(await evaluate('currentSearch'), '');
            assert.equal(await evaluate('bandLandingCollection'), '');
            assert.equal(await evaluate('bandLandingGarment'), 'remera');
            for (const style of ['remera', 'sin_mangas']) {
                await evaluate(`document.querySelector('[data-slayer-style="${style}"]').click()`);
                for (const view of style === 'remera' ? ['front', 'back', 'double', 'argentina'] : ['front', 'back', 'double']) {
                    await evaluate(`document.querySelector('[data-slayer-view="${view}"]').click()`);
                    await waitFor('document.getElementById("slayerLaunchImage").complete && document.getElementById("slayerLaunchImage").naturalWidth > 0');
                    const src = await evaluate('document.getElementById("slayerLaunchImage").getAttribute("src")');
                    assert.equal(src.includes('sin_mangas'), style === 'sin_mangas');
                }
                await evaluate('document.getElementById("slayerLaunchZoom").click()');
                await waitFor('document.getElementById("zoomOverlay").classList.contains("active")');
                await evaluate('document.getElementById("zoomClose").click()');
                for (const view of style === 'remera' ? ['front', 'double', 'argentina'] : ['front', 'double']) {
                    const isDouble = view !== 'front';
                    await evaluate(`cart.clearCart(); document.querySelector('[data-slayer-view="${view}"]').click(); document.getElementById('slayerLaunchChoose').click(); selectSize('M');`);
                    const opened = await evaluate('({garment:selectedModalGarment,cut:selectedCut,print:selectedPrintMode,refs:currentModalSourceRefs.map(r=>({image:r.image,role:r.role,order:r.modalOrder})),prices:resolveModalPriceConfig(),code:getCurrentCatalogOrderCode(),size:selectedSize})');
                    assert.equal(opened.garment, style === 'sin_mangas' ? style : 'remera_clasica');
                    assert.equal(opened.print, view === 'front' ? 'simple' : 'double');
                    assert.equal(opened.prices.simple, 38000); assert.equal(opened.prices.doble, 45000);
                    assert.deepEqual(opened.refs.map(r => r.order), style === 'remera' ? [0, 1, 2, 3] : [0, 1, 2]);
                    assert(opened.refs.every(r => r.image.includes('sin_mangas') === (style === 'sin_mangas')));
                    assert.equal(await evaluate('cart.getCart().length'), 0, 'Changing a combination must not add items');
                    await evaluate('selectColor("blanco"); selectColor("negro"); selectSize("L");');
                    assert.equal(await evaluate('selectedPrintMode'), opened.print);
                    if (isDouble) assert(await evaluate('!!selectedCatalogBackRef'));
                    if (style === 'sin_mangas') {
                        await evaluate('selectPrintMode("simple"); selectPrintMode("double"); selectCatalogDesignBack(7101,2);');
                        assert(await evaluate('selectedCatalogBackRef.image.includes("sin_mangas")'), 'The suggested back must use the sleeveless mock');
                        await evaluate(`selectPrintMode('${view === 'front' ? 'simple' : 'double'}')`);
                        await evaluate('openSizeGuideForCurrentGarment()');
                        assert((await evaluate('document.getElementById("modalSizeGuideTitle").textContent')).includes('sin mangas'));
                        assert((await evaluate('document.getElementById("modalSizeGuideTable").textContent')).includes('57,5'));
                        const sizes = await evaluate('Array.from(document.querySelectorAll("#sizeSelector button")).filter(b=>b.style.display!=="none").map(b=>b.dataset.size)');
                        assert.deepEqual(sizes, ['S', 'M', 'L', 'XL', '2XL']);
                        await evaluate('closeModalSizeGuide()');
                    }
                    const order = await evaluate('(() => {const added=addToCartFromModal();return {added,item:cart.getCart()[0],summary:cart.generateSummary()}})()');
                    assert(order.added, JSON.stringify(opened));
                    assert(order.summary.includes(`* Precio: $${view === 'front' ? '38' : '45'}.000`));
                    assert.equal(order.item.frontCode, 'SRIB-7101.V1');
                    if (style === 'sin_mangas') assert(order.summary.includes('Remera clásica sin mangas unisex'));
                    if (isDouble) {
                        assert.equal(order.item.backCode, view === 'argentina' ? 'SRIB-7101.V5' : 'SRIB-7101.V3');
                        assert(order.item.backImage.includes('sin_mangas') === (style === 'sin_mangas'));
                        assert(order.item.frontImage.includes('sin_mangas') === (style === 'sin_mangas'));
                    }
                    flows.push({ width, style, view, summary: order.summary });
                    if (style === 'sin_mangas' && view === 'double') {
                        const changed = await evaluate('(() => {selectModalGarmentType("remera"); return {print:selectedPrintMode,back:selectedCatalogBackRef?.variantIndex,image:currentModalSourceRefs[0].image}})()');
                        assert.equal(changed.print, 'double'); assert.equal(changed.back, 2); assert(!changed.image.includes('sin_mangas'));
                    }
                    await evaluate('closeModal(false,false)');
                }
            }
            const poster = await evaluate('(() => {cart.clearCart();openCatalogDesign("cd-slayer-reign-in-blood-argentina-2026--p7101");selectColor("negro");selectSize("M");const added=addToCartFromModal();return {added,item:cart.getCart()[0],summary:cart.generateSummary(),image:currentModalSourceRefs[currentSlide].image}})()');
            assert(poster.added);
            assert.equal(poster.item.isDouble, false);
            assert.equal(poster.item.frontCode, 'SRIB-7101.V7');
            assert(poster.image.endsWith('slayer_reign_in_blood_show_argentina.jpg'));
            assert(poster.summary.includes('* Precio: $38.000'));
            flows.push({ width, style: 'remera', view: 'argentina-front', summary: poster.summary });
            await evaluate('closeModal(false,false)');
            await evaluate('cart.clearCart()');
            await pause(2100);
            await evaluate('document.getElementById("reignInBlood").scrollIntoView({behavior:"instant",block:"start"})');
            await pause(150);
            const shot = await send('Page.captureScreenshot', { format: 'png' });
            fs.writeFileSync(path.join(reportDir, `slayer-${width}.png`), Buffer.from(shot.data, 'base64'));
            await evaluate('window.scrollTo({top:0,behavior:"instant"})');
            await pause(150);
            const heroShot = await send('Page.captureScreenshot', { format: 'png' });
            fs.writeFileSync(path.join(reportDir, `slayer-hero-${width}.png`), Buffer.from(heroShot.data, 'base64'));
        }
        const over = await evaluate('(() => {openCatalogDesign("cd-slayer-reign-in-blood--p7101");selectRemeraVariant("oversize_unisex");return resolveModalPriceConfig()})()');
        assert.equal(over.simple, 41000); assert.equal(over.doble, 48000);
        await evaluate('closeModal(false,false)');
        for (const garment of ['hoodie', 'buzo_cuello_redondo', 'remera']) {
            assert(await evaluate(`selectBandLandingGarment('${garment}'); getCatalogDesignResults().length > 0`));
        }
        await evaluate('openCatalogDesign("cd-slayer-angel-of-death--p7102","sin_mangas"); selectColor("blanco");');
        assert.equal(await evaluate('selectedModalGarment'), 'sin_mangas');
        assert.equal(await evaluate('document.getElementById("modalPreviewReferenceNote").classList.contains("is-hidden")'), false);
        await evaluate('closeModal(false,false)');
        await send('Page.navigate', { url: `${origin}/slayer/#diseno-cd-slayer-reign-in-blood--p7101` });
        await waitFor('currentCatalogDesign?.designId === "cd-slayer-reign-in-blood--p7101"');
        await send('Page.reload');
        await waitFor('currentCatalogDesign?.designId === "cd-slayer-reign-in-blood--p7101"');
        await send('Page.navigate', { url: `${origin}/?banda=Kreator#catalogoPrincipal` });
        await waitFor('normalizeText(currentCategory) === "kreator" && document.querySelector("#productsGrid [data-design-id]")');
        assert(await evaluate('getCatalogDesignResults().every(d=>d.band === "Kreator")'));
        await evaluate('openCatalogDesign(getCatalogDesignResults()[0].designId);');
        assert(await evaluate('getAvailableModalGarmentTypes().includes("sin_mangas")'));
        assert.deepEqual(errors, []); assert.deepEqual(failedAssets, []);
        fs.writeFileSync(path.join(reportDir, 'results.json'), JSON.stringify({ status: 'PASS', flows, errors, failedAssets }, null, 2));
        console.log(JSON.stringify({ status: 'PASS', flows: flows.length, widths: [360,390,1440], newFrontDesigns: 1, existingDesignsAndFrontCodesPreserved: true, argentinaCombination: true, filters: true, outerwear: true, kreator: true, directLinkAndReload: true, errors, failedAssets, screenshots: reportDir }, null, 2));
    } finally {
        if (send) await send('Browser.close').catch(() => {});
        socket?.close();
        for (let i = 0; i < 20 && chrome.exitCode === null; i++) await pause(100);
        if (chrome.exitCode === null) chrome.kill();
        server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
